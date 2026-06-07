const FULL_HEADER_TEMPLATE = String.raw`
<style>
:root {
  --header-chrome-sidebar-width: 280px;
}

/* When a full-header is present, add top padding to the document so the
   fixed header never overlaps page content. The header script keeps
   --header-chrome-height in sync with the actual header height. */
body[data-has-full-header="true"] {
  padding-top: calc(var(--header-chrome-height, 55px) + 0.25rem);
}

full-header {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 110;
  --header-chrome-height: 55px;
  --header-chrome-control-height: 2.375rem;
  --header-chrome-avatar-size: calc(var(--header-chrome-control-height) - 0.4rem);
  --header-chrome-toolbar-gap: 0.5rem;
  --header-chrome-bg: #27292d;
  --header-chrome-fg: #eaecf0;
  --header-chrome-search-bg: #1e2125;
  --header-chrome-search-border: rgba(255, 255, 255, 0.08);
  --header-chrome-menu-bg: #242629;
  --header-chrome-menu-border: rgba(255, 255, 255, 0.1);
  --header-chrome-dropdown-bg: #313438;
}

body:not(.theme-dark) full-header {
  --header-chrome-bg: #ffffff;
  --header-chrome-fg: #202122;
  --header-chrome-search-bg: #f8f9fa;
  --header-chrome-search-border: rgba(0, 0, 0, 0.12);
  --header-chrome-menu-bg: #ffffff;
  --header-chrome-menu-border: rgba(0, 0, 0, 0.12);
  --header-chrome-dropdown-bg: #ffffff;
}

body:not(.theme-dark) {
  background: #f8f9fa;
  color: #202122;
}

body.theme-dark {
  background: #101418;
  color: #eaecf0;
}

@media (min-width: 992px) {
  body.header-chrome-content-offset > article {
    margin-left: var(--header-chrome-sidebar-width);
    width: calc(100% - var(--header-chrome-sidebar-width));
    max-width: calc(100% - var(--header-chrome-sidebar-width));
    box-sizing: border-box;
    transition: margin-left 0.2s ease, width 0.2s ease, max-width 0.2s ease;
  }
}

.header-container.header-chrome {
  position: sticky;
  top: 0;
  z-index: 1;
  width: 100%;
  min-height: 55px;
  background: var(--header-chrome-bg);
  color: var(--header-chrome-fg);
  box-shadow: inset 0 -1px 3px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

body:not(.theme-dark) .header-container.header-chrome {
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.header-chrome__row {
  width: 100%;
  min-height: 55px;
  display: flex;
  align-items: center;
  gap: var(--header-chrome-toolbar-gap);
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.header-chrome__start,
.header-chrome__tools,
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

.header-chrome__tools {
  flex: 1 1 auto;
  justify-content: flex-end;
  gap: var(--header-chrome-toolbar-gap);
}

.header-chrome__search {
  flex: 0 1 auto;
  justify-content: flex-end;
}

.header-chrome__end {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--header-chrome-toolbar-gap);
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

.header-chrome__menu-icon {
  font-size: 1.35rem;
  line-height: 1;
}

.header-chrome__menu-icon--close {
  display: none;
}

full-header.sidebar-open .header-chrome__menu-icon--open {
  display: none;
}

full-header.sidebar-open .header-chrome__menu-icon--close {
  display: inline-block;
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
  color: #202122 !important;
}

body:not(.theme-dark) .header-chrome__login,
body:not(.theme-dark) .header-chrome__user-trigger {
  border-color: rgba(0, 0, 0, 0.14);
  background: rgba(0, 0, 0, 0.03);
  color: #202122;
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
  align-items: center;
  min-height: var(--header-chrome-control-height);
  height: var(--header-chrome-control-height);
  background: var(--header-chrome-search-bg);
  border: 1px solid var(--header-chrome-search-border);
  border-radius: 0.125rem;
  box-sizing: border-box;
  overflow: visible;
  position: relative;
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
  color: var(--header-chrome-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  padding: 0 0.75rem 0 0.5rem;
}

.header-chrome__search-input::placeholder {
  color: color-mix(in srgb, var(--header-chrome-fg) 55%, transparent);
}

.header-chrome__search-input:focus {
  outline: none;
}

.header-chrome__search-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--header-chrome-control-height);
  height: var(--header-chrome-control-height);
  min-height: var(--header-chrome-control-height);
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.125rem;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  box-sizing: border-box;
}

body:not(.theme-dark) .header-chrome__search-toggle {
  border-color: rgba(0, 0, 0, 0.12);
  background: rgba(0, 0, 0, 0.03);
}

.header-chrome__search-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

body:not(.theme-dark) .header-chrome__search-toggle:hover {
  background: rgba(0, 0, 0, 0.06);
}

.header-chrome__search-toggle i {
  font-size: 1rem;
  line-height: 1;
}

.header-chrome__search-toggle-icon--close {
  display: none;
}

full-header.search-open .header-chrome__search-toggle-icon--open {
  display: none;
}

full-header.search-open .header-chrome__search-toggle-icon--close {
  display: inline-block;
}

.header-chrome__login {
  min-width: 4.75rem;
  min-height: var(--header-chrome-control-height);
  height: var(--header-chrome-control-height);
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.125rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--header-chrome-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  padding: 0 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.header-chrome__login:hover {
  background: rgba(255, 255, 255, 0.1);
}

.header-chrome__auth {
  display: flex;
  align-items: center;
  min-height: var(--header-chrome-control-height);
  line-height: 1;
  position: relative;
}

.header-chrome__auth[data-logged-in="true"] .header-chrome__login {
  display: none;
}

.header-chrome__auth[data-logged-in="false"] .header-chrome__user-menu {
  display: none;
}

full-header[data-logged-in="false"] .header-chrome__notifications {
  display: none;
}

.header-chrome__user-menu {
  display: flex;
  align-items: center;
  min-height: var(--header-chrome-control-height);
  line-height: 1;
  position: relative;
}

.header-chrome__user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 14rem;
  min-height: var(--header-chrome-control-height);
  height: var(--header-chrome-control-height);
  margin: 0;
  padding: 0 0.55rem 0 0.2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.125rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--header-chrome-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.header-chrome__user-trigger:hover,
.header-chrome__user-menu.is-open .header-chrome__user-trigger {
  background: rgba(255, 255, 255, 0.1);
}

.header-chrome__user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--header-chrome-avatar-size);
  height: var(--header-chrome-avatar-size);
  border-radius: 50%;
  flex-shrink: 0;
  background: #4c8ee3;
  overflow: hidden;
}

.header-chrome__user-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-chrome__user-avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.header-chrome__user-avatar--placeholder i {
  font-size: 1.15rem;
  line-height: 1;
}

body:not(.theme-dark) .header-chrome__user-avatar--placeholder {
  color: #ffffff;
}

.header-chrome__user-name {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  overflow: hidden;
  line-height: 1;
}

.header-chrome__user-given,
.header-chrome__user-family {
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-chrome__user-family {
  opacity: 0.92;
}

.header-chrome__user-caret {
  flex-shrink: 0;
  font-size: 0.8rem;
  opacity: 0.85;
  transition: transform 0.15s ease;
}

.header-chrome__user-menu.is-open .header-chrome__user-caret {
  transform: rotate(180deg);
}

.header-chrome__user-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 20;
  min-width: 14.5rem;
  padding: 0.35rem 0;
  border: 1px solid var(--header-chrome-menu-border);
  border-radius: 0.125rem;
  background: var(--header-chrome-dropdown-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

body:not(.theme-dark) .header-chrome__user-dropdown {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.header-chrome__user-dropdown[hidden] {
  display: none !important;
}

.header-chrome__notifications {
  display: inline-flex;
  align-items: center;
  min-height: var(--header-chrome-control-height);
  line-height: 1;
  position: relative;
  margin: 0;
}
.header-chrome__notifications-trigger {
  margin: 0;
}

.header-chrome__notifications-trigger .action-button__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--header-chrome-control-height);
  height: var(--header-chrome-control-height);
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  border-radius: 0.125rem;
  box-sizing: border-box;
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.header-chrome__notifications-trigger .action-button__control:hover { background: rgba(255,255,255,0.08) }

body:not(.theme-dark) .header-chrome__notifications-trigger .action-button__control {
  border-color: rgba(0, 0, 0, 0.14);
  background: rgba(0, 0, 0, 0.03);
}

    .header-chrome__notifications-trigger .action-button__badge {
  /* smaller badge positioned inside the top-right of the button so it's closer to the icon */
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ff3b30;
  color: var(--color-inverted);
  font-size: 0.65rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-sizing: border-box;
  border: 1px solid var(--header-chrome-dropdown-bg);
}

.header-chrome__notifications-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 20;
  min-width: 14.5rem;
  padding: 0.35rem 0;
  border: 1px solid var(--header-chrome-menu-border);
  border-radius: 0.125rem;
  background: var(--header-chrome-dropdown-bg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  box-sizing: border-box;
}

.header-chrome__notifications-trigger .action-button__icon i {
  position: relative;
  z-index: 1;
  font-size: 1.05rem;
  line-height: 1;
}

body:not(.theme-dark) .header-chrome__notifications-dropdown { box-shadow: 0 8px 24px rgba(0,0,0,0.12) }

.header-chrome__notifications-dropdown[hidden] { display: none !important }

.header-chrome__notifications-list {
  max-height: 18rem;
  overflow: auto;
  padding: 0 0.25rem;
}

.header-chrome__notifications-footer {
  padding: 0 0.25rem;
}

.header-chrome__notifications-meta {
  margin-left: auto;
  color: var(--color-subtle);
  font-size: 0.8rem;
}

/* Make notifications dropdown items match the profile dropdown */
.header-chrome__notifications-dropdown a,
.header-chrome__notifications-dropdown button {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 1rem;
  border: 0;
  background: transparent;
  color: var(--header-chrome-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.header-chrome__notifications-dropdown i {
  flex-shrink: 0;
  width: 1.1rem;
  font-size: 1rem;
  opacity: 0.9;
}

.header-chrome__notifications-dropdown a:hover,
.header-chrome__notifications-dropdown button:hover {
  background: rgba(255,255,255,0.08);
}

.header-chrome__user-dropdown a,
.header-chrome__user-dropdown button {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 1rem;
  border: 0;
  background: transparent;
  color: var(--header-chrome-fg);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.header-chrome__user-dropdown i {
  flex-shrink: 0;
  width: 1.1rem;
  font-size: 1rem;
  opacity: 0.9;
}

.header-chrome__user-dropdown a:hover,
.header-chrome__user-dropdown button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.header-chrome__user-divider {
  height: 1px;
  margin: 0.35rem 0;
  background: var(--header-chrome-menu-border);
}

.header-chrome__sidebar {
  position: fixed;
  top: var(--header-chrome-height);
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: var(--header-chrome-sidebar-width);
  height: calc(100vh - var(--header-chrome-height));
  height: calc(100dvh - var(--header-chrome-height));
  background: var(--header-chrome-menu-bg);
  color: var(--header-chrome-fg);
  border-right: 1px solid var(--header-chrome-menu-border);
  box-sizing: border-box;
  transform: translateX(-100%);
  transition: transform 0.2s ease;
  overflow: hidden;
}

full-header.sidebar-open .header-chrome__sidebar {
  transform: translateX(0);
}

.header-chrome__sidebar-nav {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-content: flex-start;
  gap: 0.15rem;
  min-height: 0;
  padding: 0.75rem;
  overflow-y: auto;
}

.header-chrome__sidebar-footer {
  flex-shrink: 0;
  padding: 0.75rem;
  border-top: 1px solid var(--header-chrome-menu-border);
}

.header-chrome__theme-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.header-chrome__theme-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font: 0.8125rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  color: var(--header-chrome-fg);
  opacity: 0.88;
  white-space: nowrap;
}

.header-chrome__theme-switch-label i {
  font-size: 0.95rem;
  line-height: 1;
}

.header-chrome__theme-switch-control {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.5rem;
}

.header-chrome__theme-input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  opacity: 0;
}

.header-chrome__theme-switch-slider {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  transition: background 0.2s ease;
}

body:not(.theme-dark) .header-chrome__theme-switch-slider {
  background: rgba(0, 0, 0, 0.12);
}

.header-chrome__theme-switch-slider::after {
  content: "";
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  transition: transform 0.2s ease;
}

.header-chrome__theme-input:checked + .header-chrome__theme-switch-slider {
  background: #6b9eff;
}

body:not(.theme-dark) .header-chrome__theme-input:checked + .header-chrome__theme-switch-slider {
  background: #3366cc;
}

.header-chrome__theme-input:checked + .header-chrome__theme-switch-slider::after {
  transform: translateX(1.25rem);
}

.header-chrome__theme-input:focus-visible + .header-chrome__theme-switch-slider {
  outline: 2px solid #6b9eff;
  outline-offset: 2px;
}

.header-chrome__sidebar-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.125rem;
  color: inherit;
  text-decoration: none;
  font: 0.9rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.header-chrome__sidebar-link:hover {
  background: rgba(255, 255, 255, 0.08);
}

body:not(.theme-dark) .header-chrome__sidebar-link:hover {
  background: rgba(0, 0, 0, 0.05);
}

.header-chrome__backdrop {
  position: fixed;
  top: var(--header-chrome-height);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 95;
  border: 0;
  margin: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

full-header.sidebar-open .header-chrome__backdrop {
  opacity: 1;
  pointer-events: auto;
}

@media (min-width: 992px) {
  .header-chrome__sidebar {
    transform: translateX(0);
  }

  full-header:not(.sidebar-open) .header-chrome__sidebar {
    transform: translateX(-100%);
  }

  .header-chrome__backdrop {
    display: none;
  }
}

@media (min-width: 721px) {
  .header-chrome__search {
    display: none;
  }

  .header-chrome__start {
    order: 1;
  }

  .header-chrome__search-form {
    order: 2;
    flex: 0 1 18rem;
    width: auto;
    max-width: 18rem;
    margin-left: auto;
    margin-right: 0;
  }

  .header-chrome__tools {
    order: 3;
    flex: 0 0 auto;
  }
}

@media (max-width: 720px) {
  .header-chrome__row {
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--header-chrome-toolbar-gap);
    padding: 0.35rem 0.5rem 0.5rem;
    min-height: auto;
  }

  .header-chrome__start {
    flex: 1 1 auto;
    min-width: 0;
  }

  .header-chrome__tools {
    flex: 0 0 auto;
  }

  .header-chrome__search {
    flex: 0 0 auto;
  }

  .header-chrome__search-toggle {
    display: inline-flex;
  }

  .header-chrome__search-form {
    display: none;
    flex: 1 1 100%;
    width: 100%;
    max-width: none;
    margin: 0;
    box-sizing: border-box;
  }

  full-header.search-open .header-chrome__search-form {
    display: flex;
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

  .header-chrome__user-name {
    display: none;
  }

  .header-chrome__user-trigger {
    min-width: var(--header-chrome-control-height);
    width: var(--header-chrome-control-height);
    padding: 0;
    justify-content: center;
  }
}

@media (max-width: 420px) {
  /* Extra bottom padding for the header row to give more breathing room
     before the page content on very small screens. */
  .header-chrome__row {
    padding-bottom: 0.75rem;
  }

  /* Keep the logo fully visible and prevent the brand text from pushing into
     the right-side controls by ellipsizing the wordmark only (not clipping the
     entire brand container). */
  .header-chrome__brand {
    min-width: 0;
  }

  .header-chrome__brand mini-header,
  .header-chrome__brand mini-header .central-textlogo,
  .header-chrome__brand mini-header .central-textlogo-wrapper {
    min-width: 0;
    max-width: 100%;
  }

  .header-chrome__brand mini-header .central-textlogo__home-link {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-chrome__brand mini-header .localized-slogan {
    display: none;
  }

  /* When the user name is hidden, also hide the caret so the avatar fits
     within the compact square button. */
  .header-chrome__user-caret {
    display: none;
  }
}
</style>
<header class="header-container header-chrome" role="banner">
  <div class="header-chrome__row">
    <div class="header-chrome__start">
      <button
        class="header-chrome__menu"
        type="button"
        aria-label="Open menu"
        aria-expanded="false"
        aria-controls="header-chrome-sidebar"
      >
        <i class="bi bi-list header-chrome__menu-icon header-chrome__menu-icon--open" aria-hidden="true"></i>
        <i class="bi bi-x-lg header-chrome__menu-icon header-chrome__menu-icon--close" aria-hidden="true"></i>
      </button>
      <div class="header-chrome__brand">
        <mini-header></mini-header>
      </div>
    </div>
    <div class="header-chrome__tools">
      <div class="header-chrome__search">
        <button
          class="header-chrome__search-toggle"
          type="button"
          aria-label="Open search"
          aria-expanded="false"
          aria-controls="header-chrome-search-form"
        >
          <i class="bi bi-search header-chrome__search-toggle-icon--open" aria-hidden="true"></i>
          <i class="bi bi-x-lg header-chrome__search-toggle-icon--close" aria-hidden="true"></i>
        </button>
      </div>
      <div class="header-chrome__notifications">
        <action-button class="header-chrome__notifications-trigger" type="button" icon="bi-bell" title="Notifications" aria-label="Notifications" aria-haspopup="menu" aria-expanded="false" aria-controls="header-chrome-notifications-menu" badge="3"></action-button>
        <div id="header-chrome-notifications-menu" class="header-chrome__notifications-dropdown" role="menu" hidden>
          <div class="header-chrome__notifications-list">
            <button type="button" role="menuitem" data-action="messages"><i class="bi bi-envelope" aria-hidden="true"></i><span>Messages</span><span class="header-chrome__notifications-meta">2 new</span></button>
            <button type="button" role="menuitem" data-action="mentions"><i class="bi bi-at" aria-hidden="true"></i><span>Mentions</span></button>
            <button type="button" role="menuitem" data-action="matches"><i class="bi bi-people" aria-hidden="true"></i><span>Matches</span><span class="header-chrome__notifications-meta">1 new</span></button>
            
            <button type="button" role="menuitem" data-action="edits"><i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit Requests</span></button>
          </div>
          <div class="header-chrome__user-divider" role="separator"></div>
          <div class="header-chrome__notifications-footer">
            <button type="button" role="menuitem" data-action="view-all"><i class="bi bi-bell" aria-hidden="true"></i><span>View All Notifications</span></button>
          </div>
        </div>
      </div>
      <div class="header-chrome__end">
        <div class="header-chrome__auth" data-logged-in="false">
        <button class="header-chrome__login" type="button">Log In</button>
        <div class="header-chrome__user-menu">
          <button
            class="header-chrome__user-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="header-chrome-user-menu"
          >
            <span class="header-chrome__user-avatar header-chrome__user-avatar--placeholder" aria-hidden="true">
              <i class="bi bi-person-fill" aria-hidden="true"></i>
            </span>
            <span class="header-chrome__user-name">
              <span class="header-chrome__user-given"></span>
              <span class="header-chrome__user-family"></span>
            </span>
            <i class="bi bi-chevron-down header-chrome__user-caret" aria-hidden="true"></i>
          </button>
          <div
            id="header-chrome-user-menu"
            class="header-chrome__user-dropdown"
            role="menu"
            hidden
          >
            <a href="#" role="menuitem"><i class="bi bi-person" aria-hidden="true"></i><span>View Your Profile</span></a>
            <a href="#" role="menuitem"><i class="bi bi-diagram-3" aria-hidden="true"></i><span>View Your Tree</span></a>
            <a href="#" role="menuitem"><i class="bi bi-pencil-square" aria-hidden="true"></i><span>Edit Your Profile</span></a>
            <div class="header-chrome__user-divider" role="separator"></div>
            <a href="#" role="menuitem"><i class="bi bi-people" aria-hidden="true"></i><span>Invite Your Family</span></a>
            <a href="#" role="menuitem"><i class="bi bi-gear" aria-hidden="true"></i><span>App Settings</span></a>
            <div class="header-chrome__user-divider" role="separator"></div>
            <button type="button" class="header-chrome__user-logout" role="menuitem"><i class="bi bi-box-arrow-right" aria-hidden="true"></i><span>Log Out</span></button>
          </div>
        </div>
      </div>
      </div>
    </div>
    <form
      id="header-chrome-search-form"
      class="header-chrome__search-form"
      role="search"
      action="#"
      method="get"
    >
      <span class="header-chrome__search-icon" aria-hidden="true">
        <i class="bi bi-search"></i>
      </span>
      <input
          class="header-chrome__search-input"
          type="search"
          name="search"
          placeholder="Search {{APP_NAME}}..."
          aria-label="Search {{APP_NAME}}"
          autocomplete="off"
        >
    </form>
  </div>
</header>
<button class="header-chrome__backdrop" type="button" aria-label="Close menu" hidden></button>
<aside id="header-chrome-sidebar" class="header-chrome__sidebar" aria-label="Site navigation">
  <nav class="header-chrome__sidebar-nav">
    <a class="header-chrome__sidebar-link" href="#"><i class="bi bi-house" aria-hidden="true"></i><span>Home</span></a>
    <a class="header-chrome__sidebar-link" href="#"><i class="bi bi-search" aria-hidden="true"></i><span>Search</span></a>
    <a class="header-chrome__sidebar-link" href="#" data-action="random-profile"><i class="bi bi-shuffle" aria-hidden="true"></i><span>Random</span></a>
    <a class="header-chrome__sidebar-link" href="#"><i class="bi bi-question-circle" aria-hidden="true"></i><span>Help</span></a>
  </nav>
  <div class="header-chrome__sidebar-footer">
    <div class="header-chrome__theme-switch">
      <span class="header-chrome__theme-switch-label">
        <i class="bi bi-sun" aria-hidden="true"></i>
        <span>Light</span>
      </span>
      <label class="header-chrome__theme-switch-control">
        <input
          type="checkbox"
          class="header-chrome__theme-input"
          role="switch"
          aria-label="Dark mode"
        >
        <span class="header-chrome__theme-switch-slider" aria-hidden="true"></span>
      </label>
      <span class="header-chrome__theme-switch-label">
        <i class="bi bi-moon-stars" aria-hidden="true"></i>
        <span>Dark</span>
      </span>
    </div>
  </div>
</aside>
`;

const FULL_HEADER_SCRIPT_URL = document.currentScript?.src || '';
const FULL_HEADER_SLOGAN = 'Free Geneology Encyclopedia';
const FULL_HEADER_SESSION_KEY = 'app-header-session';

function normalizeHeaderApiBaseUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  try {
    const href = new URL(rawValue, window.location.href).href;
    return href.replace(/\/+$/, '');
  } catch {
    return rawValue.replace(/\/+$/, '');
  }
}

function resolveHeaderGitHubApiBase() {
  const configuredBase = normalizeHeaderApiBaseUrl(
    window.App?.getGitHubApiBase?.()
    || window.App?.GitHubApiBase
    || ''
  );

  if (configuredBase) {
    return configuredBase;
  }

  console.error('Genepedia GitHub API base is not configured. Set `window.App.GitHubApiBase` in `site-info.js`.');
  return '';
}

function resolveHeaderGitHubApiUrl(fileName) {
  const apiBase = resolveHeaderGitHubApiBase();
  if (!apiBase) {
    return fileName;
  }

  return new URL(fileName, `${apiBase}/`).href;
}

const FULL_HEADER_GITHUB_LOGIN_URL = resolveHeaderGitHubApiUrl('github-login.php');
const FULL_HEADER_GITHUB_SESSION_URL = resolveHeaderGitHubApiUrl('github-session.php');
const FULL_HEADER_GITHUB_LOGOUT_URL = resolveHeaderGitHubApiUrl('github-logout.php');

function normalizeHeaderUser(user) {
  const displayName = String(user?.displayName || user?.name || '').trim();
  let givenName = String(user?.givenName || '').trim();
  let familyName = String(user?.familyName || '').trim();
  const login = String(user?.login || '').trim();

  if ((!givenName && !familyName) && displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      givenName = parts[0];
    } else if (parts.length > 1) {
      givenName = parts.shift() || '';
      familyName = parts.join(' ');
    }
  }

  if (!givenName && !familyName && login) {
    givenName = login;
  }

  return {
    givenName,
    familyName,
    displayName: `${givenName} ${familyName}`.trim() || displayName || login || 'GitHub User',
    login,
    photoUrl: String(user?.photoUrl || user?.avatarUrl || '').trim(),
    profileUrl: String(user?.profileUrl || '').trim(),
  };
}

function resolveFromComponent(relativePath) {
  try {
    return new URL(relativePath, FULL_HEADER_SCRIPT_URL || window.location.href).href;
  } catch {
    return relativePath;
  }
}

const ACTION_BUTTON_SCRIPT_URL = resolveFromComponent('action-button.js');

function ensureActionButtonScript() {
  if (customElements.get('action-button')) {
    return;
  }

  if (document.querySelector('script[src*="action-button.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = ACTION_BUTTON_SCRIPT_URL;
  script.defer = true;
  document.head.append(script);
}

const THEME_STORAGE_KEY = 'app-theme';

function readStoredTheme() {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'dark' || theme === 'light') {
      return theme;
    }
  } catch {
    // ignore storage errors
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentTheme(theme = readStoredTheme()) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('theme-dark', isDark);

  document.querySelectorAll('.header-chrome__theme-input').forEach((input) => {
    input.checked = isDark;
    input.setAttribute('aria-checked', isDark ? 'true' : 'false');
  });

  return theme;
}

const PEOPLE_REGISTRY_SCRIPT_URL = resolveFromComponent('../lib/people-registry.js');
let peopleRegistryScriptPromise = null;

function ensurePeopleRegistryScript() {
  if (window.PeopleRegistry) {
    return Promise.resolve();
  }

  if (peopleRegistryScriptPromise) {
    return peopleRegistryScriptPromise;
  }

  const existingScript = document.querySelector('script[src*="people-registry.js"]');
  if (existingScript) {
    peopleRegistryScriptPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
    });
    return peopleRegistryScriptPromise;
  }

  peopleRegistryScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEOPLE_REGISTRY_SCRIPT_URL;
    script.defer = true;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.append(script);
  });

  return peopleRegistryScriptPromise;
}

async function getRandomProfileCandidates() {
  await ensurePeopleRegistryScript();
  const people = await window.PeopleRegistry.loadPeopleRegistry();
  return people
    .map((person) => String(person?.id || '').trim())
    .filter(Boolean);
}

async function navigateToRandomProfile() {
  try {
    await ensurePeopleRegistryScript();
  } catch (error) {
    console.warn('Random profile navigation failed: could not load people registry.', error);
    return;
  }

  const candidates = await getRandomProfileCandidates();
  if (!candidates.length) {
    console.warn('Random profile navigation failed: people.json did not contain any profiles.');
    return;
  }

  const currentProfileMatch = window.location.pathname.match(/\/people\/([^/]+)\/profile\.html$/);
  const currentProfileId = currentProfileMatch?.[1] || null;

  let pool = candidates.filter((id) => id !== currentProfileId);
  if (!pool.length) {
    pool = candidates;
  }

  const chosenId = pool[Math.floor(Math.random() * pool.length)];
  window.location.assign(window.PeopleRegistry.resolvePersonProfileUrl(chosenId));
}

class FullHeader extends HTMLElement {
  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    const showDesktopSidebar = window.matchMedia('(min-width: 992px)').matches;
    this.classList.toggle('sidebar-open', showDesktopSidebar);
    try {
      document.body.setAttribute('data-has-full-header', 'true');
      document.body.classList.toggle('header-chrome-content-offset', showDesktopSidebar);
    } catch (e) {
      // ignore
    }
    applyDocumentTheme();
    ensureActionButtonScript();
    this.innerHTML = FULL_HEADER_TEMPLATE;
    this.dataset.loggedIn = 'false';

    // Dynamically resolve links in the user dropdown
    this.querySelectorAll('a[role="menuitem"]').forEach((link) => {
      const text = link.textContent.trim().toLowerCase();
      if (text.includes('settings')) {
        link.href = resolveFromComponent('../pages/settings.html');
      } else if (text.includes('profile')) {
        link.href = resolveFromComponent('../pages/settings.html?tab=account');
      }
    });

    // Dynamically resolve sidebar links (ensure Home navigates to the site home page)
    this.querySelectorAll('.header-chrome__sidebar-link').forEach((link) => {
      const text = link.textContent.trim().toLowerCase();
      if (text.includes('home')) {
        link.href = resolveFromComponent('../pages/home.html');
      } else if (text.includes('search')) {
        link.href = resolveFromComponent('../pages/search.html');
      } else if (text.includes('random')) {
        link.href = '#';
      }
    });

    const randomProfileLink = this.querySelector('[data-action="random-profile"]');
    if (randomProfileLink) {
      randomProfileLink.addEventListener('click', (event) => {
        event.preventDefault();
        if (!window.matchMedia('(min-width: 992px)').matches) {
          this._closeSidebar?.();
        }
        void navigateToRandomProfile();
      });
    }

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
        if (slogan.textContent !== FULL_HEADER_SLOGAN) {
          slogan.textContent = FULL_HEADER_SLOGAN;
        }

        if (!slogan.dataset.fullHeaderSlogan) {
          slogan.dataset.fullHeaderSlogan = 'true';
          new MutationObserver(() => {
            if (slogan.textContent !== FULL_HEADER_SLOGAN) {
              slogan.textContent = FULL_HEADER_SLOGAN;
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

    this.#syncHeaderHeight();
    this.#initTheme();
    this.#initSidebar();
    this.#initSearch();
    this.#initAppSearch();
    this.#initNotifications();
    this.#initAuth();
  }

  disconnectedCallback() {
    try {
      document.body.removeAttribute('data-has-full-header');
    } catch (e) {
      // ignore
    }

    if (this._headerResizeObserver) {
      this._headerResizeObserver.disconnect();
      this._headerResizeObserver = null;
    }
  }

  #initNotifications() {
    const notifications = this.querySelector('.header-chrome__notifications');
    if (!notifications) return;

    const trigger = notifications.querySelector('.header-chrome__notifications-trigger');
    const menu = notifications.querySelector('.header-chrome__notifications-dropdown');
    if (!trigger || !menu) return;

    const close = () => {
      notifications.classList.remove('is-open');
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      // ensure other header menus are closed when notifications open
      this._closeUserMenu?.();
      this._closeSearch?.();

      notifications.classList.add('is-open');
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    };

    // expose controls so other header menus can close this when they open
    this._closeNotifications = close;
    this._openNotifications = open;

    trigger.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (notifications.classList.contains('is-open')) {
        close();
      } else {
        // close other header menus before opening notifications
        this._closeUserMenu?.();
        this._closeSearch?.();
        open();
      }
    });

    // delegate clicks inside the menu so new notification types are handled centrally
    this._notificationsMenuClickHandler = (ev) => {
      const btn = ev.target.closest('[role="menuitem"]');
      if (!btn || !menu.contains(btn)) return;
      const action = btn.dataset.action;
      close();
      try {
        switch (action) {
          case 'messages':
            window.location.assign(resolveFromComponent('../pages/messages.html'));
            break;
          case 'mentions':
            window.location.assign(resolveFromComponent('../pages/search.html?filter=mentions'));
            break;
          case 'matches':
            window.location.assign(resolveFromComponent('../pages/search.html?filter=matches'));
            break;

          case 'edits':
            window.location.assign(resolveFromComponent('../pages/review_edits.html'));
            break;
          case 'view-all':
            window.location.assign(resolveFromComponent('../pages/notifications.html'));
            break;
          default:
            console.log('Notification action:', action);
        }
      } catch (err) {
        console.warn('Navigation for notification action failed', action, err);
      }
    };
    menu.addEventListener('click', this._notificationsMenuClickHandler);

    this._notificationsDocumentClickHandler = (event) => {
      if (notifications && !notifications.contains(event.target)) {
        close();
      }
    };
    document.addEventListener('click', this._notificationsDocumentClickHandler);

    this._notificationsEscapeHandler = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', this._notificationsEscapeHandler);
  }

  #waitForAppSearch() {
    if (window.AppSearch) {
      return Promise.resolve();
    }

    const existingScript = [...document.querySelectorAll('script[src*="app-search.js"]')].at(-1);
    if (existingScript) {
      return new Promise((resolve, reject) => {
        const finish = () => {
          if (window.AppSearch) {
            resolve();
            return;
          }

          reject(new Error('app-search.js loaded without exposing AppSearch'));
        };

        if (existingScript.readyState === 'complete' || existingScript.readyState === 'loaded') {
          finish();
          return;
        }

        existingScript.addEventListener('load', finish, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load app-search.js')), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = resolveFromComponent('app-search.js');
      script.defer = true;
      script.addEventListener('load', () => {
        if (window.AppSearch) {
          resolve();
          return;
        }

        reject(new Error('app-search.js loaded without exposing AppSearch'));
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load app-search.js')), { once: true });
      document.head.append(script);
    });
  }

  #initAppSearch() {
    const start = () => {
      const searchForm = this.querySelector('#header-chrome-search-form');
      if (!searchForm) {
        return;
      }

      void this.#waitForAppSearch()
        .then(() => {
          window.AppSearch?.bindAppSearchForm?.(searchForm);
        })
        .catch((error) => {
          console.error('Failed to initialize header search', error);
        });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
      return;
    }

    start();
  }

  #syncHeaderHeight() {
    const header = this.querySelector('.header-container');
    if (!header) {
      return;
    }

    const update = () => {
      const h = `${header.offsetHeight}px`;
      this.style.setProperty('--header-chrome-height', h);
      try {
        document.documentElement.style.setProperty('--header-chrome-height', h);
      } catch (e) {
        // ignore
      }
    };

    update();
    this._headerResizeObserver = new ResizeObserver(update);
    this._headerResizeObserver.observe(header);
  }

  #initTheme() {
    const themeInput = this.querySelector('.header-chrome__theme-input');
    if (!themeInput) {
      return;
    }

    applyDocumentTheme();

    themeInput.addEventListener('change', () => {
      const nextTheme = themeInput.checked ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // ignore storage errors
      }
      applyDocumentTheme(nextTheme);
    });
  }

  #initSearch() {
    const searchToggle = this.querySelector('.header-chrome__search-toggle');
    const searchInput = this.querySelector('.header-chrome__search-input');
    const mobileQuery = window.matchMedia('(max-width: 720px)');

    if (!searchToggle) {
      return;
    }

    const closeSearch = () => {
      this.classList.remove('search-open');
      searchToggle.setAttribute('aria-expanded', 'false');
      searchToggle.setAttribute('aria-label', 'Open search');
      this.#syncHeaderHeight();
    };

    const openSearch = () => {
      // close other header menus before opening search
      this._closeNotifications?.();
      this._closeUserMenu?.();

      this.classList.add('search-open');
      searchToggle.setAttribute('aria-expanded', 'true');
      searchToggle.setAttribute('aria-label', 'Close search');
      requestAnimationFrame(() => searchInput?.focus());
      this.#syncHeaderHeight();
    };

    searchToggle.addEventListener('click', () => {
      if (this.classList.contains('search-open')) {
        closeSearch();
        return;
      }

      openSearch();
    });

    const handleBreakpointChange = (event) => {
      if (!event.matches) {
        closeSearch();
      }
    };

    mobileQuery.addEventListener('change', handleBreakpointChange);
    this._searchMobileQuery = mobileQuery;
    this._searchBreakpointHandler = handleBreakpointChange;
    this._closeSearch = closeSearch;
  }

  #initSidebar() {
    const menuButton = this.querySelector('.header-chrome__menu');
    const backdrop = this.querySelector('.header-chrome__backdrop');
    const desktopQuery = window.matchMedia('(min-width: 992px)');

    if (!menuButton || !backdrop) {
      return;
    }

    const isDesktop = () => desktopQuery.matches;

    const setSidebarOpen = (open) => {
      this.classList.toggle('sidebar-open', open);
      document.body.classList.toggle('header-chrome-content-offset', open && isDesktop());
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      backdrop.hidden = !open || isDesktop();
    };

    const openSidebar = () => setSidebarOpen(true);
    const closeSidebar = () => setSidebarOpen(false);
    const toggleSidebar = () => setSidebarOpen(!this.classList.contains('sidebar-open'));

    menuButton.addEventListener('click', toggleSidebar);
    backdrop.addEventListener('click', closeSidebar);

    const handleBreakpointChange = () => {
      if (isDesktop()) {
        openSidebar();
        return;
      }

      closeSidebar();
    };

    desktopQuery.addEventListener('change', handleBreakpointChange);

    if (isDesktop()) {
      openSidebar();
    } else {
      closeSidebar();
    }

    this._sidebarDesktopQuery = desktopQuery;
    this._sidebarBreakpointHandler = handleBreakpointChange;
    this._closeSidebar = closeSidebar;
  }

  #initAuth() {
    const auth = this.querySelector('.header-chrome__auth');
    const loginButton = this.querySelector('.header-chrome__login');
    const userMenu = this.querySelector('.header-chrome__user-menu');
    const userTrigger = this.querySelector('.header-chrome__user-trigger');
    const userDropdown = this.querySelector('.header-chrome__user-dropdown');
    const logoutButton = this.querySelector('.header-chrome__user-logout');
    const avatar = this.querySelector('.header-chrome__user-avatar');
    const givenNameEl = this.querySelector('.header-chrome__user-given');
    const familyNameEl = this.querySelector('.header-chrome__user-family');
    const profileLink = Array.from(userDropdown?.querySelectorAll('a[role="menuitem"]') || [])
      .find((link) => link.textContent.trim().toLowerCase().includes('view your profile'));
    const defaultProfileHref = profileLink?.getAttribute('href') || '#';

    if (!auth || !loginButton || !userMenu || !userTrigger || !userDropdown) {
      return;
    }

    loginButton.setAttribute('aria-label', 'Log in with GitHub');
    loginButton.setAttribute('title', 'Log in with GitHub');

    const readSession = () => {
      try {
        const raw = localStorage.getItem(FULL_HEADER_SESSION_KEY);
        return raw ? normalizeHeaderUser(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    };

    const writeSession = (user) => {
      try {
        if (user) {
          localStorage.setItem(FULL_HEADER_SESSION_KEY, JSON.stringify(normalizeHeaderUser(user)));
        } else {
          localStorage.removeItem(FULL_HEADER_SESSION_KEY);
        }
      } catch {
        // ignore storage errors
      }
    };

    const setAvatar = (user) => {
      if (!avatar) return;

      const label = user.displayName || `${user.givenName || ''} ${user.familyName || ''}`.trim() || 'GitHub User';

      if (user.photoUrl) {
        const photo = document.createElement('img');
        photo.src = user.photoUrl;
        photo.alt = label;
        photo.width = 32;
        photo.height = 32;
        avatar.className = 'header-chrome__user-avatar';
        avatar.replaceChildren(photo);
      } else {
        avatar.className = 'header-chrome__user-avatar header-chrome__user-avatar--placeholder';
        avatar.replaceChildren();
        const icon = document.createElement('i');
        icon.className = 'bi bi-person-fill';
        icon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(icon);
        avatar.setAttribute('aria-label', label);
      }

      userTrigger.setAttribute('aria-label', `${label}, account menu`);
    };

    const clearUser = () => {
      if (givenNameEl) givenNameEl.textContent = '';
      if (familyNameEl) familyNameEl.textContent = '';
      if (profileLink) {
        profileLink.href = defaultProfileHref;
        profileLink.removeAttribute('target');
        profileLink.removeAttribute('rel');
      }

      setAvatar({
        givenName: '',
        familyName: '',
        displayName: 'Account',
        photoUrl: '',
      });
    };

    const closeUserMenu = () => {
      userMenu.classList.remove('is-open');
      userDropdown.hidden = true;
      userTrigger.setAttribute('aria-expanded', 'false');
    };

    const openUserMenu = () => {
      // close other header menus before opening account/user menu
      this._closeNotifications?.();
      this._closeSearch?.();

      userMenu.classList.add('is-open');
      userDropdown.hidden = false;
      userTrigger.setAttribute('aria-expanded', 'true');
    };

    // expose controls so other header menus can close this when they open
    this._closeUserMenu = closeUserMenu;
    this._openUserMenu = openUserMenu;

    const setLoggedIn = (loggedIn, user = null) => {
      const sessionUser = normalizeHeaderUser(user || {});
      const loggedInValue = loggedIn ? 'true' : 'false';
      auth.dataset.loggedIn = loggedInValue;
      this.dataset.loggedIn = loggedInValue;
      closeUserMenu();

      if (loggedIn) {
        if (givenNameEl) givenNameEl.textContent = sessionUser.givenName || '';
        if (familyNameEl) familyNameEl.textContent = sessionUser.familyName || '';
        setAvatar(sessionUser);
        if (profileLink && sessionUser.profileUrl) {
          profileLink.href = sessionUser.profileUrl;
          profileLink.target = '_blank';
          profileLink.rel = 'noreferrer';
        }
        writeSession(sessionUser);
      } else {
        clearUser();
        writeSession(null);
      }
    };

    loginButton.addEventListener('click', () => {
      const loginUrl = new URL(FULL_HEADER_GITHUB_LOGIN_URL, window.location.href);
      loginUrl.searchParams.set('return_to', window.location.href);
      window.location.assign(loginUrl.toString());
    });

    userTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (userMenu.classList.contains('is-open')) {
        closeUserMenu();
      } else {
        // close other header menus before opening user menu
        this._closeNotifications?.();
        this._closeSearch?.();
        openUserMenu();
      }
    });

    logoutButton?.addEventListener('click', async () => {
      try {
        await fetch(FULL_HEADER_GITHUB_LOGOUT_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
        });
      } catch {
        // ignore logout transport errors and still clear local state
      }

      setLoggedIn(false);
    });

    userDropdown.querySelectorAll('a[role="menuitem"]').forEach((item) => {
      item.addEventListener('click', () => {
        closeUserMenu();
      });
    });

    this._authDocumentClickHandler = (event) => {
      if (!userMenu.contains(event.target)) {
        closeUserMenu();
      }
    };
    document.addEventListener('click', this._authDocumentClickHandler);

    this._authEscapeHandler = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      closeUserMenu();
      this._closeSearch?.();

      if (this.classList.contains('sidebar-open') && !window.matchMedia('(min-width: 992px)').matches) {
        this._closeSidebar?.();
      }
    };
    document.addEventListener('keydown', this._authEscapeHandler);

    const syncSession = async () => {
      try {
        const response = await fetch(FULL_HEADER_GITHUB_SESSION_URL, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          setLoggedIn(false);
          return;
        }

        const payload = await response.json();
        if (payload?.authenticated && payload.user) {
          setLoggedIn(true, payload.user);
          return;
        }

        setLoggedIn(false);
      } catch {
        const cachedSession = readSession();
        if (cachedSession) {
          setLoggedIn(true, cachedSession);
          return;
        }

        setLoggedIn(false);
      }
    };

    const existingSession = readSession();
    if (existingSession) {
      setLoggedIn(true, existingSession);
    } else {
      clearUser();
    }

    void syncSession();
  }

  disconnectedCallback() {
    if (this._authDocumentClickHandler) {
      document.removeEventListener('click', this._authDocumentClickHandler);
      this._authDocumentClickHandler = null;
    }

    if (this._authEscapeHandler) {
      document.removeEventListener('keydown', this._authEscapeHandler);
      this._authEscapeHandler = null;
    }

    if (this._sidebarDesktopQuery && this._sidebarBreakpointHandler) {
      this._sidebarDesktopQuery.removeEventListener('change', this._sidebarBreakpointHandler);
    }

    if (this._searchMobileQuery && this._searchBreakpointHandler) {
      this._searchMobileQuery.removeEventListener('change', this._searchBreakpointHandler);
    }

    this._headerResizeObserver?.disconnect();
    this._headerResizeObserver = null;
    document.body.classList.remove('header-chrome-content-offset');
    this.classList.remove('sidebar-open', 'search-open');
    if (this._notificationsDocumentClickHandler) {
      document.removeEventListener('click', this._notificationsDocumentClickHandler);
      this._notificationsDocumentClickHandler = null;
    }

    if (this._notificationsEscapeHandler) {
      document.removeEventListener('keydown', this._notificationsEscapeHandler);
      this._notificationsEscapeHandler = null;
    }
    if (this._notificationsMenuClickHandler) {
      const menu = this.querySelector('#header-chrome-notifications-menu');
      if (menu) menu.removeEventListener('click', this._notificationsMenuClickHandler);
      this._notificationsMenuClickHandler = null;
    }
  }
}

if (!customElements.get('full-header')) {
  customElements.define('full-header', FullHeader);
}
