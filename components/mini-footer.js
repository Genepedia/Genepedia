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

function getLegalPageHref(fileName) {
  return window.location.pathname.includes('/pages/') ? fileName : `pages/${fileName}`;
}

class MiniFooter extends HTMLElement {
  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
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
