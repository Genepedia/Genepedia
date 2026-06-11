/**
 * <profile-infobox-editor person="<id>">
 *
 * A structured editor for a person's identity infobox (the table shown at the
 * top of their profile). It is the first tab of people/edit.html.
 *
 * Storage model: the structured values are kept as JSON inside
 * people/<id>/data/profile-table.html, embedded in a
 * <script type="application/json" class="profile-infobox-data"> element, next to
 * the rendered <table-*> rows used by the live page. The immediate-family block
 * is generated from the family tree, so it is preserved verbatim and never
 * edited here. Saving opens a pull request via github-submit-page-edit.php.
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

	const DATE_PRECISIONS = [
		{ value: "exact", label: "Exact" },
		{ value: "before", label: "Before" },
		{ value: "after", label: "After" },
		{ value: "between", label: "Between" },
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

	const DEATH_CAUSES_DATA_PATH = "data/death-causes.json";
	const DEATH_CAUSES_FALLBACK = [
		"Natural causes",
		"Heart attack",
		"Myocardial infarction",
		"Stroke",
		"Cancer",
		"Coronary thrombosis",
		"Cardiac arrest",
		"Pneumonia",
		"Respiratory failure",
		"Sepsis",
		"Accidental death",
		"Accident",
		"Homicide",
		"Suicide",
		"COVID-19",
		"Complications of surgery",
		"Kidney failure",
		"Liver failure",
		"Alzheimer's disease",
		"Old age",
		"Tuberculosis",
	];
	let deathCausesListPromise = null;

	const OCCUPATIONS_DATA_PATH = "data/occupations-onet-usa.json";
	const OCCUPATIONS_FALLBACK = [
		"Farmer",
		"Teacher",
		"Doctor",
		"Nurse",
		"Lawyer",
		"Engineer",
		"Clerk",
		"Blacksmith",
		"Carpenter",
		"Soldier",
		"Police officer",
		"Merchant",
		"Priest",
		"Laborer",
		"Tailor",
		"Seaman",
		"Cook",
		"Butcher",
		"Shopkeeper",
		"Artist",
		"Musician",
		"Accountant",
		"Civil servant",
		"Architect",
		"Mechanic",
		"Driver",
		"Photographer",
		"Writer",
		"Publisher",
		"Business owner",
	];
	let occupationsListPromise = null;

	function resolveOccupationsUrl() {
		return resolveSiteUrl(OCCUPATIONS_DATA_PATH);
	}

	function loadOccupationsList() {
		if (!occupationsListPromise) {
			occupationsListPromise = fetch(resolveOccupationsUrl(), { cache: "force-cache" })
				.then((response) => {
					if (!response.ok) {
						throw new Error(`Failed to load occupations list: ${response.status}`);
					}
					return response.json();
				})
				.then((payload) => {
					const occupations = Array.isArray(payload?.occupations) ? payload.occupations : [];
					if (occupations.length < 1000) {
						throw new Error(`Occupations list is too small (${occupations.length}).`);
					}
					return occupations;
				})
				.catch((error) => {
					console.warn("Using fallback occupations list", error);
					return OCCUPATIONS_FALLBACK;
				});
		}

		return occupationsListPromise;
	}

	function matchSuggestionList(items, query, limit = 8) {
		const trimmedQuery = String(query || "").trim();
		if (!trimmedQuery) {
			return items.slice(0, limit);
		}

		const low = trimmedQuery.toLocaleLowerCase("en-US");
		const startsWith = [];
		const includes = [];

		for (const item of items) {
			const value = String(item || "");
			const lowValue = value.toLocaleLowerCase("en-US");
			if (lowValue.startsWith(low)) {
				startsWith.push(value);
			} else if (lowValue.includes(low)) {
				includes.push(value);
			}
		}

		return [...startsWith, ...includes].slice(0, limit);
	}

	function loadDeathCausesList() {
		if (!deathCausesListPromise) {
			deathCausesListPromise = fetch(resolveSiteUrl(DEATH_CAUSES_DATA_PATH), { cache: "force-cache" })
				.then((response) => {
					if (!response.ok) {
						throw new Error(`Failed to load death causes list: ${response.status}`);
					}
					return response.json();
				})
				.then((payload) => {
					const causes = Array.isArray(payload?.causes) ? payload.causes : [];
					if (causes.length < 100) {
						throw new Error(`Death causes list is too small (${causes.length}).`);
					}
					return causes;
				})
				.catch((error) => {
					console.warn("Using fallback death causes list", error);
					return DEATH_CAUSES_FALLBACK;
				});
		}

		return deathCausesListPromise;
	}

	const LOCATION_SEARCH_MIN_QUERY_LENGTH = 2;
	const LOCATION_SEARCH_LIMIT = 6;

	function escapeHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[char]));
	}

	function resolveApiUrl(fileName) {
		const apiBase = String(
			window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "",
		).trim().replace(/\/+$/, "");
		if (!apiBase) return "";
		return new URL(fileName, `${apiBase}/`).href;
	}

	function fetchInit(init) {
		return window.App?.getGitHubFetchInit?.(init) || { credentials: "include", ...(init || {}) };
	}

	function resolveSiteUrl(path) {
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(path);
		return new URL(`../${String(path || "").replace(/^\/+/, "")}`, window.location.href).href;
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

	// Human-friendly rendering of a stored date, e.g. "c. June 17, 1890".
	function friendlyDate(value, opts = {}) {
		if (opts.precision === 'between' && typeof value === 'string' && value.includes('|')) {
			const parts = value.split('|').map(s => s.trim()).filter(Boolean);
			const left = parts[0] ? friendlyDate(parts[0], { precision: 'exact', circa: false }) : '';
			const right = parts[1] ? friendlyDate(parts[1], { precision: 'exact', circa: false }) : '';
			if (left && right) return `${left} and ${right}`;
			return left || right || '';
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

	// Best-effort reverse of friendlyDate for migrating legacy infobox HTML.
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

	function storedToDateInputValue(value) {
		return normalizeStoredDate(value);
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

			entry.location = normalizeLocationData(entry.location, entry.place);
			entry.place = formatLocationSummary(entry.location, entry.place);
		}

		copy.lastResidenceLocation = normalizeLocationData(copy.lastResidenceLocation, copy.lastResidence);
		copy.lastResidence = formatLocationSummary(copy.lastResidenceLocation, copy.lastResidence);
		copy.photo = {
			src: String(copy.photo?.src || "").trim(),
			alt: String(copy.photo?.alt || "").trim(),
		};
		copy.alsoKnownAs = [...(copy.alsoKnownAs || [])]
			.map((value) => String(value).trim())
			.filter(Boolean);

		return copy;
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

	function getPathValue(source, path) {
		return String(path || "")
			.split(".")
			.filter(Boolean)
			.reduce((value, key) => {
				if (!value || typeof value !== "object") return undefined;
				return value[key];
			}, source);
	}

	function setPathValue(target, path, value) {
		const parts = String(path || "").split(".").filter(Boolean);
		if (!parts.length) return;

		let current = target;
		for (let index = 0; index < parts.length - 1; index += 1) {
			const key = parts[index];
			if (!current[key] || typeof current[key] !== "object") {
				current[key] = {};
			}
			current = current[key];
		}

		current[parts[parts.length - 1]] = value;
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

	function renderDateInput(dataDate) {
		return `<span class="pie__date-input-wrap">
			<input type="date" data-date="${dataDate}" class="pie__date-input">
			<button type="button" class="pie__date-picker-button" aria-label="Choose date">
				<i class="bi bi-calendar3" aria-hidden="true"></i>
			</button>
		</span>`;
	}

	function renderDateRange(group) {
		return `<div class="pie__date-range">
			<div class="pie__date-range-row pie__date-range-row--from">
				${renderDateInput(`${group}.date`)}
				<label class="pie__circa"><input type="checkbox" data-date="${group}.circa"> Circa</label>
			</div>
			<div class="pie__date-range-row pie__date-range-row--divider">
				<span class="pie__date-and">and</span>
			</div>
			<div class="pie__date-range-row pie__date-range-row--to">
				${renderDateInput(`${group}.dateTo`)}
				<label class="pie__circa"><input type="checkbox" data-date="${group}.circaTo"> Circa</label>
			</div>
		</div>`;
	}

	function renderLocationField({ path, id, placeholder }) {
		const resultsId = `${id}-results`;
		const detailsId = `${id}-details`;
		const detailRows = LOCATION_DETAIL_FIELDS.map((field) => `
							<div class="pie__location-detail-row">
								<label class="pie__location-detail-label" for="${id}-${field.key}">${field.label}:</label>
								<input id="${id}-${field.key}" type="text" data-location-field="${path}.${field.key}">
							</div>`).join("");

		return `
					<div class="pie__field pie__field--location" data-location="${path}">
						<div class="pie__location-search-wrap">
							<input id="${id}" class="pie__location-search" type="search" data-location-search="${path}" placeholder="${placeholder}" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="false" aria-controls="${resultsId}">
							<ul class="pie__location-results" id="${resultsId}" role="listbox" hidden></ul>
						</div>
						<div class="pie__location-details" id="${detailsId}" hidden>${detailRows}
						</div>
						<button type="button" class="pie__location-toggle" data-location-toggle="${path}" aria-expanded="false" aria-controls="${detailsId}">
							<span class="pie__location-toggle-icon" aria-hidden="true">▾</span>
							<span>Show and Edit Location Details</span>
						</button>
					</div>`;
	}

	function createManualLocationMatch(query) {
		const trimmed = String(query || "").trim();
		if (!trimmed) return null;
		return {
			id: `manual:${trimmed.toLowerCase()}`,
			label: trimmed,
			type: "manual",
			location: {
				...normalizeLocationData(null, trimmed),
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

		const apiUrl = resolveApiUrl("location-search.php");
		if (!apiUrl) {
			return manualMatch ? [manualMatch] : [];
		}

		try {
			const url = new URL(apiUrl);
			url.searchParams.set("q", trimmed);
			url.searchParams.set("limit", String(LOCATION_SEARCH_LIMIT));
			if (navigator.language) {
				url.searchParams.set("accept_language", navigator.language);
			}

			const response = await fetch(url, {
				cache: "no-store",
				headers: { Accept: "application/json" },
				signal,
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok || !Array.isArray(payload.results)) {
				return manualMatch ? [manualMatch] : [];
			}

			const results = payload.results
				.map((result) => ({
					id: String(result.id || result.label || ""),
					label: String(result.label || "").trim(),
					type: String(result.type || "").trim(),
					location: normalizeLocationData(result.location, result.label || ""),
				}))
				.filter((result) => result.label || hasLocationDetails(result.location));

			if (manualMatch && !results.some((result) => result.label.toLowerCase() === manualMatch.label.toLowerCase())) {
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
			status: "deceased",
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

	// Merge a parsed object onto the default shape so missing keys are safe.
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
		data.lastResidenceLocation = normalizeLocationData(raw.lastResidenceLocation, data.lastResidence);
		data.lastResidence = formatLocationSummary(data.lastResidenceLocation, data.lastResidence);
		for (const group of ["birth", "baptism", "death", "burial"]) {
			if (raw[group] && typeof raw[group] === "object") {
				Object.assign(data[group], raw[group]);
				data[group].circa = Boolean(data[group].circa);
			}
			data[group].location = normalizeLocationData(raw[group]?.location, data[group].place);
			data[group].place = formatLocationSummary(data[group].location, data[group].place);
		}
		if (raw.photo && typeof raw.photo === "object") {
			data.photo.src = String(raw.photo.src || "");
			data.photo.alt = String(raw.photo.alt || "");
		}
		if (!GENDERS.some((g) => g.value === data.gender)) data.gender = "unknown";
		if (data.status !== "living" && data.status !== "deceased") data.status = "deceased";
		return data;
	}

	// Pull what we can out of an existing profile-table.html that predates the
	// structured editor, so the form is pre-filled on first use.
	function migrateFromMarkup(identityEl) {
		const data = emptyData();
		const text = (selector) => identityEl.querySelector(selector)?.textContent?.trim() || "";

		const name = text("table-name");
		if (name) data.displayName = name;

		const gender = text("table-gender").toLowerCase();
		if (gender.startsWith("m")) data.gender = "male";
		else if (gender.startsWith("f")) data.gender = "female";

		const photoImg = identityEl.querySelector("table-photo img");
		if (photoImg) {
			data.photo.src = photoImg.getAttribute("src") || "";
			data.photo.alt = photoImg.getAttribute("alt") || "";
		}

		const splitLines = (el) => {
			if (!el) return [];
			return (el.innerHTML || "")
				.split(/<br\s*\/?>/i)
				.map((part) => part.replace(/<[^>]+>/g, "").trim())
				.filter(Boolean);
		};

		const birthLines = splitLines(identityEl.querySelector("table-birth"));
		if (birthLines.length) {
			data.birth.date = parseFriendlyToStored(birthLines[0]);
			if (!data.birth.date && birthLines[0]) data.birth.place = birthLines[0];
			if (birthLines[1]) data.birth.place = birthLines[1];
		}

		const deathLines = splitLines(identityEl.querySelector("table-death"));
		if (deathLines.length) {
			data.death.date = parseFriendlyToStored(deathLines[0].replace(/\s*\(age[^)]*\)/i, ""));
			if (deathLines[1]) data.death.place = deathLines[1];
			const causeLine = deathLines.find((l) => /^\(.*\)$/.test(l));
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

		data.lastResidenceLocation = normalizeLocationData(null, data.lastResidence);
		for (const group of ["birth", "baptism", "death", "burial"]) {
			data[group].location = normalizeLocationData(null, data[group].place);
			data[group].place = formatLocationSummary(data[group].location, data[group].place);
		}

		return data;
	}

	function displayNameFrom(data) {
		if (data.displayName.trim()) return data.displayName.trim();
		const surname = (data.lastName && data.lastName.trim()) ? data.lastName : data.birthSurname;
		return [data.title, data.firstName, data.middleName, surname, data.suffix]
			.map((p) => p.trim())
			.filter(Boolean)
			.join(" ");
	}

	function genderLabel(value) {
		return GENDERS.find((g) => g.value === value)?.label || "Unknown";
	}

	// Build the profile-table.html fragment from structured data, keeping the
	// tree-derived immediate-family block verbatim.
	function buildFragment(data, familyHtml) {
		const rows = [];
		// Escape "<" so a value can never close the <script> early; < is a
		// valid JSON escape, so JSON.parse round-trips it cleanly on load.
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

	const TEMPLATE = `
		<form class="pie" autocomplete="off">
			<div class="pie__status" role="status" hidden></div>



			<fieldset class="pie__group">
				<legend class="pie__legend">Name</legend>
				<div class="pie__row">
					<label class="pie__label" for="pie-title">Title</label>
					<div class="pie__field"><input id="pie-title" type="text" data-field="title" placeholder="Title"></div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-first">Name</label>
					<div class="pie__field pie__field--split">
						<input id="pie-first" type="text" data-field="firstName" placeholder="First Name">
						<input id="pie-middle" type="text" data-field="middleName" placeholder="Middle Name">
					</div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-last">Last name</label>
					<div class="pie__field pie__field--split">
						<input id="pie-last" type="text" data-field="lastName" placeholder="Last Name">
						<input id="pie-suffix" type="text" data-field="suffix" placeholder="Suffix">
					</div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-birth-surname">Birth surname</label>
					<div class="pie__field"><input id="pie-birth-surname" type="text" data-field="birthSurname" placeholder="Birth Surname"></div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-display">Display name</label>
					<div class="pie__field"><input id="pie-display" type="text" data-field="displayName" placeholder="First Name Last Name (Birth Surname)"></div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-aka">Also known as</label>
					<div class="pie__field"><input id="pie-aka" type="text" data-field="alsoKnownAs" placeholder="Separate nicknames with a comma"></div>
				</div>
			</fieldset>

			<fieldset class="pie__group">
				<legend class="pie__legend">Vital details</legend>
				<div class="pie__row">
					<span class="pie__label">Status</span>
					<div class="pie__field pie__field--radios" data-radio="status">
						<label><input type="radio" name="pie-status" value="living"> Living</label>
						<label><input type="radio" name="pie-status" value="deceased"> Deceased</label>
					</div>
				</div>
				<div class="pie__row">
					<span class="pie__label">Gender</span>
					<div class="pie__field pie__field--radios" data-radio="gender">
						<label><input type="radio" name="pie-gender" value="male"> Male</label>
						<label><input type="radio" name="pie-gender" value="female"> Female</label>
						<label><input type="radio" name="pie-gender" value="unknown"> Unknown</label>
					</div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-occupation">Occupation</label>
					<div class="pie__field"><input id="pie-occupation" type="text" data-field="occupation" placeholder="e.g. Teacher"></div>
				</div>
				<div class="pie__row pie__row--location">
					<label class="pie__label" for="pie-residence">Last residence</label>
					${renderLocationField({ path: "lastResidenceLocation", id: "pie-residence", placeholder: "Start typing a location" })}
				</div>
			</fieldset>

			<fieldset class="pie__group" data-event="birth">
				<legend class="pie__legend">Birth</legend>
				<div class="pie__row pie__row--date">
					<span class="pie__label">Date of birth</span>
					<div class="pie__field pie__field--date">
						<select data-date="birth.precision"></select>
						${renderDateRange("birth")}
						<span class="pie__date-preview" data-preview="birth"></span>
					</div>
				</div>
				<div class="pie__row pie__row--location">
					<label class="pie__label" for="pie-birth-place">Place of birth</label>
					${renderLocationField({ path: "birth.location", id: "pie-birth-place", placeholder: "Start typing a location" })}
				</div>

			</fieldset>

			<fieldset class="pie__group" data-event="baptism">
				<legend class="pie__legend">Baptism</legend>
				<div class="pie__row pie__row--date">
					<span class="pie__label">Date of baptism</span>
					<div class="pie__field pie__field--date">
						<select data-date="baptism.precision"></select>
						${renderDateRange("baptism")}
						<span class="pie__date-preview" data-preview="baptism"></span>
					</div>
				</div>
				<div class="pie__row pie__row--location">
					<label class="pie__label" for="pie-baptism-place">Place of baptism</label>
					${renderLocationField({ path: "baptism.location", id: "pie-baptism-place", placeholder: "Start typing a location" })}
				</div>
			</fieldset>

			<fieldset class="pie__group pie__group--death" data-event="death">
				<legend class="pie__legend">Death</legend>
				<div class="pie__row pie__row--date">
					<span class="pie__label">Date of death</span>
					<div class="pie__field pie__field--date">
						<select data-date="death.precision"></select>
						${renderDateRange("death")}
						<span class="pie__date-preview" data-preview="death"></span>
					</div>
				</div>
				<div class="pie__row pie__row--location">
					<label class="pie__label" for="pie-death-place">Place of death</label>
					${renderLocationField({ path: "death.location", id: "pie-death-place", placeholder: "Start typing a location" })}
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-death-cause">Cause of death</label>
					<div class="pie__field"><input id="pie-death-cause" type="text" data-field="death.cause" placeholder="e.g. Coronary thrombosis"></div>
				</div>
			</fieldset>

			<fieldset class="pie__group pie__group--death" data-event="burial">
				<legend class="pie__legend">Burial or cremation</legend>
				<div class="pie__row">
					<span class="pie__label">Type</span>
					<div class="pie__field pie__field--radios" data-radio="burial.type">
						<label><input type="radio" name="pie-burial-type" value="burial"> Burial</label>
						<label><input type="radio" name="pie-burial-type" value="cremation"> Cremation</label>
					</div>
				</div>
				<div class="pie__row pie__row--date">
					<span class="pie__label">Date</span>
					<div class="pie__field pie__field--date">
						<select data-date="burial.precision"></select>
						${renderDateRange("burial")}
						<span class="pie__date-preview" data-preview="burial"></span>
					</div>
				</div>
				<div class="pie__row pie__row--location">
					<label class="pie__label" for="pie-burial-place">Place</label>
					${renderLocationField({ path: "burial.location", id: "pie-burial-place", placeholder: "Start typing a location" })}
				</div>
			</fieldset>

			<fieldset class="pie__group pie__group--photo">
				<legend class="pie__legend">Photo</legend>
				<input id="pie-photo-src" type="hidden" data-field="photo.src">
				<div class="pie__photo-preview-wrap" id="pie-photo-preview-wrap" hidden>
					<img id="pie-photo-preview-img" class="pie__photo-preview-img" alt="">
				</div>
				<div class="pie__photo-empty" id="pie-photo-empty">
					<i class="bi bi-image pie__photo-empty-icon" aria-hidden="true"></i>
					<p class="pie__photo-empty-text">No photo selected</p>
				</div>
				<div class="pie__photo-actions">
					<input id="pie-photo-file" type="file" accept="image/*" hidden>
					<button type="button" class="page-editor__button" data-photo-upload>
						<i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
						<span>Upload photo</span>
					</button>
					<button type="button" class="page-editor__button" data-photo-choose>
						<i class="bi bi-images" aria-hidden="true"></i>
						<span>Choose from media</span>
					</button>
					<button type="button" class="page-editor__button page-editor__button--small page-editor__sidebar-delete" data-photo-remove hidden>
						<i class="bi bi-trash" aria-hidden="true"></i>
						<span>Remove photo</span>
					</button>
				</div>
				<div class="pie__media-modal" hidden aria-hidden="true">
					<div class="pie__media-modal-backdrop" data-media-modal-close></div>
					<div class="pie__media-modal-panel">
						<header class="pie__media-modal-header">
							<h2>Choose an image</h2>
							<button type="button" class="pie__media-modal-close" aria-label="Close" data-media-modal-close>✕</button>
						</header>
						<div class="pie__media-modal-body">
							<p class="pie__media-modal-status">Loading images…</p>
							<div class="pie__media-grid"></div>
						</div>
					</div>
				</div>
			</fieldset>
		</form>
	`;

	class ProfileInfoboxEditor extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;

			this.__personId = (this.getAttribute("person")
				|| new URLSearchParams(window.location.search).get("person")
				|| "").trim();
			this.__familyHtml = "";
			this.__data = emptyData();
			this.__locationFields = new Map();
			this.__savedSnapshot = "";
			this.__establishingBaseline = false;
			this.__gedcomExists = false;

			this.innerHTML = TEMPLATE;
			this.#populateSelects();
			this.#bind();
			this.#buildSectionNav();
			void loadOccupationsList();
			void loadDeathCausesList();

			// Register a provider so the page editor can collect this infobox
			// fragment and include it in the same PR when the global Save is used.
			if (!Array.isArray(window.__extraPublishFileProviders)) window.__extraPublishFileProviders = [];
			this.__extraPublishProvider = async () => {
				try {
					return this.#buildInfoboxPublishFiles();
				} catch (err) {
					console.warn('Error building infobox publish file', err);
					return [];
				}
			};
			window.__extraPublishFileProviders.push(this.__extraPublishProvider);

			if (!Array.isArray(window.__extraDirtyStateProviders)) window.__extraDirtyStateProviders = [];
			this.__dirtyStateProvider = () => this.#isDirty();
			window.__extraDirtyStateProviders.push(this.__dirtyStateProvider);

			if (!Array.isArray(window.__extraDirtyStateResetCallbacks)) window.__extraDirtyStateResetCallbacks = [];
			this.__dirtyStateReset = () => this.#setSavedBaseline({ quiet: true });
			window.__extraDirtyStateResetCallbacks.push(this.__dirtyStateReset);

			if (!/^[a-zA-Z0-9_-]{1,64}$/.test(this.__personId)) {
				this.#setStatus("No valid profile id was provided.", "error");
				return;
			}

			this.#loadExisting();
		}

		#els() {
			return {
				form: this.querySelector(".pie"),
				status: this.querySelector(".pie__status"),
				save: this.querySelector(".pie__save"),
			};
		}

		#setStatus(message, type = "info") {
			const { status } = this.#els();
			if (!status) return;
			status.textContent = message || "";
			status.dataset.type = type;
			status.hidden = !message;
		}

		#populateSelects() {
			this.querySelectorAll('select[data-date$=".precision"]').forEach((select) => {
				select.innerHTML = DATE_PRECISIONS
					.map((p) => `<option value="${p.value}">${p.label}</option>`)
					.join("");
			});
		}

		#openDatePicker(input) {
			if (!input || input.disabled) {
				return;
			}

			input.focus({ preventScroll: true });

			try {
				if (typeof input.showPicker === "function") {
					input.showPicker();
				}
			} catch (error) {
				// Some browsers block showPicker outside a direct user gesture.
			}
		}

		#bindDatePickers() {
			this.querySelectorAll(".pie__date-input-wrap").forEach((wrap) => {
				const input = wrap.querySelector(".pie__date-input");
				const button = wrap.querySelector(".pie__date-picker-button");
				if (!input || input.dataset.pieDatePickerBound === "true") {
					return;
				}

				input.dataset.pieDatePickerBound = "true";

				input.addEventListener("click", () => {
					this.#openDatePicker(input);
				});

				button?.addEventListener("click", (event) => {
					event.preventDefault();
					this.#openDatePicker(input);
				});
			});
		}

		#bind() {
			const { form } = this.#els();
			if (!form) return;
			this.#bindLocationFields();
			this.#bindCauseSuggestionFields();
			this.#bindOccupationSuggestionFields();
			this.#bindPhotoFields();
			this.#bindDatePickers();

			form.addEventListener("submit", (event) => {
				event.preventDefault();
				const globalSave = document.querySelector('.page-editor__button--save[data-action="publish"]');
				if (globalSave) {
					globalSave.click();
				} else {
					void this.#save();
				}
			});

			form.addEventListener("input", (event) => {
				const target = event.target;
				if (target?.matches?.('[data-date^="birth"],[data-date^="baptism"],[data-date^="death"],[data-date^="burial"]')) {
					this.#updatePreviews();
				}
				if (target?.matches?.('[data-field="title"],[data-field="firstName"],[data-field="middleName"],[data-field="lastName"],[data-field="birthSurname"],[data-field="suffix"],[data-field="displayName"]')) {
					this.#syncPageTitle();
				}
			});
			form.addEventListener("change", (event) => {
				const target = event.target;
				if (target?.matches?.('[data-date$=".precision"]')) this.#updateDateVisibility();
				if (target?.matches?.('[data-date]')) this.#updatePreviews();
			});

			const notifyDirty = () => {
				if (this.__establishingBaseline) {
					return;
				}
				this.#notifyDirtyState();
			};
			form.addEventListener("input", notifyDirty, true);
			form.addEventListener("change", notifyDirty, true);
		}

		// Build a sticky quick-nav from the fieldset legends so editors can jump
		// straight to a section (Name, Birth, Death, Photo, …) on this long form
		// instead of scrolling. The active chip is kept in sync as you scroll.
		#buildSectionNav() {
			const { form } = this.#els();
			if (!form) return;

			const groups = Array.from(form.querySelectorAll(".pie__group"));
			if (groups.length < 2) return;

			const nav = document.createElement("nav");
			nav.className = "pie__section-nav";
			nav.setAttribute("aria-label", "Infobox sections");

			const links = new Map();
			groups.forEach((group, index) => {
				if (!group.id) group.id = `pie-section-${index}`;
				const legend = group.querySelector(".pie__legend");
				const label = (legend?.textContent || `Section ${index + 1}`).trim();

				const link = document.createElement("button");
				link.type = "button";
				link.className = "pie__section-nav-link";
				link.textContent = label;
				link.dataset.target = group.id;
				link.addEventListener("click", () => {
					group.scrollIntoView({ behavior: "smooth", block: "start" });
					this.#setActiveSection(group.id);
				});
				nav.appendChild(link);
				links.set(group.id, link);
			});

			form.insertBefore(nav, groups[0]);
			this.__sectionLinks = links;
			this.#setActiveSection(groups[0].id);

			// Highlight whichever section is nearest the top as the editor scrolls.
			if (typeof IntersectionObserver === "function") {
				this.__sectionObserver?.disconnect();
				this.__sectionObserver = new IntersectionObserver(
					(entries) => {
						const visible = entries
							.filter((entry) => entry.isIntersecting)
							.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
						if (visible?.target?.id) {
							this.#setActiveSection(visible.target.id);
						}
					},
					{ rootMargin: "-45% 0px -50% 0px", threshold: 0 },
				);
				groups.forEach((group) => this.__sectionObserver.observe(group));
			}
		}

		#setActiveSection(id) {
			if (!this.__sectionLinks) return;
			this.__sectionLinks.forEach((link, linkId) => {
				link.classList.toggle("is-active", linkId === id);
			});
		}

		// The profile's page title (its <h1>) is the display name, shown read-only
		// in the editor header. Keep it in step with the infobox as the name fields
		// change so what saves to profile.html always matches the infobox. Falls
		// back to "First [Middle] Last (Birth Surname) Suffix" when no explicit
		// display name is set (see displayNameFrom).
		#syncPageTitle() {
			const titleInput = document.querySelector(".page-editor__title-input");
			if (!titleInput) return;
			const name = displayNameFrom(this.#collect());
			if (!name || titleInput.value === name) return;
			titleInput.value = name;
			titleInput.dispatchEvent(new Event("input", { bubbles: true }));
		}

		#snapshotFormState() {
			try {
				return JSON.stringify(canonicalizeInfoboxData(this.#collect()));
			} catch (error) {
				return "";
			}
		}

		#setSavedBaseline({ quiet = false } = {}) {
			this.__establishingBaseline = true;
			this.__suppressDirty = false;
			this.__savedSnapshot = this.#snapshotFormState();
			try {
				this.__data = normalizeData(JSON.parse(this.__savedSnapshot || "{}"));
			} catch (error) {
				this.__data = this.#collect();
			}
			this.__establishingBaseline = false;
			if (!quiet) {
				this.#notifyDirtyState();
			}
		}

		#isDirty() {
			if (this.__suppressDirty || this.__establishingBaseline) {
				return false;
			}
			if (!this.__savedSnapshot) {
				return false;
			}
			return this.#snapshotFormState() !== this.__savedSnapshot;
		}

		discardUnsavedChanges() {
			this.__suppressDirty = true;
			this.#notifyDirtyState();
		}

		#notifyDirtyState() {
			const editor = document.querySelector("page-editor");
			if (editor && typeof editor.refreshDirtyState === "function") {
				editor.refreshDirtyState();
			}
		}

		#buildStarterGedcom(data) {
			const starter = window.AppGedcomStarter;
			if (!starter?.buildProfileGedcomFromInfoboxData) {
				return "";
			}
			return starter.buildProfileGedcomFromInfoboxData(this.__personId, data);
		}

		#buildInfoboxPublishFiles(data = null) {
			const collected = data || this.#collect();
			const fragment = buildFragment(collected, this.__familyHtml);
			const files = [{
				path: `people/${this.__personId}/data/profile-table.html`,
				content: fragment,
			}];

			if (!this.__gedcomExists) {
				const gedcom = this.#buildStarterGedcom(collected);
				if (gedcom) {
					files.push({
						path: `people/${this.__personId}/data/family-tree.ged`,
						content: gedcom,
					});
				}
			}

			return files;
		}

		async #checkGedcomExists() {
			try {
				const url = resolveSiteUrl(`people/${this.__personId}/data/family-tree.ged`);
				const response = await fetch(url, { cache: "no-store" });
				this.__gedcomExists = response.ok;
			} catch (error) {
				this.__gedcomExists = false;
			}
		}

		async #loadExisting() {
			this.#setStatus("Loading…");
			await this.#checkGedcomExists();
			try {
				const url = resolveSiteUrl(`people/${this.__personId}/data/profile-table.html`);
				const response = await fetch(url, { cache: "no-store" });
				if (response.ok) {
					const html = await response.text();
					const doc = new DOMParser().parseFromString(html, "text/html");
					const identity = doc.querySelector("profile-identity");
					if (identity) {
						const family = identity.querySelector("table-immediate-family");
						if (family) this.__familyHtml = family.outerHTML;

						const dataScript = identity.querySelector("script.profile-infobox-data");
						if (dataScript) {
							try {
								this.__data = normalizeData(JSON.parse(dataScript.textContent || "{}"));
							} catch (error) {
								this.__data = migrateFromMarkup(identity);
							}
						} else {
							this.__data = migrateFromMarkup(identity);
						}
					}
				}
			} catch (error) {
				console.warn("Could not load existing infobox", error);
			}

			this.#fillForm();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.#setSavedBaseline({ quiet: true });
					this.#notifyDirtyState();
					this.#setStatus("");
				});
			});
		}

		disconnectedCallback() {
			this.__sectionObserver?.disconnect();
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

		#fillForm() {
			const data = this.__data;

			this.querySelectorAll("[data-field]").forEach((input) => {
				const key = input.dataset.field;
				if (key === "alsoKnownAs") {
					input.value = data.alsoKnownAs.join(", ");
				} else {
					input.value = getPathValue(data, key) ?? "";
				}
			});

			this.querySelectorAll("[data-date]").forEach((input) => {
				const value = getPathValue(data, input.dataset.date);
				if (input.type === "checkbox") input.checked = Boolean(value);
				else if (input.type === "date") input.value = storedToDateInputValue(value);
				else input.value = value ?? "";
			});

			this.#fillLocationFields();

			this.#setRadio("status", data.status);
			this.#setRadio("gender", data.gender);
			this.#setRadio("burial.type", data.burial.type);
			this.#syncPhotoUi();

			// If any group uses the 'between' precision, populate the secondary
			// date input (dateTo) from the stored value which may be encoded as
			// "start|end". Also ensure circa flags for the second input reflect
			// existing stored circa where appropriate.
			["birth", "baptism", "death", "burial"].forEach((group) => {
				const precision = getPathValue(data, `${group}.precision`) || "exact";
				if (precision === "between") {
					const raw = String(getPathValue(data, `${group}.date`) || "").trim();
					const parts = raw.includes("|") ? raw.split("|") : [raw, ""];
					const from = parts[0] ? parts[0].trim() : "";
					const to = parts[1] ? parts[1].trim() : "";
					const fromInput = this.querySelector(`[data-date="${group}.date"]`);
					const toInput = this.querySelector(`[data-date="${group}.dateTo"]`);
					if (fromInput) fromInput.value = storedToDateInputValue(from);
					if (toInput) toInput.value = storedToDateInputValue(to);
					// Mirror existing single circa flag into the secondary circa checkbox
					const circa = Boolean(getPathValue(data, `${group}.circa`));
					const toCirca = this.querySelector(`[data-date="${group}.circaTo"]`);
					if (toCirca) toCirca.checked = circa;
				}
			});

			this.#updateDateVisibility();
			this.#updatePreviews();
		}

		#setRadio(name, value) {
			const container = this.querySelector(`[data-radio="${name}"]`);
			if (!container) return;
			container.querySelectorAll('input[type="radio"]').forEach((radio) => {
				radio.checked = radio.value === value;
			});
		}

		#getRadio(name) {
			const container = this.querySelector(`[data-radio="${name}"]`);
			return container?.querySelector('input[type="radio"]:checked')?.value || "";
		}

		#updatePreviews() {
			["birth", "baptism", "death", "burial"].forEach((group) => {
				const preview = this.querySelector(`[data-preview="${group}"]`);
				if (!preview) return;
				const precision = this.querySelector(`[data-date="${group}.precision"]`)?.value || "exact";
				if (precision === "between") {
					const from = this.querySelector(`[data-date="${group}.date"]`)?.value || "";
					const to = this.querySelector(`[data-date="${group}.dateTo"]`)?.value || "";
					const circaFrom = this.querySelector(`[data-date="${group}.circa"]`)?.checked || false;
					const circaTo = this.querySelector(`[data-date="${group}.circaTo"]`)?.checked || false;
					const a = from ? friendlyDate(from, { precision: 'exact', circa: circaFrom }) : "";
					const b = to ? friendlyDate(to, { precision: 'exact', circa: circaTo }) : "";
					preview.textContent = a && b ? `${a} and ${b}` : (a || b || "");
					return;
				}
				const date = this.querySelector(`[data-date="${group}.date"]`)?.value || "";
				const circa = this.querySelector(`[data-date="${group}.circa"]`)?.checked || false;
				preview.textContent = date ? friendlyDate(date, { precision, circa }) : "";
			});
		}

		#updateDateVisibility() {
			["birth", "baptism", "death", "burial"].forEach((group) => {
				const select = this.querySelector(`[data-date="${group}.precision"]`);
				const field = select ? select.closest('.pie__field--date') : null;
				if (!select || !field) return;
				const isBetween = select.value === 'between';
				field.classList.toggle('is-between', isBetween);
			});
		}

		#bindLocationFields() {
			this.__locationFields = new Map();
			this.querySelectorAll("[data-location]").forEach((root) => {
				const path = String(root.getAttribute("data-location") || "").trim();
				if (!path) return;

				const state = {
					path,
					root,
					searchInput: root.querySelector(`[data-location-search="${path}"]`),
					dropdown: root.querySelector(".pie__location-results"),
					details: root.querySelector(".pie__location-details"),
					toggle: root.querySelector(`[data-location-toggle="${path}"]`),
					matches: [],
					activeIndex: -1,
					debounceTimer: 0,
					abortController: null,
				};
				this.__locationFields.set(path, state);
				this.#setLocationDetailsExpanded(path, false);

				state.searchInput?.addEventListener("input", () => {
					this.#scheduleLocationSearch(path);
				});

				state.searchInput?.addEventListener("focus", () => {
					if (state.searchInput.value.trim()) {
						this.#scheduleLocationSearch(path);
					}
				});

				state.searchInput?.addEventListener("blur", () => {
					window.setTimeout(() => this.#closeLocationDropdown(path), 120);
				});

				state.searchInput?.addEventListener("keydown", (event) => {
					this.#handleLocationKeydown(path, event);
				});

				state.dropdown?.addEventListener("mousedown", (event) => {
					event.preventDefault();
				});

				state.dropdown?.addEventListener("click", (event) => {
					const option = event.target.closest("[data-location-result-index]");
					if (!option) return;
					const index = Number(option.dataset.locationResultIndex);
					const match = state.matches[index];
					if (!match) return;
					this.#selectLocationMatch(path, match);
				});

				root.querySelectorAll("[data-location-field]").forEach((input) => {
					input.addEventListener("input", () => {
						this.#setLocationDetailsExpanded(path, true);
						this.#syncLocationSearchFromDetails(path);
					});
				});

				state.toggle?.addEventListener("click", () => {
					const nextExpanded = state.details ? state.details.hidden : false;
					this.#setLocationDetailsExpanded(path, nextExpanded);
					if (nextExpanded) {
						state.details?.querySelector("input")?.focus();
					}
				});
			});

			if (!this.__locationDocumentClickHandler) {
				this.__locationDocumentClickHandler = (event) => {
					this.__locationFields?.forEach((state) => {
						if (!state.root.contains(event.target)) {
							this.#closeLocationDropdown(state.path);
						}
					});
				};
				document.addEventListener("click", this.__locationDocumentClickHandler);
			}
		}

		#fillLocationFields() {
			this.#applyLocationValue("lastResidenceLocation", this.__data.lastResidenceLocation);
			this.#applyLocationValue("birth.location", this.__data.birth.location);
			this.#applyLocationValue("baptism.location", this.__data.baptism.location);
			this.#applyLocationValue("death.location", this.__data.death.location);
			this.#applyLocationValue("burial.location", this.__data.burial.location);
		}

		#applyLocationValue(path, value, { expanded = null } = {}) {
			const state = this.__locationFields?.get(path);
			if (!state) return;

			const location = normalizeLocationData(value);
			if (state.searchInput) {
				state.searchInput.value = formatLocationSummary(location, location.label);
			}

			state.root.querySelectorAll("[data-location-field]").forEach((input) => {
				const fullPath = String(input.dataset.locationField || "");
				const key = fullPath.startsWith(`${path}.`) ? fullPath.slice(path.length + 1) : fullPath;
				input.value = location[key] ?? "";
			});

			this.#setLocationDetailsExpanded(path, expanded == null ? hasLocationDetails(location) : expanded);
			this.#closeLocationDropdown(path);
		}

		#collectLocationValue(path) {
			const state = this.__locationFields?.get(path);
			const location = emptyLocationData();
			if (!state) return location;

			location.label = state.searchInput?.value.trim() || "";
			state.root.querySelectorAll("[data-location-field]").forEach((input) => {
				const fullPath = String(input.dataset.locationField || "");
				const key = fullPath.startsWith(`${path}.`) ? fullPath.slice(path.length + 1) : fullPath;
				if (Object.prototype.hasOwnProperty.call(location, key)) {
					location[key] = input.value.trim();
				}
			});

			if (!location.label) {
				location.label = formatLocationSummary(location, "");
			}
			if (!location.placeName && !hasLocationDetails(location) && location.label) {
				location.placeName = location.label;
			}

			return normalizeLocationData(location, location.label);
		}

		#collectLocationFields(data) {
			data.lastResidenceLocation = this.#collectLocationValue("lastResidenceLocation");
			data.lastResidence = formatLocationSummary(data.lastResidenceLocation, data.lastResidenceLocation.label);

			["birth", "baptism", "death", "burial"].forEach((group) => {
				const location = this.#collectLocationValue(`${group}.location`);
				data[group].location = location;
				data[group].place = formatLocationSummary(location, location.label);
			});
		}

		#syncLocationSearchFromDetails(path) {
			const state = this.__locationFields?.get(path);
			if (!state?.searchInput) return;

			const location = this.#collectLocationValue(path);
			const summary = formatLocationSummary(location, state.searchInput.value);
			if (summary) {
				state.searchInput.value = summary;
			}
		}

		#setLocationDetailsExpanded(path, expanded) {
			const state = this.__locationFields?.get(path);
			if (!state) return;

			if (state.details) {
				state.details.hidden = !expanded;
			}
			state.toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
			const icon = state.toggle?.querySelector(".pie__location-toggle-icon");
			if (icon) {
				icon.textContent = expanded ? "▴" : "▾";
			}
		}

		#closeLocationDropdown(path) {
			const state = this.__locationFields?.get(path);
			if (!state?.dropdown) return;

			state.dropdown.hidden = true;
			state.activeIndex = -1;
			state.searchInput?.setAttribute("aria-expanded", "false");
		}

		/* ------------------------------------------------------------------ */
		/* Cause-of-death suggestions                                            */
		/* ------------------------------------------------------------------ */

		#bindCauseSuggestionFields() {
			this.__causeSuggest = this.__causeSuggest || null;
			const input = this.querySelector('[data-field="death.cause"]');
			if (!input) return;
			const container = input.closest('.pie__field') || input.parentElement;
			if (!container) return;
			container.classList.add('pie__field--suggest');
			let dropdown = container.querySelector('.pie__suggestions');
			if (!dropdown) {
				dropdown = document.createElement('div');
				dropdown.className = 'pie__suggestions';
				dropdown.hidden = true;
				container.append(dropdown);
			}

			const state = {
				input,
				container,
				dropdown,
				matches: [],
				activeIndex: -1,
				debounceTimer: 0,
			};
			this.__causeSuggest = state;

			input.addEventListener('input', () => {
				window.clearTimeout(state.debounceTimer);
				state.debounceTimer = window.setTimeout(() => {
					void this.#runCauseSearch();
				}, 160);
			});

			input.addEventListener('focus', () => {
				void this.#runCauseSearch();
			});

			input.addEventListener('blur', () => {
				window.setTimeout(() => this.#closeCauseSuggestions(), 120);
			});

			input.addEventListener('keydown', (ev) => this.#handleCauseKeydown(ev));

			dropdown.addEventListener('mousedown', (ev) => ev.preventDefault());
			dropdown.addEventListener('click', (ev) => {
				const btn = ev.target.closest('[data-suggest-index]');
				if (!btn) return;
				const idx = Number(btn.dataset.suggestIndex);
				const match = state.matches[idx];
				if (match) this.#selectCauseSuggestion(match);
			});
		}

		async #runCauseSearch() {
			const state = this.__causeSuggest;
			if (!state || !state.input) return;
			const causes = await loadDeathCausesList();
			const requestId = (state.searchRequestId = (state.searchRequestId || 0) + 1);
			const q = String(state.input.value || "").trim();
			const matches = matchSuggestionList(causes, q, 8);
			if (requestId !== state.searchRequestId) {
				return;
			}
			state.matches = matches;
			this.#renderCauseSuggestions();
		}

		#renderCauseSuggestions() {
			const state = this.__causeSuggest;
			if (!state || !state.dropdown) return;
			state.dropdown.textContent = '';
			state.activeIndex = -1;
			if (!state.matches || !state.matches.length) {
				state.dropdown.hidden = true;
				return;
			}
			for (let i = 0; i < state.matches.length; i++) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'pie__suggestion-button';
				btn.dataset.suggestIndex = String(i);
				btn.setAttribute('role', 'option');
				btn.innerHTML = escapeHtml(state.matches[i]);
				state.dropdown.append(btn);
			}
			state.dropdown.hidden = false;
			this.#setActiveCauseSuggestion(0);
		}

		#setActiveCauseSuggestion(index) {
			const state = this.__causeSuggest;
			if (!state || !state.dropdown) return null;
			const buttons = [...state.dropdown.querySelectorAll('[data-suggest-index]')];
			buttons.forEach((b, idx) => {
				b.classList.toggle('is-active', idx === index);
				b.setAttribute('aria-selected', idx === index ? 'true' : 'false');
			});
			state.activeIndex = index;
			return buttons[index] || null;
		}

		#handleCauseKeydown(event) {
			const state = this.__causeSuggest;
			if (!state || !state.dropdown) return;
			const options = [...state.dropdown.querySelectorAll('[data-suggest-index]')];
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				if (!options.length) return;
				const next = Math.min(state.activeIndex + 1, options.length - 1);
				this.#setActiveCauseSuggestion(next)?.scrollIntoView({ block: 'nearest' });
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				if (!options.length) return;
				const prev = Math.max(state.activeIndex - 1, 0);
				this.#setActiveCauseSuggestion(prev)?.scrollIntoView({ block: 'nearest' });
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				const idx = state.activeIndex >= 0 ? state.activeIndex : 0;
				const match = state.matches[idx];
				if (match) this.#selectCauseSuggestion(match);
				return;
			}
			if (event.key === 'Escape') {
				this.#closeCauseSuggestions();
				return;
			}
		}

		#selectCauseSuggestion(match) {
			const state = this.__causeSuggest;
			if (!state) return;
			state.input.value = String(match);
			state.input.dispatchEvent(new Event('input', { bubbles: true }));
			this.#closeCauseSuggestions();
			state.input.focus();
		}

		#closeCauseSuggestions() {
			const state = this.__causeSuggest;
			if (!state || !state.dropdown) return;
			state.dropdown.hidden = true;
			state.activeIndex = -1;
			state.matches = [];
			state.dropdown.textContent = '';
		}

		/* ------------------------------------------------------------------ */
		/* Occupation suggestions                                                */
		/* ------------------------------------------------------------------ */

		#bindOccupationSuggestionFields() {
			this.__occupationSuggest = this.__occupationSuggest || null;
			const input = this.querySelector('[data-field="occupation"]');
			if (!input) return;
			const container = input.closest('.pie__field') || input.parentElement;
			if (!container) return;
			container.classList.add('pie__field--suggest');
			let dropdown = container.querySelector('.pie__suggestions');
			if (!dropdown) {
				dropdown = document.createElement('div');
				dropdown.className = 'pie__suggestions';
				dropdown.hidden = true;
				container.append(dropdown);
			}

			const state = {
				input,
				container,
				dropdown,
				matches: [],
				activeIndex: -1,
				debounceTimer: 0,
			};
			this.__occupationSuggest = state;

			input.addEventListener('input', () => {
				window.clearTimeout(state.debounceTimer);
				state.debounceTimer = window.setTimeout(() => {
					void this.#runOccupationSearch();
				}, 160);
			});

			input.addEventListener('focus', () => {
				void this.#runOccupationSearch();
			});

			input.addEventListener('blur', () => {
				window.setTimeout(() => this.#closeOccupationSuggestions(), 120);
			});

			input.addEventListener('keydown', (ev) => this.#handleOccupationKeydown(ev));

			dropdown.addEventListener('mousedown', (ev) => ev.preventDefault());
			dropdown.addEventListener('click', (ev) => {
				const btn = ev.target.closest('[data-suggest-index]');
				if (!btn) return;
				const idx = Number(btn.dataset.suggestIndex);
				const match = state.matches[idx];
				if (match) this.#selectOccupationSuggestion(match);
			});
		}

		async #runOccupationSearch() {
			const state = this.__occupationSuggest;
			if (!state || !state.input) return;
			const occupations = await loadOccupationsList();
			const requestId = (state.searchRequestId = (state.searchRequestId || 0) + 1);
			const q = String(state.input.value || '').trim();
			const matches = matchSuggestionList(occupations, q, 8);
			if (requestId !== state.searchRequestId) {
				return;
			}
			state.matches = matches;
			this.#renderOccupationSuggestions();
		}

		#renderOccupationSuggestions() {
			const state = this.__occupationSuggest;
			if (!state || !state.dropdown) return;
			state.dropdown.textContent = '';
			state.activeIndex = -1;
			if (!state.matches || !state.matches.length) {
				state.dropdown.hidden = true;
				return;
			}
			for (let i = 0; i < state.matches.length; i++) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'pie__suggestion-button';
				btn.dataset.suggestIndex = String(i);
				btn.setAttribute('role', 'option');
				btn.innerHTML = escapeHtml(state.matches[i]);
				state.dropdown.append(btn);
			}
			state.dropdown.hidden = false;
			this.#setActiveOccupationSuggestion(0);
		}

		#setActiveOccupationSuggestion(index) {
			const state = this.__occupationSuggest;
			if (!state || !state.dropdown) return null;
			const buttons = [...state.dropdown.querySelectorAll('[data-suggest-index]')];
			buttons.forEach((b, idx) => {
				b.classList.toggle('is-active', idx === index);
				b.setAttribute('aria-selected', idx === index ? 'true' : 'false');
			});
			state.activeIndex = index;
			return buttons[index] || null;
		}

		#handleOccupationKeydown(event) {
			const state = this.__occupationSuggest;
			if (!state || !state.dropdown) return;
			const options = [...state.dropdown.querySelectorAll('[data-suggest-index]')];
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				if (!options.length) return;
				const next = Math.min(state.activeIndex + 1, options.length - 1);
				this.#setActiveOccupationSuggestion(next)?.scrollIntoView({ block: 'nearest' });
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				if (!options.length) return;
				const prev = Math.max(state.activeIndex - 1, 0);
				this.#setActiveOccupationSuggestion(prev)?.scrollIntoView({ block: 'nearest' });
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				const idx = state.activeIndex >= 0 ? state.activeIndex : 0;
				const match = state.matches[idx];
				if (match) this.#selectOccupationSuggestion(match);
				return;
			}
			if (event.key === 'Escape') {
				this.#closeOccupationSuggestions();
				return;
			}
		}

		#selectOccupationSuggestion(match) {
			const state = this.__occupationSuggest;
			if (!state) return;
			state.input.value = String(match);
			state.input.dispatchEvent(new Event('input', { bubbles: true }));
			this.#closeOccupationSuggestions();
			state.input.focus();
		}

		#closeOccupationSuggestions() {
			const state = this.__occupationSuggest;
			if (!state || !state.dropdown) return;
			state.dropdown.hidden = true;
			state.activeIndex = -1;
			state.matches = [];
			state.dropdown.textContent = '';
		}

		/* ------------------------------------------------------------------ */
		/* Photo picker + upload                                               */
		/* ------------------------------------------------------------------ */

		#resolvePhotoPreviewUrl(src) {
			const trimmed = String(src || "").trim();
			if (!trimmed) {
				return "";
			}
			if (/^https?:\/\//i.test(trimmed)) {
				return trimmed;
			}

			const normalized = trimmed.replace(/^\.?\//, "");
			if (normalized.startsWith("people/")) {
				return resolveSiteUrl(normalized);
			}

			return resolveSiteUrl(`people/${this.__personId}/data/${normalized}`);
		}

		#setPhotoSrc(src) {
			const srcInput = this.querySelector("#pie-photo-src");
			if (!srcInput) {
				return;
			}

			const trimmed = String(src || "").trim();
			if (this.__data?.photo && trimmed !== this.__data.photo.src) {
				this.__data.photo.alt = "";
			}
			srcInput.value = trimmed;
			srcInput.dispatchEvent(new Event("input", { bubbles: true }));
			if (this.__data?.photo) {
				this.__data.photo.src = trimmed;
			}
			this.#syncPhotoUi();
		}

		#syncPhotoUi() {
			const srcInput = this.querySelector("#pie-photo-src");
			const previewWrap = this.querySelector("#pie-photo-preview-wrap");
			const previewImg = this.querySelector("#pie-photo-preview-img");
			const emptyState = this.querySelector("#pie-photo-empty");
			const removeBtn = this.querySelector("[data-photo-remove]");
			const src = String(srcInput?.value || "").trim();
			const hasPhoto = Boolean(src);

			if (previewWrap) {
				previewWrap.hidden = !hasPhoto;
			}
			if (emptyState) {
				emptyState.hidden = hasPhoto;
			}
			if (removeBtn) {
				removeBtn.hidden = !hasPhoto;
			}
			if (previewImg) {
				if (hasPhoto) {
					const previewUrl = this.#resolvePhotoPreviewUrl(src);
					previewImg.src = previewUrl;
					previewImg.alt = String(this.__data?.photo?.alt || "").trim() || "Selected profile photo";
				} else {
					previewImg.removeAttribute("src");
					previewImg.alt = "";
				}
			}
		}

		#bindPhotoFields() {
			const fileInput = this.querySelector("#pie-photo-file");
			const uploadBtn = this.querySelector("[data-photo-upload]");
			const chooseBtn = this.querySelector("[data-photo-choose]");
			const removeBtn = this.querySelector("[data-photo-remove]");
			const modal = this.querySelector(".pie__media-modal");

			if (uploadBtn && fileInput) {
				uploadBtn.addEventListener("click", () => fileInput.click());
				fileInput.addEventListener("change", async () => {
					const file = fileInput.files?.[0];
					fileInput.value = "";
					if (!file) {
						return;
					}
					try {
						const result = await this.#submitPhotoUpload(file);
						if (result?.filename) {
							this.#setPhotoSrc(`images/${result.filename}`);
							this.#setStatus("Image submitted for review.", "success");
						}
					} catch (error) {
						console.error(error);
						this.#setStatus(error?.message || "Could not upload image.", "error");
					}
				});
			}

			if (chooseBtn && modal) {
				chooseBtn.addEventListener("click", async () => {
					await this.#openPhotoMediaPicker();
				});
				modal.addEventListener("click", (ev) => {
					if (ev.target.closest("[data-media-modal-close]")) {
						this.#closePhotoMediaPicker();
					}
				});
			}

			if (removeBtn) {
				removeBtn.addEventListener("click", () => {
					this.#setPhotoSrc("");
				});
			}
		}

		async #fetchPhotoList() {
			// Try the GitHub-backed API first
			const apiUrl = resolveApiUrl('github-media.php');
			if (apiUrl) {
				try {
					const url = new URL(apiUrl);
					url.searchParams.set('person', this.__personId);
					const resp = await fetch(url.href, fetchInit({ cache: 'no-store' }));
					const payload = await resp.json().catch(() => null);
					if (resp.ok && payload?.ok) {
						return (payload.images || []).map((img) => ({ name: String(img?.name || ''), url: String(img?.download_url || '') || resolveSiteUrl(`people/${this.__personId}/data/images/${img?.name || ''}`) })).filter(i => i.name);
					}
				} catch (error) {
					console.warn('Could not load media via API', error);
				}
			}

			// Fallback: parse profile-table.html for <img> references
			try {
				const url = resolveSiteUrl(`people/${this.__personId}/data/profile-table.html`);
				const resp = await fetch(url, { cache: 'no-store' });
				if (resp.ok) {
					const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
					const imgs = Array.from(doc.querySelectorAll('img[src]')).map((img) => {
						const href = String(img.getAttribute('src') || '').trim();
						const name = decodeURIComponent((href.split('?')[0].split('/').pop() || '').trim());
						return name ? { name, url: resolveSiteUrl(href) } : null;
					}).filter(Boolean);
					if (imgs.length) return imgs;
				}
			} catch (error) {
				console.warn('Could not parse profile images', error);
			}

			return [];
		}

		async #openPhotoMediaPicker() {
			const modal = this.querySelector('.pie__media-modal');
			const grid = modal?.querySelector('.pie__media-grid');
			const status = modal?.querySelector('.pie__media-modal-status');
			if (!modal || !grid || !status) return;
			modal.hidden = false;
			modal.setAttribute('aria-hidden', 'false');
			document.body.style.overflow = 'hidden';
			status.textContent = 'Loading images…';
			grid.innerHTML = '';

			let images = [];
			try {
				images = await this.#fetchPhotoList();
			} catch (error) {
				console.error(error);
			}

			if (!images.length) {
				status.textContent = 'No images available for this profile.';
				return;
			}

			status.textContent = '';
			for (const img of images) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'pie__media-thumb';
				btn.dataset.mediaName = img.name;
				btn.innerHTML = `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.name)}"><span class="pie__media-thumb-label">${escapeHtml(img.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))}</span>`;
				btn.addEventListener("click", () => {
					this.#setPhotoSrc(`images/${img.name}`);
					this.#closePhotoMediaPicker();
				});
				grid.append(btn);
			}
		}

		#closePhotoMediaPicker() {
			const modal = this.querySelector('.pie__media-modal');
			if (!modal || modal.hidden) return;
			modal.hidden = true;
			modal.setAttribute('aria-hidden', 'true');
			document.body.style.overflow = '';
		}

		async #submitPhotoUpload(file) {
			if (!file) throw new Error('No file selected');
			const apiUrl = resolveApiUrl('github-media.php');
			if (!apiUrl) throw new Error('Site API is not configured for uploads.');
			this.#setStatus('Preparing image for upload…');
			const dataUrl = await this.#readFileAsDataUrl(file);
			const base64 = String(dataUrl || '').replace(/^data:[^;]+;base64,/, '');
			const filename = file.name.replace(/\s+/g, '-');
			this.#setStatus('Uploading image…');
			const body = {
				action: 'upload',
				filename,
				caption: '',
				content_base64: base64,
			};
			const url = new URL(apiUrl);
			const resp = await fetch(url.href, fetchInit({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...body, person_id: this.__personId }),
			}));
			let payload = null;
			try { payload = await resp.json(); } catch (e) { payload = null; }
			if (!resp.ok || !payload?.ok) {
				if (payload?.error === 'authentication_required') throw new Error('Sign in with GitHub from the site header first.');
				throw new Error(payload?.message || `Upload failed (${resp.status}).`);
			}
			return { filename: payload.filename || filename, payload };
		}

		#readFileAsDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result || ''));
				reader.onerror = () => reject(new Error('Could not read the image file.'));
				reader.readAsDataURL(file);
			});
		}

		#openLocationDropdown(path) {
			const state = this.__locationFields?.get(path);
			if (!state?.dropdown) return;

			state.dropdown.hidden = false;
			state.searchInput?.setAttribute("aria-expanded", "true");
		}

		#scheduleLocationSearch(path) {
			const state = this.__locationFields?.get(path);
			if (!state?.searchInput) return;

			window.clearTimeout(state.debounceTimer);
			state.debounceTimer = window.setTimeout(() => {
				void this.#runLocationSearch(path);
			}, 180);
		}

		async #runLocationSearch(path) {
			const state = this.__locationFields?.get(path);
			if (!state?.searchInput) return;

			const query = state.searchInput.value.trim();
			if (!query) {
				state.matches = [];
				this.#closeLocationDropdown(path);
				return;
			}

			state.abortController?.abort?.();
			state.abortController = typeof AbortController === "function" ? new AbortController() : null;

			try {
				const matches = await searchLocationMatches(query, { signal: state.abortController?.signal });
				if (state.searchInput.value.trim() !== query) return;
				this.#renderLocationMatches(path, matches, query);
			} catch (error) {
				if (error?.name === "AbortError") return;
				this.#renderLocationMatches(path, createManualLocationMatch(query) ? [createManualLocationMatch(query)] : [], query);
			}
		}

		#renderLocationMatches(path, matches, query) {
			const state = this.__locationFields?.get(path);
			if (!state?.dropdown) return;

			state.dropdown.textContent = "";
			state.matches = Array.isArray(matches) ? matches : [];
			state.activeIndex = -1;

			if (!state.matches.length) {
				const empty = document.createElement("li");
				empty.className = "pie__location-empty";
				empty.textContent = query ? `No locations match \"${query}\".` : "Start typing a location.";
				state.dropdown.append(empty);
				this.#openLocationDropdown(path);
				return;
			}

			state.matches.forEach((match, index) => {
				const item = document.createElement("li");
				item.className = "pie__location-option";

				const button = document.createElement("button");
				button.type = "button";
				button.className = "pie__location-option-button";
				button.dataset.locationResultIndex = String(index);
				button.setAttribute("role", "option");

				const title = document.createElement("span");
				title.className = "pie__location-option-title";
				title.textContent = formatLocationSummary(match.location, match.label) || match.label;
				button.append(title);

				const meta = document.createElement("span");
				meta.className = "pie__location-option-meta";
				meta.textContent = match.type === "manual"
					? `Use \"${query}\" as entered`
					: (match.label || "Search result");
				button.append(meta);

				item.append(button);
				state.dropdown.append(item);
			});

			this.#openLocationDropdown(path);
		}

		#setActiveLocationOption(path, index) {
			const state = this.__locationFields?.get(path);
			if (!state?.dropdown) return null;

			const buttons = [...state.dropdown.querySelectorAll("[data-location-result-index]")];
			buttons.forEach((button, buttonIndex) => {
				button.classList.toggle("is-active", buttonIndex === index);
				button.setAttribute("aria-selected", buttonIndex === index ? "true" : "false");
			});

			state.activeIndex = index;
			return buttons[index] || null;
		}

		#handleLocationKeydown(path, event) {
			const state = this.__locationFields?.get(path);
			if (!state?.dropdown) return;

			const options = [...state.dropdown.querySelectorAll("[data-location-result-index]")];
			if (event.key === "ArrowDown") {
				if (!options.length) return;
				event.preventDefault();
				const nextIndex = Math.min(state.activeIndex + 1, options.length - 1);
				this.#setActiveLocationOption(path, nextIndex)?.scrollIntoView({ block: "nearest" });
				return;
			}

			if (event.key === "ArrowUp") {
				if (!options.length) return;
				event.preventDefault();
				const nextIndex = Math.max(state.activeIndex - 1, 0);
				this.#setActiveLocationOption(path, nextIndex)?.scrollIntoView({ block: "nearest" });
				return;
			}

			if (event.key === "Enter") {
				if (!options.length) return;
				event.preventDefault();
				const selectedIndex = state.activeIndex >= 0 ? state.activeIndex : 0;
				const match = state.matches[selectedIndex];
				if (match) {
					this.#selectLocationMatch(path, match);
				}
				return;
			}

			if (event.key === "Escape") {
				this.#closeLocationDropdown(path);
			}
		}

		#selectLocationMatch(path, match) {
			const state = this.__locationFields?.get(path);
			if (!state) return;

			const location = normalizeLocationData(match.location, match.label);
			if (!location.placeName && !hasLocationDetails(location) && match.label) {
				location.placeName = match.label;
			}

			this.#applyLocationValue(path, location, { expanded: hasLocationDetails(location) });
			state.searchInput?.focus();
		}

		#collect() {
			const data = emptyData();

			this.querySelectorAll("[data-field]").forEach((input) => {
				const key = input.dataset.field;
				const value = input.value.trim();
				if (key === "alsoKnownAs") {
					data.alsoKnownAs = value.split(",").map((v) => v.trim()).filter(Boolean);
				} else {
					setPathValue(data, key, value);
				}
			});

			data.photo.alt = String(this.__data?.photo?.alt || "");

			this.querySelectorAll("[data-date]").forEach((input) => {
				setPathValue(data, input.dataset.date, input.type === "checkbox" ? input.checked : input.value.trim());
			});

			// If a group used the 'between' precision, assemble the stored value
			// as "start|end" and normalise any circa flags. Remove temporary
			// helper keys (dateTo / circaTo) afterwards.
			["birth", "baptism", "death", "burial"].forEach((group) => {
				const precision = getPathValue(data, `${group}.precision`) || "exact";
				const groupObj = getPathValue(data, group) || {};
				if (precision === "between") {
					const from = getPathValue(data, `${group}.date`) || "";
					const to = getPathValue(data, `${group}.dateTo`) || "";
					setPathValue(data, `${group}.date`, `${from}|${to}`);
					const circaFrom = getPathValue(data, `${group}.circa`) || false;
					const circaTo = getPathValue(data, `${group}.circaTo`) || false;
					setPathValue(data, `${group}.circa`, Boolean(circaFrom || circaTo));
					if (groupObj && Object.prototype.hasOwnProperty.call(groupObj, 'dateTo')) delete groupObj.dateTo;
					if (groupObj && Object.prototype.hasOwnProperty.call(groupObj, 'circaTo')) delete groupObj.circaTo;
				} else {
					if (groupObj && Object.prototype.hasOwnProperty.call(groupObj, 'dateTo')) delete groupObj.dateTo;
					if (groupObj && Object.prototype.hasOwnProperty.call(groupObj, 'circaTo')) delete groupObj.circaTo;
				}
			});

			data.status = this.#getRadio("status") || "deceased";
			data.gender = this.#getRadio("gender") || "unknown";
			data.burial.type = this.#getRadio("burial.type") || "burial";
			this.#collectLocationFields(data);

			return data;
		}

		async #save() {
			const { save } = this.#els();
			const submitUrl = resolveApiUrl("github-submit-page-edit.php");
			if (!submitUrl) {
				this.#setStatus("The site API is not configured.", "error");
				return;
			}

			const data = this.#collect();
			this.__data = data;
			const publishFiles = this.#buildInfoboxPublishFiles(data);
			const primary = publishFiles[0];
			const path = primary.path;
			const name = displayNameFrom(data) || `profile ${this.__personId}`;
			const creatingGedcom = publishFiles.some((file) => file.path.endsWith("/family-tree.ged"));

			if (save) save.disabled = true;
			this.#setStatus("Saving infobox and opening a pull request…");

			try {
				const requestBody = {
					path,
					content: primary.content,
					commit_message: `Update infobox for ${name}`,
					pr_title: `Update infobox for ${name}`,
					pr_body: creatingGedcom
						? `Updates the identity infobox (\`${path}\`) and creates the required \`family-tree.ged\` file for this profile.`
						: `Updates the identity infobox (\`${path}\`) via the profile editor.`,
				};
				if (publishFiles.length > 1) {
					requestBody.files = publishFiles;
				}

				const response = await fetch(submitUrl, fetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: JSON.stringify(requestBody),
				}));

				let payload = null;
				try {
					payload = await response.json();
				} catch (error) {
					payload = null;
				}

				if (!response.ok || !payload?.ok) {
					if (payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub from the site header first, then try again.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				const pr = payload.pull_request || {};
				const link = pr.url
					? `pull request #${pr.number} (${pr.url})`
					: "a pull request";
				this.#setStatus(`Infobox saved — ${link} opened for review.`, "success");
				if (creatingGedcom) {
					this.__gedcomExists = true;
				}
				this.#setSavedBaseline();
			} catch (error) {
				console.error(error);
				this.#setStatus(error?.message || "Could not save the infobox.", "error");
			} finally {
				if (save) save.disabled = false;
			}
		}
	}

	if (!customElements.get("profile-infobox-editor")) {
		customElements.define("profile-infobox-editor", ProfileInfoboxEditor);
	}
})();
