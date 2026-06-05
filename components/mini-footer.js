const MINI_FOOTER_TEMPLATE = `
<p class="site-license">
  <small class="theme-toggle">
    <label class="theme-switch">
      <input class="theme-toggle-input" type="checkbox" aria-label="Toggle dark mode">
      <span class="switch" aria-hidden="true"></span>
      <span class="theme-switch-label">Dark</span>
    </label>
  </small>
  <small><a data-legal-link="terms" target="_blank" rel="noopener noreferrer">Terms of Use</a></small>
  <small><a data-legal-link="privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></small>
</p>
`;

const MINI_FOOTER_STYLE_ELEMENT_ID = 'app-mini-footer-styles';
const MINI_FOOTER_STYLES = String.raw`
mini-footer .site-license {
  color: var(--color-subtle);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: .25rem 0;
}

mini-footer .site-license small {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  font-size: inherit;
  line-height: inherit;
  font-family: inherit;
}

mini-footer .site-license small:after {
  content: "\2022";
  display: inline-block;
  font-size: 1.3rem;
  line-height: inherit;
  margin-left: .6rem;
  margin-right: .5rem;
  align-self: center;
}

mini-footer .site-license small:last-child:after {
  display: none;
}

mini-footer .site-license .theme-toggle {
  display: inline-flex;
  align-items: center;
  margin: 0;
}

mini-footer .theme-switch {
  display: inline-flex;
  align-items: center;
  gap: .6rem;
  cursor: pointer;
  user-select: none;
}

mini-footer .theme-switch input {
  display: none;
}

mini-footer .theme-switch .switch {
  width: 44px;
  height: 24px;
  background: var(--color-subtle);
  border-radius: 999px;
  position: relative;
  transition: background .2s;
  flex-shrink: 0;
}

mini-footer .theme-switch .switch::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transform: translateY(-50%);
  transition: left .2s, transform .2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

mini-footer .theme-switch input:checked + .switch {
  background: #4a90e2;
}

mini-footer .theme-switch input:checked + .switch::after {
  left: 22px;
}

mini-footer .theme-switch .theme-switch-label {
  font-size: inherit;
  line-height: inherit;
  font-family: inherit;
  color: var(--color-subtle);
}

mini-footer .site-license small a {
  font-size: inherit;
  line-height: inherit;
  font-family: inherit;
}

@media screen and (max-width:768px) {
  .footer mini-footer {
    order: 5;
  }

  mini-footer {
    display: block;
    width: 100%;
  }
}
`;

function ensureMiniFooterStyles() {
  if (document.getElementById(MINI_FOOTER_STYLE_ELEMENT_ID)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = MINI_FOOTER_STYLE_ELEMENT_ID;
  styleElement.textContent = MINI_FOOTER_STYLES;
  document.head.appendChild(styleElement);
}

function getLegalPageHref(fileName) {
  return window.location.pathname.includes('/pages/') ? fileName : `pages/${fileName}`;
}

class MiniFooter extends HTMLElement {
  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    ensureMiniFooterStyles();
    this.innerHTML = MINI_FOOTER_TEMPLATE;

    const termsLink = this.querySelector('[data-legal-link="terms"]');
    const privacyLink = this.querySelector('[data-legal-link="privacy"]');

    if (termsLink) {
      termsLink.href = getLegalPageHref('terms_of_use.html');
    }

    if (privacyLink) {
      privacyLink.href = getLegalPageHref('privacy_policy.html');
    }
  }
}

if (!customElements.get('mini-footer')) {
  customElements.define('mini-footer', MiniFooter);
}
