const FULL_FOOTER_SCRIPT_URL = (() => {
  if (document.currentScript?.src) return document.currentScript.src;
  try {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const s = scripts[i];
      if (s && s.src && s.src.includes('full-footer.js')) {
        return s.src;
      }
    }
  } catch (e) {
    // ignore
  }
  return window.location.href;
})();
const FULL_FOOTER_SLOGAN = 'Free Geneology Encyclopedia';

const FULL_FOOTER_TEMPLATE = String.raw`
<style>
html {
  height: 100%;
  overflow-x: clip;
}

body {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  overflow-x: clip;
}

body > full-header {
  flex-shrink: 0;
}

body > article {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  box-sizing: border-box;
}

body > article > people-page,
body > article > full-footer {
  max-width: 100%;
  min-width: 0;
}

body > article > full-footer {
  margin-top: auto;
}

full-footer {
  display: block;
  --page-footer-bg: #27292d;
  --page-footer-fg: #eaecf0;
  --page-footer-muted: #a7adb4;
  --page-footer-border: rgba(255, 255, 255, 0.1);
  --page-footer-link: #6b9eff;
  --page-footer-hover: rgba(255, 255, 255, 0.06);
}

body:not(.theme-dark) full-footer {
  --page-footer-bg: #ffffff;
  --page-footer-fg: #202122;
  --page-footer-muted: #54595d;
  --page-footer-border: rgba(0, 0, 0, 0.12);
  --page-footer-link: #3366cc;
  --page-footer-hover: rgba(0, 0, 0, 0.04);
}

.page-footer {
  width: 100%;
  max-width: 100%;
  color: var(--page-footer-fg);
  background: var(--page-footer-bg);
  border-top: 1px solid var(--page-footer-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

body:not(.theme-dark) .page-footer {
  box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.08);
}

.page-footer__inner {
  width: 100%;
  max-width: var(--site-content-max-width, 90rem);
  margin: 0 auto;
  padding: 0 1rem 2rem;
  box-sizing: border-box;
}

.page-footer a {
  color: var(--page-footer-link);
  text-decoration: none;
}

.page-footer a:hover {
  text-decoration: underline;
}

.page-footer__last-edited {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem 0;
  border: 0;
  border-bottom: 1px solid var(--page-footer-border);
  background: transparent;
  color: var(--page-footer-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.page-footer__last-edited:hover {
  text-decoration: none;
  background: var(--page-footer-hover);
}

.page-footer__last-edited span {
  flex: 1 1 auto;
}

.page-footer__last-edited i:last-child {
  opacity: 0.75;
}

.page-footer__branding {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--page-footer-border);
}

.page-footer__brand {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.page-footer__brand mini-header {
  display: block;
  min-width: 0;
}

.page-footer__brand mini-header .central-textlogo {
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
  color: var(--page-footer-fg) !important;
}

.page-footer__brand mini-header .central-textlogo__logo {
  display: block !important;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  flex-shrink: 0;
  object-fit: contain;
  background: transparent;
  filter: none !important;
}

body:not(.theme-dark) .page-footer__brand mini-header .central-textlogo__logo,
body.theme-dark .page-footer__brand mini-header .central-textlogo__logo {
  filter: none !important;
}

body.theme-dark .page-footer__brand mini-header .central-textlogo,
body.theme-dark .page-footer__brand mini-header .central-textlogo__home-link,
body.theme-dark .page-footer__brand mini-header .localized-slogan {
  color: #ffffff !important;
}

body.theme-dark .page-footer__brand mini-header .localized-slogan {
  opacity: 1;
}

body:not(.theme-dark) .page-footer__brand mini-header .central-textlogo,
body:not(.theme-dark) .page-footer__brand mini-header .central-textlogo__home-link,
body:not(.theme-dark) .page-footer__brand mini-header .localized-slogan {
  color: var(--page-footer-fg) !important;
}

.page-footer__brand mini-header .central-textlogo-wrapper {
  display: grid;
  gap: 0;
  margin: 0;
  min-width: 0;
}

.page-footer__brand mini-header .central-textlogo__wordmark {
  font-size: 1em;
  line-height: 1.05;
}

.page-footer__brand mini-header .central-textlogo__home-link,
.page-footer__brand mini-header .localized-slogan {
  color: var(--page-footer-fg) !important;
}

.page-footer__brand mini-header .localized-slogan {
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

.page-footer__social {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.page-footer__social action-button .action-button__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--page-footer-border);
  border-radius: 0.125rem;
  color: var(--page-footer-fg);
  text-decoration: none;
}

.page-footer__social action-button .action-button__control:hover {
  background: var(--page-footer-hover);
  color: var(--page-footer-fg);
  text-decoration: none;
}

.page-footer__social action-button .action-button__icon i {
  font-size: 1.1rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .page-footer__branding {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-footer__social {
    justify-content: flex-start;
  }

  .page-footer__brand mini-header .localized-slogan {
    white-space: normal;
  }
}

.page-footer__meta {
  padding-top: 1rem;
  font: 0.8125rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  line-height: 1.55;
  color: var(--page-footer-muted);
}

.page-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.page-footer__links li {
  display: inline-flex;
  align-items: center;
}

.page-footer__links li + li::before {
  content: "•";
  margin: 0 0.45rem;
  color: var(--page-footer-muted);
}

</style>
<footer class="page-footer" aria-label="Page footer">
  <div class="page-footer__inner">
    <a class="page-footer__last-edited" href="#">
      <i class="bi bi-clock-history" aria-hidden="true"></i>
      <span class="page-footer__last-edited-text"></span>
      <i class="bi bi-chevron-right" aria-hidden="true"></i>
    </a>

    <div class="page-footer__branding">
      <div class="page-footer__brand">
        <mini-header></mini-header>
      </div>
      <ul class="page-footer__social">
        <li>
          <action-button href="https://www.youtube.com/@Genepedia" target="_blank" rel="noopener noreferrer" icon="bi-youtube" aria-label="YouTube" title="YouTube"></action-button>
        </li>
        <li>
          <action-button href="#" icon="bi-facebook" aria-label="Facebook" title="Facebook"></action-button>
        </li>
        <li>
          <action-button href="https://www.instagram.com/genepedia_org/" target="_blank" rel="noopener noreferrer" icon="bi-instagram" aria-label="Instagram" title="Instagram"></action-button>
        </li>
        <li>
          <action-button href="#" icon="bi-tiktok" aria-label="TikTok" title="TikTok"></action-button>
        </li>
        <li>
          <action-button href="#" icon="bi-twitter-x" aria-label="X" title="X"></action-button>
        </li>
        <li>
          <action-button href="https://github.com/Genepedia" target="_blank" rel="noopener noreferrer" icon="bi-github" aria-label="GitHub" title="GitHub"></action-button>
        </li>
      </ul>
    </div>

    <div class="page-footer__meta">
      <ul class="page-footer__links">
        <li><a href="#">Contact {{APP_NAME}}</a></li>
        <li><a href="#">Privacy policy</a></li>
        <li><a href="#">Terms of Use</a></li>
        <li><a href="#">Cookie statement</a></li>
        <li><a href="#">Code of Conduct</a></li>
        <li><a href="#">Legal &amp; safety contacts</a></li>
        <li><a href="#">Statistics</a></li>
        <li><a href="#">Developers</a></li>
      </ul>
    </div>
  </div>
</footer>
`;

function resolveFromComponent(relativePath) {
  try {
    return new URL(relativePath, FULL_FOOTER_SCRIPT_URL || window.location.href).href;
  } catch {
    return relativePath;
  }
}

const FULL_FOOTER_ACTION_BUTTON_SCRIPT_URL = resolveFromComponent('action-button.js');

function ensureFooterActionButtonScript() {
  if (customElements.get('action-button')) {
    return;
  }

  if (document.querySelector('script[src*="action-button.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = FULL_FOOTER_ACTION_BUTTON_SCRIPT_URL;
  script.defer = true;
  document.head.append(script);
}

class FullFooter extends HTMLElement {
  static get observedAttributes() {
    return ['last-edited', 'last-editor', 'last-edited-days'];
  }

  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    ensureFooterActionButtonScript();
    this.innerHTML = FULL_FOOTER_TEMPLATE;
    this.#syncLastEdited();

    // Resolve important footer links to site pages so links work from any
    // document location (script path is used as the base for resolution).
    try {
      const footerLinks = this.querySelectorAll('.page-footer__links a');
      footerLinks.forEach((a) => {
        const text = (a.textContent || '').trim().toLowerCase();
        if (text.includes('privacy')) {
          a.href = resolveFromComponent('../pages/privacy_policy.html');
        } else if (text.includes('terms')) {
          a.href = resolveFromComponent('../pages/terms_of_use.html');
        } else if (text.includes('statistics')) {
          a.href = resolveFromComponent('../pages/statistics.html');
        } else if (text.includes('developers')) {
          a.href = resolveFromComponent('../pages/developers.html');
        } else if (text.includes('contact')) {
          a.href = resolveFromComponent('../pages/contact.html');
        }
      });
    } catch (e) {
      // ignore
    }

    // Second pass: ensure any anchors still using the placeholder '#' are updated.
    requestAnimationFrame(() => {
      try {
        const footerLinks2 = this.querySelectorAll('.page-footer__links a');
        footerLinks2.forEach((a) => {
          const raw = a.getAttribute('href');
          if (!raw || raw === '#') {
            const text = (a.textContent || '').trim().toLowerCase();
            if (text.includes('privacy')) {
              a.setAttribute('href', resolveFromComponent('../pages/privacy_policy.html'));
            } else if (text.includes('terms')) {
              a.setAttribute('href', resolveFromComponent('../pages/terms_of_use.html'));
            } else if (text.includes('statistics')) {
              a.setAttribute('href', resolveFromComponent('../pages/statistics.html'));
            } else if (text.includes('developers')) {
              a.setAttribute('href', resolveFromComponent('../pages/developers.html'));
            } else if (text.includes('contact')) {
              a.setAttribute('href', resolveFromComponent('../pages/contact.html'));
            }
          }
        });
      } catch (e) {
        // ignore
      }
    });

    const runBrandSync = () => {
      requestAnimationFrame(() => {
        this.#syncMiniHeader();
        requestAnimationFrame(() => this.#syncMiniHeader());
      });
    };

    if (customElements.get('mini-header')) {
      runBrandSync();
    } else {
      customElements.whenDefined('mini-header').then(runBrandSync);
    }
  }

  attributeChangedCallback() {
    if (this.__rendered) {
      this.#syncLastEdited();
    }
  }

  #syncLastEdited() {
    const textEl = this.querySelector('.page-footer__last-edited-text');
    if (!textEl) {
      return;
    }

    const custom = this.getAttribute('last-edited')?.trim();
    if (custom) {
      textEl.textContent = custom;
      return;
    }

    const days = this.getAttribute('last-edited-days')?.trim() || '7';
    const editor = this.getAttribute('last-editor')?.trim() || 'Shaun Roselt';
    textEl.textContent = `Last edited ${days} days ago by ${editor}`;
  }

  #syncMiniHeader() {
    const miniHeader = this.querySelector('.page-footer__brand mini-header');
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

    if (!slogan) {
      return;
    }

    if (slogan.textContent !== FULL_FOOTER_SLOGAN) {
      slogan.textContent = FULL_FOOTER_SLOGAN;
    }

    if (!slogan.dataset.fullFooterSlogan) {
      slogan.dataset.fullFooterSlogan = 'true';
      new MutationObserver(() => {
        if (slogan.textContent !== FULL_FOOTER_SLOGAN) {
          slogan.textContent = FULL_FOOTER_SLOGAN;
        }
      }).observe(slogan, { characterData: true, childList: true, subtree: true });
    }
  }
}

if (!customElements.get('full-footer')) {
  customElements.define('full-footer', FullFooter);
}
