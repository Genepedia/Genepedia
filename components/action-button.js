const ACTION_BUTTON_STYLE_ELEMENT_ID = 'action-button-styles';
const ACTION_BUTTON_STYLES = String.raw`
action-button {
  display: inline-flex;
  position: relative;
  vertical-align: middle;
}

action-button .action-button__control {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: none;
  font: inherit;
  line-height: 1;
  box-sizing: border-box;
  cursor: pointer;
  appearance: none;
}

action-button .action-button__control:hover {
  text-decoration: none;
}

action-button .action-button__control:focus-visible {
  outline: 2px solid var(--outline-color-progressive--focus, #36c);
  outline-offset: 2px;
}

action-button .action-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

action-button .action-button__label:empty,
action-button .action-button__badge[hidden] {
  display: none !important;
}
`;

function ensureActionButtonStyles() {
  if (document.getElementById(ACTION_BUTTON_STYLE_ELEMENT_ID)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = ACTION_BUTTON_STYLE_ELEMENT_ID;
  styleElement.textContent = ACTION_BUTTON_STYLES;
  document.head.append(styleElement);
}

function escapeActionButtonHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

class ActionButton extends HTMLElement {
  static get observedAttributes() {
    return [
      'aria-controls',
      'aria-expanded',
      'aria-haspopup',
      'aria-label',
      'badge',
      'badge-hidden',
      'disabled',
      'href',
      'icon',
      'label',
      'rel',
      'target',
      'title',
      'type',
    ];
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  focus(options) {
    this.querySelector('.action-button__control')?.focus(options);
  }

  #render() {
    ensureActionButtonStyles();

    const href = this.getAttribute('href');
    const disabled = this.hasAttribute('disabled');
    const tagName = href && !disabled ? 'a' : 'button';
    const attributes = ['class="action-button__control"'];

    ['aria-controls', 'aria-expanded', 'aria-haspopup', 'aria-label', 'title'].forEach((name) => {
      const value = this.getAttribute(name);
      if (value !== null) {
        attributes.push(`${name}="${escapeActionButtonHtml(value)}"`);
      }
    });

    if (tagName === 'a') {
      attributes.push(`href="${escapeActionButtonHtml(href)}"`);

      const target = this.getAttribute('target');
      if (target) {
        attributes.push(`target="${escapeActionButtonHtml(target)}"`);
      }

      const rel = this.getAttribute('rel');
      if (rel) {
        attributes.push(`rel="${escapeActionButtonHtml(rel)}"`);
      }
    } else {
      attributes.push(`type="${escapeActionButtonHtml(this.getAttribute('type') || 'button')}"`);
      if (disabled) {
        attributes.push('disabled');
      }
    }

    const icon = this.getAttribute('icon')?.trim();
    const label = this.getAttribute('label')?.trim() || '';
    const badge = this.getAttribute('badge');
    const badgeMarkup = badge !== null
      ? `<span class="action-button__badge"${this.hasAttribute('badge-hidden') ? ' hidden' : ''}>${escapeActionButtonHtml(badge)}</span>`
      : '';

    this.innerHTML = `
      <${tagName} ${attributes.join(' ')}>
        ${icon ? `<span class="action-button__icon" aria-hidden="true"><i class="bi ${escapeActionButtonHtml(icon)}" aria-hidden="true"></i></span>` : ''}
        ${label ? `<span class="action-button__label">${escapeActionButtonHtml(label)}</span>` : ''}
        ${badgeMarkup}
      </${tagName}>
    `;
  }
}

if (!customElements.get('action-button')) {
  customElements.define('action-button', ActionButton);
}