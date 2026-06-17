(function () {
    "use strict";

    const DATE_PRECISIONS = [
        { value: "exact", label: "Exact" },
        { value: "before", label: "Before" },
        { value: "after", label: "After" },
        { value: "about", label: "About" },
    ];

    const EDUCATION_TYPE_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "company", label: "Company" },
        { value: "government", label: "Government" },
        { value: "military", label: "Military" },
        { value: "nonprofit", label: "Non-profit" },
        { value: "self_employed", label: "Self-employed" },
        { value: "internship", label: "Internship" },
        { value: "contract", label: "Contract / freelance" },
        { value: "other", label: "Other" },
    ];

    const LOCATION_DETAIL_FIELDS = [
        { key: "placeName", label: "Place Name" },
        { key: "addressLine1", label: "Address Line 1" },
        { key: "addressLine2", label: "Address Line 2" },
        { key: "addressLine3", label: "Address Line 3" },
        { key: "city", label: "City" },
        { key: "postalCode", label: "Postal Code" },
        { key: "county", label: "County" },
        { key: "stateProvince", label: "State/Province" },
        { key: "country", label: "Country" },
    ];

    const LOCATION_SEARCH_MIN_QUERY_LENGTH = 2;
    const LOCATION_SEARCH_LIMIT = 6;

    const TEMPLATE = `
        <section class="pedu" aria-label="Career editor">
            <style>
                .pedu {
                    display: grid;
                    gap: 1rem;
                }

                .pedu__inline-actions {
                    display: flex;
                    gap: 0.6rem;
                    flex-wrap: wrap;
                }

                .pedu__legend-entry {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                    min-width: 0;
                }

                .pedu__legend-logo {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 1.5rem;
                    height: 1.5rem;
                    flex: 0 0 auto;
                    color: inherit;
                }

                .pedu__legend-logo-img {
                    width: 1.5rem;
                    height: 1.5rem;
                    object-fit: contain;
                }

                .pedu__legend-logo--fallback {
                    font-size: 1rem;
                }

                .pedu__empty-note,
                .pedu__entry-note {
                    margin: 0.35rem 0 0;
                    font-size: 0.88rem;
                    color: #54595d;
                }

                .pedu__empty {
                    padding: 1rem 1.1rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    border-radius: 0.75rem;
                    background: #fff;
                }

                .pedu__empty h3 {
                    margin: 0 0 0.35rem;
                    font-size: 1rem;
                }

                .pedu__status[data-type="error"] {
                    border-color: rgba(177, 31, 31, 0.22);
                    background: #fff5f5;
                    color: #8f1d1d;
                }

                .pedu textarea {
                    min-height: 5.4rem;
                    resize: vertical;
                }

                body.theme-dark .pedu__empty-note,
                body.theme-dark .pedu__entry-note {
                    color: #c8ccd1;
                }

                body.theme-dark .pedu__empty {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: #1a1e24;
                }
            </style>
            <form class="pie" autocomplete="off">
                <div class="pie__status pedu__status" role="status" hidden></div>
                <div class="pedu__list"></div>
            </form>
        </section>
    `;

    function infoboxApi() {
        return window.AppProfileInfobox || {};
    }

    function resolveSiteUrl(path) {
        const clean = String(path || "").replace(/^\/+/, "");
        if (typeof window.App?.resolveSiteUrl === "function") {
            return window.App.resolveSiteUrl(clean);
        }
        return new URL(`../${clean}`, window.location.href).href;
    }

    function ensurePeopleDb() {
        if (window.PeopleDB) return Promise.resolve();
        window.__peopleDbLoadPromise = window.__peopleDbLoadPromise || new Promise((resolve, reject) => {
            const existing = document.querySelector("script[data-people-db]");
            if (existing) {
                existing.addEventListener("load", () => resolve(), { once: true });
                existing.addEventListener("error", () => reject(new Error("Could not load people-db.js")), { once: true });
                return;
            }
            const script = document.createElement("script");
            script.src = resolveSiteUrl("lib/people-db.js");
            script.dataset.peopleDb = "1";
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener("error", () => reject(new Error("Could not load people-db.js")), { once: true });
            document.head.append(script);
        });
        return window.__peopleDbLoadPromise;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[char]));
    }

    function cloneJson(value) {
        return value && typeof value === "object"
            ? JSON.parse(JSON.stringify(value))
            : value;
    }

    function normalizeId(value) {
        return String(value || "").trim();
    }

    function normalizeText(value) {
        const text = String(value || "").trim();
        return text || null;
    }

    function normalizeNoteText(value) {
        const text = String(value || "").replace(/\r\n?/g, "\n").trim();
        return text || null;
    }

    function normalizeDatePrecision(value) {
        const normalized = String(value || "").trim().toLowerCase();
        return DATE_PRECISIONS.some((entry) => entry.value === normalized) ? normalized : "exact";
    }

    function normalizeStructuredDate(value) {
        let text = String(value || "").trim();
        if (!text) return "";
        const info = infoboxApi();
        if (/[a-z]/i.test(text) && typeof info.parseFriendlyToStored === "function") {
            text = String(info.parseFriendlyToStored(text) || text).trim();
        }
        if (typeof info.normalizeStoredDate === "function") {
            return String(info.normalizeStoredDate(text) || text).trim();
        }
        return text;
    }

    function yearFromStructuredDate(value) {
        const match = String(value || "").match(/^(\d{4})/);
        return match ? Number(match[1]) : null;
    }

    function formatGedcomDateFromStructured(value, precision) {
        const normalized = normalizeStructuredDate(value);
        if (!normalized) return "";
        const match = normalized.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
        if (!match) {
            return normalized;
        }
        const year = match[1];
        const month = match[2];
        const day = match[3];
        const monthNames = {
            "01": "JAN", "02": "FEB", "03": "MAR", "04": "APR", "05": "MAY", "06": "JUN",
            "07": "JUL", "08": "AUG", "09": "SEP", "10": "OCT", "11": "NOV", "12": "DEC",
        };
        let base = year;
        if (month && day) {
            base = `${Number(day)} ${monthNames[month]} ${year}`;
        } else if (month) {
            base = `${monthNames[month]} ${year}`;
        }
        const prefix = {
            about: "ABT",
            before: "BEF",
            after: "AFT",
        }[normalizeDatePrecision(precision)] || "";
        return prefix ? `${prefix} ${base}` : base;
    }

    function datePreview(value, precision) {
        const normalized = normalizeStructuredDate(value);
        if (!normalized) return "";
        const info = infoboxApi();
        if (typeof info.friendlyDate === "function") {
            return String(info.friendlyDate(normalized, { precision: normalizeDatePrecision(precision) }) || normalized);
        }
        return normalized;
    }

    function componentDatePreview(value) {
        return datePreview(String(value?.date || "").trim(), normalizeDatePrecision(value?.precision));
    }

    const ORGANIZATION_LOGO_STOP_WORDS = new Set([
        "the", "and", "of", "school", "college", "university", "academy", "institute",
        "company", "co", "corp", "corporation", "inc", "incorporated", "ltd", "limited",
        "llc", "plc", "group", "holding", "holdings", "pty", "sa", "ag", "gmbh",
    ]);

    function thirdPartyIconsApi() {
        return window.App?.ThirdPartyIcons || window.AppThirdPartyIcons || null;
    }

    function organizationLogoCandidates(values) {
        const seen = new Set();
        const candidates = [];
        const push = (value) => {
            const text = String(value || "").replace(/\s+/g, " ").trim();
            if (!text) return;
            const key = text.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            candidates.push(text);
        };

        values.forEach((value) => {
            const text = String(value || "").replace(/\s+/g, " ").trim();
            if (!text) return;
            push(text);
            push(text.split(",")[0] || "");
            push(text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " "));

            const normalizedWords = text
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .split(/[^a-z0-9]+/i)
                .filter(Boolean)
                .filter((word) => !ORGANIZATION_LOGO_STOP_WORDS.has(String(word || "").toLowerCase()));

            if (normalizedWords.length) {
                push(normalizedWords.join(" "));
            }
        });

        return candidates;
    }

    function knownOrganizationLogoSlugs() {
        const api = thirdPartyIconsApi();
        if (!api || typeof api.listIcons !== "function") {
            return new Set();
        }
        const icons = api.listIcons();
        return new Set(icons.map((icon) => String(icon?.slug || "").trim()).filter(Boolean));
    }

    function resolveOrganizationLogoMeta(values) {
        const api = thirdPartyIconsApi();
        if (!api || typeof api.normalizeSlug !== "function" || typeof api.getIconMeta !== "function") {
            return null;
        }
        const knownSlugs = knownOrganizationLogoSlugs();
        for (const candidate of organizationLogoCandidates(values)) {
            const slug = api.normalizeSlug(candidate);
            if (!slug || !knownSlugs.has(slug)) {
                continue;
            }
            return api.getIconMeta(slug);
        }
        return null;
    }

    async function resolveOrganizationLogoMetaAsync(values) {
        const api = thirdPartyIconsApi();
        if (!api) {
            return null;
        }
        try {
            await api.whenReady?.();
        } catch (error) {
            // Fall through and attempt a synchronous lookup with whatever data is available.
        }
        return resolveOrganizationLogoMeta(values);
    }

    function renderLegendLogoHtml({ values, defaultIconClass, altText, meta = undefined }) {
        const resolvedMeta = meta === undefined ? resolveOrganizationLogoMeta(values) : meta;
        if (resolvedMeta?.url) {
            return `<span class="pedu__legend-logo"><img class="pedu__legend-logo-img" src="${escapeHtml(resolvedMeta.url)}" alt="${escapeHtml(altText)}"></span>`;
        }
        return `<span class="pedu__legend-logo pedu__legend-logo--fallback" aria-hidden="true"><i class="${escapeHtml(defaultIconClass)}"></i></span>`;
    }

    const GEDCOM_MONTHS = {
        JAN: "January", FEB: "February", MAR: "March", APR: "April",
        MAY: "May", JUN: "June", JUL: "July", AUG: "August",
        SEP: "September", OCT: "October", NOV: "November", DEC: "December",
    };

    const GEDCOM_MONTH_NUM = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
        JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };

    const GEDCOM_QUALIFIERS = {
        ABT: "about",
        EST: "estimated",
        CAL: "calculated",
        BEF: "before",
        AFT: "after",
        FROM: "from",
        TO: "to",
    };

    const GEDCOM_PRECISION_BY_QUALIFIER = {
        about: "about",
        estimated: "about",
        calculated: "about",
        before: "before",
        after: "after",
    };

    function uniqueNonEmpty(values) {
        const seen = new Set();
        return values.flatMap((value) => {
            const text = String(value || "").replace(/\s+/g, " ").trim();
            if (!text) return [];
            const key = text.toLowerCase();
            if (seen.has(key)) return [];
            seen.add(key);
            return [text];
        });
    }

    function parseGedcomDateValue(raw) {
        const value = String(raw || "").trim();
        if (!value) {
            return null;
        }

        const yearMatch = value.match(/\d{3,4}/);
        const year = yearMatch ? Number(yearMatch[0]) : null;
        const parts = value.split(/\s+/);
        let qualifier = "";
        const tokens = [...parts];
        if (tokens[0] && GEDCOM_QUALIFIERS[tokens[0].toUpperCase()]) {
            qualifier = GEDCOM_QUALIFIERS[tokens[0].toUpperCase()];
            tokens.shift();
        }

        let day = "";
        let monthName = "";
        let monthNum = "";
        let displayYear = "";
        for (const token of tokens) {
            if (/^\d{1,2}$/.test(token) && !day) {
                day = token;
            } else if (GEDCOM_MONTHS[token.toUpperCase()]) {
                monthName = GEDCOM_MONTHS[token.toUpperCase()];
                monthNum = GEDCOM_MONTH_NUM[token.toUpperCase()];
            } else if (/^\d{3,4}$/.test(token)) {
                displayYear = token;
            }
        }

        let display = "";
        if (monthName && day && displayYear) {
            display = `${monthName} ${Number(day)}, ${displayYear}`;
        } else if (monthName && displayYear) {
            display = `${monthName} ${displayYear}`;
        } else if (displayYear) {
            display = displayYear;
        } else {
            display = value;
        }
        if (qualifier) {
            display = `${qualifier} ${display}`;
        }

        let iso = "";
        if (displayYear) {
            const yyyy = displayYear.padStart(4, "0");
            if (monthNum && day) {
                iso = `${yyyy}-${monthNum}-${String(day).padStart(2, "0")}`;
            } else if (monthNum) {
                iso = `${yyyy}-${monthNum}`;
            } else {
                iso = yyyy;
            }
        }

        return {
            raw: value,
            year,
            display,
            iso,
            precision: GEDCOM_PRECISION_BY_QUALIFIER[qualifier] || "exact",
        };
    }

    function parseGedcomBlock(text) {
        const root = { level: -1, tag: "ROOT", pointer: null, value: null, children: [] };
        const stack = [root];
        const lines = String(text || "").split(/\r\n|\r|\n/);

        for (const raw of lines) {
            if (!raw || !raw.trim()) {
                continue;
            }

            const head = raw.match(/^(\d+)\s?(.*)$/s);
            if (!head) {
                continue;
            }

            const level = Number(head[1]);
            const rest = head[2] ?? "";
            let pointer = null;
            let tag = "";
            let value = null;

            const pointerMatch = rest.match(/^@([^@]+)@\s+(\S+)(?:\s(.*))?$/s);
            if (pointerMatch) {
                pointer = `@${pointerMatch[1]}@`;
                tag = pointerMatch[2];
                value = pointerMatch[3] ?? null;
            } else {
                const tagMatch = rest.match(/^(\S+)(?:\s(.*))?$/s);
                if (!tagMatch) {
                    continue;
                }
                tag = tagMatch[1];
                value = tagMatch[2] ?? null;
            }

            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            const parent = stack[stack.length - 1];

            if (tag === "CONT") {
                parent.value = `${parent.value ?? ""}\n${value ?? ""}`;
                continue;
            }
            if (tag === "CONC") {
                parent.value = `${parent.value ?? ""}${value ?? ""}`;
                continue;
            }

            const node = { level, tag, pointer, value: value ?? null, children: [] };
            parent.children.push(node);
            stack.push(node);
        }

        return root;
    }

    function childrenWithTag(node, tag) {
        return Array.isArray(node?.children)
            ? node.children.filter((child) => child.tag === tag)
            : [];
    }

    function firstChild(node, tag) {
        return Array.isArray(node?.children)
            ? node.children.find((child) => child.tag === tag) || null
            : null;
    }

    function childValue(node, tag) {
        return firstChild(node, tag)?.value || "";
    }

    function hasLocationParts(location) {
        if (!location || typeof location !== "object") return false;
        return Object.values(location).some((value) => String(value || "").trim());
    }

    function derivePlaceName(rawPlace, location) {
        const place = String(rawPlace || "").replace(/\s+/g, " ").trim();
        if (!place) return "";
        const parts = place.split(",").map((part) => String(part || "").trim()).filter(Boolean);
        if (!parts.length) return "";
        const trailingCandidates = uniqueNonEmpty([
            location.city,
            location.county,
            location.stateProvince,
            location.country,
        ]).map((value) => value.toLowerCase());

        while (parts.length && trailingCandidates.includes(parts[parts.length - 1].toLowerCase())) {
            parts.pop();
        }
        return parts.join(", ");
    }

    function parseGedcomLocation(node) {
        if (!node) {
            return null;
        }
        const rawPlace = String(childValue(node, "PLAC") || "").replace(/\s+/g, " ").trim();
        const addressNode = firstChild(node, "ADDR");
        const location = {
            label: "",
            placeName: "",
            addressLine1: String(childValue(addressNode, "ADR1") || addressNode?.value || "").trim(),
            addressLine2: String(childValue(addressNode, "ADR2") || "").trim(),
            addressLine3: String(childValue(addressNode, "ADR3") || "").trim(),
            city: String(childValue(addressNode, "CITY") || "").trim(),
            postalCode: String(childValue(addressNode, "POST") || "").trim(),
            county: String(childValue(addressNode, "CNTY") || "").trim(),
            stateProvince: String(childValue(addressNode, "STAE") || "").trim(),
            country: String(childValue(addressNode, "CTRY") || "").trim(),
            countryCode: "",
            latitude: "",
            longitude: "",
            source: "",
        };

        if (rawPlace) {
            const derivedPlaceName = derivePlaceName(rawPlace, location);
            location.placeName = derivedPlaceName || (!hasLocationParts(location) ? rawPlace : "");
        }

        const formatSummary = infoboxApi().formatLocationSummary || ((value, fallback) => fallback || value?.label || "");
        const label = String(formatSummary(location, rawPlace) || "").trim();
        if (label) {
            location.label = label;
        }

        return hasLocationParts(location) || rawPlace ? location : null;
    }

    function parseGedcomEventNode(node) {
        if (!node) return null;
        const date = parseGedcomDateValue(childValue(node, "DATE"));
        const location = parseGedcomLocation(node);
        const place = location
            ? (infoboxApi().formatLocationSummary || ((value, fallback) => fallback || value?.label || ""))(location, childValue(node, "PLAC").trim())
            : childValue(node, "PLAC").trim();
        if (!date && !place && !location) {
            return null;
        }
        const event = {
            date: date?.raw || null,
            year: date?.year ?? null,
            iso: date?.iso || null,
            precision: date?.precision || "exact",
            display: date?.display || null,
            place: place || null,
        };
        if (location) {
            event.location = location;
        }
        return event;
    }

    function parseEducationEntriesFromIndividual(individual) {
        const nodes = Array.isArray(individual?.children)
            ? individual.children.filter((node) => node && node.tag === "OCCU")
            : [];
        return normalizeEducationEntries(nodes.map((node, index) => {
            const event = parseGedcomEventNode(node);
            const title = String(node.value || childValue(node, "TYPE") || "").replace(/\s+/g, " ").trim();
            const note = uniqueNonEmpty(childrenWithTag(node, "NOTE").map((noteNode) => String(noteNode.value || "").trim())).join("\n");
            return {
                id: `career-${index + 1}`,
                sourceTag: "OCCU",
                title: title || "",
                date: event?.date || null,
                year: event?.year ?? null,
                iso: event?.iso || null,
                precision: event?.precision || "exact",
                display: event?.display || null,
                place: event?.place || null,
                ...(event?.location ? { location: event.location } : {}),
                ...(note ? { note } : {}),
            };
        }));
    }

    function extractGedcomIndividualBlock(content, xref) {
        const lines = String(content || "").split(/\r\n|\r|\n/);
        const target = `0 ${String(xref || "").trim()} INDI`;
        let found = false;
        const collected = [];

        for (const line of lines) {
            if (!found) {
                if (String(line || "").trim() === target) {
                    found = true;
                    collected.push(line);
                }
                continue;
            }
            if (/^0\s/.test(line)) {
                break;
            }
            collected.push(line);
        }

        return collected.join("\n");
    }

    async function loadEducationFromGedcomXref(xref) {
        const key = String(xref || "").trim();
        if (!key) return [];
        if (!window.__profileCareerGedcomLookup) {
            window.__profileCareerGedcomLookup = new Map();
        }
        if (window.__profileCareerGedcomLookup.has(key)) {
            return cloneJson(window.__profileCareerGedcomLookup.get(key));
        }
        if (!window.__profileCareerGedcomTextPromise) {
            window.__profileCareerGedcomTextPromise = fetch(resolveSiteUrl("data/export-Forest.ged"), { cache: "force-cache" })
                .then((response) => (response.ok ? response.text() : ""))
                .catch(() => "");
        }
        const content = await window.__profileCareerGedcomTextPromise;
        if (!content) {
            window.__profileCareerGedcomLookup.set(key, []);
            return [];
        }
        const block = extractGedcomIndividualBlock(content, key);
        if (!block) {
            window.__profileCareerGedcomLookup.set(key, []);
            return [];
        }
        const parsed = parseGedcomBlock(block);
        const individual = parsed.children.find((node) => node.tag === "INDI") || null;
        const entries = individual ? parseEducationEntriesFromIndividual(individual) : [];
        window.__profileCareerGedcomLookup.set(key, cloneJson(entries));
        return cloneJson(entries);
    }

    function createManualLocationMatch(query) {
        const trimmed = String(query || "").trim();
        if (!trimmed) return null;
        return {
            id: `manual:${trimmed.toLowerCase()}`,
            label: trimmed,
            type: "manual",
            location: {
                placeName: trimmed,
                source: "manual",
            },
        };
    }

    async function searchLocationMatches(query, { signal } = {}) {
        const trimmed = String(query || "").trim();
        const manualMatch = createManualLocationMatch(trimmed);
        if (trimmed.length < LOCATION_SEARCH_MIN_QUERY_LENGTH) {
            return manualMatch ? [manualMatch] : [];
        }

        const apiUrl = (function () {
            const apiBase = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "")
                .trim()
                .replace(/\/+$/, "");
            if (!apiBase) return "";
            return new URL("location-search.php", `${apiBase}/`).href;
        })();
        if (!apiUrl) {
            return manualMatch ? [manualMatch] : [];
        }

        try {
            const response = await fetch(`${apiUrl}?q=${encodeURIComponent(trimmed)}`, {
                signal,
                cache: "no-store",
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload) {
                return manualMatch ? [manualMatch] : [];
            }

            const results = (Array.isArray(payload.results) ? payload.results : [])
                .map((result) => ({
                    id: String(result.id || result.label || ""),
                    label: String(result.label || "").trim(),
                    type: String(result.type || "").trim(),
                    location: result.location || {},
                }))
                .filter((result) => result.label || (result.location && Object.keys(result.location).length));

            if (manualMatch && !results.some((entry) => entry.label.toLowerCase() === manualMatch.label.toLowerCase())) {
                results.push(manualMatch);
            }

            return results.slice(0, LOCATION_SEARCH_LIMIT + 1);
        } catch (error) {
            if (error?.name === "AbortError") {
                throw error;
            }
            return manualMatch ? [manualMatch] : [];
        }
    }

    function normalizeEducationEntries(values) {
        if (typeof window.PeopleDB?.toCareerData === "function") {
            return window.PeopleDB.toCareerData({ career: Array.isArray(values) ? values : [] });
        }
        return (Array.isArray(values) ? values : []).map((entry, index) => ({
            id: String(entry?.id || `career-${index + 1}`),
            sourceTag: String(entry?.sourceTag || "WORK").toUpperCase() === "OCCU" ? "OCCU" : "WORK",
            type: normalizeText(entry?.type),
            title: normalizeText(entry?.title),
            date: normalizeText(entry?.date),
            year: Number(entry?.year) || null,
            iso: normalizeText(entry?.iso),
            precision: normalizeDatePrecision(entry?.precision),
            isoTo: normalizeText(entry?.isoTo),
            dateTo: normalizeText(entry?.dateTo),
            display: normalizeText(entry?.display),
            place: normalizeText(entry?.place),
            location: entry?.location || null,
            note: normalizeNoteText(entry?.note),
        }));
    }

    function emptyEducationEntry(id) {
        return normalizeEducationEntries([{
            id,
            sourceTag: "WORK",
            type: null,
            title: "",
            date: null,
            year: null,
            iso: null,
            precision: "exact",
            isoTo: null,
            dateTo: null,
            display: null,
            place: null,
            location: null,
            note: null,
        }])[0] || {
            id,
            sourceTag: "WORK",
            type: null,
            title: null,
            date: null,
            year: null,
            iso: null,
            precision: "exact",
            isoTo: null,
            dateTo: null,
            display: null,
            place: null,
            location: null,
            note: null,
        };
    }

    class ProfileCareerEditor extends HTMLElement {
        connectedCallback() {
            if (this.__rendered) return;
            this.__rendered = true;
            this.__personId = normalizeId(this.getAttribute("person") || new URLSearchParams(window.location.search).get("person"));
            this.__record = null;
            this.__entries = [];
            this.__entrySeed = 0;
            this.__savedSnapshot = "";
            this.__history = [];
            this.__historyIndex = -1;
            this.__historyRestoring = false;
            this.__historyDebounceTimer = 0;
            this.innerHTML = TEMPLATE;

            this.__onInput = (event) => this.#handleInput(event);
            this.__onChange = (event) => this.#handleChange(event);
            this.__onClick = (event) => this.#handleClick(event);

            this.addEventListener("input", this.__onInput);
            this.addEventListener("change", this.__onChange);
            this.addEventListener("click", this.__onClick);

            this.#registerProviders();
            thirdPartyIconsApi()?.whenReady?.().then(() => {
                if (this.isConnected) {
                    this.#refreshAllLegends();
                }
            }).catch(() => { });
            void this.#loadExisting();
        }

        disconnectedCallback() {
            this.removeEventListener("input", this.__onInput);
            this.removeEventListener("change", this.__onChange);
            this.removeEventListener("click", this.__onClick);
            if (this.__extraPublishProvider && Array.isArray(window.__extraPublishFileProviders)) {
                const idx = window.__extraPublishFileProviders.indexOf(this.__extraPublishProvider);
                if (idx >= 0) window.__extraPublishFileProviders.splice(idx, 1);
            }
            if (this.__dirtyStateProvider && Array.isArray(window.__extraDirtyStateProviders)) {
                const idx = window.__extraDirtyStateProviders.indexOf(this.__dirtyStateProvider);
                if (idx >= 0) window.__extraDirtyStateProviders.splice(idx, 1);
            }
            if (this.__dirtyStateReset && Array.isArray(window.__extraDirtyStateResetCallbacks)) {
                const idx = window.__extraDirtyStateResetCallbacks.indexOf(this.__dirtyStateReset);
                if (idx >= 0) window.__extraDirtyStateResetCallbacks.splice(idx, 1);
            }
        }

        triggerToolbarAction(action, detail = {}) {
            if (action === "add-career") {
                const type = String(detail.careerType || "").trim() || null;
                this.#addCareer({ type });
            }
        }

        undo() {
            if (this.__historyIndex <= 0) return;
            this.__historyIndex -= 1;
            this.#applySnapshot(this.__history[this.__historyIndex]);
        }

        redo() {
            if (this.__historyIndex >= this.__history.length - 1) return;
            this.__historyIndex += 1;
            this.#applySnapshot(this.__history[this.__historyIndex]);
        }

        getCareerData() {
            return cloneJson(normalizeEducationEntries(this.__entries));
        }

        #registerProviders() {
            if (!Array.isArray(window.__extraPublishFileProviders)) window.__extraPublishFileProviders = [];
            this.__extraPublishProvider = async () => this.#buildPublishFiles();
            window.__extraPublishFileProviders.push(this.__extraPublishProvider);

            if (!Array.isArray(window.__extraDirtyStateProviders)) window.__extraDirtyStateProviders = [];
            this.__dirtyStateProvider = () => this.#isDirty();
            window.__extraDirtyStateProviders.push(this.__dirtyStateProvider);

            if (!Array.isArray(window.__extraDirtyStateResetCallbacks)) window.__extraDirtyStateResetCallbacks = [];
            this.__dirtyStateReset = () => this.#setSavedBaseline({ quiet: true });
            window.__extraDirtyStateResetCallbacks.push(this.__dirtyStateReset);
        }

        #snapshotState() {
            return JSON.stringify(this.getCareerData());
        }

        #setStatus(message, type = "info") {
            const status = this.querySelector(".pedu__status");
            if (!status) return;
            status.textContent = message || "";
            status.dataset.type = type;
            status.hidden = !message;
        }

        #notifyDirtyState() {
            document.querySelector("profile-editor")?.refreshDirtyState?.();
            document.dispatchEvent(new CustomEvent("profile-editor-dirty-change"));
        }

        #setSavedBaseline({ quiet = false } = {}) {
            this.__savedSnapshot = this.#snapshotState();
            this.__history = [this.__savedSnapshot];
            this.__historyIndex = 0;
            if (!quiet) this.#notifyDirtyState();
        }

        #scheduleHistoryCapture() {
            if (this.__historyRestoring) return;
            window.clearTimeout(this.__historyDebounceTimer);
            this.__historyDebounceTimer = window.setTimeout(() => this.#pushHistorySnapshot(), 120);
        }

        #pushHistorySnapshot() {
            if (this.__historyRestoring) return;
            const snapshot = this.#snapshotState();
            if (!snapshot) return;
            if (this.__history[this.__historyIndex] === snapshot) return;
            this.__history = this.__history.slice(0, this.__historyIndex + 1);
            this.__history.push(snapshot);
            this.__historyIndex = this.__history.length - 1;
        }

        #applySnapshot(snapshot) {
            if (!snapshot) return;
            this.__historyRestoring = true;
            try {
                this.__entries = normalizeEducationEntries(JSON.parse(snapshot));
                this.#syncEntrySeed();
                this.#render();
            } finally {
                this.__historyRestoring = false;
            }
            this.#notifyDirtyState();
        }

        #isDirty() {
            if (!this.__savedSnapshot) return false;
            return this.#snapshotState() !== this.__savedSnapshot;
        }

        async #loadExisting() {
            this.#setStatus("Loading career…");
            await ensurePeopleDb();
            let record = null;
            try {
                record = await window.PeopleDB.loadPerson(this.__personId);
            } catch (error) {
                record = null;
            }
            this.__record = record ? cloneJson(record) : window.PeopleDB.emptyRecord(this.__personId);
            this.__entries = normalizeEducationEntries(window.PeopleDB.toCareerData?.(this.__record) || this.__record.career || []);
            if (!this.__entries.length && this.__record?.source?.gedcomXref) {
                const fallbackEntries = await loadEducationFromGedcomXref(this.__record.source.gedcomXref);
                if (fallbackEntries.length) {
                    this.__entries = normalizeEducationEntries(fallbackEntries);
                }
            }
            this.#syncEntrySeed();
            this.#render();
            this.#setSavedBaseline({ quiet: true });
            document.querySelector("profile-editor")?.refreshDirtyState?.();
            this.#notifyDirtyState();
            this.#setStatus("");
        }

        #syncEntrySeed() {
            this.__entrySeed = this.__entries.reduce((max, entry) => {
                const match = String(entry?.id || "").match(/(\d+)$/);
                return match ? Math.max(max, Number(match[1]) || 0) : max;
            }, 0);
        }

        #nextEntryId() {
            this.__entrySeed += 1;
            return `career-${this.__entrySeed}`;
        }

        #listEl() {
            return this.querySelector(".pedu__list");
        }

        #legendText(entry, index) {
            return normalizeText(entry?.place) || normalizeText(entry?.title) || `Career entry ${index + 1}`;
        }

        #legendLogoValues(entry) {
            return [entry?.location?.placeName, entry?.place];
        }

        #legendLogoIconClass() {
            return "bi bi-building";
        }

        #renderLegendInner(entry, index, logoMeta = undefined) {
            const legend = this.#legendText(entry, index);
            const logo = renderLegendLogoHtml({
                values: this.#legendLogoValues(entry),
                defaultIconClass: this.#legendLogoIconClass(),
                altText: `${legend} logo`,
                meta: logoMeta,
            });
            return `${logo}<span data-entry-legend>${escapeHtml(legend)}</span>`;
        }

        #renderSelectOptions(options, selected) {
            return options.map((option) => `
                <option value="${escapeHtml(option.value)}"${option.value === selected ? " selected" : ""}>${escapeHtml(option.label)}</option>
            `).join("");
        }

        #renderEntry(entry, index) {
            const entryId = String(entry.id || `career-${index + 1}`);
            const placeId = `pedu-${entryId}-place`;
            const titleId = `pedu-${entryId}-title`;
            const dateId = `pedu-${entryId}-date`;
            const noteId = `pedu-${entryId}-note`;

            return `
                <fieldset class="pie__group" data-entry-id="${escapeHtml(entryId)}">
                    <legend class="pie__legend"><span class="pedu__legend-entry" data-entry-legend-wrap="${escapeHtml(entryId)}">${this.#renderLegendInner(entry, index)}</span></legend>
                    <div class="pie__row">
                        <label class="pie__label" for="pedu-${escapeHtml(entryId)}-type">Entry Type</label>
                        <div class="pie__field">
                            <select id="pedu-${escapeHtml(entryId)}-type" data-entry-id="${escapeHtml(entryId)}" data-field="type">
                                ${this.#renderSelectOptions(EDUCATION_TYPE_OPTIONS, String(entry.type || ""))}
                            </select>
                        </div>
                    </div>
                    <div class="pie__row pie__row--align-top">
                        <label class="pie__label" for="${escapeHtml(placeId)}">Employer / Company</label>
                        <div class="pie__field">
                            <location-field-editor data-entry-id="${escapeHtml(entryId)}" input-id="${escapeHtml(placeId)}" placeholder="Search or enter company, employer, or place" toggle-label="Show and Edit Location Details"></location-field-editor>
                        </div>
                    </div>
                    <div class="pie__row">
                        <label class="pie__label" for="${escapeHtml(titleId)}">Role / Position</label>
                        <div class="pie__field">
                            <input id="${escapeHtml(titleId)}" type="text" value="${escapeHtml(entry.title || "")}" placeholder="e.g. Software engineer, Teacher, Office manager" data-entry-id="${escapeHtml(entryId)}" data-field="title">
                        </div>
                    </div>
                    <div class="pie__row pie__row--align-top">
                        <label class="pie__label" for="${escapeHtml(dateId)}-start">Start Date</label>
                        <div class="pie__field">
                            <date-field-editor data-entry-id="${escapeHtml(entryId)}" data-field="dateStart" input-id="${escapeHtml(dateId)}-start" layout="inline" show-preview precisions="exact,before,after,between"></date-field-editor>
                        </div>
                    </div>
                    <div class="pie__row pie__row--align-top">
                        <label class="pie__label" for="${escapeHtml(dateId)}-end">End Date</label>
                        <div class="pie__field">
                            <date-field-editor data-entry-id="${escapeHtml(entryId)}" data-field="dateEnd" input-id="${escapeHtml(dateId)}-end" layout="inline" show-preview precisions="exact,before,after,between"></date-field-editor>
                        </div>
                    </div>
                    <div class="pie__row pie__row--align-top">
                        <label class="pie__label" for="${escapeHtml(noteId)}">Notes</label>
                        <div class="pie__field">
                            <textarea id="${escapeHtml(noteId)}" class="page-editor__field-textarea" rows="4" data-entry-id="${escapeHtml(entryId)}" data-field="note" placeholder="Optional details about the role, employer, or work period">${escapeHtml(entry.note || "")}</textarea>
                        </div>
                    </div>
                    <div class="pie__row">
                        <span class="pie__label">Actions</span>
                        <div class="pie__field pedu__inline-actions">
                            <button type="button" class="page-editor__button page-editor__sidebar-delete" data-action="remove-entry" data-entry-id="${escapeHtml(entryId)}">
                                <i class="bi bi-trash" aria-hidden="true"></i>
                                <span>Remove</span>
                            </button>
                        </div>
                    </div>
                </fieldset>
            `;
        }

        #render() {
            const list = this.#listEl();
            if (!list) return;
            if (!this.__entries.length) {
                list.innerHTML = `
                    <div class="pedu__empty">
                        <h3>No career history linked yet</h3>
                        <p class="pedu__empty-note">Add employers, roles, or work history entries. Each career record gets its own group box.</p>
                        <p><button type="button" class="page-editor__button" data-action="add-career"><i class="bi bi-buildings" aria-hidden="true"></i><span>Add career</span></button></p>
                    </div>
                `;
                return;
            }
            list.innerHTML = this.__entries.map((entry, index) => this.#renderEntry(entry, index)).join("");
            this.#bindLocationFields();
            this.#configureDateFields();
            this.#refreshAllLegends();
        }

        #entryById(entryId) {
            const key = String(entryId || "").trim();
            return this.__entries.find((entry) => String(entry.id || "") === key) || null;
        }

        #refreshLegend(entryId) {
            const entry = this.#entryById(entryId);
            if (!entry) return;
            const node = [...this.querySelectorAll("[data-entry-legend-wrap]")]
                .find((element) => element.getAttribute("data-entry-legend-wrap") === String(entryId));
            if (node) {
                const index = this.__entries.findIndex((item) => String(item.id) === String(entryId));
                node.innerHTML = this.#renderLegendInner(entry, index >= 0 ? index : 0);

                this.__legendLogoTokens = this.__legendLogoTokens instanceof Map ? this.__legendLogoTokens : new Map();
                const token = (this.__legendLogoTokens.get(String(entryId)) || 0) + 1;
                this.__legendLogoTokens.set(String(entryId), token);
                const values = this.#legendLogoValues(entry);

                void resolveOrganizationLogoMetaAsync(values).then((meta) => {
                    if (!meta || !node.isConnected) return;
                    if (this.__legendLogoTokens?.get(String(entryId)) !== token) return;
                    const latestEntry = this.#entryById(entryId);
                    if (!latestEntry) return;
                    const latestIndex = this.__entries.findIndex((item) => String(item.id) === String(entryId));
                    node.innerHTML = this.#renderLegendInner(latestEntry, latestIndex >= 0 ? latestIndex : 0, meta);
                }).catch(() => { });
            }
        }

        #refreshAllLegends() {
            this.__entries.forEach((entry) => this.#refreshLegend(entry?.id));
        }

        #bindLocationFields() {
            this.__locationFields = new Map();
            this.querySelectorAll("location-field-editor[data-entry-id]").forEach((field) => {
                const entryId = String(field.getAttribute("data-entry-id") || "").trim();
                if (!entryId) return;
                const entry = this.#entryById(entryId);
                this.__locationFields.set(entryId, field);
                field.detailFields = LOCATION_DETAIL_FIELDS;
                field.searchProvider = searchLocationMatches;
                field.formatSummary = infoboxApi().formatLocationSummary || ((value, fallback) => fallback || value?.label || "");
                field.normalizeValue = infoboxApi().normalizeLocationData || ((value) => value || {});
                field.ensureDetails = infoboxApi().ensureLocationDetailsFromSummary || ((value) => value || {});
                field.hasDetails = infoboxApi().hasLocationDetails || ((value) => LOCATION_DETAIL_FIELDS.some((detail) => String(value?.[detail.key] || "").trim()));
                field.emptyValueFactory = infoboxApi().emptyLocationData || (() => ({}));
                field.setValue(entry?.location || {}, { expanded: false });
                if (entry?.place) {
                    const searchInput = field.querySelector(".location-field-editor__search");
                    if (searchInput) {
                        searchInput.value = String(entry.place || "");
                    }
                }
            });
        }

        #configureDateFields() {
            this.querySelectorAll("date-field-editor[data-entry-id]").forEach((field) => {
                const entry = this.#entryById(String(field.getAttribute("data-entry-id") || ""));
                const which = String(field.getAttribute("data-field") || "dateStart").trim();
                field.previewFormatter = componentDatePreview;
                field.setValue({
                    precision: normalizeDatePrecision(entry?.precision),
                    date: normalizeStructuredDate(which === "dateEnd" ? (entry?.isoTo || entry?.dateTo || "") : (entry?.iso || entry?.date || "")),
                    dateTo: "",
                    circa: false,
                    circaTo: false,
                });
            });
        }

        #handleClick(event) {
            const button = event.target.closest("[data-action]");
            if (!button) return;
            const action = String(button.dataset.action || "").trim();
            if (action === "add-career") {
                this.#addCareer();
                return;
            }
            if (action === "remove-entry") {
                this.#removeEntry(String(button.dataset.entryId || ""));
            }
        }

        #handleInput(event) {
            const target = event.target;

            if (target instanceof HTMLElement && target.matches("date-field-editor[data-entry-id]")) {
                const entry = this.#entryById(String(target.getAttribute("data-entry-id") || ""));
                if (!entry) return;
                const value = target.getValue?.() || {};
                // Determine whether this editor is the start or end date based on data-field
                const which = String(target.dataset.field || "").trim();
                const iso = normalizeStructuredDate(value.date || "");
                if (!which || which === "dateStart") {
                    entry.iso = iso || null;
                    entry.date = iso ? formatGedcomDateFromStructured(iso, value.precision) : null;
                    entry.year = yearFromStructuredDate(iso);
                    entry.precision = normalizeDatePrecision(value.precision);
                    entry.display = iso ? datePreview(iso, entry.precision) : null;
                } else if (which === "dateEnd") {
                    entry.isoTo = iso || null;
                    entry.dateTo = iso ? formatGedcomDateFromStructured(iso, value.precision) : null;
                }
                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyState();
                return;
            }

            if (target instanceof HTMLElement && target.matches("location-field-editor[data-entry-id]")) {
                const entryId = String(target.getAttribute("data-entry-id") || "");
                const entry = this.#entryById(entryId);
                if (!entry) return;
                const detailField = String(event.detail?.field || "").trim();
                if (detailField === "search") {
                    entry.place = normalizeText(event.detail?.query || "");
                    entry.location = null;
                } else {
                    const location = target.getValue?.() || {};
                    const formatSummary = infoboxApi().formatLocationSummary || ((value, fallback) => fallback || value?.label || "");
                    entry.location = cloneJson(location);
                    entry.place = normalizeText(formatSummary(location, location.label || entry.place || ""));
                }
                this.#refreshLegend(entryId);
                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyState();
                return;
            }

            if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
            const entry = this.#entryById(String(target.dataset.entryId || ""));
            if (!entry) return;
            const field = String(target.dataset.field || "").trim();
            if (!field) return;

            if (field === "sourceTag") {
                entry.sourceTag = String(target.value || "").toUpperCase() === "OCCU" ? "OCCU" : "WORK";
            } else if (field === "type") {
                entry.type = normalizeText(target.value);
            } else if (field === "title") {
                entry.title = normalizeText(target.value);
                this.#refreshLegend(entry.id);
            } else if (field === "note") {
                entry.note = normalizeNoteText(target.value);
            }

            this.#setStatus("");
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        #handleChange(event) {
            this.#handleInput(event);
        }

        #addCareer({ type = null } = {}) {
            const entryId = this.#nextEntryId();
            const entry = emptyEducationEntry(entryId);
            if (type) entry.type = String(type).trim() || null;
            this.__entries.push(entry);
            this.#render();
            this.#setStatus("");
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
            requestAnimationFrame(() => {
                this.querySelector(`location-field-editor[data-entry-id="${entryId}"]`)?.focusSearch?.();
            });
        }

        #removeEntry(entryId) {
            const before = this.__entries.length;
            this.__entries = this.__entries.filter((entry) => String(entry.id || "") !== String(entryId || ""));
            if (this.__entries.length === before) return;
            this.#render();
            this.#setStatus("");
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        async #buildCurrentRecord() {
            let record = cloneJson(this.__record);
            if (!record) {
                try {
                    record = cloneJson(await window.PeopleDB.loadPerson(this.__personId));
                } catch (error) {
                    record = null;
                }
            }
            record = record || window.PeopleDB.emptyRecord(this.__personId);

            const infoboxData = document.querySelector("profile-infobox-editor")?.getProfileData?.();
            if (infoboxData) {
                record = window.PeopleDB.applyInfoboxToRecord(record, infoboxData);
            }
            const personalData = document.querySelector("profile-personal-editor")?.getPersonalData?.();
            if (personalData) {
                record = window.PeopleDB.applyPersonalToRecord(record, personalData);
            }
            const educationData = document.querySelector("profile-education-editor")?.getEducationData?.();
            if (educationData && typeof window.PeopleDB.applyEducationToRecord === "function") {
                record = window.PeopleDB.applyEducationToRecord(record, educationData);
            }
            return record;
        }

        async #buildPublishFiles() {
            if (!this.#isDirty()) {
                return [];
            }

            await ensurePeopleDb();
            let record = await this.#buildCurrentRecord();
            record = window.PeopleDB.applyCareerToRecord(record, this.getCareerData());
            this.__record = cloneJson(record);

            return [{
                path: window.PeopleDB.recordPath(this.__personId),
                content: `${JSON.stringify(record, null, 2)}\n`,
            }];
        }
    }

    if (!customElements.get("profile-career-editor")) {
        customElements.define("profile-career-editor", ProfileCareerEditor);
    }
})();