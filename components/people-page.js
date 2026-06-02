const PEOPLE_PAGE_TEMPLATE = String.raw`
<style>
people-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  box-sizing: border-box;
  --page-toolbar-fg: #eaecf0;
  --page-toolbar-muted: #a7adb4;
  --page-toolbar-border: rgba(255, 255, 255, 0.12);
  --page-toolbar-link: #6b9eff;
  --page-toolbar-button-hover: rgba(255, 255, 255, 0.08);
  --page-toolbar-dropdown-bg: #313438;
  --page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

body:not(.theme-dark) people-page {
  --page-toolbar-fg: #202122;
  --page-toolbar-muted: #54595d;
  --page-toolbar-border: rgba(0, 0, 0, 0.12);
  --page-toolbar-link: #3366cc;
  --page-toolbar-button-hover: rgba(0, 0, 0, 0.05);
  --page-toolbar-dropdown-bg: #ffffff;
  --page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.people-page > .people-page {
  width: 100%;
  flex-shrink: 0;
  color: var(--page-toolbar-fg);
  border-bottom: 1px solid var(--page-toolbar-border);
  box-sizing: border-box;
}

.people-page__content {
  flex: 1 1 auto;
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  color: #202122;
  font: 1rem/1.65 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark .people-page__content {
  color: #eaecf0;
}

.people-page__content a {
  color: #3366cc;
}

body.theme-dark .people-page__content a {
  color: #6b9eff;
}

.people-page__content p {
  margin: 0 0 0.9rem;
}

.people-page__content h1 {
  margin: 0 0 1rem;
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.25;
}

.people-page__content h2 {
  margin: 1.75rem 0 0.65rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.25;
  overflow: hidden;
}

body.theme-dark .people-page__content h2 {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.people-page__content h3 {
  margin: 1.25rem 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.people-page__content ul,
.people-page__content ol {
  margin: 0 0 0.9rem;
  padding-left: 1.5rem;
}

.people-page__content li {
  margin-bottom: 0.35rem;
}

.people-page__content aside {
  float: right;
  clear: right;
  position: relative;
  z-index: 1;
  width: fit-content;
  max-width: min(50%, 100%);
  margin: 0 0 1rem 1.25rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f8f9fa;
  font-size: 0.875rem;
  line-height: 1.45;
  box-sizing: border-box;
}

body.theme-dark .people-page__content aside {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__content aside table {
  width: max-content;
  max-width: 100%;
  border-collapse: collapse;
  margin: 0;
}

.people-page__content aside table img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.125rem;
}

.people-page__content aside th,
.people-page__content aside td {
  padding: 0.4rem 0;
  border: 0;
  vertical-align: top;
  text-align: left;
}

.people-page__content aside tr:first-child th,
.people-page__content aside tr:first-child td {
  padding-top: 0;
  padding-bottom: 0.5rem;
}

.people-page__content aside th {
  width: 1%;
  padding-right: 1rem;
  white-space: nowrap;
  font-weight: 600;
  color: var(--page-toolbar-muted);
}

.people-page__content aside td {
  color: inherit;
}

.people-page__content aside td p {
  margin: 0 0 0.55rem;
}

.people-page__content aside td p:last-child {
  margin-bottom: 0;
}

.people-page__content aside + p {
  font-size: 1.05rem;
}

.people-page__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.people-page__gallery figure {
  margin: 0;
}

.people-page__gallery img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  box-sizing: border-box;
}

body.theme-dark .people-page__gallery img {
  border-color: rgba(255, 255, 255, 0.12);
}

.people-page__gallery figcaption {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: var(--page-toolbar-muted);
  line-height: 1.35;
  word-break: break-word;
}

.people-page__gallery-empty {
  margin: 1rem 0 0;
  color: var(--page-toolbar-muted);
}

@media (max-width: 720px) {
  .people-page__content aside {
    float: none;
    width: 100%;
    max-width: none;
    margin: 0 0 1rem;
  }

  .people-page__content aside table {
    width: 100%;
  }
}

.people-page__inner {
  width: 100%;
  max-width: 90rem;
  margin: 0 auto;
  padding: 1rem 1rem 0;
  box-sizing: border-box;
}

.people-page__title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
}

.people-page__title {
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

.people-page__edit-button {
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

.people-page__edit-button:hover {
  background: var(--page-toolbar-button-hover);
  color: var(--page-toolbar-link);
  text-decoration: none;
}

.people-page__edit-button i {
  font-size: 1rem;
  line-height: 1;
  color: var(--page-toolbar-fg);
}

.people-page__tabs-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  border-bottom: 1px solid var(--page-toolbar-border);
}

.people-page__tabs {
  flex: 1 1 100%;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.people-page__tab-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.people-page__tabs-actions {
  display: flex;
  align-items: stretch;
  flex: 1 1 100%;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-bottom: -1px;
}

.people-page__tab-item {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border-bottom: 2px solid transparent;
}

.people-page__tab-item.is-selected {
  border-bottom-color: var(--page-toolbar-fg);
}

.people-page__tab-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  color: var(--page-toolbar-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-decoration: none;
}

.people-page__tab-link:hover {
  color: var(--page-toolbar-fg);
  text-decoration: none;
}

.people-page__tab-link i {
  font-size: 0.95rem;
  line-height: 1;
  opacity: 0.9;
}

.people-page__button {
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

.people-page__button:hover {
  background: var(--page-toolbar-button-hover);
  color: var(--page-toolbar-link);
  text-decoration: none;
}

.people-page__button i {
  font-size: 1rem;
  line-height: 1;
  color: var(--page-toolbar-fg);
}

.people-page__menu {
  position: relative;
  display: flex;
  align-items: stretch;
}

.people-page__menu.is-open .people-page__menu-trigger {
  background: var(--page-toolbar-button-hover);
}

.people-page__menu-caret {
  font-size: 0.75rem;
  line-height: 1;
  color: var(--page-toolbar-fg);
  transition: transform 0.15s ease;
}

.people-page__menu.is-open .people-page__menu-caret {
  transform: rotate(180deg);
}

.people-page__dropdown {
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

.people-page__dropdown[hidden] {
  display: none !important;
}

.people-page__dropdown li {
  margin: 0;
  padding: 0;
}

.people-page__dropdown a,
.people-page__dropdown button {
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

.people-page__dropdown a:hover,
.people-page__dropdown button:hover {
  background: var(--page-toolbar-button-hover);
  color: var(--page-toolbar-fg);
  text-decoration: none;
}

.people-page__dropdown a.is-selected {
  font-weight: 600;
}

.people-page__dropdown-check {
  margin-left: auto;
  font-size: 0.9rem;
  opacity: 0.9;
}

.people-page__dropdown-divider {
  height: 1px;
  margin: 0.35rem 0;
  background: var(--page-toolbar-border);
}

.people-page__dropdown-add {
  color: var(--page-toolbar-link);
}

.people-page__dropdown-add:hover {
  color: var(--page-toolbar-link);
}

.people-page__dropdown i {
  flex-shrink: 0;
  width: 1.1rem;
  font-size: 1rem;
  opacity: 0.9;
}

@media (max-width: 720px) {
  .people-page__inner {
    padding: 0.75rem 0.5rem 0;
  }

  .people-page__tabs-actions {
    margin-bottom: 0;
    padding-bottom: 0.25rem;
  }
}
</style>
<section class="people-page" aria-label="Page header">
  <div class="people-page__inner">
    <div class="people-page__title-row">
      <h1 class="people-page__title"></h1>
      <a class="people-page__edit-button" href="#" title="Edit profile">
        <i class="bi bi-pencil-square" aria-hidden="true"></i>
        <span>Edit Profile</span>
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
<div class="people-page__content" aria-live="polite"></div>
`;

const PEOPLE_PAGE_TABS = ['profile', 'tree', 'media', 'talk', 'changes'];
const PEOPLE_PAGE_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|avif)$/i;
const PEOPLE_PAGE_DATA_DIR = 'data/';

class PeoplePage extends HTMLElement {
  static get observedAttributes() {
    return ['edit-href'];
  }

  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    this.innerHTML = PEOPLE_PAGE_TEMPLATE;
    this.#syncEditHref();
    this.#bindMenus();
    this.#bindTabs();
    void this.#init();
    window.addEventListener('hashchange', this.#onHashChange);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.#onHashChange);
  }

  #onHashChange = () => {
    const tab = this.#getTabFromHash();
    if (tab) {
      this.#selectTab(tab, { updateHash: false });
      this.#loadTab(tab);
    }
  };

  attributeChangedCallback(name) {
    if (!this.__rendered) {
      return;
    }

    if (name === 'edit-href') {
      this.#syncEditHref();
    }
  }

  async #init() {
    await this.#loadPageTitle();
    const initialTab = this.#getInitialTab();
    this.#selectTab(initialTab, { updateHash: Boolean(this.#getTabFromHash()) });
    await this.#loadTab(initialTab);
  }

  #setTitle(title) {
    const titleEl = this.querySelector('.people-page__title');
    if (titleEl) {
      titleEl.textContent = title || 'Untitled';
    }

    if (title) {
      document.title = `${title} - Genipedia`;
    }
  }

  async #loadPageTitle() {
    try {
      const response = await fetch(this.#resolveDataUrl('profile.html'));
      if (!response.ok) {
        return;
      }

      const title = this.#readTitleFromHtml(await response.text());
      if (title) {
        this.#setTitle(title);
      }
    } catch (error) {
      console.error(error);
    }
  }

  #readTitleFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('h1')?.textContent?.trim() || '';
  }

  async #prepareContentHtml(html, tab) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (tab === 'profile') {
      const heading = doc.querySelector('h1');
      const title = heading?.textContent?.trim();
      if (title) {
        this.#setTitle(title);
      }
      heading?.remove();
    }

    // Rewrite asset URLs in the main document
    this.#rewriteDataAssetUrls(doc);

    // Inline any <include src="..."></include> or elements with data-include
    const includeEls = Array.from(doc.querySelectorAll('include[src], [data-include]'));
    for (const el of includeEls) {
      const src = el.getAttribute('src') || el.dataset.include;
      if (!src) continue;

      try {
        const url = this.#resolveDataUrl(src);
        const response = await fetch(url);
        if (!response.ok) continue;
        const fragHtml = await response.text();
        const fragDoc = new DOMParser().parseFromString(fragHtml, 'text/html');
        // Rewrite asset URLs inside the included fragment as well
        this.#rewriteDataAssetUrls(fragDoc);

        // Replace the include element with the fragment's body children
        const nodes = Array.from(fragDoc.body.childNodes).map((n) => n.cloneNode(true));
        el.replaceWith(...nodes);
      } catch (err) {
        console.warn('Could not inline include', src, err);
      }
    }

    if (tab === 'profile' && typeof window.upgradeProfileIdentityInDocument === 'function') {
      window.upgradeProfileIdentityInDocument(doc);
    }

    return doc.body.innerHTML;
  }

  #rewriteDataAssetUrls(doc) {
    doc.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || /^https?:\/\//i.test(src) || src.startsWith('data:')) {
        return;
      }

      img.setAttribute('src', this.#resolveImageUrl(src));
    });
  }

  #syncEditHref() {
    const editButton = this.querySelector('.people-page__edit-button');
    if (!editButton) {
      return;
    }

    const editHref = this.getAttribute('edit-href')?.trim();
    editButton.href = editHref || '#';
  }

  #bindMenus() {
    const menus = [...this.querySelectorAll('.people-page__menu')];

    const closeAllMenus = () => {
      menus.forEach((menu) => {
        const trigger = menu.querySelector('.people-page__menu-trigger');
        const dropdown = menu.querySelector('.people-page__dropdown');
        menu.classList.remove('is-open');
        if (dropdown) {
          dropdown.hidden = true;
        }
        trigger?.setAttribute('aria-expanded', 'false');
      });
    };

    menus.forEach((menu) => {
      const trigger = menu.querySelector('.people-page__menu-trigger');
      const dropdown = menu.querySelector('.people-page__dropdown');

      if (!trigger || !dropdown) {
        return;
      }

      const closeMenu = () => {
        menu.classList.remove('is-open');
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };

      const openMenu = () => {
        closeAllMenus();
        menu.classList.add('is-open');
        dropdown.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (menu.classList.contains('is-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      dropdown.addEventListener('click', (event) => {
        if (event.target.closest('[role="menuitem"]')) {
          closeMenu();
        }
      });
    });

    document.addEventListener('click', (event) => {
      const insideOpenMenu = menus.some((menu) => menu.contains(event.target));
      if (!insideOpenMenu) {
        closeAllMenus();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllMenus();
      }
    });

    const addLanguageButton = this.querySelector('.people-page__dropdown-add');
    addLanguageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.dispatchEvent(
        new CustomEvent('people-page-add-language', {
          bubbles: true,
          composed: true,
        }),
      );
    });

    // Bind download menu actions (delegates to shared download manager)
    const downloadDropdown = this.querySelector('#people-page-download-menu');
    if (downloadDropdown) {
      const ensureManager = async () => {
        if (window.GenipediaDownloads) return window.GenipediaDownloads;
        // try to resolve components base from the people-page script tag
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        let base = new URL('.', window.location.href).href;
        for (const s of scripts) {
          const src = s.getAttribute('src') || '';
          if (src.includes('components/people-page.js')) {
            try {
              base = new URL('.', new URL(src, window.location.href)).href;
              break;
            } catch (e) {
              /* ignore */
            }
          }
        }
        const managerSrc = new URL('../lib/download-manager.js', base).href;
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.defer = true;
            s.src = managerSrc;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        } catch (e) {
          console.warn('Could not load download manager', e);
        }
        return window.GenipediaDownloads;
      };

      downloadDropdown.addEventListener('click', async (event) => {
        const item = event.target.closest('[role="menuitem"]');
        if (!item) return;
        event.preventDefault();
        const title = (item.getAttribute('title') || item.textContent || '').trim();
        const match = title.match(/download as\s+(.+)/i);
        const type = (match && match[1]) ? match[1].toLowerCase().replace(/\s+/g, '') : title.toLowerCase().replace(/\s+/g, '');

        const manager = await ensureManager();
        if (manager && typeof manager.handleDownload === 'function') {
          try {
            await manager.handleDownload(type, {
              getContentEl: this.#getContentElement.bind(this),
              getTitle: () => this.querySelector('.people-page__title')?.textContent?.trim() || document.title || 'profile',
            });
          } catch (err) {
            console.error('Download manager error', err);
          }
        } else {
          // minimal fallback
          if (type === 'printthispage' || type === 'print') {
            window.print();
          } else {
            const contentEl = this.#getContentElement();
            if (contentEl) {
              const filename = (this.querySelector('.people-page__title')?.textContent || document.title || 'profile').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
              const blob = new Blob([contentEl.innerText], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.txt`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1500);
            }
          }
        }

        closeAllMenus();
      });
    }
  }

  #getInitialTab() {
    return this.#getTabFromHash() || 'profile';
  }

  #getTabFromHash() {
    const hash = window.location.hash.replace(/^#/, '');
    return PEOPLE_PAGE_TABS.includes(hash) ? hash : null;
  }

  #getContentElement() {
    return this.querySelector('.people-page__content');
  }

  #resolveDataUrl(filename) {
    return new URL(filename, new URL(PEOPLE_PAGE_DATA_DIR, window.location.href)).href;
  }

  #bindTabs() {
    const tabLinks = [...this.querySelectorAll('.people-page__tab-link[data-tab]')];

    tabLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const tab = link.dataset.tab;
        if (!PEOPLE_PAGE_TABS.includes(tab)) {
          return;
        }

        this.#selectTab(tab);
        this.#loadTab(tab);
      });
    });
  }

  #selectTab(tab, { updateHash = true } = {}) {
    const tabLinks = [...this.querySelectorAll('.people-page__tab-link[data-tab]')];

    tabLinks.forEach((link) => {
      const isSelected = link.dataset.tab === tab;
      const tabItem = link.closest('.people-page__tab-item');
      tabItem?.classList.toggle('is-selected', isSelected);
      link.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (updateHash) {
      const nextHash = `#${tab}`;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', nextHash);
      }
    }

  }

  async #loadTab(tab) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    const url = this.#resolveDataUrl(`${tab}.html`);
    contentEl.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }

      contentEl.innerHTML = await this.#prepareContentHtml(await response.text(), tab);

      if (tab === 'media') {
        await this.#renderMediaGallery(contentEl);
      }

      this.dispatchEvent(
        new CustomEvent('people-page-tab-loaded', {
          bubbles: true,
          composed: true,
          detail: { tab, url },
        }),
      );
    } catch (error) {
      contentEl.innerHTML = '<p>Could not load this tab. Please try again.</p>';
      console.error(error);
    } finally {
      contentEl.removeAttribute('aria-busy');
    }
  }

  #resolveImageUrl(path) {
    const value = path?.trim() || '';
    if (!value) {
      return '';
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    if (value.startsWith('data/')) {
      return new URL(value, window.location.href).href;
    }

    if (value.startsWith('images/')) {
      return this.#resolveDataUrl(value);
    }

    return this.#resolveDataUrl(`images/${value.replace(/^\/+/, '')}`);
  }

  #imageFilenameFromHref(href) {
    const filename = (href.split('?')[0].split('/').pop() || '').trim();
    return PEOPLE_PAGE_IMAGE_EXTENSIONS.test(filename) ? filename : '';
  }

  async #listDataImages() {
    const images = new Set();

    try {
      const directoryResponse = await fetch(this.#resolveDataUrl('images/'));
      if (directoryResponse.ok) {
        const contentType = directoryResponse.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const listing = await directoryResponse.json();
          const entries = Array.isArray(listing) ? listing : listing?.files || listing?.images || [];
          entries.forEach((entry) => {
            const filename = this.#imageFilenameFromHref(
              typeof entry === 'string' ? entry : entry?.name || entry?.file || '',
            );
            if (filename) {
              images.add(this.#resolveImageUrl(filename));
            }
          });
        } else {
          const listing = new DOMParser().parseFromString(await directoryResponse.text(), 'text/html');
          listing.querySelectorAll('a[href]').forEach((link) => {
            const filename = this.#imageFilenameFromHref(link.getAttribute('href') || '');
            if (filename) {
              images.add(this.#resolveImageUrl(filename));
            }
          });
        }
      }
    } catch (error) {
      console.warn('Could not read data/images folder', error);
    }

    if (images.size === 0) {
      try {
        const profileResponse = await fetch(this.#resolveDataUrl('profile.html'));
        if (profileResponse.ok) {
          const profileDoc = new DOMParser().parseFromString(await profileResponse.text(), 'text/html');
          profileDoc.querySelectorAll('aside img[src]').forEach((img) => {
            const url = this.#resolveImageUrl(img.getAttribute('src') || '');
            if (url) {
              images.add(url);
            }
          });
        }
      } catch (error) {
        console.warn('Could not read profile images', error);
      }
    }

    return [...images].sort((a, b) => a.localeCompare(b));
  }

  #imageCaptionFromUrl(url) {
    const filename = decodeURIComponent(url.split('/').pop() || 'Image');
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async #renderMediaGallery(contentEl) {
    const existingGallery = contentEl.querySelector('.people-page__gallery, .people-page__gallery-empty');
    existingGallery?.remove();

    const images = await this.#listDataImages();

    if (images.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'people-page__gallery-empty';
      empty.textContent = 'No images found in data/images/.';
      contentEl.append(empty);
      return;
    }

    const gallery = document.createElement('div');
    gallery.className = 'people-page__gallery';

    images.forEach((src) => {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = src;
      img.alt = this.#imageCaptionFromUrl(src);
      img.loading = 'lazy';
      const caption = document.createElement('figcaption');
      caption.textContent = this.#imageCaptionFromUrl(src);
      figure.append(img, caption);
      gallery.append(figure);
    });

    contentEl.append(gallery);
  }

}

if (!customElements.get('people-page')) {
  customElements.define('people-page', PeoplePage);
}
