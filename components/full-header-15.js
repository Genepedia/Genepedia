const FULL_HEADER_15_TEMPLATE = String.raw`
<style>
full-header-15 {
  display: block;
}

.header-container.header-chrome {
  width: 100%;
  min-height: 55px;
  background: #27292d;
  color: #eaecf0;
  box-shadow: inset 0 -1px 3px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.header-chrome__row {
  width: 100%;
  min-height: 55px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.header-chrome__start,
.header-chrome__search,
.header-chrome__end {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-chrome__start {
  flex: 0 1 auto;
  gap: 0.25rem;
}

.header-chrome__search {
  flex: 1 1 auto;
  justify-content: flex-end;
  padding: 0 0.25rem;
}

.header-chrome__end {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.header-chrome__menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0.125rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.header-chrome__menu:hover {
  background: rgba(255, 255, 255, 0.06);
}

.header-chrome__menu i {
  font-size: 1.35rem;
  line-height: 1;
}

.header-chrome__brand {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.header-chrome__brand mini-header {
  display: block;
  min-width: 0;
}

.header-chrome__brand mini-header .central-textlogo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  width: auto;
  max-width: none;
  min-height: 0;
  padding: 0;
  text-align: left;
  text-indent: 0;
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1rem;
  line-height: 1.1;
  color: #eaecf0 !important;
}

.header-chrome__brand mini-header .central-textlogo__logo {
  display: block !important;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  flex-shrink: 0;
  object-fit: contain;
  background: transparent;
  filter: none !important;
}

body:not(.theme-dark) .header-chrome__brand mini-header .central-textlogo__logo,
body.theme-dark .header-chrome__brand mini-header .central-textlogo__logo {
  filter: none !important;
}

body.theme-dark .header-chrome__brand mini-header .central-textlogo,
body.theme-dark .header-chrome__brand mini-header .central-textlogo__home-link,
body.theme-dark .header-chrome__brand mini-header .localized-slogan {
  color: #ffffff !important;
}

body.theme-dark .header-chrome__brand mini-header .localized-slogan {
  opacity: 1;
}

body:not(.theme-dark) .header-chrome__brand mini-header .central-textlogo,
body:not(.theme-dark) .header-chrome__brand mini-header .central-textlogo__home-link,
body:not(.theme-dark) .header-chrome__brand mini-header .localized-slogan {
  color: #eaecf0 !important;
}

.header-chrome__brand mini-header .central-textlogo-wrapper {
  display: grid;
  gap: 0;
  margin: 0;
  min-width: 0;
}

.header-chrome__brand mini-header .central-textlogo__wordmark {
  font-size: 1em;
  line-height: 1.05;
}

.header-chrome__brand mini-header .central-textlogo__home-link,
.header-chrome__brand mini-header .localized-slogan {
  color: #eaecf0 !important;
}

.header-chrome__brand mini-header .localized-slogan {
  display: block;
  margin-top: 0;
  font-size: 0.72rem;
  font-weight: 400;
  line-height: 1.15;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-chrome__search-form {
  width: 100%;
  max-width: 18rem;
  display: flex;
  align-items: stretch;
  min-height: 2.375rem;
  background: #1e2125;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.125rem;
  box-sizing: border-box;
  overflow: hidden;
}

.header-chrome__search-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0 0 0 0.75rem;
  color: #c8ccd1;
  pointer-events: none;
}

.header-chrome__search-icon i {
  font-size: 1rem;
  line-height: 1;
}

.header-chrome__search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #f8f9fa;
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  padding: 0.5rem 0.75rem 0.5rem 0.5rem;
}

.header-chrome__search-input::placeholder {
  color: rgba(248, 249, 250, 0.55);
}

.header-chrome__search-input:focus {
  outline: none;
}

.header-chrome__login {
  min-width: 4.75rem;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.125rem;
  background: rgba(255, 255, 255, 0.04);
  color: #ffffff;
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.header-chrome__login:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 720px) {
  .header-chrome__row {
    flex-wrap: wrap;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem 0.5rem;
    min-height: auto;
  }

  .header-chrome__start {
    flex: 1 1 auto;
    min-width: 0;
  }

  .header-chrome__end {
    flex: 0 0 auto;
  }

  .header-chrome__search {
    order: 3;
    flex: 1 1 100%;
    justify-content: flex-end;
    padding: 0;
  }

  .header-chrome__search-form {
    max-width: 18rem;
  }

  .header-chrome__brand mini-header .localized-slogan {
    white-space: normal;
  }
}

@media (max-width: 420px) {
  .header-chrome__brand mini-header .central-textlogo {
    gap: 0.4rem;
    font-size: 0.92rem;
  }

  .header-chrome__brand mini-header .central-textlogo__logo {
    width: 1.75rem;
    height: 1.75rem;
    min-width: 1.75rem;
  }

  .header-chrome__brand mini-header .localized-slogan {
    font-size: 0.66rem;
  }
}
</style>
<header class="header-container header-chrome" role="banner">
  <div class="header-chrome__row">
    <div class="header-chrome__start">
      <button class="header-chrome__menu" type="button" aria-label="Open menu">
        <i class="bi bi-list" aria-hidden="true"></i>
      </button>
      <div class="header-chrome__brand">
        <mini-header></mini-header>
      </div>
    </div>
    <div class="header-chrome__search">
      <form class="header-chrome__search-form" role="search" action="#" method="get">
        <span class="header-chrome__search-icon" aria-hidden="true">
          <i class="bi bi-search"></i>
        </span>
        <input
          class="header-chrome__search-input"
          type="search"
          name="search"
          placeholder="Search Genipedia..."
          aria-label="Search Genipedia"
          autocomplete="off"
        >
      </form>
    </div>
    <div class="header-chrome__end">
      <button class="header-chrome__login" type="button">Log In</button>
    </div>
  </div>
</header>
`;

const FULL_HEADER_15_SCRIPT_URL = document.currentScript?.src || '';
const FULL_HEADER_15_SLOGAN = 'Free Geneology Encyclopedia';

function resolveFromComponent(relativePath) {
  try {
    return new URL(relativePath, FULL_HEADER_15_SCRIPT_URL || window.location.href).href;
  } catch {
    return relativePath;
  }
}

const THEME_STORAGE_KEY = 'genipedia-theme';

function applyDocumentTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    theme = null;
  }

  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.body.classList.toggle('theme-dark', theme === 'dark');
}

class FullHeader15 extends HTMLElement {
  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    applyDocumentTheme();
    this.innerHTML = FULL_HEADER_15_TEMPLATE;

    const syncBrand = () => {
      const miniHeader = this.querySelector('mini-header');
      const logo = miniHeader?.querySelector('.central-textlogo__logo');
      const homeLink = miniHeader?.querySelector('.central-textlogo__home-link');
      const slogan = miniHeader?.querySelector('.localized-slogan');

      if (logo) {
        logo.src = resolveFromComponent('../assets/Logo.png');
        logo.alt = '';
      }

      if (homeLink) {
        homeLink.href = resolveFromComponent('../index.html');
      }

      if (slogan) {
        if (slogan.textContent !== FULL_HEADER_15_SLOGAN) {
          slogan.textContent = FULL_HEADER_15_SLOGAN;
        }

        if (!slogan.dataset.fullHeader15Slogan) {
          slogan.dataset.fullHeader15Slogan = 'true';
          new MutationObserver(() => {
            if (slogan.textContent !== FULL_HEADER_15_SLOGAN) {
              slogan.textContent = FULL_HEADER_15_SLOGAN;
            }
          }).observe(slogan, { characterData: true, childList: true, subtree: true });
        }
      }
    };

    const runSync = () => {
      requestAnimationFrame(() => {
        syncBrand();
        requestAnimationFrame(syncBrand);
      });
    };

    if (customElements.get('mini-header')) {
      runSync();
    } else {
      customElements.whenDefined('mini-header').then(runSync);
    }
  }
}

if (!customElements.get('full-header-15')) {
  customElements.define('full-header-15', FullHeader15);
}
