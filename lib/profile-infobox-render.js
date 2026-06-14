/**
 * Shared profile identity infobox parsing and HTML rendering.
 *
 * Used by the profile editor and the live people-page profile view so both
 * surfaces show the same canonical identity data.
 */
(function () {
	"use strict";

	const MONTHS = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	];

	const GENDERS = [
		{ value: "male", label: "Male" },
		{ value: "female", label: "Female" },
		{ value: "unknown", label: "Unknown" },
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

	function escapeHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[char]));
	}

	function parseDateParts(value) {
		const match = String(value || "").trim().match(/^(\d{4})(?:[\/\-.\s]+(\d{1,2}))?(?:[\/\-.\s]+(\d{1,2}))?$/);
		if (!match) return null;
		return {
			year: Number(match[1]),
			month: match[2] ? Number(match[2]) : null,
			day: match[3] ? Number(match[3]) : null,
		};
	}

	function friendlyDate(value, opts = {}) {
		if (opts.precision === "between" && typeof value === "string" && value.includes("|")) {
			const parts = value.split("|").map((s) => s.trim()).filter(Boolean);
			const left = parts[0] ? friendlyDate(parts[0], { precision: "exact", circa: false }) : "";
			const right = parts[1] ? friendlyDate(parts[1], { precision: "exact", circa: false }) : "";
			if (left && right) return `${left} and ${right}`;
			return left || right || "";
		}
		const parts = parseDateParts(value);
		if (!parts) return String(value || "").trim();

		let body;
		if (parts.month && parts.day) {
			body = `${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
		} else if (parts.month) {
			body = `${MONTHS[parts.month - 1]} ${parts.year}`;
		} else {
			body = String(parts.year);
		}

		let prefix = "";
		if (opts.circa || opts.precision === "about") prefix = "c. ";
		else if (opts.precision === "before") prefix = "before ";
		else if (opts.precision === "after") prefix = "after ";
		return prefix + body;
	}

	function parseFriendlyToStored(value) {
		let text = String(value || "").trim().replace(/^c\.?\s*/i, "").replace(/^(before|after|about)\s+/i, "");
		let match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
		if (match) {
			const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === match[1].toLowerCase());
			if (monthIndex >= 0) {
				return `${match[3]}/${String(monthIndex + 1).padStart(2, "0")}/${String(match[2]).padStart(2, "0")}`;
			}
		}
		match = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
		if (match) {
			const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === match[1].toLowerCase());
			if (monthIndex >= 0) return `${match[2]}/${String(monthIndex + 1).padStart(2, "0")}`;
		}
		match = text.match(/(\d{4})/);
		return match ? match[1] : "";
	}

	function normalizeStoredDate(value) {
		const text = String(value || "").trim();
		if (!text) return "";

		const slashDate = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
		if (slashDate) {
			return `${slashDate[1]}-${slashDate[2].padStart(2, "0")}-${slashDate[3].padStart(2, "0")}`;
		}

		const yearMonth = text.match(/^(\d{4})\/(\d{1,2})$/);
		if (yearMonth) {
			return `${yearMonth[1]}-${yearMonth[2].padStart(2, "0")}`;
		}

		if (/^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d{4}-\d{2}$/.test(text) || /^\d{4}$/.test(text)) {
			return text;
		}

		return text;
	}

	function emptyLocationData() {
		return {
			label: "",
			placeName: "",
			addressLine1: "",
			addressLine2: "",
			addressLine3: "",
			city: "",
			postalCode: "",
			county: "",
			stateProvince: "",
			country: "",
			countryCode: "",
			latitude: "",
			longitude: "",
			source: "",
		};
	}

	function normalizeLocationData(raw, fallbackLabel = "") {
		const data = emptyLocationData();
		if (raw && typeof raw === "object") {
			Object.keys(data).forEach((key) => {
				if (raw[key] != null) data[key] = String(raw[key]).trim();
			});
		}

		const fallback = String(fallbackLabel || "").trim();
		if (!data.label && fallback) {
			data.label = fallback;
		}

		return data;
	}

	function uniqueNonEmpty(values) {
		const seen = new Set();
		return values.filter((value) => {
			const text = String(value || "").trim();
			if (!text) return false;
			const normalized = text.toLowerCase();
			if (seen.has(normalized)) return false;
			seen.add(normalized);
			return true;
		});
	}

	function hasLocationDetails(location) {
		const normalized = normalizeLocationData(location);
		return LOCATION_DETAIL_FIELDS.some(({ key }) => normalized[key]);
	}

	function ensureLocationDetailsFromSummary(location) {
		const normalized = normalizeLocationData(location);
		if (hasLocationDetails(normalized)) {
			normalized.label = formatLocationSummary(normalized, "");
			return normalized;
		}

		const summary = String(normalized.placeName || normalized.label || "").trim();
		if (summary) {
			normalized.placeName = summary;
			normalized.label = summary;
			return normalized;
		}

		normalized.label = "";
		return normalized;
	}

	function formatLocationSummary(location, fallbackLabel = "") {
		const normalized = normalizeLocationData(location, fallbackLabel);
		const primary = uniqueNonEmpty([
			normalized.placeName,
			normalized.city,
			normalized.county,
			normalized.stateProvince,
			normalized.country,
		]);
		if (primary.length) {
			return primary.join(", ");
		}

		const secondary = uniqueNonEmpty([
			normalized.addressLine1,
			normalized.addressLine2,
			normalized.addressLine3,
			normalized.label,
			fallbackLabel,
		]);
		return secondary.join(", ");
	}

	function emptyData() {
		return {
			version: 1,
			title: "",
			firstName: "",
			middleName: "",
			lastName: "",
			birthSurname: "",
			suffix: "",
			displayName: "",
			alsoKnownAs: [],
			status: "unknown",
			gender: "unknown",
			occupation: "",
			lastResidence: "",
			lastResidenceLocation: emptyLocationData(),
			birth: { date: "", precision: "exact", circa: false, place: "", location: emptyLocationData() },
			baptism: { date: "", precision: "exact", circa: false, place: "", location: emptyLocationData() },
			death: { date: "", precision: "exact", circa: false, place: "", location: emptyLocationData(), cause: "" },
			burial: { date: "", precision: "exact", circa: false, type: "burial", place: "", location: emptyLocationData() },
			photo: { src: "", alt: "" },
		};
	}

	function normalizeData(raw) {
		const data = emptyData();
		if (!raw || typeof raw !== "object") return data;
		const scalarKeys = [
			"title", "firstName", "middleName", "lastName", "birthSurname", "suffix",
			"displayName", "status", "gender", "occupation", "lastResidence",
		];
		for (const key of scalarKeys) {
			if (raw[key] != null) data[key] = String(raw[key]);
		}
		if (Array.isArray(raw.alsoKnownAs)) {
			data.alsoKnownAs = raw.alsoKnownAs.map((v) => String(v).trim()).filter(Boolean);
		} else if (typeof raw.alsoKnownAs === "string") {
			data.alsoKnownAs = raw.alsoKnownAs.split(",").map((v) => v.trim()).filter(Boolean);
		}
		data.lastResidenceLocation = ensureLocationDetailsFromSummary(normalizeLocationData(raw.lastResidenceLocation, data.lastResidence));
		data.lastResidence = formatLocationSummary(data.lastResidenceLocation, "");
		for (const group of ["birth", "baptism", "death", "burial"]) {
			if (raw[group] && typeof raw[group] === "object") {
				Object.assign(data[group], raw[group]);
				data[group].circa = Boolean(data[group].circa);
			}
			data[group].location = ensureLocationDetailsFromSummary(normalizeLocationData(raw[group]?.location, data[group].place));
			data[group].place = formatLocationSummary(data[group].location, "");
		}
		if (raw.photo && typeof raw.photo === "object") {
			data.photo.src = String(raw.photo.src || "");
			data.photo.alt = String(raw.photo.alt || "");
		}
		if (!GENDERS.some((g) => g.value === data.gender)) data.gender = "unknown";
		if (data.status !== "living" && data.status !== "deceased" && data.status !== "unknown") {
			const hasDeath = Boolean(String(data.death?.date || "").trim() || String(data.death?.place || "").trim());
			data.status = hasDeath ? "deceased" : "unknown";
		}
		return data;
	}

	function splitMarkupLines(el) {
		if (!el) return [];
		return (el.innerHTML || "")
			.split(/<br\s*\/?>/i)
			.map((part) => part.replace(/<[^>]+>/g, "").trim())
			.filter(Boolean);
	}

	function parseDatePlaceLines(lines) {
		if (!lines.length) {
			return { date: "", place: "" };
		}

		const firstDate = parseFriendlyToStored(lines[0]);
		if (firstDate) {
			return {
				date: firstDate,
				place: lines[1] ? String(lines[1]).trim() : "",
			};
		}

		if (lines.length === 1) {
			return { date: "", place: String(lines[0]).trim() };
		}

		return {
			date: "",
			place: String(lines[lines.length - 1]).trim(),
		};
	}

	function migrateFromMarkup(identityEl) {
		const data = emptyData();
		const text = (selector) => identityEl.querySelector(selector)?.textContent?.trim() || "";

		// table-name is the rendered public name (often composed from name parts),
		// not the explicit "Display name" field — leave displayName empty here.

		const gender = text("table-gender").toLowerCase();
		if (gender.startsWith("m")) data.gender = "male";
		else if (gender.startsWith("f")) data.gender = "female";

		const photoImg = identityEl.querySelector("table-photo img");
		if (photoImg) {
			data.photo.src = photoImg.getAttribute("src") || "";
			data.photo.alt = photoImg.getAttribute("alt") || "";
		}

		const birthParsed = parseDatePlaceLines(splitMarkupLines(identityEl.querySelector("table-birth")));
		data.birth.date = birthParsed.date;
		data.birth.place = birthParsed.place;

		const baptismParsed = parseDatePlaceLines(splitMarkupLines(identityEl.querySelector("table-baptism")));
		data.baptism.date = baptismParsed.date;
		data.baptism.place = baptismParsed.place;

		const deathLines = splitMarkupLines(identityEl.querySelector("table-death"));
		if (deathLines.length) {
			data.status = "deceased";
			const deathParsed = parseDatePlaceLines(deathLines.map((line) => line.replace(/\s*\(age[^)]*\)/i, "")));
			data.death.date = deathParsed.date;
			data.death.place = deathParsed.place;
			const causeLine = deathLines.find((line) => /^\(.*\)$/.test(line));
			if (causeLine) data.death.cause = causeLine.replace(/^\(|\)$/g, "").trim();
		}

		const burial = text("table-place-of-burial");
		if (burial) data.burial.place = burial;

		const occupation = text("table-occupation");
		if (occupation) data.occupation = occupation;

		const aka = text("table-aka");
		if (aka) data.alsoKnownAs = aka.split(",").map((v) => v.trim()).filter(Boolean);

		const residence = text("table-residence");
		if (residence) data.lastResidence = residence;

		data.lastResidenceLocation = ensureLocationDetailsFromSummary(normalizeLocationData(null, data.lastResidence));
		for (const group of ["birth", "baptism", "death", "burial"]) {
			data[group].location = ensureLocationDetailsFromSummary(normalizeLocationData(null, data[group].place));
			data[group].place = formatLocationSummary(data[group].location, "");
		}

		return data;
	}

	function canonicalizeInfoboxData(data) {
		const copy = normalizeData(data);
		const dateGroups = ["birth", "baptism", "death", "burial"];

		for (const group of dateGroups) {
			const entry = copy[group];
			if (!entry || typeof entry !== "object") continue;

			delete entry.dateTo;
			delete entry.circaTo;

			if (entry.precision === "between") {
				const parts = String(entry.date || "").split("|");
				entry.date = parts.map((part) => normalizeStoredDate(part.trim())).join("|");
			} else {
				entry.date = normalizeStoredDate(entry.date);
			}

			entry.location = ensureLocationDetailsFromSummary(normalizeLocationData(entry.location, entry.place));
			entry.place = formatLocationSummary(entry.location, "");
		}

		copy.lastResidenceLocation = ensureLocationDetailsFromSummary(normalizeLocationData(copy.lastResidenceLocation, copy.lastResidence));
		copy.lastResidence = formatLocationSummary(copy.lastResidenceLocation, "");
		copy.photo = {
			src: String(copy.photo?.src || "").trim(),
			alt: String(copy.photo?.alt || "").trim(),
		};
		copy.alsoKnownAs = [...(copy.alsoKnownAs || [])]
			.map((value) => String(value).trim())
			.filter(Boolean);

		return copy;
	}

	function displayNameFrom(data) {
		if (data.displayName.trim()) return data.displayName.trim();
		const surname = (data.lastName && data.lastName.trim()) ? data.lastName : data.birthSurname;
		return [data.title, data.firstName, data.middleName, surname, data.suffix]
			.map((p) => p.trim())
			.filter(Boolean)
			.join(" ");
	}

	function hasRequiredProfileName(data = {}) {
		return Boolean(String(data.firstName || "").trim() || String(data.lastName || "").trim());
	}

	function genderLabel(value) {
		return GENDERS.find((g) => g.value === value)?.label || "Unknown";
	}

	function buildFragment(data, familyHtml) {
		const rows = [];
		const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
		rows.push(`    <script type="application/json" class="profile-infobox-data">\n${json}\n    </${"script"}>`);

		if (data.photo.src.trim()) {
			rows.push(`    <table-photo><img src="${escapeHtml(data.photo.src.trim())}" alt="${escapeHtml(data.photo.alt.trim())}"></table-photo>`);
		}

		const name = displayNameFrom(data);
		if (name) rows.push(`    <table-name>${escapeHtml(name)}</table-name>`);

		if (data.alsoKnownAs.length) {
			rows.push(`    <table-aka>${escapeHtml(data.alsoKnownAs.join(", "))}</table-aka>`);
		}

		rows.push(`    <table-gender>${escapeHtml(genderLabel(data.gender))}</table-gender>`);

		if (data.occupation.trim()) {
			rows.push(`    <table-occupation>${escapeHtml(data.occupation.trim())}</table-occupation>`);
		}

		const datePlaceRow = (tag, group, extraLines = []) => {
			const lines = [];
			const dateText = friendlyDate(group.date, group);
			const placeText = formatLocationSummary(group.location, group.place);
			if (dateText) lines.push(escapeHtml(dateText));
			if (placeText) lines.push(escapeHtml(placeText));
			for (const extra of extraLines) {
				if (extra) lines.push(escapeHtml(extra));
			}
			if (!lines.length) return null;
			return `    <${tag}>${lines.join("<br>")}</${tag}>`;
		};

		const birthRow = datePlaceRow("table-birth", data.birth);
		if (birthRow) rows.push(birthRow);

		const baptismRow = datePlaceRow("table-baptism", data.baptism);
		if (baptismRow) rows.push(baptismRow);

		if (data.status === "deceased") {
			const causeLines = data.death.cause.trim() ? [`(${data.death.cause.trim()})`] : [];
			const deathRow = datePlaceRow("table-death", data.death, causeLines);
			if (deathRow) rows.push(deathRow);
		}

		const lastResidence = formatLocationSummary(data.lastResidenceLocation, data.lastResidence);
		if (lastResidence) {
			rows.push(`    <table-residence>${escapeHtml(lastResidence)}</table-residence>`);
		}

		const burialDate = friendlyDate(data.burial.date, data.burial);
		const burialPlace = formatLocationSummary(data.burial.location, data.burial.place);
		if (burialPlace || burialDate) {
			const verb = data.burial.type === "cremation" ? "Cremated" : "Buried";
			const pieces = [];
			if (burialPlace) pieces.push(escapeHtml(burialPlace));
			if (burialDate) pieces.push(`(${escapeHtml(burialDate)})`);
			rows.push(`    <table-place-of-burial>${data.burial.type === "cremation" ? `${verb}: ` : ""}${pieces.join(" ")}</table-place-of-burial>`);
		}

		if (familyHtml) {
			rows.push(`    ${familyHtml.trim()}`);
		}

		return `<!-- Profile identity table fragment -->\n<profile-identity>\n${rows.join("\n")}\n</profile-identity>\n`;
	}

	function parseIdentityElement(identityEl) {
		const dataScript = identityEl.querySelector("script.profile-infobox-data");
		if (dataScript) {
			try {
				return normalizeData(JSON.parse(dataScript.textContent || "{}"));
			} catch (error) {
				return migrateFromMarkup(identityEl);
			}
		}
		return migrateFromMarkup(identityEl);
	}

	function refreshIdentityElementsInDocument(doc) {
		if (!doc) return;

		doc.querySelectorAll("profile-identity").forEach((identity) => {
			if (identity.closest('aside[aria-label="Identity"]')) {
				return;
			}

			const familyHtml = identity.querySelector("table-immediate-family")?.outerHTML || "";
			const data = parseIdentityElement(identity);
			const html = buildFragment(data, familyHtml);
			const freshDoc = new DOMParser().parseFromString(html, "text/html");
			const freshIdentity = freshDoc.querySelector("profile-identity");
			if (!freshIdentity) return;

			identity.replaceWith(doc.importNode(freshIdentity, true));
		});
	}

	window.AppProfileInfobox = {
		MONTHS,
		GENDERS,
		LOCATION_DETAIL_FIELDS,
		escapeHtml,
		friendlyDate,
		parseFriendlyToStored,
		normalizeStoredDate,
		emptyLocationData,
		normalizeLocationData,
		hasLocationDetails,
		ensureLocationDetailsFromSummary,
		formatLocationSummary,
		emptyData,
		normalizeData,
		migrateFromMarkup,
		canonicalizeInfoboxData,
		displayNameFrom,
		hasRequiredProfileName,
		genderLabel,
		buildFragment,
		parseIdentityElement,
		refreshIdentityElementsInDocument,
	};
})();
