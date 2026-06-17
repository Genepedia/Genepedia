(function () {
    "use strict";

    function resolveSiteUrl(path) {
        const clean = String(path || "").replace(/^\/+/, "");
        if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(clean);
        return new URL(`../${clean}`, window.location.href).href;
    }

    function normalizeGitHubLogin(userOrLogin) {
        if (typeof userOrLogin === "string") {
            return userOrLogin.trim().toLowerCase();
        }

        return String(userOrLogin?.login || userOrLogin?.githubLogin || "").trim().toLowerCase();
    }

    function normalizeUser(user) {
        const login = String(user?.login || user?.githubLogin || "").trim();
        const displayName = String(user?.displayName || user?.name || "").trim();
        let givenName = String(user?.givenName || "").trim();
        let familyName = String(user?.familyName || "").trim();

        if ((!givenName && !familyName) && displayName) {
            const parts = displayName.split(/\s+/).filter(Boolean);
            givenName = parts.shift() || "";
            familyName = parts.join(" ");
        }

        return {
            login,
            displayName: `${givenName} ${familyName}`.trim() || displayName || login,
        };
    }

    function readStoredUser() {
        try {
            const user = window.App?.getGitHubUser?.();
            if (user) return normalizeUser(user);
        } catch (error) {
            // fall through
        }

        try {
            const raw = localStorage.getItem("app-header-session");
            return raw ? normalizeUser(JSON.parse(raw)) : null;
        } catch (error) {
            return null;
        }
    }

    function compactText(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    function identityLogin(identity) {
        if (typeof identity === "string") {
            return normalizeGitHubLogin(identity);
        }

        if (!identity || typeof identity !== "object") {
            return "";
        }

        return normalizeGitHubLogin(identity.githubLogin || identity.github_login || identity.login || "");
    }

    function profileManagerLogins(config) {
        const logins = new Set();
        const add = (identity) => {
            const login = identityLogin(identity);
            if (login) logins.add(login);
        };

        const ownerLogin = identityLogin(config?.owner);
        if (ownerLogin) {
            logins.add(ownerLogin);
        }

        (Array.isArray(config?.maintainers) ? config.maintainers : []).forEach(add);

        if (!ownerLogin) {
            add(config?.creator);
        }

        return logins;
    }

    function emptyPrivacyState() {
        return {
            visibility: "private",
            maintainersOnly: true,
        };
    }

    function normalizePrivacyState(value, { deceased = false } = {}) {
        const source = value && typeof value === "object" ? value : {};
        if (deceased) {
            return {
                visibility: "public",
                maintainersOnly: false,
            };
        }

        // Living profiles default to public; a maintainer can opt a living profile
        // into private. (GEDCOM imports set living profiles private explicitly.)
        const rawVisibility = String(source.visibility || source.mode || "public").trim().toLowerCase();
        const visibility = rawVisibility === "private" ? "private" : "public";
        return {
            visibility,
            maintainersOnly: visibility === "private",
        };
    }

    const TEMPLATE = `
        <section class="ppriv pie" aria-label="Privacy editor">
            <style>
                /* Reuse the shared editor look (.pie__group / .pie__legend /
                   .pie__intro / .pie__status) so this tab matches the others;
                   only the privacy-specific option cards and banner are local. */
                .ppriv { width: 100%; }

                .ppriv__options {
                    display: grid;
                    gap: 0.55rem;
                    margin-top: 0.75rem;
                }

                .ppriv__option {
                    display: grid;
                    gap: 0.2rem;
                    padding: 0.7rem 0.85rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    border-radius: 0.125rem;
                    background: rgba(0, 0, 0, 0.02);
                }

                .ppriv__option-control {
                    display: flex;
                    align-items: start;
                    gap: 0.55rem;
                    font-weight: 600;
                }

                .ppriv__option-copy {
                    margin-left: 1.55rem;
                    color: #54595d;
                    font-size: 0.86rem;
                    line-height: 1.45;
                }

                .ppriv__banner {
                    display: flex;
                    gap: 0.6rem;
                    align-items: start;
                    margin: 0 0 1.5rem;
                    padding: 0.7rem 0.85rem;
                    border: 1px solid rgba(51, 102, 204, 0.24);
                    border-radius: 0.125rem;
                    background: rgba(51, 102, 204, 0.08);
                    color: inherit;
                }

                .ppriv__banner i {
                    font-size: 1rem;
                    line-height: 1;
                    margin-top: 0.05rem;
                }

                .ppriv__banner-title {
                    margin: 0 0 0.2rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .ppriv__banner p {
                    margin: 0;
                    font-size: 0.86rem;
                    line-height: 1.45;
                }

                body.theme-dark .ppriv__option-copy {
                    color: #c8ccd1;
                }

                body.theme-dark .ppriv__option {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: rgba(255, 255, 255, 0.04);
                }

                body.theme-dark .ppriv__banner {
                    border-color: rgba(107, 158, 255, 0.28);
                    background: rgba(107, 158, 255, 0.12);
                }
            </style>
            <fieldset class="pie__group">
                <legend class="pie__legend">Profile Visibility</legend>
                <p class="pie__intro">Only maintainers can change profile privacy. Deceased profiles are always public.</p>
                <div class="ppriv__options">
                    <label class="ppriv__option">
                        <span class="ppriv__option-control"><input type="radio" name="privacy-visibility" value="public"> Public profile</span>
                        <span class="ppriv__option-copy">Visible to everyone. All profile details render normally.</span>
                    </label>
                    <label class="ppriv__option">
                        <span class="ppriv__option-control"><input type="radio" name="privacy-visibility" value="private"> Private profile</span>
                        <span class="ppriv__option-copy">Public visitors only see the name. Details are blurred and marked private. Maintainers, contributors, and close family can still view the full profile.</span>
                    </label>
                </div>
                <p class="ppriv__status pie__status" role="status" hidden></p>
            </fieldset>
            <div class="ppriv__banner" data-role="privacy-banner" hidden>
                <i class="bi bi-shield-lock" aria-hidden="true"></i>
                <div>
                    <p class="ppriv__banner-title">Private profile</p>
                    <p>This profile is limited to maintainers, contributors, and close family while the person is living.</p>
                </div>
            </div>
        </section>
    `;

    class ProfilePrivacyEditor extends HTMLElement {
        connectedCallback() {
            if (this.__rendered) return;
            this.__rendered = true;
            this.__personId = String(this.getAttribute("person") || new URLSearchParams(window.location.search).get("person") || "").trim();
            this.__config = {};
            this.__savedSnapshot = "";
            this.__canManage = false;
            this.__deceased = false;
            this.innerHTML = TEMPLATE;

            this.__onInput = () => this.#handleInput();
            this.addEventListener("input", this.__onInput);

            this.#registerProviders();
            void this.#load();
        }

        disconnectedCallback() {
            this.removeEventListener("input", this.__onInput);
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

        getPrivacyData() {
            return normalizePrivacyState({
                visibility: this.querySelector('input[name="privacy-visibility"]:checked')?.value || "public",
            }, { deceased: this.__deceased });
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

        async #getCurrentUser() {
            const stored = readStoredUser();
            if (stored?.login) {
                return stored;
            }

            const apiBase = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "").trim().replace(/\/+$/, "");
            if (!apiBase) {
                return null;
            }

            try {
                const response = await fetch(new URL("github-session.php", `${apiBase}/`).href, window.App?.getGitHubFetchInit?.({ cache: "no-store" }) || { credentials: "include" });
                const payload = await response.json().catch(() => null);
                if (response.ok && payload?.authenticated && payload.user) {
                    return normalizeUser(payload.user);
                }
            } catch (error) {
                return null;
            }

            return null;
        }

        async #loadProfileConfig() {
            if (!this.__personId) return {};
            const numeric = Number(String(this.__personId).replace(/[^0-9]/g, "")) || 1;
            const bucket = Math.floor((Math.max(1, numeric) - 1) / 1000);
            try {
                const response = await fetch(resolveSiteUrl(`data/Genepedia-Database/people/ownership/${bucket}/${this.__personId}.json`), { cache: "no-store" });
                if (!response.ok) return {};
                const payload = await response.json().catch(() => ({}));
                return payload && typeof payload === "object" ? payload : {};
            } catch (error) {
                return {};
            }
        }

        async #loadPersonRecord() {
            if (!this.__personId) return null;
            const numeric = Number(String(this.__personId).replace(/[^0-9]/g, "")) || 1;
            const bucket = Math.floor((Math.max(1, numeric) - 1) / 1000);
            try {
                const response = await fetch(resolveSiteUrl(`data/Genepedia-Database/people/persons/${bucket}/${this.__personId}.json`), { cache: "no-store" });
                if (!response.ok) return null;
                return await response.json().catch(() => null);
            } catch (error) {
                return null;
            }
        }

        async #load() {
            const [config, record, user] = await Promise.all([
                this.#loadProfileConfig(),
                this.#loadPersonRecord(),
                this.#getCurrentUser(),
            ]);

            this.__config = config || {};
            this.__deceased = Boolean(record?.events?.death || (!record?.living && record?.living !== undefined));
            this.__canManage = Boolean(user?.login)
                && profileManagerLogins(this.__config).has(normalizeGitHubLogin(user));

            const state = normalizePrivacyState(this.__config?.privacy, { deceased: this.__deceased });
            this.#applyState(state);
            this.#syncAvailability();
            this.#setSavedBaseline({ quiet: true });
            this.#notifyDirtyState();
        }

        #applyState(state) {
            this.querySelectorAll('input[name="privacy-visibility"]').forEach((input) => {
                input.checked = input.value === state.visibility;
            });
            const banner = this.querySelector('[data-role="privacy-banner"]');
            if (banner) {
                banner.hidden = state.visibility !== "private";
            }
        }

        #syncAvailability() {
            const radios = [...this.querySelectorAll('input[name="privacy-visibility"]')];
            const status = this.querySelector('.ppriv__status');
            const privateRadio = radios.find((input) => input.value === "private");

            if (!this.__canManage) {
                radios.forEach((input) => { input.disabled = true; });
                if (status) {
                    status.hidden = false;
                    status.dataset.type = "info";
                    status.textContent = "Only profile maintainers can change privacy settings.";
                }
                return;
            }

            if (this.__deceased) {
                radios.forEach((input) => {
                    input.disabled = true;
                    input.checked = input.value === "public";
                });
                if (status) {
                    status.hidden = false;
                    status.dataset.type = "info";
                    status.textContent = "Deceased profiles are always public.";
                }
                return;
            }

            radios.forEach((input) => { input.disabled = false; });
            if (privateRadio) {
                privateRadio.disabled = false;
            }
            if (status) {
                status.hidden = true;
                status.textContent = "";
                delete status.dataset.type;
            }
        }

        #snapshotState() {
            return JSON.stringify(this.getPrivacyData());
        }

        #setSavedBaseline({ quiet = false } = {}) {
            this.__savedSnapshot = this.#snapshotState();
            if (!quiet) this.#notifyDirtyState();
        }

        #isDirty() {
            return Boolean(this.__savedSnapshot) && this.#snapshotState() !== this.__savedSnapshot;
        }

        #notifyDirtyState() {
            document.querySelector("profile-editor")?.refreshDirtyState?.();
            document.dispatchEvent(new CustomEvent("profile-editor-dirty-change"));
        }

        #handleInput() {
            if (!this.__canManage || this.__deceased) {
                this.#applyState(normalizePrivacyState(this.__config?.privacy, { deceased: this.__deceased }));
                return;
            }

            const banner = this.querySelector('[data-role="privacy-banner"]');
            if (banner) {
                banner.hidden = this.getPrivacyData().visibility !== "private";
            }
            this.#notifyDirtyState();
        }

        async #buildPublishFiles() {
            if (!this.#isDirty() || !this.__canManage || !this.__personId) {
                return [];
            }

            const numeric = Number(String(this.__personId).replace(/[^0-9]/g, "")) || 1;
            const bucket = Math.floor((Math.max(1, numeric) - 1) / 1000);
            const current = await this.#loadProfileConfig();
            const next = {
                ...(current && typeof current === "object" ? current : {}),
                privacy: this.getPrivacyData(),
            };

            return [{
                path: `data/Genepedia-Database/people/ownership/${bucket}/${this.__personId}.json`,
                content: `${JSON.stringify(next, null, 2)}\n`,
            }];
        }
    }

    if (!customElements.get("profile-privacy-editor")) {
        customElements.define("profile-privacy-editor", ProfilePrivacyEditor);
    }
})();