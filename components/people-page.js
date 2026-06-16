const PEOPLE_PAGE_TEMPLATE = String.raw`
<style>
people-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  box-sizing: border-box;
  --page-toolbar-fg: #eaecf0;
  --page-toolbar-muted: #a7adb4;
  --page-toolbar-border: rgba(255, 255, 255, 0.12);
  --page-toolbar-link: #6b9eff;
  --page-toolbar-button-hover: rgba(255, 255, 255, 0.08);
  --page-toolbar-dropdown-bg: #313438;
  --page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

body:not(.theme-dark) people-page {
  --page-toolbar-fg: #202122;
  --page-toolbar-muted: #54595d;
  --page-toolbar-border: rgba(0, 0, 0, 0.12);
  --page-toolbar-link: #3366cc;
  --page-toolbar-button-hover: rgba(0, 0, 0, 0.05);
  --page-toolbar-dropdown-bg: #ffffff;
  --page-toolbar-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.people-page > .people-page {
  width: 100%;
  flex-shrink: 0;
  color: var(--page-toolbar-fg);
  border-bottom: 1px solid var(--page-toolbar-border);
  box-sizing: border-box;
}

.people-page__content {
  flex: 1 1 auto;
  width: 100%;
  max-width: var(--site-content-max-width, 90rem);
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
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

.people-page__content aside {
  float: right;
  clear: right;
  position: relative;
  z-index: 1;
  width: fit-content;
  max-width: min(50%, 100%);
  margin: 0 0 1rem 1.25rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f8f9fa;
  font-size: 0.875rem;
  line-height: 1.45;
  box-sizing: border-box;
}

body.theme-dark .people-page__content aside {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__content aside table {
  width: max-content;
  max-width: 100%;
  border-collapse: collapse;
  margin: 0;
}

.people-page__content aside table img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.125rem;
}

.people-page__content aside th,
.people-page__content aside td {
  padding: 0.4rem 0;
  border: 0;
  vertical-align: top;
  text-align: left;
}

.people-page__content aside tr:first-child th,
.people-page__content aside tr:first-child td {
  padding-top: 0;
  padding-bottom: 0.5rem;
}

.people-page__content aside th {
  width: 1%;
  padding-right: 1rem;
  white-space: nowrap;
  font-weight: 600;
  color: var(--page-toolbar-muted);
}

.people-page__content aside td {
  color: inherit;
}

.people-page__content aside td p {
  margin: 0 0 0.55rem;
}

.people-page__content aside td p:last-child {
  margin-bottom: 0;
}

.people-page__content aside + p {
  font-size: 1.05rem;
}

.people-page__content .ppe-profile-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.people-page__content .ppe-profile-columns--1 {
  grid-template-columns: 1fr;
}

.people-page__content .ppe-profile-columns--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.people-page__content .ppe-profile-columns--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.people-page__content .ppe-profile-column {
  min-width: 0;
}

.people-page__content .ppe-profile-column > :first-child {
  margin-top: 0;
}

.people-page__content .ppe-profile-column > :last-child {
  margin-bottom: 0;
}

.people-page__content .ppe-profile-columns--cards > .ppe-profile-column {
  padding: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.02);
}

body.theme-dark .people-page__content .ppe-profile-columns--cards > .ppe-profile-column {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.people-page__content .ppe-profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  margin: 1rem 0;
}

.people-page__content .ppe-profile-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.2rem;
  padding: 0.42rem 0.8rem;
  border: 1px solid rgba(51, 102, 204, 0.4);
  border-radius: 0.2rem;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.25;
  text-decoration: none;
  box-sizing: border-box;
}

.people-page__content .ppe-profile-button--primary {
  border-color: #3366cc;
  background: #3366cc;
  color: #ffffff;
}

.people-page__content .ppe-profile-button--secondary {
  background: #ffffff;
  color: #3366cc;
}

.people-page__content .ppe-profile-button--quiet {
  border-color: transparent;
  background: transparent;
  color: #3366cc;
}

body.theme-dark .people-page__content .ppe-profile-button--primary {
  border-color: #6b9eff;
  background: #6b9eff;
  color: #101418;
}

body.theme-dark .people-page__content .ppe-profile-button--secondary {
  border-color: rgba(107, 158, 255, 0.5);
  background: #101418;
  color: #6b9eff;
}

body.theme-dark .people-page__content .ppe-profile-button--quiet {
  color: #6b9eff;
}

.people-page__content .ppe-profile-divider {
  border: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.18);
}

.people-page__content .ppe-profile-divider--dashed {
  border-top-style: dashed;
}

.people-page__content .ppe-profile-divider--dotted {
  border-top-style: dotted;
}

.people-page__content .ppe-profile-divider--compact {
  margin: 0.7rem 0;
}

.people-page__content .ppe-profile-divider--normal {
  margin: 1.25rem 0;
}

.people-page__content .ppe-profile-divider--loose {
  margin: 2rem 0;
}

body.theme-dark .people-page__content .ppe-profile-divider {
  border-top-color: rgba(255, 255, 255, 0.22);
}

.people-page__content .ppe-profile-spacer {
  display: block;
  pointer-events: none;
}

.people-page__content .ppe-profile-spacer--small {
  height: 0.75rem;
}

.people-page__content .ppe-profile-spacer--medium {
  height: 1.5rem;
}

.people-page__content .ppe-profile-spacer--large {
  height: 2.5rem;
}

.people-page__content .ppe-profile-spacer--xlarge {
  height: 4rem;
}

.people-page__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.people-page__gallery figure {
  margin: 0;
}

.people-page__gallery img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  box-sizing: border-box;
}

body.theme-dark .people-page__gallery img {
  border-color: rgba(255, 255, 255, 0.12);
}

.people-page__gallery figcaption {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: var(--page-toolbar-muted);
  line-height: 1.35;
  word-break: break-word;
}

.people-page__gallery-empty {
  margin: 1rem 0 0;
  color: var(--page-toolbar-muted);
}

.people-page__content figure.ppe-profile-chart {
  margin: 1rem 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.people-page__content:has(> aside) > figure.ppe-profile-chart {
  max-width: calc(100% - min(50%, 20rem) - 1.25rem);
}

.people-page__content figure.ppe-profile-chart figcaption {
  margin-top: 0.4rem;
  font-size: 0.8125rem;
  color: var(--page-toolbar-muted);
  line-height: 1.35;
}

.ppe-profile-chart__svg {
  display: block;
  width: 100%;
  height: auto;
}

.ppe-chart-axis {
  stroke: rgba(0, 0, 0, 0.22);
  stroke-width: 1.25;
}

.ppe-chart-grid {
  stroke: rgba(0, 0, 0, 0.08);
  stroke-width: 1;
}

.ppe-chart-line {
  stroke: #3366cc;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ppe-chart-point {
  stroke: #ffffff;
  stroke-width: 1.5;
}

.ppe-chart-label,
.ppe-chart-legend {
  font-size: 11px;
  fill: #54595d;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.ppe-chart-title {
  font-size: 13px;
  font-weight: 600;
  fill: #202122;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark .ppe-chart-axis {
  stroke: rgba(255, 255, 255, 0.24);
}

body.theme-dark .ppe-chart-grid {
  stroke: rgba(255, 255, 255, 0.08);
}

body.theme-dark .ppe-chart-line {
  stroke: #6b9eff;
}

body.theme-dark .ppe-chart-point {
  stroke: #15181d;
}

body.theme-dark .ppe-chart-label,
body.theme-dark .ppe-chart-legend {
  fill: #a7adb4;
}

body.theme-dark .ppe-chart-title {
  fill: #eaecf0;
}

.people-page__tree-frame {
  display: block;
  width: 100%;
  height: clamp(26rem, 72vh, 56rem);
  border: 0;
  background: transparent;
  box-sizing: border-box;
}

.people-page__tree-hint {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--page-toolbar-muted);
}

.people-page__tree-hint a {
  white-space: nowrap;
}

.people-page__status-note {
  margin: 0.75rem 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(51, 102, 204, 0.4);
  border-radius: 0.125rem;
  background: rgba(51, 102, 204, 0.08);
  font-size: 0.9rem;
}

.people-page__status-note[data-type="error"] {
  border-color: rgba(208, 44, 63, 0.5);
  background: rgba(208, 44, 63, 0.08);
}

.people-page__status-note[data-type="success"] {
  border-color: rgba(30, 140, 70, 0.5);
  background: rgba(30, 140, 70, 0.08);
}

/* Private living profiles: the real content is still rendered, but everything
   except the overlay is blurred and made non-interactive for visitors who lack
   access. The name lives outside the content area, so it stays readable. */
.people-page__content--private {
  position: relative;
  min-height: 20rem;
}

.people-page__content--private > *:not(.people-page__privacy-overlay) {
  filter: blur(0.5rem);
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.people-page__privacy-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1rem;
  box-sizing: border-box;
  background: rgba(248, 249, 251, 0.55);
}

.people-page__privacy-overlay-card {
  position: sticky;
  top: 2.5rem;
  max-width: 34rem;
  width: 100%;
  padding: 1.4rem 1.5rem;
  border: 1px solid rgba(51, 102, 204, 0.24);
  border-radius: 0.6rem;
  background: var(--page-toolbar-bg, #ffffff);
  box-shadow: 0 0.5rem 1.75rem rgba(0, 0, 0, 0.16);
  text-align: center;
  box-sizing: border-box;
}

.people-page__privacy-overlay-badge {
  display: inline-block;
  margin-bottom: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(32, 33, 34, 0.82);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.people-page__privacy-overlay-title {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.people-page__privacy-overlay-copy {
  margin: 0 0 0.5rem;
  color: var(--page-toolbar-muted);
}

.people-page__privacy-overlay-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--page-toolbar-muted);
}

body.theme-dark .people-page__privacy-overlay {
  background: rgba(16, 17, 19, 0.55);
}

body.theme-dark .people-page__privacy-overlay-card {
  border-color: rgba(107, 158, 255, 0.28);
  background: #1f2125;
}

body.theme-dark .people-page__privacy-overlay-badge {
  background: rgba(234, 236, 240, 0.2);
  color: #eaecf0;
}

.people-page__media-manage {
  margin: 1rem 0 1.5rem;
  padding: 0.85rem 1rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.125rem;
  background: #f8f9fa;
  box-sizing: border-box;
}

body.theme-dark .people-page__media-manage {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__media-manage.is-dragover {
  border-color: #3366cc;
  background: rgba(51, 102, 204, 0.06);
}

.people-page__media-manage-title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.people-page__media-manage-hint {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--page-toolbar-muted);
}

.people-page__media-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.people-page__media-link-row {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  width: 100%;
}

.people-page__media-link-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  height: 2.4rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid #a2a9b1;
  border-radius: 0.125rem;
  background: #ffffff;
  color: #202122;
  font: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
}

body.theme-dark .people-page__media-link-input {
  border-color: rgba(255, 255, 255, 0.3);
  background: #101418;
  color: #eaecf0;
}

.people-page__media-link-input:focus {
  outline: none;
  border-color: #3366cc;
  box-shadow: inset 0 0 0 1px #3366cc;
}

.people-page__media-link-input::placeholder {
  color: var(--page-toolbar-muted);
}

.people-page__media-link-add {
  flex: 0 0 auto;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0.35rem 0.85rem;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .people-page__media-link-row {
    flex-wrap: wrap;
  }

  .people-page__media-link-add {
    width: 100%;
  }
}

/* Multi-file staging queue */
.people-page__media-staging {
  margin-top: 0.85rem;
}

.people-page__media-queue {
  list-style: none;
  margin: 0 0 0.85rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.people-page__media-queue-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  background: #ffffff;
}

body.theme-dark .people-page__media-queue-item {
  border-color: rgba(255, 255, 255, 0.12);
  background: #101418;
}

.people-page__media-queue-thumb {
  flex: 0 0 auto;
  width: 3.5rem;
  height: 3.5rem;
  object-fit: cover;
  border-radius: 0.125rem;
  background: rgba(0, 0, 0, 0.05);
}

.people-page__media-queue-thumb--file {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  text-align: center;
}

.people-page__media-queue-thumb--file .people-page__media-file-icon {
  font-size: 1.4rem;
}

.people-page__media-queue-info {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.people-page__media-queue-name {
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.people-page__media-queue-note {
  font-size: 0.75rem;
  color: var(--page-toolbar-muted);
}

.people-page__media-queue-caption {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #a2a9b1;
  border-radius: 0.125rem;
  font: inherit;
  font-size: 0.85rem;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #202122;
  box-sizing: border-box;
}

body.theme-dark .people-page__media-queue-caption {
  border-color: rgba(255, 255, 255, 0.3);
  background: #1a1e24;
  color: #eaecf0;
}

.people-page__media-queue-caption:focus {
  outline: none;
  border-color: #3366cc;
  box-shadow: inset 0 0 0 1px #3366cc;
}

.people-page__media-queue-remove {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
  border: 0;
  border-radius: 0.125rem;
  background: transparent;
  color: var(--page-toolbar-muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.people-page__media-queue-remove:hover {
  background: rgba(208, 44, 63, 0.1);
  color: #d02c3f;
}

.people-page__button-primary,
.people-page__button-secondary,
.people-page__button-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.125rem;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  text-decoration: none;
  box-sizing: border-box;
}

.people-page__button-primary {
  background: #3366cc;
  border-color: #3366cc;
  color: #ffffff;
}

.people-page__button-primary:hover {
  background: #2a4b8d;
  border-color: #2a4b8d;
}

.people-page__button-primary:disabled {
  opacity: 0.6;
  cursor: progress;
}

.people-page__button-secondary {
  background: #f8f9fa;
  border-color: #a2a9b1;
  color: #202122;
}

.people-page__button-secondary:hover {
  background: #ffffff;
}

body.theme-dark .people-page__button-secondary {
  background: #27292d;
  border-color: rgba(255, 255, 255, 0.3);
  color: #eaecf0;
}

body.theme-dark .people-page__button-secondary:hover {
  background: #313438;
}

.people-page__button-danger {
  background: transparent;
  border-color: rgba(208, 44, 63, 0.6);
  color: #d02c3f;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
}

.people-page__button-danger:hover {
  background: rgba(208, 44, 63, 0.08);
}

.people-page__gallery figure {
  position: relative;
  margin: 0;
}

/* Click-or-drag upload dropzone */
.people-page__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  padding: 1.75rem 1rem;
  border: 2px dashed rgba(0, 0, 0, 0.25);
  border-radius: 0.25rem;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

body.theme-dark .people-page__dropzone {
  border-color: rgba(255, 255, 255, 0.25);
}

.people-page__dropzone:hover,
.people-page__dropzone.is-dragover {
  border-color: #3366cc;
  background: rgba(51, 102, 204, 0.06);
}

.people-page__dropzone-icon {
  font-size: 1.9rem;
  color: #3366cc;
  line-height: 1;
}

.people-page__dropzone-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.people-page__dropzone-hint {
  font-size: 0.8rem;
  color: var(--page-toolbar-muted);
}

/* Pending review section heading */
.people-page__media-section {
  margin-bottom: 1.5rem;
}

.people-page__media-section-title {
  margin: 0 0 0.75rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  font-size: 1rem;
  font-weight: 600;
}

body.theme-dark .people-page__media-section-title {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

/* Gallery item with hover actions */
.people-page__media-item {
  margin: 0;
}

.people-page__media-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.125rem;
  background: rgba(0, 0, 0, 0.04);
  cursor: zoom-in;
  box-sizing: border-box;
}

body.theme-dark .people-page__media-thumb {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.people-page__media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border: 0;
  border-radius: 0;
}

.people-page__media-thumb--file,
.people-page__media-thumb--upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.9rem;
  text-align: center;
}

.people-page__media-thumb--file {
  cursor: pointer;
}

.people-page__media-thumb--upload {
  border-width: 2px;
  border-style: dashed;
  background: transparent;
  cursor: pointer;
}

.people-page__media-thumb--upload:hover,
.people-page__media-thumb--upload:focus-within,
.people-page__media-thumb--upload.is-dragover {
  border-color: #3366cc;
  background: rgba(51, 102, 204, 0.06);
}

.people-page__media-file-icon {
  font-size: 2.2rem;
  line-height: 1;
  color: var(--page-toolbar-muted);
}

.people-page__media-thumb--pdf .people-page__media-file-icon {
  color: #d02c3f;
}

.people-page__media-thumb--upload .people-page__media-file-icon {
  color: #3366cc;
}

.people-page__media-file-ext {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--page-toolbar-muted);
}

.people-page__media-file-label {
  font-size: 0.84rem;
  line-height: 1.35;
}

.people-page__media-upload-copy {
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--page-toolbar-muted);
}

.people-page__media-item.is-pending .people-page__media-thumb,
.people-page__media-item.is-removing .people-page__media-thumb {
  cursor: default;
}

.people-page__media-hover {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: flex;
  gap: 0.35rem;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.people-page__media-thumb:hover .people-page__media-hover,
.people-page__media-thumb:focus-within .people-page__media-hover {
  opacity: 1;
}

.people-page__media-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.125rem;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  font-size: 0.95rem;
  cursor: pointer;
  backdrop-filter: blur(2px);
}

.people-page__media-icon:hover {
  background: rgba(0, 0, 0, 0.8);
}

.people-page__media-icon--danger:hover {
  background: #d02c3f;
}

.people-page__media-badge {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  padding: 0.15rem 0.45rem;
  border-radius: 0.125rem;
  background: rgba(51, 102, 204, 0.9);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 600;
}

.people-page__media-badge--warn {
  background: rgba(208, 44, 63, 0.9);
}

.people-page__media-by {
  display: block;
  font-size: 0.78rem;
  color: var(--page-toolbar-muted);
}

.people-page__pending-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.people-page__pending-note {
  font-size: 0.8rem;
  color: var(--page-toolbar-muted);
}

/* Lightbox */
.people-page__lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2.5rem 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.82);
  box-sizing: border-box;
}

.people-page__lightbox[hidden] {
  display: none;
}

.people-page__lightbox-close {
  position: absolute;
  top: 0.85rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 0.125rem;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 1.1rem;
  cursor: pointer;
}

.people-page__lightbox-close:hover {
  background: rgba(255, 255, 255, 0.24);
}

.people-page__lightbox-figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  max-width: min(90vw, 64rem);
  max-height: 78vh;
  overflow: hidden;
}

.people-page__lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 0.125rem;
}

.people-page__lightbox-caption {
  color: #f0f0f0;
  font-size: 0.9rem;
  text-align: center;
}

.people-page__lightbox-actions {
  display: flex;
  gap: 0.6rem;
}

.people-page__talk {
  max-width: 52rem;
}

.people-page__talk-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 1.25rem 0;
}

.people-page__talk-message {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.125rem;
  background: #f8f9fa;
}

body.theme-dark .people-page__talk-message {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__talk-avatar {
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: var(--page-toolbar-muted);
}

.people-page__talk-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.people-page__talk-content {
  flex: 1 1 auto;
  min-width: 0;
}

.people-page__talk-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
}

.people-page__talk-author {
  font-weight: 600;
}

.people-page__talk-time {
  color: var(--page-toolbar-muted);
}

.people-page__talk-delete {
  margin-left: auto;
}

.people-page__talk-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.people-page__talk-form {
  margin: 1rem 0 1.5rem;
  padding: 0.85rem 1rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.125rem;
  background: #f8f9fa;
  box-sizing: border-box;
}

body.theme-dark .people-page__talk-form {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1a1e24;
}

.people-page__talk-form-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.people-page__talk-form textarea {
  width: 100%;
  min-height: 6rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid #a2a9b1;
  border-radius: 0.125rem;
  font: inherit;
  font-size: 0.95rem;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #202122;
  box-sizing: border-box;
  resize: vertical;
}

body.theme-dark .people-page__talk-form textarea {
  border-color: rgba(255, 255, 255, 0.3);
  background: #101418;
  color: #eaecf0;
}

.people-page__talk-form textarea:focus {
  outline: none;
  border-color: #3366cc;
  box-shadow: inset 0 0 0 1px #3366cc;
}

.people-page__talk-form-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.people-page__talk-form-note {
  font-size: 0.8rem;
  color: var(--page-toolbar-muted);
}

.people-page__talk-empty,
.people-page__talk-signin {
  color: var(--page-toolbar-muted);
}

@media (max-width: 720px) {
  .people-page__content aside {
    float: none;
    width: 100%;
    max-width: none;
    margin: 0 0 1rem;
  }

  .people-page__content aside table {
    width: 100%;
  }

  .people-page__content .ppe-profile-columns {
    grid-template-columns: 1fr;
  }
}
</style>
<full-page-toolbar variant="people"></full-page-toolbar>
<div class="people-page__content" aria-live="polite"></div>
`;

const PEOPLE_PAGE_TABS = ['profile', 'tree', 'media', 'talk', 'changes'];
const PEOPLE_PAGE_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|avif)$/i;
const PEOPLE_PAGE_MEDIA_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|avif|pdf)$/i;
const PEOPLE_PAGE_MEDIA_INPUT_ACCEPT = 'image/*,.pdf,application/pdf';
const PEOPLE_PAGE_DATA_DIR = './';
const PEOPLE_PAGE_MEDIA_MAX_BYTES = 8_000_000;

function peoplePageEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function peoplePageFormatDate(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return String(value);
  }
}

function peoplePageNormalizeLogin(userOrLogin) {
  if (typeof userOrLogin === 'string') {
    return userOrLogin.trim().toLowerCase();
  }

  return String(userOrLogin?.login || userOrLogin?.githubLogin || '').trim().toLowerCase();
}

function peoplePageIdentityLogin(identity) {
  if (typeof identity === 'string') {
    return peoplePageNormalizeLogin(identity);
  }

  if (!identity || typeof identity !== 'object') {
    return '';
  }

  return peoplePageNormalizeLogin(identity.githubLogin || identity.github_login || identity.login || '');
}

// The filename without its directory or extension, lowercased — used to find
// the next free numeric suffix when auto-naming uploads.
function peoplePageImageStem(name) {
  return String(name || '')
    .split('/')
    .pop()
    .toLowerCase()
    .replace(/\.[^.]+$/, '');
}

function peoplePageImageExtension(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function peoplePageMediaKind(nameOrUrl, mimeType = '') {
  const type = String(mimeType || '').toLowerCase();
  if (type.startsWith('image/')) {
    return 'image';
  }
  if (type === 'application/pdf') {
    return 'pdf';
  }

  const value = String(nameOrUrl || '').split('?')[0];
  if (PEOPLE_PAGE_IMAGE_EXTENSIONS.test(value)) {
    return 'image';
  }
  if (/\.pdf$/i.test(value)) {
    return 'pdf';
  }
  return 'file';
}

function peoplePageAcceptsUpload(file) {
  const kind = peoplePageMediaKind(file?.name || '', file?.type || '');
  return kind === 'image' || kind === 'pdf';
}

function peoplePageMediaIcon(kind) {
  if (kind === 'pdf') {
    return 'bi-file-earmark-pdf';
  }
  if (kind === 'image') {
    return 'bi-image';
  }
  return 'bi-file-earmark';
}

function peoplePageMediaLabel(kind) {
  if (kind === 'pdf') {
    return 'PDF';
  }
  if (kind === 'image') {
    return 'Image';
  }
  return 'File';
}

function peoplePageRenderMediaThumbContent({ kind, url = '', caption = '', upload = false }) {
  if (upload) {
    return `
      <i class="bi bi-cloud-arrow-up people-page__media-file-icon" aria-hidden="true"></i>
      <span class="people-page__dropzone-title">Upload media</span>
      <span class="people-page__media-upload-copy">Drag files here or click to choose</span>
      <span class="people-page__media-file-ext">Images or PDF</span>
    `;
  }

  if (kind === 'image') {
    return `<img src="${peoplePageEscapeHtml(url)}" alt="${peoplePageEscapeHtml(caption)}" loading="lazy">`;
  }

  return `
    <i class="bi ${peoplePageMediaIcon(kind)} people-page__media-file-icon" aria-hidden="true"></i>
    <span class="people-page__media-file-ext">${peoplePageEscapeHtml(peoplePageMediaLabel(kind))}</span>
    <span class="people-page__media-file-label">${peoplePageEscapeHtml(caption)}</span>
  `;
}

function peoplePageRenderQueueThumb(item) {
  if (item.kind === 'image') {
    return `<img class="people-page__media-queue-thumb" src="${peoplePageEscapeHtml(item.dataUrl)}" alt="">`;
  }

  return `
    <div class="people-page__media-queue-thumb people-page__media-queue-thumb--file" aria-hidden="true">
      <i class="bi ${peoplePageMediaIcon(item.kind)} people-page__media-file-icon" aria-hidden="true"></i>
      <span class="people-page__media-file-ext">${peoplePageEscapeHtml(peoplePageMediaLabel(item.kind))}</span>
    </div>
  `;
}

function peoplePageRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class PeoplePage extends HTMLElement {
  #privacyAccessPromise = null;

  // Resolved value of #privacyAccessPromise, cached for synchronous reads when
  // applying the blur overlay after a tab renders.
  #privacyAccess = null;

  static get observedAttributes() {
    return ['edit-href'];
  }

  // Monotonic token identifying the most recently requested tab load. Each call
  // to #loadTab claims a new token; async loaders check it before writing to the
  // shared content element so a slow earlier tab can never overwrite a newer one
  // (e.g. clicking Changes then immediately Media must show Media, not Changes).
  #tabLoadSeq = 0;
  #activeTabToken = 0;
  #activeTabName = '';

  // True when the given load token has been superseded by a newer tab request.
  #isStaleTabLoad(token) {
    return token !== this.#activeTabToken;
  }

  connectedCallback() {
    if (this.__rendered) return;
    this.__rendered = true;
    this.innerHTML = PEOPLE_PAGE_TEMPLATE;
    this.#syncEditHref();
    this.#syncProfileEditLink();
    this.#bindMenus();
    this.#bindTabs();
    this.__titleLoadPromise = Promise.all([
      this.#seedTitleFromRegistry(),
      this.#loadPageTitle(),
    ]);
    void this.#init();
    window.addEventListener('hashchange', this.#onHashChange);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.#onHashChange);
  }

  #onHashChange = () => {
    const tab = this.#getTabFromHash();
    if (tab) {
      this.#selectTab(tab, { updateHash: false });
      this.#loadTab(tab);
    }
  };

  attributeChangedCallback(name) {
    if (!this.__rendered) {
      return;
    }

    if (name === 'edit-href') {
      this.#syncEditHref();
    }
  }

  async #init() {
    await this.__titleLoadPromise;
    this.#privacyAccessPromise = this.#loadPrivacyAccess();
    const initialTab = this.#getInitialTab();
    this.#selectTab(initialTab, { updateHash: Boolean(this.#getTabFromHash()) });
    await this.#loadTab(initialTab);
  }

  #setTitle(title) {
    const next = (title || '').trim();
    const titleEl = this.querySelector('.people-page__title');
    if (titleEl) {
      const titleLink = titleEl.querySelector?.('.people-page__title-link');
      if (titleLink) {
        titleLink.textContent = next;
        try {
          const href = window.location.href.replace(/(?:index|profile)\.html(?:#.*)?$/i, '');
          titleLink.href = href;
        } catch (e) {
          // ignore
        }
      } else {
        titleEl.textContent = next;
      }
    }

    if (next) {
      const appName = window.App?.getName?.() || window.App?.Name || '';
      document.title = appName ? `${next} - ${appName}` : next;
    }
  }

  #resolvePersonId() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    // Supports clean directory routes (/people/<id>/) and legacy file routes
    // (/people/<id>/index.html, /people/<id>/profile.html).
    const match = pathname.match(/\/people\/([^/]+)\//);
    return match?.[1]?.trim() || '';
  }

  // A filename-safe base derived from the profile's display name (falling back
  // to the person id) so uploaded images get sensible, profile-scoped names
  // like "nelson-mandela-1.jpg".
  #resolveProfileSlug() {
    const personId = this.#resolvePersonId();
    const titleText = this.querySelector('.people-page__title')?.textContent?.trim() || '';
    const slug = titleText
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return slug || `person-${personId || 'profile'}`;
  }

  #resolvePeopleJsonUrl() {
    if (window.PeopleRegistry?.resolvePeopleJsonUrl) {
      return window.PeopleRegistry.resolvePeopleJsonUrl();
    }

    const pathname = window.location.pathname.replace(/\\/g, '/');
    const nestedMatch = pathname.match(/^(.*\/)people\/[^/]+\/(?:[^/]+)?$/);
    const prefix = nestedMatch?.[1] || '';
    return new URL('people/people.json', new URL(prefix, window.location.href)).href;
  }

  async #seedTitleFromRegistry() {
    const personId = this.#resolvePersonId();
    if (!personId) {
      return;
    }

    try {
      let people;
      if (window.PeopleRegistry?.loadPeopleRegistry) {
        people = await window.PeopleRegistry.loadPeopleRegistry();
      } else {
        const response = await fetch(this.#resolvePeopleJsonUrl(), { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        people = Array.isArray(data?.people) ? data.people : [];
      }

      const entry = people.find((person) => String(person?.id) === personId);
      if (!entry) {
        return;
      }

      const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
      if (name && !this.querySelector('.people-page__title')?.textContent?.trim()) {
        this.#setTitle(name);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async #loadPageTitle() {
    try {
      const response = await fetch(this.#resolveDataUrl('profile.html'));
      if (!response.ok) {
        return;
      }

      const title = this.#readTitleFromHtml(await response.text());
      if (title) {
        this.#setTitle(title);
      }
    } catch (error) {
      console.error(error);
    }
  }

  #readTitleFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('h1')?.textContent?.trim() || '';
  }

  async #ensureProfileInfoboxRender() {
    if (window.AppProfileInfobox?.refreshIdentityElementsInDocument) {
      return;
    }

    window.__profileInfoboxRenderPromise = window.__profileInfoboxRenderPromise || new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-profile-infobox-render]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load profile infobox render library.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = this.#resolveSiteUrl('lib/profile-infobox-render.js');
      script.dataset.profileInfoboxRender = '1';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Could not load profile infobox render library.')), { once: true });
      document.head.append(script);
    });

    await window.__profileInfoboxRenderPromise;
  }

  // Lazily load the browser database client so the profile reads structured
  // data (identity, relationships, tree) from data/Genepedia-Database/people at runtime.
  async #ensurePeopleDb() {
    if (window.PeopleDB) {
      return;
    }

    window.__peopleDbLoadPromise = window.__peopleDbLoadPromise || new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-people-db]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load the people database client.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = this.#resolveSiteUrl('lib/people-db.js');
      script.dataset.peopleDb = '1';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Could not load the people database client.')), { once: true });
      document.head.append(script);
    });

    await window.__peopleDbLoadPromise;
  }

  // Build the identity infobox fragment for the current person from the JSON
  // database. Returns '' when the record or renderer is unavailable.
  async #buildInfoboxHtml() {
    try {
      const personId = this.#resolvePersonId();
      if (!personId) {
        return '';
      }
      await this.#ensurePeopleDb();
      await this.#ensureProfileInfoboxRender();
      if (!window.PeopleDB) {
        return '';
      }
      return await window.PeopleDB.buildInfoboxFragment(personId);
    } catch (error) {
      console.warn('Could not build identity infobox from the database.', error);
      return '';
    }
  }

  #readStoredGitHubUser() {
    try {
      const user = window.App?.getGitHubUser?.();
      if (user && typeof user === 'object') {
        return user;
      }
    } catch (error) {
      // fall through
    }

    try {
      const raw = localStorage.getItem('app-header-session');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async #getCurrentViewerLogin() {
    const storedLogin = peoplePageNormalizeLogin(this.#readStoredGitHubUser());
    if (storedLogin) {
      return storedLogin;
    }

    const endpoint = this.#resolveGitHubApiUrl('github-session.php');
    if (!endpoint) {
      return '';
    }

    try {
      const response = await fetch(endpoint, this.#gitHubFetchInit({ cache: 'no-store' }));
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.authenticated && payload.user) {
        return peoplePageNormalizeLogin(payload.user);
      }
    } catch (error) {
      return '';
    }

    return '';
  }

  async #loadProfileConfig(personId) {
    if (!personId) {
      return null;
    }

    try {
      if (window.App?.loadProfileConfig) {
        return await window.App.loadProfileConfig(personId);
      }
      const bucket = Math.floor((Math.max(1, Number(String(personId).replace(/[^0-9]/g, '')) || 1) - 1) / 1000);
      const response = await fetch(this.#resolveSiteUrl(`data/Genepedia-Database/people/ownership/${bucket}/${personId}.json`), { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      const payload = await response.json().catch(() => null);
      return payload && typeof payload === 'object' ? payload : null;
    } catch (error) {
      return null;
    }
  }

  async #loadPersonRecord(personId) {
    if (!personId) {
      return null;
    }

    try {
      await this.#ensurePeopleDb();
      if (window.PeopleDB?.loadPerson) {
        return await window.PeopleDB.loadPerson(personId);
      }
    } catch (error) {
      console.warn('Could not load person record for privacy checks.', error);
    }

    return null;
  }

  #normalizePrivacyState(value, { deceased = false } = {}) {
    if (deceased) {
      return {
        visibility: 'public',
        maintainersOnly: false,
      };
    }

    // Living profiles default to public unless explicitly made private; a
    // maintainer can switch a living profile to private. Deceased profiles are
    // forced public above. GEDCOM imports write living profiles as private
    // explicitly (see scripts/import-gedcom.mjs), so they stay private here.
    const source = value && typeof value === 'object' ? value : {};
    const rawVisibility = String(source.visibility || source.mode || 'public').trim().toLowerCase();
    const visibility = rawVisibility === 'private' ? 'private' : 'public';
    return {
      visibility,
      maintainersOnly: visibility === 'private',
    };
  }

  #profileManagerLogins(config = {}) {
    const logins = new Set();
    const add = (identity) => {
      const login = peoplePageIdentityLogin(identity);
      if (login) {
        logins.add(login);
      }
    };

    const ownerLogin = peoplePageIdentityLogin(config?.owner);
    if (ownerLogin) {
      logins.add(ownerLogin);
    }

    (Array.isArray(config?.maintainers) ? config.maintainers : []).forEach(add);

    if (!ownerLogin) {
      add(config?.creator);
    }

    return logins;
  }

  #closeFamilyPersonIds(record, personId) {
    const relationships = record?.relationships || {};
    const ids = new Set();
    const add = (value) => {
      const id = String(value || '').trim();
      if (id && id !== String(personId)) {
        ids.add(id);
      }
    };

    [
      ...(Array.isArray(relationships.parents) ? relationships.parents : []),
      ...(Array.isArray(relationships.spouses) ? relationships.spouses : []),
      ...(Array.isArray(relationships.exSpouses) ? relationships.exSpouses : []),
      ...(Array.isArray(relationships.children) ? relationships.children : []),
      ...(Array.isArray(relationships.siblings) ? relationships.siblings : []),
    ].forEach(add);

    (Array.isArray(relationships.parentLinks) ? relationships.parentLinks : []).forEach((entry) => add(entry?.id));
    (Array.isArray(relationships.partnerLinks) ? relationships.partnerLinks : []).forEach((entry) => add(entry?.id));
    (Array.isArray(relationships.childLinks) ? relationships.childLinks : []).forEach((entry) => add(entry?.id));
    return ids;
  }

  async #loadContributorLogins(personId) {
    const logins = new Set();
    const apiBase = this.#resolveGitHubApiUrl('github-file-commits.php');
    const pullRequestsBase = this.#resolveGitHubApiUrl('github-pull-requests.php');

    if (!apiBase || !pullRequestsBase) {
      return logins;
    }

    const bucket = Math.floor((Math.max(1, Number(String(personId).replace(/[^0-9]/g, '')) || 1) - 1) / 1000);
    const pathGroups = [
      [
        `people/${personId}/index.html`,
        `people/${personId}/data/profile.html`,
      ],
      [
        `data/Genepedia-Database/people/persons/${bucket}/${personId}.json`,
        `data/Genepedia-Database/people/ownership/${bucket}/${personId}.json`,
      ],
    ];

    for (const paths of pathGroups) {
      const commitsUrl = new URL(apiBase);
      commitsUrl.searchParams.set('paths', paths.join(','));
      const pullRequestsUrl = new URL(pullRequestsBase);
      pullRequestsUrl.searchParams.set('paths', paths.join(','));

      const [commitsResponse, pullRequestsResponse] = await Promise.all([
        fetch(commitsUrl.href, this.#gitHubFetchInit({ cache: 'no-store' })).catch(() => null),
        fetch(pullRequestsUrl.href, this.#gitHubFetchInit({ cache: 'no-store' })).catch(() => null),
      ]);

      const commitsPayload = commitsResponse
        ? await commitsResponse.json().catch(() => null)
        : null;
      const pullRequestsPayload = pullRequestsResponse
        ? await pullRequestsResponse.json().catch(() => null)
        : null;

      if (commitsResponse?.ok && commitsPayload?.ok && Array.isArray(commitsPayload.commits)) {
        commitsPayload.commits.forEach((commit) => {
          const login = peoplePageNormalizeLogin(commit?.author_login || '');
          if (login) {
            logins.add(login);
          }
        });
      }

      if (pullRequestsResponse?.ok && pullRequestsPayload?.ok && Array.isArray(pullRequestsPayload.pull_requests)) {
        pullRequestsPayload.pull_requests.forEach((pullRequest) => {
          const login = peoplePageNormalizeLogin(pullRequest?.user?.login || '');
          if (login) {
            logins.add(login);
          }
        });
      }
    }

    return logins;
  }

  async #loadPrivacyAccess() {
    const personId = this.#resolvePersonId();
    if (!personId) {
      return {
        personId: '',
        isPrivate: false,
        canViewDetails: true,
        viewerPersonId: '',
        viewerLogin: '',
        title: '',
      };
    }

    const [config, record, viewerLogin, directory] = await Promise.all([
      this.#loadProfileConfig(personId),
      this.#loadPersonRecord(personId),
      this.#getCurrentViewerLogin(),
      this.#loadPeopleLoginDirectory(),
    ]);

    const deceased = Boolean(record?.events?.death || (!record?.living && record?.living !== undefined));
    const privacy = this.#normalizePrivacyState(config?.privacy, { deceased });
    const isPrivate = privacy.visibility === 'private';
    const viewerPersonId = viewerLogin ? String(directory.get(viewerLogin) || '').trim() : '';
    const managerLogins = this.#profileManagerLogins(config || {});
    const closeFamilyIds = this.#closeFamilyPersonIds(record, personId);
    const contributorLogins = isPrivate ? await this.#loadContributorLogins(personId) : new Set();
    const canViewDetails = !isPrivate
      || managerLogins.has(viewerLogin)
      || contributorLogins.has(viewerLogin)
      || (viewerPersonId && closeFamilyIds.has(viewerPersonId));

    return {
      personId,
      record,
      config,
      privacy,
      isPrivate,
      canViewDetails,
      viewerPersonId,
      viewerLogin,
      title: String(record?.names?.display || '').trim(),
    };
  }

  async #getPrivacyAccess() {
    if (!this.#privacyAccessPromise) {
      this.#privacyAccessPromise = this.#loadPrivacyAccess();
    }
    return this.#privacyAccessPromise;
  }

  async #prepareContentHtml(html, tab) {
    // Private living profiles still load their real content so it can be shown
    // behind a blur for visitors who lack access. The blur and the explanatory
    // overlay are applied centrally in #applyPrivacyBlur once the tab renders.
    if (tab === 'profile') {
      try {
        await this.#ensureProfileInfoboxRender();
      } catch (error) {
        console.warn(error);
      }
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    let infoboxHtml = '';
    if (tab === 'profile') {
      const heading = doc.querySelector('h1');
      const title = heading?.textContent?.trim();
      if (title) {
        this.#setTitle(title);
      }
      heading?.remove();

      // Structured identity comes from the JSON database, not the prose file.
      // Drop any legacy inline infobox so the database version is authoritative.
      doc.querySelectorAll('profile-identity').forEach((el) => el.remove());
      infoboxHtml = await this.#buildInfoboxHtml();
    }

    // Rewrite asset URLs in the main document
    this.#rewriteDataAssetUrls(doc);

    // Inline any <include src="..."></include> or elements with data-include.
    // The identity infobox include is resolved from the database, not a file.
    const includeEls = Array.from(doc.querySelectorAll('include[src], [data-include]'));
    for (const el of includeEls) {
      const src = el.getAttribute('src') || el.dataset.include;
      if (!src) continue;

      if (tab === 'profile' && /profile-table\.html$/.test(src)) {
        if (infoboxHtml) {
          const fragDoc = new DOMParser().parseFromString(infoboxHtml, 'text/html');
          this.#rewriteDataAssetUrls(fragDoc);
          const nodes = Array.from(fragDoc.body.childNodes).map((n) => n.cloneNode(true));
          el.replaceWith(...nodes);
          infoboxHtml = '';
        } else {
          el.remove();
        }
        continue;
      }

      try {
        const url = this.#resolveDataUrl(src);
        const response = await fetch(url);
        if (!response.ok) continue;
        const fragHtml = await response.text();
        const fragDoc = new DOMParser().parseFromString(fragHtml, 'text/html');
        // Rewrite asset URLs inside the included fragment as well
        this.#rewriteDataAssetUrls(fragDoc);

        // Replace the include element with the fragment's body children
        const nodes = Array.from(fragDoc.body.childNodes).map((n) => n.cloneNode(true));
        el.replaceWith(...nodes);
      } catch (err) {
        console.warn('Could not inline include', src, err);
      }
    }

    // If the prose carried no infobox include, inject the database infobox at top.
    if (tab === 'profile' && infoboxHtml) {
      const fragDoc = new DOMParser().parseFromString(infoboxHtml, 'text/html');
      this.#rewriteDataAssetUrls(fragDoc);
      const nodes = Array.from(fragDoc.body.childNodes).map((n) => n.cloneNode(true));
      doc.body.prepend(...nodes);
      infoboxHtml = '';
    }

    if (tab === 'profile' && typeof window.AppProfileInfobox?.refreshIdentityElementsInDocument === 'function') {
      window.AppProfileInfobox.refreshIdentityElementsInDocument(doc);
      const identity = doc.querySelector('profile-identity');
      if (identity && typeof window.AppProfileInfobox.parseIdentityElement === 'function') {
        const infoboxName = window.AppProfileInfobox.displayNameFrom(
          window.AppProfileInfobox.parseIdentityElement(identity),
        );
        if (infoboxName) {
          this.#setTitle(infoboxName);
        }
      }
    }

    if (tab === 'profile' && typeof window.upgradeProfileIdentityInDocument === 'function') {
      window.upgradeProfileIdentityInDocument(doc);
    }

    if (tab === 'profile') {
      this.#rewriteDataAssetUrls(doc);
    }

    // Remove unwanted sections from loaded profile content (e.g. "See also" lists)
    try {
      const headings = Array.from(doc.querySelectorAll('h2, h3'));
      for (const h of headings) {
        const text = (h.textContent || '').trim().toLowerCase();
        if (text === 'see also') {
          const next = h.nextElementSibling;
          if (next && next.tagName && next.tagName.toLowerCase() === 'ul') {
            next.remove();
          }
          h.remove();
        }
      }
    } catch (e) {
      // non-fatal; leave document as-is on error
      console.warn('Could not prune profile sections', e);
    }

    try {
      window.App?.applyBranding?.(doc);
    } catch (e) {
      // ignore
    }

    return doc.body.innerHTML;
  }

  #rewriteDataAssetUrls(doc) {
    doc.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
        return;
      }

      img.setAttribute('src', this.#resolveImageUrl(src));
    });
  }

  #syncEditHref() {
    const editButton = this.querySelector('.people-page__edit-button');
    if (!editButton) {
      return;
    }

    const editHref = this.getAttribute('edit-href')?.trim();
    editButton.href = editHref || '#';
  }

  #syncProfileEditLink() {
    const toolbar = this.querySelector('full-page-toolbar');
    const personId = this.#resolvePersonId();
    if (!toolbar || !personId) {
      return;
    }

    try {
      const editUrl = new URL(this.#resolveSiteUrl('people/edit.html'));
      editUrl.searchParams.set('person', personId);
      toolbar.setAttribute('edit-href', editUrl.href);
      toolbar.removeAttribute('edit-source');
      toolbar.removeAttribute('edit-content-selector');
    } catch (error) {
      // Fall back to the generic page editor when URL resolution fails.
      toolbar.setAttribute('edit-source', `people/${personId}/profile.html`);
      toolbar.setAttribute('edit-content-selector', '__fragment__');
      toolbar.removeAttribute('edit-href');
    }
  }

  #bindMenus() {
    const menus = [...this.querySelectorAll('.people-page__menu')];

    const closeAllMenus = () => {
      menus.forEach((menu) => {
        const trigger = menu.querySelector('.people-page__menu-trigger');
        const dropdown = menu.querySelector('.people-page__dropdown');
        menu.classList.remove('is-open');
        if (dropdown) {
          dropdown.hidden = true;
        }
        trigger?.setAttribute('aria-expanded', 'false');
      });
    };

    menus.forEach((menu) => {
      const trigger = menu.querySelector('.people-page__menu-trigger');
      const dropdown = menu.querySelector('.people-page__dropdown');

      if (!trigger || !dropdown) {
        return;
      }

      const closeMenu = () => {
        menu.classList.remove('is-open');
        dropdown.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };

      const openMenu = () => {
        closeAllMenus();
        menu.classList.add('is-open');
        dropdown.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (menu.classList.contains('is-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      dropdown.addEventListener('click', (event) => {
        if (event.target.closest('[role="menuitem"]')) {
          closeMenu();
        }
      });
    });

    document.addEventListener('click', (event) => {
      const insideOpenMenu = menus.some((menu) => menu.contains(event.target));
      if (!insideOpenMenu) {
        closeAllMenus();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllMenus();
      }
    });

    const addLanguageButton = this.querySelector('.people-page__dropdown-add');
    addLanguageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.dispatchEvent(
        new CustomEvent('people-page-add-language', {
          bubbles: true,
          composed: true,
        }),
      );
    });

    // Bind download menu actions (delegates to shared download manager)
    const downloadDropdown = this.querySelector('#people-page-download-menu');
    if (downloadDropdown) {
      const ensureManager = async () => {
        if (window.AppDownloads) return window.AppDownloads;
        // try to resolve components base from the people-page script tag
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        let base = new URL('.', window.location.href).href;
        for (const s of scripts) {
          const src = s.getAttribute('src') || '';
          if (src.includes('components/people-page.js')) {
            try {
              base = new URL('.', new URL(src, window.location.href)).href;
              break;
            } catch (e) {
              /* ignore */
            }
          }
        }
        const managerSrc = new URL('../lib/download-manager.js', base).href;
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.defer = true;
            s.src = managerSrc;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        } catch (e) {
          console.warn('Could not load download manager', e);
        }
        return window.AppDownloads;
      };

      downloadDropdown.addEventListener('click', async (event) => {
        const item = event.target.closest('[role="menuitem"]');
        if (!item) return;
        event.preventDefault();
        const title = (item.getAttribute('title') || item.textContent || '').trim();
        const match = title.match(/download as\s+(.+)/i);
        const type = (match && match[1]) ? match[1].toLowerCase().replace(/\s+/g, '') : title.toLowerCase().replace(/\s+/g, '');

        // On the Tree tab the download dropdown should export the family tree
        // itself, not screenshot the embedded viewer (whose shadow DOM a generic
        // capture can't reach). Delegate the relevant formats to the component.
        if (this.#activeTabName === 'tree' && await this.#handleTreeDownload(type)) {
          closeAllMenus();
          return;
        }

        const manager = await ensureManager();
        if (manager && typeof manager.handleDownload === 'function') {
          try {
            await manager.handleDownload(type, {
              getContentEl: this.#getContentElement.bind(this),
              getTitle: () => this.querySelector('.people-page__title')?.textContent?.trim() || document.title || 'profile',
            });
          } catch (err) {
            console.error('Download manager error', err);
          }
        } else {
          // minimal fallback
          if (type === 'printthispage' || type === 'print') {
            window.print();
          } else {
            const contentEl = this.#getContentElement();
            if (contentEl) {
              const filename = (this.querySelector('.people-page__title')?.textContent || document.title || 'profile').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
              const blob = new Blob([contentEl.innerText], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.txt`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1500);
            }
          }
        }

        closeAllMenus();
      });
    }
  }

  #getInitialTab() {
    return this.#getTabFromHash() || 'profile';
  }

  #getTabFromHash() {
    const hash = window.location.hash.replace(/^#/, '');
    return PEOPLE_PAGE_TABS.includes(hash) ? hash : null;
  }

  #getContentElement() {
    return this.querySelector('.people-page__content');
  }

  // Export the Tree tab for the shared toolbar download dropdown. Returns true
  // when the format was handled here; false lets the generic manager take over.
  async #handleTreeDownload(type) {
    const fmt = String(type || '').toLowerCase();
    const tree = this.#getContentElement()?.querySelector('family-tree');

    if ((fmt === 'svg' || fmt === 'png') && tree && typeof tree.exportTreeImage === 'function') {
      try {
        return await tree.exportTreeImage(fmt);
      } catch (error) {
        console.error('Tree export failed', error);
        return false;
      }
    }

    if (fmt === 'gedcom') {
      try {
        await this.#ensurePeopleDb();
        const text = window.PeopleDB
          ? await window.PeopleDB.buildNeighborhoodGedcom(this.#resolvePersonId())
          : '';
        if (!text) {
          return false;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${this.#resolveProfileSlug()}-family-tree.ged`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return true;
      } catch (error) {
        console.error('GEDCOM download failed', error);
        return false;
      }
    }

    return false;
  }

  #resolveDataUrl(filename) {
    return new URL(filename, new URL(PEOPLE_PAGE_DATA_DIR, window.location.href)).href;
  }

  #bindTabs() {
    const tabLinks = [...this.querySelectorAll('.people-page__tab-link[data-tab]')];

    tabLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const tab = link.dataset.tab;
        if (!PEOPLE_PAGE_TABS.includes(tab)) {
          return;
        }

        this.#selectTab(tab);
        this.#loadTab(tab);
      });
    });
  }

  #selectTab(tab, { updateHash = true } = {}) {
    const tabLinks = [...this.querySelectorAll('.people-page__tab-link[data-tab]')];

    tabLinks.forEach((link) => {
      const isSelected = link.dataset.tab === tab;
      const tabItem = link.closest('.people-page__tab-item');
      tabItem?.classList.toggle('is-selected', isSelected);
      link.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (updateHash) {
      const nextHash = `#${tab}`;
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', nextHash);
      }
    }

  }

  async #ensurePageTabs() {
    if (window.AppPageTabs?.mountChangesView) {
      return window.AppPageTabs;
    }

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let base = new URL('.', window.location.href).href;
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      if (src.includes('components/people-page.js')) {
        try {
          base = new URL('.', new URL(src, window.location.href)).href;
          break;
        } catch (error) {
          // ignore
        }
      }
    }

    const pageTabsSrc = new URL('../lib/page-tabs.js', base).href;
    if (document.querySelector(`script[src="${pageTabsSrc}"]`)) {
      return window.AppPageTabs?.ensurePageTabsLoaded?.() || null;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = pageTabsSrc;
      script.async = true;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    });

    return window.AppPageTabs;
  }

  #ensureChangesStyles() {
    if (document.querySelector('link[href*="common.css"]')) {
      return;
    }

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let base = new URL('.', window.location.href).href;
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      if (src.includes('components/people-page.js')) {
        try {
          base = new URL('.', new URL(src, window.location.href)).href;
          break;
        } catch (error) {
          // ignore
        }
      }
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../lib/Web-Framework/styles/common.css', base).href;
    document.head.append(link);
  }

  async #loadChangesTab(token) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    try {
      this.#ensureChangesStyles();
      const pageTabs = await this.#ensurePageTabs();
      const sourcePaths = pageTabs?.getPeopleProfileSourcePaths?.();
      if (!pageTabs?.mountChangesView || !sourcePaths?.length) {
        throw new Error('Change history is unavailable for this profile.');
      }

      if (this.#isStaleTabLoad(token)) {
        return;
      }
      await pageTabs.mountChangesView(contentEl, sourcePaths);
      if (this.#isStaleTabLoad(token)) {
        // A newer tab was requested while mountChangesView was writing to the
        // shared content element. Reload whatever tab is now current so its
        // content — not this stale change history — is what stays on screen.
        void this.#loadTab(this.#activeTabName);
        return;
      }
      this.#notifyTabLoaded('changes');
    } catch (error) {
      if (this.#isStaleTabLoad(token)) {
        return;
      }
      contentEl.innerHTML = '<p>Could not load change history. Please try again.</p>';
      console.error(error);
    }
  }

  async #loadTab(tab) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    // Claim this load. Any earlier in-flight load becomes stale and will skip
    // its DOM writes, so rapidly switching tabs always settles on the last one.
    const token = ++this.#tabLoadSeq;
    this.#activeTabToken = token;
    this.#activeTabName = tab;

    // Resolve and cache privacy access up front so #applyPrivacyBlur can decide
    // synchronously whether the freshly rendered tab needs the blur overlay.
    this.#privacyAccess = await this.#getPrivacyAccess();
    if (this.#isStaleTabLoad(token)) {
      return;
    }

    if (tab === 'changes') {
      await this.#loadChangesTab(token);
      return;
    }

    if (tab === 'tree') {
      await this.#loadTreeTab(token);
      return;
    }

    if (tab === 'media') {
      await this.#loadMediaTab(token);
      return;
    }

    if (tab === 'talk') {
      await this.#loadTalkTab(token);
      return;
    }

    const url = this.#resolveDataUrl(`${tab}.html`);
    contentEl.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }

      const html = await this.#prepareContentHtml(await response.text(), tab);
      if (this.#isStaleTabLoad(token)) {
        return;
      }
      contentEl.innerHTML = html;

      this.#notifyTabLoaded(tab, { url });
    } catch (error) {
      if (this.#isStaleTabLoad(token)) {
        return;
      }
      contentEl.innerHTML = '<p>Could not load this tab. Please try again.</p>';
      console.error(error);
    } finally {
      if (!this.#isStaleTabLoad(token)) {
        contentEl.removeAttribute('aria-busy');
      }
    }
  }

  #notifyTabLoaded(tab, detail = {}) {
    // Every tab settles through here, so it is the single chokepoint for the
    // private-profile blur: re-apply (or clear) the overlay against the freshly
    // rendered content before announcing that the tab is ready.
    this.#applyPrivacyBlur();
    this.dispatchEvent(
      new CustomEvent('people-page-tab-loaded', {
        bubbles: true,
        composed: true,
        detail: { tab, ...detail },
      }),
    );
  }

  // Visitors without access to a private living profile still receive the real
  // content, but it is blurred behind an explanatory overlay so only the name
  // (rendered outside the content area) stays legible. The content remains in
  // the DOM exactly as requested; the blur is a presentational deterrent.
  #applyPrivacyBlur() {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    const access = this.#privacyAccess;
    const shouldBlur = Boolean(access?.isPrivate && !access?.canViewDetails);

    // Clear any overlay left over from a previous render so toggling tabs (or a
    // change in access) always starts from a clean slate.
    contentEl.querySelector(':scope > .people-page__privacy-overlay')?.remove();
    contentEl.classList.toggle('people-page__content--private', shouldBlur);
    if (!shouldBlur) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'people-page__privacy-overlay';
    overlay.setAttribute('role', 'note');
    overlay.innerHTML = `
      <div class="people-page__privacy-overlay-card">
        <span class="people-page__privacy-overlay-badge">Private profile</span>
        <h2 class="people-page__privacy-overlay-title">This profile is private</h2>
        <p class="people-page__privacy-overlay-copy">Only maintainers, contributors, and close family can view the full details while this person is living.</p>
        <p class="people-page__privacy-overlay-hint">Sign in with a linked account if you should have access.</p>
      </div>
    `;
    contentEl.appendChild(overlay);
  }

  #resolveGitHubApiUrl(fileName) {
    const apiBase = String(
      window.App?.getGitHubApiBase?.()
      || window.App?.GitHubApiBase
      || '',
    ).trim().replace(/\/+$/, '');

    if (!apiBase) {
      return '';
    }

    return new URL(fileName, `${apiBase}/`).href;
  }

  #gitHubFetchInit(init) {
    return window.App?.getGitHubFetchInit?.(init) || { credentials: 'include', ...(init || {}) };
  }

  #resolveSiteUrl(path) {
    if (window.App?.resolveSiteUrl) {
      return window.App.resolveSiteUrl(path);
    }

    return new URL(`../../${String(path || '').replace(/^\/+/, '')}`, window.location.href).href;
  }

  // -------------------------------------------------------------------
  // Tree tab
  // -------------------------------------------------------------------

  async #loadTreeTab(token) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    contentEl.setAttribute('aria-busy', 'true');
    const personId = this.#resolvePersonId();

    let gedUrl = '';
    try {
      await this.#ensurePeopleDb();
      if (window.PeopleDB) {
        gedUrl = (await window.PeopleDB.buildTreeGedcomUrl(personId)) || '';
      }
    } catch (error) {
      console.warn('Could not build the family tree from the database.', error);
      gedUrl = '';
    }

    if (this.#isStaleTabLoad(token)) {
      if (gedUrl) {
        URL.revokeObjectURL(gedUrl);
      }
      return;
    }

    if (!gedUrl) {
      contentEl.innerHTML = `
        <p>No family tree data is available for this profile yet.</p>
        <p class="people-page__tree-hint">
          Relationships are stored in the {{APP_NAME}} database. Open the profile editor to add
          parents, partners, or children and they will appear here.
        </p>
      `;
      contentEl.removeAttribute('aria-busy');
      this.#notifyTabLoaded('tree');
      return;
    }

    try {
      await this.#ensureFamilyTreeComponent();
    } catch (error) {
      console.error(error);
      if (this.#isStaleTabLoad(token)) {
        URL.revokeObjectURL(gedUrl);
        return;
      }
      contentEl.innerHTML = '<p>Could not load the family tree viewer.</p>';
      contentEl.removeAttribute('aria-busy');
      this.#notifyTabLoaded('tree');
      URL.revokeObjectURL(gedUrl);
      return;
    }

    if (this.#isStaleTabLoad(token)) {
      URL.revokeObjectURL(gedUrl);
      return;
    }

    // Release the previous tree blob before swapping in the new one.
    if (this.__treeBlobUrl) {
      URL.revokeObjectURL(this.__treeBlobUrl);
    }
    this.__treeBlobUrl = gedUrl;

    const theme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

    contentEl.innerHTML = `
      <family-tree
        class="people-page__tree-frame"
        ged="${peoplePageEscapeHtml(gedUrl)}"
        person="${peoplePageEscapeHtml(personId)}"
        theme="${theme}"
      ></family-tree>
    `;
    contentEl.removeAttribute('aria-busy');
    this.#notifyTabLoaded('tree');
  }

  // Load the <family-tree> component on demand (only when the Tree tab is first
  // opened). Cached so repeated visits don't re-inject the script.
  #ensureFamilyTreeComponent() {
    if (window.customElements?.get('family-tree')) {
      return Promise.resolve();
    }
    if (this.__familyTreeLoad) {
      return this.__familyTreeLoad;
    }

    this.__familyTreeLoad = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-family-tree]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Could not load the family tree component.')));
        return;
      }

      const script = document.createElement('script');
      script.src = this.#resolveSiteUrl('components/family-tree.js');
      script.defer = true;
      script.dataset.familyTree = '1';
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => reject(new Error('Could not load the family tree component.')));
      document.head.appendChild(script);
    });
    return this.__familyTreeLoad;
  }

  // -------------------------------------------------------------------
  // Media tab
  // -------------------------------------------------------------------

  async #loadMediaTab(token) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    contentEl.setAttribute('aria-busy', 'true');
    const personId = this.#resolvePersonId();

    contentEl.innerHTML = `
      <div class="people-page__status-note people-page__media-status" role="status" hidden></div>
      <section class="people-page__media-manage" aria-label="Manage media" hidden>
        <input type="file" class="people-page__media-file" accept="${PEOPLE_PAGE_MEDIA_INPUT_ACCEPT}" multiple hidden>
        <div class="people-page__media-link-row">
          <input type="url" class="people-page__media-link-input" placeholder="https://example.com/photo.jpg" autocomplete="off">
          <button type="button" class="people-page__button-secondary people-page__media-link-add">
            <i class="bi bi-link-45deg" aria-hidden="true"></i>
            <span>Add media link</span>
          </button>
        </div>
        <div class="people-page__media-staging" hidden>
          <ul class="people-page__media-queue"></ul>
          <div class="people-page__media-row">
            <button type="button" class="people-page__button-primary people-page__media-submit">
              <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
              <span class="people-page__media-submit-label">Upload for review</span>
            </button>
            <button type="button" class="people-page__button-secondary people-page__media-add">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>Add more</span>
            </button>
            <button type="button" class="people-page__button-secondary people-page__media-cancel">Cancel</button>
          </div>
        </div>
      </section>
      <div class="people-page__media-gallery-mount">
        <p class="people-page__gallery-empty">Loading media…</p>
      </div>
      <div class="people-page__lightbox" hidden>
        <button type="button" class="people-page__lightbox-close" aria-label="Close">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <figure class="people-page__lightbox-figure">
          <img class="people-page__lightbox-img" alt="">
          <figcaption class="people-page__lightbox-caption"></figcaption>
        </figure>
        <div class="people-page__lightbox-actions"></div>
      </div>
    `;

    this.#bindMediaUi(contentEl, personId);
    await this.#refreshMediaGallery(contentEl, personId);
    if (this.#isStaleTabLoad(token)) {
      return;
    }
    contentEl.removeAttribute('aria-busy');
    this.#notifyTabLoaded('media');
  }

  #setMediaStatus(contentEl, message, type = 'info', html = '') {
    const status = contentEl.querySelector('.people-page__media-status');
    if (!status) {
      return;
    }

    if (html) {
      status.innerHTML = html;
    } else {
      status.textContent = message;
    }
    status.dataset.type = type;
    status.hidden = !message && !html;
  }

  async #fetchMediaList(personId) {
    const url = this.#resolveGitHubApiUrl('github-media.php');
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const listUrl = new URL(url);
    listUrl.searchParams.set('person', personId);

    const response = await fetch(listUrl.href, this.#gitHubFetchInit({ cache: 'no-store' }));
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Could not load the media list (${response.status}).`);
    }

    return payload;
  }

  async #refreshMediaGallery(contentEl, personId) {
    const mount = contentEl.querySelector('.people-page__media-gallery-mount');
    const manage = contentEl.querySelector('.people-page__media-manage');
    if (!mount) {
      return;
    }

    let recordImages = [];
    try {
      await this.#ensurePeopleDb();
      const record = window.PeopleDB ? await window.PeopleDB.loadPerson(personId) : null;
      recordImages = record && window.PeopleDB
        ? window.PeopleDB.normalizeMediaItems(record, personId)
        : [];
    } catch (error) {
      console.warn('Could not load canonical media items from the database', error);
      recordImages = [];
    }

    try {
      const payload = await this.#fetchMediaList(personId);
      const canManage = Boolean(payload.can_manage);
      if (manage) {
        manage.hidden = !canManage;
      }

      const imagesByName = new Map(recordImages.map((image) => [String(image.name || ''), image]));
      for (const image of (payload.images || [])) {
        const name = String(image?.name || '');
        if (!name || imagesByName.has(name)) {
          continue;
        }
        imagesByName.set(name, {
          key: name,
          name,
          url: this.#resolveImageUrl(`images/${name}`) || String(image?.download_url || ''),
          title: this.#imageCaptionFromUrl(name),
          local: `images/${name}`,
          remote: '',
          primary: false,
          sourceType: 'file',
        });
      }
      const images = [...imagesByName.values()].filter((image) => image.name || image.url);

      const pending = (payload.pending || []).map((entry) => ({
        number: Number(entry?.number || 0),
        action: String(entry?.action || 'upload'),
        filename: String(entry?.filename || ''),
        url: String(entry?.image_url || ''),
        prUrl: String(entry?.url || ''),
        author: String(entry?.user?.displayName || entry?.user?.login || ''),
      })).filter((entry) => entry.number > 0);

      this.__mediaState = { canManage, images, pending };
      this.#renderMediaItems(contentEl);
    } catch (error) {
      console.warn('Falling back to local media listing', error);
      if (manage) {
        manage.hidden = true;
      }

      let images = recordImages;
      if (!images.length) {
        const urls = await this.#listDataImages();
        images = urls.map((url) => ({
          key: decodeURIComponent(url.split('/').pop() || ''),
          name: decodeURIComponent(url.split('/').pop() || ''),
          url,
          title: this.#imageCaptionFromUrl(url),
          local: '',
          remote: '',
          primary: false,
          sourceType: 'file',
        }));
      }
      this.__mediaState = { canManage: false, images, pending: [] };
      this.#renderMediaItems(contentEl);
    }
  }

  #renderMediaItems(contentEl) {
    const mount = contentEl.querySelector('.people-page__media-gallery-mount');
    if (!mount) {
      return;
    }

    const state = this.__mediaState || { canManage: false, images: [], pending: [] };
    const pendingUploads = state.pending.filter((entry) => entry.action === 'upload');
    const pendingDeletes = new Map(
      state.pending.filter((entry) => entry.action === 'delete').map((entry) => [entry.filename, entry]),
    );

    const reviewActions = (entry) => (state.canManage ? `
      <div class="people-page__pending-actions">
        <button type="button" class="people-page__button-primary people-page__pending-approve" data-media-approve="${entry.number}">
          <i class="bi bi-check2" aria-hidden="true"></i><span>Approve</span>
        </button>
        <button type="button" class="people-page__button-secondary people-page__pending-decline" data-media-decline="${entry.number}">
          <i class="bi bi-x" aria-hidden="true"></i><span>Decline</span>
        </button>
      </div>
    ` : '<span class="people-page__pending-note">Awaiting review</span>');

    const pendingSection = pendingUploads.length ? `
      <section class="people-page__media-section" aria-label="Pending media">
        <h2 class="people-page__media-section-title">Pending review</h2>
        <div class="people-page__gallery">
          ${pendingUploads.map((entry) => `
            <figure class="people-page__media-item is-pending">
              <div class="people-page__media-thumb ${peoplePageMediaKind(entry.filename) === 'image' ? '' : `people-page__media-thumb--file people-page__media-thumb--${peoplePageMediaKind(entry.filename)}`}">
                ${peoplePageRenderMediaThumbContent({
      kind: peoplePageMediaKind(entry.filename),
      url: entry.url,
      caption: this.#imageCaptionFromUrl(entry.filename),
    })}
                <span class="people-page__media-badge">Pending</span>
              </div>
              <figcaption>
                ${peoplePageEscapeHtml(this.#imageCaptionFromUrl(entry.filename))}
                ${entry.author ? `<span class="people-page__media-by">by ${peoplePageEscapeHtml(entry.author)}</span>` : ''}
              </figcaption>
              ${reviewActions(entry)}
            </figure>
          `).join('')}
        </div>
      </section>
    ` : '';

    const uploadTile = state.canManage ? `
      <figure class="people-page__media-item people-page__media-item--upload">
        <div class="people-page__media-thumb people-page__media-thumb--upload" data-media-upload role="button" tabindex="0" aria-label="Upload media to this profile">
          ${peoplePageRenderMediaThumbContent({ upload: true })}
        </div>
        <figcaption>Add media</figcaption>
      </figure>
    ` : '';

    const galleryItems = state.images.map((image) => {
      const caption = String(image.title || '').trim() || this.#imageCaptionFromUrl(image.name);
      const removal = pendingDeletes.get(image.name);
      const kind = peoplePageMediaKind(image.name || image.url, image.mimeType || '');
      return `
        <figure class="people-page__media-item${removal ? ' is-removing' : ''}">
          <div class="people-page__media-thumb ${kind === 'image' ? '' : `people-page__media-thumb--file people-page__media-thumb--${kind}`}" data-media-view="${peoplePageEscapeHtml(image.name)}" role="button" tabindex="0" aria-label="Open ${peoplePageEscapeHtml(caption)}">
            ${peoplePageRenderMediaThumbContent({ kind, url: image.url, caption })}
            ${removal ? '<span class="people-page__media-badge people-page__media-badge--warn">Removal pending</span>' : ''}
            <div class="people-page__media-hover">
              <button type="button" class="people-page__media-icon" data-media-download="${peoplePageEscapeHtml(image.name)}" title="Download" aria-label="Download media">
                <i class="bi bi-download" aria-hidden="true"></i>
              </button>
              ${state.canManage && !removal && image.sourceType === 'link' ? `
                <button type="button" class="people-page__media-icon" data-media-localize="${peoplePageEscapeHtml(image.name)}" title="Upload" aria-label="Upload media">
                  <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                </button>
              ` : ''}
              ${state.canManage && !removal && image.sourceType !== 'link' ? `
                <button type="button" class="people-page__media-icon people-page__media-icon--danger" data-media-delete="${peoplePageEscapeHtml(image.name)}" title="Remove" aria-label="Remove media">
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              ` : ''}
            </div>
          </div>
          <figcaption>${peoplePageEscapeHtml(caption)}</figcaption>
          ${removal && state.canManage ? `
            <div class="people-page__pending-actions">
              <span class="people-page__pending-note">Removal requested</span>
              <button type="button" class="people-page__button-primary people-page__pending-approve" data-media-approve="${removal.number}">
                <i class="bi bi-check2" aria-hidden="true"></i><span>Approve</span>
              </button>
              <button type="button" class="people-page__button-secondary people-page__pending-decline" data-media-decline="${removal.number}">
                <i class="bi bi-x" aria-hidden="true"></i><span>Keep</span>
              </button>
            </div>
          ` : ''}
        </figure>
      `;
    }).join('');

    const gallerySection = (state.images.length || state.canManage)
      ? `<div class="people-page__gallery">${uploadTile}${galleryItems}</div>`
      : (pendingUploads.length ? '' : '<p class="people-page__gallery-empty">No media has been added to this profile yet.</p>');

    mount.innerHTML = pendingSection + gallerySection;
  }

  #findMediaImage(name) {
    return (this.__mediaState?.images || []).find((image) => image.name === name || image.key === name) || null;
  }

  #bindMediaUi(contentEl, personId) {
    const manageSection = contentEl.querySelector('.people-page__media-manage');
    const dropzone = contentEl.querySelector('.people-page__dropzone');
    const fileInput = contentEl.querySelector('.people-page__media-file');
    const linkInput = contentEl.querySelector('.people-page__media-link-input');
    const linkAddButton = contentEl.querySelector('.people-page__media-link-add');
    const staging = contentEl.querySelector('.people-page__media-staging');
    const queueList = contentEl.querySelector('.people-page__media-queue');
    const submitButton = contentEl.querySelector('.people-page__media-submit');
    const submitLabel = contentEl.querySelector('.people-page__media-submit-label');
    const addButton = contentEl.querySelector('.people-page__media-add');
    const cancelButton = contentEl.querySelector('.people-page__media-cancel');

    // Files chosen but not yet uploaded. Each gets an auto-generated,
    // profile-scoped filename and an optional per-image caption.
    const queue = [];

    const renderQueue = () => {
      const count = queue.length;
      if (staging) staging.hidden = count === 0;
      if (dropzone) dropzone.hidden = count > 0;
      if (submitLabel) {
        submitLabel.textContent = count > 1 ? `Upload ${count} media files for review` : 'Upload for review';
      }
      if (submitButton) submitButton.disabled = count === 0;
      if (!queueList) {
        return;
      }

      queueList.innerHTML = queue.map((item) => `
        <li class="people-page__media-queue-item" data-queue-id="${peoplePageEscapeHtml(item.id)}">
          ${peoplePageRenderQueueThumb(item)}
          <div class="people-page__media-queue-info">
            <span class="people-page__media-queue-name" title="${peoplePageEscapeHtml(item.filename)}">${peoplePageEscapeHtml(item.filename)}</span>
            <input type="text" class="people-page__media-queue-caption" data-queue-id="${peoplePageEscapeHtml(item.id)}" placeholder="Caption (optional)" autocomplete="off" value="${peoplePageEscapeHtml(item.caption || '')}">
            ${item.note ? `<span class="people-page__media-queue-note">${peoplePageEscapeHtml(item.note)}</span>` : ''}
          </div>
          <button type="button" class="people-page__media-queue-remove" data-queue-id="${peoplePageEscapeHtml(item.id)}" aria-label="Remove ${peoplePageEscapeHtml(item.filename)}">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </li>
      `).join('');
    };

    const resetForm = () => {
      queue.length = 0;
      if (fileInput) fileInput.value = '';
      renderQueue();
    };

    // Every filename already taken (existing images, other pending uploads, and
    // items already queued) so auto-naming never collides.
    const collectUsedStems = () => {
      const stems = new Set();
      for (const image of (this.__mediaState?.images || [])) {
        stems.add(peoplePageImageStem(image.name));
      }
      for (const entry of (this.__mediaState?.pending || [])) {
        if (entry.action === 'upload' && entry.filename) {
          stems.add(peoplePageImageStem(entry.filename));
        }
      }
      for (const item of queue) {
        stems.add(peoplePageImageStem(item.filename));
      }
      return stems;
    };

    const addFiles = async (fileList) => {
      const files = Array.from(fileList || []).filter((file) => peoplePageAcceptsUpload(file));
      if (!files.length) {
        this.#setMediaStatus(contentEl, 'Please choose image or PDF files.', 'error');
        return;
      }

      const slug = this.#resolveProfileSlug();
      const usedStems = collectUsedStems();
      this.#setMediaStatus(contentEl, files.length > 1 ? `Preparing ${files.length} files…` : 'Preparing media…');

      let added = 0;
      let lastNote = '';
      const errors = [];
      for (const file of files) {
        try {
          const prepared = await this.#prepareImageForUpload(file);
          const kind = prepared.kind || peoplePageMediaKind(prepared.filename || file.name, file.type || '');
          const ext = peoplePageImageExtension(prepared.filename) || (kind === 'pdf' ? 'pdf' : 'jpg');
          let n = 1;
          while (usedStems.has(`${slug}-${n}`)) {
            n += 1;
          }
          const stem = `${slug}-${n}`;
          usedStems.add(stem);
          queue.push({
            id: peoplePageRandomId(),
            kind,
            dataUrl: prepared.dataUrl,
            filename: `${stem}.${ext}`,
            note: prepared.note || '',
            caption: '',
          });
          if (prepared.note) lastNote = prepared.note;
          added += 1;
        } catch (error) {
          console.error(error);
          errors.push(file.name || 'image');
        }
      }

      if (added) {
        renderQueue();
      }

      if (errors.length) {
        this.#setMediaStatus(contentEl, `Could not read: ${errors.join(', ')}.`, 'error');
      } else {
        this.#setMediaStatus(contentEl, lastNote || '', 'info');
      }
    };

    contentEl.__queueMediaFiles = addFiles;

    dropzone?.addEventListener('click', () => fileInput?.click());
    addButton?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      void addFiles(fileInput.files);
      fileInput.value = '';
    });

    linkAddButton?.addEventListener('click', async () => {
      const raw = String(linkInput?.value || '').trim();
      if (!raw || !/^https?:\/\//i.test(raw)) {
        this.#setMediaStatus(contentEl, 'Enter a valid http(s) media link.', 'error');
        return;
      }

      linkAddButton.disabled = true;
      this.#setMediaStatus(contentEl, 'Adding media link…');
      try {
        await this.#upsertRecordMediaItem(personId, {
          local: null,
          remote: raw,
          title: this.#imageCaptionFromUrl(raw),
        }, { setPrimary: false, commitMessage: `Add media link for profile ${personId}` });
        if (linkInput) {
          linkInput.value = '';
        }
        this.#setMediaStatus(contentEl, 'Media link added.', 'success');
        await this.#refreshMediaGallery(contentEl, personId);
      } catch (error) {
        console.error(error);
        this.#setMediaStatus(contentEl, error?.message || 'Could not add the media link.', 'error');
      } finally {
        linkAddButton.disabled = false;
      }
    });

    // Accept drops anywhere on the manage panel so it works whether the queue
    // is open or not.
    manageSection?.addEventListener('dragover', (event) => {
      event.preventDefault();
      manageSection.classList.add('is-dragover');
    });
    manageSection?.addEventListener('dragleave', (event) => {
      if (event.target === manageSection || !manageSection.contains(event.relatedTarget)) {
        manageSection.classList.remove('is-dragover');
      }
    });
    manageSection?.addEventListener('drop', (event) => {
      event.preventDefault();
      manageSection.classList.remove('is-dragover');
      void addFiles(event.dataTransfer?.files || null);
    });

    queueList?.addEventListener('input', (event) => {
      const input = event.target.closest?.('.people-page__media-queue-caption');
      if (!input) {
        return;
      }
      const item = queue.find((entry) => entry.id === input.dataset.queueId);
      if (item) item.caption = input.value;
    });

    queueList?.addEventListener('click', (event) => {
      const removeBtn = event.target.closest?.('.people-page__media-queue-remove');
      if (!removeBtn) {
        return;
      }
      const index = queue.findIndex((entry) => entry.id === removeBtn.dataset.queueId);
      if (index >= 0) {
        queue.splice(index, 1);
        renderQueue();
      }
    });

    cancelButton?.addEventListener('click', () => {
      resetForm();
      this.#setMediaStatus(contentEl, '', 'info');
    });

    submitButton?.addEventListener('click', async () => {
      if (!queue.length) {
        this.#setMediaStatus(contentEl, 'Choose at least one media file first.', 'error');
        return;
      }

      submitButton.disabled = true;
      const total = queue.length;
      const failures = [];
      let directPublishes = 0;
      let reviewPublishes = 0;
      let done = 0;

      for (const item of queue) {
        this.#setMediaStatus(
          contentEl,
          total > 1 ? `Uploading file ${done + 1} of ${total}…` : 'Uploading media…',
        );
        try {
          const result = await this.#submitMediaAction(personId, {
            action: 'upload',
            filename: item.filename,
            caption: (item.caption || '').trim(),
            content_base64: item.dataUrl.replace(/^data:[^;]+;base64,/, ''),
          });
          if (result?.pull_request?.url) reviewPublishes += 1;
          else directPublishes += 1;
          done += 1;
        } catch (error) {
          console.error(error);
          failures.push(item);
        }
      }

      if (!failures.length) {
        if (reviewPublishes > 0 && directPublishes === 0) {
          this.#setMediaStatus(contentEl, '', 'success', `
            ${done > 1 ? `${done} media files were submitted` : 'Media file submitted'} for review.
            ${done > 1 ? 'They' : 'It'} now ${done > 1 ? 'appear' : 'appears'} under “Pending review” below.
          `);
        } else if (reviewPublishes > 0) {
          this.#setMediaStatus(contentEl, '', 'success', `
            ${directPublishes} ${directPublishes === 1 ? 'media file was uploaded' : 'media files were uploaded'}.
            ${reviewPublishes} ${reviewPublishes === 1 ? 'media file was submitted' : 'media files were submitted'} for review.
          `);
        } else {
          this.#setMediaStatus(
            contentEl,
            done > 1 ? `${done} media files uploaded.` : 'Media file uploaded.',
            'success',
          );
        }
        resetForm();
      } else {
        queue.length = 0;
        queue.push(...failures);
        renderQueue();
        this.#setMediaStatus(
          contentEl,
          `Uploaded ${done} of ${total}. ${failures.length} could not be uploaded — they remain below to try again.`,
          'error',
        );
      }

      await this.#refreshMediaGallery(contentEl, personId);
      submitButton.disabled = queue.length === 0;
    });

    renderQueue();

    if (contentEl.__mediaActionsBound) {
      return;
    }
    contentEl.__mediaActionsBound = true;

    contentEl.addEventListener('click', (event) => {
      const uploadTile = event.target.closest?.('[data-media-upload]');
      if (uploadTile && contentEl.contains(uploadTile)) {
        event.preventDefault();
        fileInput?.click();
        return;
      }

      const lightbox = contentEl.querySelector('.people-page__lightbox');
      if (lightbox && !lightbox.hidden
        && (event.target === lightbox || event.target.closest('.people-page__lightbox-close'))) {
        this.#closeMediaLightbox(contentEl);
        return;
      }

      const downloadButton = event.target.closest?.('[data-media-download]');
      if (downloadButton && contentEl.contains(downloadButton)) {
        event.preventDefault();
        event.stopPropagation();
        const image = this.#findMediaImage(downloadButton.dataset.mediaDownload);
        if (image) this.#downloadImage(image.url, image.name);
        return;
      }

      const localizeButton = event.target.closest?.('[data-media-localize]');
      if (localizeButton && contentEl.contains(localizeButton)) {
        event.preventDefault();
        event.stopPropagation();
        void this.#localizeLinkedMedia(contentEl, personId, localizeButton.dataset.mediaLocalize || '');
        return;
      }

      const deleteButton = event.target.closest?.('[data-media-delete]');
      if (deleteButton && contentEl.contains(deleteButton)) {
        event.preventDefault();
        event.stopPropagation();
        void this.#requestMediaDelete(contentEl, personId, deleteButton.dataset.mediaDelete || '');
        return;
      }

      const approveButton = event.target.closest?.('[data-media-approve]');
      if (approveButton && contentEl.contains(approveButton)) {
        event.preventDefault();
        event.stopPropagation();
        void this.#reviewPendingMedia(contentEl, personId, Number(approveButton.dataset.mediaApprove), 'approve');
        return;
      }

      const declineButton = event.target.closest?.('[data-media-decline]');
      if (declineButton && contentEl.contains(declineButton)) {
        event.preventDefault();
        event.stopPropagation();
        void this.#reviewPendingMedia(contentEl, personId, Number(declineButton.dataset.mediaDecline), 'decline');
        return;
      }

      const view = event.target.closest?.('[data-media-view]');
      if (view && contentEl.contains(view)) {
        event.preventDefault();
        this.#openMediaLightbox(contentEl, personId, view.dataset.mediaView);
      }
    });

    contentEl.addEventListener('keydown', (event) => {
      const uploadTile = event.target.closest?.('[data-media-upload]');
      if (uploadTile && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        fileInput?.click();
        return;
      }

      const view = event.target.closest?.('[data-media-view]');
      if (view && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        this.#openMediaLightbox(contentEl, personId, view.dataset.mediaView);
      }
    });

    contentEl.addEventListener('dragover', (event) => {
      const uploadTile = event.target.closest?.('[data-media-upload]');
      if (!uploadTile || !contentEl.contains(uploadTile)) {
        return;
      }
      event.preventDefault();
      uploadTile.classList.add('is-dragover');
    });

    contentEl.addEventListener('dragleave', (event) => {
      const uploadTile = event.target.closest?.('[data-media-upload]');
      if (!uploadTile || (event.relatedTarget && uploadTile.contains(event.relatedTarget))) {
        return;
      }
      uploadTile.classList.remove('is-dragover');
    });

    contentEl.addEventListener('drop', (event) => {
      const uploadTile = event.target.closest?.('[data-media-upload]');
      if (!uploadTile || !contentEl.contains(uploadTile)) {
        return;
      }
      event.preventDefault();
      uploadTile.classList.remove('is-dragover');
      void contentEl.__queueMediaFiles?.(event.dataTransfer?.files || null);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.#closeMediaLightbox(contentEl);
    });
  }

  async #requestMediaDelete(contentEl, personId, filename) {
    if (!filename) {
      return;
    }

    if (!window.confirm(`Remove “${filename}” from this profile?`)) {
      return;
    }

    const existing = this.#findMediaImage(filename);
    if (existing?.sourceType === 'link') {
      this.#setMediaStatus(contentEl, 'Removing media link…');
      try {
        await this.#removeRecordMediaItem(personId, existing);
        this.#setMediaStatus(contentEl, 'Media link removed.', 'success');
        this.#closeMediaLightbox(contentEl);
        await this.#refreshMediaGallery(contentEl, personId);
      } catch (error) {
        console.error(error);
        this.#setMediaStatus(contentEl, error?.message || 'Could not remove this media link.', 'error');
      }
      return;
    }

    this.#setMediaStatus(contentEl, 'Removing media…');

    try {
      const result = await this.#submitMediaAction(personId, { action: 'delete', filename });
      const pr = result?.pull_request || {};
      if (pr.url || pr.number) {
        this.#setMediaStatus(contentEl, '', 'success', `
          Removal submitted as pull request
          ${pr.url ? `<a href="${peoplePageEscapeHtml(pr.url)}" target="_blank" rel="noopener noreferrer">#${peoplePageEscapeHtml(String(pr.number || ''))}</a>` : `#${peoplePageEscapeHtml(String(pr.number || ''))}`}.
          The image stays visible until the request is approved.
        `);
      } else {
        this.#setMediaStatus(contentEl, 'Media removed.', 'success');
      }
      this.#closeMediaLightbox(contentEl);
      await this.#refreshMediaGallery(contentEl, personId);
    } catch (error) {
      console.error(error);
      this.#setMediaStatus(contentEl, error?.message || 'Could not request removal.', 'error');
    }
  }

  async #reviewPendingMedia(contentEl, personId, number, action) {
    if (!number) {
      return;
    }

    const verb = action === 'approve' ? 'approve' : 'decline';
    if (!window.confirm(`Are you sure you want to ${verb} this media change?`)) {
      return;
    }

    this.#setMediaStatus(contentEl, `${action === 'approve' ? 'Approving' : 'Declining'} the change…`);

    try {
      await this.#submitMediaAction(personId, { action, number });
      this.#setMediaStatus(
        contentEl,
        action === 'approve' ? 'Change approved.' : 'Change declined.',
        'success',
      );
      await this.#refreshMediaGallery(contentEl, personId);
    } catch (error) {
      console.error(error);
      this.#setMediaStatus(contentEl, error?.message || `Could not ${verb} this change.`, 'error');
    }
  }

  #openMediaLightbox(contentEl, personId, name) {
    const image = this.#findMediaImage(name);
    const lightbox = contentEl.querySelector('.people-page__lightbox');
    if (!image || !lightbox) {
      return;
    }

    if (peoplePageMediaKind(image.name || image.url, image.mimeType || '') !== 'image') {
      window.open(image.url, '_blank', 'noopener');
      return;
    }

    const caption = this.#imageCaptionFromUrl(image.name);
    lightbox.querySelector('.people-page__lightbox-img').src = image.url;
    lightbox.querySelector('.people-page__lightbox-img').alt = caption;
    lightbox.querySelector('.people-page__lightbox-caption').textContent = caption;

    const canManage = Boolean(this.__mediaState?.canManage);
    const removalPending = (this.__mediaState?.pending || [])
      .some((entry) => entry.action === 'delete' && entry.filename === image.name);
    lightbox.querySelector('.people-page__lightbox-actions').innerHTML = `
      <button type="button" class="people-page__button-secondary" data-media-download="${peoplePageEscapeHtml(image.name)}">
        <i class="bi bi-download" aria-hidden="true"></i><span>Download</span>
      </button>
      ${canManage && image.sourceType === 'link' ? `
        <button type="button" class="people-page__button-secondary" data-media-localize="${peoplePageEscapeHtml(image.name)}">
          <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i><span>Upload</span>
        </button>
      ` : ''}
      ${canManage && !removalPending ? `
        <button type="button" class="people-page__button-danger" data-media-delete="${peoplePageEscapeHtml(image.name)}">
          <i class="bi bi-trash" aria-hidden="true"></i><span>Remove</span>
        </button>
      ` : ''}
    `;

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  #closeMediaLightbox(contentEl) {
    const lightbox = contentEl.querySelector('.people-page__lightbox');
    if (lightbox && !lightbox.hidden) {
      lightbox.hidden = true;
      document.body.style.overflow = '';
    }
  }

  async #downloadImage(url, filename) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('fetch failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'image';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (error) {
      // Cross-origin or network failure: fall back to opening in a new tab.
      window.open(url, '_blank', 'noopener');
    }
  }

  // Downscale and re-encode large photos client-side so the upload stays well
  // under server request-body limits (base64 inflates payloads by ~33%). PDFs
  // and pass-through image formats keep their original bytes.
  async #prepareImageForUpload(file) {
    const MAX_DIMENSION = 1800;
    const TARGET_BYTES = 900_000;
    const mediaKind = peoplePageMediaKind(file?.name || '', file?.type || '');

    const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read this media file.'));
      reader.readAsDataURL(blob);
    });

    const passThrough = async () => {
      if (file.size > PEOPLE_PAGE_MEDIA_MAX_BYTES) {
        throw new Error('Media files must be smaller than 8 MB.');
      }
      return { dataUrl: await readAsDataUrl(file), filename: file.name, note: '', kind: mediaKind };
    };

    // PDFs, GIFs (animation), and SVGs are kept as-is; photos get recompressed.
    if (mediaKind !== 'image' || !/^image\/(jpeg|png|webp|bmp|avif)$/i.test(file.type)) {
      return passThrough();
    }

    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      bitmap = null;
    }

    if (!bitmap) {
      return passThrough();
    }

    const largestSide = Math.max(bitmap.width, bitmap.height);
    if (largestSide <= MAX_DIMENSION && file.size <= TARGET_BYTES) {
      bitmap.close?.();
      return passThrough();
    }

    const scale = Math.min(1, MAX_DIMENSION / largestSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    let quality = 0.88;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while ((dataUrl.length * 3) / 4 > TARGET_BYTES && quality > 0.5) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return {
      dataUrl,
      filename: `${file.name.replace(/\.[^.]+$/, '')}.jpg`,
      note: 'Large image was resized so it uploads reliably.',
      kind: 'image',
    };
  }

  async #submitMediaAction(personId, body) {
    const url = this.#resolveGitHubApiUrl('github-media.php');
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url, this.#gitHubFetchInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        person_id: personId,
      }),
    }));

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      if (payload?.error === 'authentication_required') {
        throw new Error('Sign in with GitHub from the site header first.');
      }
      throw new Error(payload?.message || `The request failed (${response.status}).`);
    }

    return payload;
  }

  async #submitPageEditFiles(files, { commitMessage, prTitle, prBody = '' } = {}) {
    const url = this.#resolveGitHubApiUrl('github-submit-page-edit.php');
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url, this.#gitHubFetchInit({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        commit_message: commitMessage || 'Update profile media',
        pr_title: prTitle || commitMessage || 'Update profile media',
        pr_body: prBody,
      }),
    }));

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      if (payload?.error === 'authentication_required') {
        throw new Error('Sign in with GitHub from the site header first.');
      }
      throw new Error(payload?.message || `The request failed (${response.status}).`);
    }

    return payload;
  }

  async #upsertRecordMediaItem(personId, item, { setPrimary = false, commitMessage = '' } = {}) {
    await this.#ensurePeopleDb();
    if (!window.PeopleDB) {
      throw new Error('People database client is not available.');
    }

    const record = await window.PeopleDB.loadPerson(personId);
    if (!record) {
      throw new Error('Could not load the profile record.');
    }

    const updated = window.PeopleDB.upsertMediaItem(JSON.parse(JSON.stringify(record)), item, { setPrimary });
    window.PeopleDB.primePerson(updated);

    await this.#submitPageEditFiles([
      {
        path: window.PeopleDB.recordPath(personId),
        content: `${JSON.stringify(updated, null, 2)}\n`,
      },
    ], {
      commitMessage: commitMessage || `Update media for profile ${personId}`,
      prTitle: commitMessage || `Update media for profile ${personId}`,
    });

    return updated;
  }

  async #replaceRecordMediaItem(personId, currentImage, nextItem, { commitMessage = '' } = {}) {
    await this.#ensurePeopleDb();
    if (!window.PeopleDB) {
      throw new Error('People database client is not available.');
    }

    const record = await window.PeopleDB.loadPerson(personId);
    if (!record) {
      throw new Error('Could not load the profile record.');
    }

    const updated = JSON.parse(JSON.stringify(record));
    const currentKey = currentImage?.key || currentImage?.name || currentImage?.remote || currentImage?.local || '';
    if (currentKey) {
      window.PeopleDB.removeMediaItem(updated, currentKey);
    }

    const setPrimary = Boolean(currentImage?.primary);
    const replacement = { ...nextItem };
    if (setPrimary && !replacement.alt) {
      replacement.alt = String(record.names?.display || '').trim();
    }
    window.PeopleDB.upsertMediaItem(updated, replacement, { setPrimary });
    window.PeopleDB.primePerson(updated);

    await this.#submitPageEditFiles([
      {
        path: window.PeopleDB.recordPath(personId),
        content: `${JSON.stringify(updated, null, 2)}\n`,
      },
    ], {
      commitMessage: commitMessage || `Update media for profile ${personId}`,
      prTitle: commitMessage || `Update media for profile ${personId}`,
    });

    return updated;
  }

  async #removeRecordMediaItem(personId, image) {
    await this.#ensurePeopleDb();
    if (!window.PeopleDB) {
      throw new Error('People database client is not available.');
    }

    const record = await window.PeopleDB.loadPerson(personId);
    if (!record) {
      throw new Error('Could not load the profile record.');
    }

    const updated = window.PeopleDB.removeMediaItem(JSON.parse(JSON.stringify(record)), image.key || image.name || image.remote || image.local);
    window.PeopleDB.primePerson(updated);

    await this.#submitPageEditFiles([
      {
        path: window.PeopleDB.recordPath(personId),
        content: `${JSON.stringify(updated, null, 2)}\n`,
      },
    ], {
      commitMessage: `Remove media link from profile ${personId}`,
      prTitle: `Remove media link from profile ${personId}`,
    });

    return updated;
  }

  async #localizeLinkedMedia(contentEl, personId, name) {
    const image = this.#findMediaImage(name);
    if (!image || image.sourceType !== 'link' || !image.remote) {
      return;
    }

    const caption = String(image.title || '').trim() || this.#imageCaptionFromUrl(image.name || image.remote);
    const requestedName = String(image.name || '').trim()
      || decodeURIComponent(String(image.remote || '').split('?')[0].split('/').pop() || '').trim();

    if (!requestedName || !peoplePageImageExtension(requestedName || image.remote)) {
      this.#setMediaStatus(contentEl, 'Could not determine a filename for this media link.', 'error');
      return;
    }

    if (!window.confirm(`Upload “${caption}” to local media storage?`)) {
      return;
    }

    this.#setMediaStatus(contentEl, 'Uploading media locally…');

    try {
      const result = await this.#submitMediaAction(personId, {
        action: 'upload',
        filename: requestedName,
        caption,
        source_url: image.remote,
        commit_message: `Upload ${requestedName} locally for profile ${personId}`,
        pr_title: `Upload ${requestedName} locally for profile ${personId}`,
      });

      const storedFilename = String(result?.filename || requestedName).trim() || requestedName;
      await this.#replaceRecordMediaItem(personId, image, {
        local: `images/${storedFilename}`,
        remote: null,
        title: caption,
        form: '',
      }, {
        commitMessage: `Make media local for profile ${personId}`,
      });

      this.#setMediaStatus(contentEl, 'Media uploaded locally.', 'success');
      await this.#refreshMediaGallery(contentEl, personId);
    } catch (error) {
      console.error(error);
      this.#setMediaStatus(contentEl, error?.message || 'Could not upload this media locally.', 'error');
    }
  }

  // -------------------------------------------------------------------
  // Talk tab
  // -------------------------------------------------------------------

  async #loadTalkTab(token) {
    const contentEl = this.#getContentElement();
    if (!contentEl) {
      return;
    }

    contentEl.setAttribute('aria-busy', 'true');
    const personId = this.#resolvePersonId();

    contentEl.innerHTML = `
      <p>
        Discussion about this profile. Ask questions, share corrections, or add information —
        messages are saved straight to the public page history.
      </p>
      <div class="people-page__talk">
        <div class="people-page__status-note people-page__talk-status" role="status" hidden></div>
        <form class="people-page__talk-form" hidden>
          <p class="people-page__talk-form-title">Add to the discussion</p>
          <label class="screen-reader-text" for="people-page-talk-input">Write a message</label>
          <textarea
            id="people-page-talk-input"
            class="people-page__talk-input"
            maxlength="5000"
            placeholder="Write a message…"
          ></textarea>
          <div class="people-page__talk-form-footer">
            <button type="submit" class="people-page__button-primary people-page__talk-post">
              <i class="bi bi-chat-left-text" aria-hidden="true"></i>
              <span>Post message</span>
            </button>
            <span class="people-page__talk-form-note">
              Posted publicly under your name.
            </span>
          </div>
        </form>
        <p class="people-page__talk-signin" hidden>
          Sign in with GitHub from the site header to join the discussion.
        </p>
        <div class="people-page__talk-list" aria-live="polite">
          <p class="people-page__talk-empty">Loading discussion…</p>
        </div>
      </div>
    `;

    this.#bindTalkUi(contentEl, personId);
    await this.#refreshTalk(contentEl, personId);
    if (this.#isStaleTabLoad(token)) {
      return;
    }
    contentEl.removeAttribute('aria-busy');
    this.#notifyTabLoaded('talk');
  }

  #setTalkStatus(contentEl, message, type = 'info') {
    const status = contentEl.querySelector('.people-page__talk-status');
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  }

  async #fetchTalk(personId) {
    const url = this.#resolveGitHubApiUrl('github-talk.php');
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const talkUrl = new URL(url);
    talkUrl.searchParams.set('person', personId);

    const response = await fetch(talkUrl.href, this.#gitHubFetchInit({ cache: 'no-store' }));
    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Could not load the talk page (${response.status}).`);
    }

    return payload;
  }

  async #refreshTalk(contentEl, personId) {
    const form = contentEl.querySelector('.people-page__talk-form');
    const signin = contentEl.querySelector('.people-page__talk-signin');

    try {
      const payload = await this.#fetchTalk(personId);
      this.__talkState = {
        canModerate: Boolean(payload.can_moderate),
        viewerLogin: String(payload.viewer_login || ''),
      };

      const signedIn = Boolean(this.__talkState.viewerLogin);
      if (form) form.hidden = !signedIn;
      if (signin) signin.hidden = signedIn;

      this.#renderTalkMessages(contentEl, payload.messages || []);
    } catch (error) {
      console.warn('Falling back to static talk.json', error);
      this.__talkState = { canModerate: false, viewerLogin: '' };
      if (form) form.hidden = true;
      if (signin) signin.hidden = false;

      try {
        const response = await fetch(this.#resolveDataUrl('talk.json'), { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`No local talk.json (${response.status})`);
        }
        const data = await response.json();
        this.#renderTalkMessages(contentEl, Array.isArray(data?.messages) ? data.messages : []);
      } catch (fallbackError) {
        this.#renderTalkMessages(contentEl, []);
      }
    }
  }

  // Maps GitHub logins to Genepedia people via the prebuilt ownership login
  // index (data/Genepedia-Database/people/index/ownership-logins.json). Cached site-wide.
  async #loadPeopleLoginDirectory() {
    if (!window.__peopleLoginDirectoryPromise) {
      window.__peopleLoginDirectoryPromise = (async () => {
        const directory = new Map();
        try {
          const payload = window.App?.loadOwnershipLoginIndex
            ? await window.App.loadOwnershipLoginIndex()
            : await fetch(this.#resolveSiteUrl(window.App?.resolvePeopleDbPath?.('index/ownership-logins.json') || 'data/Genepedia-Database/people/index/ownership-logins.json'), { cache: 'no-store' })
              .then(async (response) => (response.ok ? response.json() : null))
              .then((data) => data?.logins || {});
          Object.entries(payload || {}).forEach(([login, personId]) => {
            const cleanLogin = String(login || '').trim().toLowerCase();
            const cleanPersonId = String(personId || '').trim();
            if (cleanLogin && cleanPersonId && !directory.has(cleanLogin)) {
              directory.set(cleanLogin, cleanPersonId);
            }
          });
        } catch (error) {
          console.warn('Could not build the people login directory', error);
        }

        return directory;
      })();
    }

    return window.__peopleLoginDirectoryPromise;
  }

  // Person card (display name, profile URL, portrait) for a Genepedia id.
  async #loadPersonCard(personId) {
    window.__personCardCache = window.__personCardCache || new Map();
    if (window.__personCardCache.has(personId)) {
      return window.__personCardCache.get(personId);
    }

    const promise = (async () => {
      const card = {
        personId,
        profileUrl: this.#resolveSiteUrl(`people/${personId}/`),
        name: '',
        photoUrl: '',
      };

      try {
        if (window.PeopleRegistry?.loadPeopleRegistry) {
          const people = await window.PeopleRegistry.loadPeopleRegistry();
          const entry = people.find((person) => String(person?.id) === personId);
          if (entry) {
            card.name = [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
          }
        }
      } catch (error) {
        // keep fallback name
      }

      try {
        const response = await fetch(this.#resolveSiteUrl(`people/${personId}/data/profile-table.html`), { cache: 'no-store' });
        if (response.ok) {
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          const src = doc.querySelector('table-photo img')?.getAttribute('src')?.trim() || '';
          if (src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
            card.photoUrl = src.startsWith('data/')
              ? this.#resolveSiteUrl(`people/${personId}/${src.replace(/^\.?\//, '')}`)
              : this.#resolvePersonMediaUrlFor(personId, src);
          } else if (src) {
            card.photoUrl = src;
          }
        }
      } catch (error) {
        // no portrait available
      }

      return card;
    })();

    window.__personCardCache.set(personId, promise);
    return promise;
  }

  async #resolveTalkAuthorCards(messages) {
    const cards = new Map();

    try {
      const directory = await this.#loadPeopleLoginDirectory();
      const logins = [...new Set(
        messages.map((message) => String(message?.author_login || '').trim().toLowerCase()).filter(Boolean),
      )];

      await Promise.all(logins.map(async (login) => {
        const personId = directory.get(login);
        if (!personId) {
          return;
        }

        const card = await this.#loadPersonCard(personId);
        if (card) {
          cards.set(login, card);
        }
      }));
    } catch (error) {
      console.warn('Could not resolve talk authors to people profiles', error);
    }

    return cards;
  }

  async #renderTalkMessages(contentEl, messages) {
    const list = contentEl.querySelector('.people-page__talk-list');
    if (!list) {
      return;
    }

    const state = this.__talkState || { canModerate: false, viewerLogin: '' };

    if (!messages.length) {
      list.innerHTML = '<p class="people-page__talk-empty">No messages yet. Start the discussion!</p>';
      return;
    }

    // Newest first, directly under the composer.
    const ordered = [...messages].sort((a, b) => (
      String(b?.created_at || '').localeCompare(String(a?.created_at || ''))
    ));

    const authorCards = await this.#resolveTalkAuthorCards(ordered);

    list.innerHTML = ordered.map((message) => {
      const id = String(message?.id || '');
      const login = String(message?.author_login || '');
      const card = authorCards.get(login.toLowerCase()) || null;
      const name = (card?.name) || String(message?.author_name || login || 'Unknown');
      const avatar = (card?.photoUrl) || String(message?.author_avatar || '');
      const authorUrl = (card?.profileUrl)
        || String(message?.author_url || (login ? `https://github.com/${login}` : ''));
      const isExternalAuthorLink = !card;
      const created = peoplePageFormatDate(message?.created_at);
      const canDelete = state.canModerate
        || (state.viewerLogin && login && state.viewerLogin.toLowerCase() === login.toLowerCase());

      const avatarMarkup = avatar
        ? `<img src="${peoplePageEscapeHtml(avatar)}" alt="" loading="lazy">`
        : '<i class="bi bi-person-circle" aria-hidden="true"></i>';
      const authorMarkup = authorUrl
        ? `<a class="people-page__talk-author" href="${peoplePageEscapeHtml(authorUrl)}"${isExternalAuthorLink ? ' target="_blank" rel="noopener noreferrer"' : ''}>${peoplePageEscapeHtml(name)}</a>`
        : `<span class="people-page__talk-author">${peoplePageEscapeHtml(name)}</span>`;

      return `
        <article class="people-page__talk-message" data-message-id="${peoplePageEscapeHtml(id)}">
          <span class="people-page__talk-avatar">${avatarMarkup}</span>
          <div class="people-page__talk-content">
            <div class="people-page__talk-meta">
              ${authorMarkup}
              <span class="people-page__talk-time">${peoplePageEscapeHtml(created)}</span>
              ${canDelete ? `
                <button
                  type="button"
                  class="people-page__button-danger people-page__talk-delete"
                  data-talk-delete="${peoplePageEscapeHtml(id)}"
                  title="Delete this message"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                  <span>Delete</span>
                </button>
              ` : ''}
            </div>
            <p class="people-page__talk-body">${peoplePageEscapeHtml(String(message?.body || ''))}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  #bindTalkUi(contentEl, personId) {
    const form = contentEl.querySelector('.people-page__talk-form');
    const input = contentEl.querySelector('.people-page__talk-input');
    const postButton = contentEl.querySelector('.people-page__talk-post');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = String(input?.value || '').trim();
      if (!body) {
        this.#setTalkStatus(contentEl, 'Write a message first.', 'error');
        return;
      }

      if (postButton) postButton.disabled = true;
      this.#setTalkStatus(contentEl, 'Posting your message…');

      try {
        const payload = await this.#submitTalkAction(personId, { action: 'post', body });
        if (input) input.value = '';
        this.#setTalkStatus(contentEl, 'Message posted.', 'success');
        this.#renderTalkMessages(contentEl, payload.messages || []);
      } catch (error) {
        console.error(error);
        this.#setTalkStatus(contentEl, error?.message || 'Could not post your message.', 'error');
      } finally {
        if (postButton) postButton.disabled = false;
      }
    });

    if (contentEl.__talkDeleteBound) {
      return;
    }
    contentEl.__talkDeleteBound = true;

    contentEl.addEventListener('click', async (event) => {
      const deleteButton = event.target.closest?.('[data-talk-delete]');
      if (!deleteButton || !contentEl.contains(deleteButton)) {
        return;
      }

      event.preventDefault();
      const messageId = deleteButton.dataset.talkDelete || '';
      if (!messageId) {
        return;
      }

      if (!window.confirm('Delete this message? This is recorded in the public page history.')) {
        return;
      }

      deleteButton.disabled = true;
      this.#setTalkStatus(contentEl, 'Deleting message…');

      try {
        const payload = await this.#submitTalkAction(personId, { action: 'delete', message_id: messageId });
        this.#setTalkStatus(contentEl, 'Message deleted.', 'success');
        this.#renderTalkMessages(contentEl, payload.messages || []);
      } catch (error) {
        console.error(error);
        this.#setTalkStatus(contentEl, error?.message || 'Could not delete this message.', 'error');
        deleteButton.disabled = false;
      }
    });
  }

  async #submitTalkAction(personId, body) {
    const url = this.#resolveGitHubApiUrl('github-talk.php');
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url, this.#gitHubFetchInit({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        person_id: personId,
      }),
    }));

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      if (payload?.error === 'authentication_required') {
        throw new Error('Sign in with GitHub from the site header first.');
      }
      throw new Error(payload?.message || `The request failed (${response.status}).`);
    }

    return payload;
  }

  #resolvePersonMediaUrlFor(personId, path = '') {
    const id = String(personId || '').trim();
    const value = path?.trim() || '';
    if (!id) {
      return value ? this.#resolveSiteUrl(value.replace(/^\/+/, '')) : '';
    }
    if (typeof window.App?.resolvePersonMediaUrl === 'function') {
      return window.App.resolvePersonMediaUrl(id, value);
    }

    const normalized = value.replace(/^\.?\//, '').replace(/^\/+/, '');
    if (!normalized) {
      return this.#resolveSiteUrl(`data/Genepedia-Media/people/${id}/`);
    }

    const relative = normalized.startsWith('data/images/')
      ? normalized.slice('data/images/'.length)
      : normalized.startsWith('images/')
        ? normalized.slice('images/'.length)
        : normalized;

    return this.#resolveSiteUrl(`data/Genepedia-Media/people/${id}/${relative}`);
  }

  #resolveImageUrl(path) {
    const value = path?.trim() || '';
    if (!value) {
      return '';
    }

    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      return value;
    }

    if (
      value.startsWith('data/Genepedia-Media/')
      || value.startsWith('assets/')
      || value.startsWith('lib/')
      || value.startsWith('pages/')
      || value.startsWith('people/')
    ) {
      return this.#resolveSiteUrl(value);
    }

    if (value.startsWith('data/')) {
      return new URL(value, window.location.href).href;
    }

    return this.#resolvePersonMediaUrlFor(this.#resolvePersonId(), value);
  }

  #imageFilenameFromHref(href) {
    const filename = (href.split('?')[0].split('/').pop() || '').trim();
    return PEOPLE_PAGE_MEDIA_EXTENSIONS.test(filename) ? filename : '';
  }

  async #listDataImages() {
    const images = new Set();

    try {
      const directoryResponse = await fetch(this.#resolvePersonMediaUrlFor(this.#resolvePersonId()));
      if (directoryResponse.ok) {
        const contentType = directoryResponse.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const listing = await directoryResponse.json();
          const entries = Array.isArray(listing) ? listing : listing?.files || listing?.images || [];
          entries.forEach((entry) => {
            const filename = this.#imageFilenameFromHref(
              typeof entry === 'string' ? entry : entry?.name || entry?.file || '',
            );
            if (filename) {
              images.add(this.#resolveImageUrl(filename));
            }
          });
        } else {
          const listing = new DOMParser().parseFromString(await directoryResponse.text(), 'text/html');
          listing.querySelectorAll('a[href]').forEach((link) => {
            const filename = this.#imageFilenameFromHref(link.getAttribute('href') || '');
            if (filename) {
              images.add(this.#resolveImageUrl(filename));
            }
          });
        }
      }
    } catch (error) {
      console.warn('Could not read the profile media folder', error);
    }

    if (images.size === 0) {
      try {
        const profileResponse = await fetch(this.#resolveDataUrl('profile.html'));
        if (profileResponse.ok) {
          const profileDoc = new DOMParser().parseFromString(await profileResponse.text(), 'text/html');
          profileDoc.querySelectorAll('aside img[src]').forEach((img) => {
            const url = this.#resolveImageUrl(img.getAttribute('src') || '');
            if (url) {
              images.add(url);
            }
          });
        }
      } catch (error) {
        console.warn('Could not read profile images', error);
      }
    }

    return [...images].sort((a, b) => a.localeCompare(b));
  }

  #imageCaptionFromUrl(url) {
    const filename = decodeURIComponent(url.split('/').pop() || 'Image');
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

}

if (!customElements.get('people-page')) {
  customElements.define('people-page', PeoplePage);
}
