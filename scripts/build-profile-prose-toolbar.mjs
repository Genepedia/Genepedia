#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const srcPath = path.join(root, "components/profile-page-editor.js");
const outPath = path.join(root, "components/profile-prose-toolbar.js");
const src = fs.readFileSync(srcPath, "utf8");
const lines = src.split("\n");

function slice(start, end) {
	return lines.slice(start - 1, end).join("\n");
}

const modalsBlock = slice(1071, 1206)
	.split("\n")
	.map((line) => line.replace(/^\t\t\t\t\t/, "\t\t\t"))
	.join("\n");

const body = `/**
 * Shared rich-text toolbar for profile and page editors.
 *
 * <profile-prose-toolbar add-block person="123"></profile-prose-toolbar>
 *
 * Set commandRootProvider on the element to return the active contenteditable root.
 */
(function () {
\t"use strict";

${slice(23, 38)}

${slice(40, 63)}

${slice(65, 606)}

\tfunction renderAddBlockButton() {
\t\treturn \`<button type="button" class="ppe__tool ppe__tool--add-block" data-action="add-block" aria-label="Add block" title="Add block"><i class="bi bi-plus-lg" aria-hidden="true"></i><span class="ppe__tool-label">Add block</span></button><span class="ppe__toolbar-sep" aria-hidden="true"></span>\`;
\t}

\tfunction renderToolbarHtml(options = {}) {
\t\tconst parts = [];
\t\tif (options.showAddBlock) parts.push(renderAddBlockButton());
\t\tparts.push(...PRIMARY_INLINE_TOOLS.map((btn) => renderToolButton(btn)));
\t\tparts.push(renderUnderlineMenu());
\t\tparts.push(...SECONDARY_INLINE_TOOLS.map((btn) => renderToolButton(btn)));
\t\tparts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
\t\tparts.push(renderToolbarMenu("heading", "bi-paragraph", "Paragraph", HEADING_OPTIONS, { labelOnly: true }));
\t\tparts.push(renderToolbarMenu("list", "bi-list-ul", "List", LIST_OPTIONS));
\t\tparts.push(...LIST_INDENT_TOOLS.map((btn) => renderToolButton(btn)));
\t\tparts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
\t\tfor (const btn of TRAILING_TOOLS) {
\t\t\tif (btn.separator) {
\t\t\t\tparts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
\t\t\t\tcontinue;
\t\t\t}
\t\t\tparts.push(renderToolButton(btn));
\t\t\tif (btn.action === "image") {
\t\t\t\tparts.push(renderSpecialCharsMenu());
\t\t\t}
\t\t}
\t\treturn parts.join("");
\t}

${slice(629, 661)}

${slice(964, 967)}

${slice(969, 1041)}

\tfunction renderModalsHtml() {
\t\treturn \`
${modalsBlock}
\t\t\`;
\t}

\tfunction prepareAtomicChartElement(figure) {
\t\tif (!figure) return;
\t\tconst caption = figure.querySelector("figcaption")?.textContent?.trim() || "Chart";
\t\tfigure.setAttribute("contenteditable", "false");
\t\tfigure.setAttribute("tabindex", "0");
\t\tfigure.setAttribute("role", "group");
\t\tfigure.setAttribute("aria-label", caption);
\t\tfigure.setAttribute("title", "Click to select or deselect. Right-click for options. Double-click to edit.");
\t}

\tclass ProfileProseToolbar extends HTMLElement {
\t\tstatic get observedAttributes() {
\t\t\treturn ["person"];
\t\t}

\t\tconnectedCallback() {
\t\t\tif (this.__ready) return;
\t\t\tthis.__ready = true;
\t\t\tconst showAddBlock = this.hasAttribute("add-block");
\t\t\tthis.innerHTML = \`
\t\t\t\t<div class="ppe__toolbar" role="toolbar" aria-label="Text formatting">
\t\t\t\t\t\${renderToolbarHtml({ showAddBlock })}
\t\t\t\t</div>
\t\t\t\t\${renderModalsHtml()}
\t\t\t\`;
\t\t\tthis._toolbarEl = this.querySelector(".ppe__toolbar");
\t\t\tthis.#bindToolbar();
\t\t\tthis.#bindLinkPopover();
\t\t\tthis.#bindMediaModal();
\t\t\tthis.#bindTableModal();
\t\t\tthis.#bindChartModal();
\t\t\tthis.#updateToolbarState();
\t\t}

\t\tdisconnectedCallback() {
\t\t\tif (this.__onOutsideMenu) {
\t\t\t\tdocument.removeEventListener("mousedown", this.__onOutsideMenu);
\t\t\t}
\t\t}

\t\tupdateToolbarState() {
\t\t\tthis.#updateToolbarState();
\t\t}

\t\topenChartEditor(figure) {
\t\t\tthis.#openChartEditor(figure);
\t\t}

\t\tset commandRootProvider(fn) {
\t\t\tthis._commandRootProvider = typeof fn === "function" ? fn : null;
\t\t}

\t\tget commandRootProvider() {
\t\t\treturn this._commandRootProvider || null;
\t\t}

\t\tset insertionHooks(hooks) {
\t\t\tthis._insertionHooks = hooks && typeof hooks === "object" ? hooks : null;
\t\t}

\t\t#getRoot() {
\t\t\tconst root = this.commandRootProvider?.();
\t\t\treturn root && root.isConnected ? root : null;
\t\t}

\t\t#getPersonId() {
\t\t\treturn String(this.getAttribute("person") || "").trim();
\t\t}

\t\t#resolveImageUrl(src) {
\t\t\tif (!src || isAbsoluteUrl(src) || src.startsWith("data:")) return src;
\t\t\tconst normalized = src.replace(/^\\.?\\//, "");
\t\t\tconst personId = this.#getPersonId();
\t\t\tif (normalized.startsWith("assets/")) return resolveSiteUrl(normalized);
\t\t\tif (personId) return resolveSiteUrl(\`people/\${personId}/data/\${normalized}\`);
\t\t\treturn resolveSiteUrl(normalized);
\t\t}

PLACEHOLDER_METHODS
\t}

\tcustomElements.define("profile-prose-toolbar", ProfileProseToolbar);

\twindow.ProfileProseToolbar = {
\t\tbuildProfileChartHtml,
\t\tbuildProfileTableHtml,
\t\tprepareAtomicChartElement,
\t\tparseChartFromFigure,
\t\tATOMIC_BLOCK_SELECTOR,
\t};
})();`;

// Toolbar bind/commands, state sync, and modals only (skip prose/atomic-block editing).
let methods = [
	slice(1281, 1658),
	slice(2149, 2188),
	slice(2223, 2532),
	slice(2636, 2788),
	slice(2819, 2946),
].join("\n\n");
methods = methods
	.replace(/\t\t#els\(\) \{[\s\S]*?\t\t\}/, "")
	.replace(/const \{ prose \} = this\.#els\(\);/g, "const prose = this.#getRoot();")
	.replace(/const \{ toolbar \} = this\.#els\(\);/g, "const toolbar = this._toolbarEl;")
	.replace(/this\.#els\(\)\.prose/g, "this.#getRoot()")
	.replace(/this\.querySelectorAll\("\.ppe__menu"\)/g, 'this.querySelectorAll(".ppe__menu")')
	.replace(/this\.__personId/g, "this.#getPersonId()")
	.replace(/this\.#setStatus\([^)]*\);?\n?/g, "")
	.replace(/this\.#onProseChanged\(\)/g, "this.#emitChange()")

// Add helper methods before class closing
const extraMethods = `
\t\t#emitChange() {
\t\t\tthis.dispatchEvent(new CustomEvent("ppe-toolbar-change", { bubbles: true }));
\t\t}

\t\t#emitChartSelected(figure) {
\t\t\tthis.dispatchEvent(new CustomEvent("ppe-chart-selected", { bubbles: true, detail: { figure } }));
\t\t}

\t\t#wireCharts(root) {
\t\t\tif (!root) return;
\t\t\troot.querySelectorAll(ATOMIC_BLOCK_SELECTOR).forEach((figure) => prepareAtomicChartElement(figure));
\t\t\tthis.dispatchEvent(new CustomEvent("ppe-charts-wired", { bubbles: true, detail: { root } }));
\t\t}

\t\t#afterCommand() {
\t\t\tthis.#emitChange();
\t\t\tthis.#updateToolbarState();
\t\t}
`;

methods = methods.replace(/\t\t#afterCommand\(\) \{[\s\S]*?\t\t\}/, extraMethods.trim());

const customInsertChart = `\t\t#insertChart() {
\t\t\tconst prose = this.#getRoot();
\t\t\tif (!prose) return;

\t\t\tconst options = this.#readChartModalOptions();
\t\t\tif (!options.values.some((value) => value > 0)) {
\t\t\t\tconst modal = this.querySelector(".ppe__chart-modal");
\t\t\t\tconst firstValue = modal?.querySelector(".ppe__chart-value");
\t\t\t\tfirstValue?.focus();
\t\t\t\treturn;
\t\t\t}

\t\t\tconst editing = this.__editingChart?.isConnected ? this.__editingChart : null;
\t\t\tconst html = buildProfileChartHtml(options);
\t\t\tif (editing) {
\t\t\t\tconst wrapper = document.createElement("div");
\t\t\t\twrapper.innerHTML = buildProfileChartHtml(options);
\t\t\t\tconst replacement = wrapper.firstElementChild;
\t\t\t\tif (replacement) {
\t\t\t\t\tediting.replaceWith(replacement);
\t\t\t\t\tprepareAtomicChartElement(replacement);
\t\t\t\t\tthis.dispatchEvent(new CustomEvent("ppe-chart-replaced", { bubbles: true, detail: { figure: replacement, previous: editing } }));
\t\t\t\t\tthis.#emitChartSelected(replacement);
\t\t\t\t}
\t\t\t\tprose.focus({ preventScroll: true });
\t\t\t} else {
\t\t\t\tthis.#insertHtmlIntoRoot(\`\${html}<p><br></p>\`);
\t\t\t\tthis.#wireCharts(prose);
\t\t\t\tconst chart = [...prose.querySelectorAll(ATOMIC_BLOCK_SELECTOR)].at(-1);
\t\t\t\tif (chart) this.#emitChartSelected(chart);
\t\t\t}

\t\t\tthis.#afterCommand();
\t\t\tthis.#closeChartModal();
\t\t}`;

methods += `\n\n${customInsertChart}`;

// Simplify insertChart editing path - keep insert only in toolbar
methods = methods.replace(
	/\t\t#insertChart\(\) \{[\s\S]*?\t\t\}/,
	"",
);

methods = methods.replace(/\t\t#getInsertionRange\(\) \{[\s\S]*?\t\t\}/, `\t\t#getInsertionRange() {
\t\t\tconst prose = this.#getRoot();
\t\t\tif (!prose) return null;

\t\t\tlet range = null;
\t\t\tif (this.__savedRange) {
\t\t\t\tconst host = this.__savedRange.commonAncestorContainer;
\t\t\t\tconst element = host.nodeType === Node.ELEMENT_NODE ? host : host.parentNode;
\t\t\t\tif (element && prose.contains(element)) {
\t\t\t\t\trange = this.__savedRange.cloneRange();
\t\t\t\t}
\t\t\t}
\t\t\tif (!range) {
\t\t\t\tconst selection = window.getSelection();
\t\t\t\tif (selection?.rangeCount) {
\t\t\t\t\tconst current = selection.getRangeAt(0);
\t\t\t\t\tconst host = current.commonAncestorContainer;
\t\t\t\t\tconst element = host.nodeType === Node.ELEMENT_NODE ? host : host.parentNode;
\t\t\t\t\tif (element && prose.contains(element)) {
\t\t\t\t\t\trange = current.cloneRange();
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t\tif (!range) {
\t\t\t\trange = document.createRange();
\t\t\t\trange.selectNodeContents(prose);
\t\t\t\trange.collapse(false);
\t\t\t}

\t\t\tconst hooks = this._insertionHooks;
\t\t\tif (hooks?.adjustInsertionRange) {
\t\t\t\trange = hooks.adjustInsertionRange(range, prose) || range;
\t\t\t}
\t\t\treturn range;
\t\t}`);

methods = methods.replace(/\t\t#insertHtmlIntoProse\([^)]*\) \{[\s\S]*?\t\t\}/, `\t\t#insertHtmlIntoRoot(html) {
\t\t\tconst prose = this.#getRoot();
\t\t\tif (!prose) return;
\t\t\tprose.focus();
\t\t\tconst range = this.#getInsertionRange();
\t\t\tif (!range) return;
\t\t\tconst selection = window.getSelection();
\t\t\tselection?.removeAllRanges();
\t\t\tselection?.addRange(range);
\t\t\tdocument.execCommand("insertHTML", false, html);
\t\t}`);

methods = methods.replace(/this\.#insertHtmlIntoProse/g, "this.#insertHtmlIntoRoot");

// Add block button handler in bindToolbar click
methods = methods.replace(
	/\t\t\tconst button = event\.target\.closest\("\.ppe__tool:not\(\.ppe__menu-toggle\)"\);/,
	`\t\t\tconst addBlock = event.target.closest("[data-action=\\"add-block\\"]");
\t\t\tif (addBlock) {
\t\t\t\tthis.dispatchEvent(new CustomEvent("ppe-add-block", { bubbles: true }));
\t\t\t\treturn;
\t\t\t}
\t\t\tconst button = event.target.closest(".ppe__tool:not(.ppe__menu-toggle)");`,
);

const output = body.replace("PLACEHOLDER_METHODS", methods);
fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath} (${output.split("\\n").length} lines)`);
