(function () {
    "use strict";

    const PERSON_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
    const PLACEHOLDER_PREFIX = "__draft_";
    const DATE_PRECISIONS = [
        { value: "exact", label: "Exact" },
        { value: "before", label: "Before" },
        { value: "after", label: "After" },
        { value: "about", label: "About" },
        { value: "between", label: "Between" },
    ];
    const PARENT_CHILD_RELATION_OPTIONS = [
        { value: "biological", label: "Biological" },
        { value: "adopted", label: "Adoptive" },
        { value: "foster", label: "Foster" },
        { value: "step", label: "Step" },
        { value: "guardian", label: "Guardian" },
        { value: "other", label: "Other" },
    ];
    const PEOPLE_SUGGESTION_LIMIT = 8;

    const TEMPLATE = `
        <section class="prel" aria-label="Relationships editor">
            <style>
                .prel {
                    display: grid;
                    gap: 1rem;
                }

                .prel__legend-person {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                    min-width: 0;
                }

                .prel__legend-avatar {
                    width: 2.1rem;
                    height: 2.1rem;
                    border-radius: 999px;
                    object-fit: cover;
                    flex: 0 0 auto;
                    background: rgba(0, 0, 0, 0.06);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                }

                .prel__legend-name {
                    display: inline-block;
                    font-weight: 600;
                    line-height: 1.2;
                    vertical-align: middle;
                }

                .prel__toolbar-actions,
                .prel__inline-actions {
                    display: flex;
                    gap: 0.6rem;
                    flex-wrap: wrap;
                }

                .prel__person-preview,
                .prel__family-note,
                .prel__date-preview,
                .prel__empty-note {
                    margin: 0.35rem 0 0;
                    font-size: 0.88rem;
                    color: #54595d;
                }

                .prel__family-note {
                    margin: 0;
                }

                .prel__date-stack {
                    display: grid;
                    gap: 0.45rem;
                }

                .prel__date-row {
                    display: grid;
                    grid-template-columns: minmax(8rem, 10rem) minmax(0, 1fr);
                    gap: 0.5rem;
                }

                .prel__empty {
                    padding: 1rem 1.1rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    border-radius: 0.75rem;
                    background: #fff;
                }

				.prel__person-picker {
					position: relative;
				}

				.prel__person-picker .pie__suggestions {
					top: calc(100% + 0.3rem);
				}

                .prel__empty h3 {
                    margin: 0 0 0.35rem;
                    font-size: 1rem;
                }

				.prel__add-relationship-grid {
					grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
				}

				.prel__person-picker .pie__suggestion-button span {
					color: var(--color-subtle, #72777d);
					font-size: 0.78rem;
				}

                .prel__status[data-type="error"] {
                    border-color: rgba(177, 31, 31, 0.22);
                    background: #fff5f5;
                    color: #8f1d1d;
                }

                .prel__status[data-type="success"] {
                    border-color: rgba(20, 94, 57, 0.22);
                    background: #f3fff8;
                    color: #145e39;
                }

                body.theme-dark .prel__person-preview,
                body.theme-dark .prel__family-note,
                body.theme-dark .prel__date-preview,
                body.theme-dark .prel__empty-note {
                    color: #c8ccd1;
                }

				body.theme-dark .prel__legend-avatar {
					background: rgba(255, 255, 255, 0.06);
					border-color: rgba(255, 255, 255, 0.1);
				}

                body.theme-dark .prel__empty {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: #1a1e24;
                }

                @media (max-width: 900px) {
                    .prel__date-row {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <form class="pie" autocomplete="off">
                <div class="pie__status prel__status" role="status" hidden></div>
                <div class="prel__list"></div>
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

    function idValue(id) {
        return /^\d+$/.test(String(id)) ? Number(id) : String(id);
    }

    function isPlaceholderId(value) {
        return normalizeId(value).startsWith(PLACEHOLDER_PREFIX);
    }

    function normalizeParentChildType(value) {
        const normalized = String(value || "").trim().toLowerCase();
        if (!normalized || normalized === "birth" || normalized === "biological" || normalized === "natural") {
            return "biological";
        }
        if (["adopted", "foster", "step", "guardian", "other"].includes(normalized)) {
            return normalized;
        }
        return "other";
    }

    function normalizePartnerKind(value) {
        const normalized = String(value || "").trim().toLowerCase();
        if (["wife", "husband", "spouse"].includes(normalized)) {
            return "spouse";
        }
        if (["fiance", "fiancee"].includes(normalized)) {
            return "fiance";
        }
        if (normalized === "partner") {
            return "partner";
        }
        if (["ex-wife", "ex-husband", "ex-spouse", "divorced"].includes(normalized)) {
            return "ex-spouse";
        }
        if (["ex-partner", "former-partner", "former partner"].includes(normalized)) {
            return "ex-partner";
        }
        if (normalized === "other") {
            return "other";
        }
        return normalized ? "other" : "partner";
    }

    function partnerKindFromContextualRole(value) {
        return normalizePartnerKind(value);
    }

    function partnerKindDefaultFromEvents(events = {}) {
        if (events?.divorce?.date || events?.divorce?.place) return "ex-spouse";
        if ((events?.engagement?.date || events?.engagement?.place) && !(events?.marriage?.date || events?.marriage?.place)) {
            return "fiance";
        }
        if (events?.marriage?.date || events?.marriage?.place) return "spouse";
        return "partner";
    }

    function contextualPartnerRole(kind, selfSex, relatedSex) {
        const generic = normalizePartnerKind(kind);
        if (generic === "spouse") {
            if (selfSex === "male" && relatedSex === "female") return "wife";
            if (selfSex === "female" && relatedSex === "male") return "husband";
            return "spouse";
        }
        if (generic === "ex-spouse") {
            if (selfSex === "male" && relatedSex === "female") return "ex-wife";
            if (selfSex === "female" && relatedSex === "male") return "ex-husband";
            return "ex-spouse";
        }
        if (generic === "ex-partner") return "ex-partner";
        if (generic === "fiance") return "fiance";
        if (generic === "other") return "other";
        return "partner";
    }

    function relatedPartnerLabel(kind, relatedSex) {
        const generic = normalizePartnerKind(kind);
        if (generic === "spouse") {
            if (relatedSex === "female") return "Wife";
            if (relatedSex === "male") return "Husband";
            return "Spouse";
        }
        if (generic === "ex-spouse") {
            if (relatedSex === "female") return "Ex wife";
            if (relatedSex === "male") return "Ex husband";
            return "Ex spouse";
        }
        if (generic === "fiance") return "Fiance";
        if (generic === "ex-partner") return "Ex partner";
        if (generic === "other") return "Other";
        return "Partner";
    }

    function normalizeDatePrecision(value) {
        const normalized = String(value || "").trim().toLowerCase();
        return DATE_PRECISIONS.some((entry) => entry.value === normalized) ? normalized : "exact";
    }

    function emptyEventDraft() {
        return { date: "", precision: "exact", place: "" };
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

    function eventDraftFromEvent(event) {
        return {
            date: normalizeStructuredDate(event?.iso || event?.date || ""),
            precision: normalizeDatePrecision(event?.precision),
            place: String(event?.place || "").trim(),
            circa: Boolean(event?.circa),
            circaTo: Boolean(event?.circaTo),
        };
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
        const precision = normalizeDatePrecision(value?.precision);
        const from = String(value?.date || '').trim();
        const to = String(value?.dateTo || '').trim();
        const raw = precision === 'between' && to ? `${from}|${to}` : from;
        return datePreview(raw, precision);
    }

    function storedToDateInputValue(value) {
        return normalizeStructuredDate(value);
    }

    function renderDateInput(familyId, eventKey, dataDate, fieldName) {
        const id = `prel-${familyId}-${eventKey}-${fieldName}`;
        return `<span class="pie__date-input-wrap">
            <input id="${escapeHtml(id)}" type="date" data-family-id="${escapeHtml(familyId)}" data-event-key="${escapeHtml(eventKey)}" data-field="${escapeHtml(fieldName)}" class="pie__date-input" value="${escapeHtml(storedToDateInputValue(dataDate))}">
            <button type="button" class="pie__date-picker-button" aria-label="Choose date">
                <i class="bi bi-calendar3" aria-hidden="true"></i>
            </button>
        </span>`;
    }

    function renderDateRange(familyId, eventKey, draft) {
        return `<div class="pie__date-range">
            <div class="pie__date-range-row pie__date-range-row--from">
                ${renderDateInput(familyId, eventKey, draft.date, 'eventDate')}
                <label class="pie__circa"><input type="checkbox" data-family-id="${escapeHtml(familyId)}" data-event-key="${escapeHtml(eventKey)}" data-field="eventCirca"> Circa</label>
            </div>
            <div class="pie__date-range-row pie__date-range-row--divider">
                <span class="pie__date-and">and</span>
            </div>
            <div class="pie__date-range-row pie__date-range-row--to">
                ${renderDateInput(familyId, eventKey, draft.dateTo || '', 'eventDateTo')}
                <label class="pie__circa"><input type="checkbox" data-family-id="${escapeHtml(familyId)}" data-event-key="${escapeHtml(eventKey)}" data-field="eventCircaTo"> Circa</label>
            </div>
        </div>`;
    }

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

    function renderLocationField({ path, id, placeholder, familyId, eventKey }) {
        return `<location-field-editor data-location-path="${escapeHtml(path)}" data-family-id="${escapeHtml(familyId)}" data-event-key="${escapeHtml(eventKey)}" input-id="${escapeHtml(id)}" placeholder="${escapeHtml(placeholder)}" toggle-label="Show and Edit Location Details"></location-field-editor>`;
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
            const apiBase = String(
                window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "",
            ).trim().replace(/\/+$/, "");
            if (!apiBase) return "";
            return new URL("location-search.php", `${apiBase}/`).href;
        })();
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
                    location: result.location || {},
                }))
                .filter((result) => result.label || (result.location && Object.keys(result.location).length));

            if (manualMatch && !results.some((r) => r.label.toLowerCase() === manualMatch.label.toLowerCase())) {
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

    function eventFromDraft(draft) {
        const normalizedDate = normalizeStructuredDate(draft?.date || "");
        const place = String(draft?.place || "").trim();
        const precision = normalizeDatePrecision(draft?.precision);
        if (!normalizedDate && !place) {
            return null;
        }
        const rawDate = normalizedDate ? formatGedcomDateFromStructured(normalizedDate, precision) : null;
        return {
            date: rawDate || null,
            year: yearFromStructuredDate(normalizedDate),
            iso: normalizedDate || null,
            precision,
            display: normalizedDate ? datePreview(normalizedDate, precision) : null,
            place: place || null,
        };
    }

    class ProfileRelationshipsEditor extends HTMLElement {
        connectedCallback() {
            if (this.__rendered) return;
            this.__rendered = true;
            this.__personId = normalizeId(this.getAttribute("person") || new URLSearchParams(window.location.search).get("person"));
            this.__record = null;
            this.__relatedRecords = new Map();
            this.__peopleIndex = new Map();
            this.__families = new Map();
            this.__savedSnapshot = "";
            this.__history = [];
            this.__historyIndex = -1;
            this.__historyRestoring = false;
            this.__historyDebounceTimer = 0;
            this.__peopleRegistry = [];
            this.__pickerState = null;
            this.__lastPublishedState = null;
            this.__unionSeed = Date.now();
            this.__slotSeed = 0;
            this.__placeholderSeed = 0;
            this.innerHTML = TEMPLATE;

            this.__onClick = (event) => this.#handleClick(event);
            this.__onInput = (event) => this.#handleInput(event);
            this.__onChange = (event) => this.#handleChange(event);

            this.addEventListener("click", this.__onClick);
            this.addEventListener("input", this.__onInput);
            this.addEventListener("change", this.__onChange);
            this.addEventListener("keydown", (event) => this.#handlePickerKeydown(event), true);
            this.#registerProviders();

            if (!PERSON_ID_PATTERN.test(this.__personId)) {
                this.#setStatus("No valid profile id was provided.", "error");
                return;
            }

            void this.#loadExisting();
        }

        disconnectedCallback() {
            this.removeEventListener("click", this.__onClick);
            this.removeEventListener("input", this.__onInput);
            this.removeEventListener("change", this.__onChange);
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

        #registerProviders() {
            if (!Array.isArray(window.__extraPublishFileProviders)) window.__extraPublishFileProviders = [];
            this.__extraPublishProvider = async () => this.#buildPublishFiles();
            window.__extraPublishFileProviders.push(this.__extraPublishProvider);

            if (!Array.isArray(window.__extraDirtyStateProviders)) window.__extraDirtyStateProviders = [];
            this.__dirtyStateProvider = () => this.#isDirty();
            window.__extraDirtyStateProviders.push(this.__dirtyStateProvider);

            if (!Array.isArray(window.__extraDirtyStateResetCallbacks)) window.__extraDirtyStateResetCallbacks = [];
            this.__dirtyStateReset = () => this.#acceptPublishedState();
            window.__extraDirtyStateResetCallbacks.push(this.__dirtyStateReset);
        }

        #bindLocationFields() {
            this.__locationFields = new Map();
            this.querySelectorAll('location-field-editor[data-location-path]').forEach((field) => {
                const path = String(field.getAttribute('data-location-path') || '').trim();
                if (!path) return;

                const parts = path.split('.');
                const state = {
                    path,
                    field,
                    familyId: parts[1] || null,
                    eventKey: parts[3] || null,
                };
                this.__locationFields.set(path, state);
                field.detailFields = LOCATION_DETAIL_FIELDS;
                field.searchProvider = searchLocationMatches;
                field.formatSummary = infoboxApi().formatLocationSummary || ((value, fallback) => fallback || value?.label || '');
                field.normalizeValue = infoboxApi().normalizeLocationData || ((value) => value || {});
                field.ensureDetails = infoboxApi().ensureLocationDetailsFromSummary || ((value) => value || {});
                field.hasDetails = infoboxApi().hasLocationDetails || ((value) => LOCATION_DETAIL_FIELDS.some((detail) => String(value?.[detail.key] || '').trim()));
                field.emptyValueFactory = infoboxApi().emptyLocationData || (() => ({}));
            });
        }

        #configureDateFields() {
            this.querySelectorAll('date-field-editor[data-family-id][data-event-key]').forEach((field) => {
                const familyId = String(field.getAttribute('data-family-id') || '').trim();
                const eventKey = String(field.getAttribute('data-event-key') || '').trim();
                const family = this.__families.get(familyId);
                const draft = eventDraftFromEvent(family?.events?.[eventKey]);
                let from = String(draft.date || '').trim();
                let to = '';
                if (draft.precision === 'between' && from.includes('|')) {
                    const parts = from.split('|').map((item) => String(item || '').trim());
                    from = parts[0] || '';
                    to = parts[1] || '';
                }
                field.previewFormatter = componentDatePreview;
                field.setValue({
                    precision: draft.precision,
                    date: from,
                    dateTo: to,
                    circa: Boolean(draft.circa),
                    circaTo: Boolean(draft.circaTo),
                });
            });
        }

        #fillLocationFields() {
            for (const family of this.__families.values()) {
                if (!family || family.removed) continue;
                for (const eventKey of ['engagement', 'marriage', 'divorce']) {
                    const path = `family.${family.id}.events.${eventKey}.location`;
                    const state = this.__locationFields?.get(path);
                    if (!state) continue;
                    const location = family.events?.[eventKey]?.location || null;
                    this.#applyLocationValue(path, location, { expanded: false });
                    if (family.events?.[eventKey]?.place) {
                        const searchInput = state.field?.querySelector('.location-field-editor__search');
                        if (searchInput) {
                            searchInput.value = String(family.events[eventKey].place || '');
                        }
                    }
                }
            }
        }

        #applyLocationValue(path, value, { expanded = false } = {}) {
            const state = this.__locationFields?.get(path);
            if (!state?.field) return;
            state.field.setValue(value, { expanded });
        }

        #collectLocationValue(path) {
            const state = this.__locationFields?.get(path);
            const info = infoboxApi();
            return state?.field?.getValue?.() || (info.emptyLocationData ? info.emptyLocationData() : {});
        }

        #openLocationDropdown(path) {
            const state = this.__locationFields?.get(path);
            const dropdown = state?.field?.querySelector('.location-field-editor__results');
            const input = state?.field?.querySelector('.location-field-editor__search');
            if (!dropdown || !input) return;
            dropdown.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        }

        #closeLocationDropdown(path) {
            const state = this.__locationFields?.get(path);
            state?.field?.closeDropdown?.();
        }

        #setLocationDetailsExpanded(path, expanded) {
            const state = this.__locationFields?.get(path);
            state?.field?.setExpanded?.(expanded);
        }

        #syncLocationSearchFromDetails(path) {
            this.__locationFields?.get(path)?.field?.syncSearchFromValue?.();
        }

        #updateDatePreview(familyId, eventKey) {
            const family = this.__families.get(String(familyId || ""));
            if (!family || !family.events || !family.events[eventKey]) return;
            const field = this.querySelector(`date-field-editor[data-family-id="${String(familyId || '')}"][data-event-key="${String(eventKey || '')}"]`);
            if (!field) return;
            const draft = eventDraftFromEvent(family.events[eventKey]);
            let from = String(draft.date || '').trim();
            let to = '';
            if (draft.precision === 'between' && from.includes('|')) {
                const parts = from.split('|').map((item) => String(item || '').trim());
                from = parts[0] || '';
                to = parts[1] || '';
            }
            field.setValue({
                precision: draft.precision,
                date: from,
                dateTo: to,
                circa: Boolean(draft.circa),
                circaTo: Boolean(draft.circaTo),
            });
        }

        async #loadPeopleRegistry() {
            if (this.__peopleRegistry.length) {
                return this.__peopleRegistry;
            }
            try {
                if (window.PeopleRegistry?.loadPeopleRegistry) {
                    this.__peopleRegistry = await window.PeopleRegistry.loadPeopleRegistry({ refresh: true });
                    return this.__peopleRegistry;
                }
                const response = await fetch(resolveSiteUrl("people/people.json"), { cache: "no-store" });
                const payload = await response.json();
                this.__peopleRegistry = Array.isArray(payload?.people) ? payload.people : [];
            } catch (error) {
                this.__peopleRegistry = [];
            }
            return this.__peopleRegistry;
        }

        #statusEl() {
            return this.querySelector(".prel__status");
        }

        #listEl() {
            return this.querySelector(".prel__list");
        }

        #setStatus(message, type = "info") {
            const status = this.#statusEl();
            if (!status) return;
            status.textContent = message || "";
            status.dataset.type = type;
            status.hidden = !message;
        }

        #notifyDirtyChange() {
            document.dispatchEvent(new CustomEvent("profile-editor-dirty-change"));
        }

        #makeSlot(kind, personId = "") {
            this.__slotSeed += 1;
            return { slotId: `${kind}-${this.__slotSeed}`, personId: normalizeId(personId) };
        }

        #makePlaceholder(kind) {
            this.__placeholderSeed += 1;
            return `${PLACEHOLDER_PREFIX}${kind}_${this.__placeholderSeed}`;
        }

        #nextUnionId() {
            let candidate = "";
            do {
                candidate = `F${this.__unionSeed++}`;
            } while (this.__families.has(candidate));
            return candidate;
        }

        #emptyFamily(mode, options = {}) {
            const defaultLinkType = normalizeParentChildType(options.linkType || "biological");
            const defaultPartnerKind = normalizePartnerKind(options.partnerKind || "partner");
            const family = {
                id: this.#nextUnionId(),
                schema: "genepedia/union@1",
                source: {},
                partners: [],
                children: [],
                parentChildLinks: [],
                relationship: { type: defaultPartnerKind, label: "" },
                events: {
                    engagement: emptyEventDraft(),
                    marriage: emptyEventDraft(),
                    divorce: emptyEventDraft(),
                },
                persisted: false,
                removed: false,
            };

            if (mode === "parent") {
                const childSlot = this.#makeSlot("child", this.__personId);
                const parentSlot = this.#makeSlot("partner", this.#makePlaceholder("parent"));
                family.children.push(childSlot);
                family.partners.push(parentSlot);
                family.parentChildLinks.push({
                    parentSlotId: parentSlot.slotId,
                    childSlotId: childSlot.slotId,
                    type: defaultLinkType,
                    label: "",
                });
            }

            if (mode === "partner") {
                family.partners.push(this.#makeSlot("partner", this.__personId));
                family.partners.push(this.#makeSlot("partner", this.#makePlaceholder("partner")));
            }

            if (mode === "child") {
                const selfPartner = this.#makeSlot("partner", this.__personId);
                const childSlot = this.#makeSlot("child", this.#makePlaceholder("child"));
                family.partners.push(selfPartner);
                family.children.push(childSlot);
                family.parentChildLinks.push({
                    parentSlotId: selfPartner.slotId,
                    childSlotId: childSlot.slotId,
                    type: defaultLinkType,
                    label: "",
                });
            }

            return family;
        }

        #findSlot(family, slotId) {
            return [...family.partners, ...family.children].find((slot) => slot.slotId === slotId) || null;
        }

        #selfPartnerSlot(family) {
            return family.partners.find((slot) => normalizeId(slot.personId) === this.__personId) || null;
        }

        #selfChildSlot(family) {
            return family.children.find((slot) => normalizeId(slot.personId) === this.__personId) || null;
        }

        #linkEntry(family, parentSlotId, childSlotId, create = false) {
            let entry = family.parentChildLinks.find((item) => item.parentSlotId === parentSlotId && item.childSlotId === childSlotId) || null;
            if (!entry && create) {
                entry = { parentSlotId, childSlotId, type: "biological", label: "" };
                family.parentChildLinks.push(entry);
            }
            return entry;
        }

        #existingParentChildLink(unionId, parentId, childId, union) {
            for (const entry of Array.isArray(union?.parentChildLinks) ? union.parentChildLinks : []) {
                if (normalizeId(entry?.parentId) === normalizeId(parentId) && normalizeId(entry?.childId) === normalizeId(childId)) {
                    return {
                        type: normalizeParentChildType(entry?.type),
                        label: String(entry?.label || "").trim(),
                    };
                }
            }

            const childRecord = normalizeId(childId) === this.__personId
                ? this.__record
                : this.__relatedRecords.get(normalizeId(childId));
            const childLink = childRecord?.relationships?.parentLinks?.find((entry) => String(entry?.unionId || "") === String(unionId) && normalizeId(entry?.id) === normalizeId(parentId));
            if (childLink) {
                return {
                    type: normalizeParentChildType(childLink.type),
                    label: String(childLink.label || "").trim(),
                };
            }

            const parentRecord = normalizeId(parentId) === this.__personId
                ? this.__record
                : this.__relatedRecords.get(normalizeId(parentId));
            const parentLink = parentRecord?.relationships?.childLinks?.find((entry) => String(entry?.unionId || "") === String(unionId) && normalizeId(entry?.id) === normalizeId(childId));
            if (parentLink) {
                return {
                    type: normalizeParentChildType(parentLink.type),
                    label: String(parentLink.label || "").trim(),
                };
            }

            return { type: "biological", label: "" };
        }

        #relationshipDraftForUnion(union) {
            const stored = union?.relationship;
            if (stored && typeof stored === "object") {
                return {
                    type: normalizePartnerKind(stored.type),
                    label: String(stored.label || "").trim(),
                };
            }

            const currentLink = this.__record?.relationships?.partnerLinks?.find((entry) => String(entry?.unionId || "") === String(union?.id || ""));
            if (currentLink) {
                return {
                    type: partnerKindFromContextualRole(currentLink.role),
                    label: String(currentLink.label || "").trim(),
                };
            }

            return {
                type: partnerKindDefaultFromEvents(union?.events),
                label: "",
            };
        }

        #familyDraftFromUnion(union) {
            const family = {
                id: String(union?.id || ""),
                schema: String(union?.schema || "genepedia/union@1"),
                source: cloneJson(union?.source || {}),
                partners: [],
                children: [],
                parentChildLinks: [],
                relationship: this.#relationshipDraftForUnion(union),
                events: {
                    engagement: eventDraftFromEvent(union?.events?.engagement),
                    marriage: eventDraftFromEvent(union?.events?.marriage),
                    divorce: eventDraftFromEvent(union?.events?.divorce),
                },
                persisted: true,
                removed: false,
            };

            for (const partnerId of union?.partners || []) {
                family.partners.push(this.#makeSlot("partner", normalizeId(partnerId)));
            }
            for (const childId of union?.children || []) {
                family.children.push(this.#makeSlot("child", normalizeId(childId)));
            }

            for (const parentSlot of family.partners) {
                for (const childSlot of family.children) {
                    const link = this.#existingParentChildLink(family.id, parentSlot.personId, childSlot.personId, union);
                    family.parentChildLinks.push({
                        parentSlotId: parentSlot.slotId,
                        childSlotId: childSlot.slotId,
                        type: normalizeParentChildType(link.type),
                        label: String(link.label || "").trim(),
                    });
                }
            }

            return family;
        }

        #serializeState() {
            const families = [...this.__families.values()]
                .map((family) => ({
                    id: family.id,
                    removed: Boolean(family.removed),
                    persisted: Boolean(family.persisted),
                    relationship: {
                        type: normalizePartnerKind(family.relationship?.type),
                        label: String(family.relationship?.label || "").trim(),
                    },
                    events: {
                        engagement: { ...family.events.engagement },
                        marriage: { ...family.events.marriage },
                        divorce: { ...family.events.divorce },
                    },
                    partners: family.partners.map((slot) => ({ slotId: slot.slotId, personId: normalizeId(slot.personId) })),
                    children: family.children.map((slot) => ({ slotId: slot.slotId, personId: normalizeId(slot.personId) })),
                    parentChildLinks: family.parentChildLinks.map((entry) => ({
                        parentSlotId: entry.parentSlotId,
                        childSlotId: entry.childSlotId,
                        type: normalizeParentChildType(entry.type),
                        label: String(entry.label || "").trim(),
                    })),
                }))
                .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
            return JSON.stringify(families);
        }

        #isDirty() {
            return this.#serializeState() !== this.__savedSnapshot;
        }

        #setSavedBaseline({ quiet = false } = {}) {
            this.__savedSnapshot = this.#serializeState();
            this.#replaceHistoryWithCurrentState();
            if (!quiet) {
                this.#notifyDirtyChange();
            }
        }

        #replaceHistoryWithCurrentState() {
            this.__history = [this.__savedSnapshot || this.#serializeState()];
            this.__historyIndex = this.__history.length - 1;
        }

        #scheduleHistoryCapture() {
            if (this.__historyRestoring) {
                return;
            }
            window.clearTimeout(this.__historyDebounceTimer);
            this.__historyDebounceTimer = window.setTimeout(() => this.#pushHistorySnapshot(), 120);
        }

        #pushHistorySnapshot() {
            if (this.__historyRestoring) return;
            const snapshot = this.#serializeState();
            if (!snapshot) return;
            if (this.__historyIndex >= 0 && this.__history[this.__historyIndex] === snapshot) return;
            this.__history = this.__history.slice(0, this.__historyIndex + 1);
            this.__history.push(snapshot);
            this.__historyIndex = this.__history.length - 1;
        }

        #restoreSnapshot(snapshot) {
            if (!snapshot) return;
            this.__historyRestoring = true;
            try {
                const families = JSON.parse(snapshot);
                if (Array.isArray(families)) {
                    this.__families = new Map(families.map((family) => [family.id, cloneJson(family)]));
                }
            } catch (error) {
                // ignore malformed history entries
            } finally {
                this.__historyRestoring = false;
            }
            void this.#refreshPeopleIndex().then(() => {
                this.#render();
                this.#notifyDirtyChange();
            });
        }

        undo() {
            if (this.__historyIndex <= 0) return;
            this.__historyIndex -= 1;
            this.#restoreSnapshot(this.__history[this.__historyIndex]);
        }

        redo() {
            if (this.__historyIndex >= this.__history.length - 1) return;
            this.__historyIndex += 1;
            this.#restoreSnapshot(this.__history[this.__historyIndex]);
        }

        triggerToolbarAction(action, detail = {}) {
            if (action === "add-parent") {
                const family = this.#emptyFamily("parent", { linkType: detail.parentType || "biological" });
                this.__families.set(family.id, family);
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }
            if (action === "add-partner") {
                const family = this.#emptyFamily("partner", { partnerKind: detail.partnerKind || "partner" });
                this.__families.set(family.id, family);
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }
            if (action === "add-child") {
                const partnerFamilies = [...this.__families.values()].filter((family) => !family.removed && this.#selfPartnerSlot(family));
                if (partnerFamilies.length === 1) {
                    this.#addChildToFamily(partnerFamilies[0].id, detail.childType || "biological");
                    return;
                }
                if (partnerFamilies.length > 1) {
                    this.#setStatus("Use ‘Add child to this family’ on the correct partner card when you have multiple partner families.", "info");
                    return;
                }
                const family = this.#emptyFamily("child", { linkType: detail.childType || "biological" });
                this.__families.set(family.id, family);
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
            }
        }

        #acceptPublishedState() {
            if (this.__lastPublishedState) {
                this.__record = cloneJson(this.__lastPublishedState.record);
                this.__relatedRecords = new Map(this.__lastPublishedState.relatedRecords.map(([id, record]) => [String(id), cloneJson(record)]));
                this.__families = new Map(this.__lastPublishedState.families.map((family) => [family.id, cloneJson(family)]));
                void this.#refreshPeopleIndex().then(() => this.#render());
            }
            this.#setSavedBaseline({ quiet: true });
        }

        async #loadExisting() {
            this.#setStatus("Loading relationships…");
            await ensurePeopleDb();

            let record = null;
            try {
                record = await window.PeopleDB.loadPerson(this.__personId);
            } catch (error) {
                record = null;
            }
            record = record ? cloneJson(record) : window.PeopleDB.emptyRecord(this.__personId);
            this.__record = record;

            const unionIds = [...new Set([
                ...(record.relationships?.parentUnions || []).map((value) => String(value)),
                ...(record.relationships?.spouseUnions || []).map((value) => String(value)),
            ])];

            const unions = (await Promise.all(unionIds.map(async (unionId) => {
                try {
                    return await window.PeopleDB.loadUnion(unionId);
                } catch (error) {
                    return null;
                }
            }))).filter(Boolean).map((union) => cloneJson(union));

            const memberIds = new Set();
            for (const union of unions) {
                for (const id of union.partners || []) memberIds.add(normalizeId(id));
                for (const id of union.children || []) memberIds.add(normalizeId(id));
            }
            memberIds.delete(this.__personId);

            this.__relatedRecords = new Map();
            for (const id of memberIds) {
                if (!id || isPlaceholderId(id)) continue;
                try {
                    const related = await window.PeopleDB.loadPerson(id);
                    if (related) {
                        this.__relatedRecords.set(id, cloneJson(related));
                    }
                } catch (error) {
                    // ignore unresolved members here; save validation will catch them
                }
            }

            this.__families = new Map(unions.map((union) => [String(union.id), this.#familyDraftFromUnion(union)]));
            await this.#loadPeopleRegistry();
            await this.#refreshPeopleIndex();
            this.#render();
            this.#setSavedBaseline({ quiet: true });
            document.querySelector("profile-editor")?.refreshDirtyState?.();
            this.#setStatus(this.#buildCards().length ? "" : "Add a parent, partner, or child to start editing relationships.");
        }

        async #refreshPeopleIndex() {
            const ids = new Set([this.__personId]);
            for (const family of this.__families.values()) {
                for (const slot of [...family.partners, ...family.children]) {
                    const id = normalizeId(slot.personId);
                    if (id && !isPlaceholderId(id)) ids.add(id);
                }
            }

            const nextRecords = new Map();
            for (const id of ids) {
                if (id === this.__personId) {
                    nextRecords.set(id, this.__record);
                    continue;
                }
                let record = this.__relatedRecords.get(id) || null;
                if (!record) {
                    try {
                        record = await window.PeopleDB.loadPerson(id);
                    } catch (error) {
                        record = null;
                    }
                }
                if (record) {
                    nextRecords.set(id, cloneJson(record));
                }
            }
            this.__relatedRecords = nextRecords;

            const idsForNames = [...ids].filter((id) => id && !isPlaceholderId(id));
            let names = new Map();
            try {
                names = await window.PeopleDB.resolveNames(idsForNames);
            } catch (error) {
                names = new Map();
            }

            this.__peopleIndex = new Map();
            for (const id of idsForNames) {
                const record = id === this.__personId ? this.__record : this.__relatedRecords.get(id);
                this.__peopleIndex.set(id, {
                    name: record?.names?.display || names.get(id) || `Profile ${id}`,
                    sex: record?.sex || "unknown",
                    photoUrl: this.#resolvePhotoUrl(id, record),
                });
            }
        }

        #resolvePhotoUrl(personId, record) {
            const media = record?.media?.primary || null;
            if (media && typeof window.App?.resolvePreferredPersonMediaUrl === "function") {
                const resolved = String(window.App.resolvePreferredPersonMediaUrl(personId, media) || "").trim();
                if (resolved) return resolved;
            }
            if (media?.remote) return String(media.remote).trim();
            if (media?.local && typeof window.App?.resolvePersonMediaUrl === "function") {
                return String(window.App.resolvePersonMediaUrl(personId, media.local) || "").trim();
            }
            return resolveSiteUrl("assets/default-profile-photo.svg");
        }

        #personName(personId) {
            const id = normalizeId(personId);
            if (!id) return "Choose a profile";
            if (isPlaceholderId(id)) return "Choose a profile";
            return this.__peopleIndex.get(id)?.name || `Profile ${id}`;
        }

        #personSex(personId) {
            return this.__peopleIndex.get(normalizeId(personId))?.sex || "unknown";
        }

        #personPhoto(personId) {
            return this.__peopleIndex.get(normalizeId(personId))?.photoUrl || resolveSiteUrl("assets/default-profile-photo.svg");
        }

        #renderLegendHtml(personId, displayName) {
            return `<span class="prel__legend-person"><img class="prel__legend-avatar" src="${escapeHtml(this.#personPhoto(personId))}" alt="${escapeHtml(displayName)}"><span class="prel__legend-name">${escapeHtml(displayName)}</span></span>`;
        }

        #renderPersonPickerRow(family, slot, displayName, personId) {
            if (personId && !isPlaceholderId(personId)) {
                return "";
            }
            return `
                <div class="pie__row">
                    <label class="pie__label" for="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-person">Person</label>
                    <div class="pie__field pie__field--suggest prel__person-picker">
                        <input id="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-person" type="text" value="" placeholder="Search profile by name or id" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-field="personId">
                        <p class="prel__person-preview">${escapeHtml(displayName)}</p>
                        <div class="pie__suggestions" data-picker-results hidden></div>
                    </div>
                </div>
            `;
        }

        #familyMembersSummary(ids) {
            const values = [...new Set((ids || []).map((id) => normalizeId(id)).filter(Boolean).filter((id) => !isPlaceholderId(id)))];
            if (!values.length) return "None";
            return values.map((id) => this.#personName(id)).join(", ");
        }

        #buildCards() {
            const cards = [];
            for (const family of [...this.__families.values()].filter((entry) => !entry.removed)) {
                const selfPartner = this.#selfPartnerSlot(family);
                const selfChild = this.#selfChildSlot(family);

                if (selfChild) {
                    for (const parentSlot of family.partners) {
                        cards.push({ kind: "parent", familyId: family.id, slotId: parentSlot.slotId, selfSlotId: selfChild.slotId });
                    }
                }

                if (selfPartner) {
                    for (const partnerSlot of family.partners) {
                        if (partnerSlot.slotId === selfPartner.slotId) continue;
                        cards.push({ kind: "partner", familyId: family.id, slotId: partnerSlot.slotId, selfSlotId: selfPartner.slotId });
                    }
                    for (const childSlot of family.children) {
                        cards.push({ kind: "child", familyId: family.id, slotId: childSlot.slotId, selfSlotId: selfPartner.slotId });
                    }
                }
            }

            const order = { parent: 0, partner: 1, child: 2 };
            cards.sort((left, right) => {
                if (order[left.kind] !== order[right.kind]) {
                    return order[left.kind] - order[right.kind];
                }
                const leftFamily = this.__families.get(left.familyId);
                const rightFamily = this.__families.get(right.familyId);
                const leftSlot = this.#findSlot(leftFamily, left.slotId);
                const rightSlot = this.#findSlot(rightFamily, right.slotId);
                return this.#personName(leftSlot?.personId).localeCompare(this.#personName(rightSlot?.personId), undefined, { sensitivity: "base" });
            });
            return cards;
        }

        #renderSelectOptions(options, selected) {
            return options.map((option) => `
                <option value="${escapeHtml(option.value)}"${String(option.value) === String(selected) ? " selected" : ""}>${escapeHtml(option.label)}</option>
            `).join("");
        }

        #partnerOptionsFor(personId) {
            const relatedSex = this.#personSex(personId);
            return [
                { value: "spouse", label: relatedPartnerLabel("spouse", relatedSex) },
                { value: "fiance", label: relatedPartnerLabel("fiance", relatedSex) },
                { value: "partner", label: relatedPartnerLabel("partner", relatedSex) },
                { value: "ex-spouse", label: relatedPartnerLabel("ex-spouse", relatedSex) },
                { value: "ex-partner", label: relatedPartnerLabel("ex-partner", relatedSex) },
                { value: "other", label: "Other" },
            ];
        }

        #renderDateEditor(familyId, eventKey, draft, label) {
            const locationPath = `family.${familyId}.events.${eventKey}.location`;
            const placeId = `prel-${familyId}-${eventKey}-place`;
            const dateId = `prel-${familyId}-${eventKey}-date`;

            return `
                <div class="pie__row pie__row--date">
                    <label class="pie__label" for="${escapeHtml(dateId)}">${escapeHtml(label)} Date</label>
                    <div class="pie__field pie__field--date">
                        <date-field-editor data-family-id="${escapeHtml(familyId)}" data-event-key="${escapeHtml(eventKey)}" input-id="${escapeHtml(dateId)}" layout="inline" show-preview precisions="exact,before,after,about,between"></date-field-editor>
                    </div>
                </div>
                <div class="pie__row pie__row--location">
                    <label class="pie__label" for="${escapeHtml(placeId)}">${escapeHtml(label)} Place</label>
                    <div class="pie__field">
                        ${renderLocationField({ path: locationPath, id: placeId, placeholder: "Place", familyId, eventKey })}
                    </div>
                </div>
            `;
        }

        #renderCard(card) {
            const family = this.__families.get(card.familyId);
            if (!family) return "";
            const slot = this.#findSlot(family, card.slotId);
            if (!slot) return "";
            const personId = normalizeId(slot.personId);
            const displayName = this.#personName(personId);
            const summaryIds = card.kind === "parent"
                ? family.children.filter((child) => child.slotId !== card.selfSlotId).map((child) => child.personId)
                : card.kind === "partner"
                    ? family.children.map((child) => child.personId)
                    : family.partners.filter((partner) => partner.slotId !== card.selfSlotId).map((partner) => partner.personId);
            const summaryText = card.kind === "parent"
                ? `Other children in family ${family.id}: ${this.#familyMembersSummary(summaryIds)}`
                : card.kind === "partner"
                    ? `Children in family ${family.id}: ${this.#familyMembersSummary(summaryIds)}`
                    : `Other parents in family ${family.id}: ${this.#familyMembersSummary(summaryIds)}`;

            if (card.kind === "partner") {
                const kind = normalizePartnerKind(family.relationship?.type);
                return `
                    <fieldset class="pie__group" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-kind="partner">
                        <legend class="pie__legend">${this.#renderLegendHtml(personId, displayName)}</legend>
                        ${this.#renderPersonPickerRow(family, slot, displayName, personId)}
                        <div class="pie__row">
                            <label class="pie__label" for="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-status">Partner Status</label>
                            <div class="pie__field">
                                <select id="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-status" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-field="partnerKind">
                                    ${this.#renderSelectOptions(this.#partnerOptionsFor(personId), kind)}
                                </select>
                            </div>
                        </div>
                        ${kind === "other" ? `
                            <div class="pie__row">
                                <label class="pie__label" for="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-custom">Custom Label</label>
                                <div class="pie__field">
                                    <input id="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-custom" type="text" value="${escapeHtml(family.relationship?.label || "")}" placeholder="e.g. Civil partner" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-field="partnerLabel">
                                </div>
                            </div>
                        ` : ""}
                        <div class="pie__row">
                            <span class="pie__label">Family</span>
                            <div class="pie__field">
                                <p class="prel__family-note">${escapeHtml(summaryText)}</p>
                            </div>
                        </div>
                        ${this.#renderDateEditor(family.id, "engagement", family.events.engagement, "Engagement")}
                        ${kind === "spouse" ? this.#renderDateEditor(family.id, "marriage", family.events.marriage, "Marriage") : ""}
                        ${kind === "ex-spouse" ? this.#renderDateEditor(family.id, "divorce", family.events.divorce, "Divorce") : ""}
                        <div class="pie__row">
                            <span class="pie__label">Actions</span>
                            <div class="pie__field prel__inline-actions">
                                <button type="button" class="page-editor__button" data-action="add-child-to-family" data-family-id="${escapeHtml(family.id)}">
                                    <i class="bi bi-person-plus" aria-hidden="true"></i>
                                    <span>Add child to this family</span>
                                </button>
                                <button type="button" class="page-editor__button page-editor__sidebar-delete" data-action="remove-card" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-kind="partner">
                                    <i class="bi bi-trash" aria-hidden="true"></i>
                                    <span>Remove</span>
                                </button>
                            </div>
                        </div>
                    </fieldset>
                `;
            }

            const selfSlotId = card.selfSlotId;
            const isParentCard = card.kind === "parent";
            const link = isParentCard
                ? this.#linkEntry(family, slot.slotId, selfSlotId, true)
                : this.#linkEntry(family, selfSlotId, slot.slotId, true);
            const relationType = normalizeParentChildType(link?.type);
            const relationLabel = String(link?.label || "").trim();
            const selectLabel = isParentCard ? "Parent type" : "Child type";
            const customPlaceholder = isParentCard ? "e.g. Mentor" : "e.g. Ward";
            const actionButton = isParentCard
                ? `
                    <button type="button" class="page-editor__button" data-action="add-coparent" data-family-id="${escapeHtml(family.id)}">
                        <i class="bi bi-person-plus" aria-hidden="true"></i>
                        <span>Add co-parent to this family</span>
                    </button>
                `
                : "";

            return `
                <fieldset class="pie__group" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-kind="${escapeHtml(card.kind)}">
                    <legend class="pie__legend">${this.#renderLegendHtml(personId, displayName)}</legend>
                    ${this.#renderPersonPickerRow(family, slot, displayName, personId)}
                    <div class="pie__row">
                        <label class="pie__label" for="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-type">${escapeHtml(selectLabel)}</label>
                        <div class="pie__field">
                            <select id="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-type" data-family-id="${escapeHtml(family.id)}" data-parent-slot-id="${escapeHtml(isParentCard ? slot.slotId : selfSlotId)}" data-child-slot-id="${escapeHtml(isParentCard ? selfSlotId : slot.slotId)}" data-field="linkType">
                                ${this.#renderSelectOptions(PARENT_CHILD_RELATION_OPTIONS, relationType)}
                            </select>
                        </div>
                    </div>
                    ${relationType === "other" ? `
                        <div class="pie__row">
                            <label class="pie__label" for="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-custom">Custom Label</label>
                            <div class="pie__field">
                                <input id="prel-${escapeHtml(family.id)}-${escapeHtml(slot.slotId)}-custom" type="text" value="${escapeHtml(relationLabel)}" placeholder="${escapeHtml(customPlaceholder)}" data-family-id="${escapeHtml(family.id)}" data-parent-slot-id="${escapeHtml(isParentCard ? slot.slotId : selfSlotId)}" data-child-slot-id="${escapeHtml(isParentCard ? selfSlotId : slot.slotId)}" data-field="linkLabel">
                            </div>
                        </div>
                    ` : ""}
                    <div class="pie__row">
                        <span class="pie__label">Family</span>
                        <div class="pie__field">
                            <p class="prel__family-note">${escapeHtml(summaryText)}</p>
                        </div>
                    </div>
                    <div class="pie__row">
                        <span class="pie__label">Actions</span>
                        <div class="pie__field prel__inline-actions">
                            ${actionButton}
                            <button type="button" class="page-editor__button page-editor__sidebar-delete" data-action="remove-card" data-family-id="${escapeHtml(family.id)}" data-slot-id="${escapeHtml(slot.slotId)}" data-kind="${escapeHtml(card.kind)}">
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
            const cards = this.#buildCards();
            if (!cards.length) {
                list.innerHTML = `
                    <div class="prel__empty">
                        <h3>No relationships linked yet</h3>
                        <p class="prel__empty-note">Add parents, partners, or children above. Each related person gets their own group box.</p>
                    </div>
                `;
                return;
            }
            list.innerHTML = cards.map((card) => this.#renderCard(card)).join("");
            this.#configureDateFields();
            this.#bindLocationFields();
            this.#fillLocationFields();
        }

        #handleClick(event) {
            const pickerChoice = event.target.closest("[data-picker-id]");
            if (pickerChoice) {
                event.preventDefault();
                void this.#applyPickerChoice(pickerChoice.dataset.pickerId, this.__pickerState?.input);
                return;
            }

            if (!event.target.closest(".prel__person-picker")) {
                this.#closePicker();
            }

            const button = event.target.closest("[data-action]");
            if (!button) return;

            const action = String(button.dataset.action || "").trim();
            if (action === "add-parent") {
                this.triggerToolbarAction("add-parent");
                return;
            }

            if (action === "add-partner") {
                this.triggerToolbarAction("add-partner");
                return;
            }

            if (action === "add-child") {
                this.triggerToolbarAction("add-child");
                return;
            }

            if (action === "add-coparent") {
                this.#addCoParentToFamily(String(button.dataset.familyId || ""));
                return;
            }

            if (action === "add-child-to-family") {
                this.#addChildToFamily(String(button.dataset.familyId || ""));
                return;
            }

            if (action === "remove-card") {
                this.#removeCard(String(button.dataset.familyId || ""), String(button.dataset.slotId || ""), String(button.dataset.kind || ""));
            }
        }

        #addCoParentToFamily(familyId) {
            const family = this.__families.get(familyId);
            if (!family || family.removed) return;
            const parentSlot = this.#makeSlot("partner", this.#makePlaceholder("parent"));
            family.partners.push(parentSlot);
            for (const childSlot of family.children) {
                this.#linkEntry(family, parentSlot.slotId, childSlot.slotId, true);
            }
            this.#setStatus("");
            this.#render();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyChange();
        }

        #addChildToFamily(familyId, defaultType = "biological") {
            const family = this.__families.get(familyId);
            if (!family || family.removed) return;
            const childSlot = this.#makeSlot("child", this.#makePlaceholder("child"));
            family.children.push(childSlot);
            for (const partnerSlot of family.partners) {
                const link = this.#linkEntry(family, partnerSlot.slotId, childSlot.slotId, true);
                if (link) {
                    link.type = normalizeParentChildType(defaultType);
                }
            }
            this.#setStatus("");
            this.#render();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyChange();
        }

        #removeCard(familyId, slotId, kind) {
            const family = this.__families.get(familyId);
            if (!family) return;
            if (kind === "parent" || kind === "partner") {
                family.partners = family.partners.filter((slot) => slot.slotId !== slotId);
                family.parentChildLinks = family.parentChildLinks.filter((entry) => entry.parentSlotId !== slotId);
            }
            if (kind === "child") {
                family.children = family.children.filter((slot) => slot.slotId !== slotId);
                family.parentChildLinks = family.parentChildLinks.filter((entry) => entry.childSlotId !== slotId);
            }

            const stillVisible = this.#familyHasVisibleCards(family);
            if (!stillVisible) {
                if (family.persisted) {
                    family.removed = true;
                    family.partners = [];
                    family.children = [];
                    family.parentChildLinks = [];
                    family.relationship = { type: "partner", label: "" };
                    family.events = {
                        engagement: emptyEventDraft(),
                        marriage: emptyEventDraft(),
                        divorce: emptyEventDraft(),
                    };
                } else {
                    this.__families.delete(familyId);
                }
            }

            this.#setStatus("");
            this.#render();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyChange();
        }

        #familyHasVisibleCards(family) {
            const selfPartner = this.#selfPartnerSlot(family);
            const selfChild = this.#selfChildSlot(family);
            const parentCount = selfChild ? family.partners.length : 0;
            const partnerCount = selfPartner ? family.partners.filter((slot) => slot.slotId !== selfPartner.slotId).length : 0;
            const childCount = selfPartner ? family.children.length : 0;
            return parentCount > 0 || partnerCount > 0 || childCount > 0;
        }

        #handleInput(event) {
            const target = event.target;
            if (target instanceof HTMLElement && target.matches('date-field-editor[data-family-id][data-event-key]')) {
                const family = this.__families.get(String(target.getAttribute('data-family-id') || ''));
                const eventKey = String(target.getAttribute('data-event-key') || '').trim();
                if (!family?.events?.[eventKey]) return;
                const value = target.getValue?.() || {};
                const ev = family.events[eventKey];
                const precision = normalizeDatePrecision(value.precision);
                const left = normalizeStructuredDate(value.date || '');
                const right = normalizeStructuredDate(value.dateTo || '');
                ev.precision = precision;
                ev.date = precision === 'between'
                    ? (left && right ? `${left}|${right}` : (left || right || ''))
                    : left;
                ev.circa = Boolean(value.circa);
                ev.circaTo = Boolean(value.circaTo);
                this.#setStatus('');
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (target instanceof HTMLElement && target.matches('location-field-editor[data-family-id][data-event-key]')) {
                const family = this.__families.get(String(target.getAttribute('data-family-id') || ''));
                const eventKey = String(target.getAttribute('data-event-key') || '').trim();
                if (!family?.events?.[eventKey]) return;
                const detailField = String(event.detail?.field || '').trim();
                if (detailField === 'search') {
                    family.events[eventKey].place = String(event.detail?.query || '').trim();
                } else {
                    const location = target.getValue?.() || {};
                    family.events[eventKey].location = location;
                    family.events[eventKey].place = (infoboxApi().formatLocationSummary || (() => ''))(location, location.label || '');
                }
                this.#setStatus('');
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
            const locationSearchPath = String(target.dataset.locationSearch || "").trim();
            const field = String(target.dataset.field || "").trim();
            // allow location search inputs to proceed even when data-field is not set
            if (!field && !locationSearchPath) return;

            if (field === "personId") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                const slot = family ? this.#findSlot(family, String(target.dataset.slotId || "")) : null;
                if (slot) {
                    slot.personId = normalizeId(target.value);
                }
                void this.#updatePickerSuggestions(target);
                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (field === "linkLabel") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                const link = family ? this.#linkEntry(family, String(target.dataset.parentSlotId || ""), String(target.dataset.childSlotId || ""), true) : null;
                if (link) link.label = String(target.value || "").trim();
                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (field === "partnerLabel") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                if (family) family.relationship.label = String(target.value || "").trim();
                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (locationSearchPath) {
                const parts = locationSearchPath.split('.');
                const familyId = parts[1];
                const eventKey = parts[3];
                const family = this.__families.get(String(familyId || ""));
                if (family && family.events && family.events[eventKey]) {
                    family.events[eventKey].place = String(target.value || "").trim();
                    this.#scheduleHistoryCapture();
                    this.#notifyDirtyChange();
                }
                return;
            }

            if (field === "eventDate" || field === "eventDateTo" || field === "eventPlace" || field === "eventCirca" || field === "eventCircaTo") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                const eventKey = String(target.dataset.eventKey || "").trim();
                if (!family?.events?.[eventKey]) return;
                const ev = family.events[eventKey];
                if (field === "eventPlace") {
                    ev.place = String(target.value || "").trim();
                } else if (field === "eventDate") {
                    // if the precision is between, compose range
                    if (normalizeDatePrecision(ev.precision) === 'between') {
                        const other = this.querySelector(`#prel-${String(family.id)}-${String(eventKey)}-eventDateTo`);
                        const left = String(target.value || "").trim();
                        const right = other ? String(other.value || "").trim() : (ev.date && String(ev.date).includes('|') ? String(ev.date).split('|')[1] : "");
                        const a = normalizeStructuredDate(left);
                        const b = normalizeStructuredDate(right);
                        ev.date = a && b ? `${a}|${b}` : (a || b || "");
                    } else {
                        ev.date = String(target.value || "").trim();
                    }
                    this.#updateDatePreview(String(family.id), eventKey);
                } else if (field === "eventDateTo") {
                    const other = this.querySelector(`#prel-${String(family.id)}-${String(eventKey)}-eventDate`);
                    const right = String(target.value || "").trim();
                    const left = other ? String(other.value || "").trim() : (ev.date && String(ev.date).includes('|') ? String(ev.date).split('|')[0] : "");
                    const a = normalizeStructuredDate(left);
                    const b = normalizeStructuredDate(right);
                    ev.date = a && b ? `${a}|${b}` : (a || b || "");
                    this.#updateDatePreview(String(family.id), eventKey);
                } else if (field === "eventCirca") {
                    ev.circa = Boolean(target.checked);
                    this.#updateDatePreview(String(family.id), eventKey);
                } else if (field === "eventCircaTo") {
                    ev.circaTo = Boolean(target.checked);
                    this.#updateDatePreview(String(family.id), eventKey);
                }

                this.#setStatus("");
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
            }
        }

        async #handleChange(event) {
            const target = event.target;
            if (target instanceof HTMLElement && (target.matches('date-field-editor[data-family-id][data-event-key]') || target.matches('location-field-editor[data-family-id][data-event-key]'))) {
                return;
            }
            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
            const field = String(target.dataset.field || "").trim();
            if (!field) return;

            if (field === "linkType") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                const link = family ? this.#linkEntry(family, String(target.dataset.parentSlotId || ""), String(target.dataset.childSlotId || ""), true) : null;
                if (link) {
                    link.type = normalizeParentChildType(target.value);
                    if (link.type !== "other") link.label = "";
                }
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (field === "partnerKind") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                if (family) {
                    family.relationship.type = normalizePartnerKind(target.value);
                    if (family.relationship.type !== "other") family.relationship.label = "";
                }
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (field === "eventPrecision") {
                const family = this.__families.get(String(target.dataset.familyId || ""));
                const eventKey = String(target.dataset.eventKey || "").trim();
                if (family?.events?.[eventKey]) {
                    family.events[eventKey].precision = normalizeDatePrecision(target.value);
                }
                this.#setStatus("");
                this.#render();
                this.#scheduleHistoryCapture();
                this.#notifyDirtyChange();
                return;
            }

            if (field === "personId") {
                await this.#refreshPeopleIndex();
                this.#render();
                return;
            }
        }

        #pickerMatches(query) {
            const q = String(query || "").trim().toLowerCase();
            if (!q) return [];
            return this.__peopleRegistry
                .filter((person) => {
                    const name = [person.firstName, person.lastName].filter(Boolean).join(" ").toLowerCase();
                    return name.includes(q) || String(person.id || "") === q;
                })
                .slice(0, PEOPLE_SUGGESTION_LIMIT);
        }

        async #updatePickerSuggestions(input) {
            if (!(input instanceof HTMLInputElement)) return;
            await this.#loadPeopleRegistry();
            const field = input.closest(".prel__person-picker");
            const dropdown = field?.querySelector("[data-picker-results]");
            if (!dropdown) return;
            const matches = this.#pickerMatches(input.value);
            this.__pickerState = { input, dropdown, matches, activeIndex: matches.length ? 0 : -1 };
            if (!matches.length) {
                dropdown.hidden = true;
                dropdown.innerHTML = "";
                return;
            }
            dropdown.innerHTML = matches.map((person, index) => {
                const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || `Profile ${person.id}`;
                return `<button type="button" class="pie__suggestion-button${index === 0 ? " is-active" : ""}" data-picker-index="${index}" data-picker-id="${escapeHtml(String(person.id))}">${escapeHtml(name)} <span>#${escapeHtml(String(person.id))}</span></button>`;
            }).join("");
            dropdown.hidden = false;
        }

        #closePicker() {
            if (!this.__pickerState?.dropdown) return;
            this.__pickerState.dropdown.hidden = true;
            this.__pickerState.dropdown.innerHTML = "";
            this.__pickerState = null;
        }

        async #applyPickerChoice(personId, input = this.__pickerState?.input) {
            if (!(input instanceof HTMLInputElement)) return;
            input.value = String(personId || "");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            await this.#refreshPeopleIndex();
            this.#render();
            this.#closePicker();
        }

        #handlePickerKeydown(event) {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || input.dataset.field !== "personId") return;
            const state = this.__pickerState;
            if (!state || state.input !== input || state.dropdown.hidden) return;
            const buttons = [...state.dropdown.querySelectorAll("[data-picker-index]")];
            if (!buttons.length) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                state.activeIndex = Math.min(state.activeIndex + 1, buttons.length - 1);
                buttons.forEach((button, index) => button.classList.toggle("is-active", index === state.activeIndex));
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                state.activeIndex = Math.max(state.activeIndex - 1, 0);
                buttons.forEach((button, index) => button.classList.toggle("is-active", index === state.activeIndex));
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                const match = state.matches[state.activeIndex >= 0 ? state.activeIndex : 0];
                if (match) {
                    void this.#applyPickerChoice(match.id, input);
                }
                return;
            }
            if (event.key === "Escape") {
                this.#closePicker();
            }
        }

        #failValidation(message) {
            this.#setStatus(message, "error");
            document.dispatchEvent(new CustomEvent("profile-editor-activate-tab", { detail: { tab: "relationships" } }));
            throw new Error(message);
        }

        #normalizedFamilyPayloads() {
            const payloads = new Map();
            for (const family of this.__families.values()) {
                if (family.removed) {
                    if (family.persisted) {
                        payloads.set(family.id, {
                            id: family.id,
                            schema: family.schema || "genepedia/union@1",
                            partners: [],
                            children: [],
                            relationship: null,
                            parentChildLinks: [],
                            events: { engagement: null, marriage: null, divorce: null },
                            source: cloneJson(family.source || {}),
                        });
                    }
                    continue;
                }

                const missingSlots = [...family.partners, ...family.children].filter((slot) => {
                    const id = normalizeId(slot.personId);
                    return !id || isPlaceholderId(id);
                });
                if (missingSlots.length) {
                    this.#failValidation(`Choose a profile id for every new relationship in family ${family.id}, or remove the unfinished card.`);
                }

                const duplicateIds = (slots, label) => {
                    const seen = new Set();
                    for (const slot of slots) {
                        const id = normalizeId(slot.personId);
                        if (!id) continue;
                        if (seen.has(id)) {
                            this.#failValidation(`Family ${family.id} contains the same ${label} profile more than once.`);
                        }
                        seen.add(id);
                    }
                };
                duplicateIds(family.partners, "partner/parent");
                duplicateIds(family.children, "child");

                const slotPersonId = new Map([...family.partners, ...family.children].map((slot) => [slot.slotId, normalizeId(slot.personId)]));
                const partners = family.partners.map((slot) => idValue(slot.personId));
                const children = family.children.map((slot) => idValue(slot.personId));
                const parentChildLinks = family.parentChildLinks
                    .map((entry) => ({
                        parentId: slotPersonId.get(entry.parentSlotId) || "",
                        childId: slotPersonId.get(entry.childSlotId) || "",
                        type: normalizeParentChildType(entry.type),
                        label: String(entry.label || "").trim(),
                    }))
                    .filter((entry) => entry.parentId && entry.childId)
                    .map((entry) => ({
                        parentId: idValue(entry.parentId),
                        childId: idValue(entry.childId),
                        type: entry.type,
                        ...(entry.label ? { label: entry.label } : {}),
                    }));

                if (family.relationship?.type === "other" && !String(family.relationship?.label || "").trim() && family.partners.length > 1) {
                    this.#failValidation(`Enter a custom partner label for family ${family.id}.`);
                }

                for (const link of family.parentChildLinks) {
                    if (normalizeParentChildType(link.type) === "other" && !String(link.label || "").trim()) {
                        this.#failValidation(`Enter a custom relationship label for family ${family.id}.`);
                    }
                }

                payloads.set(family.id, {
                    id: family.id,
                    schema: family.schema || "genepedia/union@1",
                    partners,
                    children,
                    relationship: family.partners.length > 1 || family.events.engagement.date || family.events.marriage.date || family.events.divorce.date || family.events.engagement.place || family.events.marriage.place || family.events.divorce.place
                        ? {
                            type: normalizePartnerKind(family.relationship?.type),
                            ...(String(family.relationship?.label || "").trim() ? { label: String(family.relationship.label).trim() } : {}),
                        }
                        : null,
                    parentChildLinks,
                    events: {
                        engagement: eventFromDraft(family.events.engagement),
                        marriage: eventFromDraft(family.events.marriage),
                        divorce: eventFromDraft(family.events.divorce),
                    },
                    source: cloneJson(family.source || {}),
                });
            }
            return payloads;
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

            const infobox = document.querySelector("profile-infobox-editor");
            const infoboxData = infobox?.getProfileData?.();
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
            const careerData = document.querySelector("profile-career-editor")?.getCareerData?.();
            if (careerData && typeof window.PeopleDB.applyCareerToRecord === "function") {
                record = window.PeopleDB.applyCareerToRecord(record, careerData);
            }
            return record;
        }

        #deriveRelationshipsForRecord(recordId, unionsById, recordsById) {
            const selfId = normalizeId(recordId);
            const parents = new Set();
            const spouses = new Set();
            const exSpouses = new Set();
            const children = new Set();
            const siblings = new Set();
            const parentUnions = [];
            const spouseUnions = [];
            const parentLinks = [];
            const partnerLinks = [];
            const childLinks = [];
            const record = recordsById.get(selfId);
            const selfSex = record?.sex || "unknown";

            for (const union of unionsById.values()) {
                const partnerIds = (union.partners || []).map((value) => normalizeId(value)).filter(Boolean);
                const childIds = (union.children || []).map((value) => normalizeId(value)).filter(Boolean);
                const selfIsPartner = partnerIds.includes(selfId);
                const selfIsChild = childIds.includes(selfId);
                if (!selfIsPartner && !selfIsChild) continue;

                const links = Array.isArray(union.parentChildLinks) ? union.parentChildLinks : [];
                if (selfIsChild) {
                    parentUnions.push(String(union.id));
                    for (const parentId of partnerIds) {
                        if (parentId === selfId) continue;
                        parents.add(parentId);
                        const link = links.find((entry) => normalizeId(entry?.parentId) === parentId && normalizeId(entry?.childId) === selfId);
                        parentLinks.push({
                            id: idValue(parentId),
                            unionId: String(union.id),
                            type: normalizeParentChildType(link?.type),
                            ...(String(link?.label || "").trim() ? { label: String(link.label).trim() } : {}),
                        });
                    }
                    for (const siblingId of childIds) {
                        if (siblingId !== selfId) siblings.add(siblingId);
                    }
                }

                if (selfIsPartner) {
                    spouseUnions.push(String(union.id));
                    const genericKind = normalizePartnerKind(union.relationship?.type || partnerKindDefaultFromEvents(union.events));
                    for (const otherId of partnerIds) {
                        if (otherId === selfId) continue;
                        const relatedSex = recordsById.get(otherId)?.sex || "unknown";
                        const contextualRole = contextualPartnerRole(genericKind, selfSex, relatedSex);
                        if (["ex-wife", "ex-husband", "ex-spouse", "ex-partner"].includes(contextualRole)) exSpouses.add(otherId);
                        else spouses.add(otherId);
                        partnerLinks.push({
                            id: idValue(otherId),
                            unionId: String(union.id),
                            role: contextualRole,
                            ...(String(union.relationship?.label || "").trim() ? { label: String(union.relationship.label).trim() } : {}),
                        });
                    }
                    for (const childId of childIds) {
                        if (childId === selfId) continue;
                        children.add(childId);
                        const link = links.find((entry) => normalizeId(entry?.parentId) === selfId && normalizeId(entry?.childId) === childId);
                        childLinks.push({
                            id: idValue(childId),
                            unionId: String(union.id),
                            type: normalizeParentChildType(link?.type),
                            ...(String(link?.label || "").trim() ? { label: String(link.label).trim() } : {}),
                        });
                    }
                }
            }

            const dedupe = (entries, keyBuilder) => {
                const seen = new Set();
                return entries.filter((entry) => {
                    const key = keyBuilder(entry);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            };

            return {
                parents: [...parents].map(idValue),
                spouses: [...spouses].map(idValue),
                exSpouses: [...exSpouses].map(idValue),
                children: [...children].map(idValue),
                siblings: [...siblings].map(idValue),
                parentUnions,
                spouseUnions,
                parentLinks: dedupe(parentLinks, (entry) => `${entry.id}|${entry.unionId}|${entry.type}|${entry.label || ""}`),
                partnerLinks: dedupe(partnerLinks, (entry) => `${entry.id}|${entry.unionId}|${entry.role}|${entry.label || ""}`),
                childLinks: dedupe(childLinks, (entry) => `${entry.id}|${entry.unionId}|${entry.type}|${entry.label || ""}`),
            };
        }

        #unionPath(unionId) {
            if (typeof window.PeopleDB?.unionPath === "function") {
                return window.PeopleDB.unionPath(unionId);
            }
            return `${window.PeopleDB.DB_ROOT}/unions/${window.PeopleDB.bucketForId(unionId)}/${unionId}.json`;
        }

        async #buildPublishFiles() {
            if (!this.#isDirty()) {
                return [];
            }

            await ensurePeopleDb();
            const editedUnions = this.#normalizedFamilyPayloads();
            const currentRecord = await this.#buildCurrentRecord();
            const touchedIds = new Set([this.__personId]);
            for (const union of editedUnions.values()) {
                for (const id of union.partners || []) touchedIds.add(normalizeId(id));
                for (const id of union.children || []) touchedIds.add(normalizeId(id));
            }

            const recordsById = new Map();
            recordsById.set(this.__personId, currentRecord);
            const missingIds = [];
            for (const id of touchedIds) {
                if (!id || id === this.__personId) continue;
                let record = this.__relatedRecords.get(id) || null;
                if (!record) {
                    try {
                        record = await window.PeopleDB.loadPerson(id);
                    } catch (error) {
                        record = null;
                    }
                }
                if (!record) {
                    missingIds.push(id);
                    continue;
                }
                recordsById.set(id, cloneJson(record));
            }
            if (missingIds.length) {
                this.#failValidation(`These profile ids do not exist yet: ${missingIds.join(", ")}.`);
            }

            const unionRecords = new Map();
            for (const [id, union] of editedUnions.entries()) {
                unionRecords.set(String(id), cloneJson(union));
            }

            const extraUnionIds = new Set();
            for (const record of recordsById.values()) {
                for (const unionId of record.relationships?.parentUnions || []) extraUnionIds.add(String(unionId));
                for (const unionId of record.relationships?.spouseUnions || []) extraUnionIds.add(String(unionId));
            }
            for (const unionId of extraUnionIds) {
                if (unionRecords.has(unionId)) continue;
                try {
                    const union = await window.PeopleDB.loadUnion(unionId);
                    if (union) unionRecords.set(unionId, cloneJson(union));
                } catch (error) {
                    // ignore ancillary unions that cannot be loaded
                }
            }

            const publishedAt = new Date().toISOString();
            for (const [id, record] of recordsById.entries()) {
                record.relationships = this.#deriveRelationshipsForRecord(id, unionRecords, recordsById);
                record.generatedAt = publishedAt;
            }

            this.__lastPublishedState = {
                record: cloneJson(recordsById.get(this.__personId)),
                relatedRecords: [...recordsById.entries()].filter(([id]) => String(id) !== this.__personId).map(([id, record]) => [String(id), cloneJson(record)]),
                families: [...this.__families.values()].map((family) => cloneJson(family)),
            };

            return [
                ...[...editedUnions.values()].map((union) => ({
                    path: this.#unionPath(union.id),
                    content: `${JSON.stringify(union, null, 2)}\n`,
                })),
                ...[...recordsById.entries()].map(([id, record]) => ({
                    path: window.PeopleDB.recordPath(id),
                    content: `${JSON.stringify(record, null, 2)}\n`,
                })),
            ];
        }
    }

    if (!customElements.get("profile-relationships-editor")) {
        customElements.define("profile-relationships-editor", ProfileRelationshipsEditor);
    }
})();