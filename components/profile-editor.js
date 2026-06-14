/**
 * <profile-editor> — the people/edit.html shell.
 *
 * Replaces the generic block-based <page-editor> for profiles with a focused,
 * two-tab experience:
 *   • Identity — the structured <profile-infobox-editor> for the identity table
 *     (saved to profile-table.html + family-tree.ged).
 *   • Page — a WYSIWYG <profile-page-editor> that edits the prose of
 *     people/<id>/data/profile.html with the identity infobox floated in place,
 *     exactly as it looks live, so text wraps around it while you type.
 *
 * It owns the toolbar (breadcrumb, tabs, Save) and the publish flow: one Save
 * collects the profile fragment plus any extra files (the infobox). Existing
 * profiles are committed directly when the signed-in user manages them, or sent
 * for review otherwise. Brand-new profiles are committed directly, with
 * self-profile drafts checking for claimable matches first.
 */
(function () {
	"use strict";

	const params = new URLSearchParams(window.location.search);
	const PERSON_ID = (params.get("person") || "").trim();
	const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/.test(PERSON_ID);
	const SELF_PROFILE_MODE = params.get("self") === "1";
	const SELF_RETURN_TARGET = (params.get("return") || "profile").trim().toLowerCase();
	const SELF_PROFILE_MATCH_LIMIT = 8;

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

		if (!givenName && !familyName && login) {
			givenName = login;
		}

		return {
			id: String(user?.id || "").trim(),
			login,
			displayName: `${givenName} ${familyName}`.trim() || displayName || login,
			givenName,
			familyName,
			photoUrl: String(user?.photoUrl || user?.avatarUrl || "").trim(),
			profileUrl: String(user?.profileUrl || (login ? `https://github.com/${login}` : "")).trim(),
			email: String(user?.email || "").trim(),
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

	function comparableName(value) {
		return compactText(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
	}

	function extractYear(value) {
		const match = String(value || "").match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/);
		return match ? match[0] : "";
	}

	function displayNameFromProfileData(data = {}) {
		const direct = compactText(data.displayName);
		if (direct) return direct;
		const surname = compactText(data.lastName) || compactText(data.birthSurname);
		return [data.title, data.firstName, data.middleName, surname, data.suffix]
			.map(compactText)
			.filter(Boolean)
			.join(" ");
	}

	function hasRequiredProfileName(data = {}) {
		if (window.AppProfileInfobox?.hasRequiredProfileName) {
			return window.AppProfileInfobox.hasRequiredProfileName(data);
		}
		return Boolean(compactText(data.firstName) || compactText(data.lastName));
	}

	function registryEntryFromProfileData(personId, data = {}) {
		const displayName = displayNameFromProfileData(data);
		const parts = displayName.split(/\s+/).filter(Boolean);
		const firstName = compactText(data.firstName) || parts[0] || "Profile";
		const explicitLast = compactText(data.lastName) || compactText(data.birthSurname);
		const lastName = explicitLast || (parts.length > 1 ? parts.slice(1).join(" ") : personId);
		const entry = {
			id: String(personId),
			firstName,
			lastName,
		};

		const birthYear = extractYear(data.birth?.date);
		if (birthYear) entry.birthYear = birthYear;
		const deathYear = data.status === "deceased" ? extractYear(data.death?.date) : "";
		if (deathYear) entry.deathYear = deathYear;
		return entry;
	}

	function claimIdentity(personId, user, fallbackName) {
		const normalized = normalizeUser(user || {});
		return {
			personId: String(personId),
			name: compactText(fallbackName) || normalized.displayName || normalized.login || "Genepedia user",
			githubLogin: normalized.login,
		};
	}

	function buildProfileConfig(personId, data, user, { claimSelf = true } = {}) {
		const identity = claimIdentity(personId, user, displayNameFromProfileData(data));
		return `${JSON.stringify({
			creator: identity,
			owner: claimSelf ? identity : null,
			maintainers: [identity],
		}, null, 2)}\n`;
	}

	function buildProfileShell(personId) {
		return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title data-brand-template="{{APP_NAME}} Profile ${personId}"></title>
    <script src="../../site-info.js"></script>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css">
	<style>
		html,
		body {
			margin: 0;
		}
	</style>
<script defer src="../../lib/Web-Framework/components/mini-header.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-header.js"></script>
	<script defer src="../../components/people-page-profile-table.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-page-toolbar.js"></script>
	<script defer src="../../components/people-page.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-footer.js"></script>
</head>

<body>
	<full-header></full-header>
	<article>
		<people-page></people-page>
		<full-footer></full-footer>
	</article>
</body>

</html>`;
	}

	function scoreSelfProfileCandidate(person, data) {
		const candidateFirst = comparableName(person?.firstName);
		const candidateLast = comparableName(person?.lastName);
		const candidateName = comparableName([person?.firstName, person?.lastName].filter(Boolean).join(" "));
		const draftFirst = comparableName(data.firstName);
		const draftLast = comparableName(data.lastName || data.birthSurname);
		const draftName = comparableName(displayNameFromProfileData(data));
		const birthYear = extractYear(data.birth?.date);
		const candidateBirthYear = String(person?.birthYear || "").trim();
		const candidateDeathYear = String(person?.deathYear || "").trim();

		let score = 0;
		const reasons = [];

		if (draftName && candidateName && draftName === candidateName) {
			score += 8;
			reasons.push("same full name");
		} else if (draftFirst && draftLast && candidateFirst === draftFirst && candidateLast === draftLast) {
			score += 7;
			reasons.push("same first and last name");
		} else if (draftLast && candidateLast === draftLast && draftFirst && candidateFirst.startsWith(draftFirst.slice(0, 1))) {
			score += 4;
			reasons.push("same last name and first initial");
		} else if (draftLast && candidateLast === draftLast) {
			score += 3;
			reasons.push("same last name");
		} else if (draftFirst && candidateFirst === draftFirst && draftName && candidateName.includes(draftFirst)) {
			score += 2;
			reasons.push("same first name");
		}

		if (birthYear && candidateBirthYear && birthYear === candidateBirthYear) {
			score += 3;
			reasons.push("same birth year");
		}

		if (data.status === "living" && candidateDeathYear) {
			score -= 5;
		}

		const hasSpecificName = Boolean(draftLast || (draftFirst && draftName.split(" ").length > 1));
		const threshold = hasSpecificName ? 3 : 8;
		return score >= threshold ? { score, reasons } : null;
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
				<button type="button" class="profile-edit__tab is-active" data-edit-tab="profile" role="tab" aria-selected="true">Page</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="infobox" role="tab" aria-selected="false">Identity</button>
			</div>
			<div class="profile-edit__actions">
				<span class="profile-edit__status" role="status" aria-live="polite" hidden></span>
				<button type="button" class="profile-edit__save page-editor__button page-editor__button--save" data-action="publish" disabled>
					<i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
					<span>Save</span>
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
			this.__isDraftProfile = SELF_PROFILE_MODE || params.get("new") === "1";

			this.innerHTML = TEMPLATE;
			this.classList.toggle("profile-edit--self", SELF_PROFILE_MODE);

			if (!VALID_ID) {
				this.querySelector(".profile-edit__panels").innerHTML =
					"<p class=\"profile-edit__error\">No valid profile id was provided. Open this editor from a profile’s Edit button.</p>";
				return;
			}

			if (SELF_PROFILE_MODE) {
				const saveLabel = this.querySelector(".profile-edit__save span");
				if (saveLabel) saveLabel.textContent = "Save profile";
			} else if (params.get("new") === "1") {
				this.#setBreadcrumbCurrent("New Tree");
			}

			this.#mountChildren();
			void this.#initBreadcrumb();
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

		#setBreadcrumbCurrent(text, { href = null } = {}) {
			const current = this.querySelector(".profile-edit__breadcrumb-current");
			if (!current) return;

			const wantsLink = Boolean(href);
			if (wantsLink && current.tagName !== "A") {
				const link = document.createElement("a");
				link.className = "profile-edit__breadcrumb-current";
				link.href = href;
				link.textContent = text;
				current.replaceWith(link);
				return;
			}

			if (!wantsLink && current.tagName === "A") {
				const label = document.createElement("span");
				label.className = "profile-edit__breadcrumb-current";
				label.setAttribute("aria-current", "page");
				label.textContent = text;
				current.replaceWith(label);
				return;
			}

			current.textContent = text;
			if (wantsLink && current.tagName === "A") {
				current.href = href;
				current.removeAttribute("aria-current");
			} else if (!wantsLink && current.tagName === "SPAN") {
				current.setAttribute("aria-current", "page");
			}
		}

		async #initBreadcrumb() {
			const home = this.querySelector(".profile-edit__breadcrumb-home");
			if (home) home.href = resolveSiteUrl("people/");

			if (SELF_PROFILE_MODE) {
				this.__isDraftProfile = true;
				this.#setBreadcrumbCurrent("Your profile");
				return;
			}

			const isDraft = params.get("new") === "1" || !(await this.#checkProfileExists());
			this.__isDraftProfile = isDraft;

			if (isDraft) {
				this.#setBreadcrumbCurrent("New Tree");
				return;
			}

			this.#setBreadcrumbCurrent("Profile", {
				href: resolveSiteUrl(`people/${PERSON_ID}/profile.html`),
			});
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
			// Returning to the Page tab: refresh the floated infobox so any
			// edits made on the Identity tab are reflected immediately.
			if (name === "profile" && typeof this.__pageEditor?.refreshInfoboxPreview === "function") {
				this.__pageEditor.refreshInfoboxPreview();
			}
		}

		#focusRequiredNameField() {
			const first = this.__infobox?.querySelector?.('[data-field="firstName"]');
			const last = this.__infobox?.querySelector?.('[data-field="lastName"]');
			(first || last)?.focus();
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
				// floated preview when the Page tab is active so the infobox shows
				// without needing to visit the Identity tab first.
				if (this.__activeTab === "profile") {
					this.__pageEditor?.refreshInfoboxPreview?.();
				}
			});
			// The infobox form's own submit/Enter asks us to save.
			document.addEventListener("profile-editor-save-request", () => this.#save());
			// Clicking the floated infobox in the WYSIWYG jumps to the Identity tab.
			document.addEventListener("profile-editor-activate-tab", (event) => {
				const tab = event.detail?.tab;
				if (tab) this.#activate(tab);
			});
			// Keep the WYSIWYG title in step with the infobox display name.
			document.addEventListener("profile-display-name-change", (event) => {
				const name = event.detail?.name;
				this.__pageEditor?.setDisplayName?.(name);
				if (!name) return;
				this.#setBreadcrumbCurrent(name, this.__isDraftProfile
					? {}
					: { href: resolveSiteUrl(`people/${PERSON_ID}/profile.html`) });
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

		async #getCurrentUser() {
			const stored = readStoredUser();
			if (stored?.login) {
				return stored;
			}

			const endpoint = resolveGitHubApiUrl("github-session.php");
			if (!endpoint) {
				return null;
			}

			try {
				const response = await fetch(endpoint, gitHubFetchInit({ cache: "no-store" }));
				const payload = await response.json().catch(() => null);
				if (response.ok && payload?.authenticated && payload.user) {
					return normalizeUser(payload.user);
				}
			} catch (error) {
				return null;
			}

			return null;
		}

		async #loadPeopleRegistry() {
			try {
				if (window.PeopleRegistry?.loadPeopleRegistry) {
					return await window.PeopleRegistry.loadPeopleRegistry({ refresh: true });
				}
				const response = await fetch(resolveSiteUrl("people/people.json"), { cache: "no-store" });
				const payload = await response.json();
				return Array.isArray(payload?.people) ? payload.people : [];
			} catch (error) {
				return [];
			}
		}

		async #loadProfileConfig(personId) {
			try {
				const response = await fetch(resolveSiteUrl(`people/${personId}/profile.json`), { cache: "no-store" });
				if (!response.ok) return null;
				const payload = await response.json();
				return payload && typeof payload === "object" ? payload : null;
			} catch (error) {
				return null;
			}
		}

		#profileData() {
			return this.__infobox?.getProfileData?.() || {};
		}

		#selfProfileName() {
			return displayNameFromProfileData(this.#profileData());
		}

		async #findSelfProfileMatches(profileData, user) {
			const people = await this.#loadPeopleRegistry();
			const scored = people
				.map((person) => {
					const match = scoreSelfProfileCandidate(person, profileData);
					return match ? { person, ...match } : null;
				})
				.filter(Boolean)
				.sort((left, right) => right.score - left.score)
				.slice(0, SELF_PROFILE_MATCH_LIMIT);

			const login = String(user?.login || "").trim().toLowerCase();
			return Promise.all(scored.map(async (candidate) => {
				const id = String(candidate.person?.id || "").trim();
				const config = await this.#loadProfileConfig(id);
				const claimedBy = String(config?.owner?.githubLogin || "").trim();
				return {
					...candidate,
					id,
					name: [candidate.person?.firstName, candidate.person?.lastName].filter(Boolean).join(" ").trim() || `Profile ${id}`,
					claimedBy,
					claimIsCurrentUser: Boolean(login && claimedBy && claimedBy.toLowerCase() === login),
				};
			}));
		}

		#hideClaimReview() {
			this.__pendingSelfProfileFiles = null;
			this.__pendingSelfProfileUser = null;
			this.__pendingSelfProfileData = null;
			this.__selfProfileMatchesReviewed = false;
			const review = this.querySelector(".profile-edit__claim-review");
			if (review) review.hidden = true;
			const panels = this.querySelector(".profile-edit__panels");
			if (panels) panels.hidden = false;
			const tabs = this.querySelector(".profile-edit__tabs");
			if (tabs) tabs.hidden = false;
			this.#refreshDirtyState();
		}

		#renderClaimReview(matches, files, profileData, user) {
			this.__pendingSelfProfileFiles = files;
			this.__pendingSelfProfileUser = user;
			this.__pendingSelfProfileData = profileData;

			const panels = this.querySelector(".profile-edit__panels");
			const tabs = this.querySelector(".profile-edit__tabs");
			if (panels) panels.hidden = true;
			if (tabs) tabs.hidden = true;

			let review = this.querySelector(".profile-edit__claim-review");
			if (!review) {
				review = document.createElement("section");
				review.className = "profile-edit__claim-review";
				review.setAttribute("aria-live", "polite");
				panels?.before(review);
			}

			const cards = matches.map((match) => {
				const years = [match.person?.birthYear, match.person?.deathYear].filter(Boolean).join(" - ");
				const profileUrl = resolveSiteUrl(`people/${match.id}/profile.html`);
				const claimedElsewhere = match.claimedBy && !match.claimIsCurrentUser;
				const claimText = match.claimIsCurrentUser
					? "Already claimed by you"
					: claimedElsewhere
						? `Claimed by @${match.claimedBy}`
						: "This is me";
				return `
					<article class="profile-edit__match-card">
						<div>
							<h2><a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match.name)}</a></h2>
							<p>#${escapeHtml(match.id)}${years ? ` - ${escapeHtml(years)}` : ""}</p>
					<p>${escapeHtml(match.reasons.join(", ") || "possible profile match")}</p>
						</div>
						<button type="button" class="profile-edit__match-claim" data-action="claim-profile" data-person-id="${escapeHtml(match.id)}" ${claimedElsewhere ? "disabled" : ""}>${escapeHtml(claimText)}</button>
					</article>
				`;
			}).join("");

			review.hidden = false;
			review.innerHTML = `
				<div class="profile-edit__claim-head">
					<h1>Is one of these profiles you?</h1>
					<p>We found existing profiles that look similar to the details you entered.</p>
				</div>
				<div class="profile-edit__match-list">${cards}</div>
				<div class="profile-edit__claim-actions">
					<button type="button" class="page-editor__button page-editor__button--save" data-action="create-self-profile">
						<i class="bi bi-person-plus" aria-hidden="true"></i>
						<span>None of these are me</span>
					</button>
					<button type="button" class="page-editor__button" data-action="back-to-profile-edit">
						<i class="bi bi-arrow-left" aria-hidden="true"></i>
						<span>Back to editing</span>
					</button>
				</div>
			`;

			review.querySelectorAll('[data-action="claim-profile"]').forEach((button) => {
				button.addEventListener("click", () => this.#claimExistingSelfProfile(button.dataset.personId));
			});
			review.querySelector('[data-action="create-self-profile"]')?.addEventListener("click", () => {
				this.#commitNewSelfProfile(files, profileData, user);
			});
			review.querySelector('[data-action="back-to-profile-edit"]')?.addEventListener("click", () => this.#hideClaimReview());
			this.#setStatus("Choose an existing profile to claim, or create a new one.", "info");
		}

		async #buildPeopleRegistryFile(profileData) {
			const people = await this.#loadPeopleRegistry();
			const entry = registryEntryFromProfileData(PERSON_ID, profileData);
			const nextPeople = people
				.filter((person) => String(person?.id || "") !== PERSON_ID)
				.concat(entry)
				.sort((left, right) => String(left.id).localeCompare(String(right.id), undefined, { numeric: true }));

			return {
				path: "people/people.json",
				content: `${JSON.stringify({ generatedAt: new Date().toISOString(), people: nextPeople }, null, 2)}\n`,
			};
		}

		async #buildNewProfileFiles(files, profileData, user, { claimSelf = true } = {}) {
			const byPath = new Map();
			files.forEach((file) => {
				if (file?.path) byPath.set(file.path, { path: file.path, content: String(file.content || "") });
			});

			byPath.set(`people/${PERSON_ID}/profile.html`, {
				path: `people/${PERSON_ID}/profile.html`,
				content: buildProfileShell(PERSON_ID),
			});
			byPath.set(`people/${PERSON_ID}/data/tree.html`, {
				path: `people/${PERSON_ID}/data/tree.html`,
				content: "<h1>Tree</h1>\n<p>This page shows the family tree for the person.</p>\n",
			});
			byPath.set(`people/${PERSON_ID}/data/media.html`, {
				path: `people/${PERSON_ID}/data/media.html`,
				content: "<h1>Media</h1>\n<p>Photographs and images from this person's life.</p>\n",
			});
			byPath.set(`people/${PERSON_ID}/profile.json`, {
				path: `people/${PERSON_ID}/profile.json`,
				content: buildProfileConfig(PERSON_ID, profileData, user, { claimSelf }),
			});

			const peopleRegistryFile = await this.#buildPeopleRegistryFile(profileData);
			byPath.set(peopleRegistryFile.path, peopleRegistryFile);

			return Array.from(byPath.values());
		}

		#resolveSelfProfileTarget(personId) {
			if (SELF_RETURN_TARGET === "edit") {
				const url = new URL(resolveSiteUrl("people/edit.html"), window.location.href);
				url.searchParams.set("person", personId);
				return url.href;
			}

			const url = new URL(resolveSiteUrl(`people/${personId}/profile.html`), window.location.href);
			if (SELF_RETURN_TARGET === "tree") {
				url.hash = "tree";
			}
			return url.href;
		}

		async #claimExistingSelfProfile(personId) {
			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Claiming profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "claim",
						person_id: personId,
						commit_message: `Claim profile ${personId}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub (site header) to claim your profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Claim failed (${response.status}).`, "error");
					}
					return;
				}

				this.#setStatus("Profile claimed. Opening it now…", "success");
				window.location.assign(this.#resolveSelfProfileTarget(String(payload.person || personId)));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not claim that profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #commitNewSelfProfile(files, profileData, user) {
			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			const publishFiles = await this.#buildNewProfileFiles(files, profileData, user, { claimSelf: true });
			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Saving profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "create",
						person_id: PERSON_ID,
						claim_self: true,
						files: publishFiles,
						commit_message: `Create profile: ${this.#selfProfileName()}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub (site header) to create your profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

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
				this.#setStatus("Profile saved. Opening it now…", "success");
				window.location.assign(this.#resolveSelfProfileTarget(String(payload.person || PERSON_ID)));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save your profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #saveSelfProfile(files) {
			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			const user = await this.#getCurrentUser();
			if (!user?.login) {
				this.#setStatus("Sign in with GitHub (site header) before saving your profile.", "error");
				return;
			}

			if (!this.__selfProfileMatchesReviewed) {
				this.#setStatus("Checking for existing profiles…", "info");
				const matches = await this.#findSelfProfileMatches(profileData, user);
				if (matches.length) {
					this.__selfProfileMatchesReviewed = true;
					this.#renderClaimReview(matches, files, profileData, user);
					return;
				}
			}

			await this.#commitNewSelfProfile(files, profileData, user);
		}

		async #checkProfileExists() {
			const people = await this.#loadPeopleRegistry();
			if (people.some((person) => String(person?.id || "") === PERSON_ID)) {
				return true;
			}

			try {
				const response = await fetch(resolveSiteUrl(`people/${PERSON_ID}/profile.json`), { cache: "no-store" });
				if (!response.ok) return false;
				const config = await response.json();
				return Boolean(config && typeof config === "object");
			} catch (error) {
				return false;
			}
		}

		async #commitNewProfile(files) {
			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			const user = await this.#getCurrentUser();
			if (!user?.login) {
				this.#setStatus("You must be logged in to create a new profile.", "error");
				return;
			}

			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			const publishFiles = await this.#buildNewProfileFiles(files, profileData, user, { claimSelf: false });
			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Saving new profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "create",
						person_id: PERSON_ID,
						claim_self: false,
						files: publishFiles,
						commit_message: `Create profile: ${displayNameFromProfileData(profileData)}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("You must be logged in to create a new profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

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
				this.#setStatus("New profile saved.", "success");
				window.location.assign(resolveSiteUrl(`people/${String(payload.person || PERSON_ID)}/profile.html`));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save the new profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #prepareInfoboxForPublish() {
			if (!this.__infobox?.prepareForPublish) return;
			await this.__infobox.prepareForPublish();
		}

		async #save() {
			if (this.__saving || !VALID_ID) return;
			if (!this.#isDirty()) {
				this.#setStatus("Nothing to save yet.", "info");
				return;
			}

			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			try {
				await this.#prepareInfoboxForPublish();
			} catch (error) {
				console.error(error);
				this.#setStatus(error?.message || "Could not upload profile photo.", "error");
				return;
			}

			const endpoint = SELF_PROFILE_MODE ? "" : resolveGitHubApiUrl("github-submit-page-edit.php");
			if (!SELF_PROFILE_MODE && !endpoint) {
				this.#setStatus("The publishing service is not configured.", "error");
				return;
			}

			// Save only what changed: prose edits (or adopting the canonical
			// infobox <include>) write profile.html; infobox edits write
			// profile-table.html / the GEDCOM. Keeps each save to a minimal diff.
			const files = [];
			const wantsProfileHtml = SELF_PROFILE_MODE
				|| Boolean(this.__pageEditor?.isDirty?.())
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
			if (this.#isInfoboxDirty() || SELF_PROFILE_MODE) {
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

			if (SELF_PROFILE_MODE) {
				await this.#saveSelfProfile(files);
				return;
			}

			if (!await this.#checkProfileExists()) {
				await this.#commitNewProfile(files);
				return;
			}

			const saveBtn = this.querySelector(".profile-edit__save");
			this.__saving = true;
			if (saveBtn) saveBtn.disabled = true;
			this.#setStatus("Saving changes…", "info");

			const name = this.querySelector(".profile-edit__breadcrumb-current")?.textContent?.trim() || PERSON_ID;
			const commitMessage = `Update profile: ${name}`;

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files,
						commit_message: commitMessage,
						pr_title: commitMessage,
						pr_body: "",
					}),
				}));

				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("You must be signed in to save changes.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				// Reset baselines so the editor is clean again.
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
