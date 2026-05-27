const FULL_PAGE_TOOLBAR_BASE_URL = new URL('.', document.currentScript.src);
const FULL_PAGE_TOOLBAR_STYLE_ELEMENT_ID = 'genipedia-full-page-toolbar-styles';
const FULL_PAGE_TOOLBAR_STYLES = String.raw`
/*
 * Make the <full-page-toolbar> custom element transparent to layout so it
 * doesn't break grid/flex parents. Mirrors what full-header and full-footer do.
 */
full-page-toolbar {
    display: contents;
}

.vector-page-tools-pinned-container {
    width: 100%;
    pointer-events: auto;
}

#vector-appearance-pinned-container:not(:empty) + #vector-page-tools-pinned-container:not(:empty) {
    margin-top: 1.25rem;
}

.vector-appearance-sidebar-shell .vector-page-tools--pinned {
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
}

.vector-page-tools--pinned .vector-pinnable-header {
    padding-bottom: 0.375rem;
    margin-bottom: 0.375rem;
}

.vector-page-tools--pinned .vector-pinnable-header-actions {
    display: none;
}

.vector-page-tools--pinned .mw-list-item a {
    padding: 0.375rem 0;
    line-height: normal;
}

.vector-page-toolbar-container {
    border-bottom: 1px solid var(--vector-border);
    background: var(--vector-page-bg);
    padding-top: 1rem;
}

.vector-page-titlebar,
.vector-page-titlebar-start,
.vector-page-titlebar-end,
.vector-page-toolbar-end,
.vector-page-language-button,
.vector-toc-toggle {
    display: flex;
    align-items: center;
}

.vector-page-titlebar {
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--vector-border);
}

.vector-page-titlebar-start {
    gap: 0.75rem;
    min-width: 0;
}

.vector-page-titlebar-end {
    justify-content: flex-end;
}

.vector-toc-toggle,
.vector-page-language-button {
    color: var(--vector-text);
    padding: 0.25rem 0;
    gap: 0.35rem;
    font: inherit;
}

.vector-toc-toggle {
    border: 0;
    background: transparent;
    cursor: pointer;
}

.firstHeading {
    margin: 0;
    font-family: 'Linux Libertine', Georgia, 'Times New Roman', Times, serif;
    font-weight: 400;
    font-size: 2.3rem;
    line-height: 1.2;
    color: var(--vector-text);
}

.vector-page-language-label {
    white-space: nowrap;
    font-size: 0.875rem;
    color: var(--vector-link);
}

.vector-page-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0;
    padding-bottom: 0;
    height: 2.5rem;
    min-height: 2.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    align-items: stretch;
    box-sizing: border-box;
}

.vector-page-toolbar-start,
.vector-page-toolbar-end,
.vector-page-toolbar-start nav,
.vector-page-toolbar-end nav {
    display: flex;
    align-items: stretch;
    height: 100%;
}

.vector-page-toolbar-end {
    gap: 0.75rem;
    flex-wrap: nowrap;
    justify-content: flex-end;
}

.vector-page-toolbar-list {
    display: flex;
    gap: 1rem;
    margin: 0;
    padding: 0;
    font-size: inherit;
    line-height: inherit;
    flex-wrap: nowrap;
    align-items: center;
    height: 100%;
    list-style: none;
}

.vector-page-toolbar-list .mw-list-item,
.vector-page-toolbar-list .mw-list-item + .mw-list-item {
    margin: 0;
    padding: 0;
    border-bottom: 2px solid transparent;
    display: flex;
    align-items: center;
    align-self: stretch;
    height: 100%;
    box-sizing: border-box;
}

.vector-page-toolbar-list .mw-list-item a {
    color: var(--vector-text);
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 0.5rem;
    font-size: inherit;
    line-height: inherit;
    font-weight: 400;
    box-sizing: border-box;
    min-height: 100%;
}

.vector-page-toolbar-list .mw-list-item a span {
    display: inline-block;
    vertical-align: middle;
    line-height: normal;
}

.vector-page-toolbar-list .mw-list-item.is-selected {
    border-bottom-color: var(--vector-text);
}

.vector-page-toolbar-list .mw-list-item.is-selected a,
.vector-page-toolbar-list .mw-list-item.is-selected a span {
    color: var(--vector-text);
    font-weight: 400;
}

.vector-page-toolbar-container .vector-page-tools-dropdown {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    height: 100%;
    margin: 0;
    float: none;
}

.vector-page-toolbar-container .vector-page-tools-dropdown .vector-dropdown-label {
    height: 100%;
    min-height: 0;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0.2rem;
    border-bottom: 2px solid transparent;
    box-sizing: border-box;
    font-size: inherit;
    line-height: inherit;
    font-weight: 400;
    align-items: center;
    align-self: stretch;
}

.vector-page-toolbar-container .vector-page-tools-dropdown .vector-dropdown-label-text {
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
}

.vector-page-toolbar-container .vector-page-tools-dropdown .vector-icon:not(.bi) {
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
    min-height: 1rem;
    mask-size: 1rem 1rem;
    -webkit-mask-size: 1rem 1rem;
    flex: none;
    align-self: center;
}

/* vector-page.css masks .vector-icon with a 1px image, hiding Bootstrap font icons */
.vector-page-toolbar-container .vector-icon.bi,
#vector-page-titlebar-toc-label .vector-icon.bi {
    -webkit-mask-image: none !important;
    mask-image: none !important;
    background: none !important;
    background-color: transparent !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    min-width: 1.25rem;
    min-height: 1.25rem;
    font-size: 1.25rem;
    color: var(--vector-text, currentColor);
    vertical-align: middle;
    flex: none;
    align-self: center;
}

.vector-page-toolbar-container .vector-icon.bi::before {
    display: inline-block;
    line-height: 1;
}

.vector-dropdown-label-text-visible {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
}

.vector-page-tools-dropdown .vector-dropdown-content {
    left: auto;
    right: 0;
    min-width: 10rem;
}

.vector-page-titlebar-toc .vector-pinned-container {
    display: block !important;
    padding: 0;
    background: transparent;
}

.mw-page-container {
    --vector-page-side-left: 0px;
    --vector-page-side-right: 0px;
    background: var(--vector-page-bg);
    min-height: calc(100vh - 8rem);
    padding-bottom: 2rem;
}

.mw-page-container-inner,
.vector-shell-page-inner {
    max-width: var(--vector-page-max-width);
    margin: 0 auto;
    padding-left: var(--vector-page-padding);
    padding-right: var(--vector-page-padding);
    position: relative;
}

.vector-shell-page-toolbar-inner {
    width: 100%;
}

#content.mw-body {
    min-height: 36rem;
    background: transparent;
    padding-top: 0.9rem;
    color: var(--vector-text);
}

#mw-content-text.mw-body-content {
    min-height: 32rem;
    max-width: var(--vector-content-max-width);
}

.mw-parser-output.container {
    max-width: var(--vector-content-max-width);
    min-height: 30rem;
    padding: 0;
    margin: 0;
}

.mw-parser-output p {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    line-height: 1.7;
}

.mw-parser-output .hatnote {
    font-style: italic;
    color: var(--vector-muted);
    margin-bottom: 0.75rem;
}

.mw-parser-output h2 {
    font-family: 'Linux Libertine', Georgia, 'Times New Roman', Times, serif;
    font-weight: 400;
    font-size: 1.5rem;
    line-height: 1.3;
    margin: 1.75rem 0 0.75rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid var(--vector-border);
    max-width: 46rem;
}

#mw-content-text .navbox,
#mw-content-text .navbox-styles + .navbox,
#mw-content-text .navbox-styles + span.mw-empty-elt + .navbox-styles + .navbox {
    box-sizing: border-box;
    border: 1px solid var(--vector-border);
    width: 100%;
    clear: both;
    font-size: 88%;
    text-align: center;
    padding: 1px;
    margin: 1em auto 0;
    background-color: var(--background-color-base, #fdfdfd);
    color: inherit;
}

#mw-content-text .navbox .navbox-inner,
#mw-content-text .navbox .navbox-subgroup {
    width: 100%;
}

#mw-content-text .navbox .navbox-group,
#mw-content-text .navbox .navbox-title,
#mw-content-text .navbox .navbox-abovebelow {
    padding: 0.25em 1em;
    line-height: 1.5em;
    text-align: center;
}

#mw-content-text .navbox .navbox-group {
    white-space: nowrap;
    text-align: right;
}

#mw-content-text .navbox .navbox-list {
    line-height: 1.5em;
    border-color: var(--background-color-base, #fdfdfd);
}

#mw-content-text .navbox .navbox-list-with-group {
    text-align: left;
    border-left-width: 2px;
    border-left-style: solid;
}

#mw-content-text .navbox tr + tr > .navbox-abovebelow,
#mw-content-text .navbox tr + tr > .navbox-group,
#mw-content-text .navbox tr + tr > .navbox-image,
#mw-content-text .navbox tr + tr > .navbox-list {
    border-top: 2px solid var(--background-color-base, #fdfdfd);
}

#mw-content-text .navbox .navbox-title {
    background-color: #ccf;
    color: inherit;
}

#mw-content-text .navbox .navbox-abovebelow,
#mw-content-text .navbox .navbox-group,
#mw-content-text .navbox .navbox-subgroup .navbox-title {
    background-color: #ddf;
    color: inherit;
}

#mw-content-text .navbox .navbox-subgroup .navbox-group,
#mw-content-text .navbox .navbox-subgroup .navbox-abovebelow {
    background-color: #e6e6ff;
    color: inherit;
}

#mw-content-text .navbox .navbox-even {
    background-color: #f7f7f7;
    color: inherit;
}

#mw-content-text .navbox .navbox-odd {
    background-color: transparent;
    color: inherit;
}

#mw-content-text .navbox .hlist dl,
#mw-content-text .navbox .hlist ol,
#mw-content-text .navbox .hlist ul,
#mw-content-text .navbox td.hlist dl,
#mw-content-text .navbox td.hlist ol,
#mw-content-text .navbox td.hlist ul {
    margin: 0;
    padding: 0.125em 0;
    list-style: none;
}

#mw-content-text .navbox .hlist dd,
#mw-content-text .navbox .hlist dt,
#mw-content-text .navbox .hlist li {
    margin: 0;
    display: inline;
}

#mw-content-text .navbox .navbar {
    display: block;
    font-size: 100%;
}

#mw-content-text .navbox .navbar ul,
#mw-content-text .navbox .navbar ol {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0.25em;
    margin: 0;
    padding: 0;
    list-style: none;
}

#mw-content-text .navbox .navbox-title .navbar {
    float: left;
    text-align: left;
    margin-right: 0.5em;
}

@media (min-width: 1120px) {
    html.vector-feature-page-tools-pinned-enabled {
        --vector-pinned-right-width: 14rem;
    }

    .vector-page-toolbar-container,
    .mw-page-container {
        --vector-page-side-left: var(--vector-pinned-left-width, 0px);
        --vector-page-side-right: var(--vector-pinned-right-width, 0px);
        padding-left: var(--vector-page-side-left);
        padding-right: var(--vector-page-side-right);
    }

    html.vector-feature-toc-pinned-clientpref-1 .vector-page-titlebar .vector-page-titlebar-toc {
        display: none;
    }

    html.vector-feature-page-tools-pinned-enabled .vector-page-toolbar .vector-page-tools-landmark {
        display: none;
    }

    html.vector-feature-main-menu-pinned-enabled .mw-page-container-inner {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: 'siteNotice' 'pageContent' 'footer';
    }

    html.vector-feature-main-menu-pinned-enabled .vector-column-start {
        display: none;
    }
}

@media (max-width: 900px) {
    .vector-page-titlebar,
    .vector-page-toolbar {
        flex-direction: column;
        align-items: flex-start;
    }

    .vector-page-toolbar-end {
        justify-content: flex-start;
    }
}

@media (max-width: 640px) {
    .firstHeading {
        font-size: 1.8rem;
    }

    .vector-page-toolbar-list {
        gap: 0.75rem;
    }
}
`;

const OFFLINE_PAGE_TOOLBAR_NOOP_URL = '#';
const VECTOR_PAGE_TOOLS_STORAGE_KEY = 'genipedia-vector-page-tools-pinned-v1';
const FULL_PAGE_TOOLBAR_PINNED_SIDEBAR_MIN_WIDTH = 1120;

function shouldUsePersistentPageToolsSidebar() {
    return window.innerWidth >= FULL_PAGE_TOOLBAR_PINNED_SIDEBAR_MIN_WIDTH;
}

function ensurePageToolbarStyles() {
    if (!document.getElementById(FULL_PAGE_TOOLBAR_STYLE_ELEMENT_ID)) {
        const shellStyles = document.createElement('style');
        shellStyles.id = FULL_PAGE_TOOLBAR_STYLE_ELEMENT_ID;
        shellStyles.textContent = FULL_PAGE_TOOLBAR_STYLES;
        document.head.appendChild(shellStyles);
    }
}

function escapePageToolbarHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readPageToolsPinnedPreference() {
    return shouldUsePersistentPageToolsSidebar();
}

function persistPageToolsPinnedPreference(pinned) {
    return Boolean(pinned);
}

function applyPageToolsPinnedState(pinned) {
    const html = document.documentElement;
    if (!html) {
        return;
    }

    const shouldPin = shouldUsePersistentPageToolsSidebar();

    html.classList.remove(
        'vector-feature-page-tools-pinned-enabled',
        'vector-feature-page-tools-pinned-disabled'
    );
    html.classList.add(
        shouldPin
            ? 'vector-feature-page-tools-pinned-enabled'
            : 'vector-feature-page-tools-pinned-disabled'
    );

    if (document.body) {
        document.body.dataset.vectorPageToolsPinned = shouldPin ? 'true' : 'false';
    }
}

function getCanonicalPageUrl() {
    const canonicalLink = document.querySelector('link[rel="canonical"]');

    try {
        return canonicalLink?.href
            ? new URL(canonicalLink.getAttribute('href') || canonicalLink.href, window.location.href).href
            : window.location.href;
    } catch {
        return window.location.href;
    }
}

function normalizeArticleTitle(pageTitle) {
    const normalizedTitle = String(pageTitle || '').trim();

    if (!normalizedTitle || normalizedTitle.toLowerCase() === 'person') {
        return null;
    }

    return normalizedTitle.replace(/\s+/g, '_');
}

function buildArticleHref(pathname) {
    return new URL(pathname, 'https://genipedia.org/').href;
}

function buildOtherProjectHref(hostname, pathname) {
    return new URL(pathname, `https://${hostname}/`).href;
}

function buildPageToolLinks(pageTitle) {
    const articleUrl = getCanonicalPageUrl();
    const articleTitle = normalizeArticleTitle(pageTitle);

    if (!articleTitle) {
        return {
            articleUrl,
            viewSource: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            viewHistory: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            whatLinksHere: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            relatedChanges: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            uploadFile: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            permanentLink: articleUrl,
            pageInformation: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            citePage: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            shortUrl: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            editInterlanguageLinks: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            downloadPdf: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            printableVersion: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            commons: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            wikinews: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            wikiquote: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            wikisource: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
            wikidataItem: OFFLINE_PAGE_TOOLBAR_NOOP_URL
        };
    }

    const encodedTitle = encodeURIComponent(articleTitle);
    const encodedArticleUrl = encodeURIComponent(buildArticleHref(`/wiki/${articleTitle}`));
    const wikidataSearchUrl = new URL('https://www.wikidata.org/w/index.php');
    wikidataSearchUrl.searchParams.set('search', articleTitle.replace(/_/g, ' '));

    return {
        articleUrl,
        viewSource: buildArticleHref(`/w/index.php?title=${encodedTitle}&action=edit`),
        viewHistory: buildArticleHref(`/w/index.php?title=${encodedTitle}&action=history`),
        whatLinksHere: buildArticleHref(`/wiki/Special:WhatLinksHere/${encodedTitle}`),
        relatedChanges: buildArticleHref(`/wiki/Special:RecentChangesLinked/${encodedTitle}`),
        uploadFile: OFFLINE_PAGE_TOOLBAR_NOOP_URL,
        permanentLink: buildArticleHref(`/wiki/${articleTitle}`),
        pageInformation: buildArticleHref(`/w/index.php?title=${encodedTitle}&action=info`),
        citePage: buildArticleHref(`/w/index.php?title=Special:CiteThisPage&page=${encodedTitle}`),
        shortUrl: buildArticleHref(`/w/index.php?title=Special:UrlShortener&url=${encodedArticleUrl}`),
        editInterlanguageLinks: wikidataSearchUrl.href,
        downloadPdf: buildArticleHref(`/w/index.php?title=Special:DownloadAsPdf&page=${encodedTitle}&action=show-download-screen`),
        printableVersion: buildArticleHref(`/w/index.php?title=${encodedTitle}&printable=yes`),
        commons: buildOtherProjectHref('gravepedia.org', `/wiki/${articleTitle}`),
        wikinews: buildOtherProjectHref('geni.com', `/`),
        wikiquote: buildOtherProjectHref('en.wikiquote.org', `/wiki/${articleTitle}`),
        wikisource: buildOtherProjectHref('en.wikisource.org', `/wiki/Author:${articleTitle}`),
        wikidataItem: wikidataSearchUrl.href
    };
}

function buildPageToolsMarkup(pageTitle) {
    const pageToolLinks = buildPageToolLinks(pageTitle);

    return `
<div id="vector-page-tools" class="vector-page-tools vector-pinnable-element">
    <div class="vector-pinnable-header vector-page-tools-pinnable-header vector-pinnable-header-unpinned">
        <div class="vector-pinnable-header-label">Tools</div>
        <div class="vector-pinnable-header-actions">
            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-vector-action="pin-page-tools">move to sidebar</button>
            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-vector-action="hide-page-tools">hide</button>
        </div>
    </div>

    <div id="p-cactions" class="vector-menu mw-portlet mw-portlet-cactions emptyPortlet vector-has-collapsible-items">
        <div class="vector-menu-heading">Actions</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li id="ca-more-view" class="selected vector-more-collapsible-item mw-list-item"><a href="${pageToolLinks.articleUrl}"><span>Read</span></a></li>
                <li id="ca-more-viewsource" class="vector-more-collapsible-item mw-list-item"><a href="${pageToolLinks.viewSource}"><span>View source</span></a></li>
                <li id="ca-more-history" class="vector-more-collapsible-item mw-list-item"><a href="${pageToolLinks.viewHistory}"><span>View history</span></a></li>
            </ul>
        </div>
    </div>

    <div id="p-tb" class="vector-menu mw-portlet mw-portlet-tb">
        <div class="vector-menu-heading">General</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li id="t-whatlinkshere" class="mw-list-item"><a href="${pageToolLinks.whatLinksHere}"><span>What links here</span></a></li>
                
                <li id="t-info" class="mw-list-item"><a href="${pageToolLinks.pageInformation}"><span>Page information</span></a></li>
                <li id="t-urlshortener" class="mw-list-item"><a href="${pageToolLinks.shortUrl}"><span>Get shortened URL</span></a></li>
                
            </ul>
        </div>
    </div>

    <div id="p-coll-print_export" class="vector-menu mw-portlet mw-portlet-coll-print_export">
        <div class="vector-menu-heading">Print/export</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li id="coll-download-as-rl" class="mw-list-item"><a href="${pageToolLinks.downloadPdf}"><span>Download as PDF</span></a></li>
            </ul>
        </div>
    </div>

    <div id="p-wikibase-otherprojects" class="vector-menu mw-portlet mw-portlet-wikibase-otherprojects">
        <div class="vector-menu-heading">In other projects</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li class="wb-otherproject-link wb-otherproject-commons mw-list-item"><a href="${pageToolLinks.commons}"><span>Gravepedia</span></a></li>
                <li class="wb-otherproject-link wb-otherproject-geni mw-list-item"><a href="${pageToolLinks.wikinews}"><span>Geni.com</span></a></li>
            </ul>
        </div>
    </div>
</div>`;
}

class FullPageToolbar extends HTMLElement {
    connectedCallback() {
        if (this.__rendered) return;
        this.__rendered = true;

        ensurePageToolbarStyles();
        this.state = {
            pageToolsPinned: readPageToolsPinnedPreference()
        };
        applyPageToolsPinnedState(this.state.pageToolsPinned);
        this.render();
        this.installPageToolsSidebarTarget();
        this.cacheElements();
        this.bindEvents();
        this.movePageToolsPanel();
    }

    render() {
        const rawPageTitle = this.getAttribute('page-title') || 'Person';
        const pageTitle = escapePageToolbarHtml(rawPageTitle);
        const pageToolsMarkup = buildPageToolsMarkup(rawPageTitle);

        this.innerHTML = `
<div class="vector-page-toolbar-container">
    <div class="vector-shell-page-inner vector-shell-page-toolbar-inner">
        <div class="vector-page-titlebar">
            <div class="vector-page-titlebar-start">
                <div id="vector-page-titlebar-toc" class="vector-dropdown vector-page-titlebar-toc vector-button-flush-left" title="Table of Contents">
                    <input type="checkbox" id="vector-page-titlebar-toc-checkbox" role="button" aria-haspopup="true" data-event-name="ui.dropdown-vector-page-titlebar-toc" class="vector-dropdown-checkbox" aria-label="Toggle the table of contents">
                    <label id="vector-page-titlebar-toc-label" for="vector-page-titlebar-toc-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" aria-hidden="true">
                        <i class="vector-icon bi bi-list-ul" aria-hidden="true"></i>
                        <span class="vector-dropdown-label-text">Toggle the table of contents</span>
                    </label>
                    <div class="vector-dropdown-content">
                        <div id="vector-page-titlebar-toc-unpinned-container" class="vector-unpinned-container"></div>
                    </div>
                </div>
                <h1 id="firstHeading" class="firstHeading mw-first-heading">${pageTitle}</h1>
            </div>
            <div class="vector-page-titlebar-end"></div>
        </div>
        <div class="vector-page-toolbar">
            <nav class="vector-page-toolbar-start" aria-label="Namespaces">
                <ul class="vector-menu-content-list vector-page-toolbar-list">
                    <li class="mw-list-item is-selected"><a href="#content"><span>Article</span></a></li>
                    <li class="mw-list-item"><a href="#content"><span>Talk</span></a></li>
                </ul>
            </nav>
            <div class="vector-page-toolbar-end">
                <nav aria-label="Views">
                    <ul class="vector-menu-content-list vector-page-toolbar-list vector-page-toolbar-list-end">
                        <li class="mw-list-item is-selected"><a href="#content"><span>Read</span></a></li>
                        <li class="mw-list-item"><a href="#content"><span>View source</span></a></li>
                        <li class="mw-list-item"><a href="#content"><span>View history</span></a></li>
                    </ul>
                </nav>
                <nav class="vector-page-tools-landmark" aria-label="Page tools">
                    <div id="vector-page-tools-dropdown" class="vector-dropdown vector-page-tools-dropdown" title="Tools">
                        <input type="checkbox" id="vector-page-tools-dropdown-checkbox" role="button" aria-haspopup="true" class="vector-dropdown-checkbox" aria-label="Tools">
                        <label id="vector-page-tools-dropdown-label" for="vector-page-tools-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet" aria-hidden="true">
                            <span class="vector-dropdown-label-text vector-dropdown-label-text-visible">Tools</span>
                        </label>
                        <div class="vector-dropdown-content">
                            <div id="vector-page-tools-unpinned-container" class="vector-unpinned-container">${pageToolsMarkup}</div>
                        </div>
                    </div>
                </nav>
            </div>
        </div>
    </div>
</div>`;
    }

    installPageToolsSidebarTarget() {
        let shell = document.querySelector('aside[data-genipedia-appearance-sidebar="true"]');

        if (!shell) {
            shell = document.createElement('aside');
            shell.className = 'vector-appearance-sidebar-shell';
            shell.setAttribute('aria-label', 'Right sidebar');
            shell.dataset.genipediaAppearanceSidebar = 'true';
            document.body.appendChild(shell);
        }

        let appearancePinnedContainer = shell.querySelector('#vector-appearance-pinned-container');
        if (!appearancePinnedContainer) {
            appearancePinnedContainer = document.createElement('div');
            appearancePinnedContainer.id = 'vector-appearance-pinned-container';
            appearancePinnedContainer.className = 'vector-appearance-pinned-container';
            shell.appendChild(appearancePinnedContainer);
        }

        let pageToolsPinnedContainer = shell.querySelector('#vector-page-tools-pinned-container');
        if (!pageToolsPinnedContainer) {
            pageToolsPinnedContainer = document.createElement('div');
            pageToolsPinnedContainer.id = 'vector-page-tools-pinned-container';
            pageToolsPinnedContainer.className = 'vector-page-tools-pinned-container';
            shell.appendChild(pageToolsPinnedContainer);
        } else if (appearancePinnedContainer.nextElementSibling !== pageToolsPinnedContainer) {
            appearancePinnedContainer.insertAdjacentElement('afterend', pageToolsPinnedContainer);
        }

        this.pageToolsSidebarHost = shell;
        this.pinnedPageToolsContainer = pageToolsPinnedContainer;
    }

    cacheElements() {
        this.dropdownCheckboxes = [...this.querySelectorAll('.vector-dropdown-checkbox')];
        this.pageToolsDropdownCheckbox = this.querySelector('#vector-page-tools-dropdown-checkbox');
        this.pageToolsPanel = this.querySelector('#vector-page-tools');
        this.unpinnedPageToolsContainer = this.querySelector('#vector-page-tools-unpinned-container');
    }

    bindEvents() {
        this.handleDocumentClick = (event) => {
            if (!this.contains(event.target)) {
                this.closeAllDropdowns();
            }
        };

        document.addEventListener('click', this.handleDocumentClick);

        this.handleActionClick = (event) => {
            const actionButton = event.target.closest('[data-vector-action]');
            if (!actionButton) {
                return;
            }

            const isInsideToolbar = this.contains(actionButton);
            const isInsidePageTools = this.pageToolsPanel?.contains(actionButton)
                || this.pageToolsSidebarHost?.contains(actionButton);

            if (!isInsideToolbar && !isInsidePageTools) {
                return;
            }

            const action = actionButton.getAttribute('data-vector-action');
            if (action === 'pin-page-tools') {
                event.preventDefault();
                this.state.pageToolsPinned = true;
            } else if (action === 'hide-page-tools') {
                event.preventDefault();
                this.state.pageToolsPinned = false;
            } else {
                return;
            }

            this.commitState();
            this.closeAllDropdowns();
        };

        document.addEventListener('click', this.handleActionClick);

        this.handleResize = () => {
            applyPageToolsPinnedState(this.state.pageToolsPinned);
            this.movePageToolsPanel();
        };

        window.addEventListener('resize', this.handleResize);
    }

    closeAllDropdowns() {
        this.dropdownCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
    }

    syncPinnableHeader(panel, pinned) {
        const header = panel?.querySelector('.vector-pinnable-header');
        if (!header) {
            return;
        }

        header.classList.toggle('vector-pinnable-header-pinned', pinned);
        header.classList.toggle('vector-pinnable-header-unpinned', !pinned);
    }

    movePageToolsPanel() {
        if (!this.pageToolsPanel) {
            return;
        }

        const shouldPinToSidebar = shouldUsePersistentPageToolsSidebar();
        const nextParent = shouldPinToSidebar
            ? this.pinnedPageToolsContainer
            : this.unpinnedPageToolsContainer;

        if (nextParent && this.pageToolsPanel.parentElement !== nextParent) {
            nextParent.appendChild(this.pageToolsPanel);
        }

        this.pageToolsPanel.classList.toggle('vector-page-tools--pinned', shouldPinToSidebar);
        this.pageToolsPanel.classList.toggle('vector-page-tools--dropdown', !shouldPinToSidebar);
        this.syncPinnableHeader(this.pageToolsPanel, shouldPinToSidebar);

        if (this.pageToolsDropdownCheckbox) {
            if (shouldPinToSidebar) {
                this.pageToolsDropdownCheckbox.checked = false;
            }
            this.pageToolsDropdownCheckbox.disabled = shouldPinToSidebar;
        }
    }

    commitState() {
        persistPageToolsPinnedPreference(this.state.pageToolsPinned);
        applyPageToolsPinnedState(this.state.pageToolsPinned);
        this.movePageToolsPanel();
    }

    disconnectedCallback() {
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }

        if (this.handleActionClick) {
            document.removeEventListener('click', this.handleActionClick);
        }

        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
    }
}

if (!customElements.get('full-page-toolbar')) {
    customElements.define('full-page-toolbar', FullPageToolbar);
}