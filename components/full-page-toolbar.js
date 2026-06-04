const FULL_PAGE_TOOLBAR_TEMPLATE = String.raw`
<style>
full-page-toolbar {
	display: block;
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
	--page-toolbar-fg: #eaecf0;
	--page-toolbar-muted: #a7adb4;
	--page-toolbar-border: rgba(255, 255, 255, 0.12);
	--page-toolbar-link: #6b9eff;
	--page-toolbar-button-hover: rgba(255, 255, 255, 0.08);
	--page-toolbar-dropdown-bg: #313438;
	--page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

body:not(.theme-dark) full-page-toolbar {
	--page-toolbar-fg: #202122;
	--page-toolbar-muted: #54595d;
	--page-toolbar-border: rgba(0, 0, 0, 0.12);
	--page-toolbar-link: #3366cc;
	--page-toolbar-button-hover: rgba(0, 0, 0, 0.05);
	--page-toolbar-dropdown-bg: #ffffff;
	--page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

full-page-toolbar .people-page__inner {
	width: 100%;
	max-width: var(--page-toolbar-max-width, 90rem);
	margin: 0 auto;
	padding: 1rem 1rem 0;
	box-sizing: border-box;
}

/* Override the default content width enforcement in lib/common.css. */
body>article full-page-toolbar .people-page__inner {
	max-width: var(--page-toolbar-max-width, 90rem);
}

full-page-toolbar .people-page__title-row {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1rem;
	padding-bottom: 0.75rem;
}

full-page-toolbar .people-page__title {
	margin: 0;
	padding: 0;
	flex: 1 1 auto;
	min-width: 0;
	font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
	font-size: clamp(1.75rem, 4vw, 2.3rem);
	font-weight: 400;
	line-height: 1.2;
	color: var(--page-toolbar-fg);
}

full-page-toolbar .people-page__edit-button {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	flex-shrink: 0;
	margin-bottom: 0.15rem;
	padding: 0.35rem 0.5rem;
	border: 0;
	border-radius: 0.125rem;
	background: transparent;
	color: var(--page-toolbar-link);
	font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
	text-decoration: none;
	white-space: nowrap;
	cursor: pointer;
	box-sizing: border-box;
}

full-page-toolbar .people-page__edit-button:hover {
	background: var(--page-toolbar-button-hover);
	color: var(--page-toolbar-link);
	text-decoration: none;
}

full-page-toolbar .people-page__edit-button i {
	font-size: 1rem;
	line-height: 1;
	color: var(--page-toolbar-fg);
}

full-page-toolbar .people-page__tabs-row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 0.5rem 1rem;
	border-bottom: 1px solid var(--page-toolbar-border);
}

full-page-toolbar .people-page__tabs {
	flex: 1 1 auto;
	min-width: 0;
}

full-page-toolbar .people-page__tab-list {
	display: flex;
	flex-wrap: nowrap;
	gap: 1rem;
	margin: 0;
	padding: 0;
	list-style: none;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
}

full-page-toolbar .people-page__tabs-actions {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	justify-content: flex-end;
	gap: 0.35rem;
	margin-bottom: 0;
}

full-page-toolbar .people-page__tab-item {
	flex-shrink: 0;
	margin: 0;
	padding: 0;
	border-bottom: 2px solid transparent;
}

full-page-toolbar .people-page__tab-item.is-selected {
	border-bottom-color: var(--page-toolbar-fg);
}

full-page-toolbar .people-page__tab-link {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.35rem 0.5rem;
	color: var(--page-toolbar-fg);
	font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
	text-decoration: none;
	border-radius: 0.25rem;
	transition: background-color 0.12s ease, color 0.12s ease;
}

full-page-toolbar .people-page__tab-link:hover,
full-page-toolbar .people-page__tab-link:focus {
	background: var(--page-toolbar-button-hover);
	color: var(--page-toolbar-fg);
	text-decoration: none;
	outline: none;
}

full-page-toolbar .people-page__tab-link:focus-visible {
	box-shadow: 0 0 0 3px rgba(107,154,255,0.12);
}

full-page-toolbar .people-page__tab-link i {
	font-size: 0.95rem;
	line-height: 1;
	opacity: 0.95;
	transition: opacity 0.12s ease;
}

full-page-toolbar .people-page__tab-link:hover i {
	opacity: 1;
}

full-page-toolbar .people-page__button {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	height: 100%;
	min-height: 2.5rem;
	padding: 0 0.5rem;
	border: 0;
	border-radius: 0.125rem;
	background: transparent;
	color: var(--page-toolbar-link);
	font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
	text-decoration: none;
	cursor: pointer;
	box-sizing: border-box;
	white-space: nowrap;
}

full-page-toolbar .people-page__button:hover {
	background: var(--page-toolbar-button-hover);
	color: var(--page-toolbar-link);
	text-decoration: none;
}

full-page-toolbar .people-page__button i {
	font-size: 1rem;
	line-height: 1;
	color: var(--page-toolbar-fg);
}

full-page-toolbar .people-page__menu {
	position: relative;
	display: flex;
	align-items: stretch;
}

full-page-toolbar .people-page__menu.is-open .people-page__menu-trigger {
	background: var(--page-toolbar-button-hover);
}

full-page-toolbar .people-page__menu-caret {
	font-size: 0.75rem;
	line-height: 1;
	color: var(--page-toolbar-fg);
	transition: transform 0.15s ease;
}

full-page-toolbar .people-page__menu.is-open .people-page__menu-caret {
	transform: rotate(180deg);
}

full-page-toolbar .people-page__dropdown {
	position: absolute;
	top: calc(100% + 0.25rem);
	right: 0;
	z-index: 20;
	min-width: 12.5rem;
	margin: 0;
	padding: 0.35rem 0;
	border: 1px solid var(--page-toolbar-border);
	border-radius: 0.125rem;
	background: var(--page-toolbar-dropdown-bg);
	box-shadow: var(--page-toolbar-dropdown-shadow);
	list-style: none;
	box-sizing: border-box;
}

full-page-toolbar .people-page__dropdown[hidden] {
	display: none !important;
}

full-page-toolbar .people-page__dropdown li {
	margin: 0;
	padding: 0;
}

full-page-toolbar .people-page__dropdown a,
full-page-toolbar .people-page__dropdown button {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	width: 100%;
	margin: 0;
	padding: 0.55rem 1rem;
	border: 0;
	background: transparent;
	color: var(--page-toolbar-fg);
	font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
	text-align: left;
	text-decoration: none;
	white-space: nowrap;
	cursor: pointer;
	box-sizing: border-box;
}

full-page-toolbar .people-page__dropdown a:hover,
full-page-toolbar .people-page__dropdown button:hover {
	background: var(--page-toolbar-button-hover);
	color: var(--page-toolbar-fg);
	text-decoration: none;
}

full-page-toolbar .people-page__dropdown a.is-selected {
	font-weight: 600;
}

full-page-toolbar .people-page__dropdown-check {
	margin-left: auto;
	font-size: 0.9rem;
	opacity: 0.9;
}

full-page-toolbar .people-page__dropdown-divider {
	height: 1px;
	margin: 0.35rem 0;
	background: var(--page-toolbar-border);
}

full-page-toolbar .people-page__dropdown-add {
	color: var(--page-toolbar-link);
}

full-page-toolbar .people-page__dropdown-add:hover {
	color: var(--page-toolbar-link);
}

full-page-toolbar .people-page__dropdown i {
	flex-shrink: 0;
	width: 1.1rem;
	font-size: 1rem;
	opacity: 0.9;
}

@media (max-width: 720px) {
	full-page-toolbar .people-page__inner {
		padding: 0.75rem 0.5rem 0;
	}

	full-page-toolbar .people-page__tabs-row {
		padding-top: 1.5rem;
	}

	full-page-toolbar .people-page__tabs-actions {
		margin-bottom: 0;
		padding-bottom: 0.25rem;
	}
}

/* On small screens, wrap tabs instead of showing a horizontal scrollbar. */
@media (max-width: 520px) {
	full-page-toolbar .people-page__tab-list {
		flex-wrap: wrap;
		gap: 0.5rem;
		overflow-x: hidden;
		-webkit-overflow-scrolling: auto;
	}
}

/* On very small screens make tabs wrap and actions use a full-width row
	 so buttons don't overlap other content when they drop to a second line. */
@media (max-width: 420px) {
	full-page-toolbar .people-page__tabs-row {
		align-items: flex-start;
		padding-top: 2.25rem;
		padding-bottom: 0.5rem;
		gap: 0.4rem 0.5rem;
	}

	full-page-toolbar .people-page__tabs-actions {
		width: 100%;
		justify-content: flex-start;
		gap: 0.5rem;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	full-page-toolbar .people-page__button {
		min-height: 2rem;
		height: auto;
	}
}

/* Simple variant hides tabs/actions and uses a title underline instead. */
/* Allow pages to force-show the tabs with the show-tabs attribute or by using variant="page". */
full-page-toolbar:not([variant="people"]):not([variant="page"]):not([show-tabs]) .people-page__tabs-row {
	display: none;
}

full-page-toolbar:not([variant="people"]):not([variant="page"]) .people-page__title-row {
	border-bottom: 1px solid var(--page-toolbar-border);
}
</style>

<section class="people-page" aria-label="Page header">
	<div class="people-page__inner">
		<div class="people-page__title-row">
			<h1 class="people-page__title"></h1>
			<a class="people-page__edit-button" href="#" title="Edit profile">
				<i class="bi bi-pencil-square" aria-hidden="true"></i>
				<span class="people-page__edit-label">Edit Profile</span>
			</a>
		</div>
		<div class="people-page__tabs-row">
			<nav class="people-page__tabs" aria-label="Page views">
				<ul class="people-page__tab-list" role="tablist">
					<li class="people-page__tab-item is-selected" role="presentation">
						<a class="people-page__tab-link" href="#profile" data-tab="profile" role="tab" aria-selected="true">
							<i class="bi bi-person" aria-hidden="true"></i>
							<span>Profile</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#tree" data-tab="tree" role="tab" aria-selected="false">
							<i class="bi bi-diagram-3" aria-hidden="true"></i>
							<span>Tree</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#media" data-tab="media" role="tab" aria-selected="false">
							<i class="bi bi-images" aria-hidden="true"></i>
							<span>Media</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#talk" data-tab="talk" role="tab" aria-selected="false">
							<i class="bi bi-chat-left-text" aria-hidden="true"></i>
							<span>Talk</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#changes" data-tab="changes" role="tab" aria-selected="false">
							<i class="bi bi-clock-history" aria-hidden="true"></i>
							<span>Changes</span>
						</a>
					</li>
				</ul>
			</nav>
			<div class="people-page__tabs-actions">
				<div class="people-page__menu people-page__language-menu">
					<button
						class="people-page__button people-page__menu-trigger"
						type="button"
						aria-haspopup="menu"
						aria-expanded="false"
						aria-controls="people-page-language-menu"
						title="Change language"
					>
						<i class="bi bi-translate" aria-hidden="true"></i>
						<span>Language</span>
						<i class="bi bi-chevron-down people-page__menu-caret" aria-hidden="true"></i>
					</button>
					<ul
						id="people-page-language-menu"
						class="people-page__dropdown"
						role="menu"
						hidden
					>
						<li role="none">
							<a href="#" role="menuitem" class="is-selected" aria-current="true" title="English">
								<span>English</span>
								<i class="bi bi-check2 people-page__dropdown-check" aria-hidden="true"></i>
							</a>
						</li>
						<li class="people-page__dropdown-divider" role="separator"></li>
						<li role="none">
							<button
								type="button"
								class="people-page__dropdown-add"
								role="menuitem"
								title="Add a new language"
							>
								<i class="bi bi-plus-lg" aria-hidden="true"></i>
								<span>Add language</span>
							</button>
						</li>
					</ul>
				</div>
				<div class="people-page__menu people-page__download-menu">
					<button
						class="people-page__button people-page__menu-trigger"
						type="button"
						aria-haspopup="menu"
						aria-expanded="false"
						aria-controls="people-page-download-menu"
						title="Download this page"
					>
						<i class="bi bi-download" aria-hidden="true"></i>
						<span>Download</span>
						<i class="bi bi-chevron-down people-page__menu-caret" aria-hidden="true"></i>
					</button>
					<ul
						id="people-page-download-menu"
						class="people-page__dropdown"
						role="menu"
						hidden
					>
						<li role="none">
							<a href="#" role="menuitem" title="Download as PDF">
								<i class="bi bi-file-earmark-pdf" aria-hidden="true"></i>
								<span>PDF</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as PNG">
								<i class="bi bi-filetype-png" aria-hidden="true"></i>
								<span>PNG</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as SVG">
								<i class="bi bi-filetype-svg" aria-hidden="true"></i>
								<span>SVG</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as HTML">
								<i class="bi bi-file-earmark-code" aria-hidden="true"></i>
								<span>HTML</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as Markdown">
								<i class="bi bi-filetype-md" aria-hidden="true"></i>
								<span>Markdown</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as plain text">
								<i class="bi bi-file-earmark-text" aria-hidden="true"></i>
								<span>Plain text</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as JSON">
								<i class="bi bi-braces" aria-hidden="true"></i>
								<span>JSON</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as GEDCOM">
								<i class="bi bi-diagram-3" aria-hidden="true"></i>
								<span>GEDCOM</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Download as EPUB">
								<i class="bi bi-book" aria-hidden="true"></i>
								<span>EPUB</span>
							</a>
						</li>
						<li role="none">
							<a href="#" role="menuitem" title="Print this page">
								<i class="bi bi-printer" aria-hidden="true"></i>
								<span>Print</span>
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>
`;

class FullPageToolbar extends HTMLElement {
	static get observedAttributes() {
		return ['title', 'page-title', 'edit-href', 'edit-text', 'variant'];
	}

	connectedCallback() {
		if (this.__rendered) return;
		this.__rendered = true;
		this.innerHTML = FULL_PAGE_TOOLBAR_TEMPLATE;
		this.#sync();

		// Bind event handlers for menus (language, download, etc.)
		this.__boundOnClick = this.#onLocalClick.bind(this);
		this.__boundDocClick = this.#onDocumentClick.bind(this);
		this.__boundKeyDown = this.#onKeyDown.bind(this);
		this.addEventListener('click', this.__boundOnClick);
		document.addEventListener('click', this.__boundDocClick);
		document.addEventListener('keydown', this.__boundKeyDown);
		this.__boundHashChange = this.#onHashChange?.bind(this);
		if (this.__boundHashChange) window.addEventListener('hashchange', this.__boundHashChange);
	}

	disconnectedCallback() {
		if (this.__boundOnClick) {
			this.removeEventListener('click', this.__boundOnClick);
			this.__boundOnClick = null;
		}
		if (this.__boundDocClick) {
			document.removeEventListener('click', this.__boundDocClick);
			this.__boundDocClick = null;
		}
		if (this.__boundKeyDown) {
			document.removeEventListener('keydown', this.__boundKeyDown);
			this.__boundKeyDown = null;
		}
	}

		#onHashChange() {
			// Update tab selection when location.hash changes for non-people pages
			try {
				this.#sync();
			} catch (e) {
				// non-fatal
			}
		}

	attributeChangedCallback() {
		if (this.__rendered) {
			this.#sync();
		}
	}

	#sync() {
		const titleEl = this.querySelector('.people-page__title');
		const titleAttr = this.getAttribute('title');
		const legacyTitleAttr = this.getAttribute('page-title');
		const rawTitle = titleAttr ?? legacyTitleAttr;
		if (titleEl && (rawTitle !== null || !titleEl.textContent?.trim())) {
			const next = (rawTitle ?? '').trim();
			titleEl.textContent = next || 'Untitled';
		}

		const variant = (this.getAttribute('variant') || '').trim().toLowerCase();
		const editHref = this.getAttribute('edit-href')?.trim() || '';
		const editText = this.getAttribute('edit-text');

		const editButton = this.querySelector('.people-page__edit-button');
		const editLabelEl = this.querySelector('.people-page__edit-label');

		// Normalize explicit `edit-text` for common lowercase usage, otherwise use as-provided.
		let labelFromAttr = null;
		if (editText !== null) {
			const t = editText.trim();
			labelFromAttr = (t.toLowerCase() === 'edit page') ? 'Edit Page' : t;
		}

		// Determine label: explicit `edit-text` attr -> variant default
		const defaultLabel = (labelFromAttr !== null)
			? labelFromAttr
			: (variant === 'people' ? 'Edit Profile' : 'Edit Page');

		if (editLabelEl) {
			editLabelEl.textContent = defaultLabel;
		}

		if (editButton) {
			const shouldShowEdit = variant === 'people' || Boolean(editHref);
			editButton.hidden = !shouldShowEdit;
			if (editHref) editButton.href = editHref;
			// keep title in sync with label for accessibility
			editButton.title = defaultLabel;
		}

		// Tabs content: support a compact `page` variant with a single "Page" tab.
		const tabsList = this.querySelector('.people-page__tab-list');
		if (tabsList) {
			if (variant === 'page') {
				// Neutral page variant shows a 'Page' tab and the 'Changes' tab.
				tabsList.innerHTML = String.raw`
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#page" data-tab="page" role="tab" aria-selected="false">
							<i class="bi bi-file-earmark-text" aria-hidden="true"></i>
							<span>Page</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#changes" data-tab="changes" role="tab" aria-selected="false">
							<i class="bi bi-clock-history" aria-hidden="true"></i>
							<span>Changes</span>
						</a>
					</li>
				`;

				// Select tab based on current hash (defaults to 'page')
				try {
					const currentHash = (window.location.hash || '').replace(/^#/, '');
					const selectedTab = (currentHash === 'changes') ? 'changes' : 'page';
					tabsList.querySelectorAll('.people-page__tab-link').forEach((link) => {
						const isSelected = link.dataset.tab === selectedTab;
						const tabItem = link.closest('.people-page__tab-item');
						tabItem?.classList.toggle('is-selected', isSelected);
						link.setAttribute('aria-selected', isSelected ? 'true' : 'false');
					});
				} catch (e) {
					// ignore selection errors
				}
			} else if (variant === 'people') {
				// Restore or ensure the full people tabset exists if it was previously replaced.
				if (!tabsList.querySelector('[data-tab="profile"]')) {
					const defaultPeopleTabs = String.raw`
					<li class="people-page__tab-item is-selected" role="presentation">
						<a class="people-page__tab-link" href="#profile" data-tab="profile" role="tab" aria-selected="true">
							<i class="bi bi-person" aria-hidden="true"></i>
							<span>Profile</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#tree" data-tab="tree" role="tab" aria-selected="false">
							<i class="bi bi-diagram-3" aria-hidden="true"></i>
							<span>Tree</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#media" data-tab="media" role="tab" aria-selected="false">
							<i class="bi bi-images" aria-hidden="true"></i>
							<span>Media</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#talk" data-tab="talk" role="tab" aria-selected="false">
							<i class="bi bi-chat-left-text" aria-hidden="true"></i>
							<span>Talk</span>
						</a>
					</li>
					<li class="people-page__tab-item" role="presentation">
						<a class="people-page__tab-link" href="#changes" data-tab="changes" role="tab" aria-selected="false">
							<i class="bi bi-clock-history" aria-hidden="true"></i>
							<span>Changes</span>
						</a>
					</li>
					`;
					tabsList.innerHTML = defaultPeopleTabs;
				}
			}
		}
	}

	// Event handling: toggle and close the menus inside the toolbar
	#onLocalClick(event) {
		const trigger = event.target.closest?.('.people-page__menu-trigger');
		if (trigger && this.contains(trigger)) {
			event.preventDefault?.();
			this.#toggleMenu(trigger);
			return;
		}

		const menuItem = event.target.closest?.('.people-page__dropdown a, .people-page__dropdown button');
		if (menuItem && this.contains(menuItem)) {
			const menu = menuItem.closest('.people-page__menu');
			if (menu) this.#closeMenu(menu);
		}
	}

	#toggleMenu(trigger) {
		const menu = trigger.closest('.people-page__menu');
		if (!menu) return;
		if (menu.classList.contains('is-open')) {
			this.#closeMenu(menu);
		} else {
			const open = this.querySelector('.people-page__menu.is-open');
			if (open && open !== menu) this.#closeMenu(open);
			this.#openMenu(menu);
		}
	}

	#openMenu(menu) {
		const trigger = menu.querySelector('.people-page__menu-trigger');
		const dropdown = menu.querySelector('.people-page__dropdown');
		menu.classList.add('is-open');
		if (dropdown) dropdown.removeAttribute('hidden');
		if (trigger) trigger.setAttribute('aria-expanded', 'true');
		this.__openMenu = menu;
	}

	#closeMenu(menu) {
		const trigger = menu.querySelector('.people-page__menu-trigger');
		const dropdown = menu.querySelector('.people-page__dropdown');
		menu.classList.remove('is-open');
		if (dropdown) dropdown.setAttribute('hidden', '');
		if (trigger) trigger.setAttribute('aria-expanded', 'false');
		if (this.__openMenu === menu) this.__openMenu = null;
	}

	#onDocumentClick(event) {
		if (!this.__openMenu) return;
		if (event.target.closest?.('.people-page__menu')) return; // clicked inside a menu
		this.#closeMenu(this.__openMenu);
	}

	#onKeyDown(event) {
		if (event.key === 'Escape' && this.__openMenu) {
			this.#closeMenu(this.__openMenu);
			const trigger = this.__openMenu?.querySelector('.people-page__menu-trigger');
			if (trigger) trigger.focus();
		}
	}
}

if (!customElements.get('full-page-toolbar')) {
	customElements.define('full-page-toolbar', FullPageToolbar);
}

