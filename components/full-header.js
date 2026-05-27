const FULL_HEADER_BASE_URL = new URL('.', document.currentScript.src);
const FULL_HEADER_ASSET_ROOT = new URL('../assets/', FULL_HEADER_BASE_URL);
const FULL_HEADER_STYLE_ELEMENT_ID = 'genipedia-full-header-styles';

const FULL_HEADER_STYLES = String.raw`
.vector-main-menu-landmark,
.vector-appearance-landmark {
    display: block !important;
}

nav#mw-panel-toc a.vector-toc-link[href="#mw-content-text"],
nav#mw-panel-toc li#toc-mw-content-text {
    display: none;
}

html.skin-theme-clientpref-day,
html.skin-theme-clientpref-os {
    --vector-page-bg: #f8f9fa;
    --vector-surface: #ffffff;
    --vector-surface-subtle: #eaecf0;
    --vector-border: #c8ccd1;
    --vector-border-strong: #a2a9b1;
    --vector-text: #202122;
    --vector-muted: #54595d;
    --vector-link: #3366cc;
    --vector-accent: #3366cc;
    --vector-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.2);
    --vector-hover: rgba(0, 0, 0, 0.05);
    --vector-page-max-width: 99.75rem;
    --vector-page-padding: 2.75rem;
    --vector-content-max-width: 99.75rem;
}

html.skin-theme-clientpref-night {
    --vector-page-bg: #101418;
    --vector-surface: #16191d;
    --vector-surface-subtle: #202122;
    --vector-border: #3a3f44;
    --vector-border-strong: #54595d;
    --vector-text: #eaecf0;
    --vector-muted: #a2a9b1;
    --vector-link: #88b3e6;
    --vector-accent: #4d8eff;
    --vector-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.45);
    --vector-hover: rgba(255, 255, 255, 0.08);
    --vector-page-max-width: 99.75rem;
    --vector-page-padding: 2.75rem;
    --vector-content-max-width: 99.75rem;
}

@media (prefers-color-scheme: dark) {
    html.skin-theme-clientpref-os {
        --vector-page-bg: #101418;
        --vector-surface: #16191d;
        --vector-surface-subtle: #202122;
        --vector-border: #3a3f44;
        --vector-border-strong: #54595d;
        --vector-text: #eaecf0;
        --vector-muted: #a2a9b1;
        --vector-link: #88b3e6;
        --vector-accent: #4d8eff;
        --vector-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.45);
        --vector-hover: rgba(255, 255, 255, 0.08);
    }
}

html.vector-width-wide {
    --vector-page-max-width: min(100%, 120rem);
    --vector-content-max-width: min(100%, 120rem);
}

html.vector-width-standard {
    --vector-page-max-width: 99.75rem;
    --vector-content-max-width: 99.75rem;
}

html.vector-font-size-0 body.skin-vector-2022 {
    font-size: 0.875rem;
}

html.vector-font-size-1 body.skin-vector-2022 {
    font-size: 1rem;
}

html.vector-font-size-2 body.skin-vector-2022 {
    font-size: 1.125rem;
}

html {
    --vector-pinned-left-width: 0px;
    --vector-pinned-right-width: 0px;
}

body.skin-vector-2022 {
    margin: 0;
    background: var(--vector-page-bg);
    color: var(--vector-text);
    font-family: sans-serif;
    line-height: 1.6;
}

body.skin-vector-2022 a {
    color: var(--vector-link);
    text-decoration: none;
}

body.skin-vector-2022 a:hover {
    text-decoration: underline;
}

full-header,
.vector-shell {
    display: contents;
}

.vector-shell * {
    box-sizing: border-box;
}

.vector-header-container {
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--vector-surface);
    border-bottom: 1px solid var(--vector-border);
    transition: top 160ms ease;
}

.vector-header-container.vector-header-container-hidden {
    top: calc(-1 * (var(--vector-header-height, 4.2rem) + 1px));
    pointer-events: none;
}

.vector-header {
    width: 100%;
    max-width: var(--vector-page-max-width);
    margin: 0 auto;
    min-height: 3.125rem;
    min-width: 18.75em;
    padding: 0.5rem var(--vector-page-padding);
    display: grid;
    column-gap: 1.5rem;
    row-gap: 1rem;
    grid-template: auto / max-content minmax(0, 1fr);
    grid-template-areas: 'headerStart headerEnd';
    align-items: center;
    box-sizing: border-box;
}

.vector-header-start,
.vector-header-end,
.vector-user-links-main,
.vector-inline-links,
.vector-header .mw-logo,
.vector-search-box,
.cdx-search-input,
.cdx-text-input,
.vector-pinnable-header-actions,
.vector-pinnable-header,
.vector-user-menu .vector-menu-content-list a {
    display: flex;
    align-items: center;
}

.vector-header-start {
    grid-area: headerStart;
    gap: 1.25rem;
    min-width: 0;
}

.vector-header-end {
    grid-area: headerEnd;
    gap: 0.75rem;
    justify-content: flex-end;
    min-width: 0;
}

@media (min-width: 1120px) {
    .vector-header-end {
        display: grid;
        grid-template-columns: minmax(18rem, 31.25rem) auto;
        align-items: center;
        justify-content: start;
        column-gap: 0.5rem;
    }
}

.vector-main-menu-landmark,
.vector-user-links,
.vector-appearance-landmark {
    position: relative;
}

.vector-user-links {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 1;
}

.vector-user-links .mw-list-item,
.vector-user-links .vector-dropdown-label {
    margin: 0 0.25rem;
}

.vector-user-links .vector-dropdown-content .mw-list-item {
    margin: 0;
}

.mw-logo {
    height: 100%;
    gap: 0;
    color: inherit;
    flex-shrink: 0;
}

.mw-logo-icon {
    margin-right: 0.625rem;
    width: 3.125rem;
    height: 3.125rem;
    display: block;
    flex: none;
}

.vector-header-mini-logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 6px 0 6px 25px;
    flex-shrink: 0;
    position: static;
    width: auto;
    max-width: 100%;
    min-width: 0;
    font-size: 1.3rem;
    line-height: 1.25;
    text-align: left;
    font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
    font-weight: 400;
    color: inherit;
}

.vector-header-mini-logo .central-textlogo__logo {
    display: block;
    width: auto;
    height: 3rem;
    flex-shrink: 0;
}

.vector-header-mini-logo .central-textlogo-wrapper {
    display: inline-block;
    font-size: 1em;
    font-weight: 400;
    vertical-align: middle;
    margin: -3px 0 0 0;
    min-width: 0;
}

.vector-header-mini-logo .central-textlogo__wordmark {
    display: block;
    font-family: inherit;
    font-size: 1em;
    font-weight: 400;
    line-height: 1.1;
}

.vector-header-mini-logo .central-textlogo__wordmark-accent {
    display: inline-block;
    font-size: 1.42em;
    line-height: 0.84;
    vertical-align: baseline;
}

.vector-header-mini-logo .central-textlogo__home-link {
    color: inherit;
    text-decoration: none;
}

.vector-header-mini-logo .central-textlogo__home-link:hover,
.vector-header-mini-logo .central-textlogo__home-link:focus {
    text-decoration: none;
}

.vector-header-mini-logo .localized-slogan {
    display: block;
    font-size: 0.85rem;
    font-weight: 400;
    margin-top: 0.05em;
    font-family: inherit;
}

.mw-logo-container {
    display: grid;
    gap: 0.2rem;
    max-width: none;
}

.skin-invert img {
    filter: invert(1) hue-rotate(180deg);
}

.mw-logo-wordmark {
    display: block;
    width: 8.75em;
    height: 1.375em;
}

.mw-logo-tagline {
    display: block;
    width: 8.75em;
    height: 0.6875em;
}

.vector-search-box {
    font-size: 0.875rem;
    flex-grow: 1;
    min-width: 0;
    justify-content: flex-end;
}

.vector-typeahead-search-container,
.cdx-typeahead-search,
.cdx-search-input,
.cdx-search-input__input-wrapper {
    width: 100%;
}

.vector-search-box .vector-typeahead-search-container {
    width: 100%;
    max-width: 31.25rem;
    margin-right: 0.75rem;
}

.cdx-text-input {
    position: relative;
    width: 100%;
    background: var(--vector-page-bg);
    border: 1px solid var(--vector-border-strong);
    border-radius: 2px 0 0 2px;
    min-height: 2rem;
}

.cdx-text-input__input {
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--vector-text);
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    font: inherit;
    outline: 0;
}

.cdx-text-input__input::placeholder {
    color: var(--vector-muted);
}

.cdx-text-input__icon {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
}

.cdx-search-input__end-button {
    min-height: 2rem;
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--vector-border-strong);
    border-left: 0;
    border-radius: 0 2px 2px 0;
    background: var(--vector-surface);
    color: var(--vector-text);
    font: inherit;
    cursor: pointer;
}

.cdx-search-input__end-button:hover,
.vector-dropdown-label:hover,
.vector-pinnable-header-toggle-button:hover,
.vector-user-menu .vector-menu-content-list a:hover,
.vector-inline-links a:hover {
    background: var(--vector-hover);
    text-decoration: none;
}

.search-toggle,
.vector-dropdown-checkbox {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
}

.vector-header .search-toggle {
    position: static;
    opacity: 1;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    float: none;
    flex: none;
}

.vector-header .vector-typeahead-search-container {
    display: none;
}

.vector-dropdown {
    position: relative;
}

.vector-dropdown-label,
.cdx-button--fake-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2rem;
    padding: 0.35rem 0.5rem;
    border-radius: 2px;
    color: var(--vector-text);
    cursor: pointer;
    gap: 0.4rem;
    background: transparent;
    border: 0;
    font: inherit;
}

.vector-dropdown .vector-dropdown-label-text {
    font-size: 0.875rem;
}

.cdx-button--icon-only .vector-dropdown-label-text,
.search-toggle span:last-child {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.vector-icon {
    width: 1.25rem;
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
    flex: none;
}

/* vector-page.css masks .vector-icon with a 1px image, hiding Bootstrap font icons */
.vector-header .vector-icon.bi {
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
}

.vector-header .vector-icon.bi::before {
    display: inline-block;
    line-height: 1;
}

.vector-dropdown .vector-dropdown-content {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: -1px;
    opacity: 0;
    height: 0;
    visibility: hidden;
    overflow: hidden auto;
    z-index: 50;
    background-color: var(--vector-surface);
    padding: 1rem;
    font-size: 0.875rem;
    box-shadow: var(--vector-shadow);
    transition: opacity 100ms ease;
    width: max-content;
    max-width: 17rem;
    max-height: 75vh;
    border: 1px solid var(--vector-border);
    border-radius: 2px;
}

.vector-dropdown .vector-dropdown-checkbox:checked ~ .vector-dropdown-content {
    opacity: 1;
    visibility: visible;
    height: auto;
}

#vector-appearance-dropdown .vector-dropdown-content,
#vector-user-links-dropdown .vector-dropdown-content {
    left: auto;
    right: 0;
}

#vector-appearance-dropdown .vector-dropdown-content {
    width: 12.1rem;
    max-width: 12.5rem;
}

.vector-main-menu-dropdown .vector-dropdown-content {
    min-width: 15rem;
}

.vector-menu-heading,
.vector-pinnable-header-label {
    font-weight: 600;
    color: var(--vector-text);
}

.vector-menu-content-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.vector-menu-content-list .mw-list-item + .mw-list-item,
.vector-inline-links .mw-list-item + .mw-list-item {
    margin-top: 0.5rem;
}

.vector-main-menu .vector-menu + .vector-menu,
.vector-appearance .vector-menu + .vector-menu {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--vector-border);
}

.vector-main-menu .mw-list-item a,
.vector-user-menu .mw-list-item a,
.vector-inline-links a {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.1rem 0;
    color: var(--vector-text);
    border-radius: 2px;
}

.vector-inline-links {
    gap: 1rem;
    flex-wrap: wrap;
    margin: 0;
    font-size: 0.875rem;
}

.vector-user-links-main .vector-menu-content {
    display: flex;
}

.vector-user-links-main .vector-menu-content-list {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
}

.vector-inline-links .mw-list-item + .mw-list-item {
    margin-top: 0;
}

.vector-pinnable-header {
    justify-content: space-between;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--vector-border);
}

.vector-pinnable-header-actions {
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.vector-pinnable-header-toggle-button {
    border: 1px solid var(--vector-border);
    background: transparent;
    color: var(--vector-text);
    padding: 0.2rem 0.45rem;
    border-radius: 2px;
    font-size: 0.75rem;
    cursor: pointer;
}

.vector-main-menu .vector-pinnable-header-unpinned .vector-pinnable-header-pin-button,
.vector-main-menu .vector-pinnable-header-pinned .vector-pinnable-header-unpin-button,
.vector-appearance .vector-pinnable-header-unpinned .vector-pinnable-header-pin-button,
.vector-appearance .vector-pinnable-header-pinned .vector-pinnable-header-unpin-button {
    display: inline-flex;
}

.vector-main-menu .vector-pinnable-header-pinned .vector-pinnable-header-pin-button,
.vector-main-menu .vector-pinnable-header-unpinned .vector-pinnable-header-unpin-button,
.vector-appearance .vector-pinnable-header-pinned .vector-pinnable-header-pin-button,
.vector-appearance .vector-pinnable-header-unpinned .vector-pinnable-header-unpin-button {
    display: none;
}

.cdx-radio {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 0.6rem;
    margin: 0.7rem 0;
    position: relative;
}

.cdx-radio__input {
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    width: calc(1.1rem + 0.6rem);
    height: 1.1rem;
    margin: 0;
    pointer-events: auto;
    cursor: pointer;
}

.cdx-radio__icon {
    width: 1.1rem;
    height: 1.1rem;
    border: 1px solid var(--vector-border-strong);
    border-radius: 50%;
    position: relative;
    background: transparent;
}

.cdx-radio__input:checked + .cdx-radio__icon {
    border-color: var(--vector-accent);
    box-shadow: inset 0 0 0 0.2rem var(--vector-surface), inset 0 0 0 0.45rem var(--vector-accent);
}

.cdx-radio__label,
.cdx-label__label__text {
    color: var(--vector-text);
    cursor: pointer;
}

.vector-appearance .cdx-radio:not(.cdx-radio--inline) {
    display: grid !important;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 0.6rem;
    margin: 0.7rem 0;
    position: relative;
}

.vector-appearance .cdx-radio__label,
.vector-appearance .cdx-radio__label.cdx-label {
    display: inline-flex;
}

.skin-client-pref-exclusion-notice {
    display: block;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--vector-muted);
    line-height: 1.45;
}

.vector-main-menu-sidebar-shell {
    position: fixed;
    top: var(--vector-sidebar-top, var(--vector-header-height, 4.2rem));
    bottom: var(--vector-sidebar-bottom, 0px);
    left: 0;
    width: 13rem;
    z-index: 2;
    background: var(--vector-surface);
    border-right: 1px solid var(--vector-border);
    overflow-y: auto;
    padding: 1rem;
    pointer-events: auto;
    display: none;
    box-sizing: border-box;
}

.vector-main-menu-pinned-container {
    width: 100%;
    pointer-events: auto;
}

html.vector-feature-main-menu-pinned-enabled .vector-header-start .vector-main-menu-landmark {
    display: none;
}

.vector-main-menu--pinned {
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
}

.vector-main-menu--pinned .vector-pinnable-header {
    padding-bottom: 0.375rem;
    margin-bottom: 0.375rem;
}

.vector-main-menu--pinned .vector-pinnable-header-actions {
    display: none;
}

.vector-main-menu--pinned .vector-menu + .vector-menu {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
}

.vector-main-menu--pinned .mw-list-item a {
    gap: 0;
    padding: 0.375rem 0;
    line-height: normal;
}

.vector-main-menu--pinned .vector-menu-content-list .mw-list-item + .mw-list-item {
    margin-top: 0;
}

.vector-main-menu--pinned #p-navigation .vector-menu-heading {
    display: none;
}

.vector-appearance-sidebar-shell {
    position: fixed;
    top: var(--vector-sidebar-top, var(--vector-header-height, 4.2rem));
    bottom: var(--vector-sidebar-bottom, 0px);
    right: 0;
    width: 14rem;
    z-index: 2;
    background: var(--vector-surface);
    border-left: 1px solid var(--vector-border);
    overflow-y: auto;
    padding: 1rem;
    pointer-events: auto;
    display: none;
    box-sizing: border-box;
}

.vector-appearance-pinned-container {
    width: 100%;
    pointer-events: auto;
}

.vector-appearance-sidebar-shell .vector-appearance--pinned .vector-pinnable-header-actions {
    display: none;
}

html.vector-feature-appearance-pinned-clientpref-1 .vector-user-links .vector-appearance-landmark {
    display: none;
}

@media (min-width: 1120px) {
    html.vector-feature-main-menu-pinned-enabled .vector-main-menu-sidebar-shell {
        display: block;
    }

    html.vector-feature-main-menu-pinned-enabled {
        --vector-pinned-left-width: 13rem;
    }

    html.vector-feature-appearance-pinned-clientpref-1 .vector-appearance-sidebar-shell,
    html.vector-feature-page-tools-pinned-enabled .vector-appearance-sidebar-shell {
        display: block;
    }

    html.vector-feature-appearance-pinned-clientpref-1 {
        --vector-pinned-right-width: 14rem;
    }
}

@media (max-width: calc(1120px - 1px)) {
    html.vector-feature-appearance-pinned-clientpref-1 .vector-user-links .vector-appearance-landmark {
        display: block;
    }

    html.vector-feature-main-menu-pinned-enabled .vector-header-start .vector-main-menu-landmark {
        display: block;
    }

    .vector-main-menu-sidebar-shell,
    .vector-appearance-sidebar-shell {
        display: none !important;
    }

    .vector-header .vector-header-end {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        margin-left: auto;
    }

    .vector-header .vector-search-box {
        flex-grow: 0 !important;
        flex-shrink: 0;
        width: auto;
        max-width: none;
        margin-left: 0;
    }
}

@media (max-width: 900px) {
    html.skin-theme-clientpref-day,
    html.skin-theme-clientpref-night,
    html.skin-theme-clientpref-os {
        --vector-page-padding: 1.5rem;
    }

    .vector-header {
        display: grid;
        grid-template-columns: max-content 1fr;
        grid-template-areas: 'headerStart headerEnd';
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
    }

    .vector-header-start {
        min-width: 0;
    }

    .vector-header-end {
        width: 100%;
        max-width: none;
        justify-content: end;
    }

    .vector-header .vector-search-box {
        width: auto;
        max-width: none;
        flex-grow: 0 !important;
        margin-left: 0;
    }

    #p-vector-user-menu-overflow {
        display: none;
    }
}

@media (min-width: 1120px) {
    .vector-header .search-toggle {
        display: none !important;
    }

    .vector-header .vector-typeahead-search-container {
        display: block;
    }

    .vector-search-box .vector-typeahead-search-container {
        margin-right: 0;
    }
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-list-item,
.vector-main-menu-toc-container .vector-toc-list-item {
    position: relative;
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-entry,
.vector-main-menu-toc-container .vector-toc-entry {
    position: relative;
    padding-left: 1.75rem;
    display: flex;
    align-items: center;
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-link,
.vector-main-menu-toc-container .vector-toc-link {
    display: block;
    padding: 0.15rem 0;
    flex: 1 1 auto;
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-toggle,
.vector-main-menu-toc-container .vector-toc-toggle {
    position: absolute;
    left: 0.35rem;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
}

.client-js body.ltr .vector-dropdown-content nav#mw-panel-toc .vector-toc-toggle,
.client-js body.ltr .vector-main-menu-toc-container .vector-toc-toggle {
    transform: translateY(-50%) rotate(-90deg);
}

.client-js .vector-dropdown-content nav#mw-panel-toc .vector-toc-list-item.vector-toc-list-item-expanded .vector-toc-entry > .vector-toc-toggle,
.client-js .vector-main-menu-toc-container .vector-toc-list-item.vector-toc-list-item-expanded .vector-toc-entry > .vector-toc-toggle {
    transform: translateY(-50%) rotate(0deg);
}

.client-js body.rtl .vector-dropdown-content nav#mw-panel-toc .vector-toc-toggle,
.client-js body.rtl .vector-main-menu-toc-container .vector-toc-toggle {
    transform: translateY(-50%) rotate(90deg);
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-text,
.vector-main-menu-toc-container .vector-toc-text {
    padding: 2px 0;
    line-height: 1.25;
}

.vector-dropdown-content nav#mw-panel-toc .vector-toc-list-item,
.vector-main-menu-toc-container .vector-toc-list-item {
    margin: 0 0 0.2rem 0;
}

@media (max-width: 640px) {
    html.skin-theme-clientpref-day,
    html.skin-theme-clientpref-night,
    html.skin-theme-clientpref-os {
        --vector-page-padding: 1rem;
    }

    .vector-header-start {
        width: 100%;
        justify-content: space-between;
    }

    .mw-logo-icon {
        display: block;
    }

    .mw-logo-wordmark,
    .mw-logo-tagline {
        width: 7.5em;
    }

    #vector-user-links-dropdown {
        display: none;
    }
}
`;

function ensureFullHeaderStyles() {
    if (document.getElementById(FULL_HEADER_STYLE_ELEMENT_ID)) {
        return;
    }

    const shellStyles = document.createElement('style');
    shellStyles.id = FULL_HEADER_STYLE_ELEMENT_ID;
    shellStyles.textContent = FULL_HEADER_STYLES;
    document.head.appendChild(shellStyles);
}

const VECTOR_STORAGE_KEYS = {
    theme: 'genipedia-vector-theme',
    width: 'genipedia-vector-width',
    fontSize: 'genipedia-vector-font-size',
    headerMode: 'genipedia-vector-header-mode',
    mainMenuPinned: 'genipedia-vector-main-menu-pinned-v1',
    appearancePinned: 'genipedia-vector-appearance-pinned-v2'
};

function getHeaderAssetUrl(fileName) {
    return new URL(fileName, FULL_HEADER_ASSET_ROOT).href;
}

const OFFLINE_SHELL_HOME_URL = new URL('../index.html', FULL_HEADER_BASE_URL).href;
const OFFLINE_SHELL_NOOP_URL = '#';
const GENIPEDIA_LOGO_URL = new URL('../assets/Logo.png', FULL_HEADER_BASE_URL).href;
const VECTOR_PINNED_SIDEBAR_MIN_WIDTH = 1120;

function shouldUsePersistentVectorSidebars() {
    return window.innerWidth >= VECTOR_PINNED_SIDEBAR_MIN_WIDTH;
}

function ensureLocalVectorShell() {
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
        html.classList.remove('client-nojs');
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

    ensureFullHeaderStyles();

    applyVectorAppearanceState(readVectorAppearanceState());
}

function readVectorAppearanceState() {
    return {
        theme: readVectorPreference(VECTOR_STORAGE_KEYS.theme, 'night', ['os', 'day', 'night']),
        width: 'wide',
        fontSize: readVectorPreference(VECTOR_STORAGE_KEYS.fontSize, '1', ['0', '1', '2']),
        headerMode: readVectorPreference(VECTOR_STORAGE_KEYS.headerMode, 'sticky', ['sticky', 'auto-hide']),
        mainMenuPinned: shouldUsePersistentVectorSidebars(),
        appearancePinned: shouldUsePersistentVectorSidebars()
    };
}

function readVectorPreference(key, fallback, allowedValues) {
    try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue && allowedValues.includes(storedValue)) {
            return storedValue;
        }
    } catch {
        return fallback;
    }

    return fallback;
}

function persistVectorAppearanceState(state) {
    state.width = 'wide';
    try {
        window.localStorage.setItem(VECTOR_STORAGE_KEYS.theme, state.theme);
        window.localStorage.setItem(VECTOR_STORAGE_KEYS.width, 'wide');
        window.localStorage.setItem(VECTOR_STORAGE_KEYS.fontSize, state.fontSize);
        window.localStorage.setItem(VECTOR_STORAGE_KEYS.headerMode, state.headerMode);
    } catch { }
}

function applyVectorAppearanceState(state) {
    state.width = 'wide';
    state.mainMenuPinned = shouldUsePersistentVectorSidebars();
    state.appearancePinned = shouldUsePersistentVectorSidebars();
    const html = document.documentElement;
    if (!html) {
        return;
    }

    html.classList.remove(
        'skin-theme-clientpref-os',
        'skin-theme-clientpref-day',
        'skin-theme-clientpref-night',
        'vector-feature-limited-width-clientpref-0',
        'vector-feature-limited-width-clientpref-1',
        'vector-feature-limited-width-content-enabled',
        'vector-feature-custom-font-size-clientpref-0',
        'vector-feature-custom-font-size-clientpref-1',
        'vector-feature-custom-font-size-clientpref-2',
        'vector-feature-main-menu-pinned-enabled',
        'vector-feature-main-menu-pinned-disabled',
        'vector-feature-appearance-pinned-clientpref-0',
        'vector-feature-appearance-pinned-clientpref-1',
        'vector-header-mode-sticky',
        'vector-header-mode-auto-hide',
        'vector-width-standard',
        'vector-width-wide',
        'vector-font-size-0',
        'vector-font-size-1',
        'vector-font-size-2'
    );

    html.classList.add(`skin-theme-clientpref-${state.theme}`);
    html.classList.add(`vector-feature-custom-font-size-clientpref-${state.fontSize}`);
    html.classList.add(`vector-font-size-${state.fontSize}`);
    html.classList.add(`vector-header-mode-${state.headerMode}`);
    html.classList.add(
        state.width === 'wide'
            ? 'vector-feature-limited-width-clientpref-0'
            : 'vector-feature-limited-width-clientpref-1'
    );
    html.classList.add(
        state.width === 'wide' ? 'vector-width-wide' : 'vector-width-standard',
        'vector-feature-limited-width-content-enabled',
        state.mainMenuPinned
            ? 'vector-feature-main-menu-pinned-enabled'
            : 'vector-feature-main-menu-pinned-disabled',
        state.appearancePinned
            ? 'vector-feature-appearance-pinned-clientpref-1'
            : 'vector-feature-appearance-pinned-clientpref-0'
    );

    if (document.body) {
        document.body.dataset.vectorTheme = state.theme;
        document.body.dataset.vectorWidth = state.width;
        document.body.dataset.vectorFontSize = state.fontSize;
        document.body.dataset.vectorHeaderMode = state.headerMode;
        document.body.dataset.vectorMainMenuPinned = state.mainMenuPinned ? 'true' : 'false';
        document.body.dataset.vectorAppearancePinned = state.appearancePinned ? 'true' : 'false';
        document.body.dispatchEvent(
            new CustomEvent('genipedia:vector-appearance-change', {
                detail: state
            })
        );
    }

    window.__genipediaVectorAppearanceState = state;
}

function getCurrentVectorAppearanceState() {
    return window.__genipediaVectorAppearanceState || readVectorAppearanceState();
}

function buildAppearancePanelMarkup() {
    return `
<div id="vector-appearance" class="vector-appearance vector-pinnable-element">
    <div class="vector-pinnable-header vector-appearance-pinnable-header vector-pinnable-header-unpinned" data-feature-name="appearance-pinned">
        <div class="vector-pinnable-header-label">Appearance</div>
        <div class="vector-pinnable-header-actions">
            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-vector-action="pin-appearance">move to sidebar</button>
            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-vector-action="hide-appearance">hide</button>
        </div>
    </div>
    <div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-custom-font-size vector-menu">
        <div class="vector-menu-heading">Text</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li class="mw-list-item mw-list-item-js">
                    <div>
                        <form>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-0" type="radio" value="0" class="cdx-radio__input" data-vector-setting="fontSize">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-0"><span class="cdx-label__label__text">Small</span></label>
                            </div>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-1" type="radio" value="1" class="cdx-radio__input" data-vector-setting="fontSize">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-1"><span class="cdx-label__label__text">Standard</span></label>
                            </div>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-2" type="radio" value="2" class="cdx-radio__input" data-vector-setting="fontSize">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-2"><span class="cdx-label__label__text">Large</span></label>
                            </div>
                        </form>
                    </div>
                </li>
            </ul>
            <span class="skin-client-pref-exclusion-notice">Saved for this browser.</span>
        </div>
    </div>
    <div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-header-mode vector-menu">
        <div class="vector-menu-heading">Header</div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li class="mw-list-item mw-list-item-js">
                    <div>
                        <form>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-vector-feature-header-mode-group" id="skin-client-pref-vector-feature-header-mode-value-sticky" type="radio" value="sticky" class="cdx-radio__input" data-vector-setting="headerMode">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-header-mode-value-sticky"><span class="cdx-label__label__text">Always show</span></label>
                            </div>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-vector-feature-header-mode-group" id="skin-client-pref-vector-feature-header-mode-value-auto-hide" type="radio" value="auto-hide" class="cdx-radio__input" data-vector-setting="headerMode">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-header-mode-value-auto-hide"><span class="cdx-label__label__text">Hide on scroll</span></label>
                            </div>
                        </form>
                    </div>
                </li>
            </ul>
        </div>
    </div>
    <div class="mw-portlet mw-portlet-skin-client-prefs-skin-theme vector-menu">
        <div class="vector-menu-heading">Theme <span><span></span></span></div>
        <div class="vector-menu-content">
            <ul class="vector-menu-content-list">
                <li class="mw-list-item mw-list-item-js">
                    <div>
                        <form>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-os" type="radio" value="os" class="cdx-radio__input" data-vector-setting="theme">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-os"><span class="cdx-label__label__text">Automatic</span></label>
                            </div>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-day" type="radio" value="day" class="cdx-radio__input" data-vector-setting="theme">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-day"><span class="cdx-label__label__text">Light</span></label>
                            </div>
                            <div class="cdx-radio">
                                <input name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-night" type="radio" value="night" class="cdx-radio__input" data-vector-setting="theme">
                                <span class="cdx-radio__icon"></span>
                                <label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-night"><span class="cdx-label__label__text">Dark</span></label>
                            </div>
                        </form>
                        <span id="skin-theme-beta-notice" class="skin-client-pref-exclusion-notice">Automatic follows your system preference.</span>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>`;
}

class FullHeader extends HTMLElement {
    connectedCallback() {
        if (this.__rendered) return;
        this.__rendered = true;

        ensureLocalVectorShell();
        this.state = getCurrentVectorAppearanceState();
        this.render();
        this.installMainMenuSidebarTarget();
        this.installAppearanceSidebarTarget();
        this.cacheElements();
        this.installAppearancePanel();
        this.bindEvents();
        this.installSidebarOffsetSync();
        this.syncSidebarOffsets();
        this.syncUi();
        this.updateHeaderVisibility(true);
    }

    syncSidebarOffsets() {
        const headerContainer = this.querySelector('.vector-header-container');
        const height = headerContainer
            ? headerContainer.offsetHeight || headerContainer.getBoundingClientRect().height
            : 0;

        if (height > 0) {
            document.documentElement.style.setProperty('--vector-header-height', `${height}px`);
        }

        document.documentElement.style.setProperty(
            '--vector-sidebar-top',
            headerContainer?.classList.contains('vector-header-container-hidden') ? '0px' : `${Math.max(0, height)}px`
        );

        const footerContainer = document.querySelector('.mw-footer-container');
        let footerOverlap = 0;

        if (footerContainer) {
            const footerTop = footerContainer.getBoundingClientRect().top;
            if (footerTop < window.innerHeight) {
                footerOverlap = Math.max(0, window.innerHeight - Math.max(0, footerTop));
            }
        }

        document.documentElement.style.setProperty('--vector-sidebar-bottom', `${footerOverlap}px`);
    }

    installSidebarOffsetSync() {
        const headerContainer = this.querySelector('.vector-header-container');

        this.sidebarOffsetResizeObserver = typeof ResizeObserver === 'function'
            ? new ResizeObserver(() => this.syncSidebarOffsets())
            : null;

        if (headerContainer && this.sidebarOffsetResizeObserver) {
            this.sidebarOffsetResizeObserver.observe(headerContainer);
        }

        this.handleScroll = () => this.updateHeaderVisibility();
        this.syncHeaderScrollListener();

        this.handleSidebarScroll = () => {
            if (this.sidebarOffsetFrame) {
                return;
            }

            this.sidebarOffsetFrame = requestAnimationFrame(() => {
                this.sidebarOffsetFrame = 0;
                this.syncSidebarOffsets();
            });
        };
        window.addEventListener('scroll', this.handleSidebarScroll, { passive: true });

        this.handleLoad = () => this.updateHeaderVisibility(true);
        window.addEventListener('load', this.handleLoad);

        requestAnimationFrame(() => this.updateHeaderVisibility(true));
    }

    syncHeaderScrollListener() {
        if (!this.handleScroll) {
            return;
        }

        const shouldAutoHide = this.state?.headerMode === 'auto-hide';
        if (shouldAutoHide) {
            if (!this.isScrollListenerAttached) {
                this.lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
                window.addEventListener('scroll', this.handleScroll, { passive: true });
                this.isScrollListenerAttached = true;
            }
            return;
        }

        if (this.isScrollListenerAttached) {
            window.removeEventListener('scroll', this.handleScroll);
            this.isScrollListenerAttached = false;
        }

        this.headerHidden = false;
        this.lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
    }

    updateHeaderVisibility(force = false) {
        const headerContainer = this.querySelector('.vector-header-container');
        if (!headerContainer) {
            return;
        }

        const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
        const previousScrollY = typeof this.lastScrollY === 'number' ? this.lastScrollY : currentScrollY;
        const delta = currentScrollY - previousScrollY;
        const shouldAutoHide = this.state?.headerMode === 'auto-hide';

        let nextHidden = Boolean(this.headerHidden);
        if (!shouldAutoHide) {
            nextHidden = false;
        } else if (currentScrollY <= 16) {
            nextHidden = false;
        } else if (delta > 4) {
            nextHidden = true;
        } else if (delta < -4 || force) {
            nextHidden = false;
        }

        this.lastScrollY = currentScrollY;

        const changed = nextHidden !== Boolean(this.headerHidden);
        this.headerHidden = nextHidden;
        headerContainer.classList.toggle('vector-header-container-hidden', nextHidden);
        document.body?.classList.toggle('vector-header-hidden', nextHidden);

        if (changed) {
            this.syncSidebarOffsets();
            requestAnimationFrame(() => this.syncSidebarOffsets());
            return;
        }

        this.syncSidebarOffsets();
    }

    render() {
        this.innerHTML = `
<div class="vector-shell">
    <div class="vector-header-container">
        <header class="vector-header mw-header no-font-mode-scale">
            <div class="vector-header-start">
                <nav class="vector-main-menu-landmark" aria-label="Site">
                    <div id="vector-main-menu-dropdown" class="vector-dropdown vector-main-menu-dropdown vector-button-flush-left vector-button-flush-right" title="Main menu">
                        <input type="checkbox" id="vector-main-menu-dropdown-checkbox" role="button" aria-haspopup="true" class="vector-dropdown-checkbox" aria-label="Main menu">
                        <label id="vector-main-menu-dropdown-label" for="vector-main-menu-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" aria-hidden="true"><i class="vector-icon bi bi-list" aria-hidden="true"></i>
<span class="vector-dropdown-label-text">Main menu</span>
                        </label>
                        <div class="vector-dropdown-content">
                            <div id="vector-main-menu-unpinned-container" class="vector-unpinned-container">
                                <div id="vector-main-menu" class="vector-main-menu vector-pinnable-element">
                                    <div class="vector-pinnable-header vector-main-menu-pinnable-header vector-pinnable-header-unpinned">
                                        <div class="vector-pinnable-header-label">Main menu</div>
                                        <div class="vector-pinnable-header-actions">
                                            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-pin-button" data-vector-action="pin-main-menu">move to sidebar</button>
                                            <button type="button" class="vector-pinnable-header-toggle-button vector-pinnable-header-unpin-button" data-vector-action="hide-main-menu">hide</button>
                                        </div>
                                    </div>
                                    <div id="p-navigation" class="vector-menu mw-portlet mw-portlet-navigation">
                                        <div class="vector-menu-heading">Navigation</div>
                                        <div class="vector-menu-content">
                                            <ul class="vector-menu-content-list">
                                                <li id="n-mainpage-description" class="mw-list-item"><a href="${OFFLINE_SHELL_HOME_URL}" title="Visit the main page"><span>Main page</span></a></li>
                                                <li id="n-contents" class="mw-list-item"><a href="${OFFLINE_SHELL_NOOP_URL}" title="Guides to browsing Genipedia"><span>Contents</span></a></li>
                                                <li id="n-currentevents" class="mw-list-item"><a href="${OFFLINE_SHELL_NOOP_URL}" title="Articles related to current events"><span>Current events</span></a></li>
                                                <li id="n-randompage" class="mw-list-item"><a href="${OFFLINE_SHELL_NOOP_URL}" title="Visit a randomly selected article"><span>Random article</span></a></li>
                                                <li id="n-aboutsite" class="mw-list-item"><a href="${OFFLINE_SHELL_NOOP_URL}" title="Learn about Genipedia and how it works"><span>About Genipedia</span></a></li>
                                                <li id="n-contactpage" class="mw-list-item"><a href="${OFFLINE_SHELL_NOOP_URL}" title="How to contact Genipedia"><span>Contact us</span></a></li>
                                            </ul>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
                <div class="central-textlogo vector-header-mini-logo">
                    <img class="central-textlogo__logo" src="${GENIPEDIA_LOGO_URL}" alt="" aria-hidden="true">
                    <h1 class="central-textlogo-wrapper">
                        <span class="central-textlogo__wordmark">
                            <a href="${OFFLINE_SHELL_HOME_URL}" class="central-textlogo__home-link" aria-label="Home">
                                <span class="central-textlogo__wordmark-accent">G</span>ENIPEDI<span class="central-textlogo__wordmark-accent">A</span>
                            </a>
                        </span>
                        <strong class="localized-slogan">The Free Geneology Encyclopedia</strong>
                    </h1>
                </div>
            </div>
            <div class="vector-header-end">
                <div id="p-search" role="search" class="vector-search-box-vue vector-search-box-collapses vector-search-box-show-thumbnail vector-search-box-auto-expand-width vector-search-box">
                    <a href="${OFFLINE_SHELL_NOOP_URL}" class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only search-toggle" title="Search Genipedia"><i class="vector-icon bi bi-search" aria-hidden="true"></i>
<span>Search</span>
                    </a>
                    <div class="vector-typeahead-search-container">
                        <div class="cdx-typeahead-search cdx-typeahead-search--show-thumbnail cdx-typeahead-search--auto-expand-width">
                            <form action="${OFFLINE_SHELL_NOOP_URL}" id="searchform" class="cdx-search-input cdx-search-input--has-end-button">
                                <div id="simpleSearch" class="cdx-search-input__input-wrapper" data-search-loc="header-moved">
                                    <div class="cdx-text-input cdx-text-input--has-start-icon">
                                        <input class="cdx-text-input__input mw-searchInput" autocomplete="off" type="search" name="search" placeholder="Search Genipedia" aria-label="Search Genipedia" autocapitalize="none" spellcheck="false" title="Search Genipedia" id="searchInput">
                                        <i class="cdx-text-input__icon cdx-text-input__start-icon vector-icon bi bi-search" aria-hidden="true"></i>
                                    </div>
                                    <input type="hidden" name="title" value="Special:Search">
                                </div>
                                <button class="cdx-button cdx-search-input__end-button" type="submit">Search</button>
                            </form>
                        </div>
                    </div>
                </div>
                <nav class="vector-user-links vector-user-links-wide" aria-label="Personal tools">
                    <div class="vector-user-links-main">
                        <div id="p-vector-user-menu-preferences" class="vector-menu mw-portlet emptyPortlet"><div class="vector-menu-content"><ul class="vector-menu-content-list"></ul></div></div>
                        <div id="p-vector-user-menu-userpage" class="vector-menu mw-portlet emptyPortlet"><div class="vector-menu-content"><ul class="vector-menu-content-list"></ul></div></div>
                        <nav class="vector-appearance-landmark" aria-label="Appearance">
                            <div id="vector-appearance-dropdown" class="vector-dropdown" title="Change the appearance of the page's font size, width, and color">
                                <input type="checkbox" id="vector-appearance-dropdown-checkbox" role="button" aria-haspopup="true" class="vector-dropdown-checkbox" aria-label="Appearance">
                                <label id="vector-appearance-dropdown-label" for="vector-appearance-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" aria-hidden="true"><i class="vector-icon bi bi-gear" aria-hidden="true"></i>
<span class="vector-dropdown-label-text">Appearance</span>
                                </label>
                                <div class="vector-dropdown-content">
                                    <div id="vector-appearance-unpinned-container" class="vector-unpinned-container"></div>
                                </div>
                            </div>
                        </nav>
                        <div id="p-vector-user-menu-notifications" class="vector-menu mw-portlet emptyPortlet"><div class="vector-menu-content"><ul class="vector-menu-content-list"></ul></div></div>
                        <div id="p-vector-user-menu-overflow" class="vector-menu mw-portlet">
                            <div class="vector-menu-content">
                                <ul class="vector-menu-content-list vector-inline-links">
                                    <li id="pt-login-2" class="mw-list-item user-links-collapsible-item"><a href="${OFFLINE_SHELL_NOOP_URL}"><span>Log in</span></a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div id="vector-user-links-dropdown" class="vector-dropdown vector-user-menu vector-button-flush-right vector-user-menu-logged-out user-links-collapsible-item" title="Log in and more options">
                        <input type="checkbox" id="vector-user-links-dropdown-checkbox" role="button" aria-haspopup="true" class="vector-dropdown-checkbox" aria-label="Personal tools">
                        <label id="vector-user-links-dropdown-label" for="vector-user-links-dropdown-checkbox" class="vector-dropdown-label cdx-button cdx-button--fake-button cdx-button--fake-button--enabled cdx-button--weight-quiet cdx-button--icon-only" aria-hidden="true"><i class="vector-icon bi bi-three-dots" aria-hidden="true"></i>
<span class="vector-dropdown-label-text">Personal tools</span>
                        </label>
                        <div class="vector-dropdown-content">
                            <div id="p-personal" class="vector-menu mw-portlet mw-portlet-personal user-links-collapsible-item" title="User menu">
                                <div class="vector-menu-content">
                                    <ul class="vector-menu-content-list">
                                        <li id="pt-login" class="mw-list-item user-links-collapsible-item"><a href="${OFFLINE_SHELL_NOOP_URL}"><i class="vector-icon bi bi-box-arrow-in-right" aria-hidden="true"></i>
<span>Log in</span></a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    </div>
</div>`;
    }

    installMainMenuSidebarTarget() {
        let shell = document.querySelector('aside[data-genipedia-main-menu-sidebar="true"]');
        if (!shell) {
            shell = document.createElement('aside');
            shell.className = 'vector-main-menu-sidebar-shell';
            shell.setAttribute('aria-label', 'Main menu sidebar');
            shell.dataset.genipediaMainMenuSidebar = 'true';

            const inner = document.createElement('div');
            inner.id = 'vector-main-menu-pinned-container';
            inner.className = 'vector-main-menu-pinned-container';
            shell.appendChild(inner);

            document.body.appendChild(shell);
        }

        this.mainMenuSidebarHost = shell;
        this.pinnedMainMenuContainer = shell.querySelector('#vector-main-menu-pinned-container');
    }

    installAppearanceSidebarTarget() {
        let shell = document.querySelector('aside[data-genipedia-appearance-sidebar="true"]');
        if (!shell) {
            shell = document.createElement('aside');
            shell.className = 'vector-appearance-sidebar-shell';
            shell.setAttribute('aria-label', 'Appearance sidebar');
            shell.dataset.genipediaAppearanceSidebar = 'true';

            const inner = document.createElement('div');
            inner.id = 'vector-appearance-pinned-container';
            inner.className = 'vector-appearance-pinned-container';
            shell.appendChild(inner);

            document.body.appendChild(shell);
        }

        this.appearanceSidebarHost = shell;
        this.pinnedAppearanceContainer = shell.querySelector('#vector-appearance-pinned-container');
    }

    cacheElements() {
        this.dropdownCheckboxes = [...this.querySelectorAll('.vector-dropdown-checkbox')];
        this.mainMenuDropdownCheckbox = this.querySelector('#vector-main-menu-dropdown-checkbox');
        this.mainMenuPanel = this.querySelector('#vector-main-menu');
        this.unpinnedMainMenuContainer = this.querySelector('#vector-main-menu-unpinned-container');
        this.appearanceDropdownCheckbox = this.querySelector('#vector-appearance-dropdown-checkbox');
        this.unpinnedAppearanceContainer = this.querySelector('#vector-appearance-unpinned-container');
    }

    installAppearancePanel() {
        const template = document.createElement('template');
        template.innerHTML = buildAppearancePanelMarkup().trim();
        this.appearancePanel = template.content.firstElementChild;
        this.moveAppearancePanel();
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

            const isInsideHeader = this.contains(actionButton);
            const isInsideMovedMainMenu = this.mainMenuPanel?.contains(actionButton)
                || this.mainMenuSidebarHost?.contains(actionButton);
            const isInsideMovedAppearance = this.appearancePanel?.contains(actionButton)
                || this.appearanceSidebarHost?.contains(actionButton);

            if (!isInsideHeader && !isInsideMovedMainMenu && !isInsideMovedAppearance) {
                return;
            }

            const action = actionButton.getAttribute('data-vector-action');
            if (action === 'pin-main-menu') {
                event.preventDefault();
                this.state.mainMenuPinned = true;
            } else if (action === 'hide-main-menu') {
                event.preventDefault();
                this.state.mainMenuPinned = false;
            } else if (action === 'pin-appearance') {
                event.preventDefault();
                this.state.appearancePinned = true;
            } else if (action === 'hide-appearance') {
                event.preventDefault();
                this.state.appearancePinned = false;
            } else {
                return;
            }

            this.commitState();
            this.closeAllDropdowns();
        };
        document.addEventListener('click', this.handleActionClick);

        this.handleSettingChange = (event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || !input.dataset.vectorSetting) {
                return;
            }

            const isInsideHeader = this.contains(input);
            const isInsideAppearancePanel = this.appearancePanel?.contains(input)
                || this.appearanceSidebarHost?.contains(input);

            if (!isInsideHeader && !isInsideAppearancePanel) {
                return;
            }

            if (input.dataset.vectorSetting === 'width') {
                this.state.width = 'wide';
                this.commitState();
                return;
            }

            this.state[input.dataset.vectorSetting] = input.value;
            this.commitState();
        };
        document.addEventListener('change', this.handleSettingChange);

        this.handleMediaQueryChange = () => {
            if (this.state.theme === 'os') {
                this.syncUi();
            }
        };

        this.colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.colorSchemeMediaQuery.addEventListener('change', this.handleMediaQueryChange);

        this.handleResize = () => {
            applyVectorAppearanceState(this.state);
            this.updateHeaderVisibility(true);
            this.moveMainMenuPanel();
            this.moveAppearancePanel();
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

    moveMainMenuPanel() {
        if (!this.mainMenuPanel) {
            return;
        }

        const shouldPinToSidebar = shouldUsePersistentVectorSidebars();
        const nextParent = shouldPinToSidebar
            ? this.pinnedMainMenuContainer
            : this.unpinnedMainMenuContainer;

        if (nextParent) {
            if (shouldPinToSidebar) {
                if (typeof nextParent.prepend === 'function') {
                    nextParent.prepend(this.mainMenuPanel);
                } else {
                    nextParent.insertBefore(this.mainMenuPanel, nextParent.firstChild);
                }
            } else if (this.mainMenuPanel.parentElement !== nextParent) {
                nextParent.appendChild(this.mainMenuPanel);
            }
        }

        this.mainMenuPanel.classList.toggle('vector-main-menu--pinned', shouldPinToSidebar);
        this.mainMenuPanel.classList.toggle('vector-main-menu--dropdown', !shouldPinToSidebar);
        this.syncPinnableHeader(this.mainMenuPanel, shouldPinToSidebar);

        if (this.mainMenuDropdownCheckbox) {
            this.mainMenuDropdownCheckbox.checked = false;
            this.mainMenuDropdownCheckbox.disabled = shouldPinToSidebar;
        }
    }

    moveAppearancePanel() {
        if (!this.appearancePanel) {
            return;
        }

        const shouldPinToSidebar = shouldUsePersistentVectorSidebars();
        const nextParent = shouldPinToSidebar
            ? this.pinnedAppearanceContainer
            : this.unpinnedAppearanceContainer;

        if (nextParent && this.appearancePanel.parentElement !== nextParent) {
            nextParent.appendChild(this.appearancePanel);
        }

        this.appearancePanel.classList.toggle('vector-appearance--pinned', shouldPinToSidebar);
        this.appearancePanel.classList.toggle('vector-appearance--dropdown', !shouldPinToSidebar);
        this.syncPinnableHeader(this.appearancePanel, shouldPinToSidebar);

        if (this.appearanceDropdownCheckbox) {
            if (shouldPinToSidebar) {
                this.appearanceDropdownCheckbox.checked = false;
            }
            this.appearanceDropdownCheckbox.disabled = shouldPinToSidebar;
        }
    }

    commitState() {
        persistVectorAppearanceState(this.state);
        applyVectorAppearanceState(this.state);
        this.syncHeaderScrollListener();
        this.updateHeaderVisibility(true);
        this.moveMainMenuPanel();
        this.moveAppearancePanel();
        this.syncUi();
    }

    syncUi() {
        const state = this.state;
        const panel = this.appearancePanel;
        if (!panel) {
            return;
        }

        const syncSetting = (setting, value) => {
            panel.querySelectorAll(`[data-vector-setting="${setting}"]`).forEach((input) => {
                input.checked = input.value === value;
            });
        };

        syncSetting('theme', state.theme);
        syncSetting('fontSize', state.fontSize);
        syncSetting('headerMode', state.headerMode);

        this.moveMainMenuPanel();
        this.moveAppearancePanel();
    }

    disconnectedCallback() {
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
        if (this.handleActionClick) {
            document.removeEventListener('click', this.handleActionClick);
        }
        if (this.handleSettingChange) {
            document.removeEventListener('change', this.handleSettingChange);
        }
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
        if (this.handleScroll) {
            window.removeEventListener('scroll', this.handleScroll);
        }
        if (this.handleSidebarScroll) {
            window.removeEventListener('scroll', this.handleSidebarScroll);
        }
        this.isScrollListenerAttached = false;
        if (this.handleLoad) {
            window.removeEventListener('load', this.handleLoad);
        }
        if (this.sidebarOffsetFrame) {
            cancelAnimationFrame(this.sidebarOffsetFrame);
            this.sidebarOffsetFrame = 0;
        }
        if (this.sidebarOffsetResizeObserver) {
            this.sidebarOffsetResizeObserver.disconnect();
        }
        if (this.colorSchemeMediaQuery) {
            this.colorSchemeMediaQuery.removeEventListener('change', this.handleMediaQueryChange);
        }
        if (this.mainMenuSidebarHost?.dataset?.genipediaMainMenuSidebar === 'true') {
            this.mainMenuSidebarHost.remove();
        }
        if (this.appearanceSidebarHost?.dataset?.genipediaAppearanceSidebar === 'true') {
            this.appearanceSidebarHost.remove();
        }
    }
}

if (!customElements.get('full-header')) {
    customElements.define('full-header', FullHeader);
}
