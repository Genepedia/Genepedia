/**
 * <profile-editor> — the people/edit.html shell.
 *
 * Replaces the generic block-based <page-editor> for profiles with a focused,
 * two-tab experience:
 *   • Profile page — a WYSIWYG <profile-page-editor> that edits the prose of
 *     people/<id>/data/profile.html with the identity infobox floated in place,
 *     exactly as it looks live, so text wraps around it while you type.
 *   • Infobox — the structured <profile-infobox-editor> for the identity table
 *     (saved to profile-table.html + family-tree.ged).
 *
 * It owns the toolbar (breadcrumb, tabs, Save) and the publish flow: one Save
 * collects the profile fragment plus any extra files (the infobox) and opens a
 * single pull request via github-submit-page-edit.php.
 */
(function () {
	"use strict";

	const params = new URLSearchParams(window.location.search);
	const PERSON_ID = (params.get("person") || "").trim();
	const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/.test(PERSON_ID);

	function resolveSiteUrl(path) {
		const clean = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(clean);
		return new URL(`../${clean}`, window.location.href).href;
	}

	function resolveGitHubApiUrl(fileName) {
		const base = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "").trim();
		if (!base) return "";
		try {
			return new URL(fileName, base.replace(/\/+$/, "") + "/").href;
		} catch (error) {
			return "";
		}
	}

	function gitHubFetchInit(init) {
		return window.App?.getGitHubFetchInit?.(init) || {
			credentials: "include",
			...(init || {}),
			headers: { Accept: "application/json", ...((init && init.headers) || {}) },
		};
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, (char) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[char]));
	}

	const TEMPLATE = `
		<div class="profile-edit__bar">
			<nav class="profile-edit__breadcrumb" aria-label="Breadcrumb">
				<ol class="profile-edit__breadcrumb-list">
					<li><a class="profile-edit__breadcrumb-home" href="#">People</a></li>
					<li class="profile-edit__breadcrumb-sep" aria-hidden="true">›</li>
					<li><a class="profile-edit__breadcrumb-current" href="#">Profile</a></li>
				</ol>
			</nav>
			<div class="profile-edit__tabs" role="tablist" aria-label="Profile editor sections">
				<button type="button" class="profile-edit__tab is-active" data-edit-tab="profile" role="tab" aria-selected="true">Profile page</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="infobox" role="tab" aria-selected="false">Infobox</button>
			</div>
			<div class="profile-edit__actions">
				<span class="profile-edit__status" role="status" aria-live="polite" hidden></span>
				<input type="text" class="profile-edit__summary" maxlength="120" placeholder="Summary of changes (optional)" aria-label="Summary of changes">
				<button type="button" class="profile-edit__save" data-action="publish" disabled>
					<i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
					<span>Save changes</span>
				</button>
			</div>
		</div>
		<div class="profile-edit__panels">
			<div class="profile-edit__panel" data-edit-panel="profile"></div>
			<div class="profile-edit__panel" data-edit-panel="infobox" hidden></div>
		</div>
	`;

	class ProfileEditor extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;
			this.__activeTab = "profile";

			this.innerHTML = TEMPLATE;

			if (!VALID_ID) {
				this.querySelector(".profile-edit__panels").innerHTML =
					"<p class=\"profile-edit__error\">No valid profile id was provided. Open this editor from a profile’s Edit button.</p>";
				return;
			}

			this.#mountChildren();
			this.#wireBreadcrumb();
			this.#bindTabs();
			this.#bindSave();
			this.#bindEvents();
			this.#refreshDirtyState();

			window.addEventListener("beforeunload", this.#onBeforeUnload);
		}

		disconnectedCallback() {
			window.removeEventListener("beforeunload", this.#onBeforeUnload);
		}

		#mountChildren() {
			const profilePanel = this.querySelector('[data-edit-panel="profile"]');
			const infoboxPanel = this.querySelector('[data-edit-panel="infobox"]');

			const pageEditor = document.createElement("profile-page-editor");
			pageEditor.setAttribute("person", PERSON_ID);
			profilePanel.append(pageEditor);

			const infobox = document.createElement("profile-infobox-editor");
			infobox.setAttribute("person", PERSON_ID);
			infoboxPanel.append(infobox);

			this.__pageEditor = pageEditor;
			this.__infobox = infobox;
		}

		#wireBreadcrumb() {
			const home = this.querySelector(".profile-edit__breadcrumb-home");
			const current = this.querySelector(".profile-edit__breadcrumb-current");
			if (home) home.href = resolveSiteUrl("people/");
			if (current) current.href = resolveSiteUrl(`people/${PERSON_ID}/profile.html`);
		}

		#bindTabs() {
			this.querySelectorAll(".profile-edit__tab").forEach((tab) => {
				tab.addEventListener("click", () => this.#activate(tab.dataset.editTab));
			});
		}

		#activate(name) {
			this.__activeTab = name;
			this.querySelectorAll(".profile-edit__tab").forEach((tab) => {
				const active = tab.dataset.editTab === name;
				tab.classList.toggle("is-active", active);
				tab.setAttribute("aria-selected", active ? "true" : "false");
			});
			this.querySelectorAll(".profile-edit__panel").forEach((panel) => {
				panel.hidden = panel.dataset.editPanel !== name;
			});
			// Returning to the live preview: refresh the floated infobox so any
			// edits made on the Infobox tab are reflected immediately.
			if (name === "profile" && typeof this.__pageEditor?.refreshInfoboxPreview === "function") {
				this.__pageEditor.refreshInfoboxPreview();
			}
		}

		#bindSave() {
			this.querySelector(".profile-edit__save")?.addEventListener("click", () => this.#save());
			// Ctrl/Cmd+S saves from anywhere on the page.
			document.addEventListener("keydown", (event) => {
				if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.#save();
				}
			});
		}

		#bindEvents() {
			// Dirty signals from either editor.
			this.addEventListener("profile-page-dirty-change", () => this.#refreshDirtyState());
			document.addEventListener("profile-editor-dirty-change", () => {
				this.#refreshDirtyState();
				// The infobox editor fires this once it finishes loading; refresh the
				// floated preview so the infobox shows on first paint of the Profile
				// tab without needing to visit the Infobox tab first.
				if (this.__activeTab === "profile") {
					this.__pageEditor?.refreshInfoboxPreview?.();
				}
			});
			// The infobox form's own submit/Enter asks us to save.
			document.addEventListener("profile-editor-save-request", () => this.#save());
			// Clicking the floated infobox in the WYSIWYG jumps to the Infobox tab.
			document.addEventListener("profile-editor-activate-tab", (event) => {
				const tab = event.detail?.tab;
				if (tab) this.#activate(tab);
			});
			// Keep the WYSIWYG title in step with the infobox display name.
			document.addEventListener("profile-display-name-change", (event) => {
				const name = event.detail?.name;
				this.__pageEditor?.setDisplayName?.(name);
				const current = this.querySelector(".profile-edit__breadcrumb-current");
				if (current && name) current.textContent = name;
			});
		}

		#onBeforeUnload = (event) => {
			if (this.#isDirty()) {
				event.preventDefault();
				event.returnValue = "";
			}
		};

		#isInfoboxDirty() {
			if (!Array.isArray(window.__extraDirtyStateProviders)) return false;
			return window.__extraDirtyStateProviders.some((fn) => {
				try {
					return Boolean(fn());
				} catch (error) {
					return false;
				}
			});
		}

		#isDirty() {
			return Boolean(this.__pageEditor?.isDirty?.())
				|| Boolean(this.__pageEditor?.hasPendingInfoboxStructureChange?.())
				|| this.#isInfoboxDirty();
		}

		// Public hook used by the infobox editor to flag dirty changes.
		refreshDirtyState() {
			this.#refreshDirtyState();
		}

		#refreshDirtyState() {
			const saveBtn = this.querySelector(".profile-edit__save");
			if (saveBtn && !this.__saving) {
				saveBtn.disabled = !this.#isDirty();
			}
		}

		#setStatus(message, type = "info", html = "") {
			const status = this.querySelector(".profile-edit__status");
			if (!status) return;
			if (html) status.innerHTML = html;
			else status.textContent = message || "";
			status.dataset.type = type;
			status.hidden = !message && !html;
		}

		async #collectExtraFiles() {
			if (!Array.isArray(window.__extraPublishFileProviders) || !window.__extraPublishFileProviders.length) {
				return [];
			}
			try {
				const arrays = await Promise.all(window.__extraPublishFileProviders.map((fn) => {
					try {
						return fn();
					} catch (error) {
						return [];
					}
				}));
				return arrays.flat().filter(Boolean)
					.map((file) => ({ path: String(file.path || ""), content: String(file.content || "") }))
					.filter((file) => file.path && file.content);
			} catch (error) {
				return [];
			}
		}

		async #save() {
			if (this.__saving || !VALID_ID) return;
			if (!this.#isDirty()) {
				this.#setStatus("Nothing to save yet.", "info");
				return;
			}

			const endpoint = resolveGitHubApiUrl("github-submit-page-edit.php");
			if (!endpoint) {
				this.#setStatus("The publishing service is not configured.", "error");
				return;
			}

			// Save only what changed: prose edits (or adopting the canonical
			// infobox <include>) write profile.html; infobox edits write
			// profile-table.html / the GEDCOM. Keeps each save to a minimal diff.
			const files = [];
			const wantsProfileHtml = Boolean(this.__pageEditor?.isDirty?.())
				|| Boolean(this.__pageEditor?.hasPendingInfoboxStructureChange?.());
			if (wantsProfileHtml) {
				const mainFile = this.__pageEditor.getPublishFile?.();
				if (!mainFile?.content) {
					this.#setStatus("Could not read the profile content.", "error");
					return;
				}
				files.push(mainFile);
			}

			// The infobox editor's fragment takes precedence for profile-table.html.
			if (this.#isInfoboxDirty()) {
				const extras = await this.#collectExtraFiles();
				extras.forEach((file) => {
					if (!files.some((existing) => existing.path === file.path)) files.push(file);
				});
			}

			// Fill in profile-table.html when converting a legacy inline identity
			// and the infobox editor isn't the one writing it this time.
			if (wantsProfileHtml) {
				const migration = this.__pageEditor.getInfoboxMigrationFile?.();
				if (migration && !files.some((existing) => existing.path === migration.path)) {
					files.push(migration);
				}
			}

			if (!files.length) {
				this.#setStatus("Nothing to save yet.", "info");
				return;
			}

			const saveBtn = this.querySelector(".profile-edit__save");
			this.__saving = true;
			if (saveBtn) saveBtn.disabled = true;
			this.#setStatus("Saving — creating a pull request…", "info");

			const name = this.querySelector(".profile-edit__breadcrumb-current")?.textContent?.trim() || PERSON_ID;
			const summary = this.querySelector(".profile-edit__summary")?.value?.trim() || "";
			const commitMessage = summary
				? `Update ${name}: ${summary}`
				: `Update profile: ${name}`;

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files,
						commit_message: commitMessage,
						pr_title: commitMessage,
						pr_body: summary,
					}),
				}));

				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub (site header) to save your changes.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				// Reset baselines so the editor is clean again.
				const summaryInput = this.querySelector(".profile-edit__summary");
				if (summaryInput) summaryInput.value = "";
				this.__pageEditor?.setSavedBaseline?.();
				if (Array.isArray(window.__extraDirtyStateResetCallbacks)) {
					window.__extraDirtyStateResetCallbacks.forEach((fn) => {
						try {
							fn();
						} catch (error) {
							/* ignore */
						}
					});
				}

				const prUrl = payload.pull_request?.url || "";
				const prNumber = payload.pull_request?.number;
				if (prUrl) {
					this.#setStatus("", "success",
						`Saved — pull request <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener noreferrer">#${escapeHtml(String(prNumber || ""))}</a> created.`);
				} else {
					this.#setStatus("Your changes were saved.", "success");
				}
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}
	}

	if (!customElements.get("profile-editor")) {
		customElements.define("profile-editor", ProfileEditor);
	}
})();
