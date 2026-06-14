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
 * edited here. Saving is handled by github-submit-page-edit.php, which commits
 * directly for managed profiles and opens a pull request otherwise.
 */
(function () {
	"use strict";

	const I = window.AppProfileInfobox;
	if (!I) {
		console.error("profile-infobox-render.js must load before profile-infobox-editor.js");
		return;
	}

	const {
		MONTHS,
		GENDERS,
		LOCATION_DETAIL_FIELDS,
		escapeHtml,
		friendlyDate,
		parseFriendlyToStored,
		normalizeStoredDate,
		canonicalizeInfoboxData,
		emptyLocationData,
		normalizeLocationData,
		hasLocationDetails,
		ensureLocationDetailsFromSummary,
		formatLocationSummary,
		emptyData,
		normalizeData,
		migrateFromMarkup,
		displayNameFrom,
		hasRequiredProfileName,
		genderLabel,
		buildFragment,
	} = I;

	function storedToDateInputValue(value) {
		return normalizeStoredDate(value);
	}

	const DATE_PRECISIONS = [
		{ value: "exact", label: "Exact" },
		{ value: "before", label: "Before" },
		{ value: "after", label: "After" },
		{ value: "between", label: "Between" },
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
	const EXTRA_OCCUPATIONS = [
		"Vibe Coder",
	];
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
		...EXTRA_OCCUPATIONS,
	];
	let occupationsListPromise = null;

	function mergeExtraOccupations(occupations) {
		const merged = Array.isArray(occupations) ? [...occupations] : [];
		const seen = new Set(merged.map((occupation) => String(occupation).toLocaleLowerCase("en-US")));
		for (const occupation of EXTRA_OCCUPATIONS) {
			const key = String(occupation).toLocaleLowerCase("en-US");
			if (seen.has(key)) continue;
			seen.add(key);
			merged.push(occupation);
		}
		return merged;
	}

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
					return mergeExtraOccupations(occupations);
				})
				.catch((error) => {
					console.warn("Using fallback occupations list", error);
					return mergeExtraOccupations(OCCUPATIONS_FALLBACK);
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

	async function isDraftProfile(personId) {
		if (new URLSearchParams(window.location.search).get("new") === "1") return true;
		if (!window.PeopleRegistry?.loadPeopleRegistry) return false;
		try {
			const people = await window.PeopleRegistry.loadPeopleRegistry();
			const id = String(personId || "").trim();
			return !people.some((person) => String(person?.id || "").trim() === id);
		} catch (error) {
			return false;
		}
	}

	async function fetchSiteResource(url, init = {}) {
		if (window.App?.fetchSiteResource) {
			return window.App.fetchSiteResource(url, init);
		}

		try {
			const requestUrl = new URL(url, window.location.href);
			requestUrl.searchParams.set("_", String(Date.now()));
			const response = await fetch(requestUrl.href, {
				cache: "no-store",
				...init,
				headers: {
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
					...(init.headers || {}),
				},
			});
			return response.ok ? response : null;
		} catch (error) {
			return null;
		}
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

	const TEMPLATE = `
		<form class="pie" autocomplete="off">
			<div class="pie__status" role="status" hidden></div>

			<fieldset class="pie__group">
				<legend class="pie__legend">Name</legend>
				<div class="pie__row">
					<label class="pie__label" for="pie-title">Title</label>
					<div class="pie__field"><input id="pie-title" type="text" data-field="title" placeholder="Title"></div>
				</div>
				<div class="pie__row pie__row--align-top">
					<label class="pie__label" for="pie-first">Name</label>
					<div class="pie__field pie__field--name">
						<div class="pie__field pie__field--split">
							<input id="pie-first" type="text" data-field="firstName" placeholder="First Name">
							<input id="pie-middle" type="text" data-field="middleName" placeholder="Middle Name">
						</div>
						<div class="pie__field pie__field--split">
							<input id="pie-last" type="text" data-field="lastName" placeholder="Last Name">
							<input id="pie-suffix" type="text" data-field="suffix" placeholder="Suffix">
						</div>
					</div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-birth-surname">Birth surname</label>
					<div class="pie__field"><input id="pie-birth-surname" type="text" data-field="birthSurname" placeholder="Birth Surname"></div>
				</div>
				<div class="pie__row">
					<label class="pie__label" for="pie-display">Display name</label>
					<div class="pie__field"><input id="pie-display" type="text" data-field="displayName" placeholder="First Name + Last Name (Birth Surname)"></div>
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
						<label><input type="radio" name="pie-status" value="unknown"> Unknown</label>
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

			<fieldset class="pie__group pie__group--death" data-event="death" hidden>
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

			<fieldset class="pie__group pie__group--death" data-event="burial" hidden>
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

			<input id="pie-photo-src" type="hidden" data-field="photo.src">
			<input id="pie-photo-file" type="file" accept="image/*" hidden>
			<div class="pie__media-modal pie__photo-modal" hidden aria-hidden="true">
				<div class="pie__media-modal-backdrop" data-media-modal-close></div>
				<div class="pie__media-modal-panel">
					<header class="pie__media-modal-header">
						<h2>Profile Picture</h2>
						<button type="button" class="pie__media-modal-close" aria-label="Close" data-media-modal-close>✕</button>
					</header>
					<div class="pie__media-modal-body">
						<div class="pie__photo-modal-toolbar" hidden>
							<button type="button" class="page-editor__button page-editor__sidebar-delete" data-photo-remove hidden>
								<i class="bi bi-trash" aria-hidden="true"></i>
								<span>Remove picture</span>
							</button>
						</div>
						<button type="button" class="pie__photo-dropzone" data-photo-dropzone>
							<i class="bi bi-cloud-arrow-up pie__photo-dropzone-icon" aria-hidden="true"></i>
							<span class="pie__photo-dropzone-title">Drag a picture here, or click to upload</span>
							<span class="pie__photo-dropzone-hint">JPG, PNG, GIF, WebP, or SVG</span>
						</button>
						<p class="pie__media-modal-status">Loading images…</p>
						<div class="pie__media-grid"></div>
					</div>
				</div>
			</div>
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
			this.__formReady = false;
			this.__locationFields = new Map();
			this.__savedSnapshot = "";
			this.__establishingBaseline = false;
			this.__gedcomExists = false;
			this.__pendingPhotoFile = null;
			this.__pendingPhotoPreviewUrl = "";

			this.innerHTML = TEMPLATE;
			this.__photoModalEl = this.querySelector(".pie__media-modal");
			this.__photoModalHome = this.querySelector(".pie");
			this.__photoModalRestoreParent = null;
			this.__photoFileInputHome = null;
			this.#populateSelects();
			this.#bind();
			this.#syncStatusSections();
			void loadOccupationsList();
			void loadDeathCausesList();

			// Register a provider so the page editor can collect this infobox
			// fragment and include it in the same publish when the global Save is used.
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

			this.__onPageShow = (event) => {
				if (event.persisted) {
					void this.#loadExisting();
				}
			};
			window.addEventListener("pageshow", this.__onPageShow);

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
				// The profile editor shell owns the single Save (it bundles the
				// infobox files with profile.html into one publish).
				const globalSave = document.querySelector('.page-editor__button--save[data-action="publish"]');
				if (globalSave) {
					globalSave.click();
				} else {
					document.dispatchEvent(new CustomEvent("profile-editor-save-request"));
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
				if (target?.name === "pie-status") this.#syncStatusSections();
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

		// The profile's page title (its <h1>) is the display name, shown read-only
		// in the WYSIWYG editor. Broadcast the effective name so the profile page
		// editor keeps its heading in step with the infobox. Falls back to
		// "First [Middle] Last (Birth Surname) Suffix" when no explicit display
		// name is set (see displayNameFrom).
		#syncPageTitle() {
			const name = displayNameFrom(this.#collect());
			if (!name) return;
			document.dispatchEvent(new CustomEvent("profile-display-name-change", { detail: { name } }));
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
			const editor = document.querySelector("page-editor, profile-editor");
			if (editor && typeof editor.refreshDirtyState === "function") {
				editor.refreshDirtyState();
			}
			document.dispatchEvent(new CustomEvent("profile-editor-dirty-change"));
		}

		// True once #fillForm has run so the profile-page preview can read live values.
		isPreviewReady() {
			return Boolean(this.__formReady);
		}

		// Current identity table as a <profile-identity> fragment, used by the
		// WYSIWYG profile editor to render the floated infobox preview live.
		getIdentityFragmentHtml() {
			try {
				const data = this.__formReady ? this.#collect() : normalizeData(this.__data);
				return buildFragment(data, this.__familyHtml);
			} catch (error) {
				return "";
			}
		}

		getProfileData() {
			try {
				return normalizeData(this.#collect());
			} catch (error) {
				return normalizeData(this.__data);
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
			if (await isDraftProfile(this.__personId)) {
				this.__gedcomExists = false;
				return;
			}
			const response = await fetchSiteResource(resolveSiteUrl(`people/${this.__personId}/data/family-tree.ged`));
			this.__gedcomExists = Boolean(response);
		}

		async #loadExisting() {
			this.#setStatus("Loading…");
			await this.#checkGedcomExists();
			if (!(await isDraftProfile(this.__personId))) {
				const response = await fetchSiteResource(resolveSiteUrl(`people/${this.__personId}/data/profile-table.html`));
				if (response) {
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
			}

			this.#fillForm();
			this.#syncPageTitle();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.#setSavedBaseline({ quiet: true });
					this.#notifyDirtyState();
					this.#setStatus("");
				});
			});
		}

		disconnectedCallback() {
			if (this.__onPageShow) {
				window.removeEventListener("pageshow", this.__onPageShow);
				this.__onPageShow = null;
			}
			this.#clearPendingPhotoFile();
			this.#closePhotoMediaPicker();
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
			this.#syncStatusSections();
			this.#syncPhotoState();

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
			this.__formReady = true;
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

		#syncStatusSections() {
			const showDeath = this.#getRadio("status") === "deceased";
			this.querySelectorAll(".pie__group--death").forEach((group) => {
				group.hidden = !showDeath;
			});
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
					window.setTimeout(() => {
						this.#closeLocationDropdown(path);
						this.#syncLocationSearchFromDetails(path);
					}, 120);
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

		#applyLocationValue(path, value, { expanded = false } = {}) {
			const state = this.__locationFields?.get(path);
			if (!state) return;

			const location = ensureLocationDetailsFromSummary(value);
			if (state.searchInput) {
				state.searchInput.value = formatLocationSummary(location, "");
			}

			state.root.querySelectorAll("[data-location-field]").forEach((input) => {
				const fullPath = String(input.dataset.locationField || "");
				const key = fullPath.startsWith(`${path}.`) ? fullPath.slice(path.length + 1) : fullPath;
				input.value = location[key] ?? "";
			});

			this.#setLocationDetailsExpanded(path, expanded);
			this.#closeLocationDropdown(path);
		}

		#collectLocationValue(path) {
			const state = this.__locationFields?.get(path);
			const location = emptyLocationData();
			if (!state) return location;

			state.root.querySelectorAll("[data-location-field]").forEach((input) => {
				const fullPath = String(input.dataset.locationField || "");
				const key = fullPath.startsWith(`${path}.`) ? fullPath.slice(path.length + 1) : fullPath;
				if (Object.prototype.hasOwnProperty.call(location, key)) {
					location[key] = input.value.trim();
				}
			});

			location.label = formatLocationSummary(location, "");
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
			state.searchInput.value = formatLocationSummary(location, "");
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

		hasPhoto() {
			if (this.__pendingPhotoFile) {
				return true;
			}

			const src = String(this.__data?.photo?.src || this.querySelector("#pie-photo-src")?.value || "").trim();
			if (!src || src.startsWith("blob:")) {
				return false;
			}

			if (src === "assets/default-profile-photo.svg" || src.endsWith("/default-profile-photo.svg")) {
				return false;
			}

			return true;
		}

		openPhotoEditor() {
			return this.#openPhotoMediaPicker();
		}

		#photoModal() {
			return this.__photoModalEl || null;
		}

		#portalPhotoModalIfNeeded() {
			const modal = this.#photoModal();
			if (!modal || modal.parentElement === document.body) return;

			const panel = this.closest(".profile-edit__panel");
			if (!panel?.hidden) return;

			const home = this.__photoModalHome || this.querySelector(".pie");
			if (!home) return;

			this.__photoModalRestoreParent = home;
			document.body.append(modal);

			const fileInput = this.querySelector("#pie-photo-file");
			const modalBody = modal.querySelector(".pie__media-modal-body");
			if (fileInput && modalBody && !modalBody.contains(fileInput)) {
				this.__photoFileInputHome = fileInput.parentElement;
				modalBody.append(fileInput);
			}
		}

		#restorePhotoModalHome() {
			const modal = this.#photoModal();
			const home = this.__photoModalRestoreParent;
			if (modal && home && modal.parentElement === document.body) {
				home.append(modal);
			}
			this.__photoModalRestoreParent = null;

			const fileInput = this.querySelector("#pie-photo-file");
			if (fileInput && this.__photoFileInputHome) {
				this.__photoFileInputHome.append(fileInput);
				this.__photoFileInputHome = null;
			}
		}

		removePhoto() {
			this.#clearPendingPhotoFile();
			this.#setPhotoSrc("");
		}

		getQuickEditForLabel(label) {
			if (!this.__formReady) return null;

			const name = String(label || "").trim();
			if (name === "Gender") {
				return {
					type: "select",
					value: this.#getRadio("gender") || "unknown",
					options: GENDERS,
				};
			}

			const dateGroup = { Birth: "birth", Baptism: "baptism", Death: "death" }[name];
			if (dateGroup) {
				return {
					type: "date",
					value: this.#quickDateValue(dateGroup),
				};
			}

			if (name === "Occupation") {
				return { type: "text", value: this.querySelector('[data-field="occupation"]')?.value?.trim() || "" };
			}

			if (name === "Name") {
				const data = this.#collect();
				return {
					type: "name",
					fields: {
						title: data.title || "",
						firstName: data.firstName || "",
						middleName: data.middleName || "",
						lastName: data.lastName || "",
						suffix: data.suffix || "",
						birthSurname: data.birthSurname || "",
					},
				};
			}

			if (name === "Also known as") {
				return { type: "text", value: this.querySelector('[data-field="alsoKnownAs"]')?.value?.trim() || "" };
			}

			if (name === "Last residence") {
				const data = this.#collect();
				return {
					type: "text",
					value: formatLocationSummary(data.lastResidenceLocation, data.lastResidence),
				};
			}

			if (name === "Place of burial") {
				const data = this.#collect();
				const place = formatLocationSummary(data.burial.location, data.burial.place);
				const date = friendlyDate(data.burial.date, data.burial);
				return {
					type: "text",
					value: [place, date ? `(${date})` : ""].filter(Boolean).join(" ").trim(),
				};
			}

			return null;
		}

		applyQuickEdit(label, value) {
			if (!this.__formReady) return false;

			const name = String(label || "").trim();
			if (name === "Gender") {
				this.#setRadio("gender", String(value || "unknown"));
				this.#notifyQuickEditChange();
				return true;
			}

			const dateGroup = { Birth: "birth", Baptism: "baptism", Death: "death" }[name];
			if (dateGroup) {
				this.#applyQuickDate(dateGroup, value);
				this.#notifyQuickEditChange();
				return true;
			}

			if (name === "Occupation") {
				this.#setFieldValue("occupation", value);
				this.#notifyQuickEditChange();
				return true;
			}

			if (name === "Name") {
				const fields = value && typeof value === "object" ? value : {};
				for (const key of ["title", "firstName", "middleName", "lastName", "suffix", "birthSurname"]) {
					this.#setFieldValue(key, fields[key] || "");
				}
				this.#setFieldValue("displayName", "");
				this.#syncPageTitle();
				this.#notifyQuickEditChange();
				return true;
			}

			if (name === "Also known as") {
				this.#setFieldValue("alsoKnownAs", value);
				this.#notifyQuickEditChange();
				return true;
			}

			if (name === "Last residence") {
				this.#applyLocationValue("lastResidenceLocation", { placeName: String(value || "").trim(), label: String(value || "").trim() });
				this.#notifyQuickEditChange();
				return true;
			}

			if (name === "Place of burial") {
				this.#applyLocationValue("burial.location", { placeName: String(value || "").trim(), label: String(value || "").trim() });
				this.#notifyQuickEditChange();
				return true;
			}

			return false;
		}

		#quickDateValue(group) {
			const entry = getPathValue(this.#collect(), group) || {};
			let raw = String(entry.date || "").trim();
			if (entry.precision === "between" && raw.includes("|")) {
				raw = raw.split("|")[0].trim();
			}
			return storedToDateInputValue(raw) || "";
		}

		#applyQuickDate(group, rawValue) {
			const dateInput = this.querySelector(`[data-date="${group}.date"]`);
			if (!dateInput) {
				return;
			}

			const trimmed = String(rawValue || "").trim();
			const stored = trimmed ? (normalizeStoredDate(trimmed) || trimmed) : "";
			dateInput.value = trimmed ? (storedToDateInputValue(stored) || trimmed) : "";
			dateInput.dispatchEvent(new Event("input", { bubbles: true }));
			this.#updatePreviews();
		}

		#setFieldValue(field, value) {
			const input = this.querySelector(`[data-field="${field}"]`);
			if (!input) return;
			input.value = field === "alsoKnownAs"
				? String(value || "").trim()
				: String(value || "").trim();
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}

		#notifyQuickEditChange() {
			this.#notifyDirtyState();
			document.dispatchEvent(new CustomEvent("profile-photo-change"));
		}

		async prepareForPublish() {
			if (!this.__pendingPhotoFile) {
				return;
			}

			const result = await this.#submitPhotoUpload(this.__pendingPhotoFile);
			if (!result?.filename) {
				throw new Error("Could not upload profile photo.");
			}

			this.#clearPendingPhotoFile();
			this.#setPhotoSrc(`images/${result.filename}`);
		}

		#clearPendingPhotoFile() {
			if (this.__pendingPhotoPreviewUrl) {
				URL.revokeObjectURL(this.__pendingPhotoPreviewUrl);
				this.__pendingPhotoPreviewUrl = "";
			}
			this.__pendingPhotoFile = null;
		}

		async #stagePhotoUpload(file) {
			if (!file || !String(file.type || "").startsWith("image/")) {
				throw new Error("Choose an image file (JPG, PNG, GIF, WebP, or SVG).");
			}

			this.#clearPendingPhotoFile();
			this.__pendingPhotoFile = file;
			this.__pendingPhotoPreviewUrl = URL.createObjectURL(file);
			this.#setPhotoSrc(this.__pendingPhotoPreviewUrl);
			this.#setStatus("Photo selected — save the profile to upload it.", "info");
		}

		#setPhotoSrc(src) {
			const srcInput = this.querySelector("#pie-photo-src");
			if (!srcInput) {
				return;
			}

			const trimmed = String(src || "").trim();
			if (trimmed && !trimmed.startsWith("blob:")) {
				this.#clearPendingPhotoFile();
			}
			if (this.__data?.photo && trimmed !== this.__data.photo.src) {
				this.__data.photo.alt = "";
			}
			srcInput.value = trimmed;
			srcInput.dispatchEvent(new Event("input", { bubbles: true }));
			if (this.__data?.photo) {
				this.__data.photo.src = trimmed;
			}
			this.#syncPhotoState();
			document.dispatchEvent(new CustomEvent("profile-photo-change"));
		}

		#syncPhotoState() {
			const modal = this.#photoModal();
			const removeBtn = modal?.querySelector("[data-photo-remove]");
			const toolbar = modal?.querySelector(".pie__photo-modal-toolbar");
			if (removeBtn) {
				removeBtn.hidden = !this.hasPhoto();
			}
			if (toolbar) {
				toolbar.hidden = !removeBtn || removeBtn.hidden;
			}
		}

		#bindPhotoFields() {
			const fileInput = this.querySelector("#pie-photo-file");
			const modal = this.#photoModal();
			const removeBtn = modal?.querySelector("[data-photo-remove]");
			const dropzone = modal?.querySelector("[data-photo-dropzone]");

			const pickPhotoFile = async (file) => {
				if (!file) {
					return;
				}
				try {
					await this.#stagePhotoUpload(file);
					this.#closePhotoMediaPicker();
				} catch (error) {
					console.error(error);
					this.#setStatus(error?.message || "Could not prepare image.", "error");
				}
			};

			if (fileInput) {
				fileInput.addEventListener("change", async () => {
					const file = fileInput.files?.[0];
					fileInput.value = "";
					await pickPhotoFile(file);
				});
			}

			if (dropzone && fileInput) {
				dropzone.addEventListener("click", () => {
					if (!dropzone.disabled) {
						fileInput.click();
					}
				});
				["dragenter", "dragover"].forEach((eventName) => {
					dropzone.addEventListener(eventName, (event) => {
						event.preventDefault();
						dropzone.classList.add("is-dragover");
					});
				});
				["dragleave", "dragend", "drop"].forEach((eventName) => {
					dropzone.addEventListener(eventName, () => dropzone.classList.remove("is-dragover"));
				});
				dropzone.addEventListener("drop", (event) => {
					event.preventDefault();
					const file = event.dataTransfer?.files?.[0];
					void pickPhotoFile(file);
				});
			}

			if (modal) {
				modal.addEventListener("click", (ev) => {
					if (ev.target.closest("[data-media-modal-close]")) {
						this.#closePhotoMediaPicker();
					}
				});
			}

			if (removeBtn) {
				removeBtn.addEventListener("click", () => {
					this.removePhoto();
					this.#closePhotoMediaPicker();
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
			const modal = this.#photoModal();
			const grid = modal?.querySelector(".pie__media-grid");
			const status = modal?.querySelector(".pie__media-modal-status");
			if (!modal || !grid || !status) return;

			this.#portalPhotoModalIfNeeded();
			this.#syncPhotoState();
			modal.hidden = false;
			modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";
			status.textContent = "Loading images…";
			grid.innerHTML = "";

			let images = [];
			try {
				images = await this.#fetchPhotoList();
			} catch (error) {
				console.error(error);
			}

			if (!images.length) {
				status.textContent = "No images on this profile yet — use the area above to add your Profile Picture.";
				return;
			}

			status.textContent = "";
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
			const modal = this.#photoModal();
			if (!modal || modal.hidden) return;
			modal.hidden = true;
			modal.setAttribute("aria-hidden", "true");
			document.body.style.overflow = "";
			this.#restorePhotoModalHome();
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

			const location = ensureLocationDetailsFromSummary(normalizeLocationData(match.location, match.label));
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

			data.status = this.#getRadio("status") || "unknown";
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

			if (!hasRequiredProfileName(data)) {
				this.#setStatus("Enter a first name or last name before saving.", "error");
				const first = this.querySelector('[data-field="firstName"]');
				const last = this.querySelector('[data-field="lastName"]');
				(first || last)?.focus();
				return;
			}

			try {
				await this.prepareForPublish();
			} catch (error) {
				console.error(error);
				this.#setStatus(error?.message || "Could not upload profile photo.", "error");
				if (save) save.disabled = false;
				return;
			}

			const publishFiles = this.#buildInfoboxPublishFiles(this.#collect());
			const primary = publishFiles[0];
			const path = primary.path;
			const name = displayNameFrom(data) || `profile ${this.__personId}`;
			const creatingGedcom = publishFiles.some((file) => file.path.endsWith("/family-tree.ged"));

			if (save) save.disabled = true;
			this.#setStatus("Saving infobox…");

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
				if (pr.url) {
					this.#setStatus(`Infobox saved — pull request #${pr.number} (${pr.url}) opened for review.`, "success");
				} else {
					this.#setStatus("Infobox saved and committed.", "success");
				}
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
