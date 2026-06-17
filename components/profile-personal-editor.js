(function () {
    "use strict";

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

    function normalizeId(value) {
        return String(value || "").trim();
    }

    function normalizeText(value) {
        return String(value || "").trim();
    }

    function normalizeTextList(value) {
        const seen = new Set();
        const items = Array.isArray(value)
            ? value
            : typeof value === "string"
                ? value.split(",")
                : [];
        return items
            .map((item) => normalizeText(item))
            .filter((item) => {
                if (!item) return false;
                const key = item.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function parseHeightToMeters(raw) {
        const s = String(raw || '').trim();
        if (!s) return null;

        // meters: "1.83 m", "1.8m", "1.83 meters"
        const mMatch = s.match(/^\s*([\d.,]+)\s*m(?:eters?)?\s*$/i);
        if (mMatch) {
            return parseFloat(mMatch[1].replace(',', '.')) || null;
        }

        // centimeters: "183 cm"
        const cmMatch = s.match(/^\s*([\d.,]+)\s*cm\s*$/i);
        if (cmMatch) {
            const cm = parseFloat(cmMatch[1].replace(',', '.')) || null;
            return cm != null ? cm / 100 : null;
        }

        // feet and inches: "6'0\"", "6 ft 0 in", "6 feet 0 inches", "6ft", "6 feet"
        const ftInMatch = s.match(/^\s*(\d+)\s*(?:ft|feet|')\s*(?:(\d+)\s*(?:in|inch|inches|\")\s*)?$/i);
        if (ftInMatch) {
            const ft = parseInt(ftInMatch[1], 10) || 0;
            const inches = ftInMatch[2] ? (parseInt(ftInMatch[2], 10) || 0) : 0;
            const totalInches = ft * 12 + inches;
            return totalInches * 0.0254;
        }

        // inches only: "72 in"
        const inMatch = s.match(/^\s*([\d.,]+)\s*(?:in|inch|inches)\s*$/i);
        if (inMatch) {
            const inches = parseFloat(inMatch[1].replace(',', '.')) || null;
            return inches != null ? inches * 0.0254 : null;
        }

        // bare number heuristics: interpret as meters if between 0.5 and 3, cm if > 30, inches if > 30 and <= 96
        const numOnly = s.match(/^\s*([\d.,]+)\s*$/);
        if (numOnly) {
            const v = parseFloat(numOnly[1].replace(',', '.')) || null;
            if (v == null) return null;
            if (v >= 0.5 && v <= 3) return v; // meters
            if (v > 30 && v <= 300) return v / 100; // centimeters -> meters
            if (v > 3 && v <= 8) return v; // ambiguous small numbers, assume meters
            if (v > 30 && v <= 96) return v * 0.0254; // inches
        }

        return null;
    }

    function formatMeters(m) {
        if (typeof m !== 'number' || Number.isNaN(m)) return null;
        // show two decimals
        return `${(Math.round(m * 100) / 100).toFixed(2)} m`;
    }

    function renderSelectOptions(options) {
        return options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
    }

    // Per-measurement value placeholder for the year-tagged history rows.
    const MEASUREMENT_HISTORY_PLACEHOLDER = {
        height: "e.g. 1.75 m",
        weight: "e.g. 60 kg",
        shoeSize: "e.g. UK 8",
    };

    function renderMeasurementControl(measure, inputId, placeholder) {
        return `
            <div class="ppe-personal__measurement-current" data-measurement-current="${escapeHtml(measure)}">
                <input type="number" class="ppe-personal__history-year" data-field="${escapeHtml(measure)}Year" placeholder="Year" inputmode="numeric">
                <input id="${escapeHtml(inputId)}" type="text" class="ppe-personal__measurement-value" data-field="${escapeHtml(measure)}" placeholder="${escapeHtml(placeholder)}">
            </div>
            ${renderHistoryControl(measure)}
        `;
    }

    // The history sub-control under a measurement field: a list of saved rows plus
    // an "Add past value" button. Rows are rendered by renderHistoryRow().
    function renderHistoryControl(measure) {
        return `
            <div class="ppe-personal__history" data-history="${escapeHtml(measure)}">
                <div class="ppe-personal__history-list" data-history-list="${escapeHtml(measure)}"></div>
                <button type="button" class="ppe-personal__history-add" data-history-add="${escapeHtml(measure)}">
                    <i class="bi bi-clock-history" aria-hidden="true"></i> Add past value
                </button>
            </div>
        `;
    }

    function renderHistoryRow(measure, entry = {}) {
        const year = entry && entry.year != null ? String(entry.year) : "";
        const value = entry && entry.value != null ? String(entry.value) : "";
        const placeholder = MEASUREMENT_HISTORY_PLACEHOLDER[measure] || "Value";
        return `
            <div class="ppe-personal__history-row" data-history-row="${escapeHtml(measure)}">
                <input type="number" class="ppe-personal__history-year" data-history-year placeholder="Year" inputmode="numeric" value="${escapeHtml(year)}">
                <input type="text" class="ppe-personal__history-value" data-history-value placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}">
                <button type="button" class="ppe-personal__history-remove" data-history-remove aria-label="Remove value"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
        `;
    }

    const RELIGION_OPTIONS = [
        "Christianity",
        "Islam",
        "Judaism",
        "Hinduism",
        "Buddhism",
        "Atheist",
        "Agnostic",
        "Spiritual",
        "Traditional African",
        "Other",
    ];

    const ETHNICITY_OPTIONS = [
        "African",
        "Afrikaner",
        "Asian",
        "Cape Coloured",
        "European",
        "Indian",
        "Jewish",
        "Mixed",
        "White",
        "Other",
    ];

    const POLITICAL_OPTIONS = [
        "Liberal",
        "Conservative",
        "Moderate",
        "Socialist",
        "Libertarian",
        "Centrist",
        "Progressive",
        "Independent",
        "Other",
    ];

    const LANGUAGE_OPTIONS = [
        "Afrikaans",
        "Arabic",
        "Dutch",
        "English",
        "French",
        "German",
        "Hebrew",
        "Portuguese",
        "Spanish",
        "Xitsonga",
        "Zulu",
    ];

    const HOBBY_OPTIONS = [
        "Art",
        "Cooking",
        "Cycling",
        "Dancing",
        "Fishing",
        "Gaming",
        "Gardening",
        "Genealogy",
        "Hiking",
        "Music",
        "Photography",
        "Reading",
        "Running",
        "Travel",
        "Writing",
    ];

    const SMOKING_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "never", label: "Never" },
        { value: "former", label: "Former smoker" },
        { value: "social", label: "Social smoker" },
        { value: "regular", label: "Regular smoker" },
    ];

    const ALCOHOL_USE_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "none", label: "None" },
        { value: "former", label: "Former drinker" },
        { value: "occasional", label: "Occasional" },
        { value: "social", label: "Social drinker" },
        { value: "regular", label: "Regular drinker" },
        { value: "heavy", label: "Heavy drinker" },
    ];

    const DISABILITY_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "none", label: "None" },
        { value: "physical", label: "Physical" },
        { value: "visual", label: "Visual" },
        { value: "hearing", label: "Hearing" },
        { value: "cognitive", label: "Cognitive" },
        { value: "chronic-illness", label: "Chronic illness" },
        { value: "multiple", label: "Multiple" },
        { value: "other", label: "Other" },
    ];

    const BLOOD_TYPE_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "A+", label: "A+" },
        { value: "A-", label: "A-" },
        { value: "B+", label: "B+" },
        { value: "B-", label: "B-" },
        { value: "AB+", label: "AB+" },
        { value: "AB-", label: "AB-" },
        { value: "O+", label: "O+" },
        { value: "O-", label: "O-" },
    ];

    const ALLERGY_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "none", label: "None" },
        { value: "food", label: "Food" },
        { value: "medication", label: "Medication" },
        { value: "environmental", label: "Environmental" },
        { value: "animal", label: "Animal" },
        { value: "insect", label: "Insect" },
        { value: "latex", label: "Latex" },
        { value: "multiple", label: "Multiple" },
        { value: "other", label: "Other" },
    ];

    const HANDEDNESS_OPTIONS = [
        { value: "", label: "Unknown" },
        { value: "right", label: "Right" },
        { value: "left", label: "Left" },
        { value: "ambidextrous", label: "Ambidextrous" },
    ];

    const DISABILITY_SUGGESTIONS = DISABILITY_OPTIONS.map((o) => o.label);
    const ALLERGY_SUGGESTIONS = ALLERGY_OPTIONS.map((o) => o.label);

    const TEMPLATE = `
        <style>
            .ppe-personal__token-control {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.45rem;
                width: 100%;
                min-height: 2.4rem;
                padding: 0.35rem 0.55rem;
                border: 1px solid #a2a9b1;
                border-radius: 0.125rem;
                background: #ffffff;
                box-sizing: border-box;
            }

            .ppe-personal__token-control:focus-within {
                border-color: #3366cc;
                box-shadow: inset 0 0 0 1px #3366cc;
            }

            .ppe-personal__token-input {
                flex: 1 1 10rem;
                min-width: 8rem;
                width: auto !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                color: inherit;
            }

            .ppe-personal__token-input:focus {
                outline: none;
            }

            .ppe-personal__chips {
                display: inline-flex;
                flex-wrap: wrap;
                gap: 0.45rem;
                align-items: center;
                max-width: 100%;
            }

            .ppe-personal__chip {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.3rem 0.55rem;
                border: 1px solid rgba(51, 102, 204, 0.24);
                border-radius: 999px;
                background: rgba(51, 102, 204, 0.08);
                color: inherit;
                font: inherit;
                font-size: 0.85rem;
                cursor: pointer;
            }

            .ppe-personal__chip i {
                font-size: 0.8rem;
                line-height: 1;
            }

            body.theme-dark .ppe-personal__chip {
                border-color: rgba(107, 158, 255, 0.3);
                background: rgba(107, 158, 255, 0.14);
            }

            body.theme-dark .ppe-personal__token-control {
                border-color: rgba(255, 255, 255, 0.3);
                background: #101418;
            }

            .ppe-personal__history {
                margin-top: 0.4rem;
            }

            .ppe-personal__history-list {
                display: grid;
                gap: 0.4rem;
            }

            .ppe-personal__history-list:empty {
                display: none;
            }

            .ppe-personal__measurement-current,
            .ppe-personal__history-row {
                display: grid;
                grid-template-columns: 6rem minmax(0, 1fr) auto;
                gap: 0.4rem;
                align-items: center;
            }

            .ppe-personal__measurement-current {
                grid-template-columns: 6rem minmax(0, 1fr);
            }

            .ppe-personal__measurement-current input,
            .ppe-personal__history-row input {
                width: 100%;
                box-sizing: border-box;
            }

            .ppe-personal__history-year.is-invalid {
                border-color: #d33;
                box-shadow: inset 0 0 0 1px #d33;
            }

            .ppe-personal__history-remove {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 2rem;
                height: 2rem;
                border: 1px solid #a2a9b1;
                border-radius: 0.125rem;
                background: #fff;
                color: #54595d;
                cursor: pointer;
            }

            .ppe-personal__history-remove:hover {
                border-color: #d33;
                color: #d33;
            }

            .ppe-personal__history-add {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                margin-top: 0.4rem;
                padding: 0.25rem 0.5rem;
                border: 0;
                background: transparent;
                color: #3366cc;
                font: inherit;
                font-size: 0.85rem;
                cursor: pointer;
            }

            .ppe-personal__history-add:hover {
                text-decoration: underline;
            }

            body.theme-dark .ppe-personal__history-remove {
                border-color: rgba(255, 255, 255, 0.3);
                background: #101418;
                color: #c8ccd1;
            }

            body.theme-dark .ppe-personal__history-add {
                color: #6b9eff;
            }
        </style>
        <form class="pie" autocomplete="off">
            <div class="pie__status" role="status" hidden></div>

            <fieldset class="pie__group">
                <legend class="pie__legend">Appearance</legend>
                <div class="pie__row">
                    <label class="pie__label" for="ppe-hair-color">Hair Color</label>
                    <div class="pie__field"><input id="ppe-hair-color" type="text" data-field="hairColor" placeholder="e.g. Brown"></div>
                </div>
                <div class="pie__row">
                    <label class="pie__label" for="ppe-eye-color">Eye Color</label>
                    <div class="pie__field"><input id="ppe-eye-color" type="text" data-field="eyeColor" placeholder="e.g. Blue"></div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-height">Height</label>
                    <div class="pie__field">${renderMeasurementControl("height", "ppe-height", "e.g. 1.80 m")}</div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-weight">Weight</label>
                    <div class="pie__field">${renderMeasurementControl("weight", "ppe-weight", "e.g. 72 kg")}</div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-shoe-size">Shoe Size</label>
                    <div class="pie__field">${renderMeasurementControl("shoeSize", "ppe-shoe-size", "e.g. UK 9")}</div>
                </div>
                    <div class="pie__row">
                        <label class="pie__label" for="ppe-handedness">Handedness</label>
                        <div class="pie__field">
                            <select id="ppe-handedness" data-field="handedness">
                                ${renderSelectOptions(HANDEDNESS_OPTIONS)}
                            </select>
                        </div>
                    </div>
                
            </fieldset>

            <fieldset class="pie__group">
                <legend class="pie__legend">Health</legend>
                <div class="pie__row">
                    <label class="pie__label" for="ppe-alcohol-use">Alcohol Use</label>
                    <div class="pie__field">
                        <select id="ppe-alcohol-use" data-field="alcoholUse">
                            ${renderSelectOptions(ALCOHOL_USE_OPTIONS)}
                        </select>
                    </div>
                </div>
                <div class="pie__row">
                    <label class="pie__label" for="ppe-smoking">Smoking</label>
                    <div class="pie__field">
                        <select id="ppe-smoking" data-field="smoking">
                            ${renderSelectOptions(SMOKING_OPTIONS)}
                        </select>
                    </div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-disabilities">Disabilities</label>
                    <div class="pie__field pie__field--suggest">
                        <div class="ppe-personal__token-control" data-token-control="disabilities">
                            <div class="ppe-personal__chips" data-chip-list="disabilities"></div>
                            <input id="ppe-disabilities" class="ppe-personal__token-input" type="text" data-field="disabilitiesInput" data-suggest="disabilities" placeholder="Type or choose a disability">
                        </div>
                        <div class="pie__suggestions" data-suggestions="disabilities" hidden></div>
                    </div>
                </div>
                <div class="pie__row">
                    <label class="pie__label" for="ppe-blood-type">Blood Type</label>
                    <div class="pie__field">
                        <select id="ppe-blood-type" data-field="bloodType">
                            ${renderSelectOptions(BLOOD_TYPE_OPTIONS)}
                        </select>
                    </div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-allergies">Allergies</label>
                    <div class="pie__field pie__field--suggest">
                        <div class="ppe-personal__token-control" data-token-control="allergies">
                            <div class="ppe-personal__chips" data-chip-list="allergies"></div>
                            <input id="ppe-allergies" class="ppe-personal__token-input" type="text" data-field="allergiesInput" data-suggest="allergies" placeholder="Type or choose an allergy">
                        </div>
                        <div class="pie__suggestions" data-suggestions="allergies" hidden></div>
                    </div>
                </div>
            </fieldset>

            <fieldset class="pie__group">
                <legend class="pie__legend">Background</legend>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-ethnicity">Ethnicity</label>
                    <div class="pie__field pie__field--suggest">
                        <input id="ppe-ethnicity" type="text" data-field="ethnicity" data-suggest="ethnicity" placeholder="Choose or enter ethnicity" required aria-required="true">
                        <div class="pie__suggestions" data-suggestions="ethnicity" hidden></div>
                    </div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-religion">Religion</label>
                    <div class="pie__field pie__field--suggest">
                        <input id="ppe-religion" type="text" data-field="religion" data-suggest="religion" placeholder="Choose or enter religion" required aria-required="true">
                        <div class="pie__suggestions" data-suggestions="religion" hidden></div>
                    </div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-political">Political Views</label>
                    <div class="pie__field pie__field--suggest">
                        <input id="ppe-political" type="text" data-field="politicalViews" data-suggest="politicalViews" placeholder="Choose or enter political views" required aria-required="true">
                        <div class="pie__suggestions" data-suggestions="politicalViews" hidden></div>
                    </div>
                </div>
            </fieldset>

            <fieldset class="pie__group">
                <legend class="pie__legend">Interests</legend>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-languages">Languages</label>
                    <div class="pie__field pie__field--suggest">
                        <div class="ppe-personal__token-control" data-token-control="languages">
                            <div class="ppe-personal__chips" data-chip-list="languages"></div>
                            <input id="ppe-languages" class="ppe-personal__token-input" type="text" data-field="languagesInput" data-suggest="languages" placeholder="Type a language">
                        </div>
                        <div class="pie__suggestions" data-suggestions="languages" hidden></div>
                    </div>
                </div>
                <div class="pie__row pie__row--align-top">
                    <label class="pie__label" for="ppe-hobbies">Hobbies</label>
                    <div class="pie__field pie__field--suggest">
                        <div class="ppe-personal__token-control" data-token-control="hobbies">
                            <div class="ppe-personal__chips" data-chip-list="hobbies"></div>
                            <input id="ppe-hobbies" class="ppe-personal__token-input" type="text" data-field="hobbiesInput" data-suggest="hobbies" placeholder="Type a hobby">
                        </div>
                        <div class="pie__suggestions" data-suggestions="hobbies" hidden></div>
                    </div>
                </div>
            </fieldset>
        </form>
    `;

    class ProfilePersonalEditor extends HTMLElement {
        connectedCallback() {
            if (this.__rendered) return;
            this.__rendered = true;
            this.__personId = normalizeId(this.getAttribute("person") || new URLSearchParams(window.location.search).get("person"));
            this.__data = window.PeopleDB?.toPersonalData
                ? window.PeopleDB.toPersonalData({ attributes: {} })
                : {
                    hairColor: null,
                    eyeColor: null,
                    height: null,
                    heightYear: null,
                    weight: null,
                    weightYear: null,
                    ethnicity: null,
                    religion: null,
                    politicalViews: null,
                    languages: [],
                    hobbies: [],
                    shoeSize: null,
                    shoeSizeYear: null,
                    smoking: null,
                    alcoholUse: null,
                    disabilities: [],
                    bloodType: null,
                    allergies: [],
                    handedness: null,
                    heightHistory: [],
                    weightHistory: [],
                    shoeSizeHistory: [],
                };
            this.__savedSnapshot = "";
            this.__history = [];
            this.__historyIndex = -1;
            this.__historyRestoring = false;
            this.__historyDebounceTimer = 0;
            this.__suggestState = null;
            this.innerHTML = TEMPLATE;

            this.__onInput = (event) => this.#handleInput(event);
            this.__onChange = (event) => this.#handleChange(event);
            this.__onClick = (event) => this.#handleClick(event);
            this.__onFocusIn = (event) => this.#handleSuggestionFocusIn(event);

            this.addEventListener("input", this.__onInput);
            this.addEventListener("change", this.__onChange);
            this.addEventListener("click", this.__onClick);
            this.addEventListener("focusin", this.__onFocusIn);
            this.addEventListener("keydown", (event) => this.#handleSuggestionKeydown(event), true);

            this.#registerProviders();
            void this.#loadExisting();
        }

        disconnectedCallback() {
            this.removeEventListener("input", this.__onInput);
            this.removeEventListener("change", this.__onChange);
            this.removeEventListener("click", this.__onClick);
            this.removeEventListener("focusin", this.__onFocusIn);
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
            if (this.__onDocumentClick) {
                document.removeEventListener("click", this.__onDocumentClick);
                this.__onDocumentClick = null;
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
            this.__dirtyStateReset = () => this.#setSavedBaseline({ quiet: true });
            window.__extraDirtyStateResetCallbacks.push(this.__dirtyStateReset);
        }

        #snapshotState() {
            return JSON.stringify(this.#collect());
        }

        #setStatus(message, type = "info") {
            const status = this.querySelector(".pie__status");
            if (!status) return;
            status.textContent = message || "";
            status.dataset.type = type;
            status.hidden = !message;
        }

        #notifyDirtyState() {
            const editor = document.querySelector("page-editor, profile-editor");
            if (editor && typeof editor.refreshDirtyState === "function") {
                editor.refreshDirtyState();
            }
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
                const payload = JSON.parse(snapshot);
                this.__data = window.PeopleDB?.toPersonalData
                    ? window.PeopleDB.toPersonalData({ attributes: payload })
                    : payload;
                this.#fillForm();
            } finally {
                this.__historyRestoring = false;
            }
            this.#notifyDirtyState();
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

        #isDirty() {
            if (!this.__savedSnapshot) return false;
            return this.#snapshotState() !== this.__savedSnapshot;
        }

        async #loadExisting() {
            this.#setStatus("Loading…");
            await ensurePeopleDb();
            if (window.PeopleDB) {
                try {
                    const record = await window.PeopleDB.loadPerson(this.__personId);
                    if (record) {
                        this.__record = record;
                        this.__data = window.PeopleDB.toPersonalData(record);
                    }
                } catch (error) {
                    console.warn("Could not load personal data from the database", error);
                }
            }
            this.#fillForm();
            this.#bindOutsideClicks();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.#setSavedBaseline({ quiet: true });
                    document.querySelector("profile-editor")?.refreshDirtyState?.();
                    this.#notifyDirtyState();
                    this.#setStatus("");
                });
            });
        }

        #bindOutsideClicks() {
            if (this.__onDocumentClick) return;
            this.__onDocumentClick = (event) => {
                if (!this.#isInsideActiveSuggestion(event.target)) {
                    this.#closeSuggestions();
                }
            };
            document.addEventListener("click", this.__onDocumentClick);
        }

        #activeSuggestionContainer() {
            const input = this.__suggestState?.input;
            return input?.closest?.(".pie__field--suggest") || null;
        }

        #isInsideActiveSuggestion(target) {
            if (!(target instanceof Node)) return false;
            const container = this.#activeSuggestionContainer();
            return Boolean(container && container.contains(target));
        }

        #collect() {
            const smokingInput = this.querySelector('[data-field="smoking"]');
            const alcoholUseInput = this.querySelector('[data-field="alcoholUse"]');
            const bloodTypeInput = this.querySelector('[data-field="bloodType"]');
            const handednessInput = this.querySelector('[data-field="handedness"]');
            const yearValue = (field) => {
                const raw = normalizeText(this.querySelector(`[data-field="${field}"]`)?.value);
                const year = Number.parseInt(raw, 10);
                return raw && Number.isFinite(year) ? year : null;
            };
            const heightValue = (function () {
                const raw = normalizeText(this.querySelector('[data-field="height"]')?.value) || null;
                if (!raw) return null;
                const m = parseHeightToMeters(raw);
                return m != null ? formatMeters(m) : raw;
            }).call(this);
            const weightValue = normalizeText(this.querySelector('[data-field="weight"]')?.value) || null;
            const shoeSizeValue = normalizeText(this.querySelector('[data-field="shoeSize"]')?.value) || null;
            return {
                hairColor: normalizeText(this.querySelector('[data-field="hairColor"]')?.value) || null,
                eyeColor: normalizeText(this.querySelector('[data-field="eyeColor"]')?.value) || null,
                height: heightValue,
                heightYear: heightValue ? yearValue("heightYear") : null,
                weight: weightValue,
                weightYear: weightValue ? yearValue("weightYear") : null,
                ethnicity: normalizeText(this.querySelector('[data-field="ethnicity"]')?.value) || "Unknown",
                religion: normalizeText(this.querySelector('[data-field="religion"]')?.value) || "Unknown",
                politicalViews: normalizeText(this.querySelector('[data-field="politicalViews"]')?.value) || "Unknown",
                languages: normalizeTextList(this.__data.languages),
                hobbies: normalizeTextList(this.__data.hobbies),
                shoeSize: shoeSizeValue,
                shoeSizeYear: shoeSizeValue ? yearValue("shoeSizeYear") : null,
                smoking: normalizeText(smokingInput?.value) || null,
                alcoholUse: normalizeText(alcoholUseInput?.value) || null,
                disabilities: (function () { const d = normalizeTextList(this.__data.disabilities); return d.length ? d : ["Unknown"]; }).call(this),
                bloodType: normalizeText(bloodTypeInput?.value) || null,
                allergies: (function () { const a = normalizeTextList(this.__data.allergies); return a.length ? a : ["Unknown"]; }).call(this),
                handedness: normalizeText(handednessInput?.value) || null,
                heightHistory: this.#collectHistory("height"),
                weightHistory: this.#collectHistory("weight"),
                shoeSizeHistory: this.#collectHistory("shoeSize"),
            };
        }

        // A value in Height, Weight or Shoe size makes its Year field required.
        // Keep the `required`/`aria-required` flags in step with the value field
        // and clear the invalid highlight once a value is removed or a year typed.
        #syncYearRequirements() {
            for (const measure of ["height", "weight", "shoeSize"]) {
                const valueInput = this.querySelector(`[data-field="${measure}"]`);
                const yearInput = this.querySelector(`[data-field="${measure}Year"]`);
                if (!valueInput || !yearInput) continue;
                const hasValue = Boolean(normalizeText(valueInput.value));
                yearInput.required = hasValue;
                yearInput.setAttribute("aria-required", hasValue ? "true" : "false");
                if (!hasValue || normalizeText(yearInput.value)) {
                    yearInput.classList.remove("is-invalid");
                }
            }
        }

        // Returns the first measurement that has a value but no year, or null.
        #findMissingMeasurementYear() {
            const labels = { height: "height", weight: "weight", shoeSize: "shoe size" };
            for (const measure of ["height", "weight", "shoeSize"]) {
                const valueInput = this.querySelector(`[data-field="${measure}"]`);
                const yearInput = this.querySelector(`[data-field="${measure}Year"]`);
                if (!valueInput || !yearInput) continue;
                const hasValue = Boolean(normalizeText(valueInput.value));
                const hasYear = Boolean(normalizeText(yearInput.value));
                if (hasValue && !hasYear) {
                    return { measure, label: labels[measure], yearInput };
                }
            }
            return null;
        }

        // Read the year-tagged rows for a measurement into [{ year, value }],
        // dropping blank rows and ordering newest-first.
        #collectHistory(measure) {
            const rows = [...this.querySelectorAll(`[data-history-list="${measure}"] [data-history-row]`)];
            const out = [];
            for (const row of rows) {
                const yearRaw = normalizeText(row.querySelector("[data-history-year]")?.value);
                const valueRaw = normalizeText(row.querySelector("[data-history-value]")?.value);
                if (!yearRaw && !valueRaw) continue;
                const yearNum = Number.parseInt(yearRaw, 10);
                out.push({ year: Number.isFinite(yearNum) ? yearNum : null, value: valueRaw || null });
            }
            out.sort((a, b) => (b.year || 0) - (a.year || 0));
            return out;
        }

        #renderHistory(measure) {
            const list = this.querySelector(`[data-history-list="${measure}"]`);
            if (!list) return;
            const entries = Array.isArray(this.__data?.[`${measure}History`]) ? this.__data[`${measure}History`] : [];
            list.innerHTML = entries.map((entry) => renderHistoryRow(measure, entry)).join("");
        }

        getPersonalData() {
            return this.#collect();
        }

        #fillForm() {
            const data = this.__data || {};
            this.querySelector('[data-field="hairColor"]').value = data.hairColor || "";
            this.querySelector('[data-field="eyeColor"]').value = data.eyeColor || "";
            this.querySelector('[data-field="heightYear"]').value = data.heightYear || "";
            const heightInput = this.querySelector('[data-field="height"]');
            const parsed = parseHeightToMeters(data.height || '');
            if (heightInput) {
                heightInput.value = parsed != null ? formatMeters(parsed) : (data.height || '');
                heightInput.placeholder = 'e.g. 1.80 m';
            }
            this.querySelector('[data-field="weightYear"]').value = data.weightYear || "";
            this.querySelector('[data-field="weight"]').value = data.weight || "";
            this.querySelector('[data-field="ethnicity"]').value = data.ethnicity || "";
            this.querySelector('[data-field="religion"]').value = data.religion || "";
            this.querySelector('[data-field="politicalViews"]').value = data.politicalViews || "";
            this.querySelector('[data-field="shoeSizeYear"]').value = data.shoeSizeYear || "";
            this.querySelector('[data-field="shoeSize"]').value = data.shoeSize || "";
            this.#renderHistory("height");
            this.#renderHistory("weight");
            this.#renderHistory("shoeSize");
            this.querySelector('[data-field="smoking"]').value = data.smoking || "";
            this.querySelector('[data-field="alcoholUse"]').value = data.alcoholUse || "";
            this.querySelector('[data-field="bloodType"]').value = data.bloodType || "";
            this.querySelector('[data-field="handedness"]').value = data.handedness || "";
            const languageInput = this.querySelector('[data-field="languagesInput"]');
            const hobbiesInput = this.querySelector('[data-field="hobbiesInput"]');
            if (languageInput) languageInput.value = "";
            if (hobbiesInput) hobbiesInput.value = "";
            const disabilitiesInput = this.querySelector('[data-field="disabilitiesInput"]');
            const allergiesInput = this.querySelector('[data-field="allergiesInput"]');
            if (disabilitiesInput) disabilitiesInput.value = "";
            if (allergiesInput) allergiesInput.value = "";
            // Ensure disabilities/allergies default to Unknown when empty
            this.__data.disabilities = normalizeTextList(this.__data.disabilities);
            if (!this.__data.disabilities || this.__data.disabilities.length === 0) this.__data.disabilities = ["Unknown"];
            this.__data.allergies = normalizeTextList(this.__data.allergies);
            if (!this.__data.allergies || this.__data.allergies.length === 0) this.__data.allergies = ["Unknown"];

            this.#renderChipList("languages");
            this.#renderChipList("hobbies");
            this.#renderChipList("disabilities");
            this.#renderChipList("allergies");
            this.#syncYearRequirements();
        }

        #renderChipList(key) {
            const root = this.querySelector(`[data-chip-list="${key}"]`);
            if (!root) return;
            const values = normalizeTextList(this.__data[key]);
            root.innerHTML = values.map((value) => `
                <button type="button" class="ppe-personal__chip" data-chip-remove="${escapeHtml(key)}" data-chip-value="${escapeHtml(value)}">
                    <span>${escapeHtml(value)}</span>
                    <i class="bi bi-x" aria-hidden="true"></i>
                </button>`).join("");
        }

        #optionsFor(kind) {
            if (kind === "ethnicity") return ETHNICITY_OPTIONS;
            if (kind === "religion") return RELIGION_OPTIONS;
            if (kind === "politicalViews") return POLITICAL_OPTIONS;
            if (kind === "languages") return LANGUAGE_OPTIONS;
            if (kind === "hobbies") return HOBBY_OPTIONS;
            if (kind === "disabilities") return DISABILITY_SUGGESTIONS;
            if (kind === "allergies") return ALLERGY_SUGGESTIONS;
            return [];
        }

        #updateDataFromForm() {
            this.__data = window.PeopleDB?.toPersonalData
                ? window.PeopleDB.toPersonalData({ attributes: this.#collect() })
                : this.#collect();
        }

        #matchesForSuggestion(kind, input) {
            const query = normalizeText(input?.value).toLowerCase();
            const selected = new Set(normalizeTextList(this.__data[kind]).map((value) => value.toLowerCase()));
            return this.#optionsFor(kind)
                .filter((option) => !query || option.toLowerCase().includes(query))
                .filter((option) => (kind === "languages" || kind === "hobbies" || kind === "disabilities" || kind === "allergies") ? !selected.has(option.toLowerCase()) : true);
        }

        #openSuggestions(kind, input) {
            const dropdown = this.querySelector(`[data-suggestions="${kind}"]`);
            if (!dropdown || !input) return;
            this.#closeSuggestions();
            const matches = this.#matchesForSuggestion(kind, input);
            if (!matches.length) {
                dropdown.hidden = true;
                dropdown.innerHTML = "";
                this.__suggestState = null;
                return;
            }
            dropdown.innerHTML = matches.map((option, index) => `
                <button type="button" class="pie__suggestion-button${index === 0 ? " is-active" : ""}" data-suggestion-kind="${escapeHtml(kind)}" data-suggestion-value="${escapeHtml(option)}" data-suggestion-index="${index}">${escapeHtml(option)}</button>`).join("");
            dropdown.hidden = false;
            this.__suggestState = { kind, input, dropdown, matches, activeIndex: 0 };
        }

        #closeSuggestions() {
            this.querySelectorAll('[data-suggestions]').forEach((dropdown) => {
                dropdown.hidden = true;
                dropdown.innerHTML = "";
            });
            this.__suggestState = null;
        }

        #applySuggestion(kind, value) {
            const clean = normalizeText(value);
            if (!clean) return;
            if (kind === "languages" || kind === "hobbies" || kind === "disabilities" || kind === "allergies") {
                let list = normalizeTextList(this.__data[kind]);
                const lower = clean.toLowerCase();
                if (kind === "disabilities" || kind === "allergies") {
                    // Unknown should be default and exclusive — remove it when adding a real value
                    list = list.filter((v) => String(v || "").toLowerCase() !== "unknown");
                    if (lower === "unknown") {
                        // selecting Unknown explicitly clears other selections
                        list = ["Unknown"];
                    } else {
                        list.push(clean);
                    }
                } else {
                    list.push(clean);
                }
                this.__data[kind] = normalizeTextList(list);
                const input = this.querySelector(`[data-suggest="${kind}"]`);
                if (input) input.value = "";
                this.#renderChipList(kind);
            } else {
                const input = this.querySelector(`[data-field="${kind}"]`);
                if (input) input.value = clean;
                this.__data[kind] = clean;
            }
            this.#updateDataFromForm();
            this.#closeSuggestions();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        #removeChip(kind, value) {
            this.__data[kind] = normalizeTextList(this.__data[kind]).filter((item) => item.toLowerCase() !== String(value || "").toLowerCase());
            if (!this.__data[kind] || this.__data[kind].length === 0) {
                this.__data[kind] = ["Unknown"];
            }
            this.#renderChipList(kind);
            this.#updateDataFromForm();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        #handleInput(event) {
            const target = event.target;
            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
            const suggest = String(target.dataset.suggest || "").trim();
            if (suggest) {
                this.#openSuggestions(suggest, target);
                if (!["languages", "hobbies"].includes(suggest)) {
                    this.__data[suggest] = normalizeText(target.value) || null;
                }
                this.#scheduleHistoryCapture();
                this.#notifyDirtyState();
                return;
            }
            if (target.closest("[data-history-row]")) {
                this.#scheduleHistoryCapture();
                this.#notifyDirtyState();
                return;
            }
            const field = String(target.dataset.field || "").trim();
            if (!field) return;
            if (field === "languagesInput" || field === "hobbiesInput") {
                this.#openSuggestions(field === "languagesInput" ? "languages" : "hobbies", target);
                return;
            }
            this.#syncYearRequirements();
            this.#updateDataFromForm();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        #handleChange(event) {
            const target = event.target;
            if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
            const field = String(target.dataset.field || "").trim();
            if (!field) return;
            this.#syncYearRequirements();
            this.#updateDataFromForm();
            this.#scheduleHistoryCapture();
            this.#notifyDirtyState();
        }

        #handleClick(event) {
            const suggestion = event.target.closest('[data-suggestion-kind]');
            if (suggestion) {
                event.preventDefault();
                this.#applySuggestion(suggestion.dataset.suggestionKind, suggestion.dataset.suggestionValue);
                return;
            }
            const chip = event.target.closest('[data-chip-remove]');
            if (chip) {
                event.preventDefault();
                this.#removeChip(chip.dataset.chipRemove, chip.dataset.chipValue);
                return;
            }
            const historyAdd = event.target.closest('[data-history-add]');
            if (historyAdd) {
                event.preventDefault();
                const measure = historyAdd.dataset.historyAdd;
                const list = this.querySelector(`[data-history-list="${measure}"]`);
                if (list) {
                    list.insertAdjacentHTML("beforeend", renderHistoryRow(measure, {}));
                    list.querySelector('[data-history-row]:last-child [data-history-year]')?.focus();
                    this.#notifyDirtyState();
                }
                return;
            }
            const historyRemove = event.target.closest('[data-history-remove]');
            if (historyRemove) {
                event.preventDefault();
                historyRemove.closest('[data-history-row]')?.remove();
                this.#notifyDirtyState();
                return;
            }
            const tokenControl = event.target.closest('[data-token-control]');
            if (tokenControl) {
                const input = tokenControl.querySelector('input[data-suggest]');
                input?.focus();
                if (input?.dataset.suggest) {
                    this.#openSuggestions(input.dataset.suggest, input);
                }
                return;
            }
            const suggestInput = event.target.closest('input[data-suggest]');
            if (suggestInput?.dataset.suggest) {
                this.#openSuggestions(suggestInput.dataset.suggest, suggestInput);
            }
        }

        #handleSuggestionFocusIn(event) {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.dataset.suggest) {
                this.#openSuggestions(target.dataset.suggest, target);
                return;
            }
            if (this.__suggestState && !this.#isInsideActiveSuggestion(target)) {
                this.#closeSuggestions();
            }
        }

        #handleSuggestionKeydown(event) {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            const kind = String(target.dataset.suggest || "").trim();
            const activeKind = kind;
            if (!activeKind) return;

            if ((event.key === "Enter" || event.key === ",") && (activeKind === "languages" || activeKind === "hobbies" || activeKind === "disabilities" || activeKind === "allergies")) {
                event.preventDefault();
                const state = this.__suggestState;
                if (state && state.kind === activeKind && state.matches[state.activeIndex]) {
                    this.#applySuggestion(activeKind, state.matches[state.activeIndex]);
                    return;
                }
                this.#applySuggestion(activeKind, target.value);
                return;
            }

            const state = this.__suggestState;
            if (!state || state.kind !== activeKind || state.dropdown.hidden) return;
            const buttons = [...state.dropdown.querySelectorAll('[data-suggestion-index]')];
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
                this.#applySuggestion(activeKind, state.matches[state.activeIndex] || target.value);
                return;
            }
            if (event.key === "Escape") {
                this.#closeSuggestions();
            }
        }

        async #buildPublishFiles() {
            if (!this.#isDirty()) {
                return [];
            }
            const missingYear = this.#findMissingMeasurementYear();
            if (missingYear) {
                missingYear.yearInput.classList.add("is-invalid");
                document.dispatchEvent(new CustomEvent("profile-editor-activate-tab", { detail: { tab: "personal" } }));
                requestAnimationFrame(() => missingYear.yearInput.focus());
                throw new Error(`Enter the year for the ${missingYear.label} measurement.`);
            }
            await ensurePeopleDb();
            if (!window.PeopleDB) {
                return [];
            }
            let record = this.__record || null;
            if (!record) {
                try {
                    record = await window.PeopleDB.loadPerson(this.__personId);
                } catch (error) {
                    record = null;
                }
            }
            record = record || window.PeopleDB.emptyRecord(this.__personId);

            const infoboxData = document.querySelector("profile-infobox-editor")?.getProfileData?.();
            if (infoboxData) {
                record = window.PeopleDB.applyInfoboxToRecord(record, infoboxData);
            }
            const updated = window.PeopleDB.applyPersonalToRecord(record, this.#collect());
            this.__record = updated;
            return [
                {
                    path: window.PeopleDB.recordPath(this.__personId),
                    content: `${JSON.stringify(updated, null, 2)}\n`,
                },
                {
                    path: `people/${this.__personId}/index.html`,
                    content: window.PeopleDB.buildProfileShellHtml(updated),
                },
            ];
        }
    }

    if (!customElements.get("profile-personal-editor")) {
        customElements.define("profile-personal-editor", ProfilePersonalEditor);
    }
})();
