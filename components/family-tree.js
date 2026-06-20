/**
 * <family-tree> — an interactive, pan/zoom GEDCOM family-tree viewer rendered
 * inline on the profile Tree tab.
 *
 * It is fully self-contained: the markup, styles and bootstrap-icons stylesheet
 * are injected into a shadow root so nothing leaks into (or is affected by) the
 * host page. The GEDCOM parsing library (window.GenepediaGedcom) is loaded on demand.
 *
 * Attributes:
 *   ged    — URL of the GEDCOM file to render (absolute, or resolved against the
 *            current page).
 *   person — a Genepedia profile id (or GEDCOM xref) to open centred/selected.
 *   readonly   — hide edit/add controls when present.
 *   theme      — "light" | "dark" (falls back to the site/OS theme).
 *   whole-tree — render every disconnected branch and lone person when present.
 */
(function () {
	"use strict";

	const CONFIG = {
		nodeWidth: 260,
		nodeHeight: 96,
		partnerGap: 28,
		siblingGap: 70,
		generationGap: 170,
		padding: 80,
		minScale: 0.2,
		maxScale: 2.8,
	};

	// Distinct connector/accent colours used to tell apart the different
	// marriages of a person who had children with more than one partner. Picked
	// to read clearly on both the dark (default) and light tree themes.
	const LINK_COLORS = [
		"#4c9aff", // blue
		"#f06292", // pink
		"#66bb6a", // green
		"#ffa726", // orange
		"#ab47bc", // purple
		"#26c6da", // cyan
		"#d4e157", // lime
		"#8d6e63", // brown
	];

	// Sizing used to pick the Tree tab's initial zoom: a node's Edit/Add buttons
	// (.node__actions .icon-button, 28px in tree space) should open at the same
	// on-screen size as the standard site buttons — footer social icons are 36px
	// and the header notifications button is 39px, so ~37px is the target.
	const NODE_ACTION_BUTTON_PX = 28;
	const SITE_BUTTON_PX = 37;

	const BOOTSTRAP_ICONS_HREF =
		"https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css";
	const GEDCOM_LIBRARY_SRC =
		"https://cdn.jsdelivr.net/gh/Genepedia/GEDCOM@main/dist/genepedia-gedcom.min.js";
	const GEDCOM_POINTER_RE = /^@([^@]+)@$/;
	const GEDCOM_EVENT_TAGS = new Set([
		"ADOP",
		"BAPM",
		"BARM",
		"BASM",
		"BIRT",
		"BLES",
		"BURI",
		"CENS",
		"CHR",
		"CHRA",
		"CONF",
		"CREM",
		"DEAT",
		"DIV",
		"DIVF",
		"EDUC",
		"EMIG",
		"ENGA",
		"EVEN",
		"FCOM",
		"GRAD",
		"IMMI",
		"MARB",
		"MARC",
		"MARL",
		"MARR",
		"MARS",
		"NATU",
		"OCCU",
		"ORDN",
		"PROB",
		"RELI",
		"RESI",
		"RETI",
		"WILL",
	]);
	const GEDCOM_TAG_LABELS = {
		ADDR: "Address",
		ADOP: "Adoption",
		ADR1: "Address line 1",
		ADR2: "Address line 2",
		ADR3: "Address line 3",
		AGE: "Age",
		AGNC: "Agency",
		BAPM: "Baptism",
		BARM: "Bar mitzvah",
		BASM: "Bat mitzvah",
		BIRT: "Birth",
		BLES: "Blessing",
		BURI: "Burial",
		CAUS: "Cause",
		CENS: "Census",
		CHAN: "Last changed",
		CHAR: "Character set",
		CHIL: "Child",
		CHR: "Christening",
		CHRA: "Adult christening",
		CITY: "City",
		CONF: "Confirmation",
		CONT: "Continued",
		CONC: "Concatenated",
		CORP: "Corporation",
		CREM: "Cremation",
		CTRY: "Country",
		DATE: "Date",
		DEAT: "Death",
		DIV: "Divorce",
		DIVF: "Divorce filed",
		EDUC: "Education",
		EMAIL: "Email",
		EMIG: "Emigration",
		ENGA: "Engagement",
		EVEN: "Event",
		FAMC: "Family as child",
		FAMS: "Family as spouse",
		FCOM: "First communion",
		FILE: "File",
		FORM: "Format",
		GEDC: "GEDCOM",
		GIVN: "Given name",
		GRAD: "Graduation",
		HEAD: "Header",
		HUSB: "Husband",
		IMMI: "Immigration",
		MARB: "Marriage bann",
		MARC: "Marriage contract",
		MARL: "Marriage license",
		MARNM: "Married name",
		_PET: "Pet",
		_SPEC: "Species",
		_BREED: "Breed",
		_OWNER: "Owner",
		MARR: "Marriage",
		MARS: "Marriage settlement",
		NAME: "Name",
		NATI: "Nationality",
		NATU: "Naturalization",
		NCHI: "Number of children",
		NICK: "Nickname",
		NOTE: "Note",
		NPFX: "Name prefix",
		NSFX: "Name suffix",
		OBJE: "Media",
		OCCU: "Occupation",
		ORDN: "Ordination",
		PEDI: "Pedigree",
		PHON: "Phone",
		PLAC: "Place",
		POST: "Postal code",
		PROB: "Probate",
		REFN: "Reference number",
		REPO: "Repository",
		RELI: "Religion",
		RESI: "Residence",
		RETI: "Retirement",
		RFN: "Record file number",
		RIN: "Record ID",
		SEX: "Sex",
		SOUR: "Source",
		SPFX: "Surname prefix",
		STAE: "State",
		SUBM: "Submitter",
		SURN: "Surname",
		TEXT: "Text",
		TIME: "Time",
		TITL: "Title",
		TYPE: "Type",
		WIFE: "Wife",
		WILL: "Will",
		WWW: "Website",
		_PRIM: "Primary",
	};
	const GEDCOM_REFERENCE_RECORD_GETTERS = {
		NOTE: "getNoteRecord",
		OBJE: "getMultimediaRecord",
		REPO: "getRepositoryRecord",
		SOUR: "getSourceRecord",
		SUBM: "getSubmitterRecord",
	};

	// Resolve a site-root-relative path. Prefer the shared site helper (present on
	// every page that loads site-info.js); otherwise fall back to walking up from
	// the current profile page (…/people/<id>/profile.html → site root).
	function resolveSitePath(path) {
		const cleanPath = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(cleanPath);
		return new URL(`../../${cleanPath}`, window.location.href).href;
	}

	function isAbsoluteUrlLike(value) {
		return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || "").trim());
	}

	function resolvePersonMediaUrl(personId, path = "") {
		const id = String(personId || "").trim();
		const value = String(path || "").trim();
		if (isAbsoluteUrlLike(value)) {
			return value;
		}
		if (window.App?.resolvePersonMediaUrl) {
			return window.App.resolvePersonMediaUrl(id, value);
		}

		const normalized = value.replace(/^\.?\//, "").replace(/^\/+/, "");
		if (!normalized) {
			return resolveSitePath(`data/Genepedia-Media/people/${encodeURIComponent(id)}/`);
		}

		const relative = normalized.startsWith("data/images/")
			? normalized.slice("data/images/".length)
			: normalized.startsWith("images/")
				? normalized.slice("images/".length)
				: normalized;
		return resolveSitePath(`data/Genepedia-Media/people/${encodeURIComponent(id)}/${relative}`);
	}

	// Load genepedia-gedcom once (it defines the global window.GenepediaGedcom).
	// The profile page doesn't include it, so the component pulls it in on demand.
	let gedcomLibPromise = null;
	function ensureGedcomLibrary() {
		if (window.GenepediaGedcom && typeof window.GenepediaGedcom.readGedcom === "function") {
			return Promise.resolve();
		}
		if (gedcomLibPromise) return gedcomLibPromise;

		gedcomLibPromise = new Promise((resolve, reject) => {
			const existing = [...document.querySelectorAll("script[src], script[data-genepedia-gedcom]")]
				.find((script) => script.dataset.genepediaGedcom || script.src === GEDCOM_LIBRARY_SRC);
			if (existing) {
				if (window.GenepediaGedcom) {
					resolve();
					return;
				}
				existing.addEventListener("load", () => resolve());
				existing.addEventListener("error", () => reject(new Error("Could not load the GEDCOM library.")));
				return;
			}

			const script = document.createElement("script");
			script.src = GEDCOM_LIBRARY_SRC;
			script.crossOrigin = "anonymous";
			script.dataset.genepediaGedcom = "1";
			script.addEventListener("load", () => resolve());
			script.addEventListener("error", () => reject(new Error("Could not load the GEDCOM library.")));
			document.head.appendChild(script);
		});
		return gedcomLibPromise;
	}

	function requireGedcomLibrary() {
		const api = window.GenepediaGedcom;
		if (!api || typeof api.readGedcom !== "function") {
			throw new Error("The GEDCOM library (window.GenepediaGedcom) is not available.");
		}
		return api;
	}

	async function loadTreeData(url) {
		const response = await fetch(url, { cache: "no-cache" });
		if (!response.ok) {
			throw new Error(`Unable to load GEDCOM file: ${response.status} ${response.statusText}`);
		}
		const gedcom = requireGedcomLibrary().readGedcom(await response.arrayBuffer());
		return gedcomToTreeData(gedcom);
	}

	function gedcomToTreeData(gedcom) {
		const individuals = gedcom.getIndividualRecord().array();
		const families = gedcom.getFamilyRecord().array();
		const people = individuals.map((individual) => gedcomIndividualToPerson(individual, gedcom));
		const peopleByGedcomId = new Set(people.map((person) => person.id));
		const unions = families
			.map((family) => gedcomFamilyToUnion(family, peopleByGedcomId))
			.filter((union) => union.partners.length > 0 || union.children.length > 0);

		return {
			gedcom,
			people,
			rootUnionId: unions[0]?.id ?? "",
			unions,
		};
	}

	// Owner (tree person id) of a pet family — the synthetic @PETF_<owner>@ union
	// has the owner as its sole partner.
	function petUnionOwnerId(union) {
		return (union.partners || []).find(Boolean) ?? "";
	}

	// Return tree data with each owner's pets shown or hidden. Pets are INDI
	// records (`isPet`) attached through `isPetUnion` families; `visibleOwners` is
	// the set of person ids whose pets should appear. Owners not in the set have
	// their pets (and pet family) stripped, so the genealogy lays out unchanged.
	function filterTreeData(data, visibleOwners) {
		const owners = visibleOwners instanceof Set ? visibleOwners : new Set();
		// Only owner-attached pets (children of a synthetic `isPetUnion` family in a
		// PEOPLE tree) are hideable. An ANIMAL tree has no pet-unions — its pets are
		// connected by ordinary unions — so it passes through untouched.
		const petUnions = data.unions.filter((union) => union.isPetUnion);
		if (!petUnions.length) {
			return data;
		}
		const hiddenUnionIds = new Set(
			petUnions.filter((union) => !owners.has(petUnionOwnerId(union))).map((union) => union.id),
		);
		const hiddenPetIds = new Set();
		for (const union of petUnions) {
			if (!hiddenUnionIds.has(union.id)) continue;
			for (const childId of union.children || []) hiddenPetIds.add(childId);
		}
		const people = data.people.filter((person) => !hiddenPetIds.has(person.id));
		const unions = data.unions
			.filter((union) => !hiddenUnionIds.has(union.id))
			.map((union) => {
				// "Children / Pets" is a switch: when an owner is showing their pets,
				// hide that union's human children so pets replace them (not stack with
				// them). Their own profile still shows the children when focused there.
				if (!union.isPetUnion && (union.children?.length) && (union.partners || []).some((pid) => owners.has(pid))) {
					return { ...union, children: [] };
				}
				return union;
			});
		const rootUnionId = unions.some((union) => union.id === data.rootUnionId)
			? data.rootUnionId
			: (unions[0]?.id ?? "");
		return { ...data, people, unions, rootUnionId };
	}

	// Pet families owned by a given person (so the viewer can offer a per-person
	// "show pets" switch below them).
	function petUnionsForOwner(data, personId) {
		return data.unions.filter((union) => union.isPetUnion && petUnionOwnerId(union) === personId);
	}

	function gedcomIndividualToPerson(record, rootGedcom = null) {
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
		const genepediaId = gedcomGenepediaId(record);
		const petNode = firstChild(record, "_PET");
		const isPet = Boolean(petNode);
		const speciesRaw = isPet ? String(petNode.value ?? "").trim() : "";
		const species = speciesRaw && speciesRaw.toUpperCase() !== "Y" ? speciesRaw : "";
		const ownerNode = firstChild(record, "_OWNER");
		const ownerName = ownerNode ? String(ownerNode.value ?? "").trim() : "";
		const ownerId = ownerNode ? String(childValue(ownerNode, "_OID") ?? "").trim() : "";
		// `_HASFAM` marks a pet that has its own animal family elsewhere (the pets
		// DB) that isn't drawn in this tree — so a Tree button is worth offering.
		const hasOwnTree = Boolean(firstChild(record, "_HASFAM"));

		return {
			genepediaId: genepediaId || undefined,
			aliases: gedcomIndividualAliases(record, primaryName),
			birthDate: birthDate || undefined,
			birthPlace: birthPlace || undefined,
			birthSurname: birthName ? gedcomNameSurname(birthName) : "",
			born: extractYearFromGedcomDate(birthDate),
			deathDate: deathDate || undefined,
			deathPlace: deathPlace || undefined,
			died: extractYearFromGedcomDate(deathDate),
			gender: sex === "M" || sex === "F" ? sex : "U",
			gedcom: record,
			gedcomXref: record.pointer,
			id,
			isPet,
			species: species || undefined,
			ownerName: ownerName || undefined,
			ownerId: ownerId || undefined,
			hasOwnTree,
			name: gedcomDisplayName(primaryName) || id,
			photoUrl: gedcomIndividualPhotoUrl(record, rootGedcom) || undefined,
			sex,
		};
	}

	function gedcomFamilyToUnion(record, peopleByGedcomId) {
		const partnerIds = ["HUSB", "WIFE"]
			.map((tag) => gedcomPointerId(childValue(record, tag)))
			.filter((id) => id && peopleByGedcomId.has(id));
		const childrenIds = children(record, "CHIL")
			.map((child) => gedcomPointerId(child.value))
			.filter((id) => id && peopleByGedcomId.has(id));

		return {
			children: [...new Set(childrenIds)],
			gedcom: record,
			gedcomXref: record.pointer,
			id: gedcomRecordId(record),
			isPetUnion: Boolean(firstChild(record, "_PETFAM")),
			partners: [...new Set(partnerIds)],
		};
	}

	// Map each of a person's parent-union ids to the pedigree (PEDI) recorded on
	// that person's FAMC link: "" / "birth" / "biological" → biological, plus
	// "adopted", "foster", "sealing". Lets the tree label and switch between a
	// person's biological and adopted (etc.) parent branches.
	function gedcomParentPediByUnion(person) {
		const map = new Map();
		if (!person?.gedcom) return map;
		for (const famc of children(person.gedcom, "FAMC")) {
			const unionId = gedcomPointerId(famc.value);
			if (!unionId) continue;
			const pedi = String(childValue(famc, "PEDI") || "").trim().toLowerCase();
			map.set(unionId, pedi);
		}
		return map;
	}

	function pediBranchLabel(pedi) {
		switch (String(pedi || "").trim().toLowerCase()) {
			case "adopted":
				return "Adopted";
			case "foster":
				return "Foster";
			case "sealing":
				return "Sealed";
			case "step":
				return "Step";
			case "":
			case "birth":
			case "biological":
			case "natural":
				return "Biological";
			default:
				return pedi.charAt(0).toUpperCase() + pedi.slice(1);
		}
	}

	function pediBranchIcon(pedi) {
		switch (String(pedi || "").trim().toLowerCase()) {
			case "adopted":
				return "heart-fill";
			case "foster":
				return "house-heart-fill";
			case "sealing":
				return "link-45deg";
			case "step":
				return "diagram-2";
			default:
				return "droplet-fill";
		}
	}

	function gedcomGenepediaId(record) {
		const custom = childValue(record, "_GENEPEDIA");
		if (custom && custom.trim()) return custom.trim();

		for (const refn of children(record, "REFN")) {
			const type = childValue(refn, "TYPE").trim().toLowerCase();
			if (type === "" || type === "genepedia") {
				const value = String(refn.value ?? "").trim();
				if (value) return value;
			}
		}

		return "";
	}

	function gedcomDisplayName(nameRecord) {
		if (!nameRecord) return "";

		// Prefer the curated display name when present (Genepedia custom tag).
		const curated = childValue(nameRecord, "_DISP").trim();
		if (curated) return curated;

		const given = childValue(nameRecord, "GIVN");
		const surnamePrefix = childValue(nameRecord, "SPFX");
		const surname = childValue(nameRecord, "SURN") || gedcomNameValueSurname(nameRecord.value);
		const fullSurname = [surnamePrefix, surname].filter(Boolean).join(" ");
		if (given || fullSurname) return [given, fullSurname].filter(Boolean).join(" ");

		return gedcomNameValueDisplay(nameRecord.value);
	}

	function gedcomNameSurname(nameRecord) {
		if (!nameRecord) return "";

		const surnamePrefix = childValue(nameRecord, "SPFX");
		const surname = childValue(nameRecord, "SURN") || gedcomNameValueSurname(nameRecord.value);
		if (surname || surnamePrefix) return [surnamePrefix, surname].filter(Boolean).join(" ");

		return "";
	}

	function gedcomNameValueSurname(value) {
		const match = String(value ?? "").match(/\/([^/]*)\//);
		return match ? match[1].trim() : "";
	}

	function gedcomNameValueDisplay(value) {
		return String(value ?? "")
			.replaceAll("/", "")
			.replace(/\s+/g, " ")
			.trim();
	}

	function gedcomIndividualAliases(record, primaryName = null) {
		const primary = gedcomDisplayName(primaryName);
		const aliases = [];
		for (const nameRecord of children(record, "NAME")) {
			if (nameRecord !== primaryName) {
				const display = gedcomDisplayName(nameRecord) || gedcomNameValueDisplay(nameRecord.value);
				if (display && display !== primary) aliases.push(display);
			}
			for (const nick of children(nameRecord, "NICK")) {
				const value = String(nick.value ?? "").trim();
				if (value && value !== primary) aliases.push(value);
			}
		}
		for (const nick of children(record, "NICK")) {
			const value = String(nick.value ?? "").trim();
			if (value && value !== primary) aliases.push(value);
		}
		return uniqueTextValues(aliases);
	}

	function gedcomIndividualPhotoUrl(record, rootGedcom = null) {
		const mediaRecords = [];
		for (const media of children(record, "OBJE")) {
			if (media.value && GEDCOM_POINTER_RE.test(String(media.value)) && rootGedcom?.getMultimediaRecord) {
				mediaRecords.push(...rootGedcom.getMultimediaRecord(media.value).array());
			} else {
				mediaRecords.push(media);
			}
		}

		const media = mediaRecords
			.map((record) => ({
				isPrimary: childValue(record, "_PRIM").trim().toUpperCase() === "Y",
				url: gedcomMediaFileUrl(record),
			}))
			.filter((item) => item.url);
		return (media.find((item) => item.isPrimary) ?? media[0])?.url ?? "";
	}

	function gedcomMediaFileUrl(mediaRecord) {
		for (const file of children(mediaRecord, "FILE")) {
			const url = String(file.value ?? "").trim();
			if (!url) continue;
			const format = String(childValue(file, "FORM") || childValue(mediaRecord, "FORM")).trim().toLowerCase();
			if (!format || ["gif", "jpeg", "jpg", "png", "webp"].includes(format)) return url;
		}
		return "";
	}

	function uniqueTextValues(values) {
		const seen = new Set();
		const result = [];
		for (const value of values ?? []) {
			const text = String(value ?? "").trim();
			if (!text || seen.has(text)) continue;
			seen.add(text);
			result.push(text);
		}
		return result;
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
		if (!event) return "";
		return gedcomPlaceAddressText(event);
	}

	function gedcomAddressParts(address) {
		if (!address) return [];
		const direct = String(address.value ?? "").trim();
		return [
			direct,
			childValue(address, "ADR1"),
			childValue(address, "ADR2"),
			childValue(address, "ADR3"),
			childValue(address, "CITY"),
			childValue(address, "STAE"),
			childValue(address, "POST"),
			childValue(address, "CTRY"),
		]
			.map((value) => String(value ?? "").trim())
			.filter(Boolean);
	}

	function gedcomAddressText(address) {
		return uniqueTextValues(gedcomAddressParts(address)).join(", ");
	}

	function gedcomPlaceParts(value) {
		return String(value ?? "")
			.split(/\s*,\s*/)
			.map((part) => part.trim())
			.filter(Boolean);
	}

	function gedcomPlaceAddressText(record) {
		if (!record) return "";
		const parts = [
			...gedcomPlaceParts(childValue(record, "PLAC")),
			...gedcomAddressParts(firstChild(record, "ADDR")),
		];
		return uniqueTextValues(parts).join(", ");
	}

	function gedcomSexText(value) {
		const sex = String(value ?? "U").trim().toUpperCase();
		if (sex === "M") return "Male";
		if (sex === "F") return "Female";
		if (sex === "X") return "Intersex";
		if (sex === "N") return "Not recorded";
		if (!sex || sex === "U") return "Unknown";
		return String(value ?? "").trim();
	}

	function gedcomTagLabel(tag) {
		const cleanTag = String(tag ?? "").trim();
		if (!cleanTag) return "Value";
		if (GEDCOM_TAG_LABELS[cleanTag]) return GEDCOM_TAG_LABELS[cleanTag];
		const withoutPrefix = cleanTag.replace(/^_+/, "");
		if (GEDCOM_TAG_LABELS[withoutPrefix]) return GEDCOM_TAG_LABELS[withoutPrefix];
		return withoutPrefix
			.toLowerCase()
			.replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
	}

	function gedcomNodeValueText(node) {
		if (!node) return "";
		const raw = String(node.value ?? "").trim();
		if (raw === "Y" && GEDCOM_EVENT_TAGS.has(node.tag)) return "";
		// `_PET Y` marks a pet whose species is unspecified — show "Pet", no "Y".
		if (node.tag === "_PET") return raw === "Y" ? "" : raw;
		if (node.tag === "NAME") return gedcomDisplayName(node) || gedcomNameValueDisplay(raw);
		if (node.tag === "SEX") return gedcomSexText(raw);
		if (node.tag === "ADDR") return gedcomAddressText(node) || raw;
		if (node.tag === "CHAN") return uniqueTextValues([childValue(node, "DATE"), childValue(firstChild(node, "DATE"), "TIME")]).join(" ");
		if (node.tag === "DATE") return uniqueTextValues([raw, childValue(node, "TIME")]).join(" ");
		if (GEDCOM_EVENT_TAGS.has(node.tag)) {
			return uniqueTextValues([
				raw,
				childValue(node, "TYPE"),
				childValue(node, "DATE"),
				gedcomPlaceAddressText(node),
				childValue(node, "AGE"),
				childValue(node, "CAUS"),
			]).join(" - ");
		}
		return raw;
	}

	function gedcomFactDetailLines(node, depth = 0) {
		const lines = [];
		for (const child of node?.children ?? []) {
			lines.push({
				depth,
				label: gedcomTagLabel(child.tag),
				value: gedcomNodeValueText(child),
				tag: child.tag,
			});
			lines.push(...gedcomFactDetailLines(child, depth + 1));
		}
		return lines;
	}

	function gedcomFactSummaries(record) {
		return (record?.children ?? []).map((node) => ({
			details: gedcomFactDetailLines(node),
			label: gedcomTagLabel(node.tag),
			tag: node.tag,
			value: gedcomNodeValueText(node),
		}));
	}

	function gedcomFactValues(record, tag) {
		return uniqueTextValues(children(record, tag).map(gedcomNodeValueText));
	}

	function gedcomReferencedRecords(rootGedcom, records) {
		if (!rootGedcom) return [];
		const found = [];
		const seen = new Set();

		const addRecord = (record) => {
			if (!record) return;
			const key = `${record.tag || ""}:${record.pointer || ""}:${record.indexSource ?? ""}`;
			if (seen.has(key)) return;
			seen.add(key);
			found.push(record);
		};

		const visit = (node) => {
			if (!node) return;
			const getter = GEDCOM_REFERENCE_RECORD_GETTERS[node.tag];
			const pointer = GEDCOM_POINTER_RE.test(String(node.value ?? "")) ? String(node.value) : "";
			if (getter && pointer && typeof rootGedcom[getter] === "function") {
				for (const record of rootGedcom[getter](pointer).array()) addRecord(record);
			}
			for (const child of node.children ?? []) visit(child);
		};

		for (const record of records ?? []) visit(record);
		return found;
	}

	function gedcomRecordId(record) {
		return record.pointer ? gedcomPointerId(record.pointer) : `${record.tag}-${record.indexSource}`;
	}

	function gedcomPointerId(value) {
		const match = String(value ?? "").match(GEDCOM_POINTER_RE);
		return match ? match[1] : "";
	}

	function childValue(record, tag) {
		const child = firstChild(record, tag);
		return child?.value ?? "";
	}

	function firstChild(record, tag) {
		return children(record, tag)[0] ?? null;
	}

	function children(record, tag) {
		return (record?.children ?? []).filter((child) => child.tag === tag);
	}

	// Read the <table-photo> portrait out of a person's identity table and return
	// it as a site-resolved URL (or "" when there is none). The src is resolved
	// relative to the person's data/ folder.
	async function readPersonPhotoFromFile(id, fileName) {
		const url = resolveSitePath(`pages/people/${encodeURIComponent(id)}/data/${fileName}`);
		const response = await fetch(url, { cache: "no-store" });
		if (!response.ok) return "";
		const doc = new DOMParser().parseFromString(await response.text(), "text/html");
		const src = doc.querySelector("table-photo img")?.getAttribute("src")?.trim() || "";
		if (!src) return "";
		if (isAbsoluteUrlLike(src)) return src;
		const normalized = src.replace(/^\.?\//, "");
		if (
			normalized.startsWith("assets/")
			|| normalized.startsWith("people/")
			|| normalized.startsWith("data/Genepedia-Media/")
		) {
			return resolveSitePath(normalized);
		}
		if (normalized.startsWith("data/")) {
			return resolveSitePath(`pages/people/${encodeURIComponent(id)}/${normalized}`);
		}
		return resolvePersonMediaUrl(id, normalized);
	}

	// Portrait lookup from the JSON database (the source of truth for structured
	// data). GEDCOM has no portrait field, so node avatars are hydrated from each
	// person's database record media.primary. Results are cached per person.
	function personDbBucket(id) {
		const n = Number(String(id).replace(/[^0-9]/g, "")) || 0;
		return Math.floor((Math.max(1, n) - 1) / 1000);
	}

	function resolvePeopleDbPath(path = "") {
		const clean = String(path || "").replace(/^\/+/, "");
		if (typeof window.App?.resolvePeopleDbPath === "function") {
			return window.App.resolvePeopleDbPath(clean);
		}
		if (!clean) {
			return "data/Genepedia-Database/people";
		}
		if (clean.startsWith("data/Genepedia-Database/people/")) {
			return clean;
		}
		if (clean === "data/Genepedia-Database") {
			return "data/Genepedia-Database/people";
		}
		if (clean.startsWith("data/Genepedia-Database/")) {
			return `data/Genepedia-Database/people/${clean.slice("data/Genepedia-Database/".length)}`;
		}
		if (clean.startsWith("data/people/")) {
			return `data/Genepedia-Database/people/${clean.slice("data/people/".length)}`;
		}
		return `data/Genepedia-Database/people/${clean}`;
	}

	async function readPersonPhotoFromDb(id) {
		const url = resolveSitePath(resolvePeopleDbPath(`persons/${personDbBucket(id)}/${encodeURIComponent(id)}.json`));
		const response = await fetch(url, { cache: "no-store" });
		if (!response.ok) return "";
		const record = await response.json();
		const primary = record?.media?.primary;
		if (!primary) return "";
		if (typeof window.App?.resolvePreferredPersonMediaUrl === "function") {
			return String(window.App.resolvePreferredPersonMediaUrl(id, primary) || "");
		}
		if (primary.local) {
			return resolvePersonMediaUrl(id, primary.local);
		}
		return String(primary.remote || "");
	}

	// Resolve the portrait for a Genepedia person. Tries the JSON database first
	// (canonical), then falls back to a person's profile prose for older or
	// hand-authored profiles. Results are cached (as promises) per person.
	const personPhotoCache = new Map();
	function resolveGenepediaPhotoUrl(genepediaId) {
		const id = String(genepediaId || "").trim();
		if (!id) return Promise.resolve("");
		if (personPhotoCache.has(id)) return personPhotoCache.get(id);

		const promise = (async () => {
			try {
				const dbUrl = await readPersonPhotoFromDb(id);
				if (dbUrl) return dbUrl;
			} catch (error) {
				// Fall through to prose-based lookup.
			}
			for (const fileName of ["profile.html"]) {
				try {
					const url = await readPersonPhotoFromFile(id, fileName);
					if (url) return url;
				} catch (error) {
					// Try the next candidate file.
				}
			}
			return "";
		})();

		personPhotoCache.set(id, promise);
		return promise;
	}

	// Populate person.photoUrl for every person that maps to a Genepedia profile.
	// Runs before the first render so portraits appear immediately. Failures are
	// silent — the node simply falls back to its placeholder icon.
	async function enrichPeopleWithPhotos(people) {
		await Promise.all(
			(people || []).map(async (person) => {
				if (!person || person.photoUrl) return;
				// Pets live in a separate database; their `genepediaId` is a pet id that
				// would collide with a person id here, so never resolve a pet's portrait
				// from the people DB — they fall back to the paw placeholder.
				if (person.isPet) return;
				const url = await resolveGenepediaPhotoUrl(person.genepediaId);
				if (url) person.photoUrl = url;
			}),
		);
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function byId(list) {
		const map = new Map();
		for (const item of list) map.set(item.id, item);
		return map;
	}

	function formatDates(person) {
		const born = person.birthDate || (typeof person.born === "number" ? String(person.born) : "");
		const died = person.deathDate || (typeof person.died === "number" ? String(person.died) : "");
		if (!born && !died) return "";
		return `(${born} - ${died})`;
	}

	function normalizeGender(gender) {
		if (gender === "M" || gender === "F") return gender;
		return "U";
	}

	function surnameFromName(name) {
		const parts = String(name)
			.replace(/\s+/g, " ")
			.trim()
			.split(" ")
			.filter(Boolean);
		if (parts.length === 0) return "";
		return parts[parts.length - 1];
	}

	function formatDisplayName(person) {
		if (!person) return "";
		const base = String(person.name ?? person.id ?? "");
		const gender = normalizeGender(person.gender);
		if (gender !== "F") return base;

		const birthSurname = typeof person.birthSurname === "string" ? person.birthSurname.trim() : "";
		if (!birthSurname) return base;
		const currentSurname = surnameFromName(base);
		if (!currentSurname) return base;
		if (currentSurname.toLowerCase() === birthSurname.toLowerCase()) return base;
		return `${base} (${birthSurname})`;
	}

	function buildIndexes(data) {
		const peopleById = byId(data.people);
		const unionsById = byId(data.unions);
		const unionsByPartner = new Map();
		const parentUnionsByChild = new Map();

		for (const union of data.unions) {
			for (const partnerId of union.partners) {
				if (!unionsByPartner.has(partnerId)) unionsByPartner.set(partnerId, []);
				unionsByPartner.get(partnerId).push(union.id);
			}

			for (const childId of union.children ?? []) {
				if (!parentUnionsByChild.has(childId)) parentUnionsByChild.set(childId, []);
				parentUnionsByChild.get(childId).push(union.id);
			}
		}

		return { peopleById, unionsById, unionsByPartner, parentUnionsByChild };
	}

	function createLayoutEngine(data, indexes) {
		const clusterMemo = new Map();

		// A union "cluster" groups a union with related unions so multi-partner
		// families render together. When `expand` is true (used only for the rooted
		// union) it also pulls in each partner's OTHER unions — this is what surfaces
		// the focus person's half-siblings (their parents' children with other
		// partners) and step-parents. Child/descendant unions are built WITHOUT
		// expansion so a relative who married into two generations (e.g. a partner
		// shared between a parent and a sibling) can't drag a parent down into a
		// lower row.
		function getUnionCluster(primaryUnionId, expand = true) {
			const memoKey = `${primaryUnionId}|${expand ? 1 : 0}`;
			if (clusterMemo.has(memoKey)) return clusterMemo.get(memoKey);
			const primary = indexes.unionsById.get(primaryUnionId);
			if (!primary) {
				const empty = {
					unionIds: [primaryUnionId],
					partnerIds: [],
					childIds: [],
				};
				clusterMemo.set(memoKey, empty);
				return empty;
			}

			if (!expand) {
				const cluster = {
					unionIds: [primaryUnionId],
					partnerIds: [...new Set((primary.partners ?? []).filter(Boolean))],
					childIds: [...new Set((primary.children ?? []).filter(Boolean))],
				};
				clusterMemo.set(memoKey, cluster);
				return cluster;
			}

			// Cluster = primary union plus any unions for the primary union's partners.
			// This is what enables multi-partner display (e.g. show all spouses for Leslie).
			const unionIds = [];
			const seenUnionIds = new Set();
			const pushUnionId = (id) => {
				if (!id || seenUnionIds.has(id)) return;
				seenUnionIds.add(id);
				unionIds.push(id);
			};
			pushUnionId(primaryUnionId);
			for (const partnerId of primary.partners ?? []) {
				const ids = indexes.unionsByPartner.get(partnerId) ?? [];
				for (const id of ids) pushUnionId(id);
			}

			const partnerIds = [];
			const seenPartnerIds = new Set();
			const pushPartnerId = (id) => {
				if (!id || seenPartnerIds.has(id)) return;
				seenPartnerIds.add(id);
				partnerIds.push(id);
			};
			for (const id of primary.partners ?? []) pushPartnerId(id);
			for (const unionId of unionIds) {
				const union = indexes.unionsById.get(unionId);
				for (const id of union?.partners ?? []) pushPartnerId(id);
			}

			const childIds = [];
			const seenChildIds = new Set();
			const pushChildId = (id) => {
				if (!id || seenChildIds.has(id)) return;
				seenChildIds.add(id);
				childIds.push(id);
			};
			for (const id of primary.children ?? []) pushChildId(id);
			for (const unionId of unionIds) {
				if (unionId === primaryUnionId) continue;
				const union = indexes.unionsById.get(unionId);
				for (const id of union?.children ?? []) pushChildId(id);
			}

			const cluster = { unionIds, partnerIds, childIds };
			clusterMemo.set(memoKey, cluster);
			return cluster;
		}

		// A person's "hub" cluster: ALL the marriages they are a partner in, so the
		// focus person (and every relative below the root) shows every spouse and
		// every child — e.g. Dirk's kids with three different women all appear, not
		// just one. `stack` holds the union ids already open in the ancestor chain;
		// unions already on it are skipped so a person who married across
		// generations doesn't recurse forever (they're simply drawn again — the
		// duplication model lets people appear in more than one place).
		function getPersonHubCluster(personId, stack) {
			const all = indexes.unionsByPartner.get(personId) ?? [];
			const unionIds = stack ? all.filter((u) => !stack.has(u)) : all.slice();

			const partnerIds = [];
			const seenP = new Set();
			const pushP = (id) => {
				if (id && !seenP.has(id)) {
					seenP.add(id);
					partnerIds.push(id);
				}
			};
			pushP(personId);
			for (const uid of unionIds) {
				for (const pid of indexes.unionsById.get(uid)?.partners ?? []) pushP(pid);
			}

			const childIds = [];
			const seenC = new Set();
			for (const uid of unionIds) {
				for (const cid of indexes.unionsById.get(uid)?.children ?? []) {
					if (cid && !seenC.has(cid)) {
						seenC.add(cid);
						childIds.push(cid);
					}
				}
			}

			return { unionIds, partnerIds, childIds };
		}

		// Width a cluster (root union cluster OR a person hub) needs, including all
		// its descendants. Mirrors layoutCluster exactly so centring lines up.
		function measureCluster(cluster, stack) {
			const partnersWidth =
				cluster.partnerIds.length * CONFIG.nodeWidth +
				Math.max(0, cluster.partnerIds.length - 1) * CONFIG.partnerGap;

			for (const uid of cluster.unionIds) stack.add(uid);
			const childWidths = cluster.childIds.map((cid) =>
				measureCluster(getPersonHubCluster(cid, stack), stack),
			);
			for (const uid of cluster.unionIds) stack.delete(uid);

			const childrenWidth = childWidths.length
				? childWidths.reduce((sum, w) => sum + w, 0) +
				Math.max(0, childWidths.length - 1) * CONFIG.siblingGap
				: 0;

			return Math.max(CONFIG.nodeWidth, partnersWidth, childrenWidth);
		}

		function layout(rootUnionId, opts = {}) {
			// `positions` keep a single FIRST-WINS coordinate per person/union — used
			// by focus-centring, the branch switcher, the sidebar and visibility
			// checks. `placements` are the actual draw instances: a person can be
			// drawn more than once (once per marriage, plus once as a child) so that
			// someone who married across generations — e.g. a partner shared by a
			// parent and a sibling — renders cleanly in each spot instead of being
			// dragged into one row with a long connector. The user explicitly wants
			// people to be allowed to appear in more than one place.
			const positions = {
				people: new Map(),
				unions: new Map(),
			};
			const placements = {
				people: [],
				unions: [],
			};

			const recordPerson = (personId, x, y) => {
				const duplicate = positions.people.has(personId);
				if (!duplicate) positions.people.set(personId, { x, y });
				const rec = { personId, x, y, duplicate };
				placements.people.push(rec);
				return rec;
			};

			// Lay out a cluster (the rooted union cluster, or a person hub) at xLeft
			// and recurse each child as its OWN hub so every person shows all their
			// marriages and children. Returns the placement rec of `anchorPersonId`
			// (used to connect a parent union down to this child).
			function layoutCluster(cluster, xLeft, depth, stack, anchorPersonId = null) {
				const clusterWidth = measureCluster(cluster, stack);
				const centerX = xLeft + clusterWidth / 2;
				const y = CONFIG.padding + depth * CONFIG.generationGap;

				const partnersWidth =
					cluster.partnerIds.length * CONFIG.nodeWidth +
					Math.max(0, cluster.partnerIds.length - 1) * CONFIG.partnerGap;
				const partnersLeft = centerX - partnersWidth / 2;

				const localPos = new Map();
				const anchorRecs = new Map();
				for (let idx = 0; idx < cluster.partnerIds.length; idx += 1) {
					const personId = cluster.partnerIds[idx];
					const x =
						partnersLeft + idx * (CONFIG.nodeWidth + CONFIG.partnerGap) + CONFIG.nodeWidth / 2;
					localPos.set(personId, { x, y });
					anchorRecs.set(personId, recordPerson(personId, x, y));
				}

				const unionLineY = y + CONFIG.nodeHeight / 2 + 18;
				const childTopY = y + CONFIG.generationGap - CONFIG.nodeHeight / 2;

				// Group children by the union (marriage) they came from, so each set
				// of children can be drawn hanging from its own parent couple.
				const childToParentUnionIds = new Map();
				for (const uid of cluster.unionIds) {
					for (const cid of indexes.unionsById.get(uid)?.children ?? []) {
						if (!childToParentUnionIds.has(cid)) childToParentUnionIds.set(cid, []);
						childToParentUnionIds.get(cid).push(uid);
					}
				}

				// Lay the children out (each as its own hub) and remember where each
				// landed, grouped by the union it belongs to.
				const unionChildRecs = new Map();
				if (cluster.childIds.length > 0) {
					for (const uid of cluster.unionIds) stack.add(uid);
					const childGroups = cluster.childIds.map((cid) => {
						const hub = getPersonHubCluster(cid, stack);
						return { childId: cid, hub, width: measureCluster(hub, stack) };
					});
					const totalChildrenWidth =
						childGroups.reduce((sum, g) => sum + g.width, 0) +
						Math.max(0, childGroups.length - 1) * CONFIG.siblingGap;
					let cursorX = centerX - totalChildrenWidth / 2;
					for (const group of childGroups) {
						const childRec = layoutCluster(group.hub, cursorX, depth + 1, stack, group.childId);
						for (const parentUnionId of childToParentUnionIds.get(group.childId) ?? []) {
							if (!unionChildRecs.has(parentUnionId)) unionChildRecs.set(parentUnionId, []);
							if (childRec) unionChildRecs.get(parentUnionId).push(childRec);
						}
						cursorX += group.width + CONFIG.siblingGap;
					}
					for (const uid of cluster.unionIds) stack.delete(uid);
				}

				// Colour-code only when this person/couple has children with more than
				// one partner — ordinary single-family branches stay neutral.
				const childBearingUnionIds = cluster.unionIds.filter(
					(uid) => (unionChildRecs.get(uid)?.length ?? 0) > 0,
				);
				const useColor = childBearingUnionIds.length >= 2;
				const colorIndexOf = new Map();
				childBearingUnionIds.forEach((uid, i) => colorIndexOf.set(uid, i));

				// Stagger the marriage "bus" levels so different marriages' connectors
				// never sit on top of each other, while staying above the child fork.
				const forkY = childTopY - 18;
				const busStagger = childBearingUnionIds.length > 1
					? Math.min(18, Math.max(0, forkY - 6 - unionLineY) / (childBearingUnionIds.length - 1))
					: 0;

				// How many of THIS cluster's unions each partner belongs to, so the
				// shared central person (someone with several spouses) stays neutral
				// while each unique spouse takes their own marriage's colour.
				const unionCountByPartner = new Map();
				for (const uid of cluster.unionIds) {
					for (const pid of indexes.unionsById.get(uid)?.partners ?? []) {
						if (localPos.has(pid)) {
							unionCountByPartner.set(pid, (unionCountByPartner.get(pid) ?? 0) + 1);
						}
					}
				}

				for (const uid of cluster.unionIds) {
					const u = indexes.unionsById.get(uid);
					if (!u) continue;
					const partnerXs = (u.partners ?? [])
						.filter((pid) => localPos.has(pid))
						.map((pid) => localPos.get(pid).x);
					if (partnerXs.length === 0) continue;
					const childRecs = unionChildRecs.get(uid) ?? [];
					const childXs = childRecs.map((r) => r.x);
					const ci = colorIndexOf.has(uid) ? colorIndexOf.get(uid) : null;
					const busY = ci != null ? unionLineY + ci * busStagger : unionLineY;
					const anchorX = childXs.length
						? (Math.min(...childXs) + Math.max(...childXs)) / 2
						: (Math.min(...partnerXs) + Math.max(...partnerXs)) / 2;
					if (!positions.unions.has(uid)) positions.unions.set(uid, { x: anchorX, y: busY });
					placements.unions.push({
						unionId: uid,
						x: anchorX,
						y: busY,
						partnerXs: partnerXs.slice().sort((a, b) => a - b),
						partnerBottomY: y + CONFIG.nodeHeight / 2,
						childXs: childXs.slice().sort((a, b) => a - b),
						childTopY,
						colorIndex: useColor ? ci : null,
					});

					if (useColor && ci != null) {
						// Tint each unique spouse and the children of this marriage so a
						// glance shows "this partner → these children".
						for (const pid of u.partners ?? []) {
							if (localPos.has(pid) && unionCountByPartner.get(pid) === 1) {
								const rec = anchorRecs.get(pid);
								if (rec) rec.colorIndex = ci;
							}
						}
						for (const r of childRecs) r.colorIndex = ci;
					}
				}

				return anchorPersonId ? anchorRecs.get(anchorPersonId) ?? null : null;
			}

			const rootUnion = indexes.unionsById.get(rootUnionId);
			let rootWidth = 0;
			if (opts.includeDisconnected) {
				const orderedUnionIds = [
					rootUnionId,
					...data.unions.map((union) => union.id),
				].filter((id, index, list) => id && list.indexOf(id) === index);
				let cursorX = CONFIG.padding;

				for (const unionId of orderedUnionIds) {
					const union = indexes.unionsById.get(unionId);
					if (!union) continue;

					const relatedIds = [...(union.partners ?? []), ...(union.children ?? [])].filter(Boolean);
					if (
						positions.unions.has(unionId) ||
						(relatedIds.length > 0 && relatedIds.every((id) => positions.people.has(id)))
					) {
						continue;
					}

					const width = measureCluster(getUnionCluster(unionId, true), new Set());
					const beforeCount = positions.people.size;
					layoutCluster(getUnionCluster(unionId, true), cursorX, 0, new Set());
					if (positions.people.size > beforeCount) {
						cursorX += width + CONFIG.padding;
					}
				}

				for (const person of data.people) {
					if (positions.people.has(person.id)) continue;
					recordPerson(person.id, cursorX + CONFIG.nodeWidth / 2, CONFIG.padding);
					cursorX += CONFIG.nodeWidth + CONFIG.partnerGap;
				}

				rootWidth = Math.max(CONFIG.nodeWidth, cursorX);
			} else if (rootUnion) {
				const rootCluster = getUnionCluster(rootUnionId, true);
				rootWidth = measureCluster(rootCluster, new Set());
				layoutCluster(rootCluster, CONFIG.padding, 0, new Set());
			} else {
				// No valid union to root on — e.g. a lone individual whose GEDCOM has
				// no family records yet. Still place the focused person's own node so
				// the Tree tab is never blank and always shows the person box.
				rootWidth = CONFIG.nodeWidth;
				const fallbackId =
					opts.fallbackPersonId && indexes.peopleById.has(opts.fallbackPersonId)
						? opts.fallbackPersonId
						: data.people[0]?.id ?? null;
				if (fallbackId) {
					recordPerson(
						fallbackId,
						CONFIG.padding + CONFIG.nodeWidth / 2,
						CONFIG.padding + CONFIG.nodeHeight / 2,
					);
				}
			}

			// Normalize every coordinate into a positive space with padding. Offsets
			// apply to the draw instances (placements) and the first-wins position
			// maps alike.
			const bbox = computeBBox(placements.people);
			const offsetX = CONFIG.padding - bbox.minX;
			const offsetY = CONFIG.padding - bbox.minY;
			for (const rec of placements.people) {
				rec.x += offsetX;
				rec.y += offsetY;
			}
			for (const rec of placements.unions) {
				rec.x += offsetX;
				rec.y += offsetY;
				rec.partnerXs = rec.partnerXs.map((px) => px + offsetX);
				rec.partnerBottomY += offsetY;
				rec.childXs = rec.childXs.map((px) => px + offsetX);
				rec.childTopY += offsetY;
			}
			for (const [id, pos] of positions.people.entries()) {
				positions.people.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
			}
			for (const [id, pos] of positions.unions.entries()) {
				positions.unions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
			}

			const bbox2 = computeBBox(placements.people);
			const sceneWidth = Math.max(rootWidth + CONFIG.padding * 2, bbox2.maxX + CONFIG.padding);
			const sceneHeight = bbox2.maxY + CONFIG.padding;

			return {
				positions,
				placements,
				sceneSize: { width: sceneWidth, height: sceneHeight },
			};
		}

		return { layout };
	}

	function computeBBox(peoplePlacements) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const pos of peoplePlacements.values()) {
			minX = Math.min(minX, pos.x - CONFIG.nodeWidth / 2);
			maxX = Math.max(maxX, pos.x + CONFIG.nodeWidth / 2);
			minY = Math.min(minY, pos.y - CONFIG.nodeHeight / 2);
			maxY = Math.max(maxY, pos.y + CONFIG.nodeHeight / 2);
		}

		if (!Number.isFinite(minX)) {
			minX = 0;
			minY = 0;
			maxX = 0;
			maxY = 0;
		}

		return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
	}

	function el(tag, className) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		return node;
	}

	function initialsFromName(name) {
		const words = String(name)
			.trim()
			.split(/\s+/g)
			.filter(Boolean);
		if (words.length === 0) return "?";
		if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
		return (words[0][0] + words[words.length - 1][0]).toUpperCase();
	}

	function createBiIcon(name, extraClass) {
		const icon = document.createElement("i");
		icon.className = `bi bi-${name}${extraClass ? ` ${extraClass}` : ""}`;
		icon.setAttribute("aria-hidden", "true");
		return icon;
	}

	function render({
		data,
		indexes,
		layoutResult,
		viewport,
		scene,
		svg,
		nodesRoot,
		onSelect,
		onEdit,
		onAdd,
		onTree,
		focusPersonId = null,
		readOnly = false,
	}) {
		const { peopleById } = indexes;
		const { positions, placements, sceneSize } = layoutResult;

		// Size the scene and SVG.
		scene.style.width = `${sceneSize.width}px`;
		scene.style.height = `${sceneSize.height}px`;
		svg.setAttribute("width", String(sceneSize.width));
		svg.setAttribute("height", String(sceneSize.height));
		svg.setAttribute("viewBox", `0 0 ${sceneSize.width} ${sceneSize.height}`);

		// Clear old.
		nodesRoot.replaceChildren();
		while (svg.firstChild) svg.removeChild(svg.firstChild);

		let selectedPersonId = null;
		function setSelected(personId, opts = {}) {
			selectedPersonId = personId;
			for (const node of nodesRoot.querySelectorAll(".node")) {
				node.classList.toggle("node--selected", node.dataset.personId === selectedPersonId);
			}
			onSelect?.(selectedPersonId, opts);
		}

		const visiblePersonIds = new Set(positions.people.keys());

		// Render nodes — one DOM node per placement instance (a person may appear in
		// more than one place, e.g. once per marriage and once as a child).
		for (const placement of placements.people) {
			const personId = placement.personId;
			const pos = placement;
			const person = peopleById.get(personId) ?? { id: personId, name: personId };
			const gender = normalizeGender(person.gender);
			const isPet = Boolean(person.isPet);
			const displayName = formatDisplayName(person) || personId;

			const hiddenImmediateFamilyIds = (() => {
				// "Immediate family" for the Tree button means: parents or siblings.
				// The Tree button is only shown if at least one of those relatives is NOT
				// currently visible in the viewport.
				const ids = new Set();
				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				for (const uid of parentUnionIds) {
					const union = indexes.unionsById.get(uid);
					if (!union) continue;
					for (const pid of union.partners ?? []) {
						if (pid) ids.add(pid);
					}
					for (const cid of union.children ?? []) {
						if (cid && cid !== personId) ids.add(cid);
					}
				}

				return [...ids].filter((id) => !visiblePersonIds.has(id));
			})();
			const hasImmediateFamilyToShow = hiddenImmediateFamilyIds.length > 0;

			const node = el("div", "node");
			node.dataset.personId = personId;
			node.dataset.gender = gender;
			if (isPet) node.classList.add("node--pet");
			node.style.left = `${pos.x}px`;
			node.style.top = `${pos.y}px`;
			node.tabIndex = 0;
			node.setAttribute("role", "button");
			node.setAttribute("aria-label", displayName);
			// A duplicate instance is a second drawing of someone already shown
			// elsewhere; mark it so it reads as the same person, not a clone.
			if (placement.duplicate) {
				node.classList.add("node--duplicate");
				node.dataset.duplicate = "true";
			}
			// Tint a spouse / child node to match its marriage's connector colour so
			// it's obvious at a glance which partner each child belongs to.
			if (placement.colorIndex != null) {
				node.classList.add("node--union");
				node.style.setProperty("--union-color", LINK_COLORS[placement.colorIndex % LINK_COLORS.length]);
			}

			const avatar = el("div", "node__avatar");
			if (person.photoUrl) {
				const img = document.createElement("img");
				img.decoding = "async";
				img.loading = "lazy";
				img.alt = "";
				img.src = person.photoUrl;
				avatar.appendChild(img);
			} else if (isPet) {
				const petIcon = el("span", "node__avatar-icon node__avatar-icon--pet");
				petIcon.setAttribute("aria-hidden", "true");
				petIcon.textContent = "🐾";
				avatar.appendChild(petIcon);
			} else {
				avatar.appendChild(createBiIcon("person-circle", "node__avatar-icon"));
			}
			if (placement.duplicate) {
				const dupBadge = el("span", "node__duplicate-badge");
				dupBadge.setAttribute("aria-hidden", "true");
				dupBadge.setAttribute("data-tooltip", "Shown in more than one place");
				dupBadge.appendChild(createBiIcon("arrow-repeat"));
				avatar.appendChild(dupBadge);
			}

			const content = el("div", "node__content");
			// When the person has a Genepedia profile, their name is a link to it;
			// otherwise it stays plain text.
			const genepediaId = String(person.genepediaId ?? "").trim();
			let name;
			if (genepediaId) {
				name = document.createElement("a");
				name.className = "node__name";
				// Link straight to the person's index.html so the name works on
				// file:// (no directory index) and on the live site alike.
				name.href = resolveSitePath(`${isPet ? "pages/pets" : "pages/people"}/${encodeURIComponent(genepediaId)}/index.html`);
				name.addEventListener("click", (e) => {
					// Let the link navigate; don't also trigger node selection.
					e.stopPropagation();
				});
			} else {
				name = el("div", "node__name");
			}
			name.textContent = displayName;

			const datesText = formatDates(person);
			const meta = el("div", "node__meta");
			if (isPet) {
				const speciesText = person.species ? String(person.species) : "Pet";
				meta.textContent = [speciesText, datesText].filter(Boolean).join(" · ") || " ";
			} else {
				meta.textContent = datesText || " ";
			}

			const actions = el("div", "node__actions");

			// A pet's family lives in the separate pets database, so its buttons open
			// the pet's own profile/tree rather than re-rooting this people tree.
			const petProfileUrl = (hash) => resolveSitePath(`pages/pets/${encodeURIComponent(String(person.genepediaId ?? personId))}/index.html`) + (hash || "");

			const makeNodeButton = (icon, label) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "icon-button";
				button.setAttribute("aria-label", label);
				button.setAttribute("data-tooltip", label.split(" ")[0]);
				button.appendChild(createBiIcon(icon));
				return button;
			};

			let treeAction = null;
			// Show the Tree button only when there's family NOT already on screen:
			// people with hidden immediate relatives, or a pet whose own animal
			// family (in the pets DB) isn't drawn in this tree (`hasOwnTree`). Never
			// on the node we're already centred on — that tree is already open.
			const hasMoreTree = isPet ? (Boolean(person.hasOwnTree) || hasImmediateFamilyToShow) : hasImmediateFamilyToShow;
			const isFocusNode = focusPersonId != null && personId === focusPersonId;
			if (!isFocusNode && hasMoreTree) {
				treeAction = makeNodeButton("diagram-3", "Open tree");
				treeAction.classList.add("node__tree-action");
				treeAction.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (isPet) {
						window.location.assign(petProfileUrl("#tree"));
					} else {
						onTree?.({ personId });
					}
				});
			}

			if (!readOnly) {
				const editAction = makeNodeButton("pencil", isPet ? "Edit pet" : "Edit person");
				editAction.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					setSelected(personId, { source: "action" });
					if (isPet) {
						window.location.assign(petProfileUrl(""));
					} else {
						onEdit?.({ personId, anchorEl: editAction });
					}
				});

				const addAction = makeNodeButton("plus-lg", isPet ? "Add to pet's family" : "Add relative");
				addAction.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					setSelected(personId, { source: "action" });
					if (isPet) {
						window.location.assign(petProfileUrl("#tree"));
					} else {
						onAdd?.({ personId, anchorEl: addAction });
					}
				});

				// Order: Tree, Edit, Add (Tree omitted if nothing new to show)
				if (treeAction) actions.append(treeAction);
				actions.append(editAction, addAction);
			} else if (treeAction) {
				actions.append(treeAction);
			}

			content.append(name, meta);
			// Animal nodes show their owning person (a link to that person's profile).
			if (isPet && person.ownerName) {
				const owner = el("div", "node__owner");
				const ownerIcon = createBiIcon("person-heart", "node__owner-icon");
				owner.append(ownerIcon);
				const ownerLabel = person.ownerId
					? document.createElement("a")
					: document.createElement("span");
				if (person.ownerId) {
					ownerLabel.href = resolveSitePath(`pages/people/${encodeURIComponent(person.ownerId)}/index.html`);
					ownerLabel.addEventListener("click", (e) => e.stopPropagation());
				}
				ownerLabel.className = "node__owner-name";
				ownerLabel.textContent = person.ownerName;
				ownerLabel.title = `Owner: ${person.ownerName}`;
				owner.append(ownerLabel);
				content.append(owner);
			}
			node.append(avatar, content);
			if (actions.childElementCount > 0) node.append(actions);
			node.addEventListener("click", (e) => {
				e.stopPropagation();
				setSelected(personId, { source: "node" });
			});
			node.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setSelected(personId, { source: "node" });
				}
			});
			nodesRoot.append(node);
		}

		const makePath = (d, color) => {
			const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
			p.setAttribute("d", d);
			if (color) {
				// Inline style (not a presentation attribute) so it beats the
				// `.links path { stroke: currentColor }` rule.
				p.style.stroke = color;
				p.classList.add("link--colored");
			}
			return p;
		};

		// One self-contained connector per marriage: a couple bar joining the
		// partners (staggered to its own level so marriages never overlap) and a
		// fork hanging that marriage's children, all in the marriage's colour.
		for (const u of placements.unions) {
			const color = u.colorIndex != null ? LINK_COLORS[u.colorIndex % LINK_COLORS.length] : null;
			const xs = u.partnerXs ?? [];
			const childXs = u.childXs ?? [];
			const stemX = childXs.length ? (childXs[0] + childXs[childXs.length - 1]) / 2 : null;

			if (xs.length) {
				for (const px of xs) {
					svg.appendChild(makePath(`M ${px} ${u.partnerBottomY} L ${px} ${u.y}`, color));
				}
				const left = Math.min(xs[0], stemX != null ? stemX : xs[0]);
				const right = Math.max(xs[xs.length - 1], stemX != null ? stemX : xs[xs.length - 1]);
				if (right > left) {
					svg.appendChild(makePath(`M ${left} ${u.y} L ${right} ${u.y}`, color));
				}
			}

			if (childXs.length) {
				const forkY = u.childTopY - 18;
				if (stemX != null) {
					svg.appendChild(makePath(`M ${stemX} ${u.y} L ${stemX} ${forkY}`, color));
				}
				const cl = childXs[0];
				const cr = childXs[childXs.length - 1];
				if (cr > cl) {
					svg.appendChild(makePath(`M ${cl} ${forkY} L ${cr} ${forkY}`, color));
				}
				for (const cx of childXs) {
					svg.appendChild(makePath(`M ${cx} ${forkY} L ${cx} ${u.childTopY}`, color));
				}
			}
		}

		const contentBbox = computeBBox(placements.people);
		return { setSelected, getContentBbox: () => contentBbox };
	}

	function createPanZoom({ viewport, scene, onChange }) {
		const host = viewport.getRootNode()?.host;
		const configuredMinScale = Number(host?.dataset?.minScale);
		const minScale = Number.isFinite(configuredMinScale) ? configuredMinScale : CONFIG.minScale;
		const state = { x: 0, y: 0, scale: 1 };
		const DRAG_THRESHOLD_PX = 6;
		const dragThresholdSq = DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

		function apply() {
			scene.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
			onChange?.({ ...state });
		}

		function setTransform(next) {
			state.x = next.x;
			state.y = next.y;
			state.scale = next.scale;
			apply();
		}

		function zoomAbout({ scale, clientX, clientY }) {
			const rect = viewport.getBoundingClientRect();
			const px = clientX - rect.left;
			const py = clientY - rect.top;
			const prevScale = state.scale;
			const nextScale = clamp(scale, minScale, CONFIG.maxScale);

			const sx = (px - state.x) / prevScale;
			const sy = (py - state.y) / prevScale;
			const nextX = px - sx * nextScale;
			const nextY = py - sy * nextScale;

			setTransform({ x: nextX, y: nextY, scale: nextScale });
		}

		let isPanning = false;
		let panStart = null;
		let panMoved = false;
		let suppressNextClick = false;

		viewport.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if (e.target && e.target.closest && e.target.closest(".node")) return;
			suppressNextClick = false;
			isPanning = true;
			panMoved = false;
			panStart = { x: e.clientX, y: e.clientY, startX: state.x, startY: state.y };
			viewport.setPointerCapture(e.pointerId);
		});

		viewport.addEventListener("pointermove", (e) => {
			if (!isPanning || !panStart) return;
			const dx = e.clientX - panStart.x;
			const dy = e.clientY - panStart.y;

			if (!panMoved) {
				const distSq = dx * dx + dy * dy;
				if (distSq < dragThresholdSq) return;
				panMoved = true;
			}

			setTransform({ x: panStart.startX + dx, y: panStart.startY + dy, scale: state.scale });
		});

		viewport.addEventListener("pointerup", () => {
			if (isPanning && panMoved) suppressNextClick = true;
			isPanning = false;
			panStart = null;
			panMoved = false;
		});

		viewport.addEventListener("pointercancel", () => {
			isPanning = false;
			panStart = null;
			panMoved = false;
		});

		viewport.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				const factor = Math.exp(-e.deltaY * 0.001);
				zoomAbout({ scale: state.scale * factor, clientX: e.clientX, clientY: e.clientY });
			},
			{ passive: false }
		);

		apply();
		return {
			consumeClickSuppression: () => {
				const value = suppressNextClick;
				suppressNextClick = false;
				return value;
			},
			get: () => ({ ...state }),
			set: (next) => setTransform(next),
			zoomIn: () => {
				const rect = viewport.getBoundingClientRect();
				zoomAbout({
					scale: state.scale * 1.15,
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2,
				});
			},
			zoomOut: () => {
				const rect = viewport.getBoundingClientRect();
				zoomAbout({
					scale: state.scale / 1.15,
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2,
				});
			},
			reset: () => setTransform({ x: 0, y: 0, scale: 1 }),
			zoomAbout,
		};
	}

	function fitToTransform({ viewport, contentBbox, padding = 24 }) {
		const vw = viewport.clientWidth;
		const vh = viewport.clientHeight;
		if (vw <= 0 || vh <= 0) return { x: 0, y: 0, scale: 1 };
		const host = viewport.getRootNode()?.host;
		const configuredMinScale = Number(host?.dataset?.minScale);
		const minScale = Number.isFinite(configuredMinScale) ? configuredMinScale : CONFIG.minScale;

		const bboxW = Math.max(1, contentBbox.width + padding * 2);
		const bboxH = Math.max(1, contentBbox.height + padding * 2);
		const scale = clamp(Math.min(vw / bboxW, vh / bboxH), minScale, 1.6);

		const cx = (contentBbox.minX + contentBbox.maxX) / 2;
		const cy = (contentBbox.minY + contentBbox.maxY) / 2;
		const x = vw / 2 - cx * scale;
		const y = vh / 2 - cy * scale;

		return { x, y, scale };
	}

	function escapeXml(text) {
		return String(text)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&apos;");
	}

	function downloadBlob(filename, blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function buildExportSvg({ data, indexes, layoutResult }) {
		const { peopleById } = indexes;
		const { placements, sceneSize } = layoutResult;

		const width = Math.max(1, Math.ceil(sceneSize.width));
		const height = Math.max(1, Math.ceil(sceneSize.height));

		const fontFamily =
			"system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji";

		const parts = [];
		parts.push('<?xml version="1.0" encoding="UTF-8"?>');
		parts.push(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		);
		parts.push(
			"<style><![CDATA[" +
			`.link{stroke:#000;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:.45}` +
			`.link--colored{opacity:.95;stroke-width:2.5}` +
			`.node-rect{stroke:#666}` +
			`.node-rect--M{fill:#e8f1ff}` +
			`.node-rect--F{fill:#ffe8f3}` +
			`.node-rect--U{fill:#f2f2f2}` +
			`.avatar-divider{stroke:#666}` +
			`.avatar-text{font:700 16px ${fontFamily};fill:#000;opacity:.85}` +
			`.node-name{font:650 14px ${fontFamily};fill:#000}` +
			`.node-meta{font:12px ${fontFamily};fill:#000;opacity:.75}` +
			"]]></style>",
		);
		parts.push('<rect width="100%" height="100%" fill="#fff"/>');

		const linkPath = (d, color) =>
			color
				? `<path class="link link--colored" style="stroke:${color}" d="${d}"/>`
				: `<path class="link" d="${d}"/>`;

		// One self-contained connector per marriage (couple bar + child fork),
		// staggered and coloured so different marriages never overlap.
		for (const u of placements.unions) {
			const color = u.colorIndex != null ? LINK_COLORS[u.colorIndex % LINK_COLORS.length] : null;
			const xs = u.partnerXs ?? [];
			const childXs = u.childXs ?? [];
			const stemX = childXs.length ? (childXs[0] + childXs[childXs.length - 1]) / 2 : null;

			if (xs.length) {
				for (const px of xs) {
					parts.push(linkPath(`M ${px} ${u.partnerBottomY} L ${px} ${u.y}`, color));
				}
				const left = Math.min(xs[0], stemX != null ? stemX : xs[0]);
				const right = Math.max(xs[xs.length - 1], stemX != null ? stemX : xs[xs.length - 1]);
				if (right > left) {
					parts.push(linkPath(`M ${left} ${u.y} L ${right} ${u.y}`, color));
				}
			}

			if (childXs.length) {
				const forkY = u.childTopY - 18;
				if (stemX != null) {
					parts.push(linkPath(`M ${stemX} ${u.y} L ${stemX} ${forkY}`, color));
				}
				const cl = childXs[0];
				const cr = childXs[childXs.length - 1];
				if (cr > cl) {
					parts.push(linkPath(`M ${cl} ${forkY} L ${cr} ${forkY}`, color));
				}
				for (const cx of childXs) {
					parts.push(linkPath(`M ${cx} ${forkY} L ${cx} ${u.childTopY}`, color));
				}
			}
		}

		// Nodes.
		for (const placement of placements.people) {
			const personId = placement.personId;
			const pos = placement;
			const person = peopleById.get(personId) ?? { id: personId, name: personId };
			const gender = normalizeGender(person.gender);
			const metaText = formatDates(person);
			const displayName = formatDisplayName(person) || personId;
			const x = pos.x;
			const y = pos.y;

			const rectX = -CONFIG.nodeWidth / 2;
			const rectY = -CONFIG.nodeHeight / 2;
			const avatarW = CONFIG.nodeHeight;
			const dividerX = rectX + avatarW;
			const nameX = dividerX + 10;
			const nameY = rectY + 26;
			const metaY = rectY + 52;

			parts.push(`<g transform="translate(${x} ${y})">`);
			parts.push(
				`<rect class="node-rect node-rect--${gender}" x="${rectX}" y="${rectY}" width="${CONFIG.nodeWidth}" height="${CONFIG.nodeHeight}" rx="0" ry="0"/>`,
			);
			// Colour bar across the top to match the marriage connector colour.
			if (placement.colorIndex != null) {
				const color = LINK_COLORS[placement.colorIndex % LINK_COLORS.length];
				parts.push(
					`<rect x="${rectX}" y="${rectY}" width="${CONFIG.nodeWidth}" height="4" fill="${color}"/>`,
				);
			}
			parts.push(
				`<line class="avatar-divider" x1="${dividerX}" y1="${rectY}" x2="${dividerX}" y2="${rectY + CONFIG.nodeHeight}"/>`,
			);
			parts.push(
				`<text class="avatar-text" x="${rectX + avatarW / 2}" y="0" text-anchor="middle" dominant-baseline="central">${escapeXml(initialsFromName(person.name))}</text>`,
			);
			parts.push(`<text class="node-name" x="${nameX}" y="${nameY}">${escapeXml(displayName)}</text>`);
			if (metaText) {
				parts.push(`<text class="node-meta" x="${nameX}" y="${metaY}">${escapeXml(metaText)}</text>`);
			}
			parts.push("</g>");
		}

		parts.push("</svg>");
		return { svg: parts.join("\n"), width, height };
	}

	async function svgToPngBlob({ svg, width, height, scale = 2 }) {
		const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
		const url = URL.createObjectURL(svgBlob);

		try {
			const img = new Image();
			img.decoding = "async";
			const loaded = new Promise((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
			});
			img.src = url;
			await loaded;

			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.floor(width * scale));
			canvas.height = Math.max(1, Math.floor(height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Canvas 2D context unavailable");
			ctx.setTransform(scale, 0, 0, scale, 0, 0);
			ctx.drawImage(img, 0, 0);

			const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
			if (!blob) throw new Error("PNG export failed");
			return blob;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	const TREE_CSS = `
:host {
	--node-w: 260px;
	--node-h: 96px;
	--sidebar-w: 320px;
	--node-ui-gap: 4px;

	--gender-male-bg: rgba(13, 110, 253, 0.10);
	--gender-female-bg: rgba(214, 51, 132, 0.10);
	--gender-unknown-bg: rgba(0, 0, 0, 0.04);
	--gender-male-bg: color-mix(in srgb, Canvas 88%, #0d6efd 12%);
	--gender-female-bg: color-mix(in srgb, Canvas 88%, #d63384 12%);
	--gender-unknown-bg: color-mix(in srgb, Canvas 92%, GrayText 8%);

	/* Chrome colour tokens mirror the site header so the toolbar controls match
	   the header notification button and search box exactly. Dark is the default;
	   :host([data-theme="light"]) flips to light. */
	--tree-chrome-fg: #eaecf0;
	--tree-chrome-btn-border: rgba(255, 255, 255, 0.2);
	--tree-chrome-btn-bg: rgba(255, 255, 255, 0.04);
	--tree-chrome-btn-hover: rgba(255, 255, 255, 0.08);
	--tree-chrome-search-bg: #1e2125;
	--tree-chrome-search-border: rgba(255, 255, 255, 0.08);
	--tree-chrome-search-icon: #c8ccd1;

	display: block;
	height: 100%;
	overflow: hidden;
	background: transparent;
	color: CanvasText;
	font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans,
		"Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

:host([data-theme="light"]) {
	--tree-chrome-fg: #202122;
	--tree-chrome-btn-border: rgba(0, 0, 0, 0.14);
	--tree-chrome-btn-bg: rgba(0, 0, 0, 0.03);
	--tree-chrome-btn-hover: rgba(0, 0, 0, 0.06);
	--tree-chrome-search-bg: #f8f9fa;
	--tree-chrome-search-border: rgba(0, 0, 0, 0.12);
	--tree-chrome-search-icon: #72777d;
}

* {
	box-sizing: border-box;
}

#app {
	height: 100%;
	display: grid;
	grid-template-rows: auto 1fr;
	min-height: 0;
	min-width: 0;
}

.main {
	height: 100%;
	min-height: 0;
	min-width: 0;
	display: grid;
	grid-template-columns: 1fr;
	align-items: stretch;
}

.main--sidebar {
	grid-template-columns: 1fr var(--sidebar-w);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-bottom: 0;
}

.toolbar__right {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}

/* Toolbar action buttons match the header notification button. */
.toolbar__right .icon-button {
	width: 39px;
	height: 39px;
	border: 1px solid var(--tree-chrome-btn-border);
	border-radius: 2px;
	background: var(--tree-chrome-btn-bg);
	color: var(--tree-chrome-fg);
}

.toolbar__right .icon-button i {
	font-size: 16.5px;
}

.toolbar__right .icon-button:hover {
	background: var(--tree-chrome-btn-hover);
}

.toolbar__stats {
	font-size: 12px;
	opacity: 0.75;
	white-space: nowrap;
	align-self: center;
}

.tree-search {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	height: 39px;
	padding-left: 0.75em;
	border: 1px solid var(--tree-chrome-search-border);
	border-radius: 2px;
	background: var(--tree-chrome-search-bg);
	color: var(--tree-chrome-fg);
}

.tree-search:focus-within {
	border-color: color-mix(in srgb, var(--tree-chrome-fg) 35%, transparent);
}

.tree-search__icon {
	color: var(--tree-chrome-search-icon);
}

.tree-search__input {
	border: 0;
	outline: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	padding: 6px 10px 6px 0;
	width: 240px;
	min-width: 140px;
}

.tree-search__results {
	position: absolute;
	top: calc(100% + 8px);
	left: -1px;
	right: -1px;
	z-index: 1200;
	border: 1px solid GrayText;
	background: Canvas;
	padding: 8px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-height: 320px;
	overflow: auto;
}

.tree-search__results--hidden {
	display: none;
}

.tree-search__result {
	width: 100%;
	text-align: left;
	border-radius: 0;
	border: 1px solid GrayText;
	background: var(--gender-unknown-bg);
	padding: 10px 10px;
	font-weight: 650;
	cursor: pointer;
}

.tree-search__result[data-gender="M"] {
	background: var(--gender-male-bg);
}

.tree-search__result[data-gender="F"] {
	background: var(--gender-female-bg);
}

.tree-search__result[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.tree-search__result:hover {
	border-color: Highlight;
}

.tree-search__result:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

button {
	appearance: none;
	border: 1px solid GrayText;
	background: Canvas;
	color: CanvasText;
	border-radius: 0;
	padding: 6px 10px;
	cursor: pointer;
}

.icon-button {
	width: 32px;
	height: 32px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	box-sizing: border-box;
	font-size: 0;
}

.icon-button i {
	width: 16px;
	height: 16px;
	display: grid;
	place-items: center;
	font-size: 16px;
	line-height: 1;
	margin: 0;
	padding: 0;
	font-style: normal;
}

.icon-button i::before {
	display: block;
	line-height: 1;
}

button:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

button:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

/* Tooltip for buttons with data-tooltip */
[data-tooltip] {
	position: relative;
}

[data-tooltip]::after {
	content: attr(data-tooltip);
	position: absolute;
	bottom: calc(100% + 6px);
	left: 50%;
	transform: translateX(-50%);
	padding: 4px 8px;
	font-size: 12px;
	line-height: 1;
	white-space: nowrap;
	background: Canvas;
	color: CanvasText;
	border: 1px solid GrayText;
	pointer-events: none;
	opacity: 0;
	visibility: hidden;
	transition: opacity 0.15s ease, visibility 0.15s ease;
	z-index: 10;
}

[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after {
	opacity: 1;
	visibility: visible;
}

/* Toolbar sits at the very top of the (overflow-hidden) viewer, so its
   tooltips must drop below the button instead of being clipped above. */
.toolbar [data-tooltip]::after {
	bottom: auto;
	top: calc(100% + 6px);
}

.viewport {
	position: relative;
	overflow: hidden;
	touch-action: none;
	min-width: 0;
}

.viewport:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: -2px;
}

.scene {
	position: absolute;
	left: 0;
	top: 0;
	transform-origin: 0 0;
	color: CanvasText;
}

.links {
	position: absolute;
	left: 0;
	top: 0;
	overflow: visible;
	pointer-events: none;
}

.links path {
	stroke: currentColor;
	stroke-width: 2;
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.45;
}

/* Coloured connectors single out one marriage of a multi-partner parent. */
.links path.link--colored {
	opacity: 0.95;
	stroke-width: 2.5;
}

.nodes {
	position: absolute;
	left: 0;
	top: 0;
}

.node {
	position: absolute;
	width: var(--node-w);
	height: var(--node-h);
	transform: translate(-50%, -50%);
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	grid-template-rows: 1fr auto;
	column-gap: var(--node-ui-gap);
	row-gap: var(--node-ui-gap);
	border: 1px solid GrayText;
	border-radius: 0;
	background: var(--gender-unknown-bg);
	color: CanvasText;
	padding: var(--node-ui-gap);
	user-select: none;
	cursor: pointer;
	min-width: 0;
}

.node[data-gender="M"] {
	background: var(--gender-male-bg);
}

.node[data-gender="F"] {
	background: var(--gender-female-bg);
}

.node[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.node__avatar {
	width: auto;
	height: 100%;
	aspect-ratio: 1 / 1;
	grid-column: 1;
	grid-row: 1 / -1;
	border: 1px solid GrayText;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.node__avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.node__avatar-icon {
	font-size: 44px;
	opacity: 0.55;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	margin: 0;
	padding: 0;
	line-height: 1;
}

.node__content {
	min-width: 0;
	grid-column: 2;
	grid-row: 1 / -1;
	padding: 0;
	/* Reserve space so text never sits under the absolutely-placed actions. */
	padding-bottom: calc(28px + var(--node-ui-gap));
}

/* Actions are pinned to the node bottom-right so every box places them
   identically, regardless of name length or button count. */
.node__actions {
	position: absolute;
	right: var(--node-ui-gap);
	bottom: var(--node-ui-gap);
	display: flex;
	gap: var(--node-ui-gap);
}

.node__actions .icon-button {
	width: 28px;
	height: 28px;
}

.node:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.node__name {
	font-weight: 650;
	font-size: 14px;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: normal;
	word-break: break-word;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.node__meta {
	margin-top: 4px;
	font-size: 12px;
	opacity: 0.75;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.node__owner {
	margin-top: 3px;
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	opacity: 0.8;
	min-width: 0;
}

.node__owner-icon {
	flex: 0 0 auto;
	opacity: 0.7;
}

.node__owner-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: inherit;
	text-decoration: none;
}

a.node__owner-name:hover {
	text-decoration: underline;
}

.node--selected {
	border-color: Highlight;
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

/* A duplicate instance: the same person drawn a second time (e.g. once per
   marriage). Slightly muted, with a small repeat badge so it's clear it's the
   same person shown in another place, not a different individual. */
.node--duplicate {
	border-style: dashed;
}

/* Pet nodes look the same as person nodes (same border, corners, gender tint);
   only the avatar differs — a paw glyph in place of a portrait. */
.node__avatar-icon--pet {
	font-size: 30px;
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* A spouse/child tinted to match its marriage's connector colour, so it's
   obvious which partner each child belongs to. The bar sits on the top edge. */
.node--union {
	box-shadow: inset 0 4px 0 0 var(--union-color);
}

.node__duplicate-badge {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: color-mix(in srgb, Canvas 70%, GrayText 30%);
	color: CanvasText;
	font-size: 11px;
	line-height: 1;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

/* Parent-branch switcher: sits on the connector between the focus person and
   their parents, like Geni's small family badge but clearly labelled so you can
   tell — and switch — whether you're viewing the biological or adopted branch. */
.branch-switch {
	position: absolute;
	transform: translate(-50%, -50%);
	z-index: 5;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 5px 8px;
	border: 1px solid color-mix(in srgb, Canvas 40%, GrayText 60%);
	border-radius: 999px;
	background: Canvas;
	color: CanvasText;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
	white-space: nowrap;
	cursor: default;
}

/* The per-person pets switch hangs just below the person (vs. the parent switch
   which is centred on the connector above them). */
.pets-switch {
	transform: translate(-50%, 0);
}

.branch-switch__label {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	opacity: 0.8;
	padding-left: 3px;
}

.branch-switch__label-icon {
	font-size: 14px;
}

.branch-switch__chips {
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.branch-switch__chip {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 11px;
	border: 1px solid color-mix(in srgb, Canvas 45%, GrayText 55%);
	border-radius: 999px;
	background: color-mix(in srgb, Canvas 88%, GrayText 12%);
	color: CanvasText;
	font-size: 13px;
	font-weight: 650;
	line-height: 1;
	cursor: pointer;
	transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.branch-switch__chip:hover {
	background: color-mix(in srgb, Canvas 75%, GrayText 25%);
}

.branch-switch__chip-icon {
	font-size: 13px;
	opacity: 0.85;
}

.branch-switch__chip.is-active {
	background: #1a7f37;
	border-color: #1a7f37;
	color: #fff;
	box-shadow: 0 0 0 2px color-mix(in srgb, #1a7f37 35%, transparent);
}

.branch-switch__chip.is-active .branch-switch__chip-icon {
	opacity: 1;
}

.menu {
	position: fixed;
	z-index: 1000;
	min-width: 230px;
	padding: 8px;
	border: 1px solid GrayText;
	border-radius: 0;
	background: Canvas;
	color: CanvasText;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.menu--hidden {
	display: none;
}

.menu__title {
	font-size: 12px;
	opacity: 0.75;
	padding: 6px 8px 8px 8px;
	border-bottom: 1px solid GrayText;
	margin-bottom: 0;
}

.menu__item {
	width: 100%;
	text-align: left;
	border-radius: 0;
	border: 1px solid GrayText;
	background: var(--gender-unknown-bg);
	padding: 10px 10px;
	font-weight: 600;
}

.menu__item[data-gender="M"] {
	background: var(--gender-male-bg);
}

.menu__item[data-gender="F"] {
	background: var(--gender-female-bg);
}

.menu__item[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.menu__item:hover {
	border-color: Highlight;
}

.menu__item:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.sidebar {
	height: 100%;
	align-self: stretch;
	border-left: 1px solid GrayText;
	background: Canvas;
	color: CanvasText;
	padding: 12px;
	overflow: auto;
	min-width: 0;
	min-height: 0;
}

.sidebar__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding-bottom: 10px;
	margin-bottom: 10px;
	border-bottom: 1px solid GrayText;
}

.sidebar__title {
	font-weight: 800;
}

.sidebar--hidden {
	display: none;
}

.sidebar__content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.sidebar__person {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}

.sidebar__avatar {
	width: 72px;
	height: 72px;
	border: 1px solid GrayText;
	border-radius: 0;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
}

.sidebar__avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.sidebar__avatar-icon {
	font-size: 54px;
	opacity: 0.55;
}

.sidebar__subtitle {
	font-size: 12px;
	opacity: 0.75;
	margin-top: 2px;
}

.sidebar__heading {
	font-weight: 800;
	text-decoration: underline;
	text-underline-offset: 3px;
}

.sidebar__details {
	display: grid;
	grid-template-columns: 96px 1fr;
	gap: 8px 10px;
	font-size: 13px;
}

.sidebar__details-label {
	font-weight: 700;
}

.sidebar__family-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.sidebar__group-title {
	font-weight: 800;
	font-size: 13px;
}

.sidebar__list--plain {
	list-style: none;
	padding-left: 0;
}

.sidebar__list--plain li {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 4px 0;
}

.sidebar__partner-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 4px 0;
}

.sidebar__person-button {
	appearance: none;
	border: 0;
	background: transparent;
	color: inherit;
	padding: 0;
	font: inherit;
	font-weight: 650;
	text-align: left;
	text-decoration: none;
	cursor: pointer;
}

.sidebar__person-button:hover {
	text-decoration: underline;
}

.sidebar__person-button:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.sidebar__partner-names {
	display: flex;
	flex-wrap: wrap;
	gap: 0 6px;
}

.sidebar__fact-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-size: 13px;
}

.sidebar__fact-record {
	border: 1px solid GrayText;
	padding: 8px;
}

.sidebar__fact-record summary {
	cursor: pointer;
	font-weight: 800;
	font-size: 13px;
}

.sidebar__fact-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 8px;
}

.sidebar__fact {
	border-top: 1px solid color-mix(in srgb, GrayText 40%, transparent);
	padding-top: 8px;
}

.sidebar__fact:first-child {
	border-top: 0;
	padding-top: 0;
}

.sidebar__fact-label {
	font-weight: 800;
}

.sidebar__fact-value {
	margin-top: 2px;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.sidebar__fact-details {
	display: flex;
	flex-direction: column;
	gap: 3px;
	margin-top: 6px;
	color: inherit;
	opacity: 0.86;
}

.sidebar__fact-detail {
	display: grid;
	grid-template-columns: minmax(74px, max-content) 1fr;
	gap: 6px;
}

.sidebar__fact-detail-label {
	font-weight: 700;
}

.sidebar__fact-empty {
	opacity: 0.65;
}

.sidebar__gedcom-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.sidebar__gedcom-record {
	border: 1px solid GrayText;
	padding: 8px;
}

.sidebar__gedcom-record summary {
	cursor: pointer;
	font-weight: 800;
	font-size: 13px;
}

.sidebar__gedcom-pre {
	margin: 8px 0 0;
	max-height: 18rem;
	overflow: auto;
	white-space: pre-wrap;
	word-break: break-word;
	font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

.sidebar__dot {
	width: 10px;
	height: 10px;
	border: 1px solid GrayText;
	display: inline-block;
	flex: 0 0 auto;
}

.sidebar__dot[data-gender="M"] {
	background: var(--gender-male-bg);
}

.sidebar__dot[data-gender="F"] {
	background: var(--gender-female-bg);
}

.sidebar__dot[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.sidebar__nested {
	margin: 4px 0 0 18px;
}

.sidebar__name {
	font-weight: 800;
	font-size: 16px;
}

.sidebar__meta {
	font-size: 13px;
	opacity: 0.8;
}

.sidebar__section-title {
	font-size: 12px;
	opacity: 0.75;
}

.sidebar__list {
	margin: 0;
	padding-left: 18px;
}

/* Link from the details sidebar to a Genepedia profile page. */
.sidebar__profile-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 10px 0 2px;
	font-size: 13px;
	font-weight: 600;
	color: LinkText;
	text-decoration: none;
}

.sidebar__profile-link:hover {
	text-decoration: underline;
}

.sidebar__profile-link-icon {
	font-size: 14px;
	line-height: 1;
}

/* Clickable person name -> Genepedia profile. Looks like the node title,
   not a blue link, with an underline only on hover. */
a.node__name {
	color: inherit;
	text-decoration: none;
	cursor: pointer;
}

a.node__name:hover {
	text-decoration: underline;
}

a.node__name:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}
`;

	const APP_MARKUP = `
<div id="app">
	<header class="toolbar" role="banner">
		<div class="toolbar__right">
			<div class="tree-search" role="search" aria-label="Search people in this tree">
				<i class="bi bi-search tree-search__icon" aria-hidden="true"></i>
				<input id="treeSearchInput" class="tree-search__input" type="search" placeholder="Search this tree" autocomplete="off" />
				<div id="treeSearchResults" class="tree-search__results tree-search__results--hidden" role="listbox" aria-label="Search results"></div>
			</div>
			<div id="treePeopleStats" class="toolbar__stats" aria-live="polite"></div>
			<button id="fitBtn" class="icon-button" type="button" aria-label="Fit to screen" data-tooltip="Fit to screen"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>
			<button id="resetBtn" class="icon-button" type="button" aria-label="Reset view" data-tooltip="Reset view"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
			<button id="zoomOutBtn" class="icon-button" type="button" aria-label="Zoom out" data-tooltip="Zoom out"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
			<button id="zoomInBtn" class="icon-button" type="button" aria-label="Zoom in" data-tooltip="Zoom in"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
		</div>
	</header>

	<div id="mainLayout" class="main">
		<main id="viewport" class="viewport" tabindex="0" aria-label="Family tree viewport">
			<div id="scene" class="scene">
				<svg id="links" class="links" xmlns="http://www.w3.org/2000/svg"></svg>
				<div id="nodes" class="nodes"></div>
			</div>
		</main>

		<aside id="sidebar" class="sidebar sidebar--hidden" aria-label="Selected person details">
			<div class="sidebar__header">
				<div class="sidebar__title">Details</div>
				<button id="closeSidebarBtn" class="icon-button sidebar__close" type="button" aria-label="Close sidebar">
					<i class="bi bi-x-lg" aria-hidden="true"></i>
				</button>
			</div>
			<div id="sidebarContent" class="sidebar__content"></div>
		</aside>
	</div>

	<div id="relationMenu" class="menu menu--hidden" role="menu" aria-label="Add relative menu"></div>
</div>
`;

	class FamilyTree extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;

			const root = this.attachShadow({ mode: "open" });
			root.innerHTML =
				`<link rel="stylesheet" href="${BOOTSTRAP_ICONS_HREF}"><style>${TREE_CSS}</style>${APP_MARKUP}`;

			this.#applyTheme();

			// Follow the shared theme key across tabs/windows.
			this.__onStorage = (event) => {
				if (event.key === "app-theme" && (event.newValue === "dark" || event.newValue === "light")) {
					this.#applyTheme(event.newValue);
				}
			};
			window.addEventListener("storage", this.__onStorage);

			this.#init(root)
				.then(() => {
					this.dispatchEvent(new CustomEvent("family-tree-loaded", { bubbles: true, composed: true }));
				})
				.catch((err) => {
					console.error(err);
					const errorMessage = err instanceof Error ? err.message : "Unable to load GEDCOM data.";
					const nodesRoot = root.getElementById("nodes");
					if (nodesRoot) {
						const message = el("div", "node");
						message.style.left = "180px";
						message.style.top = "120px";
						message.textContent = errorMessage;
						nodesRoot.replaceChildren(message);
					}
					this.dispatchEvent(new CustomEvent("family-tree-error", {
						bubbles: true,
						composed: true,
						detail: { message: errorMessage },
					}));
				});
		}

		disconnectedCallback() {
			if (this.__onStorage) window.removeEventListener("storage", this.__onStorage);
			this.__resizeObserver?.disconnect();
		}

		#resolveTheme(override) {
			const candidates = [override, this.getAttribute("theme")];
			for (const value of candidates) {
				const normalized = String(value || "").toLowerCase();
				if (normalized === "dark" || normalized === "light") return normalized;
			}
			try {
				const stored = localStorage.getItem("app-theme");
				if (stored === "dark" || stored === "light") return stored;
			} catch {
				// ignore storage failures
			}
			if (document.body?.classList?.contains("theme-dark")) return "dark";
			return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
		}

		// The stylesheet uses system colours (Canvas/CanvasText/…); forcing
		// color-scheme on the host restyles the whole shadow tree, and the
		// data-theme attribute drives the header-matching chrome tokens.
		#applyTheme(override) {
			const theme = this.#resolveTheme(override);
			this.style.colorScheme = theme;
			this.dataset.theme = theme;
		}

		async #init(root) {
			const mainLayout = root.getElementById("mainLayout");
			const viewport = root.getElementById("viewport");
			const scene = root.getElementById("scene");
			const svg = root.getElementById("links");
			const nodesRoot = root.getElementById("nodes");
			const relationMenu = root.getElementById("relationMenu");
			const sidebar = root.getElementById("sidebar");
			const sidebarContent = root.getElementById("sidebarContent");
			const closeSidebarBtn = root.getElementById("closeSidebarBtn");
			const treeSearchInput = root.getElementById("treeSearchInput");
			const treeSearchResults = root.getElementById("treeSearchResults");
			const treeSearchRoot = treeSearchInput?.closest?.(".tree-search") ?? null;

			if (!viewport || !scene || !svg || !nodesRoot) return;
			if (relationMenu) relationMenu.classList.add("menu--hidden");

			const gedAttr = (this.getAttribute("ged") || "").trim();
			const personRef = (this.getAttribute("person") || "").trim();
			const includeDisconnected = this.hasAttribute("whole-tree");
			const isReadOnly = this.hasAttribute("readonly");
			this.dataset.minScale = includeDisconnected ? "0.01" : String(CONFIG.minScale);
			const gedUrl = gedAttr
				? new URL(gedAttr, window.location.href).href
				: resolveSitePath("data/family-tree.ged");

			await ensureGedcomLibrary();

			const fullData = await loadTreeData(gedUrl);
			await enrichPeopleWithPhotos(fullData.people);
			// Pets are hidden by default. `petsVisibleFor` holds the person ids whose
			// pets are currently shown — driven by the per-person "Children / Pets"
			// switch shown below each owner in the tree.
			const petsVisibleFor = new Set();
			let data = filterTreeData(fullData, petsVisibleFor);
			let indexes = buildIndexes(data);
			let engine = createLayoutEngine(data, indexes);
			let currentRootUnionId = data.rootUnionId;

			// Rebuild the working dataset/indexes/engine for the current pet
			// visibility. Callers re-render afterwards.
			const applyPetVisibility = () => {
				data = filterTreeData(fullData, petsVisibleFor);
				indexes = buildIndexes(data);
				engine = createLayoutEngine(data, indexes);
				if (!indexes.unionsById.has(currentRootUnionId)) {
					currentRootUnionId = data.rootUnionId;
				}
			};
			// The person the tree is currently built around. Drives the parent-branch
			// switcher (biological / adopted) shown between them and their parents.
			let currentFocusPersonId = null;
			let layoutResult = null;
			let rendered = null;
			let contentBbox = null;
			let defaultTransform = null;

			const treePeopleStats = root.getElementById("treePeopleStats");
			let statsRaf = 0;
			let statsTimer = 0;
			const updateTreeStatsNow = () => {
				if (!treePeopleStats) return;
				const total = data?.people?.length ?? 0;
				const viewportRect = viewport.getBoundingClientRect();
				let onScreen = 0;
				for (const node of nodesRoot.querySelectorAll(".node")) {
					const r = node.getBoundingClientRect();
					const intersects =
						r.right > viewportRect.left &&
						r.left < viewportRect.right &&
						r.bottom > viewportRect.top &&
						r.top < viewportRect.bottom;
					if (intersects) onScreen += 1;
				}
				treePeopleStats.textContent = `People: ${total} total • ${onScreen} on screen`;
			};
			const scheduleTreeStatsUpdate = () => {
				if (!treePeopleStats) return;
				if (statsRaf || statsTimer) return;

				statsTimer = window.setTimeout(() => {
					statsTimer = 0;
					if (statsRaf) {
						cancelAnimationFrame(statsRaf);
						statsRaf = 0;
					}
					updateTreeStatsNow();
				}, 120);

				statsRaf = requestAnimationFrame(() => {
					if (statsTimer) {
						clearTimeout(statsTimer);
						statsTimer = 0;
					}
					statsRaf = 0;
					updateTreeStatsNow();
				});
			};

			const panZoom = createPanZoom({ viewport, scene, onChange: scheduleTreeStatsUpdate });

			viewport.addEventListener("click", () => {
				if (panZoom.consumeClickSuppression?.()) return;
				rendered?.setSelected(null, { source: "viewport" });
			});

			const personById = (id) => indexes.peopleById.get(id) ?? { id, name: id, gender: "U" };
			const sexLabel = (sex) => {
				const s = String(sex ?? "U").toUpperCase();
				if (s === "M") return "Male";
				if (s === "F") return "Female";
				if (s === "X") return "Intersex";
				if (s === "N") return "Not recorded";
				return "Unknown";
			};

			const relationOptions = [
				"Father",
				"Mother",
				"Brother",
				"Sister",
				"Husband",
				"Wife",
				"Son",
				"Daughter",
			];

			const genderForRelationLabel = (label) => {
				if (["Father", "Brother", "Husband", "Son"].includes(label)) return "M";
				if (["Mother", "Sister", "Wife", "Daughter"].includes(label)) return "F";
				return "U";
			};

			let relationMenuAnchor = null;
			let relationMenuIsOpen = false;
			let relationMenuPersonId = null;

			const closeRelationMenu = () => {
				if (!relationMenu) return;
				relationMenu.classList.add("menu--hidden");
				relationMenuIsOpen = false;
				relationMenuAnchor = null;
				relationMenuPersonId = null;
			};

			// If the user zooms while the "Add relative" menu is open, close it.
			viewport.addEventListener(
				"wheel",
				() => {
					if (relationMenuIsOpen) closeRelationMenu();
				},
				{ passive: true, capture: true },
			);

			const _zoomIn = panZoom.zoomIn;
			const _zoomOut = panZoom.zoomOut;
			panZoom.zoomIn = () => {
				if (relationMenuIsOpen) closeRelationMenu();
				_zoomIn();
			};
			panZoom.zoomOut = () => {
				if (relationMenuIsOpen) closeRelationMenu();
				_zoomOut();
			};

			const ensureRelationMenuContent = () => {
				if (!relationMenu) return;
				if (relationMenu.childElementCount > 0) return;

				const title = el("div", "menu__title");
				title.id = "relationMenuTitle";
				title.textContent = "Add to tree";
				relationMenu.appendChild(title);

				for (const label of relationOptions) {
					const item = document.createElement("button");
					item.type = "button";
					item.className = "menu__item";
					item.setAttribute("role", "menuitem");
					item.dataset.gender = genderForRelationLabel(label);
					item.textContent = label;
					item.addEventListener("click", (evt) => {
						evt.preventDefault();
						if (!relationMenuPersonId) return;
						console.log("Add", label, "for", relationMenuPersonId);
						closeRelationMenu();
					});
					relationMenu.appendChild(item);
				}
			};

			const positionRelationMenu = (anchorEl) => {
				if (!relationMenu) return;
				const margin = 8;
				const anchorRect = anchorEl.getBoundingClientRect();

				relationMenu.style.left = "0px";
				relationMenu.style.top = "0px";
				relationMenu.classList.remove("menu--hidden");

				const menuRect = relationMenu.getBoundingClientRect();
				let left = anchorRect.right - menuRect.width;
				let top = anchorRect.bottom + 8;

				if (left + menuRect.width > window.innerWidth - margin) {
					left = window.innerWidth - margin - menuRect.width;
				}
				left = Math.max(margin, left);

				if (top + menuRect.height > window.innerHeight - margin) {
					top = anchorRect.top - 8 - menuRect.height;
				}
				top = Math.max(margin, top);

				relationMenu.style.left = `${left}px`;
				relationMenu.style.top = `${top}px`;
			};

			const openRelationMenu = ({ personId, anchorEl }) => {
				if (!relationMenu) return;
				relationMenuPersonId = personId;
				ensureRelationMenuContent();
				const title = root.getElementById("relationMenuTitle");
				const selectedName = formatDisplayName(personById(personId)) || personId;
				if (title) title.textContent = `Add relative for ${selectedName}`;

				relationMenuAnchor = anchorEl;
				relationMenuIsOpen = true;
				positionRelationMenu(anchorEl);
				relationMenu.querySelector("button")?.focus();
			};

			// Close the menu when clicking outside it. Events crossing the shadow
			// boundary are retargeted, so test the composed path, not e.target.
			document.addEventListener(
				"pointerdown",
				(e) => {
					if (!relationMenuIsOpen || !relationMenu) return;
					const path = e.composedPath();
					if (path.includes(relationMenu)) return;
					if (relationMenuAnchor && path.includes(relationMenuAnchor)) return;
					closeRelationMenu();
				},
				true,
			);

			window.addEventListener("keydown", (e) => {
				if (!relationMenuIsOpen) return;
				if (e.key === "Escape") closeRelationMenu();
			});

			const uniq = (list) => [...new Set((list ?? []).filter(Boolean))];
			const displayPersonName = (personId) => formatDisplayName(personById(personId)) || personId;
			const displayPersonGender = (personId) => normalizeGender(personById(personId).gender);
			const selectPersonFromAnywhere = (personId, source = "sidebar") => {
				if (!personId || !indexes.peopleById.has(personId)) return;
				closeTreeSearch();
				closeRelationMenu();
				if (!layoutResult?.positions?.people?.has(personId)) {
					openTreeForPerson(personId, { source });
					return;
				}
				rendered?.setSelected(personId, { source });
				viewport?.focus();
			};

			let searchIsOpen = false;
			const closeTreeSearch = () => {
				if (!treeSearchResults) return;
				treeSearchResults.classList.add("tree-search__results--hidden");
				treeSearchResults.replaceChildren();
				searchIsOpen = false;
			};

			const openTreeSearch = () => {
				if (!treeSearchResults) return;
				treeSearchResults.classList.remove("tree-search__results--hidden");
				searchIsOpen = true;
			};

			const updateTreeSearchResults = () => {
				if (!treeSearchInput || !treeSearchResults) return;
				const query = treeSearchInput.value.trim().toLowerCase();
				if (!query) {
					closeTreeSearch();
					return;
				}

				const candidates = data.people
					.map((person) => {
						const id = person.id;
						const name = displayPersonName(id);
						const dates = formatDates(person);
						const isVisible = Boolean(layoutResult?.positions?.people?.has(id));
						return {
							id,
							name,
							gender: displayPersonGender(id),
							label: `${dates ? `${name} ${dates}` : name}${isVisible ? "" : " - open tree"}`,
						};
					})
					.filter((c) => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query))
					.sort((a, b) => a.name.localeCompare(b.name))
					.slice(0, 12);

				treeSearchResults.replaceChildren();
				if (candidates.length === 0) {
					closeTreeSearch();
					return;
				}

				for (const c of candidates) {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "tree-search__result";
					btn.dataset.gender = c.gender;
					btn.setAttribute("role", "option");
					btn.textContent = c.label;
					btn.addEventListener("click", (e) => {
						e.preventDefault();
						treeSearchInput.value = "";
						closeTreeSearch();
						selectPersonFromAnywhere(c.id, "search");
						viewport?.focus();
					});
					treeSearchResults.appendChild(btn);
				}

				openTreeSearch();
			};

			treeSearchInput?.addEventListener("input", updateTreeSearchResults);
			treeSearchInput?.addEventListener("focus", updateTreeSearchResults);
			treeSearchInput?.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					closeTreeSearch();
					treeSearchInput.blur();
				}
			});

			document.addEventListener(
				"pointerdown",
				(e) => {
					if (!searchIsOpen) return;
					if (!treeSearchRoot) {
						closeTreeSearch();
						return;
					}
					if (e.composedPath().includes(treeSearchRoot)) return;
					closeTreeSearch();
				},
				true,
			);

			const createSidebarAvatar = (person) => {
				const avatar = el("div", "sidebar__avatar");
				if (person.photoUrl) {
					const img = document.createElement("img");
					img.decoding = "async";
					img.loading = "lazy";
					img.alt = "";
					img.src = person.photoUrl;
					avatar.appendChild(img);
				} else {
					avatar.appendChild(createBiIcon("person-circle", "sidebar__avatar-icon"));
				}
				return avatar;
			};

			const createPersonButton = (personId) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "sidebar__person-button";
				button.textContent = displayPersonName(personId);
				button.addEventListener("click", (event) => {
					event.preventDefault();
					selectPersonFromAnywhere(personId, "sidebar");
				});
				return button;
			};

			const createPersonList = (ids) => {
				const ul = document.createElement("ul");
				ul.className = "sidebar__list sidebar__list--plain";
				for (const id of ids ?? []) {
					const li = document.createElement("li");
					const dot = el("span", "sidebar__dot");
					dot.dataset.gender = displayPersonGender(id);
					li.append(dot, createPersonButton(id));
					ul.appendChild(li);
				}
				return ul;
			};

			const gedcomRecordTitle = (record, fallback = "GEDCOM record") => {
				if (!record) return fallback;
				const pointer = record.pointer ? `${record.pointer} ` : "";
				return `${pointer}${record.tag || fallback}`.trim();
			};

			const gedcomRecordLines = (record, level = 0, lines = []) => {
				if (!record) return lines;
				const fields = [String(level)];
				if (record.pointer) fields.push(record.pointer);
				fields.push(record.tag || "");
				if (record.value !== null && record.value !== undefined) fields.push(String(record.value));
				lines.push(fields.filter(Boolean).join(" "));
				for (const child of record.children || []) gedcomRecordLines(child, level + 1, lines);
				return lines;
			};

			const createGedcomRecordDetails = (record, fallbackTitle, open = false) => {
				const details = document.createElement("details");
				details.className = "sidebar__gedcom-record";
				details.open = open;
				const summary = document.createElement("summary");
				summary.textContent = gedcomRecordTitle(record, fallbackTitle);
				const pre = document.createElement("pre");
				pre.className = "sidebar__gedcom-pre";
				pre.textContent = gedcomRecordLines(record).join("\n");
				details.append(summary, pre);
				return details;
			};

			const createGedcomFactRecordDetails = (record, fallbackTitle, open = false) => {
				const details = document.createElement("details");
				details.className = "sidebar__fact-record";
				details.open = open;
				const summary = document.createElement("summary");
				summary.textContent = gedcomRecordTitle(record, fallbackTitle);
				const list = el("div", "sidebar__fact-list");
				for (const fact of gedcomFactSummaries(record)) {
					const item = el("div", "sidebar__fact");
					const label = el("div", "sidebar__fact-label");
					label.textContent = fact.label;
					const value = el("div", "sidebar__fact-value");
					value.textContent = fact.value || "-";
					item.append(label, value);

					if (fact.details.length > 0) {
						const detailList = el("div", "sidebar__fact-details");
						for (const line of fact.details) {
							const row = el("div", "sidebar__fact-detail");
							row.style.paddingLeft = `${Math.min(line.depth, 6) * 10}px`;
							const detailLabel = el("span", "sidebar__fact-detail-label");
							detailLabel.textContent = `${line.label}:`;
							const detailValue = el("span");
							detailValue.textContent = line.value || "-";
							if (!line.value) detailValue.classList.add("sidebar__fact-empty");
							row.append(detailLabel, detailValue);
							detailList.append(row);
						}
						item.append(detailList);
					}

					list.append(item);
				}
				if (list.childElementCount === 0) {
					const empty = el("div", "sidebar__meta");
					empty.textContent = "No GEDCOM facts available.";
					list.append(empty);
				}
				details.append(summary, list);
				return details;
			};

			const updateSidebar = (personId) => {
				if (!sidebar || !sidebarContent) return;
				sidebarContent.replaceChildren();
				if (!personId) {
					sidebar.classList.add("sidebar--hidden");
					mainLayout?.classList.remove("main--sidebar");
					return;
				}

				sidebar.classList.remove("sidebar--hidden");
				mainLayout?.classList.add("main--sidebar");

				const person = personById(personId);
				const gender = normalizeGender(person.gender);
				const datesText = formatDates(person);

				const top = el("div", "sidebar__person");
				const topInfo = el("div");
				const headerName = el("div", "sidebar__name");
				headerName.textContent = formatDisplayName(person) || personId;
				const subtitle = el("div", "sidebar__subtitle");
				subtitle.textContent = `${sexLabel(person.sex ?? gender)}${datesText ? ` • ${datesText}` : ""} • ${person.id}`;
				topInfo.append(headerName, subtitle);
				top.append(createSidebarAvatar(person), topInfo);
				sidebarContent.append(top);

				if (person.genepediaId) {
					const profileLink = document.createElement("a");
					profileLink.className = "sidebar__profile-link";
					profileLink.href = resolveSitePath(`${person.isPet ? "pages/pets" : "pages/people"}/${encodeURIComponent(person.genepediaId)}/index.html`);
					profileLink.append(createBiIcon("person-badge", "sidebar__profile-link-icon"));
					const linkText = document.createElement("span");
					linkText.textContent = person.isPet ? "View pet profile" : "View Genepedia profile";
					profileLink.append(linkText);
					sidebarContent.append(profileLink);
				}

				const profileHeading = el("div", "sidebar__heading");
				profileHeading.textContent = "Profile Details";
				sidebarContent.append(profileHeading);

				const details = el("div", "sidebar__details");
				const addDetail = (label, value) => {
					const l = el("div", "sidebar__details-label");
					l.textContent = label;
					const v = el("div");
					v.textContent = value;
					details.append(l, v);
				};
				addDetail("Birth:", person.birthDate || (typeof person.born === "number" ? String(person.born) : "-"));
				addDetail("Birth place:", person.birthPlace || "-");
				addDetail("Death:", person.deathDate || (typeof person.died === "number" ? String(person.died) : "-"));
				addDetail("Death place:", person.deathPlace || "-");
				addDetail("Sex:", sexLabel(person.sex ?? gender));
				const occupations = gedcomFactValues(person.gedcom, "OCCU");
				if (occupations.length > 0) {
					addDetail(occupations.length === 1 ? "Occupation:" : "Occupations:", occupations.join(", "));
				}
				if (Array.isArray(person.aliases) && person.aliases.length > 0) {
					addDetail("Also known as:", person.aliases.join(", "));
				}
				if (typeof person.birthSurname === "string" && person.birthSurname.trim()) {
					addDetail("Birth surname:", person.birthSurname.trim());
				}
				sidebarContent.append(details);

				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				const parentIds = uniq(parentUnionIds.flatMap((uid) => indexes.unionsById.get(uid)?.partners ?? []));
				const siblingIds = uniq(parentUnionIds.flatMap((uid) => indexes.unionsById.get(uid)?.children ?? [])).filter(
					(id) => id !== personId,
				);

				const unionIds = indexes.unionsByPartner.get(personId) ?? [];
				const familyRecords = uniq([...parentUnionIds, ...unionIds])
					.map((familyId) => indexes.unionsById.get(familyId)?.gedcom)
					.filter(Boolean);
				const referencedRecords = gedcomReferencedRecords(data.gedcom, [person.gedcom, ...familyRecords]);

				const factsHeading = el("div", "sidebar__heading");
				factsHeading.textContent = "GEDCOM Facts";
				sidebarContent.append(factsHeading);

				const factsGroup = el("div", "sidebar__fact-group");
				if (person.gedcom) {
					factsGroup.append(createGedcomFactRecordDetails(person.gedcom, "Individual facts", true));
				}
				for (const familyRecord of familyRecords) {
					factsGroup.append(createGedcomFactRecordDetails(familyRecord, "Family facts", true));
				}
				for (const referencedRecord of referencedRecords) {
					factsGroup.append(createGedcomFactRecordDetails(referencedRecord, "Referenced facts", true));
				}
				if (factsGroup.childElementCount === 0) {
					const empty = el("div", "sidebar__meta");
					empty.textContent = "No GEDCOM facts available for this person.";
					factsGroup.append(empty);
				}
				sidebarContent.append(factsGroup);

				const familyHeading = el("div", "sidebar__heading");
				familyHeading.textContent = "Immediate Family";
				sidebarContent.append(familyHeading);

				const addFamilyGroup = (titleText, ids) => {
					if (!ids || ids.length === 0) return;
					const group = el("div", "sidebar__family-group");
					const title = el("div", "sidebar__group-title");
					title.textContent = titleText;
					group.append(title, createPersonList(ids));
					sidebarContent.append(group);
				};

				addFamilyGroup("Parents", parentIds);
				addFamilyGroup("Siblings", siblingIds);

				// Partners and children (grouped by union)
				const unions = unionIds.map((uid) => indexes.unionsById.get(uid)).filter(Boolean);
				if (unions.length > 0) {
					const group = el("div", "sidebar__family-group");
					const title = el("div", "sidebar__group-title");
					title.textContent = "Partners and Children";
					group.append(title);

					for (const union of unions) {
						const otherPartners = (union.partners ?? []).filter((pid) => pid !== personId);
						if (otherPartners.length > 0) {
							const row = el("div", "sidebar__partner-row");
							const dot = el("span", "sidebar__dot");
							dot.dataset.gender =
								otherPartners.length === 1 ? displayPersonGender(otherPartners[0]) : "U";
							const names = el("span", "sidebar__partner-names");
							otherPartners.forEach((partnerId, index) => {
								if (index > 0) names.append(document.createTextNode("&"));
								names.append(createPersonButton(partnerId));
							});
							row.append(dot, names);
							group.append(row);
						}

						const kids = union.children ?? [];
						if (kids.length > 0) {
							const kidsList = createPersonList(kids);
							kidsList.classList.add("sidebar__nested");
							group.append(kidsList);
						}
					}

					sidebarContent.append(group);
				}

				const gedcomHeading = el("div", "sidebar__heading");
				gedcomHeading.textContent = "GEDCOM Data";
				sidebarContent.append(gedcomHeading);

				const gedcomGroup = el("div", "sidebar__gedcom-group");
				if (person.gedcom) {
					gedcomGroup.append(createGedcomRecordDetails(person.gedcom, "Individual record", true));
				}
				for (const familyRecord of familyRecords) {
					if (familyRecord) gedcomGroup.append(createGedcomRecordDetails(familyRecord, "Family record"));
				}
				for (const referencedRecord of referencedRecords) {
					if (referencedRecord) gedcomGroup.append(createGedcomRecordDetails(referencedRecord, "Referenced record"));
				}
				if (gedcomGroup.childElementCount === 0) {
					const empty = el("div", "sidebar__meta");
					empty.textContent = "No GEDCOM record data available for this person.";
					gedcomGroup.append(empty);
				}
				sidebarContent.append(gedcomGroup);
			};

			let selectedPersonId = null;
			const focusSelectedPerson = (personId) => {
				if (!personId) return;
				const pos = layoutResult?.positions?.people?.get(personId);
				if (!pos) return;
				const vw = viewport.clientWidth;
				const vh = viewport.clientHeight;
				if (vw <= 0 || vh <= 0) return;

				const current = panZoom.get();
				const scale = clamp(current.scale, CONFIG.minScale, CONFIG.maxScale);
				const x = vw / 2 - pos.x * scale;
				const y = vh / 2 - pos.y * scale;
				panZoom.set({ x, y, scale });
			};

			const handleSelect = (personId, opts = {}) => {
				const prev = selectedPersonId;
				selectedPersonId = personId;
				if (prev !== selectedPersonId) closeRelationMenu();
				// On initial deep-link selection, highlight and centre the person but
				// keep the details sidebar closed so the tree stays fully visible.
				if (opts.source !== "init") updateSidebar(selectedPersonId);
				if (selectedPersonId) focusSelectedPerson(selectedPersonId);
			};

			const getPreferredRootUnionIdForPerson = (personId) => {
				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				if (parentUnionIds.length > 0) return parentUnionIds[0];
				const partnerUnionIds = indexes.unionsByPartner.get(personId) ?? [];
				if (partnerUnionIds.length > 0) return partnerUnionIds[0];
				return currentRootUnionId;
			};

			// The set of parent branches (biological / adopted / foster …) the focus
			// person belongs to, with the pedigree label read from their FAMC links.
			const focusParentBranches = (personId) => {
				const person = personById(personId);
				const unionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				const pediByUnion = gedcomParentPediByUnion(person);
				return unionIds
					.map((unionId) => {
						const union = indexes.unionsById.get(unionId);
						if (!union) return null;
						const parentNames = (union.partners ?? [])
							.filter(Boolean)
							.map((pid) => displayPersonName(pid));
						const pedi = pediByUnion.get(unionId) ?? "";
						return {
							unionId,
							pedi,
							label: pediBranchLabel(pedi),
							icon: pediBranchIcon(pedi),
							parentNames,
						};
					})
					.filter(Boolean);
			};

			// A clear, on-canvas segmented control that sits on the connector between
			// the focus person and their parents, letting you see at a glance — and
			// instantly switch — which parent branch (biological vs adopted, etc.)
			// the tree is showing. Only appears when the focus has more than one.
			const renderBranchSwitcher = () => {
				nodesRoot.querySelector(".branch-switch")?.remove();
				const focusId = currentFocusPersonId;
				if (!focusId) return;
				const branches = focusParentBranches(focusId);
				if (branches.length < 2) return;
				const focusPos = layoutResult?.positions?.people?.get(focusId);
				if (!focusPos) return;

				const anchor = layoutResult?.positions?.unions?.get(currentRootUnionId);
				const focusTop = focusPos.y - CONFIG.nodeHeight / 2;
				const anchorY = anchor ? anchor.y : focusPos.y - CONFIG.generationGap * 0.5;

				const switcher = el("div", "branch-switch");
				switcher.style.left = `${focusPos.x}px`;
				switcher.style.top = `${(anchorY + focusTop) / 2}px`;
				switcher.addEventListener("click", (e) => e.stopPropagation());
				switcher.addEventListener("pointerdown", (e) => e.stopPropagation());

				const label = el("div", "branch-switch__label");
				label.append(createBiIcon("signpost-split-fill", "branch-switch__label-icon"));
				const labelText = document.createElement("span");
				labelText.textContent = "Parents";
				label.append(labelText);
				switcher.append(label);

				const chipsWrap = el("div", "branch-switch__chips");
				for (const branch of branches) {
					const isActive = branch.unionId === currentRootUnionId;
					const chip = document.createElement("button");
					chip.type = "button";
					chip.className = "branch-switch__chip";
					chip.classList.toggle("is-active", isActive);
					chip.dataset.pedi = String(branch.pedi || "biological").toLowerCase();
					chip.append(createBiIcon(branch.icon, "branch-switch__chip-icon"));
					const chipText = document.createElement("span");
					chipText.className = "branch-switch__chip-label";
					chipText.textContent = branch.label;
					chip.append(chipText);
					const tip = branch.parentNames.length
						? `${branch.label} parents: ${branch.parentNames.join(" & ")}`
						: `${branch.label} parents`;
					chip.title = tip;
					chip.setAttribute("aria-label", tip);
					chip.setAttribute("aria-pressed", isActive ? "true" : "false");
					chip.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						if (branch.unionId === currentRootUnionId) return;
						currentRootUnionId = branch.unionId;
						renderTree({ selectPersonId: focusId, source: "branch-switch", transformMode: "pan" });
					});
					chipsWrap.append(chip);
				}
				switcher.append(chipsWrap);
				nodesRoot.append(switcher);
			};

			// A per-person "Children / Pets" switch placed just below the focus person
			// (mirroring the parent-branch switch above them). Flips what shows beneath
			// them — their children, or their pets from the pets database. Only appears
			// when that person owns pets.
			const renderPetsSwitcher = () => {
				nodesRoot.querySelector(".pets-switch")?.remove();
				const focusId = currentFocusPersonId;
				if (!focusId) return;
				const ownerUnions = petUnionsForOwner(fullData, focusId);
				if (!ownerUnions.length) return;
				const focusPos = layoutResult?.positions?.people?.get(focusId);
				if (!focusPos) return;
				const petCount = ownerUnions.reduce((sum, union) => sum + (union.children?.length || 0), 0);
				const childCount = new Set(
					fullData.unions
						.filter((union) => !union.isPetUnion && (union.partners || []).includes(focusId))
						.flatMap((union) => union.children || []),
				).size;
				const showing = petsVisibleFor.has(focusId);

				const switcher = el("div", "branch-switch pets-switch");
				switcher.style.left = `${focusPos.x}px`;
				switcher.style.top = `${focusPos.y + CONFIG.nodeHeight / 2 + 20}px`;
				switcher.addEventListener("click", (e) => e.stopPropagation());
				switcher.addEventListener("pointerdown", (e) => e.stopPropagation());

				const label = el("div", "branch-switch__label");
				const pawIcon = el("span", "branch-switch__label-icon");
				pawIcon.setAttribute("aria-hidden", "true");
				pawIcon.textContent = "🐾";
				label.append(pawIcon);
				const labelText = document.createElement("span");
				labelText.textContent = "Below";
				label.append(labelText);
				switcher.append(label);

				const chipsWrap = el("div", "branch-switch__chips");
				const makeChip = (text, icon, active, wantPets) => {
					const chip = document.createElement("button");
					chip.type = "button";
					chip.className = "branch-switch__chip";
					chip.classList.toggle("is-active", active);
					chip.append(createBiIcon(icon, "branch-switch__chip-icon"));
					const t = document.createElement("span");
					t.className = "branch-switch__chip-label";
					t.textContent = text;
					chip.append(t);
					chip.setAttribute("aria-pressed", active ? "true" : "false");
					chip.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						if (wantPets === petsVisibleFor.has(focusId)) return;
						if (wantPets) petsVisibleFor.add(focusId);
						else petsVisibleFor.delete(focusId);
						applyPetVisibility();
						renderTree({ selectPersonId: focusId, source: "pets-switch", transformMode: "pan" });
					});
					return chip;
				};
				chipsWrap.append(makeChip(`Children (${childCount})`, "people-fill", !showing, false));
				chipsWrap.append(makeChip(`Pets (${petCount})`, "heart-fill", showing, true));
				switcher.append(chipsWrap);
				nodesRoot.append(switcher);
			};

			const renderTree = (opts = {}) => {
				closeTreeSearch();
				const prevTransform = panZoom.get();
				layoutResult = engine.layout(currentRootUnionId, {
					fallbackPersonId: opts.selectPersonId || initialPersonId || null,
					includeDisconnected,
				});
				rendered = render({
					data,
					indexes,
					layoutResult,
					viewport,
					scene,
					svg,
					nodesRoot,
					onSelect: handleSelect,
					onEdit: ({ personId }) => {
						console.log("Edit person:", personId);
					},
					onAdd: ({ personId, anchorEl }) => {
						if (
							relationMenuIsOpen &&
							relationMenuAnchor === anchorEl &&
							relationMenuPersonId === personId
						) {
							closeRelationMenu();
							return;
						}
						openRelationMenu({ personId, anchorEl });
					},
					onTree: ({ personId }) => openTreeForPerson(personId),
					focusPersonId: currentFocusPersonId,
					readOnly: isReadOnly,
				});

				contentBbox = rendered.getContentBbox();
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });

				const transformMode = opts.transformMode ?? "fit";
				if (transformMode === "fit") {
					panZoom.set(defaultTransform);
				} else {
					const vw = viewport.clientWidth;
					const vh = viewport.clientHeight;
					// opts.scale lets callers request a specific zoom (e.g. opening the
					// tab centred on a person at roughly the page's own text size).
					const baseScale = opts.scale ?? prevTransform.scale;
					const scale = clamp(baseScale, CONFIG.minScale, CONFIG.maxScale);
					let x = prevTransform.x;
					let y = prevTransform.y;
					const focusId = opts.selectPersonId;
					const pos = focusId ? layoutResult?.positions?.people?.get(focusId) : null;
					if (pos && vw > 0 && vh > 0) {
						x = vw / 2 - pos.x * scale;
						y = vh / 2 - pos.y * scale;
					}
					panZoom.set({ x, y, scale });
				}

				if (opts.selectPersonId) {
					rendered.setSelected(opts.selectPersonId, { source: opts.source ?? "tree" });
				}

				renderBranchSwitcher();
				renderPetsSwitcher();
				updateTreeStatsNow();
			};

			function openTreeForPerson(personId, opts = {}) {
				if (!personId) return;
				closeRelationMenu();
				currentFocusPersonId = personId;
				currentRootUnionId = getPreferredRootUnionIdForPerson(personId);
				renderTree({ selectPersonId: personId, source: opts.source ?? "tree", transformMode: "pan" });
			}

			const findPersonIdByRef = (ref) => {
				const needle = String(ref ?? "").trim();
				if (!needle) return null;

				for (const person of data.people) {
					if (String(person.genepediaId ?? "").trim() === needle) return person.id;
				}

				if (indexes.peopleById.has(needle)) return needle;
				const asXref = `@${needle.replace(/^@|@$/g, "")}@`;
				if (indexes.peopleById.has(asXref)) return asXref;
				return null;
			};

			const shouldFocusFirstPerson = isReadOnly && !includeDisconnected && !personRef;
			const initialPersonId = findPersonIdByRef(personRef) ||
				(shouldFocusFirstPerson ? data.people[0]?.id ?? null : null);
			if (initialPersonId) {
				currentFocusPersonId = initialPersonId;
				currentRootUnionId = getPreferredRootUnionIdForPerson(initialPersonId);
				// Open zoomed in on the selected person so the node's Edit/Add
				// buttons render at the same size as the standard site buttons
				// (footer social = 36px, header notifications = 39px). The node
				// action buttons are 28px in tree space, so this scale lands them
				// at ~37px on screen.
				renderTree({
					selectPersonId: initialPersonId,
					source: "init",
					transformMode: "pan",
					scale: SITE_BUTTON_PX / NODE_ACTION_BUTTON_PX,
				});
			} else {
				renderTree();
			}

			closeSidebarBtn?.addEventListener("click", (e) => {
				e.preventDefault();
				rendered?.setSelected(null, { source: "sidebar" });
				viewport?.focus();
			});

			const fitBtn = root.getElementById("fitBtn");
			const resetBtn = root.getElementById("resetBtn");
			const zoomInBtn = root.getElementById("zoomInBtn");
			const zoomOutBtn = root.getElementById("zoomOutBtn");

			const applyFit = () => {
				if (!contentBbox) return;
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });
				panZoom.set(defaultTransform);
			};

			fitBtn?.addEventListener("click", applyFit);
			resetBtn?.addEventListener("click", () => {
				if (!defaultTransform) return;
				panZoom.set(defaultTransform);
			});

			// The in-tree SVG/PNG buttons were removed in favour of the shared
			// download dropdown in the full-page toolbar. That dropdown is tab-aware,
			// so on the Tree tab it calls this method to export the rendered tree.
			this.exportTreeImage = async (format = "svg") => {
				if (!layoutResult) return false;
				const exported = buildExportSvg({ data, indexes, layoutResult });
				const fmt = String(format || "svg").toLowerCase();
				if (fmt === "png") {
					const pngBlob = await svgToPngBlob({
						svg: exported.svg,
						width: exported.width,
						height: exported.height,
						scale: 2,
					});
					downloadBlob("family-tree.png", pngBlob);
					return true;
				}
				// Default and "svg" both produce the vector export.
				downloadBlob("family-tree.svg", new Blob([exported.svg], { type: "image/svg+xml;charset=utf-8" }));
				return true;
			};

			zoomInBtn?.addEventListener("click", () => panZoom.zoomIn());
			zoomOutBtn?.addEventListener("click", () => panZoom.zoomOut());

			viewport.addEventListener("keydown", (e) => {
				if (e.key === "+" || e.key === "=") {
					e.preventDefault();
					panZoom.zoomIn();
				}
				if (e.key === "-" || e.key === "_") {
					e.preventDefault();
					panZoom.zoomOut();
				}
				if (e.key === "0") {
					e.preventDefault();
					if (!defaultTransform) return;
					panZoom.set(defaultTransform);
				}
				if (e.key.toLowerCase() === "f") {
					e.preventDefault();
					applyFit();
				}
			});

			const isNear = (a, b, eps) => Math.abs(a - b) <= eps;
			const isTransformNear = (a, b) =>
				isNear(a.x, b.x, 0.5) && isNear(a.y, b.y, 0.5) && isNear(a.scale, b.scale, 0.001);

			// Re-fit on resize (only if user hasn't moved away from default).
			const resizeObserver = new ResizeObserver(() => {
				if (!contentBbox || !defaultTransform) return;
				const current = panZoom.get();
				const wasAtDefault = isTransformNear(current, defaultTransform);
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });
				if (wasAtDefault) panZoom.set(defaultTransform);
				updateTreeStatsNow();
			});
			resizeObserver.observe(viewport);
			this.__resizeObserver = resizeObserver;
		}
	}

	if (!customElements.get("family-tree")) {
		customElements.define("family-tree", FamilyTree);
	}
})();
