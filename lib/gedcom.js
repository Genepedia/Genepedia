/**
 * GEDCOM (5.5.5) — parsing + serialization helpers.
 *
 * This file is designed to be reusable on any website without a build step.
 * It exposes a single global API:
 *   window.GenepediaGedcom
 *
 * Core API:
 *   - decodeGedcomBytes(arrayBuffer) -> { encoding, text }
 *   - parseGedcom555(text, encoding) -> gedcom
 *   - parseGedcom555FromBytes(arrayBuffer) -> gedcom
 *   - stringifyGedcom555(gedcomOrRecords, { terminator? }) -> string
 *   - encodeGedcomBytes(text, { encoding?, includeBom? }) -> Uint8Array
 *   - gedcomToBlob(gedcomOrRecords, { encoding?, terminator?, includeBom?, mimeType? }) -> Blob
 *
 * Convenience:
 *   - loadGedcom(url, { fetch?, fetchOptions? }) -> gedcom
 *   - gedcomToTreeData(gedcom) -> { gedcom, people, unions, rootUnionId }
 *   - loadTreeData(url, opts) -> treeData
 */

(function (global) {
    "use strict";

    const ROOT = global ?? (typeof window !== "undefined" ? window : globalThis);

    const GEDCOM_VERSION = "5.5.5";
    const GEDCOM_FORM = "LINEAGE-LINKED";
    const DEFAULT_TERMINATOR = "\r\n";
    const XREF_RE = /^@[A-Za-z0-9]+@$/;

    const GEDCOM_STANDARD_TAGS = new Set(
        (
            "ABBR ADDR ADR1 ADR2 ADR3 ADOP AGE AGNC ANUL ASSO AUTH BAPM BARM BASM BIRT BURI CALN " +
            "CAST CAUS CENS CHAN CHAR CHIL CHR CHRA CITY CONC CONF CONT COPR CORP CREM CTRY DATA " +
            "DATE DEAT DEST DIV DIVF DSCR EDUC EMAIL EMIG ENGA EVEN FACT FAM FAMC FAMS FAX FCOM " +
            "FILE FONE FORM GEDC GIVN GRAD HEAD HUSB IDNO IMMI INDI LANG LATI LONG MAP MARB MARC " +
            "MARL MARR MARS MEDI NAME NATI NATU NCHI NICK NMR NOTE NPFX NSFX OBJE OCCU PAGE PEDI " +
            "PHON PLAC POST PROB PROP PUBL QUAY REFN RELA RELI REPO RESI RETI RIN ROLE ROMN SEX " +
            "SOUR SPFX STAE SUBM SURN TEXT TIME TITL TRLR TYPE VERS WIFE WILL WWW"
        ).split(" "),
    );

    const GEDCOM_TOP_LEVEL_TAGS = new Set([
        "HEAD",
        "TRLR",
        "FAM",
        "INDI",
        "OBJE",
        "NOTE",
        "REPO",
        "SOUR",
        "SUBM",
    ]);
    const GEDCOM_XREF_REQUIRED_TAGS = new Set(["FAM", "INDI", "OBJE", "NOTE", "REPO", "SOUR", "SUBM"]);

    function decodeGedcomBytes(buffer) {
        const bytes = new Uint8Array(buffer);
        const decoderOptions = { fatal: true };

        if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
            return {
                encoding: "UTF-8",
                text: stripUnicodeBom(new TextDecoder("utf-8", decoderOptions).decode(bytes)),
            };
        }

        if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
            return {
                encoding: "UNICODE",
                text: stripUnicodeBom(new TextDecoder("utf-16le", decoderOptions).decode(bytes)),
            };
        }

        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
            return {
                encoding: "UNICODE",
                text: stripUnicodeBom(new TextDecoder("utf-16be", decoderOptions).decode(bytes)),
            };
        }

        // Best-effort fallback: many GEDCOM exports omit a BOM; treat BOM-less input as UTF-8.
        try {
            const text = stripUnicodeBom(new TextDecoder("utf-8", decoderOptions).decode(bytes));
            if (/^\s*0\s/.test(text)) {
                return { encoding: "UTF-8", text };
            }
        } catch {
            // Ignore decode failures and throw the standard error below.
        }

        throw new Error(
            "GEDCOM 5.5.5 files must start with a UTF-8 or UTF-16 byte order mark (or be valid UTF-8 text).",
        );
    }

    function stripUnicodeBom(text) {
        return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    }

    function parseGedcom555(text, encoding) {
        const { lines, terminator } = splitGedcomLines(text);
        const records = [];
        const xrefs = new Map();
        const stack = [];
        let previousLevel = -1;

        for (let i = 0; i < lines.length; i += 1) {
            const node = parseGedcomLine(lines[i], i + 1, terminator);

            if (node.level > previousLevel + 1) {
                throw new Error(
                    `Line ${node.lineNumber}: GEDCOM levels must not skip from ${previousLevel} to ${node.level}.`,
                );
            }

            if (node.xref && node.level !== 0) {
                throw new Error(
                    `Line ${node.lineNumber}: GEDCOM 5.5.5 cross-reference IDs identify top-level records only.`,
                );
            }

            if (!GEDCOM_STANDARD_TAGS.has(node.tag) && !node.tag.startsWith("_")) {
                throw new Error(
                    `Line ${node.lineNumber}: Illegal GEDCOM tag "${node.tag}". User-defined tags must start with "_".`,
                );
            }

            if (node.level === 0) {
                records.push(node);
                stack[0] = node;
                stack.length = 1;
            } else {
                const parent = stack[node.level - 1];
                if (!parent) throw new Error(`Line ${node.lineNumber}: Missing enclosing record for level ${node.level}.`);
                node.parent = parent;
                parent.children.push(node);
                stack[node.level] = node;
                stack.length = node.level + 1;
            }

            if (node.xref) {
                if (xrefs.has(node.xref)) throw new Error(`Line ${node.lineNumber}: Duplicate cross-reference ID ${node.xref}.`);
                xrefs.set(node.xref, node);
            }

            previousLevel = node.level;
        }

        validateTopLevelRecords(records);
        reconstituteLogicalValues(records);
        validateRecordValues(records);
        validateGedcomHeader(records[0], encoding);
        validateGedcomPointers(records, xrefs);

        return {
            encoding,
            form: GEDCOM_FORM,
            records,
            terminator,
            version: GEDCOM_VERSION,
            xrefs,
        };
    }

    function parseGedcom555FromBytes(buffer) {
        const { text, encoding } = decodeGedcomBytes(buffer);
        return parseGedcom555(text, encoding);
    }

    function splitGedcomLines(text) {
        if (text.includes("\n\r")) {
            throw new Error("GEDCOM 5.5.5 does not allow LF/CR line terminators.");
        }

        const terminatorMatches = [...text.matchAll(/\r\n|\r|\n/g)];
        if (terminatorMatches.length === 0) throw new Error("GEDCOM file has no line terminators.");

        const terminator = terminatorMatches[0][0];
        for (const match of terminatorMatches) {
            if (match[0] !== terminator) throw new Error("GEDCOM files must use one consistent line terminator.");
        }

        if (!text.endsWith(terminator)) throw new Error("GEDCOM 5.5.5 requires the final TRLR line to have a terminator.");

        const body = text.slice(0, -terminator.length);
        const lines = body.split(terminator);
        if (lines.length === 0) throw new Error("GEDCOM file is empty.");
        return { lines, terminator };
    }

    function parseGedcomLine(line, lineNumber, terminator) {
        if (line === "") throw new Error(`Line ${lineNumber}: Empty lines are illegal in GEDCOM 5.5.5.`);
        if (/^\s/.test(line)) throw new Error(`Line ${lineNumber}: GEDCOM lines must not start with white space.`);
        if (line.length + terminator.length > 255) {
            throw new Error(`Line ${lineNumber}: GEDCOM lines must not exceed 255 code units.`);
        }

        const match = line.match(/^([0-9]|[1-9][0-9])(?: (@[A-Za-z0-9]+@))? (_?[A-Za-z0-9]+)(?: (.*))?$/);
        if (!match) throw new Error(`Line ${lineNumber}: Invalid GEDCOM line syntax.`);

        const [, levelText, xref = "", tag, value = ""] = match;
        if (tag.length > 31) throw new Error(`Line ${lineNumber}: GEDCOM tags must not exceed 31 code units.`);
        if (xref.length > 22) throw new Error(`Line ${lineNumber}: GEDCOM cross-reference IDs must not exceed 22 code units.`);

        return {
            children: [],
            level: Number(levelText),
            lineNumber,
            logicalValue: value,
            parent: null,
            rawLogicalValue: value,
            tag,
            value,
            xref,
        };
    }

    function validateTopLevelRecords(records) {
        if (records.length < 2) throw new Error("GEDCOM file must contain HEAD and TRLR records.");
        if (records[0].tag !== "HEAD") throw new Error("GEDCOM 5.5.5 files must start with a HEAD record.");
        if (records[records.length - 1].tag !== "TRLR") throw new Error("GEDCOM 5.5.5 files must end with a TRLR record.");
        if (records.length < 3 || records[1].tag !== "SUBM") {
            throw new Error("Lineage-Linked GEDCOM 5.5.5 requires exactly one SUBM record directly after HEAD.");
        }

        let submitterCount = 0;
        for (const record of records) {
            if (!GEDCOM_TOP_LEVEL_TAGS.has(record.tag) && !record.tag.startsWith("_")) {
                throw new Error(`Line ${record.lineNumber}: Unsupported top-level GEDCOM record "${record.tag}".`);
            }

            if ((record.tag === "HEAD" || record.tag === "TRLR") && record.xref) {
                throw new Error(`Line ${record.lineNumber}: ${record.tag} must not have a cross-reference ID.`);
            }

            if (GEDCOM_XREF_REQUIRED_TAGS.has(record.tag) && !record.xref) {
                throw new Error(`Line ${record.lineNumber}: ${record.tag} records require a cross-reference ID.`);
            }

            if (record.tag === "SUBM") submitterCount += 1;
        }

        if (submitterCount !== 1) throw new Error("Lineage-Linked GEDCOM 5.5.5 requires exactly one SUBM record.");
    }

    function reconstituteLogicalValues(records) {
        walkGedcomRecords(records, (record) => {
            let raw = record.value;

            for (const child of record.children) {
                if (child.tag === "CONC") raw += child.value;
                if (child.tag === "CONT") raw += `\n${child.value}`;
            }

            record.rawLogicalValue = raw;
            record.logicalValue = XREF_RE.test(raw) ? raw : decodeGedcomAtSigns(raw);
        });
    }

    function validateRecordValues(records) {
        walkGedcomRecords(records, (record) => {
            if (record.tag === "TRLR") {
                if (record.value || record.children.length > 0) {
                    throw new Error(`Line ${record.lineNumber}: TRLR must not have a value or subrecords.`);
                }
                return;
            }

            if (record.tag === "CONC" || record.tag === "CONT") {
                if (record.level === 0) throw new Error(`Line ${record.lineNumber}: ${record.tag} cannot be a top-level record.`);
                if (!record.parent || record.parent.tag === "CONC" || record.parent.tag === "CONT") {
                    throw new Error(
                        `Line ${record.lineNumber}: ${record.tag} must be an immediate continuation of a GEDCOM form record.`,
                    );
                }
                if (record.children.length > 0) throw new Error(`Line ${record.lineNumber}: ${record.tag} must not have subrecords.`);
                if (record.tag === "CONC" && record.value === "") throw new Error(`Line ${record.lineNumber}: CONC requires a line value.`);
                if (gedcomPath(record).includes("HEAD")) {
                    throw new Error(`Line ${record.lineNumber}: CONC and CONT are not allowed in HEAD.`);
                }
            }

            if (record.tag !== "CONT" && record.value === "" && record.children.length === 0) {
                throw new Error(`Line ${record.lineNumber}: GEDCOM records require a value, subrecords, or both.`);
            }

            validateGedcomAtSigns(record);
        });
    }

    function validateGedcomHeader(head, encoding) {
        const gedc = firstChild(head, "GEDC");
        if (!gedc) throw new Error("HEAD.GEDC is required.");

        const version = childValue(gedc, "VERS");
        const form = firstChild(gedc, "FORM");
        const formValue = form?.logicalValue ?? "";
        const formVersion = form ? childValue(form, "VERS") : "";
        const char = childValue(head, "CHAR");

        if (version !== GEDCOM_VERSION) {
            throw new Error(`Unsupported GEDCOM version "${version}". Expected ${GEDCOM_VERSION}.`);
        }
        if (formValue !== GEDCOM_FORM) {
            throw new Error(`Unsupported GEDCOM form "${formValue}". Expected ${GEDCOM_FORM}.`);
        }
        if (formVersion !== GEDCOM_VERSION) {
            throw new Error(
                `Unsupported Lineage-Linked form version "${formVersion}". Expected ${GEDCOM_VERSION}.`,
            );
        }
        if (char !== "UTF-8" && char !== "UNICODE") {
            throw new Error(`GEDCOM 5.5.5 requires HEAD.CHAR UTF-8 or UNICODE, got "${char}".`);
        }
        if (char !== encoding) {
            throw new Error(`HEAD.CHAR ${char} does not match the file byte-order mark (${encoding}).`);
        }
    }

    function validateGedcomPointers(records, xrefs) {
        walkGedcomRecords(records, (record) => {
            const value = record.rawLogicalValue ?? "";
            if (!XREF_RE.test(value)) return;

            const target = xrefs.get(value);
            if (!target) {
                throw new Error(`Line ${record.lineNumber}: Pointer ${value} does not reference an existing record.`);
            }

            const expected = expectedPointerTarget(record);
            if (expected && target.tag !== expected) {
                throw new Error(
                    `Line ${record.lineNumber}: Pointer ${value} must reference a ${expected} record, not ${target.tag}.`,
                );
            }
        });
    }

    function expectedPointerTarget(record) {
        const parentTag = record.parent?.tag ?? "";
        if (record.tag === "SUBM" && parentTag === "HEAD") return "SUBM";
        if ((record.tag === "HUSB" || record.tag === "WIFE" || record.tag === "CHIL") && parentTag === "FAM") {
            return "INDI";
        }
        if (record.tag === "FAMC" || record.tag === "FAMS") return "FAM";
        if (record.tag === "ASSO") return "INDI";
        if (record.tag === "OBJE" && parentTag !== "") return "OBJE";
        if (record.tag === "NOTE" && record.parent?.level !== -1) return "NOTE";
        if (record.tag === "SOUR" && parentTag !== "HEAD") return "SOUR";
        if (record.tag === "REPO") return "REPO";
        return null;
    }

    function validateGedcomAtSigns(record) {
        const value = record.rawLogicalValue ?? "";
        if (!value.includes("@") || XREF_RE.test(value)) return;

        let i = 0;
        while (i < value.length) {
            if (value[i] !== "@") {
                i += 1;
                continue;
            }

            if (value[i + 1] === "@") {
                i += 2;
                continue;
            }

            if (value[i + 1] === "#") {
                const end = value.indexOf("@", i + 2);
                if (end === -1) throw new Error(`Line ${record.lineNumber}: Unterminated GEDCOM escape sequence.`);
                i = end + 1;
                continue;
            }

            throw new Error(`Line ${record.lineNumber}: Text at signs must be escaped as @@ in GEDCOM 5.5.5.`);
        }
    }

    function decodeGedcomAtSigns(value) {
        return String(value).replaceAll("@@", "@");
    }

    function gedcomToTreeData(gedcom) {
        const individuals = gedcom.records.filter((record) => record.tag === "INDI");
        const families = gedcom.records.filter((record) => record.tag === "FAM");
        const people = individuals.map(gedcomIndividualToPerson);
        const peopleByGedcomId = new Set(people.map((person) => person.id));

        const unions = families
            .map((family) => gedcomFamilyToUnion(family, peopleByGedcomId))
            .filter((union) => union.partners.length > 0 || union.children.length > 0);

        const rootUnionId = unions[0]?.id ?? "";
        return { gedcom, people, rootUnionId, unions };
    }

    function gedcomIndividualToPerson(record) {
        const id = gedcomRecordId(record);
        const nameRecords = children(record, "NAME");
        const primaryName = nameRecords[0] ?? null;
        const birthName =
            nameRecords.find((nameRecord) => {
                const type = childValue(nameRecord, "TYPE").toLowerCase();
                return type === "birth" || type === "maiden";
            }) ?? null;

        const birthDate = eventDate(record, "BIRT");
        const birthPlace = eventPlace(record, "BIRT");
        const deathDate = eventDate(record, "DEAT");
        const deathPlace = eventPlace(record, "DEAT");
        const sex = (childValue(record, "SEX") || "U").toUpperCase();

        return {
            birthDate: birthDate || undefined,
            birthPlace: birthPlace || undefined,
            birthSurname: birthName ? gedcomNameSurname(birthName) : "",
            born: extractYearFromGedcomDate(birthDate),
            deathDate: deathDate || undefined,
            deathPlace: deathPlace || undefined,
            died: extractYearFromGedcomDate(deathDate),
            gender: sex === "M" || sex === "F" ? sex : "U",
            gedcom: record,
            gedcomXref: record.xref,
            id,
            name: gedcomDisplayName(primaryName) || id,
            sex,
        };
    }

    function gedcomFamilyToUnion(record, peopleByGedcomId) {
        const partnerIds = ["HUSB", "WIFE"]
            .map((tag) => gedcomPointerId(childRawValue(record, tag)))
            .filter((id) => id && peopleByGedcomId.has(id));
        const partners = [...new Set(partnerIds)];
        const childrenIds = children(record, "CHIL")
            .map((child) => gedcomPointerId(child.rawLogicalValue))
            .filter((id) => id && peopleByGedcomId.has(id));

        return {
            children: [...new Set(childrenIds)],
            gedcom: record,
            gedcomXref: record.xref,
            id: gedcomRecordId(record),
            partners,
        };
    }

    function gedcomDisplayName(nameRecord) {
        if (!nameRecord) return "";

        const given = childValue(nameRecord, "GIVN");
        const surnamePrefix = childValue(nameRecord, "SPFX");
        const surname = childValue(nameRecord, "SURN");
        const fullSurname = [surnamePrefix, surname].filter(Boolean).join(" ");
        if (given || fullSurname) return [given, fullSurname].filter(Boolean).join(" ");

        return String(nameRecord.logicalValue ?? "")
            .replaceAll("/", "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function gedcomNameSurname(nameRecord) {
        if (!nameRecord) return "";

        const surnamePrefix = childValue(nameRecord, "SPFX");
        const surname = childValue(nameRecord, "SURN");
        if (surname || surnamePrefix) return [surnamePrefix, surname].filter(Boolean).join(" ");

        const match = String(nameRecord.logicalValue ?? "").match(/\/([^/]*)\//);
        return match ? match[1].trim() : "";
    }

    function extractYearFromGedcomDate(value) {
        const matches = String(value ?? "").match(/\b\d{3,4}(?:\/\d{2})?\b/g);
        if (!matches) return undefined;

        const year = Number(matches[matches.length - 1].split("/")[0]);
        return Number.isFinite(year) ? year : undefined;
    }

    function eventDate(record, eventTag) {
        const event = firstChild(record, eventTag);
        return event ? childValue(event, "DATE") : "";
    }

    function eventPlace(record, eventTag) {
        const event = firstChild(record, eventTag);
        return event ? childValue(event, "PLAC") : "";
    }

    function gedcomRecordId(record) {
        return record.xref ? record.xref.slice(1, -1) : `${record.tag}-${record.lineNumber}`;
    }

    function gedcomPointerId(value) {
        return XREF_RE.test(value ?? "") ? value.slice(1, -1) : "";
    }

    function childValue(record, tag) {
        const child = firstChild(record, tag);
        return child?.logicalValue ?? "";
    }

    function childRawValue(record, tag) {
        const child = firstChild(record, tag);
        return child?.rawLogicalValue ?? "";
    }

    function firstChild(record, tag) {
        return children(record, tag)[0] ?? null;
    }

    function children(record, tag) {
        return (record?.children ?? []).filter((child) => child.tag === tag);
    }

    function walkGedcomRecords(records, visitor) {
        for (const record of records) {
            visitor(record);
            if (record.children.length > 0) walkGedcomRecords(record.children, visitor);
        }
    }

    function gedcomPath(record) {
        const tags = [];
        let node = record;
        while (node) {
            tags.unshift(node.tag);
            node = node.parent;
        }
        return tags;
    }

    function stringifyGedcom555(gedcomOrRecords, opts = {}) {
        const terminator = opts.terminator ?? gedcomOrRecords?.terminator ?? DEFAULT_TERMINATOR;
        const records = Array.isArray(gedcomOrRecords) ? gedcomOrRecords : gedcomOrRecords?.records ?? [];

        const lines = [];
        const pushRecord = (record) => {
            const hasXref = Boolean(record.xref);
            const hasValue = typeof record.value === "string" && record.value !== "";
            let line = `${record.level}`;
            if (hasXref) line += ` ${record.xref}`;
            line += ` ${record.tag}`;
            if (hasValue) line += ` ${record.value}`;
            lines.push(line);
            for (const child of record.children ?? []) pushRecord(child);
        };

        for (const record of records) pushRecord(record);
        return `${lines.join(terminator)}${terminator}`;
    }

    function encodeGedcomBytes(text, opts = {}) {
        const encoding = opts.encoding ?? "UTF-8";
        const includeBom = opts.includeBom ?? true;

        if (String(encoding).toUpperCase() === "UNICODE") {
            const bom = includeBom ? [0xff, 0xfe] : [];
            const out = new Uint8Array(bom.length + text.length * 2);
            for (let i = 0; i < bom.length; i += 1) out[i] = bom[i];
            for (let i = 0; i < text.length; i += 1) {
                const codeUnit = text.charCodeAt(i);
                const idx = bom.length + i * 2;
                out[idx] = codeUnit & 0xff;
                out[idx + 1] = (codeUnit >> 8) & 0xff;
            }
            return out;
        }

        // Default: UTF-8
        const encoder = new TextEncoder();
        const body = encoder.encode(String(text));
        if (!includeBom) return body;
        const out = new Uint8Array(3 + body.length);
        out[0] = 0xef;
        out[1] = 0xbb;
        out[2] = 0xbf;
        out.set(body, 3);
        return out;
    }

    function gedcomToBlob(gedcomOrRecords, opts = {}) {
        const encoding =
            opts.encoding ??
            (typeof gedcomOrRecords?.encoding === "string" ? gedcomOrRecords.encoding : "UTF-8");
        const terminator = opts.terminator ?? gedcomOrRecords?.terminator ?? DEFAULT_TERMINATOR;
        const includeBom = opts.includeBom ?? true;
        const mimeType =
            opts.mimeType ??
            (String(encoding).toUpperCase() === "UNICODE"
                ? "text/plain;charset=utf-16"
                : "text/plain;charset=utf-8");

        const text = stringifyGedcom555(gedcomOrRecords, { terminator });
        const bytes = encodeGedcomBytes(text, { encoding, includeBom });
        return new Blob([bytes], { type: mimeType });
    }

    async function loadGedcom(url, opts = {}) {
        const fetchFn = opts.fetch ?? ROOT.fetch;
        if (typeof fetchFn !== "function") throw new Error("fetch() is not available in this environment.");

        const fetchOptions = opts.fetchOptions ?? { cache: "no-cache" };
        const response = await fetchFn(url, fetchOptions);
        if (!response.ok) {
            throw new Error(`Unable to load GEDCOM file: ${response.status} ${response.statusText}`);
        }

        return parseGedcom555FromBytes(await response.arrayBuffer());
    }

    async function loadTreeData(url, opts = {}) {
        const gedcom = await loadGedcom(url, opts);
        return gedcomToTreeData(gedcom);
    }

    ROOT.GenepediaGedcom = {
        GEDCOM_FORM,
        GEDCOM_VERSION,

        decodeGedcomBytes,
        encodeGedcomBytes,
        gedcomToBlob,
        gedcomToTreeData,
        loadGedcom,
        loadTreeData,
        parseGedcom555,
        parseGedcom555FromBytes,
        stringifyGedcom555,
    };
})(typeof window !== "undefined" ? window : globalThis);
