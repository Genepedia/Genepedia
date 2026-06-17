/**
 * <profile-editor> — the people/edit.html shell.
 *
 * Replaces the generic block-based <page-editor> for profiles with a focused,
 * four-tab experience:
 *   • Identity — the structured <profile-infobox-editor> for the identity table
 *     (saved to profile-table.html + family-tree.ged).
 *   • Personal — a structured <profile-personal-editor> for personal
 *     attributes stored on the canonical person record.
 *   • Profile — a WYSIWYG <profile-page-editor> that edits the prose of
 *     people/<id>/data/profile.html with the identity infobox floated in place,
 *     exactly as it looks live, so text wraps around it while you type.
 *   • Relationships — a structured editor for unions and family links.
 *
 * It owns the toolbar (breadcrumb, tabs, Save) and the publish flow: one Save
 * collects the profile fragment plus any extra files (the infobox). Existing
 * profiles are committed directly when the signed-in user manages them, or sent
 * for review otherwise. Brand-new profiles are committed directly, with
 * self-profile drafts checking for claimable matches first.
 */
(function () {
	"use strict";

	const params = new URLSearchParams(window.location.search);
	const PERSON_ID = (params.get("person") || "").trim();
	const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/.test(PERSON_ID);
	const SELF_PROFILE_MODE = params.get("self") === "1";
	const SELF_RETURN_TARGET = (params.get("return") || "profile").trim().toLowerCase();
	const SELF_PROFILE_MATCH_LIMIT = 8;
	const EDIT_TAB_NAMES = new Set(["profile", "infobox", "personal", "education", "career", "relationships", "privacy"]);

	const PROFILE_EDITOR_STYLE_ID = "profile-editor-styles";
	const PROFILE_EDITOR_STYLES = `
/*
 * Profile editor canvas styles.
 *
 * The <page-editor> canvas on people/edit.html gets the people-page__content
 * class (via canvas-class) so profile fragments render with the same
 * typography as the live profile page. These rules mirror the styles in
 * components/people-page.js, plus editing styles for the raw
 * <profile-identity> infobox elements (which the live page upgrades into an
 * <aside> table at render time).
 */

.people-page__content {
  color: #202122;
  font: 1rem/1.65 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark .people-page__content {
  color: #eaecf0;
}

.people-page__content a {
  color: #3366cc;
}

body.theme-dark .people-page__content a {
  color: #6b9eff;
}

.people-page__content p {
  margin: 0 0 0.9rem;
}

.people-page__content h1 {
  margin: 0 0 1rem;
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.25;
}

.people-page__content h2 {
  margin: 1.75rem 0 0.65rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  font-family: Linux Libertine, Hoefler Text, Georgia, Times New Roman, Times, serif;
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.25;
  overflow: hidden;
}

body.theme-dark .people-page__content h2 {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.people-page__content h3 {
  margin: 1.25rem 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.people-page__content ul,
.people-page__content ol {
  margin: 0 0 0.9rem;
  padding-left: 1.5rem;
}

.people-page__content li {
  margin-bottom: 0.35rem;
}

.people-page__content dl {
  margin: 0 0 0.9rem;
}

.people-page__content dt {
  font-weight: 600;
}

.people-page__content dd {
  margin: 0 0 0.5rem 1rem;
}

/* ------------------------------------------------------------------ */
/* Inline-editable identity infobox (raw <profile-identity> markup).   */
/* Shown as a right-aligned card; the live page floats it instead.     */
/* ------------------------------------------------------------------ */

.people-page__content [data-editor-include] {
  display: block;
}

.people-page__content profile-identity {
  display: block;
  width: min(100%, 22rem);
  margin: 0 0 1rem auto;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f8f9fa;
  font-size: 0.875rem;
  line-height: 1.45;
  box-sizing: border-box;
}

body.theme-dark .people-page__content profile-identity {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__content profile-identity table-photo {
  display: block;
  padding-bottom: 0.5rem;
}

.people-page__content profile-identity table-photo img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.125rem;
}

.people-page__content profile-identity table-name,
.people-page__content profile-identity table-gender,
.people-page__content profile-identity table-birth,
.people-page__content profile-identity table-death,
.people-page__content profile-identity table-place-of-burial,
.people-page__content profile-identity table-immediate-family {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  column-gap: 1rem;
  padding: 0.4rem 0;
}

.people-page__content profile-identity table-name::before,
.people-page__content profile-identity table-gender::before,
.people-page__content profile-identity table-birth::before,
.people-page__content profile-identity table-death::before,
.people-page__content profile-identity table-place-of-burial::before,
.people-page__content profile-identity table-immediate-family::before {
  font-weight: 600;
  color: #54595d;
}

body.theme-dark .people-page__content profile-identity table-name::before,
body.theme-dark .people-page__content profile-identity table-gender::before,
body.theme-dark .people-page__content profile-identity table-birth::before,
body.theme-dark .people-page__content profile-identity table-death::before,
body.theme-dark .people-page__content profile-identity table-place-of-burial::before,
body.theme-dark .people-page__content profile-identity table-immediate-family::before {
  color: #a7adb4;
}

.people-page__content profile-identity table-name::before {
  content: "Name";
}

.people-page__content profile-identity table-gender::before {
  content: "Gender";
}

.people-page__content profile-identity table-birth::before {
  content: "Birth";
}

.people-page__content profile-identity table-death::before {
  content: "Death";
}

.people-page__content profile-identity table-place-of-burial::before {
  content: "Place of burial";
}

.people-page__content profile-identity table-immediate-family::before {
  content: "Immediate family";
}

.people-page__content profile-identity table-immediate-family p {
  margin: 0 0 0.55rem;
}

.people-page__content profile-identity table-immediate-family p:last-child {
  margin-bottom: 0;
}

/* ------------------------------------------------------------------ */
/* Profile-specific blocks                                              */
/* ------------------------------------------------------------------ */

.people-page__content figure.profile-figure {
  margin: 0 0 1rem;
  max-width: 22rem;
}

.people-page__content figure.profile-figure img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  box-sizing: border-box;
}

body.theme-dark .people-page__content figure.profile-figure img {
  border-color: rgba(255, 255, 255, 0.12);
}

.people-page__content figure.profile-figure figcaption {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: #54595d;
  line-height: 1.35;
}

body.theme-dark .people-page__content figure.profile-figure figcaption {
  color: #a7adb4;
}

/* ------------------------------------------------------------------ */
/* Profile editor shell (<profile-editor>)                              */
/* ------------------------------------------------------------------ */

.profile-edit {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

html body.profile-edit-page[data-has-full-header="true"] {
  padding-top: var(--header-chrome-height, 55px);
}

/* Portal/other global styles set a small body margin; remove it on this
   page so the fixed full-header aligns flush with the editor header. */
body.profile-edit-page {
  margin: 0;
  background: #f8f9fa;
  color: #202122;
}

body.theme-dark.profile-edit-page {
  background: #101418;
  color: #eaecf0;
}

/* Sticky toolbar: breadcrumb · tabs · status + Save. */
.profile-edit__bar {
  position: sticky;
  top: var(--header-chrome-height, 55px);
  z-index: 30;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  background: #f8f9fa;
}

body.theme-dark .profile-edit__bar {
  border-bottom-color: rgba(255, 255, 255, 0.12);
  background: #101418;
}

.profile-edit__breadcrumb {
  font-size: 0.875rem;
  color: var(--color-progressive, #3366cc);
}

.profile-edit__breadcrumb-list {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-edit__breadcrumb-list a {
  color: inherit;
  text-decoration: none;
}

.profile-edit__breadcrumb-list a:hover {
  text-decoration: underline;
}

.profile-edit__breadcrumb-current[aria-current="page"] {
  color: var(--color-subtle, #54595d);
  cursor: default;
}

.profile-edit__breadcrumb-sep {
  color: var(--color-subtle, #6b7280);
}

.profile-edit__tabs {
  display: inline-flex;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.375rem;
  background: #f8f9fa;
}

body.theme-dark .profile-edit__tabs {
  border-color: rgba(255, 255, 255, 0.12);
  background: #1a1e24;
}

.profile-edit__tab {
  padding: 0.4rem 0.85rem;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: #54595d;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

body.theme-dark .profile-edit__tab {
  color: #a7adb4;
}

.profile-edit__tab:hover {
  color: #202122;
}

body.theme-dark .profile-edit__tab:hover {
  color: #eaecf0;
}

.profile-edit__tab.is-active {
  background: #3366cc;
  color: #ffffff;
}

body.theme-dark .profile-edit__tab.is-active {
  background: #6b9eff;
  color: #101418;
}

.profile-edit__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.profile-edit__status {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-subtle, #54595d);
}

.profile-edit__status[data-type="success"] {
  color: var(--color-success, #1a7f37);
}

.profile-edit__status[data-type="error"] {
  color: var(--color-danger, #cf222e);
}

.profile-edit__status a {
  color: inherit;
}

.profile-edit__save {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: var(--border-radius-base, 0.125rem);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.profile-edit__save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-edit__panel[hidden] {
  display: none;
}

.profile-edit__panels {
  width: 100%;
  max-width: var(--site-content-max-width, 90rem);
  margin: 0 auto;
  padding: calc(1rem - 2px) 1rem 1rem;
  box-sizing: border-box;
  color: #202122;
  font: 1rem/1.65 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark .profile-edit__panels {
  color: #eaecf0;
}

.profile-edit__error {
  margin: 1.5rem;
  color: var(--color-danger, #cf222e);
}

.profile-edit__claim-review {
  width: 100%;
  max-width: var(--site-content-max-width, 90rem);
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
}

.profile-edit__claim-review[hidden] {
  display: none !important;
}

.profile-edit__claim-head {
  margin-bottom: 1rem;
}

.profile-edit__claim-head h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.45rem, 2vw, 2rem);
  line-height: 1.2;
}

.profile-edit__claim-head p {
  margin: 0;
  color: #54595d;
}

body.theme-dark .profile-edit__claim-head p {
  color: #a2a9b1;
}

.profile-edit__match-list {
  display: grid;
  gap: 0.75rem;
}

.profile-edit__match-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #a2a9b1;
  border-radius: var(--border-radius-base);
  background: #fff;
}

body.theme-dark .profile-edit__match-card {
  border-color: #54595d;
  background: #1b2025;
}

.profile-edit__match-card h2 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  line-height: 1.3;
}

.profile-edit__match-card p {
  margin: 0.15rem 0;
  color: #54595d;
}

body.theme-dark .profile-edit__match-card p {
  color: #a2a9b1;
}

.profile-edit__match-claim {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid #3366cc;
  border-radius: 3px;
  background: #3366cc;
  color: #fff;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.profile-edit__match-claim:hover:not(:disabled) {
  border-color: #2a4b8d;
  background: #2a4b8d;
}

.profile-edit__match-claim:disabled {
  border-color: #a2a9b1;
  background: #eaecf0;
  color: #54595d;
  cursor: not-allowed;
}

.profile-edit__claim-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .profile-edit__match-card {
    grid-template-columns: 1fr;
  }

  .profile-edit__match-claim {
    width: 100%;
    white-space: normal;
  }
}

/* ------------------------------------------------------------------ */
/* Structured infobox editor (<profile-infobox-editor>)                */
/* ------------------------------------------------------------------ */

.pie {
  width: 100%;
  max-width: 100%;
  width: 100%;
}

.pie__intro {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: #54595d;
  line-height: 1.5;
}

body.theme-dark .pie__intro {
  color: #a7adb4;
}

.pie__status {
  margin: 0 0 1rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.125rem;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.9rem;
}

body.theme-dark .pie__status {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.pie__status[data-type="error"] {
  border-color: rgba(208, 44, 63, 0.5);
  background: rgba(208, 44, 63, 0.08);
  color: #b32230;
}

.pie__status[data-type="success"] {
  border-color: rgba(20, 134, 88, 0.5);
  background: rgba(20, 134, 88, 0.08);
  color: #14794a;
}

.pie__group {
  margin: 0 0 1.5rem;
  padding: 0.5rem 1rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  scroll-margin-top: calc(var(--header-chrome-height, 55px) + 1rem);
}

body.theme-dark .pie__group {
  border-color: rgba(255, 255, 255, 0.12);
}

.pie__group--death[hidden] {
  display: none;
}

.pie__legend {
  padding: 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.pie__row {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem 1rem;
  margin: 0.55rem 0;
}

.pie__row--align-top {
  align-items: start;
}

.pie__row--align-top .pie__label,
.pie__row--location .pie__label,
.pie__row--date .pie__label {
  padding-top: 0.4rem;
}

/* Date range UI */
.pie__field--date .pie__date-range {
  display: inline-flex;
  align-items: center;
}

.pie__date-range-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pie__field--date .pie__date-range-row--divider,
.pie__field--date .pie__date-range-row--to {
  display: none;
}

.pie__field--date.is-between {
  align-items: flex-start;
}

.pie__field--date.is-between:not([layout="stacked"]) .date-field-editor__controls {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 0.5rem;
  row-gap: 0.65rem;
}

.pie__field--date.is-between .pie__date-range {
  display: grid;
  gap: 0.65rem;
  /* Wide enough to keep the date input, Circa checkbox and the parsed-date
     preview on one line (it otherwise wraps below the field). */
  width: min(100%, 34rem);
}

.pie__field--date.is-between:not([layout="stacked"]) .date-field-editor__range {
  min-width: 0;
}

.pie__field--date.is-between .pie__date-range-row,
.pie__field--date.is-between .pie__date-range-row--divider,
.pie__field--date.is-between .pie__date-range-row--to {
  display: flex;
}

.pie__field--date.is-between .pie__date-range-row--divider {
  color: #6b7280;
  font-size: 0.875rem;
}

body.theme-dark .pie__field--date.is-between .pie__date-range-row--divider {
  color: #a7adb4;
}

.pie__date-input-wrap {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  min-width: 12rem;
}

.pie__field--date .pie__date-input {
  min-width: 0;
  width: 100%;
  padding: 0.45rem 2.35rem 0.45rem 0.6rem;
  color-scheme: light;
}

body.theme-dark .pie__field--date .pie__date-input {
  color-scheme: dark;
}

.pie__date-input-wrap .pie__date-input::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  width: 2.35rem;
  height: 100%;
  cursor: pointer;
}

.pie__date-picker-button {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0 0.125rem 0.125rem 0;
  background: transparent;
  color: #54595d;
  cursor: pointer;
}

.pie__date-picker-button:hover,
.pie__date-picker-button:focus-visible {
  color: #3366cc;
  outline: none;
  background: rgba(51, 102, 204, 0.08);
}

body.theme-dark .pie__date-picker-button {
  color: #a7adb4;
}

body.theme-dark .pie__date-picker-button:hover,
body.theme-dark .pie__date-picker-button:focus-visible {
  color: #6b9eff;
  background: rgba(107, 158, 255, 0.12);
}

/* Cause-of-death suggestion dropdown */
.pie__field--suggest {
  position: relative;
}

.pie__suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 220;
  background: var(--background-color-base, #ffffff);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.25rem;
  max-height: 12rem;
  overflow: auto;
  padding: 0.25rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.pie__suggestion-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.6rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 0.125rem;
  color: inherit;
}

.pie__suggestion-button.is-active,
.pie__suggestion-button:hover {
  background: var(--background-color-interactive-subtle, #f1f3f5);
}

body.theme-dark .pie__suggestions {
  background: #101418;
  border-color: rgba(255, 255, 255, 0.06);
}

.pie__row--align-top,
.pie__row--location,
.pie__row--date {
  align-items: start;
}

.pie__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #54595d;
}

body.theme-dark .pie__label {
  color: #c8ccd1;
}

.pie__field {
  min-width: 0;
}

.pie__field input[type="text"],
.pie__field input[type="number"],
.pie__field input[type="search"],
.pie__field input[type="date"],
.pie__field select {
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid #a2a9b1;
  border-radius: 0.125rem;
  font: inherit;
  font-size: 0.9rem;
  background: #ffffff;
  color: #202122;
  box-sizing: border-box;
}

body.theme-dark .pie__field input[type="text"],
body.theme-dark .pie__field input[type="number"],
body.theme-dark .pie__field input[type="search"],
body.theme-dark .pie__field input[type="date"],
body.theme-dark .pie__field select {
  border-color: rgba(255, 255, 255, 0.3);
  background: #101418;
  color: #eaecf0;
}

.pie__field input:focus,
.pie__field select:focus {
  outline: none;
  border-color: #3366cc;
  box-shadow: inset 0 0 0 1px #3366cc;
}

/* Ensure selects and native date inputs visually match height */
.pie__field select,
.pie__field input[type="date"],
.pie__date-input-wrap {
  box-sizing: border-box;
  height: 2.4rem;
}

.pie__field--name {
  display: grid;
  gap: 0.85rem;
}

.pie__field--split {
  display: flex;
  gap: 0.5rem;
}

.pie__field--location {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: 100%;
}

.pie__location-search-wrap {
  position: relative;
}

.pie__location-results {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 0.3rem 0;
  list-style: none;
  border: 1px solid #a2a9b1;
  border-radius: 0.125rem;
  background: #ffffff;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.16);
  max-height: 16rem;
  overflow: auto;
}

.pie__location-results[hidden] {
  display: none !important;
}

body.theme-dark .pie__location-results {
  border-color: rgba(255, 255, 255, 0.18);
  background: #171b20;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
}

.pie__location-option {
  margin: 0;
}

.pie__location-option-button {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pie__location-option-button:hover,
.pie__location-option-button.is-active {
  background: rgba(51, 102, 204, 0.08);
}

body.theme-dark .pie__location-option-button:hover,
body.theme-dark .pie__location-option-button.is-active {
  background: rgba(107, 158, 255, 0.16);
}

.pie__location-option-title {
  color: #202122;
  font-size: 0.9rem;
  font-weight: 600;
}

body.theme-dark .pie__location-option-title {
  color: #eaecf0;
}

.pie__location-option-meta,
.pie__location-empty {
  color: #72777d;
  font-size: 0.8rem;
  line-height: 1.35;
}

body.theme-dark .pie__location-option-meta,
body.theme-dark .pie__location-empty {
  color: #a7adb4;
}

.pie__location-empty {
  padding: 0.6rem 0.65rem;
}

/* Photo upload & media picker */
.pie__group--photo {
  display: grid;
  gap: 0.85rem;
}

.pie__photo-preview-wrap {
  display: flex;
  justify-content: center;
}

.pie__photo-preview-img {
  display: block;
  max-width: min(100%, 16rem);
  max-height: 14rem;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.25rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
}

body.theme-dark .pie__photo-preview-img {
  border-color: rgba(255, 255, 255, 0.12);
  background: #1e2125;
}

.pie__photo-empty {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 1.25rem 0.75rem;
  text-align: center;
}

.pie__photo-empty[hidden] {
  display: none;
}

.pie__photo-empty-icon {
  font-size: 2rem;
  color: #72777d;
}

body.theme-dark .pie__photo-empty-icon {
  color: #a7adb4;
}

.pie__photo-empty-text {
  margin: 0;
  color: #54595d;
  font-size: 0.9rem;
}

body.theme-dark .pie__photo-empty-text {
  color: #a7adb4;
}

.pie__photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pie__photo-actions .page-editor__button i {
  font-size: 1rem;
  line-height: 1;
}

.pie__photo-modal-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.pie__photo-modal-toolbar .page-editor__button i {
  font-size: 1rem;
  line-height: 1;
  margin-right: 0.35rem;
}

.pie__photo-modal-toolbar[hidden] {
  display: none !important;
}

.pie__photo-modal-toolbar .page-editor__button[hidden] {
  display: none !important;
}

.pie__photo-dropzone {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  width: 100%;
  margin-bottom: 0.85rem;
  padding: 1.15rem 1rem;
  border: 1px dashed rgba(51, 102, 204, 0.45);
  border-radius: var(--border-radius-base);
  background: rgba(51, 102, 204, 0.06);
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}

body.theme-dark .pie__photo-dropzone {
  border-color: rgba(107, 158, 255, 0.45);
  background: rgba(107, 158, 255, 0.08);
}

.pie__photo-dropzone:hover,
.pie__photo-dropzone.is-dragover {
  border-color: #3366cc;
  background: rgba(51, 102, 204, 0.12);
  box-shadow: 0 0 0 2px rgba(51, 102, 204, 0.12);
}

body.theme-dark .pie__photo-dropzone:hover,
body.theme-dark .pie__photo-dropzone.is-dragover {
  border-color: #6b9eff;
  background: rgba(107, 158, 255, 0.16);
  box-shadow: 0 0 0 2px rgba(107, 158, 255, 0.14);
}

.pie__photo-dropzone:disabled {
  opacity: 0.65;
  cursor: wait;
}

.pie__photo-dropzone-icon {
  font-size: 1.65rem;
  color: #3366cc;
}

body.theme-dark .pie__photo-dropzone-icon {
  color: #6b9eff;
}

.pie__photo-dropzone-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.pie__photo-dropzone-hint {
  max-width: 24rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--color-subtle, #72777d);
}

.pie__media-modal {
  position: fixed;
  inset: 0;
  z-index: 350;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ensure the UA/author cascade doesn't force the modal visible when it
   should be hidden via the \`hidden\` attribute or aria-hidden. */
.pie__media-modal[hidden],
.pie__media-modal[aria-hidden="true"] {
  display: none !important;
}

.pie__media-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
}

.pie__media-modal-panel {
  position: relative;
  width: min(92%, 64rem);
  max-height: 80vh;
  overflow: auto;
  background: var(--background-color-base, #fff);
  border-radius: 0.375rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  padding: 0.5rem;
  z-index: 360;
}

.pie__media-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.pie__media-modal-body {
  padding: 0.6rem;
}

.pie__media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.5rem;
}

.pie__media-thumb {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: stretch;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.pie__media-thumb img {
  width: 100%;
  height: 6.25rem;
  object-fit: cover;
  border-radius: 0.25rem;
  display: block;
}

.pie__media-thumb-label {
  font-size: 0.85rem;
  color: #333;
  padding: 0 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.theme-dark .pie__media-modal-panel {
  background: #101418;
  color: #eaecf0;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.pie__location-details {
  padding: 0.8rem 0.95rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  background: rgba(0, 0, 0, 0.03);
}

body.theme-dark .pie__location-details {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.pie__location-detail-row {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem 0.75rem;
}

.pie__location-detail-row+.pie__location-detail-row {
  margin-top: 0.45rem;
}

.pie__location-detail-label {
  color: #54595d;
  font-size: 0.875rem;
  text-align: right;
}

body.theme-dark .pie__location-detail-label {
  color: #c8ccd1;
}

.pie__location-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: #3366cc;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.pie__location-toggle:hover {
  text-decoration: underline;
}

body.theme-dark .pie__location-toggle {
  color: #6b9eff;
}

.pie__location-toggle-icon {
  font-size: 0.72rem;
  line-height: 1;
}

.pie__field--radios {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.1rem;
  align-items: center;
}

.pie__field--radios label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.pie__field--date {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.pie__field--date select {
  width: auto;
  flex: 0 0 auto;
}

.pie__field--date input[type="text"],
.pie__field--date .pie__date-input-wrap {
  width: 12rem;
  flex: 0 0 auto;
}

.pie__circa {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  white-space: nowrap;
}

.pie__date-preview {
  font-size: 0.85rem;
  color: #54595d;
  font-style: italic;
}

body.theme-dark .pie__date-preview {
  color: #a7adb4;
}

.pie__hint {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: #72777d;
}

.pie__hint code {
  font-size: 0.95em;
}

.pie__save {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid #3366cc;
  border-radius: 0.125rem;
  background: #3366cc;
  color: #ffffff;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.pie__save:hover {
  background: #2a4b8d;
  border-color: #2a4b8d;
}

.pie__save:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* ------------------------------------------------------------------ */
/* Infobox section quick-nav + readability                             */
/* ------------------------------------------------------------------ */

/* Keep the structured form aligned with the profile page content column. */
.profile-edit__panel[data-edit-panel="infobox"] .pie {
  max-width: none;
  margin-inline: 0;
}

.profile-edit__panel[data-edit-panel="personal"] .pie {
  max-width: none;
  margin-inline: 0;
}

@media (max-width: 600px) {
  .pie__row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .pie__field--split {
    flex-direction: column;
  }

  .pie__location-detail-row {
    grid-template-columns: 1fr;
  }

  .pie__location-detail-label {
    text-align: left;
  }
}

@media (max-width: 720px) {

  .ppe__canvas aside,
  .people-page__content aside {
    float: none;
    width: 100%;
    max-width: none;
    margin: 0 0 1rem;
  }

  .ppe__canvas aside table,
  .people-page__content aside table {
    width: 100%;
  }

  .people-page__content .ppe-profile-columns,
  .ppe__table-preview .ppe-profile-columns {
    grid-template-columns: 1fr;
  }
}

/* Keep quick-edit controls and date pickers inside the floated infobox card. */
.ppe__canvas aside.ppe__infobox .ppe__infobox-field-editor .pie__date-input-wrap,
.ppe__canvas aside.ppe__infobox .ppe__infobox-field-editor .ppe__infobox-date-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: auto;
  min-height: 2rem;
}

.ppe__canvas aside.ppe__infobox .ppe__infobox-field-editor .pie__date-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

/* Breadcrumb avatar injected by <profile-editor>. */
.profile-edit__breadcrumb-list > li {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.profile-edit__breadcrumb-home,
.profile-edit__breadcrumb-sep,
.profile-edit__breadcrumb-current,
.profile-edit__breadcrumb-name {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.profile-edit__breadcrumb-current {
  gap: 0.5rem;
}

.profile-edit__breadcrumb-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--avatar-bg, #dfe3e6);
  color: var(--avatar-fg, #fff);
  flex: 0 0 28px;
}

.profile-edit__breadcrumb-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
`;

	function ensureProfileEditorStyles() {
		if (document.getElementById(PROFILE_EDITOR_STYLE_ID)) {
			return;
		}

		const style = document.createElement("style");
		style.id = PROFILE_EDITOR_STYLE_ID;
		style.textContent = PROFILE_EDITOR_STYLES;
		document.head.append(style);
	}

	function resolveSiteUrl(path) {
		const clean = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(clean);
		return new URL(`../${clean}`, window.location.href).href;
	}

	// Database paths for a person's ownership record (data/Genepedia-Database/people/ownership/...).
	function peopleDbBucket(personId) {
		const n = Number(String(personId).replace(/[^0-9]/g, "")) || 0;
		return Math.floor((Math.max(1, n) - 1) / 1000);
	}

	function peopleDbPath(path) {
		const clean = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolvePeopleDbPath) return window.App.resolvePeopleDbPath(clean);
		if (!clean) return "data/Genepedia-Database/people";
		if (clean.startsWith("data/Genepedia-Database/people/")) return clean;
		if (clean === "data/Genepedia-Database") return "data/Genepedia-Database/people";
		if (clean.startsWith("data/Genepedia-Database/")) {
			return `data/Genepedia-Database/people/${clean.slice("data/Genepedia-Database/".length)}`;
		}
		if (clean.startsWith("data/people/")) {
			return `data/Genepedia-Database/people/${clean.slice("data/people/".length)}`;
		}
		return `data/Genepedia-Database/people/${clean}`;
	}

	function peopleDbOwnershipPath(personId) {
		return peopleDbPath(`ownership/${peopleDbBucket(personId)}/${personId}.json`);
	}

	function resolveGitHubApiUrl(fileName) {
		const base = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "").trim();
		if (!base) return "";
		try {
			return new URL(fileName, base.replace(/\/+$/, "") + "/").href;
		} catch (error) {
			return "";
		}
	}

	function gitHubFetchInit(init) {
		return window.App?.getGitHubFetchInit?.(init) || {
			credentials: "include",
			...(init || {}),
			headers: { Accept: "application/json", ...((init && init.headers) || {}) },
		};
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, (char) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[char]));
	}

	function normalizeUser(user) {
		const login = String(user?.login || user?.githubLogin || "").trim();
		const displayName = String(user?.displayName || user?.name || "").trim();
		let givenName = String(user?.givenName || "").trim();
		let familyName = String(user?.familyName || "").trim();

		if ((!givenName && !familyName) && displayName) {
			const parts = displayName.split(/\s+/).filter(Boolean);
			givenName = parts.shift() || "";
			familyName = parts.join(" ");
		}

		if (!givenName && !familyName && login) {
			givenName = login;
		}

		return {
			id: String(user?.id || "").trim(),
			login,
			displayName: `${givenName} ${familyName}`.trim() || displayName || login,
			givenName,
			familyName,
			photoUrl: String(user?.photoUrl || user?.avatarUrl || "").trim(),
			profileUrl: String(user?.profileUrl || (login ? `https://github.com/${login}` : "")).trim(),
			email: String(user?.email || "").trim(),
		};
	}

	function readStoredUser() {
		try {
			const user = window.App?.getGitHubUser?.();
			if (user) return normalizeUser(user);
		} catch (error) {
			// fall through
		}

		try {
			const raw = localStorage.getItem("app-header-session");
			return raw ? normalizeUser(JSON.parse(raw)) : null;
		} catch (error) {
			return null;
		}
	}

	function compactText(value) {
		return String(value || "").trim().replace(/\s+/g, " ");
	}

	function comparableName(value) {
		return compactText(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
	}

	function extractYear(value) {
		const match = String(value || "").match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/);
		return match ? match[0] : "";
	}

	function displayNameFromProfileData(data = {}) {
		const direct = compactText(data.displayName);
		if (direct) return direct;
		const surname = compactText(data.lastName) || compactText(data.birthSurname);
		return [data.title, data.firstName, data.middleName, surname, data.suffix]
			.map(compactText)
			.filter(Boolean)
			.join(" ");
	}

	function hasRequiredProfileName(data = {}) {
		if (window.AppProfileInfobox?.hasRequiredProfileName) {
			return window.AppProfileInfobox.hasRequiredProfileName(data);
		}
		return Boolean(compactText(data.firstName) || compactText(data.lastName));
	}

	function registryEntryFromProfileData(personId, data = {}) {
		const displayName = displayNameFromProfileData(data);
		const parts = displayName.split(/\s+/).filter(Boolean);
		const firstName = compactText(data.firstName) || parts[0] || "Profile";
		const explicitLast = compactText(data.lastName) || compactText(data.birthSurname);
		const lastName = explicitLast || (parts.length > 1 ? parts.slice(1).join(" ") : personId);
		const entry = {
			id: String(personId),
			firstName,
			lastName,
		};

		const birthYear = extractYear(data.birth?.date);
		if (birthYear) entry.birthYear = birthYear;
		const deathYear = data.status === "deceased" ? extractYear(data.death?.date) : "";
		if (deathYear) entry.deathYear = deathYear;
		return entry;
	}

	function claimIdentity(personId, user, fallbackName) {
		const normalized = normalizeUser(user || {});
		return {
			personId: String(personId),
			name: compactText(fallbackName) || normalized.displayName || normalized.login || "Genepedia user",
			githubLogin: normalized.login,
		};
	}

	function identityLogin(identity) {
		if (typeof identity === "string") {
			return identity.trim().toLowerCase();
		}

		if (!identity || typeof identity !== "object") {
			return "";
		}

		return String(identity.githubLogin || identity.github_login || identity.login || "").trim().toLowerCase();
	}

	function profileManagerLogins(config = {}) {
		const logins = new Set();
		const add = (identity) => {
			const login = identityLogin(identity);
			if (login) logins.add(login);
		};

		const ownerLogin = identityLogin(config?.owner);
		if (ownerLogin) {
			logins.add(ownerLogin);
		}

		(Array.isArray(config?.maintainers) ? config.maintainers : []).forEach(add);

		if (!ownerLogin) {
			add(config?.creator);
		}

		return logins;
	}

	function canManageProfileConfig(config, user) {
		const login = String(user?.login || user?.githubLogin || "").trim().toLowerCase();
		return Boolean(login) && profileManagerLogins(config).has(login);
	}

	function isDeceasedProfileData(data = {}) {
		return String(data.status || "").trim().toLowerCase() === "deceased"
			|| Boolean(compactText(data.death?.date));
	}

	function normalizePrivacyData(value, { deceased = false } = {}) {
		if (deceased) {
			return {
				visibility: "public",
				maintainersOnly: false,
			};
		}

		// Living profiles default to public; a maintainer can opt a living profile
		// into private. (GEDCOM imports set living profiles private explicitly.)
		const source = value && typeof value === "object" ? value : {};
		const rawVisibility = String(source.visibility || source.mode || "public").trim().toLowerCase();
		const visibility = rawVisibility === "private" ? "private" : "public";
		return {
			visibility,
			maintainersOnly: visibility === "private",
		};
	}

	function createProfileConfig(personId, data, user, { claimSelf = true, privacy = null } = {}) {
		const identity = claimIdentity(personId, user, displayNameFromProfileData(data));
		return {
			creator: identity,
			owner: claimSelf ? identity : null,
			maintainers: [identity],
			privacy: normalizePrivacyData(privacy, { deceased: isDeceasedProfileData(data) }),
		};
	}

	function buildProfileConfig(personId, data, user, { claimSelf = true, privacy = null } = {}) {
		return `${JSON.stringify(createProfileConfig(personId, data, user, { claimSelf, privacy }), null, 2)}\n`;
	}

	function buildProfileShell(personId) {
		return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title data-brand-template="{{APP_NAME}} Profile ${personId}"></title>
    <script src="../../site-info.js"></script>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css">
	<style>
		html,
		body {
			margin: 0;
		}
	</style>
<script defer src="../../lib/Web-Framework/components/mini-header.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-header.js"></script>
	<script defer src="../../components/people-page-profile-table.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-page-toolbar.js"></script>
	<script defer src="../../components/people-page.js"></script>
	<script defer src="../../lib/Web-Framework/components/full-footer.js"></script>
</head>

<body>
	<full-header></full-header>
	<article>
		<people-page></people-page>
		<full-footer></full-footer>
	</article>
</body>

</html>`;
	}

	function scoreSelfProfileCandidate(person, data) {
		const candidateFirst = comparableName(person?.firstName);
		const candidateLast = comparableName(person?.lastName);
		const candidateName = comparableName([person?.firstName, person?.lastName].filter(Boolean).join(" "));
		const draftFirst = comparableName(data.firstName);
		const draftLast = comparableName(data.lastName || data.birthSurname);
		const draftName = comparableName(displayNameFromProfileData(data));
		const birthYear = extractYear(data.birth?.date);
		const candidateBirthYear = String(person?.birthYear || "").trim();
		const candidateDeathYear = String(person?.deathYear || "").trim();

		let score = 0;
		const reasons = [];

		if (draftName && candidateName && draftName === candidateName) {
			score += 8;
			reasons.push("same full name");
		} else if (draftFirst && draftLast && candidateFirst === draftFirst && candidateLast === draftLast) {
			score += 7;
			reasons.push("same first and last name");
		} else if (draftLast && candidateLast === draftLast && draftFirst && candidateFirst.startsWith(draftFirst.slice(0, 1))) {
			score += 4;
			reasons.push("same last name and first initial");
		} else if (draftLast && candidateLast === draftLast) {
			score += 3;
			reasons.push("same last name");
		} else if (draftFirst && candidateFirst === draftFirst && draftName && candidateName.includes(draftFirst)) {
			score += 2;
			reasons.push("same first name");
		}

		if (birthYear && candidateBirthYear && birthYear === candidateBirthYear) {
			score += 3;
			reasons.push("same birth year");
		}

		if (data.status === "living" && candidateDeathYear) {
			score -= 5;
		}

		const hasSpecificName = Boolean(draftLast || (draftFirst && draftName.split(" ").length > 1));
		const threshold = hasSpecificName ? 3 : 8;
		return score >= threshold ? { score, reasons } : null;
	}

	const TEMPLATE = `
		<div class="profile-edit__bar">
			<nav class="profile-edit__breadcrumb" aria-label="Breadcrumb">
				<ol class="profile-edit__breadcrumb-list">
					<li><a class="profile-edit__breadcrumb-home" href="#">People</a></li>
					<li class="profile-edit__breadcrumb-sep" aria-hidden="true">›</li>
					<li>
						<a class="profile-edit__breadcrumb-current" href="#">
							<span class="profile-edit__breadcrumb-avatar" aria-hidden="true"></span>
							<span class="profile-edit__breadcrumb-name">Profile</span>
						</a>
					</li>
				</ol>
			</nav>
			<div class="profile-edit__tabs" role="tablist" aria-label="Profile editor sections">
				<button type="button" class="profile-edit__tab is-active" data-edit-tab="profile" role="tab" aria-selected="true">Profile</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="infobox" role="tab" aria-selected="false">Identity</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="personal" role="tab" aria-selected="false">Personal</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="education" role="tab" aria-selected="false">Education</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="career" role="tab" aria-selected="false">Career</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="relationships" role="tab" aria-selected="false">Relationships</button>
				<button type="button" class="profile-edit__tab" data-edit-tab="privacy" role="tab" aria-selected="false" hidden>Privacy</button>
			</div>
			<div class="profile-edit__actions">
				<span class="profile-edit__status" role="status" aria-live="polite" hidden></span>
				<button type="button" class="profile-edit__save page-editor__button page-editor__button--save" data-action="publish" disabled>
					<i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
					<span>Save</span>
				</button>
			</div>
		</div>
		<div class="profile-edit__panels">
			<div class="profile-edit__panel" data-edit-panel="profile"></div>
			<div class="profile-edit__panel" data-edit-panel="infobox" hidden>
				<div class="ppe__toolbar prel__mini-toolbar" role="toolbar" aria-label="Identity tools">
					<button type="button" class="ppe__tool" data-mini-action="undo" data-mini-target="infobox" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
					<button type="button" class="ppe__tool" data-mini-action="redo" data-mini-target="infobox" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>
				</div>
			</div>
			<div class="profile-edit__panel" data-edit-panel="personal" hidden>
				<div class="ppe__toolbar prel__mini-toolbar" role="toolbar" aria-label="Personal tools">
					<button type="button" class="ppe__tool" data-mini-action="undo" data-mini-target="personal" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
					<button type="button" class="ppe__tool" data-mini-action="redo" data-mini-target="personal" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>
				</div>
			</div>
			<div class="profile-edit__panel" data-edit-panel="education" hidden>
				<div class="ppe__toolbar prel__mini-toolbar" role="toolbar" aria-label="Education tools">
					<button type="button" class="ppe__tool" data-mini-action="undo" data-mini-target="education" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
					<button type="button" class="ppe__tool" data-mini-action="redo" data-mini-target="education" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>
						<span class="ppe__toolbar-sep" aria-hidden="true"></span>
						<div class="ppe__menu">
							<button type="button" class="ppe__tool ppe__menu-toggle" data-mini-menu-toggle="education-add" aria-haspopup="menu" aria-expanded="false" title="Add education">
								<i class="bi bi-mortarboard" aria-hidden="true"></i>
								<span class="ppe__menu-toggle-label">Add education</span>
								<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
							</button>
							<div class="ppe__menu-panel ppe__add-block-panel prel__add-education-panel" data-mini-menu="education-add" role="menu" hidden>
								<section class="page-editor__inserter-section">
									<h3 class="page-editor__inserter-section-title">Education type</h3>
									<div class="page-editor__inserter-list page-editor__inserter-list--compact">
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="college"><span class="page-editor__inserter-item-label">College/University</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="elementary"><span class="page-editor__inserter-item-label">Elementary School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="graduate"><span class="page-editor__inserter-item-label">Graduate Education</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="highschool"><span class="page-editor__inserter-item-label">High School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="junior_high"><span class="page-editor__inserter-item-label">Junior High</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="middle_school"><span class="page-editor__inserter-item-label">Middle School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="preschool"><span class="page-editor__inserter-item-label">Preschool</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="primary"><span class="page-editor__inserter-item-label">Primary School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="secondary"><span class="page-editor__inserter-item-label">Secondary School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="vocational"><span class="page-editor__inserter-item-label">Vocational School</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-education" data-mini-target="education" data-edu-type="other"><span class="page-editor__inserter-item-label">Other</span></button>
									</div>
								</section>
							</div>
						</div>
				</div>
			</div>
			<div class="profile-edit__panel" data-edit-panel="career" hidden>
				<div class="ppe__toolbar prel__mini-toolbar" role="toolbar" aria-label="Career tools">
					<button type="button" class="ppe__tool" data-mini-action="undo" data-mini-target="career" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
					<button type="button" class="ppe__tool" data-mini-action="redo" data-mini-target="career" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>
						<span class="ppe__toolbar-sep" aria-hidden="true"></span>
						<div class="ppe__menu">
							<button type="button" class="ppe__tool ppe__menu-toggle" data-mini-menu-toggle="career-add" aria-haspopup="menu" aria-expanded="false" title="Add career entry">
								<i class="bi bi-buildings" aria-hidden="true"></i>
								<span class="ppe__menu-toggle-label">Add career</span>
								<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
							</button>
							<div class="ppe__menu-panel ppe__add-block-panel prel__add-education-panel" data-mini-menu="career-add" role="menu" hidden>
								<section class="page-editor__inserter-section">
									<h3 class="page-editor__inserter-section-title">Career type</h3>
									<div class="page-editor__inserter-list page-editor__inserter-list--compact">
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="company"><span class="page-editor__inserter-item-label">Company</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="government"><span class="page-editor__inserter-item-label">Government</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="military"><span class="page-editor__inserter-item-label">Military</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="nonprofit"><span class="page-editor__inserter-item-label">Non-profit</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="self_employed"><span class="page-editor__inserter-item-label">Self-employed</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="internship"><span class="page-editor__inserter-item-label">Internship</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="contract"><span class="page-editor__inserter-item-label">Contract / freelance</span></button>
										<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-career" data-mini-target="career" data-career-type="other"><span class="page-editor__inserter-item-label">Other</span></button>
									</div>
								</section>
							</div>
						</div>
				</div>
			</div>
			<div class="profile-edit__panel" data-edit-panel="relationships" hidden>
				<div class="ppe__toolbar prel__mini-toolbar" role="toolbar" aria-label="Relationship tools">
					<button type="button" class="ppe__tool" data-mini-action="undo" data-mini-target="relationships" aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
					<button type="button" class="ppe__tool" data-mini-action="redo" data-mini-target="relationships" aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>
					<span class="ppe__toolbar-sep" aria-hidden="true"></span>
					<div class="ppe__menu">
						<button type="button" class="ppe__tool ppe__menu-toggle" data-mini-menu-toggle="relationship-add" aria-haspopup="menu" aria-expanded="false" title="Add relationship">
							<span class="ppe__menu-toggle-label">Add relationship</span>
							<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
						</button>
						<div class="ppe__menu-panel ppe__add-block-panel prel__add-relationship-panel" data-mini-menu="relationship-add" role="menu" hidden>
							<section class="page-editor__inserter-section">
								<h3 class="page-editor__inserter-section-title">Parent</h3>
								<div class="page-editor__inserter-grid page-editor__inserter-grid--compact prel__add-relationship-grid">
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="biological"><span class="page-editor__inserter-item-label">Biological</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="adopted"><span class="page-editor__inserter-item-label">Adoptive</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="foster"><span class="page-editor__inserter-item-label">Foster</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="step"><span class="page-editor__inserter-item-label">Step</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="guardian"><span class="page-editor__inserter-item-label">Guardian</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-parent" data-mini-target="relationships" data-parent-type="other"><span class="page-editor__inserter-item-label">Other</span></button>
								</div>
							</section>
							<section class="page-editor__inserter-section">
								<h3 class="page-editor__inserter-section-title">Partner</h3>
								<div class="page-editor__inserter-grid page-editor__inserter-grid--compact prel__add-relationship-grid">
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="spouse"><span class="page-editor__inserter-item-label">Spouse</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="fiance"><span class="page-editor__inserter-item-label">Fiance</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="partner"><span class="page-editor__inserter-item-label">Partner</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="ex-spouse"><span class="page-editor__inserter-item-label">Ex spouse</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="ex-partner"><span class="page-editor__inserter-item-label">Ex partner</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-partner" data-mini-target="relationships" data-partner-kind="other"><span class="page-editor__inserter-item-label">Other</span></button>
								</div>
							</section>
							<section class="page-editor__inserter-section">
								<h3 class="page-editor__inserter-section-title">Child</h3>
								<div class="page-editor__inserter-grid page-editor__inserter-grid--compact prel__add-relationship-grid">
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="biological"><span class="page-editor__inserter-item-label">Biological</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="adopted"><span class="page-editor__inserter-item-label">Adoptive</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="foster"><span class="page-editor__inserter-item-label">Foster</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="step"><span class="page-editor__inserter-item-label">Step</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="guardian"><span class="page-editor__inserter-item-label">Guardian</span></button>
									<button type="button" class="page-editor__inserter-item page-editor__inserter-item--compact" role="menuitem" data-mini-action="add-child" data-mini-target="relationships" data-child-type="other"><span class="page-editor__inserter-item-label">Other</span></button>
								</div>
							</section>
						</div>
					</div>
				</div>
			</div>
			<div class="profile-edit__panel" data-edit-panel="privacy" hidden></div>
		</div>
	`;

	class ProfileEditor extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;
			this.__activeTab = this.#readStoredTab() || "profile";
			this.__isDraftProfile = SELF_PROFILE_MODE || params.get("new") === "1";

			ensureProfileEditorStyles();
			this.innerHTML = TEMPLATE;

			this.classList.toggle("profile-edit--self", SELF_PROFILE_MODE);

			if (!VALID_ID) {
				this.querySelector(".profile-edit__panels").innerHTML =
					"<p class=\"profile-edit__error\">No valid profile id was provided. Open this editor from a profile’s Edit button.</p>";
				return;
			}

			if (SELF_PROFILE_MODE) {
				const saveLabel = this.querySelector(".profile-edit__save span");
				if (saveLabel) saveLabel.textContent = "Save profile";
			} else if (params.get("new") === "1") {
				this.#setBreadcrumbCurrent("New Tree");
			}

			this.#mountChildren();
			void this.#initPrivacyAccess();
			void this.#initBreadcrumb();
			this.#bindTabs();
			this.#activate(this.__activeTab, { persist: false });
			this.#bindSave();
			this.#bindEvents();
			this.#refreshDirtyState();
			this.#schedulePostMountDirtySync();

			window.addEventListener("beforeunload", this.#onBeforeUnload);
		}

		disconnectedCallback() {
			window.removeEventListener("beforeunload", this.#onBeforeUnload);
			if (Array.isArray(this.__dirtySyncTimers)) {
				this.__dirtySyncTimers.forEach((timerId) => window.clearTimeout(timerId));
				this.__dirtySyncTimers = [];
			}
			if (this.__onMiniToolbarOutside) {
				document.removeEventListener("mousedown", this.__onMiniToolbarOutside);
				this.__onMiniToolbarOutside = null;
			}
		}

		#schedulePostMountDirtySync() {
			this.__dirtySyncTimers = Array.isArray(this.__dirtySyncTimers) ? this.__dirtySyncTimers : [];
			this.__dirtySyncTimers.forEach((timerId) => window.clearTimeout(timerId));
			this.__dirtySyncTimers = [
				window.setTimeout(() => this.#refreshDirtyState(), 0),
				window.setTimeout(() => this.#refreshDirtyState(), 250),
				window.setTimeout(() => this.#refreshDirtyState(), 750),
			];
		}

		#mountChildren() {
			const profilePanel = this.querySelector('[data-edit-panel="profile"]');
			const infoboxPanel = this.querySelector('[data-edit-panel="infobox"]');
			const personalPanel = this.querySelector('[data-edit-panel="personal"]');
			const educationPanel = this.querySelector('[data-edit-panel="education"]');
			const careerPanel = this.querySelector('[data-edit-panel="career"]');
			const relationshipsPanel = this.querySelector('[data-edit-panel="relationships"]');
			const privacyPanel = this.querySelector('[data-edit-panel="privacy"]');

			const pageEditor = document.createElement("profile-page-editor");
			pageEditor.setAttribute("person", PERSON_ID);
			profilePanel.append(pageEditor);

			const infobox = document.createElement("profile-infobox-editor");
			infobox.setAttribute("person", PERSON_ID);
			infoboxPanel.append(infobox);

			const personal = document.createElement("profile-personal-editor");
			personal.setAttribute("person", PERSON_ID);
			personalPanel.append(personal);

			const education = document.createElement("profile-education-editor");
			education.setAttribute("person", PERSON_ID);
			educationPanel.append(education);

			const career = document.createElement("profile-career-editor");
			career.setAttribute("person", PERSON_ID);
			careerPanel.append(career);

			const relationships = document.createElement("profile-relationships-editor");
			relationships.setAttribute("person", PERSON_ID);
			relationshipsPanel.append(relationships);

			const privacy = document.createElement("profile-privacy-editor");
			privacy.setAttribute("person", PERSON_ID);
			privacyPanel.append(privacy);

			this.__pageEditor = pageEditor;
			this.__infobox = infobox;
			this.__personal = personal;
			this.__education = education;
			this.__career = career;
			this.__relationships = relationships;
			this.__privacy = privacy;
			this.#bindMiniToolbars();
		}

		async #initPrivacyAccess() {
			const privacyTab = this.querySelector('[data-edit-tab="privacy"]');
			if (!privacyTab) return;

			if (!PERSON_ID || SELF_PROFILE_MODE || params.get("new") === "1") {
				privacyTab.hidden = true;
				if (this.__activeTab === "privacy") {
					this.#activate("profile");
				}
				return;
			}

			const [user, config] = await Promise.all([
				this.#getCurrentUser(),
				this.#loadProfileConfig(PERSON_ID),
			]);

			const canManagePrivacy = canManageProfileConfig(config || {}, user);
			privacyTab.hidden = !canManagePrivacy;

			if (!canManagePrivacy && this.__activeTab === "privacy") {
				this.#activate("profile");
			}
		}

		#bindMiniToolbars() {
			this.querySelectorAll("[data-mini-menu-toggle]").forEach((button) => {
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					const menuName = button.dataset.miniMenuToggle;
					const panel = this.querySelector(`[data-mini-menu="${menuName}"]`);
					const expanded = button.getAttribute("aria-expanded") === "true";
					this.#closeMiniMenus();
					if (!expanded && panel) {
						panel.hidden = false;
						button.setAttribute("aria-expanded", "true");
					}
				});
			});

			this.querySelectorAll("[data-mini-action]").forEach((button) => {
				button.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					const action = button.dataset.miniAction;
					const target = button.dataset.miniTarget;
					const detail = {
						parentType: button.dataset.parentType || "",
						partnerKind: button.dataset.partnerKind || "",
						childType: button.dataset.childType || "",
						eduType: button.dataset.eduType || "",
						careerType: button.dataset.careerType || "",
					};
					this.#runMiniAction(action, target, detail);
					if (action !== "undo" && action !== "redo") {
						this.#closeMiniMenus();
					}
				});
			});

			if (!this.__onMiniToolbarOutside) {
				this.__onMiniToolbarOutside = (event) => {
					if (!event.target.closest(".prel__mini-toolbar")) {
						this.#closeMiniMenus();
					}
				};
				document.addEventListener("mousedown", this.__onMiniToolbarOutside);
			}
		}

		#closeMiniMenus() {
			this.querySelectorAll("[data-mini-menu]").forEach((panel) => {
				panel.hidden = true;
			});
			this.querySelectorAll("[data-mini-menu-toggle]").forEach((button) => {
				button.setAttribute("aria-expanded", "false");
			});
		}

		#runMiniAction(action, target, detail = {}) {
			const destination = target === "relationships"
				? this.__relationships
				: target === "education"
					? this.__education
					: target === "career"
						? this.__career
						: target === "personal"
							? this.__personal
							: this.__infobox;
			if (!destination) return;

			if (action === "undo") {
				destination.undo?.();
				return;
			}
			if (action === "redo") {
				destination.redo?.();
				return;
			}

			// If this is an add-* action, make the related panel active so the
			// newly-created entry is visible immediately (e.g. Add education).
			if (action && String(action).startsWith("add-") && (target === "relationships" || target === "education" || target === "career" || target === "personal")) {
				this.#activate(target);
			}

			if (target === "relationships" || target === "education" || target === "career" || target === "personal") {
				destination.triggerToolbarAction?.(action, detail);
			}
		}

		#setBreadcrumbCurrent(text, { href = null } = {}) {
			const current = this.querySelector(".profile-edit__breadcrumb-current");
			if (!current) return;

			const wantsLink = Boolean(href);
			// Helper to build inner nodes (avatar + name)
			const buildInner = (txt) => {
				const avatar = document.createElement('span');
				avatar.className = 'profile-edit__breadcrumb-avatar';
				avatar.setAttribute('aria-hidden', 'true');
				const name = document.createElement('span');
				name.className = 'profile-edit__breadcrumb-name';
				name.textContent = txt;
				return [avatar, name];
			};

			if (wantsLink && current.tagName !== 'A') {
				const link = document.createElement('a');
				link.className = 'profile-edit__breadcrumb-current';
				link.href = href;
				const [avatar, nameEl] = buildInner(text);
				link.append(avatar, nameEl);
				current.replaceWith(link);
				void this.#populateBreadcrumbAvatar();
				return;
			}

			if (!wantsLink && current.tagName === 'A') {
				const label = document.createElement('span');
				label.className = 'profile-edit__breadcrumb-current';
				label.setAttribute('aria-current', 'page');
				const [avatar, nameEl] = buildInner(text);
				label.append(avatar, nameEl);
				current.replaceWith(label);
				void this.#populateBreadcrumbAvatar();
				return;
			}

			// Update existing element's name without removing avatar.
			const nameNode = current.querySelector('.profile-edit__breadcrumb-name');
			if (nameNode) {
				nameNode.textContent = text;
			} else {
				current.textContent = text;
			}

			if (wantsLink && current.tagName === 'A') {
				current.href = href;
				current.removeAttribute('aria-current');
			} else if (!wantsLink && current.tagName === 'SPAN') {
				current.setAttribute('aria-current', 'page');
			}
			void this.#populateBreadcrumbAvatar();
		}

		async #populateBreadcrumbAvatar() {
			const anchor = this.querySelector('.profile-edit__breadcrumb-current');
			if (!anchor) return;
			const avatarEl = anchor.querySelector('.profile-edit__breadcrumb-avatar');
			const nameEl = anchor.querySelector('.profile-edit__breadcrumb-name');
			if (!avatarEl) return;

			// Resolve person card and populate avatar img or default image
			try {
				let card = null;
				if (window.App && typeof window.App.loadPersonCard === 'function') {
					card = await window.App.loadPersonCard(String(PERSON_ID));
				} else {
					const people = await this.#loadPeopleRegistry();
					const entry = people.find((p) => String(p?.id) === String(PERSON_ID));
					if (entry) card = { name: [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim(), photoUrl: String(entry.photoUrl || '').trim() };
				}

				const defaultImg = (typeof window.App?.resolveSiteUrl === 'function')
					? window.App.resolveSiteUrl('assets/default-profile-photo.svg')
					: (location.protocol === 'file:' ? new URL('../../assets/default-profile-photo.svg', location.href).href : '/assets/default-profile-photo.svg');

				if (card && card.photoUrl) {
					avatarEl.textContent = '';
					const img = document.createElement('img');
					img.src = card.photoUrl;
					img.alt = '';
					img.loading = 'lazy';
					avatarEl.append(img);
					if (nameEl && !nameEl.textContent) nameEl.textContent = card.name || nameEl.textContent;
				} else {
					avatarEl.textContent = '';
					const img = document.createElement('img');
					img.src = defaultImg;
					img.alt = '';
					img.loading = 'lazy';
					avatarEl.append(img);
					if (card && card.name && nameEl && !nameEl.textContent) nameEl.textContent = card.name;
				}
			} catch (e) {
				// fallback: show initial
				try {
					const name = nameEl?.textContent?.trim() || '';
					avatarEl.textContent = (name ? name.slice(0, 1).toUpperCase() : '?');
				} catch (err) { /* ignore */ }
			}
		}

		async #initBreadcrumb() {
			const home = this.querySelector(".profile-edit__breadcrumb-home");
			if (home) home.href = resolveSiteUrl("people/");

			if (SELF_PROFILE_MODE) {
				this.__isDraftProfile = true;
				this.#setBreadcrumbCurrent("Your profile");
				return;
			}

			const isDraft = params.get("new") === "1" || !(await this.#checkProfileExists());
			this.__isDraftProfile = isDraft;

			if (isDraft) {
				this.#setBreadcrumbCurrent("New Tree");
				return;
			}

			this.#setBreadcrumbCurrent("Profile", {
				href: resolveSiteUrl(`people/${PERSON_ID}/index.html`),
			});
		}

		#bindTabs() {
			this.querySelectorAll(".profile-edit__tab").forEach((tab) => {
				tab.addEventListener("click", () => this.#activate(tab.dataset.editTab));
			});
		}

		#tabStorageKey() {
			const scope = SELF_PROFILE_MODE
				? `self:${PERSON_ID || "new"}`
				: params.get("new") === "1"
					? `new:${PERSON_ID || "new"}`
					: PERSON_ID || "unknown";
			return `genepedia:profile-editor:tab:${scope}`;
		}

		#readStoredTab() {
			try {
				const stored = String(sessionStorage.getItem(this.#tabStorageKey()) || "").trim();
				return EDIT_TAB_NAMES.has(stored) ? stored : "";
			} catch (error) {
				return "";
			}
		}

		#storeActiveTab(name) {
			if (!EDIT_TAB_NAMES.has(name)) return;
			try {
				sessionStorage.setItem(this.#tabStorageKey(), name);
			} catch (error) {
				// Ignore storage failures so tab switching keeps working.
			}
		}

		#activate(name, { persist = true } = {}) {
			name = EDIT_TAB_NAMES.has(name) ? name : "profile";
			this.__activeTab = name;
			if (persist) {
				this.#storeActiveTab(name);
			}
			this.querySelectorAll(".profile-edit__tab").forEach((tab) => {
				const active = tab.dataset.editTab === name;
				tab.classList.toggle("is-active", active);
				tab.setAttribute("aria-selected", active ? "true" : "false");
			});
			this.querySelectorAll(".profile-edit__panel").forEach((panel) => {
				panel.hidden = panel.dataset.editPanel !== name;
			});
			// Returning to the Page tab: refresh the floated infobox so any
			// edits made on the Identity tab are reflected immediately.
			if (name === "profile" && typeof this.__pageEditor?.refreshInfoboxPreview === "function") {
				this.__pageEditor.refreshInfoboxPreview();
			}
		}

		#focusRequiredNameField() {
			const first = this.__infobox?.querySelector?.('[data-field="firstName"]');
			const last = this.__infobox?.querySelector?.('[data-field="lastName"]');
			(first || last)?.focus();
		}

		#bindSave() {
			this.querySelector(".profile-edit__save")?.addEventListener("click", () => this.#save());
			// Ctrl/Cmd+S saves from anywhere on the page.
			document.addEventListener("keydown", (event) => {
				if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					this.#save();
				}
			});
		}

		#bindEvents() {
			// Dirty signals from either editor.
			this.addEventListener("profile-page-dirty-change", () => this.#refreshDirtyState());
			document.addEventListener("profile-editor-dirty-change", () => {
				this.#refreshDirtyState();
				// The infobox editor fires this once it finishes loading; refresh the
				// floated preview when the Page tab is active so the infobox shows
				// without needing to visit the Identity tab first.
				if (this.__activeTab === "profile") {
					this.__pageEditor?.refreshInfoboxPreview?.();
				}
			});
			// The infobox form's own submit/Enter asks us to save.
			document.addEventListener("profile-editor-save-request", () => this.#save());
			// Clicking the floated infobox in the WYSIWYG jumps to the Identity tab.
			document.addEventListener("profile-editor-activate-tab", (event) => {
				const tab = event.detail?.tab;
				if (tab) this.#activate(tab);
			});
			// Keep the WYSIWYG title in step with the infobox display name.
			document.addEventListener("profile-display-name-change", (event) => {
				const name = event.detail?.name;
				this.__pageEditor?.setDisplayName?.(name);
				if (!name) return;
				this.#setBreadcrumbCurrent(name, this.__isDraftProfile
					? {}
					: { href: resolveSiteUrl(`people/${PERSON_ID}/index.html`) });
			});
		}

		#onBeforeUnload = (event) => {
			if (this.#isDirty()) {
				event.preventDefault();
				event.returnValue = "";
			}
		};

		#isInfoboxDirty() {
			if (!Array.isArray(window.__extraDirtyStateProviders)) return false;
			return window.__extraDirtyStateProviders.some((fn) => {
				try {
					return Boolean(fn());
				} catch (error) {
					return false;
				}
			});
		}

		#isDirty() {
			return Boolean(this.__pageEditor?.isDirty?.())
				|| Boolean(this.__pageEditor?.hasPendingInfoboxStructureChange?.())
				|| this.#isInfoboxDirty();
		}

		// Public hook used by the infobox editor to flag dirty changes.
		refreshDirtyState() {
			this.#refreshDirtyState();
		}

		#refreshDirtyState() {
			const saveBtn = this.querySelector(".profile-edit__save");
			if (saveBtn && !this.__saving) {
				saveBtn.disabled = !this.#isDirty();
			}
		}

		#setStatus(message, type = "info", html = "") {
			const status = this.querySelector(".profile-edit__status");
			if (!status) return;
			if (html) status.innerHTML = html;
			else status.textContent = message || "";
			status.dataset.type = type;
			status.hidden = !message && !html;
		}

		async #collectExtraFiles() {
			if (!Array.isArray(window.__extraPublishFileProviders) || !window.__extraPublishFileProviders.length) {
				return [];
			}

			const byPath = new Map();
			for (const fn of window.__extraPublishFileProviders) {
				const provided = await fn();
				const files = Array.isArray(provided) ? provided : [];
				files
					.filter(Boolean)
					.map((file) => ({ path: String(file.path || ""), content: String(file.content || "") }))
					.filter((file) => file.path && file.content)
					.forEach((file) => byPath.set(file.path, file));
			}

			return Array.from(byPath.values());
		}

		async #getCurrentUser() {
			const stored = readStoredUser();
			if (stored?.login) {
				return stored;
			}

			const endpoint = resolveGitHubApiUrl("github-session.php");
			if (!endpoint) {
				return null;
			}

			try {
				const response = await fetch(endpoint, gitHubFetchInit({ cache: "no-store" }));
				const payload = await response.json().catch(() => null);
				if (response.ok && payload?.authenticated && payload.user) {
					return normalizeUser(payload.user);
				}
			} catch (error) {
				return null;
			}

			return null;
		}

		async #loadPeopleRegistry() {
			try {
				if (window.PeopleRegistry?.loadPeopleRegistry) {
					return await window.PeopleRegistry.loadPeopleRegistry({ refresh: true });
				}
				const response = await fetch(resolveSiteUrl("people/people.json"), { cache: "no-store" });
				const payload = await response.json();
				return Array.isArray(payload?.people) ? payload.people : [];
			} catch (error) {
				return [];
			}
		}

		async #loadProfileConfig(personId) {
			try {
				const response = await fetch(resolveSiteUrl(peopleDbOwnershipPath(personId)), { cache: "no-store" });
				if (!response.ok) return null;
				const payload = await response.json();
				return payload && typeof payload === "object" ? payload : null;
			} catch (error) {
				return null;
			}
		}

		#profileData() {
			return this.__infobox?.getProfileData?.() || {};
		}

		#selfProfileName() {
			return displayNameFromProfileData(this.#profileData());
		}

		async #findSelfProfileMatches(profileData, user) {
			const people = await this.#loadPeopleRegistry();
			const scored = people
				.map((person) => {
					const match = scoreSelfProfileCandidate(person, profileData);
					return match ? { person, ...match } : null;
				})
				.filter(Boolean)
				.sort((left, right) => right.score - left.score)
				.slice(0, SELF_PROFILE_MATCH_LIMIT);

			const login = String(user?.login || "").trim().toLowerCase();
			return Promise.all(scored.map(async (candidate) => {
				const id = String(candidate.person?.id || "").trim();
				const config = await this.#loadProfileConfig(id);
				const claimedBy = String(config?.owner?.githubLogin || "").trim();
				return {
					...candidate,
					id,
					name: [candidate.person?.firstName, candidate.person?.lastName].filter(Boolean).join(" ").trim() || `Profile ${id}`,
					claimedBy,
					claimIsCurrentUser: Boolean(login && claimedBy && claimedBy.toLowerCase() === login),
				};
			}));
		}

		#hideClaimReview() {
			this.__pendingSelfProfileFiles = null;
			this.__pendingSelfProfileUser = null;
			this.__pendingSelfProfileData = null;
			this.__selfProfileMatchesReviewed = false;
			const review = this.querySelector(".profile-edit__claim-review");
			if (review) review.hidden = true;
			const panels = this.querySelector(".profile-edit__panels");
			if (panels) panels.hidden = false;
			const tabs = this.querySelector(".profile-edit__tabs");
			if (tabs) tabs.hidden = false;
			this.#refreshDirtyState();
		}

		#renderClaimReview(matches, files, profileData, user) {
			this.__pendingSelfProfileFiles = files;
			this.__pendingSelfProfileUser = user;
			this.__pendingSelfProfileData = profileData;

			const panels = this.querySelector(".profile-edit__panels");
			const tabs = this.querySelector(".profile-edit__tabs");
			if (panels) panels.hidden = true;
			if (tabs) tabs.hidden = true;

			let review = this.querySelector(".profile-edit__claim-review");
			if (!review) {
				review = document.createElement("section");
				review.className = "profile-edit__claim-review";
				review.setAttribute("aria-live", "polite");
				panels?.before(review);
			}

			const cards = matches.map((match) => {
				const years = [match.person?.birthYear, match.person?.deathYear].filter(Boolean).join(" - ");
				const profileUrl = resolveSiteUrl(`people/${match.id}/profile.html`);
				const claimedElsewhere = match.claimedBy && !match.claimIsCurrentUser;
				const claimText = match.claimIsCurrentUser
					? "Already claimed by you"
					: claimedElsewhere
						? `Claimed by @${match.claimedBy}`
						: "This is me";
				return `
					<article class="profile-edit__match-card">
						<div>
							<h2><a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match.name)}</a></h2>
							<p>#${escapeHtml(match.id)}${years ? ` - ${escapeHtml(years)}` : ""}</p>
					<p>${escapeHtml(match.reasons.join(", ") || "possible profile match")}</p>
						</div>
						<button type="button" class="profile-edit__match-claim" data-action="claim-profile" data-person-id="${escapeHtml(match.id)}" ${claimedElsewhere ? "disabled" : ""}>${escapeHtml(claimText)}</button>
					</article>
				`;
			}).join("");

			review.hidden = false;
			review.innerHTML = `
				<div class="profile-edit__claim-head">
					<h1>Is one of these profiles you?</h1>
					<p>We found existing profiles that look similar to the details you entered.</p>
				</div>
				<div class="profile-edit__match-list">${cards}</div>
				<div class="profile-edit__claim-actions">
					<button type="button" class="page-editor__button page-editor__button--save" data-action="create-self-profile">
						<i class="bi bi-person-plus" aria-hidden="true"></i>
						<span>None of these are me</span>
					</button>
					<button type="button" class="page-editor__button" data-action="back-to-profile-edit">
						<i class="bi bi-arrow-left" aria-hidden="true"></i>
						<span>Back to editing</span>
					</button>
				</div>
			`;

			review.querySelectorAll('[data-action="claim-profile"]').forEach((button) => {
				button.addEventListener("click", () => this.#claimExistingSelfProfile(button.dataset.personId));
			});
			review.querySelector('[data-action="create-self-profile"]')?.addEventListener("click", () => {
				this.#commitNewSelfProfile(files, profileData, user);
			});
			review.querySelector('[data-action="back-to-profile-edit"]')?.addEventListener("click", () => this.#hideClaimReview());
			this.#setStatus("Choose an existing profile to claim, or create a new one.", "info");
		}

		async #buildPeopleRegistryFile(profileData) {
			const people = await this.#loadPeopleRegistry();
			const entry = registryEntryFromProfileData(PERSON_ID, profileData);
			const nextPeople = people
				.filter((person) => String(person?.id || "") !== PERSON_ID)
				.concat(entry)
				.sort((left, right) => String(left.id).localeCompare(String(right.id), undefined, { numeric: true }));

			return {
				path: "people/people.json",
				content: `${JSON.stringify({ generatedAt: new Date().toISOString(), people: nextPeople }, null, 2)}\n`,
			};
		}

		async #buildNewProfileFiles(files, profileData, user, { claimSelf = true } = {}) {
			const byPath = new Map();
			files.forEach((file) => {
				if (file?.path) byPath.set(file.path, { path: file.path, content: String(file.content || "") });
			});

			// Ownership lives in the database; the SEO shell (index.html) and the
			// canonical record (persons/<id>.json) come from the infobox editor, and
			// the prose (data/profile.html) from the page editor.
			const ownershipPath = peopleDbOwnershipPath(PERSON_ID);
			let existingOwnership = {};
			const existingOwnershipFile = byPath.get(ownershipPath);
			if (existingOwnershipFile?.content) {
				try {
					const parsed = JSON.parse(existingOwnershipFile.content);
					existingOwnership = parsed && typeof parsed === "object" ? parsed : {};
				} catch (error) {
					existingOwnership = {};
				}
			}
			byPath.set(ownershipPath, {
				path: ownershipPath,
				content: `${JSON.stringify({
					...existingOwnership,
					...createProfileConfig(PERSON_ID, profileData, user, {
						claimSelf,
						privacy: existingOwnership?.privacy,
					}),
				}, null, 2)}\n`,
			});

			const peopleRegistryFile = await this.#buildPeopleRegistryFile(profileData);
			byPath.set(peopleRegistryFile.path, peopleRegistryFile);

			return Array.from(byPath.values());
		}

		#resolveSelfProfileTarget(personId) {
			if (SELF_RETURN_TARGET === "edit") {
				const url = new URL(resolveSiteUrl("people/edit.html"), window.location.href);
				url.searchParams.set("person", personId);
				return url.href;
			}

			const profileHref = resolveSiteUrl(`people/${personId}/${window.location.protocol === 'file:' ? 'index.html' : ''}`);
			const url = new URL(profileHref, window.location.href);
			if (SELF_RETURN_TARGET === "tree") {
				url.hash = "tree";
			}
			return url.href;
		}

		async #claimExistingSelfProfile(personId) {
			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Claiming profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "claim",
						person_id: personId,
						commit_message: `Claim profile ${personId}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub (site header) to claim your profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Claim failed (${response.status}).`, "error");
					}
					return;
				}

				this.#setStatus("Profile claimed. Opening it now…", "success");
				window.location.assign(this.#resolveSelfProfileTarget(String(payload.person || personId)));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not claim that profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #commitNewSelfProfile(files, profileData, user) {
			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			const publishFiles = await this.#buildNewProfileFiles(files, profileData, user, { claimSelf: true });
			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Saving profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "create",
						person_id: PERSON_ID,
						claim_self: true,
						files: publishFiles,
						commit_message: `Create profile: ${this.#selfProfileName()}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("Sign in with GitHub (site header) to create your profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				this.__pageEditor?.setSavedBaseline?.();
				if (Array.isArray(window.__extraDirtyStateResetCallbacks)) {
					window.__extraDirtyStateResetCallbacks.forEach((fn) => {
						try {
							fn();
						} catch (error) {
							/* ignore */
						}
					});
				}
				this.#setStatus("Profile saved. Opening it now…", "success");
				window.location.assign(this.#resolveSelfProfileTarget(String(payload.person || PERSON_ID)));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save your profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #saveSelfProfile(files) {
			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			const user = await this.#getCurrentUser();
			if (!user?.login) {
				this.#setStatus("Sign in with GitHub (site header) before saving your profile.", "error");
				return;
			}

			if (!this.__selfProfileMatchesReviewed) {
				this.#setStatus("Checking for existing profiles…", "info");
				const matches = await this.#findSelfProfileMatches(profileData, user);
				if (matches.length) {
					this.__selfProfileMatchesReviewed = true;
					this.#renderClaimReview(matches, files, profileData, user);
					return;
				}
			}

			await this.#commitNewSelfProfile(files, profileData, user);
		}

		async #checkProfileExists() {
			const people = await this.#loadPeopleRegistry();
			if (people.some((person) => String(person?.id || "") === PERSON_ID)) {
				return true;
			}

			try {
				const response = await fetch(resolveSiteUrl(peopleDbOwnershipPath(PERSON_ID)), { cache: "no-store" });
				if (!response.ok) return false;
				const config = await response.json();
				return Boolean(config && typeof config === "object");
			} catch (error) {
				return false;
			}
		}

		async #commitNewProfile(files) {
			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			const user = await this.#getCurrentUser();
			if (!user?.login) {
				this.#setStatus("You must be logged in to create a new profile.", "error");
				return;
			}

			const endpoint = resolveGitHubApiUrl("github-self-profile.php");
			if (!endpoint) {
				this.#setStatus("The profile service is not configured.", "error");
				return;
			}

			const publishFiles = await this.#buildNewProfileFiles(files, profileData, user, { claimSelf: false });
			this.__saving = true;
			this.#refreshDirtyState();
			this.#setStatus("Saving new profile…", "info");

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "create",
						person_id: PERSON_ID,
						claim_self: false,
						files: publishFiles,
						commit_message: `Create profile: ${displayNameFromProfileData(profileData)}`,
					}),
				}));
				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("You must be logged in to create a new profile.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				this.__pageEditor?.setSavedBaseline?.();
				if (Array.isArray(window.__extraDirtyStateResetCallbacks)) {
					window.__extraDirtyStateResetCallbacks.forEach((fn) => {
						try {
							fn();
						} catch (error) {
							/* ignore */
						}
					});
				}
				this.#setStatus("New profile saved.", "success");
				window.location.assign(resolveSiteUrl(`people/${String(payload.person || PERSON_ID)}/profile.html`));
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save the new profile right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}

		async #prepareInfoboxForPublish() {
			if (!this.__infobox?.prepareForPublish) return;
			await this.__infobox.prepareForPublish();
		}

		async #save() {
			if (this.__saving || !VALID_ID) return;
			if (!this.#isDirty()) {
				this.#setStatus("Nothing to save yet.", "info");
				return;
			}

			const profileData = this.#profileData();
			if (!hasRequiredProfileName(profileData)) {
				this.#activate("infobox");
				this.#focusRequiredNameField();
				this.#setStatus("Enter a first name or last name before saving.", "error");
				return;
			}

			try {
				await this.#prepareInfoboxForPublish();
			} catch (error) {
				console.error(error);
				this.#setStatus(error?.message || "Could not upload profile photo.", "error");
				return;
			}

			const displayName = displayNameFromProfileData(profileData);
			if (displayName) {
				this.__pageEditor?.setDisplayName?.(displayName);
				this.#setBreadcrumbCurrent(displayName, this.__isDraftProfile
					? {}
					: { href: resolveSiteUrl(`people/${PERSON_ID}/index.html`) });
			}

			const endpoint = SELF_PROFILE_MODE ? "" : resolveGitHubApiUrl("github-submit-page-edit.php");
			if (!SELF_PROFILE_MODE && !endpoint) {
				this.#setStatus("The publishing service is not configured.", "error");
				return;
			}

			// Save only what changed: prose edits (or adopting the canonical
			// infobox <include>) write profile.html; infobox edits write
			// profile-table.html / the GEDCOM. Keeps each save to a minimal diff.
			const files = [];
			const wantsProfileHtml = SELF_PROFILE_MODE
				|| Boolean(this.__pageEditor?.isDirty?.())
				|| Boolean(this.__pageEditor?.hasPendingInfoboxStructureChange?.())
				|| Boolean(this.__pageEditor?.hasDisplayNameChange?.());
			if (wantsProfileHtml) {
				const mainFile = this.__pageEditor.getPublishFile?.();
				if (!mainFile?.content) {
					this.#setStatus("Could not read the profile content.", "error");
					return;
				}
				files.push(mainFile);
			}

			// The infobox editor's fragment takes precedence for profile-table.html.
			if (this.#isInfoboxDirty() || SELF_PROFILE_MODE) {
				let extras = [];
				try {
					extras = await this.#collectExtraFiles();
				} catch (error) {
					console.error(error);
					this.#setStatus(error?.message || "Could not prepare the profile changes.", "error");
					return;
				}
				extras.forEach((file) => {
					if (!files.some((existing) => existing.path === file.path)) files.push(file);
				});
			}

			// Fill in profile-table.html when converting a legacy inline identity
			// and the infobox editor isn't the one writing it this time.
			if (wantsProfileHtml) {
				const migration = this.__pageEditor.getInfoboxMigrationFile?.();
				if (migration && !files.some((existing) => existing.path === migration.path)) {
					files.push(migration);
				}
			}

			if (!files.length) {
				this.#setStatus("Nothing to save yet.", "info");
				return;
			}

			if (SELF_PROFILE_MODE) {
				await this.#saveSelfProfile(files);
				return;
			}

			if (!await this.#checkProfileExists()) {
				await this.#commitNewProfile(files);
				return;
			}

			const saveBtn = this.querySelector(".profile-edit__save");
			this.__saving = true;
			if (saveBtn) saveBtn.disabled = true;
			this.#setStatus("Saving changes…", "info");

			const name = this.querySelector(".profile-edit__breadcrumb-current")?.textContent?.trim() || PERSON_ID;
			const commitMessage = `Update profile: ${name}`;

			try {
				const response = await fetch(endpoint, gitHubFetchInit({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						files,
						commit_message: commitMessage,
						pr_title: commitMessage,
						pr_body: "",
					}),
				}));

				const payload = await response.json().catch(() => null);

				if (!response.ok || !payload?.ok) {
					if (response.status === 401 || payload?.error === "authentication_required") {
						this.#setStatus("You must be signed in to save changes.", "error");
					} else {
						this.#setStatus(payload?.message || `Save failed (${response.status}).`, "error");
					}
					return;
				}

				// Reset baselines so the editor is clean again.
				this.__pageEditor?.setSavedBaseline?.();
				if (Array.isArray(window.__extraDirtyStateResetCallbacks)) {
					window.__extraDirtyStateResetCallbacks.forEach((fn) => {
						try {
							fn();
						} catch (error) {
							/* ignore */
						}
					});
				}

				const prUrl = payload.pull_request?.url || "";
				const prNumber = payload.pull_request?.number;
				if (prUrl) {
					this.#setStatus("", "success",
						`Saved — pull request <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener noreferrer">#${escapeHtml(String(prNumber || ""))}</a> created.`);
				} else {
					this.#setStatus("Your changes were saved.", "success");
				}
			} catch (error) {
				console.error(error);
				this.#setStatus("Could not save right now. Please try again.", "error");
			} finally {
				this.__saving = false;
				this.#refreshDirtyState();
			}
		}
	}

	if (!customElements.get("profile-editor")) {
		customElements.define("profile-editor", ProfileEditor);
	}
})();
