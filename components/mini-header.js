function getHeaderAssetHref(fileName) {
  return window.location.pathname.includes('/pages/') ? `../assets/${fileName}` : `assets/${fileName}`;
}

function getHomePageHref() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function getMiniHeaderAppName() {
  const name = window.App?.getName?.() || window.App?.Name;
  return (typeof name === 'string' && name.trim()) ? name.trim() : '';
}

function syncMiniHeaderWordmark(homeLink) {
  if (!homeLink) {
    return;
  }

  const first = homeLink.querySelector('[data-wordmark="first"]');
  const middle = homeLink.querySelector('[data-wordmark="middle"]');
  const last = homeLink.querySelector('[data-wordmark="last"]');
  if (!first || !middle || !last) {
    return;
  }

  const appName = getMiniHeaderAppName();
  if (!appName) {
    first.textContent = '';
    middle.textContent = '';
    last.textContent = '';
    return;
  }

  // Preserve the original wordmark style (e.g. G + ENEPEDI + A)
  // while still sourcing the base name from App.Name.
  const displayName = appName.toUpperCase();

  if (displayName.length === 1) {
    first.textContent = displayName;
    middle.textContent = '';
    last.textContent = '';
    return;
  }

  first.textContent = displayName.slice(0, 1);
  middle.textContent = displayName.slice(1, -1);
  last.textContent = displayName.slice(-1);
}

const MINI_HEADER_TEMPLATE = `
<div class="central-textlogo">
  <img class="central-textlogo__logo" src="" alt="" aria-hidden="true">
  <h1 class="central-textlogo-wrapper">
    <span class="central-textlogo__wordmark">
      <a href="" class="central-textlogo__home-link" aria-label="Home">
        <span class="central-textlogo__wordmark-accent" data-wordmark="first"></span><span data-wordmark="middle"></span><span class="central-textlogo__wordmark-accent" data-wordmark="last"></span>
      </a>
    </span>
    <strong class="localized-slogan">The Free Geneology Encyclopedia</strong>
  </h1>
</div>
`;

const MINI_HEADER_STYLE_ELEMENT_ID = 'app-mini-header-styles';
const MINI_HEADER_STYLES = String.raw`
mini-header .central-textlogo-wrapper {
  display: inline-block;
  font-size: inherit;
  vertical-align: bottom;
}

mini-header .central-textlogo {
  position: relative;
  margin: 4rem auto .5rem;
  width: 320px;
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 3.6rem;
  font-weight: 400;
  line-height: 3.9rem;
  text-align: center;
  font-feature-settings: "ss05";
}

mini-header .localized-slogan {
  display: block;
  margin-top: -0.2rem;
  font-family: var(--font-family-serif, Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif);
  font-size: 1.6rem;
  font-weight: 400;
}

mini-header .central-textlogo__wordmark {
  display: inline-block;
  font-family: inherit;
  font-size: 1em;
  font-weight: 400;
  line-height: 1.1;
  vertical-align: middle;
}

mini-header .central-textlogo__wordmark-accent {
  display: inline-block;
  font-size: 1.42em;
  line-height: 0.84;
  vertical-align: baseline;
}

mini-header .central-textlogo__logo {
  display: none;
}

mini-header .central-textlogo__home-link {
  color: inherit;
  text-decoration: none;
  display: inline-block;
}

mini-header .central-textlogo__home-link:hover,
mini-header .central-textlogo__home-link:active {
  color: inherit;
  text-decoration: none;
}

mini-header .central-textlogo__home-link:focus {
  outline: 2px solid var(--color-progressive, #36c);
  outline-offset: 2px;
  border-radius: 4px;
}

body:not(.theme-dark) mini-header .central-textlogo {
  color: #111 !important;
}

body:not(.theme-dark) mini-header .central-textlogo__home-link {
  color: inherit !important;
}

body:not(.theme-dark) mini-header .central-textlogo .localized-slogan {
  color: #333 !important;
  opacity: 0.95;
}

body:not(.theme-dark) mini-header .central-textlogo__logo {
  filter: invert(1) grayscale(0.02) contrast(0.95);
}

@media (max-width:480px) {
  mini-header {
    display: block;
    width: 100%;
  }

  mini-header .central-textlogo {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    width: fit-content;
    max-width: calc(100% - 2rem);
    height: auto;
    min-height: 84px;
    margin: 2rem auto 0;
    padding: 0 1rem;
    text-align: left;
    line-height: 3rem;
    text-indent: 0;
    font-size: 1.45em;
  }

  mini-header .central-textlogo__logo {
    display: block;
    width: auto;
    height: 6rem;
    flex-shrink: 0;
  }

  mini-header .central-textlogo-wrapper {
    position: static;
    top: auto;
    text-indent: 0;
    text-align: left;
    margin: 0;
    min-width: 0;
  }

  mini-header .localized-slogan {
    font-size: 1.55rem;
    text-align: left;
  }
}

@media (max-width:240px) {
  mini-header .central-textlogo__wordmark {
    height: auto;
  }
}
`;

function ensureMiniHeaderStyles() {
  if (document.getElementById(MINI_HEADER_STYLE_ELEMENT_ID)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = MINI_HEADER_STYLE_ELEMENT_ID;
  styleElement.textContent = MINI_HEADER_STYLES;
  document.head.appendChild(styleElement);
}

const FULL_SLOGAN = 'The Free Geneology Encyclopedia';
const SHORT_SLOGAN = 'Free Geneology Encyclopedia';

const restoreInlineStyles = (element, saved) => {
  Object.entries(saved).forEach(([property, value]) => {
    element.style[property] = value;
  });
};

const isSloganWrapped = (slogan) => {
  const lineHeight = Number.parseFloat(getComputedStyle(slogan).lineHeight);
  if (!Number.isFinite(lineHeight)) {
    return slogan.scrollHeight > slogan.clientHeight + 1;
  }

  return slogan.getBoundingClientRect().height > lineHeight * 1.05;
};

const sloganFitsOneLine = (slogan, container) => {
  const wrapper = slogan.closest('.central-textlogo-wrapper');
  if (!wrapper) {
    return true;
  }

  const isMobileLayout = getComputedStyle(container).display === 'flex';
  const saved = {
    container: {
      width: container.style.width,
      maxWidth: container.style.maxWidth,
    },
    wrapper: {
      flex: wrapper.style.flex,
      minWidth: wrapper.style.minWidth,
    },
    slogan: {
      whiteSpace: slogan.style.whiteSpace,
    },
  };

  slogan.textContent = FULL_SLOGAN;
  slogan.style.whiteSpace = 'normal';

  if (!isMobileLayout) {
    const fits = !isSloganWrapped(slogan);
    restoreInlineStyles(slogan, saved.slogan);
    return fits;
  }

  container.style.width = '';
  container.style.maxWidth = '';
  wrapper.style.flex = '';
  wrapper.style.minWidth = '0';

  const maxContainerWidth = Number.parseFloat(getComputedStyle(container).maxWidth);
  if (Number.isFinite(maxContainerWidth) && maxContainerWidth > 0) {
    container.style.width = `${maxContainerWidth}px`;
    container.style.maxWidth = `${maxContainerWidth}px`;
  }

  const fits = !isSloganWrapped(slogan);

  restoreInlineStyles(container, saved.container);
  restoreInlineStyles(wrapper, saved.wrapper);
  restoreInlineStyles(slogan, saved.slogan);

  return fits;
};

const updateSloganFit = (slogan, container) => {
  slogan.textContent = sloganFitsOneLine(slogan, container) ? FULL_SLOGAN : SHORT_SLOGAN;
};

class MiniHeader extends HTMLElement {
  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    ensureMiniHeaderStyles();
    this.innerHTML = MINI_HEADER_TEMPLATE;

    const logo = this.querySelector('.central-textlogo__logo');
    const homeLink = this.querySelector('.central-textlogo__home-link');

    if (logo) {
      logo.src = getHeaderAssetHref('Logo.png');
    }

    if (homeLink) {
      homeLink.href = getHomePageHref();
    }

    syncMiniHeaderWordmark(homeLink);

    this._appNameChangeHandler = () => {
      syncMiniHeaderWordmark(homeLink);
    };
    window.addEventListener('app:namechange', this._appNameChangeHandler);

    const slogan = this.querySelector('.localized-slogan');
    const container = this.querySelector('.central-textlogo');
    if (!slogan || !container) {
      return;
    }

    const syncSlogan = () => {
      updateSloganFit(slogan, container);
    };

    syncSlogan();

    this._sloganResizeObserver = new ResizeObserver(syncSlogan);
    this._sloganResizeObserver.observe(this);
    this._sloganResizeObserver.observe(container);
    if (this.parentElement) {
      this._sloganResizeObserver.observe(this.parentElement);
    }

    this._sloganWindowResizeHandler = syncSlogan;
    window.addEventListener('resize', this._sloganWindowResizeHandler, { passive: true });

    document.fonts?.ready.then(syncSlogan);
  }

  disconnectedCallback() {
    this._sloganResizeObserver?.disconnect();
    this._sloganResizeObserver = null;

    if (this._sloganWindowResizeHandler) {
      window.removeEventListener('resize', this._sloganWindowResizeHandler);
      this._sloganWindowResizeHandler = null;
    }

    if (this._appNameChangeHandler) {
      window.removeEventListener('app:namechange', this._appNameChangeHandler);
      this._appNameChangeHandler = null;
    }
  }
}

if (!customElements.get('mini-header')) {
  customElements.define('mini-header', MiniHeader);
}
