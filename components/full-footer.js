const FULL_FOOTER_BASE_URL = new URL('.', document.currentScript.src);
const FULL_FOOTER_STYLE_ELEMENT_ID = 'genipedia-full-footer-styles';
const FULL_FOOTER_STYLES = String.raw`
/*
 * Footer lives as a direct child of .mw-page-container (relocated in JS), below
 * the grid in .mw-page-container-inner. That avoids grid column sizing and the
 * inner max-width/padding that kept the footer as narrow as the article column.
 */
.mw-page-container > full-footer {
    display: block;
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    margin-top: 2rem;
    clear: both;
}

.mw-page-container {
    overflow-x: clip;
}

.mw-page-container > full-footer .mw-footer-container {
    box-sizing: border-box;
    /* Break the footer out of the centered page gutter and span the
       full viewport width while keeping the inner content centered. */
    width: 100vw;
    max-width: none;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    border-top: 1px solid var(--vector-border, #c8ccd1);
    padding-top: 1rem;
    padding-bottom: 1rem;
}

.mw-page-container > full-footer .mw-footer {
    box-sizing: border-box;
    width: 100%;
    max-width: var(--vector-page-max-width, 99.75rem);
    margin: 0 auto;
    padding-left: max(var(--vector-page-padding, 2.75rem), env(safe-area-inset-left));
    padding-right: max(var(--vector-page-padding, 2.75rem), env(safe-area-inset-right));
    padding-bottom: 1rem;
    font-size: 0.8125rem;
    color: var(--vector-muted, #54595d);
    line-height: 1.5;
    border-top: 0;
}

/* Constrain immediate footer children (lists) so the content is centered
   within the full-bleed footer background. */
.mw-page-container > full-footer .mw-footer > * {
    box-sizing: border-box;
    width: auto;
    max-width: var(--vector-page-max-width, 99.75rem);
    margin-left: auto;
    margin-right: auto;
}

.mw-footer a {
    color: var(--vector-link, #3366cc);
    text-decoration: none;
}

.mw-footer a:hover {
    text-decoration: underline;
}

#footer-info,
#footer-places,
#footer-icons {
    list-style: none;
    padding: 0;
    margin: 0;
}

#footer-places li + li,
#footer-info li + li {
    margin-top: 0.5rem;
}

#footer-places,
#footer-icons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    margin-top: 1rem;
}

#footer-icons {
    align-items: center;
    margin-top: 1.5rem;
}

#footer-icons a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

#footer-icons img,
#footer-icons source {
    display: block;
}

@media (max-width: 640px) {
    #footer-places,
    #footer-icons {
        flex-direction: column;
        align-items: flex-start;
    }
}
`;

const OFFLINE_FOOTER_NOOP_URL = '#';
const OFFLINE_FOOTER_PRIVACY_URL = new URL('../pages/privacy_policy.html', FULL_FOOTER_BASE_URL).href;
const OFFLINE_FOOTER_TERMS_URL = new URL('../pages/terms_of_use.html', FULL_FOOTER_BASE_URL).href;

function ensureLocalFooterShell() {
    const html = document.documentElement;
    const { body } = document;

    if (html) {
        html.lang = 'en';
        html.dir = 'ltr';
        html.classList.add(
            'vector-feature-language-in-header-enabled',
            'vector-feature-language-in-main-menu-disabled',
            'vector-feature-language-in-main-page-header-disabled',
            'vector-feature-page-tools-pinned-disabled',
            'vector-sticky-header-enabled',
            'vector-toc-available',
            'skin-thumbsize-clientpref-standard'
        );
    }

    if (body) {
        body.classList.add(
            'skin--responsive',
            'skin-vector',
            'skin-vector-search-vue',
            'mediawiki',
            'ltr',
            'sitedir-ltr',
            'mw-hide-empty-elt',
            'ns-0',
            'ns-subject',
            'page-Nelson_Mandela',
            'rootpage-Nelson_Mandela',
            'skin-vector-2022',
            'action-view'
        );
    }

    if (!document.getElementById(FULL_FOOTER_STYLE_ELEMENT_ID)) {
        const shellStyles = document.createElement('style');
        shellStyles.id = FULL_FOOTER_STYLE_ELEMENT_ID;
        shellStyles.textContent = FULL_FOOTER_STYLES;
        document.head.appendChild(shellStyles);
    }
}

function relocateFooterToPageContainer(footer) {
    const pageContainer = footer.closest('.mw-page-container');
    if (!pageContainer || footer.parentElement === pageContainer) {
        return;
    }

    pageContainer.appendChild(footer);
    window.dispatchEvent(new Event('resize'));
}

class FullFooter extends HTMLElement {
    connectedCallback() {
        if (this.__rendered) return;
        this.__rendered = true;

        ensureLocalFooterShell();
        this.innerHTML = `
<div class="mw-footer-container">
	<footer id="footer" class="mw-footer">
		<ul id="footer-info">
			<li id="footer-info-lastmod">This page was last edited on 21 May 2026, at 07:06<span class="anonymous-show">&nbsp;(UTC)</span>.</li>
            <li id="footer-info-copyright">Text is available under the <a href="${OFFLINE_FOOTER_NOOP_URL}" title="Genipedia:Text of the Creative Commons Attribution-ShareAlike 4.0 International License">Creative Commons Attribution-ShareAlike 4.0 License</a>; additional terms may apply. By using this site, you agree to the <a href="${OFFLINE_FOOTER_TERMS_URL}" class="extiw" title="foundation:Special:MyLanguage/Policy:Terms of Use">Terms of Use</a> and <a href="${OFFLINE_FOOTER_PRIVACY_URL}" class="extiw" title="foundation:Special:MyLanguage/Policy:Privacy policy">Privacy Policy</a>. Genipedia is a registered trademark of the <a rel="nofollow" class="external text" href="${OFFLINE_FOOTER_NOOP_URL}">Wikimedia Foundation, Inc.</a>, a non-profit organization.</li>
		</ul>

		<ul id="footer-places">
            <li id="footer-places-privacy"><a href="${OFFLINE_FOOTER_PRIVACY_URL}">Privacy policy</a></li>
            <li id="footer-places-about"><a href="${OFFLINE_FOOTER_NOOP_URL}">About Genipedia</a></li>
            <li id="footer-places-disclaimers"><a href="${OFFLINE_FOOTER_NOOP_URL}">Disclaimers</a></li>
            <li id="footer-places-contact"><a href="${OFFLINE_FOOTER_NOOP_URL}">Contact Genipedia</a></li>
            <li id="footer-places-legal-safety-contacts"><a href="${OFFLINE_FOOTER_NOOP_URL}">Legal &amp; safety contacts</a></li>
            <li id="footer-places-wm-codeofconduct"><a href="${OFFLINE_FOOTER_NOOP_URL}">Code of Conduct</a></li>
            <li id="footer-places-developers"><a href="${OFFLINE_FOOTER_NOOP_URL}">Developers</a></li>
            <li id="footer-places-statslink"><a href="${OFFLINE_FOOTER_NOOP_URL}">Statistics</a></li>
            <li id="footer-places-cookiestatement"><a href="${OFFLINE_FOOTER_NOOP_URL}">Cookie statement</a></li>
		</ul>
	</footer>
</div>`;
        relocateFooterToPageContainer(this);
    }
}

if (!customElements.get('full-footer')) {
    customElements.define('full-footer', FullFooter);
}
