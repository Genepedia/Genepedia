function getHeaderAssetHref(fileName) {
  return window.location.pathname.includes('/pages/') ? `../assets/${fileName}` : `assets/${fileName}`;
}

function getHomePageHref() {
  return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

const MINI_HEADER_TEMPLATE = `
<div class="central-textlogo">
  <img class="central-textlogo__logo" src="" alt="" aria-hidden="true">
  <h1 class="central-textlogo-wrapper">
    <span class="central-textlogo__wordmark">
      <a href="" class="central-textlogo__home-link" aria-label="Home">
        <span class="central-textlogo__wordmark-accent">G</span>ENIPEDI<span class="central-textlogo__wordmark-accent">A</span>
      </a>
    </span>
    <strong class="localized-slogan">The Free Geneology Encyclopedia</strong>
  </h1>
</div>
`;

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
    this.innerHTML = MINI_HEADER_TEMPLATE;

    const logo = this.querySelector('.central-textlogo__logo');
    const homeLink = this.querySelector('.central-textlogo__home-link');

    if (logo) {
      logo.src = getHeaderAssetHref('Logo.png');
    }

    if (homeLink) {
      homeLink.href = getHomePageHref();
    }

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
  }
}

if (!customElements.get('mini-header')) {
  customElements.define('mini-header', MiniHeader);
}
