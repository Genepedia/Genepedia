/**
 * Shared rich-text toolbar for profile and page editors.
 *
 * <profile-prose-toolbar add-block person="123"></profile-prose-toolbar>
 *
 * Set commandRootProvider on the element to return the active contenteditable root.
 */
(function () {
	"use strict";

	function resolveSiteUrl(path) {
		const clean = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(clean);
		// edit.html lives in people/, so the site root is one level up.
		return new URL(`../${clean}`, window.location.href).href;
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[char]));
	}

	function isAbsoluteUrl(value) {
		return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || ""));
	}

	async function isDraftProfile(personId) {
		if (new URLSearchParams(window.location.search).get("new") === "1") return true;
		if (!window.PeopleRegistry?.loadPeopleRegistry) return false;
		try {
			const people = await window.PeopleRegistry.loadPeopleRegistry();
			const id = String(personId || "").trim();
			return !people.some((person) => String(person?.id || "").trim() === id);
		} catch (error) {
			return false;
		}
	}

	async function fetchSiteResource(url) {
		try {
			const response = await fetch(url, { cache: "no-store" });
			return response.ok ? response : null;
		} catch (error) {
			return null;
		}
	}

	const PRIMARY_INLINE_TOOLS = [
		{ command: "bold", icon: "bi-type-bold", label: "Bold (Ctrl+B)", state: "bold" },
		{ command: "italic", icon: "bi-type-italic", label: "Italic (Ctrl+I)", state: "italic" },
	];

	const SECONDARY_INLINE_TOOLS = [
		{ command: "strikeThrough", icon: "bi-type-strikethrough", label: "Strikethrough", state: "strikeThrough" },
		{ command: "subscript", icon: "bi-subscript", label: "Subscript", state: "subscript" },
		{ command: "superscript", icon: "bi-superscript", label: "Superscript", state: "superscript" },
	];

	const UNDERLINE_CLASS_PREFIX = "ppe-u--";

	const UNDERLINE_OPTIONS = [
		{ underlineStyle: "none", label: "(Without)" },
		{ underlineStyle: "solid", label: "Solid" },
		{ underlineStyle: "double", label: "Double" },
		{ underlineStyle: "thick", label: "Thick" },
		{ underlineStyle: "dotted", label: "Dotted" },
		{ underlineStyle: "dotted-thick", label: "Thick dotted" },
		{ underlineStyle: "dashed", label: "Dashed" },
		{ underlineStyle: "dashed-long", label: "Long dashed" },
		{ underlineStyle: "dash-dot", label: "Dash dot" },
		{ underlineStyle: "dash-dot-dot", label: "Dash dot dot" },
		{ underlineStyle: "wavy", label: "Wavy" },
	];

	const HEADING_OPTIONS = [
		{ block: "p", icon: "bi-paragraph", label: "Paragraph" },
		{ block: "h1", icon: "bi-type-h1", label: "Heading 1" },
		{ block: "h2", icon: "bi-type-h2", label: "Heading 2" },
		{ block: "h3", icon: "bi-type-h3", label: "Heading 3" },
		{ block: "h4", text: "H4", label: "Heading 4" },
		{ block: "h5", text: "H5", label: "Heading 5" },
		{ block: "h6", text: "H6", label: "Heading 6" },
		{ separator: true },
		{ block: "blockquote", icon: "bi-quote", label: "Quote" },
	];

	const HEADING_LABEL_BY_BLOCK = Object.fromEntries(
		HEADING_OPTIONS.filter((item) => item.block).map((item) => [item.block, item.label]),
	);

	const INLINE_FORMAT_TAGS = {
		bold: ["B", "STRONG"],
		italic: ["I", "EM"],
		strikeThrough: ["S", "STRIKE", "DEL"],
		subscript: ["SUB"],
		superscript: ["SUP"],
	};

	const INLINE_FORMAT_COMMANDS = Object.keys(INLINE_FORMAT_TAGS);

	const LIST_OPTIONS = [
		{ listType: "bullet", icon: "bi-list-ul", label: "Bulleted list" },
		{ listType: "decimal", icon: "bi-list-ol", label: "Numbered list (1, 2, 3)" },
		{ listType: "lower-alpha", icon: "bi-list-ol", label: "Letter list (a, b, c)", olType: "a" },
		{ listType: "upper-alpha", icon: "bi-list-ol", label: "Letter list (A, B, C)", olType: "A" },
		{ listType: "lower-roman", icon: "bi-list-ol", label: "Roman list (i, ii, iii)", olType: "i" },
		{ listType: "upper-roman", icon: "bi-list-ol", label: "Roman list (I, II, III)", olType: "I" },
		{ separator: true },
		{ listType: "definition", icon: "bi-card-list", label: "Definition list" },
	];

	const LIST_INDENT_TOOLS = [
		{ listType: "outdent", icon: "bi-text-indent-left", label: "Decrease indent" },
		{ listType: "indent", icon: "bi-text-indent-right", label: "Increase indent" },
	];

	const TEXT_ALIGN_TOOLS = [
		{ textAlign: "left", icon: "bi-text-left", label: "Align left" },
		{ textAlign: "center", icon: "bi-text-center", label: "Align center" },
		{ textAlign: "right", icon: "bi-text-right", label: "Align right" },
		{ textAlign: "justify", icon: "bi-justify", label: "Justify" },
	];

	const TRAILING_TOOLS = [
		{ action: "link", icon: "bi-link-45deg", label: "Link" },
		{ action: "image", icon: "bi-image", label: "Insert image" },
		{ action: "table", icon: "bi-table", label: "Insert Table" },
		{ action: "chart", icon: "bi-bar-chart", label: "Insert Chart" },
		{ separator: true },
		{ command: "removeFormat", icon: "bi-eraser", label: "Clear formatting" },
	];

	const CHART_TYPE_OPTIONS = [
		{ id: "bar", label: "Bar chart" },
		{ id: "line", label: "Line chart" },
		{ id: "pie", label: "Pie chart" },
	];

	const CHART_COLORS = [
		"#3366cc", "#dc3912", "#ff9900", "#109618", "#990099",
		"#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395",
		"#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300",
	];

	const CHART_SAMPLE_VALUES = [25, 40, 30, 55];

	const SPECIAL_CHARACTER_GROUPS = [
		{
			label: "Accents",
			characters: [
				"á", "à", "â", "ä", "ã", "å", "æ",
				"é", "è", "ê", "ë",
				"í", "ì", "î", "ï",
				"ó", "ò", "ô", "ö", "õ", "ø", "œ",
				"ú", "ù", "û", "ü",
				"ý", "ÿ", "ñ", "ç", "ß", "ł", "đ", "ð", "þ",
			],
		},
		{
			label: "Accents (caps)",
			characters: [
				"Á", "À", "Â", "Ä", "Ã", "Å", "Æ",
				"É", "È", "Ê", "Ë",
				"Í", "Ì", "Î", "Ï",
				"Ó", "Ò", "Ô", "Ö", "Õ", "Ø", "Œ",
				"Ú", "Ù", "Û", "Ü",
				"Ý", "Ñ", "Ç", "Ł", "Đ", "Þ", "Ð",
			],
		},
		{
			label: "Punctuation",
			characters: [
				"–", "—", "…", "·", "•", "°", "′", "″",
				"§", "¶", "†", "‡", "©", "®", "™", "№",
				"¿", "¡", "‰", "‱", "※", "⁂",
			],
		},
		{
			label: "Quotes",
			characters: ["‘", "’", "‚", "“", "”", "„", "«", "»", "‹", "›"],
		},
		{
			label: "Math",
			characters: [
				"×", "÷", "±", "∓", "≈", "≠", "≤", "≥",
				"∞", "√", "∑", "∂", "µ", "π",
			],
		},
		{
			label: "Fractions",
			characters: ["½", "¼", "¾", "⅓", "⅔", "⅛", "⅜", "⅝", "⅞"],
		},
		{
			label: "Currency",
			characters: ["$", "€", "£", "¥", "¢", "₩", "₹", "₽"],
		},
	];

	function renderToolButton(btn) {
		// Only emit data-* attributes that have a value. Emitting empty
		// attributes (e.g. data-block="") makes presence-based selectors like
		// [data-block] / [data-text-align] match inline tool buttons, which then
		// strips their active state during toolbar refresh.
		const attrs = [
			["data-command", btn.command],
			["data-block", btn.block],
			["data-action", btn.action],
			["data-list-type", btn.listType],
			["data-ol-type", btn.olType],
			["data-text-align", btn.textAlign],
			["data-state", btn.state],
		]
			.filter(([, value]) => value)
			.map(([name, value]) => `${name}="${value}"`)
			.concat([
				`aria-label="${btn.label}"`,
				`title="${btn.label}"`,
			])
			.join(" ");
		if (btn.text) {
			return `<button type="button" class="ppe__tool ppe__tool--text" ${attrs}><span class="ppe__tool-text" aria-hidden="true">${btn.text}</span></button>`;
		}
		return `<button type="button" class="ppe__tool" ${attrs}><i class="bi ${btn.icon}" aria-hidden="true"></i></button>`;
	}

	function renderMenuIcon(item) {
		if (item.text) {
			return `<span class="ppe__menu-item-mark" aria-hidden="true">${item.text}</span>`;
		}
		return `<i class="bi ${item.icon}" aria-hidden="true"></i>`;
	}

	function renderMenuItems(items, itemClass) {
		return items.map((item) => {
			if (item.separator) return '<div class="ppe__menu-sep" role="separator"></div>';
			const attrs = [
				item.block ? `data-block="${item.block}"` : "",
				item.listType ? `data-list-type="${item.listType}"` : "",
				item.olType ? `data-ol-type="${item.olType}"` : "",
				`title="${item.label}"`,
			].filter(Boolean).join(" ");
			return `<button type="button" class="${itemClass}" role="menuitem" ${attrs}>${renderMenuIcon(item)}<span>${escapeHtml(item.label)}</span></button>`;
		}).join("");
	}

	function underlineClassForStyle(style) {
		if (!style || style === "solid") {
			return "";
		}
		return `${UNDERLINE_CLASS_PREFIX}${style}`;
	}

	function setUnderlineStyleClass(element, style) {
		[...element.classList].forEach((className) => {
			if (className.startsWith(UNDERLINE_CLASS_PREFIX)) {
				element.classList.remove(className);
			}
		});
		const className = underlineClassForStyle(style);
		if (className) {
			element.classList.add(className);
		}
	}

	function unwrapElement(element) {
		const parent = element.parentNode;
		if (!parent) return;
		while (element.firstChild) {
			parent.insertBefore(element.firstChild, element);
		}
		parent.removeChild(element);
	}

	function wrapRangeContents(range, element) {
		try {
			range.surroundContents(element);
		} catch (error) {
			const fragment = range.extractContents();
			element.append(fragment);
			range.insertNode(element);
		}
		return element;
	}

	function renderUnderlineMenuItems(items) {
		return items.map((item) => {
			if (item.underlineStyle === "none") {
				return `<button type="button" class="ppe__menu-item ppe__underline-menu-item ppe__underline-menu-item--none" role="menuitem" data-underline-style="none" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button><div class="ppe__menu-sep" role="separator"></div>`;
			}

			const previewClass = `ppe-u--${item.underlineStyle}`;
			return `<button type="button" class="ppe__menu-item ppe__underline-menu-item" role="menuitem" data-underline-style="${item.underlineStyle}" title="${escapeHtml(item.label)}" aria-label="${escapeHtml(item.label)}"><span class="ppe__underline-preview-wrap" aria-hidden="true"><span class="ppe__underline-preview-line ${previewClass}"></span></span><span class="ppe__underline-menu-label">${escapeHtml(item.label)}</span></button>`;
		}).join("");
	}

	function renderUnderlineMenu() {
		return `
			<div class="ppe__menu" data-menu-group="underline">
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="underline" data-state="underline" aria-haspopup="menu" aria-expanded="false" title="Underline (Ctrl+U)">
					<i class="bi bi-type-underline ppe__menu-toggle-icon" aria-hidden="true"></i>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel ppe__underline-menu-panel" role="menu" hidden>
					${renderUnderlineMenuItems(UNDERLINE_OPTIONS)}
				</div>
			</div>`;
	}

	function renderSpecialCharacterGroups() {
		return SPECIAL_CHARACTER_GROUPS.map((group) => {
			const cells = group.characters.map((character) => {
				const label = `${character} (${group.label})`;
				return `<button type="button" class="ppe__special-char" data-special-char="${escapeHtml(character)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(character)}</button>`;
			}).join("");
			return `<div class="ppe__special-chars-group"><div class="ppe__special-chars-group-label">${escapeHtml(group.label)}</div><div class="ppe__special-chars-grid" role="group" aria-label="${escapeHtml(group.label)}">${cells}</div></div>`;
		}).join("");
	}

	function renderSpecialCharsMenu() {
		return `
			<div class="ppe__menu" data-menu-group="special-chars">
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="special-chars" aria-haspopup="menu" aria-expanded="false" aria-label="Special characters" title="Special characters">
					<span class="ppe__menu-toggle-mark ppe__menu-toggle-mark--omega" aria-hidden="true">Ω</span>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel ppe__special-chars-panel" hidden>
					${renderSpecialCharacterGroups()}
				</div>
			</div>`;
	}

	function renderToolbarMenu(menuId, toggleIcon, toggleLabel, items, { labelOnly = false } = {}) {
		const toggleIconHtml = labelOnly
			? ""
			: `<i class="bi ${toggleIcon} ppe__menu-toggle-icon" aria-hidden="true"></i>`;
		return `
			<div class="ppe__menu" data-menu-group="${menuId}">
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="${menuId}" aria-haspopup="menu" aria-expanded="false" title="${toggleLabel}">
					${toggleIconHtml}
					<span class="ppe__menu-toggle-label">${toggleLabel}</span>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel" role="menu" hidden>
					${renderMenuItems(items, "ppe__menu-item")}
				</div>
			</div>`;
	}

	function clampTableInt(value, min, max, fallback) {
		const parsed = Number.parseInt(String(value), 10);
		if (!Number.isFinite(parsed)) {
			return fallback;
		}
		return Math.min(max, Math.max(min, parsed));
	}

	function buildProfileTableHtml({ rows, cols, headerRow, headerCol, caption }) {
		const rowCount = clampTableInt(rows, 1, 20, 3);
		const colCount = clampTableInt(cols, 1, 12, 3);
		const useHeaderRow = Boolean(headerRow);
		const useHeaderCol = Boolean(headerCol);
		const captionText = String(caption || "").trim();
		const parts = ['<table class="ppe-profile-table">'];

		if (captionText) {
			parts.push(`<caption>${escapeHtml(captionText)}</caption>`);
		}

		if (useHeaderRow) {
			parts.push("<thead><tr>");
			for (let col = 0; col < colCount; col += 1) {
				const label = useHeaderCol && col === 0 ? "Header" : `Column ${col + 1}`;
				parts.push(`<th>${escapeHtml(label)}</th>`);
			}
			parts.push("</tr></thead>");
		}

		parts.push("<tbody>");
		for (let row = 0; row < rowCount; row += 1) {
			parts.push("<tr>");
			for (let col = 0; col < colCount; col += 1) {
				const isHeaderCell = useHeaderCol && col === 0;
				const tag = isHeaderCell ? "th" : "td";
				const label = isHeaderCell ? `Row ${row + 1}` : "";
				parts.push(`<${tag}>${label ? escapeHtml(label) : "&nbsp;"}</${tag}>`);
			}
			parts.push("</tr>");
		}
		parts.push("</tbody></table>");
		return parts.join("");
	}

	function parseChartNumber(value) {
		const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function chartColor(index) {
		return CHART_COLORS[index % CHART_COLORS.length];
	}

	function truncateChartLabel(label, max = 14) {
		const text = String(label || "").trim();
		if (text.length <= max) return text;
		return `${text.slice(0, max - 1)}…`;
	}

	function buildBarChartSvg(labels, values, title) {
		const width = 520;
		const height = 300;
		const margin = { top: title ? 34 : 18, right: 18, bottom: 54, left: 52 };
		const plotW = width - margin.left - margin.right;
		const plotH = height - margin.top - margin.bottom;
		const maxVal = Math.max(...values, 1);
		const count = labels.length;
		const barGap = count > 1 ? 10 : 0;
		const barWidth = count ? (plotW - barGap * (count - 1)) / count : plotW;
		const baseline = margin.top + plotH;
		const parts = [
			`<svg class="ppe-profile-chart__svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || "Bar chart")}">`,
		];

		if (title) {
			parts.push(`<text x="${margin.left}" y="20" class="ppe-chart-title">${escapeHtml(title)}</text>`);
		}

		for (let tick = 0; tick <= 4; tick += 1) {
			const y = margin.top + plotH - (plotH * tick) / 4;
			parts.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="ppe-chart-grid"/>`);
		}

		parts.push(`<line x1="${margin.left}" y1="${baseline}" x2="${width - margin.right}" y2="${baseline}" class="ppe-chart-axis"/>`);

		labels.forEach((label, index) => {
			const value = values[index] || 0;
			const barHeight = (value / maxVal) * plotH;
			const x = margin.left + index * (barWidth + barGap);
			const y = baseline - barHeight;
			parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${chartColor(index)}" rx="2"/>`);
			parts.push(`<text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 18}" text-anchor="middle" class="ppe-chart-label">${escapeHtml(truncateChartLabel(label))}</text>`);
		});

		parts.push("</svg>");
		return parts.join("");
	}

	function buildLineChartSvg(labels, values, title) {
		const width = 520;
		const height = 300;
		const margin = { top: title ? 34 : 18, right: 18, bottom: 54, left: 52 };
		const plotW = width - margin.left - margin.right;
		const plotH = height - margin.top - margin.bottom;
		const maxVal = Math.max(...values, 1);
		const count = labels.length;
		const baseline = margin.top + plotH;
		const step = count > 1 ? plotW / (count - 1) : 0;
		const parts = [
			`<svg class="ppe-profile-chart__svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || "Line chart")}">`,
		];

		if (title) {
			parts.push(`<text x="${margin.left}" y="20" class="ppe-chart-title">${escapeHtml(title)}</text>`);
		}

		for (let tick = 0; tick <= 4; tick += 1) {
			const y = margin.top + plotH - (plotH * tick) / 4;
			parts.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="ppe-chart-grid"/>`);
		}

		parts.push(`<line x1="${margin.left}" y1="${baseline}" x2="${width - margin.right}" y2="${baseline}" class="ppe-chart-axis"/>`);

		const points = labels.map((label, index) => {
			const x = margin.left + index * step;
			const y = baseline - ((values[index] || 0) / maxVal) * plotH;
			return { x, y, label };
		});

		if (points.length > 1) {
			const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
			parts.push(`<polyline points="${polyline}" class="ppe-chart-line" fill="none"/>`);
		}

		points.forEach((point, index) => {
			parts.push(`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" fill="${chartColor(index)}" class="ppe-chart-point"/>`);
			parts.push(`<text x="${point.x.toFixed(1)}" y="${height - 18}" text-anchor="middle" class="ppe-chart-label">${escapeHtml(truncateChartLabel(point.label))}</text>`);
		});

		parts.push("</svg>");
		return parts.join("");
	}

	function buildPieChartSvg(labels, values, title) {
		const width = 520;
		const height = 300;
		const cx = 150;
		const cy = title ? 162 : 150;
		const radius = 96;
		const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0) || 1;
		const parts = [
			`<svg class="ppe-profile-chart__svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || "Pie chart")}">`,
		];

		if (title) {
			parts.push(`<text x="24" y="24" class="ppe-chart-title">${escapeHtml(title)}</text>`);
		}

		let startAngle = -Math.PI / 2;
		values.forEach((value, index) => {
			const slice = Math.max(value, 0);
			if (slice <= 0) return;
			const angle = (slice / total) * Math.PI * 2;
			const endAngle = startAngle + angle;
			const x1 = cx + radius * Math.cos(startAngle);
			const y1 = cy + radius * Math.sin(startAngle);
			const x2 = cx + radius * Math.cos(endAngle);
			const y2 = cy + radius * Math.sin(endAngle);
			const largeArc = angle > Math.PI ? 1 : 0;
			parts.push(`<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${chartColor(index)}"/>`);
			startAngle = endAngle;
		});

		const legendX = 270;
		let legendY = title ? 58 : 44;
		labels.forEach((label, index) => {
			const value = values[index] || 0;
			const percent = total > 0 ? Math.round((Math.max(value, 0) / total) * 100) : 0;
			parts.push(`<rect x="${legendX}" y="${legendY - 10}" width="12" height="12" fill="${chartColor(index)}" rx="2"/>`);
			parts.push(`<text x="${legendX + 18}" y="${legendY}" class="ppe-chart-legend">${escapeHtml(truncateChartLabel(label, 18))} (${percent}%)</text>`);
			legendY += 22;
		});

		parts.push("</svg>");
		return parts.join("");
	}

	function buildProfileChartSvg({ type, title, labels, values }) {
		const chartType = CHART_TYPE_OPTIONS.some((option) => option.id === type) ? type : "bar";
		if (chartType === "line") return buildLineChartSvg(labels, values, title);
		if (chartType === "pie") return buildPieChartSvg(labels, values, title);
		return buildBarChartSvg(labels, values, title);
	}

	function buildProfileChartHtml({ type, title, labels, values }) {
		const normalized = normalizeChartOptions({ type, title, labels, values });
		const caption = normalized.title;
		const svg = buildProfileChartSvg(normalized);
		const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
		const label = escapeHtml(caption || "Chart");
		const data = serializeChartData(normalized);
		return `<figure class="ppe-profile-chart" contenteditable="false" tabindex="0" role="group" aria-label="${label}" data-chart="${data}" title="Double-click to edit">${svg}${figcaption}</figure>`;
	}

	function normalizeChartOptions(options) {
		const type = CHART_TYPE_OPTIONS.some((option) => option.id === options?.type) ? options.type : "bar";
		const title = String(options?.title || "").trim();
		const rawLabels = Array.isArray(options?.labels) ? options.labels : [];
		const rawValues = Array.isArray(options?.values) ? options.values : [];
		const count = clampTableInt(Math.max(rawLabels.length, rawValues.length, 2), 2, 12, 4);
		const labels = [];
		const values = [];
		for (let index = 0; index < count; index += 1) {
			labels.push(String(rawLabels[index] || "").trim() || `Category ${index + 1}`);
			const value = parseChartNumber(rawValues[index]);
			values.push(Number.isFinite(value) ? value : CHART_SAMPLE_VALUES[index % CHART_SAMPLE_VALUES.length]);
		}
		return { type, title, labels, values };
	}

	function serializeChartData(options) {
		const normalized = normalizeChartOptions(options);
		return escapeHtml(JSON.stringify({
			type: normalized.type,
			title: normalized.title,
			labels: normalized.labels,
			values: normalized.values,
		}));
	}

	function parseChartFromFigure(figure) {
		const raw = figure?.getAttribute("data-chart");
		if (raw) {
			try {
				return normalizeChartOptions(JSON.parse(raw));
			} catch (error) {
				/* fall through to SVG parsing */
			}
		}
		return parseChartFromFigureSvg(figure);
	}

	function parseChartFromFigureSvg(figure) {
		const svg = figure?.querySelector("svg");
		const title = figure?.querySelector("figcaption")?.textContent?.trim()
			|| svg?.querySelector(".ppe-chart-title")?.textContent?.trim()
			|| "";
		let type = "bar";
		if (svg?.querySelector("polyline.ppe-chart-line")) {
			type = "line";
		} else if (svg?.querySelector("path") && !svg?.querySelector("rect[fill]")) {
			type = "pie";
		}

		let labels = [];
		if (type === "pie") {
			labels = [...(svg?.querySelectorAll(".ppe-chart-legend") || [])].map((element) => (
				element.textContent.replace(/\s*\(\d+%\)\s*$/, "").trim()
			));
		} else {
			labels = [...(svg?.querySelectorAll(".ppe-chart-label") || [])].map((element) => element.textContent.trim());
		}

		const values = labels.map((_, index) => CHART_SAMPLE_VALUES[index % CHART_SAMPLE_VALUES.length]);
		return normalizeChartOptions({ type, title, labels, values });
	}

	function renderChartTypeOptions() {
		return CHART_TYPE_OPTIONS.map((option) => (
			`<option value="${option.id}">${escapeHtml(option.label)}</option>`
		)).join("");
	}


	function renderAddBlockMenu() {
		return `
			<div class="ppe__menu ppe__menu--align-end" data-menu-group="add-block">
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="add-block" aria-haspopup="menu" aria-expanded="false" title="Add block">
					<span class="ppe__menu-toggle-label">Add block</span>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel ppe__add-block-panel" role="menu" hidden>
					<div class="ppe__add-block-body" data-add-block-panel></div>
				</div>
			</div>`;
	}

	function renderToolbarHtml(options = {}) {
		const parts = [];
		parts.push(...PRIMARY_INLINE_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push(renderUnderlineMenu());
		parts.push(...SECONDARY_INLINE_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		parts.push(renderToolbarMenu("heading", "bi-paragraph", "Paragraph", HEADING_OPTIONS, { labelOnly: true }));
		parts.push(renderToolbarMenu("list", "bi-list-ul", "List", LIST_OPTIONS));
		parts.push(...LIST_INDENT_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		parts.push(...TEXT_ALIGN_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		const trailing = options.showAddBlock
			? TRAILING_TOOLS.filter((btn) => !btn.separator && btn.command !== "removeFormat")
			: TRAILING_TOOLS;
		for (const btn of trailing) {
			if (btn.separator) {
				parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
				continue;
			}
			parts.push(renderToolButton(btn));
			if (btn.action === "image") {
				parts.push(renderSpecialCharsMenu());
			}
		}
		if (options.showAddBlock) {
			parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
			parts.push(renderAddBlockMenu());
		}
		return parts.join("");
	}

	// Tags kept when cleaning pasted HTML; everything else is unwrapped (its text
	// is preserved) and all attributes except a couple are stripped.
	const PASTE_ALLOWED_TAGS = new Set(["P", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "DL", "DT", "DD", "A", "B", "STRONG", "I", "EM", "U", "S", "SUB", "SUP", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "CAPTION"]);
	const PASTE_ALLOWED_ATTRS = { A: ["href"], OL: ["type"], U: ["class"], TABLE: ["class"], TH: ["colspan", "rowspan"], TD: ["colspan", "rowspan"] };
	const MAX_BLOCK_INDENT = 8;
	const BLOCK_INDENT_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, dt, dd";
	const ATOMIC_BLOCK_SELECTOR = "figure.ppe-profile-chart";

	function indentBlockElement(block) {
		const level = Number(block.getAttribute("data-indent") || 0);
		if (level >= MAX_BLOCK_INDENT) return false;
		block.setAttribute("data-indent", String(level + 1));
		return true;
	}

	function outdentBlockElement(block) {
		const level = Number(block.getAttribute("data-indent") || 0);
		if (level > 0) {
			const next = level - 1;
			if (next === 0) block.removeAttribute("data-indent");
			else block.setAttribute("data-indent", String(next));
			return true;
		}
		if (block.tagName === "BLOCKQUOTE" && block.parentNode) {
			const parent = block.parentNode;
			while (block.firstChild) parent.insertBefore(block.firstChild, block);
			block.remove();
			return true;
		}
		return false;
	}

	function indentListItem(li) {
		const prev = li.previousElementSibling;
		if (!prev || prev.tagName !== "LI") return false;

		const parentList = li.parentElement;
		if (!parentList) return false;

		let subList = [...prev.children].find((child) => child.tagName === "UL" || child.tagName === "OL");
		if (!subList) {
			subList = document.createElement(parentList.tagName.toLowerCase());
			if (parentList.tagName === "OL" && parentList.hasAttribute("type")) {
				subList.setAttribute("type", parentList.getAttribute("type"));
			}
			prev.append(subList);
		}
		subList.append(li);
		return true;
	}

	function outdentListItem(li) {
		const list = li.parentElement;
		if (!list || (list.tagName !== "UL" && list.tagName !== "OL")) return false;

		const parentLi = list.parentElement?.closest("li");
		if (!parentLi) return false;

		const outerList = parentLi.parentElement;
		if (!outerList) return false;

		parentLi.after(li);
		if (!list.children.length) list.remove();
		return true;
	}

	function prepareAtomicChartElement(figure) {
		if (!figure) return;
		const caption = figure.querySelector("figcaption")?.textContent?.trim() || "Chart";
		figure.setAttribute("contenteditable", "false");
		figure.setAttribute("tabindex", "0");
		figure.setAttribute("role", "group");
		figure.setAttribute("aria-label", caption);
		figure.setAttribute("title", "Click to select or deselect. Right-click for options. Double-click to edit.");
	}

	function placeCaretIn(node, atEnd = true) {
		if (!node) return;
		const range = document.createRange();
		const selection = window.getSelection();
		if (!selection) return;
		if (atEnd) {
			range.selectNodeContents(node);
			range.collapse(false);
		} else {
			range.setStart(node, 0);
			range.collapse(true);
		}
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function captionFromFileName(name) {
		const base = String(name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
		return base.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	const MEDIA_MAX_BYTES = 8_000_000;

	function resolveGitHubApiUrl(fileName) {
		const apiBase = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "").trim().replace(/\/+$/, "");
		if (!apiBase) return "";
		return new URL(fileName, `${apiBase}/`).href;
	}

	function gitHubFetchInit(init) {
		return window.App?.getGitHubFetchInit?.(init) || { credentials: "include", ...(init || {}) };
	}

	function readFileAsDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(new Error("Could not read the image file."));
			reader.readAsDataURL(file);
		});
	}

	async function prepareImageForUpload(file) {
		const MAX_DIMENSION = 1800;
		const TARGET_BYTES = 900_000;

		const passThrough = async () => {
			if (file.size > MEDIA_MAX_BYTES) {
				throw new Error("Images must be smaller than 8 MB.");
			}
			return { dataUrl: await readFileAsDataUrl(file), filename: file.name };
		};

		if (!/^image\/(jpeg|png|webp|bmp|avif)$/i.test(file.type)) {
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
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(bitmap.width * scale));
		canvas.height = Math.max(1, Math.round(bitmap.height * scale));
		const context = canvas.getContext("2d");
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close?.();

		let quality = 0.88;
		let dataUrl = canvas.toDataURL("image/jpeg", quality);
		while ((dataUrl.length * 3) / 4 > TARGET_BYTES && quality > 0.5) {
			quality -= 0.08;
			dataUrl = canvas.toDataURL("image/jpeg", quality);
		}

		return {
			dataUrl,
			filename: `${file.name.replace(/\.[^.]+$/, "")}.jpg`,
		};
	}

	function renderModalsHtml() {
		return `
			<div class="ppe__popover ppe__link-popover" hidden>
				<label class="ppe__popover-label">Link address
					<input type="url" class="ppe__link-url" placeholder="https://… or ../2/profile.html">
				</label>
				<label class="ppe__popover-label">Link to a person
					<input type="search" class="ppe__link-person" placeholder="Search profiles by name" autocomplete="off">
				</label>
				<ul class="ppe__link-results" hidden></ul>
				<div class="ppe__popover-actions">
					<button type="button" class="ppe__btn ppe__btn--primary ppe__link-apply">Apply</button>
					<button type="button" class="ppe__btn ppe__link-remove">Remove</button>
					<button type="button" class="ppe__btn ppe__link-cancel">Cancel</button>
				</div>
			</div>

			<div class="ppe__media-modal" hidden aria-hidden="true">
				<div class="ppe__media-backdrop" data-media-close></div>
				<div class="ppe__media-panel" role="dialog" aria-label="Insert image" aria-modal="true">
					<header class="ppe__media-header">
						<h2>Insert image</h2>
						<button type="button" class="ppe__media-x" aria-label="Close" data-media-close>✕</button>
					</header>
					<div class="ppe__media-body">
						<p class="ppe__media-status" role="status" hidden></p>
						<section class="ppe__media-upload">
							<input type="file" class="ppe__media-file" accept="image/*" hidden>
							<button type="button" class="ppe__media-dropzone" data-media-upload>
								<i class="bi bi-cloud-arrow-up ppe__media-dropzone-icon" aria-hidden="true"></i>
								<span class="ppe__media-dropzone-title">Upload an image</span>
								<span class="ppe__media-dropzone-hint">Drag and drop here, or click to choose · JPG, PNG, GIF, WebP, SVG</span>
							</button>
						</section>
						<section class="ppe__media-gallery" hidden>
							<h3 class="ppe__media-section-title">Profile images</h3>
							<div class="ppe__media-grid"></div>
						</section>
						<div class="ppe__media-divider" aria-hidden="true"><span>or</span></div>
						<section class="ppe__media-url">
							<label class="ppe__popover-label">Paste an image URL
								<div class="ppe__media-url-row">
									<input type="url" class="ppe__media-url" placeholder="https://…">
									<button type="button" class="ppe__btn ppe__btn--primary ppe__media-url-insert">Insert</button>
								</div>
							</label>
						</section>
					</div>
				</div>
			</div>

			<div class="ppe__table-modal" hidden aria-hidden="true">
				<div class="ppe__media-backdrop" data-table-close></div>
				<div class="ppe__table-panel" role="dialog" aria-label="Insert Table" aria-modal="true">
					<header class="ppe__media-header">
						<h2>Insert Table</h2>
						<button type="button" class="ppe__media-x" aria-label="Close" data-table-close>✕</button>
					</header>
					<div class="ppe__table-body">
						<div class="ppe__table-form">
							<label class="ppe__table-field">
								<span>Rows</span>
								<input type="number" class="ppe__table-rows" min="1" max="20" value="3" inputmode="numeric">
							</label>
							<label class="ppe__table-field">
								<span>Columns</span>
								<input type="number" class="ppe__table-cols" min="1" max="12" value="3" inputmode="numeric">
							</label>
							<label class="ppe__table-check">
								<input type="checkbox" class="ppe__table-header-row" checked>
								<span>Header Row</span>
							</label>
							<label class="ppe__table-check">
								<input type="checkbox" class="ppe__table-header-col">
								<span>Header Column</span>
							</label>
							<label class="ppe__table-field ppe__table-field--wide">
								<span>Caption</span>
								<input type="text" class="ppe__table-caption" placeholder="Optional Table Caption">
							</label>
						</div>
						<div class="ppe__table-preview-wrap">
							<div class="ppe__table-preview-label">Preview</div>
							<div class="ppe__table-preview" aria-hidden="true"></div>
						</div>
						<div class="ppe__popover-actions">
							<button type="button" class="ppe__btn ppe__btn--primary ppe__table-insert">Insert Table</button>
							<button type="button" class="ppe__btn" data-table-close>Cancel</button>
						</div>
					</div>
				</div>
			</div>

			<div class="ppe__chart-modal" hidden aria-hidden="true">
				<div class="ppe__media-backdrop" data-chart-close></div>
				<div class="ppe__chart-panel" role="dialog" aria-label="Insert Chart" aria-modal="true">
					<header class="ppe__media-header">
						<h2>Insert Chart</h2>
						<button type="button" class="ppe__media-x" aria-label="Close" data-chart-close>✕</button>
					</header>
					<div class="ppe__chart-body">
						<div class="ppe__chart-form">
							<label class="ppe__chart-field">
								<span>Chart type</span>
								<select class="ppe__chart-type">${renderChartTypeOptions()}</select>
							</label>
							<label class="ppe__chart-field">
								<span>Data points</span>
								<input type="number" class="ppe__chart-points" min="2" max="12" value="4" inputmode="numeric">
							</label>
							<label class="ppe__chart-field ppe__chart-field--wide">
								<span>Caption</span>
								<input type="text" class="ppe__chart-title" placeholder="Optional chart caption">
							</label>
						</div>
						<div class="ppe__chart-data-wrap">
							<div class="ppe__chart-data-label">Data</div>
							<table class="ppe__chart-data">
								<thead>
									<tr>
										<th scope="col">Label</th>
										<th scope="col">Value</th>
									</tr>
								</thead>
								<tbody></tbody>
							</table>
						</div>
						<div class="ppe__chart-preview-wrap">
							<div class="ppe__chart-preview-label">Preview</div>
							<div class="ppe__chart-preview" aria-hidden="true"></div>
						</div>
						<div class="ppe__popover-actions">
							<button type="button" class="ppe__btn ppe__btn--primary ppe__chart-insert">Insert Chart</button>
							<button type="button" class="ppe__btn" data-chart-close>Cancel</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	function prepareAtomicChartElement(figure) {
		if (!figure) return;
		const caption = figure.querySelector("figcaption")?.textContent?.trim() || "Chart";
		figure.setAttribute("contenteditable", "false");
		figure.setAttribute("tabindex", "0");
		figure.setAttribute("role", "group");
		figure.setAttribute("aria-label", caption);
		figure.setAttribute("title", "Click to select or deselect. Right-click for options. Double-click to edit.");
	}

	class ProfileProseToolbar extends HTMLElement {
		static get observedAttributes() {
			return ["person"];
		}

		connectedCallback() {
			if (this.__ready) return;
			this.__ready = true;
			const showAddBlock = this.hasAttribute("add-block");
			this.innerHTML = `
				<div class="ppe__toolbar" role="toolbar" aria-label="Text formatting">
					${renderToolbarHtml({ showAddBlock })}
				</div>
				${renderModalsHtml()}
			`;
			this._toolbarEl = this.querySelector(".ppe__toolbar");
			this.#bindToolbar();
			this.#bindLinkPopover();
			this.#bindMediaModal();
			this.#bindTableModal();
			this.#bindChartModal();
			this.__onToolbarSelectionChange = () => {
				if (!this.#selectionTouchesProse()) return;
				this.#scheduleToolbarStateUpdate();
			};
			document.addEventListener("selectionchange", this.__onToolbarSelectionChange);
			this.#updateToolbarState();
		}

		disconnectedCallback() {
			this.#closeMenus();
			if (this.__onOutsideMenu) {
				document.removeEventListener("mousedown", this.__onOutsideMenu);
			}
			if (this.__onPortaledPanelClick) {
				document.removeEventListener("click", this.__onPortaledPanelClick);
			}
			if (this.__onToolbarSelectionChange) {
				document.removeEventListener("selectionchange", this.__onToolbarSelectionChange);
			}
			this.#unbindProseStateSync();
			if (this.__toolbarStateRaf) {
				cancelAnimationFrame(this.__toolbarStateRaf);
				this.__toolbarStateRaf = null;
			}
			this.#unbindMenuReposition();
		}

		updateToolbarState() {
			this.#updateToolbarState();
		}

		openChartEditor(figure) {
			this.#openChartEditor(figure);
		}

		insertHtml(html) {
			this.#insertHtmlIntoRoot(html);
			this.#afterCommand();
		}

		set getBlockCatalog(fn) {
			this._getBlockCatalog = typeof fn === "function" ? fn : null;
		}

		set commandRootProvider(fn) {
			this._commandRootProvider = typeof fn === "function" ? fn : null;
			this.#bindProseStateSync();
		}

		get commandRootProvider() {
			return this._commandRootProvider || null;
		}

		set insertionHooks(hooks) {
			this._insertionHooks = hooks && typeof hooks === "object" ? hooks : null;
		}

		#getRoot() {
			const root = this.commandRootProvider?.();
			return root && root.isConnected ? root : null;
		}

		#getPersonId() {
			return String(this.getAttribute("person") || "").trim();
		}

		#resolveImageUrl(src) {
			if (!src || isAbsoluteUrl(src) || src.startsWith("data:")) return src;
			const normalized = src.replace(/^\.?\//, "");
			const personId = this.#getPersonId();
			if (normalized.startsWith("assets/")) return resolveSiteUrl(normalized);
			if (personId) return resolveSiteUrl(`people/${personId}/data/${normalized}`);
			return resolveSiteUrl(normalized);
		}

		#getInsertionRange() {
			const prose = this.#getRoot();
			if (!prose) return null;

			let range = null;
			if (this.__savedRange) {
				const host = this.__savedRange.commonAncestorContainer;
				const element = host.nodeType === Node.ELEMENT_NODE ? host : host.parentNode;
				if (element && prose.contains(element)) {
					range = this.__savedRange.cloneRange();
				}
			}
			if (!range) {
				const selection = window.getSelection();
				if (selection?.rangeCount) {
					const current = selection.getRangeAt(0);
					const host = current.commonAncestorContainer;
					const element = host.nodeType === Node.ELEMENT_NODE ? host : host.parentNode;
					if (element && prose.contains(element)) {
						range = current.cloneRange();
					}
				}
			}
			if (!range) {
				range = document.createRange();
				range.selectNodeContents(prose);
				range.collapse(false);
			}

			const hooks = this._insertionHooks;
			if (hooks?.adjustInsertionRange) {
				range = hooks.adjustInsertionRange(range, prose) || range;
			}
			return range;
		}

		#insertHtmlIntoRoot(html) {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();
			const range = this.#getInsertionRange();
			if (!range) return;
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			document.execCommand("insertHTML", false, html);
		}

		#bindToolbar() {
			const toolbar = this._toolbarEl;
			toolbar?.addEventListener("mousedown", (event) => {
				// Keep the prose selection while clicking a tool.
				event.preventDefault();
			});
			toolbar?.addEventListener("click", (event) => {
				const toggle = event.target.closest("[data-menu-toggle]");
				if (toggle) {
					this.#toggleMenu(toggle.dataset.menuToggle);
					return;
				}
				const specialChar = event.target.closest("[data-special-char]");
				if (specialChar) {
					this.#insertSpecialCharacter(specialChar.dataset.specialChar);
					this.#closeMenus();
					return;
				}
				const menuItem = event.target.closest(".ppe__menu-item");
				if (menuItem) {
					this.#runMenuItem(menuItem);
					this.#closeMenus();
					return;
				}
				const blockChoice = event.target.closest(".ppe__add-block-panel [data-block-id]");
				if (blockChoice && !blockChoice.disabled) {
					event.preventDefault();
					this.#insertEditorBlock(blockChoice.dataset.blockId);
					this.#closeMenus();
					return;
				}
				const button = event.target.closest(".ppe__tool:not(.ppe__menu-toggle)");
				if (!button) return;
				this.#runCommand(button);
			});
			this.__onOutsideMenu = (event) => {
				if (event.target.closest(".ppe__menu")) return;
				if (event.target.closest(".ppe__menu-panel--portaled")) return;
				this.#closeMenus();
			};
			document.addEventListener("mousedown", this.__onOutsideMenu);
			this.__onPortaledPanelClick = (event) => {
				const panel = event.target.closest(".ppe__menu-panel--portaled");
				if (!panel || panel.hidden || panel.__ppeToolbar !== this) return;

				const specialChar = event.target.closest("[data-special-char]");
				if (specialChar) {
					this.#insertSpecialCharacter(specialChar.dataset.specialChar);
					this.#closeMenus();
					return;
				}

				const menuItem = event.target.closest(".ppe__menu-item");
				if (menuItem) {
					this.#runMenuItem(menuItem);
					this.#closeMenus();
					return;
				}

				const blockChoice = event.target.closest("[data-block-id]");
				if (blockChoice && panel.classList.contains("ppe__add-block-panel") && !blockChoice.disabled) {
					event.preventDefault();
					this.#insertEditorBlock(blockChoice.dataset.blockId);
					this.#closeMenus();
				}
			};
			document.addEventListener("click", this.__onPortaledPanelClick);
			this.#updateToolbarState();
		}

		#insertSpecialCharacter(value) {
			const prose = this.#getRoot();
			const text = String(value || "");
			if (!prose || !text) return;

			prose.focus();
			const selection = window.getSelection();
			if (!selection) return;

			let range = selection.rangeCount ? selection.getRangeAt(0) : null;
			if (!range || !prose.contains(range.commonAncestorContainer)) {
				range = document.createRange();
				range.selectNodeContents(prose);
				range.collapse(false);
				selection.removeAllRanges();
				selection.addRange(range);
			}

			document.execCommand("insertText", false, text);
			this.#afterCommand();
		}

		#currentBlockTag() {
			const prose = this.#getRoot();
			let block = "";
			try {
				block = (document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/^<|>$/g, "");
			} catch (error) {
				/* ignore */
			}

			if (prose) {
				const selection = window.getSelection();
				let node = selection?.anchorNode;
				if (node && prose.contains(node)) {
					if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
					const blockquote = node?.closest?.("blockquote");
					if (blockquote && prose.contains(blockquote)) {
						return "blockquote";
					}
					if (!block || block === "div") {
						const blockEl = node?.closest?.("p, h1, h2, h3, h4, h5, h6");
						if (blockEl && prose.contains(blockEl)) {
							block = blockEl.tagName.toLowerCase();
						}
					}
				}
			}

			if (!block || block === "div") block = "p";
			return block;
		}

		#toggleMenu(menuId) {
			const menu = this.querySelector(`[data-menu-group="${menuId}"]`);
			if (!menu) return;
			const panel = this.#getMenuPanel(menu);
			const toggle = menu.querySelector("[data-menu-toggle]");
			const willOpen = panel?.hidden;
			this.#closeMenus();
			if (!willOpen || !panel || !toggle) return;
			if (menuId === "add-block") {
				this.#populateAddBlockMenu();
			}
			panel.hidden = false;
			toggle.setAttribute("aria-expanded", "true");
			menu.classList.add("is-open");
			this.#portalMenuPanel(menu, panel);
			this.#positionMenuPanel(menu, panel, toggle);
			this.#bindMenuReposition();
		}

		#getMenuPanel(menu) {
			if (menu.__ppeOpenPanel) return menu.__ppeOpenPanel;
			return menu.querySelector(".ppe__menu-panel");
		}

		#portalMenuPanel(menu, panel) {
			if (!panel.__ppePortalHome) {
				panel.__ppePortalHome = {
					parent: panel.parentElement,
					next: panel.nextSibling,
				};
			}
			panel.__ppeToolbar = this;
			menu.__ppeOpenPanel = panel;
			document.body.appendChild(panel);
		}

		#restoreMenuPanel(panel) {
			const home = panel.__ppePortalHome;
			if (!home?.parent) return;
			if (home.parent.__ppeOpenPanel === panel) {
				delete home.parent.__ppeOpenPanel;
			}
			home.parent.insertBefore(panel, home.next);
			delete panel.__ppeToolbar;
		}

		#getBlockContext() {
			return this.getAttribute("block-context") === "page" ? "page" : "profile";
		}

		#populateAddBlockMenu() {
			const menu = this.querySelector('[data-menu-group="add-block"]');
			const shell = menu ? this.#getMenuPanel(menu) : null;
			const body = shell?.querySelector("[data-add-block-panel]");
			if (!body || !window.EditorBlockInserter || !window.EditorBlocks) return;

			const context = this.#getBlockContext();
			const catalog = this._getBlockCatalog
				? this._getBlockCatalog()
				: window.EditorBlocks.getCatalog(context);
			window.EditorBlockInserter.renderPanel(body, {
				context,
				definitions: catalog?.definitions || [],
				categories: catalog?.categories || [],
				query: "",
				compact: true,
			});
		}

		#insertEditorBlock(blockId) {
			if (!window.EditorBlocks) return;
			const context = this.#getBlockContext();
			const block = window.EditorBlocks.getById(blockId);
			const ui = window.EditorBlocks.getBlockUiState(context, block);
			if (!block || !ui.enabled) return;

			if (context === "page") {
				this.dispatchEvent(new CustomEvent("ppe-block-selected", {
					bubbles: true,
					detail: { blockId, block },
				}));
				return;
			}

			this.insertHtml(`${block.html}<p><br></p>`);
			this.dispatchEvent(new CustomEvent("ppe-block-inserted", { bubbles: true, detail: { blockId, block } }));
		}

		#positionMenuPanel(menu, panel, toggle) {
			menu.classList.remove("ppe__menu--align-end", "ppe__menu--drop-up");
			panel.classList.add("ppe__menu-panel--fixed", "ppe__menu-panel--portaled");

			const padding = 12;
			const gap = 4;
			const toggleRect = toggle.getBoundingClientRect();
			const isAddBlock = menu.dataset.menuGroup === "add-block";
			const minLeft = this.#minMenuLeft(padding);
			const maxRight = window.innerWidth - padding;
			const availableWidth = maxRight - minLeft;

			if (isAddBlock) {
				const targetWidth = Math.min(416, availableWidth);
				panel.style.width = `${Math.max(220, targetWidth)}px`;
				panel.style.maxWidth = `${Math.max(220, targetWidth)}px`;
			} else {
				panel.style.width = "";
				panel.style.maxWidth = "";
			}

			const spaceBelow = window.innerHeight - toggleRect.bottom - padding;
			const spaceAbove = toggleRect.top - padding;
			const naturalHeight = panel.scrollHeight;
			const preferDropUp = naturalHeight > spaceBelow && spaceAbove > spaceBelow;

			if (preferDropUp) {
				menu.classList.add("ppe__menu--drop-up");
			}

			const available = preferDropUp ? spaceAbove : spaceBelow;
			panel.style.maxHeight = `${Math.max(180, available - gap)}px`;

			const panelWidth = panel.offsetWidth;
			const panelHeight = Math.min(panel.scrollHeight, Math.max(180, available - gap));
			let top = preferDropUp ? toggleRect.top - panelHeight - gap : toggleRect.bottom + gap;
			let left = isAddBlock ? toggleRect.right - panelWidth : toggleRect.left;

			if (isAddBlock && left < minLeft) {
				left = Math.min(toggleRect.left, maxRight - panelWidth);
			} else if (!isAddBlock && left + panelWidth > maxRight) {
				left = maxRight - panelWidth;
			}

			left = Math.max(minLeft, Math.min(left, maxRight - panelWidth));
			top = Math.max(padding, Math.min(top, window.innerHeight - panelHeight - padding));

			panel.style.top = `${top}px`;
			panel.style.left = `${left}px`;
		}

		#minMenuLeft(padding = 12) {
			const header = document.querySelector("full-header");
			const sidebarOpen = header
				&& !header.classList.contains("sidebar-disabled")
				&& header.classList.contains("sidebar-open");
			if (!sidebarOpen || !window.matchMedia("(min-width: 992px)").matches) {
				return padding;
			}

			const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-chrome-sidebar-width").trim();
			const sidebarWidth = Number.parseFloat(raw) || 280;
			return sidebarWidth + padding;
		}

		#resetMenuPanelPosition(panel) {
			panel.classList.remove("ppe__menu-panel--fixed", "ppe__menu-panel--portaled");
			panel.style.position = "";
			panel.style.top = "";
			panel.style.left = "";
			panel.style.right = "";
			panel.style.bottom = "";
			panel.style.zIndex = "";
			panel.style.width = "";
			panel.style.maxWidth = "";
		}

		#bindMenuReposition() {
			if (this.__repositionOpenMenu) return;
			this.__repositionOpenMenu = () => {
				const openMenu = this.querySelector(".ppe__menu.is-open");
				if (!openMenu) return;
				const panel = this.#getMenuPanel(openMenu);
				const toggle = openMenu.querySelector("[data-menu-toggle]");
				if (panel && toggle) {
					this.#positionMenuPanel(openMenu, panel, toggle);
				}
			};
			window.addEventListener("resize", this.__repositionOpenMenu);
			window.addEventListener("scroll", this.__repositionOpenMenu, true);
		}

		#unbindMenuReposition() {
			if (!this.__repositionOpenMenu) return;
			window.removeEventListener("resize", this.__repositionOpenMenu);
			window.removeEventListener("scroll", this.__repositionOpenMenu, true);
			this.__repositionOpenMenu = null;
		}

		#closeMenus() {
			this.#unbindMenuReposition();
			this.querySelectorAll(".ppe__menu").forEach((menu) => {
				menu.classList.remove("is-open", "ppe__menu--align-end", "ppe__menu--drop-up");
				const toggle = menu.querySelector("[data-menu-toggle]");
				if (toggle) toggle.setAttribute("aria-expanded", "false");
				delete menu.__ppeOpenPanel;
			});

			document.querySelectorAll(".ppe__menu-panel--portaled").forEach((panel) => {
				if (panel.__ppeToolbar !== this) return;
				panel.hidden = true;
				panel.style.maxHeight = "";
				this.#resetMenuPanelPosition(panel);
				this.#restoreMenuPanel(panel);
			});
		}

		#runMenuItem(item) {
			if (item.dataset.block) {
				this.#runCommand({ dataset: { block: item.dataset.block } });
				return;
			}
			if (item.dataset.listType) {
				this.#applyListType(item.dataset.listType, item.dataset.olType || "");
				return;
			}
			if (item.dataset.underlineStyle) {
				this.#applyUnderlineStyle(item.dataset.underlineStyle);
			}
		}

		#getSelectionUnderlineStyle() {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!selection?.rangeCount || !prose) return null;

			let node = selection.getRangeAt(0).commonAncestorContainer;
			if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
			if (!node || !prose.contains(node)) return null;

			const underline = node.closest("u");
			if (!underline || !prose.contains(underline)) {
				try {
					return document.queryCommandState("underline") ? "solid" : null;
				} catch (error) {
					return null;
				}
			}

			const styleClass = [...underline.classList].find((className) => className.startsWith(UNDERLINE_CLASS_PREFIX));
			return styleClass ? styleClass.slice(UNDERLINE_CLASS_PREFIX.length) : "solid";
		}

		#applyUnderlineStyle(style) {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			const selection = window.getSelection();
			if (!selection?.rangeCount) return;
			const range = selection.getRangeAt(0);
			if (!prose.contains(range.commonAncestorContainer)) return;

			if (style === "none") {
				prose.querySelectorAll("u").forEach((underline) => {
					if (range.intersectsNode(underline)) {
						unwrapElement(underline);
					}
				});
				this.#afterCommand();
				return;
			}

			if (range.collapsed) return;

			const existing = [];
			prose.querySelectorAll("u").forEach((underline) => {
				if (range.intersectsNode(underline)) {
					existing.push(underline);
				}
			});

			if (existing.length) {
				existing.forEach((underline) => setUnderlineStyleClass(underline, style));
			} else {
				const underline = document.createElement("u");
				wrapRangeContents(range, underline);
				setUnderlineStyleClass(underline, style);
			}

			this.#afterCommand();
		}

		#selectionListContext() {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!selection?.rangeCount || !prose) return null;
			let node = selection.getRangeAt(0).commonAncestorContainer;
			if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
			if (!node || !prose.contains(node)) return null;
			const ul = node.closest("ul");
			if (ul && prose.contains(ul)) return { kind: "bullet", list: ul };
			const ol = node.closest("ol");
			if (ol && prose.contains(ol)) {
				const type = ol.getAttribute("type") || "";
				const kindMap = { "": "decimal", 1: "decimal", a: "lower-alpha", A: "upper-alpha", i: "lower-roman", I: "upper-roman" };
				return { kind: kindMap[type] || "decimal", list: ol, olType: type };
			}
			const dl = node.closest("dl");
			if (dl && prose.contains(dl)) return { kind: "definition", list: dl };
			return null;
		}

		#getAlignTarget() {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!selection?.rangeCount || !prose) return null;

			let node = selection.getRangeAt(0).commonAncestorContainer;
			if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
			if (!node || !prose.contains(node)) return null;

			const li = node.closest("li");
			if (li && prose.contains(li)) return li;

			const block = node.closest(BLOCK_INDENT_SELECTOR);
			if (block && prose.contains(block)) return block;

			return null;
		}

		#applyTextAlign(align) {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			const target = this.#getAlignTarget();
			if (!target) return;

			if (!align || align === "left") {
				target.removeAttribute("data-align");
			} else {
				target.setAttribute("data-align", align);
			}

			placeCaretIn(target);
			this.#afterCommand();
		}

		#getIndentContext() {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!selection?.rangeCount || !prose) return null;

			let node = selection.getRangeAt(0).commonAncestorContainer;
			if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
			if (!node || !prose.contains(node)) return null;

			const li = node.closest("li");
			if (li && prose.contains(li)) {
				return { type: "list", target: li };
			}

			const block = node.closest(BLOCK_INDENT_SELECTOR);
			if (block && prose.contains(block)) {
				return { type: "block", target: block };
			}

			return null;
		}

		#applyIndent() {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			const context = this.#getIndentContext();
			if (!context) return;

			let changed = false;
			if (context.type === "list") {
				changed = indentListItem(context.target);
			} else {
				changed = indentBlockElement(context.target);
			}

			if (changed) {
				placeCaretIn(context.target);
				this.#afterCommand();
			}
		}

		#applyOutdent() {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			const context = this.#getIndentContext();
			if (!context) return;

			let changed = false;
			if (context.type === "list") {
				changed = outdentListItem(context.target);
			} else {
				changed = outdentBlockElement(context.target);
			}

			if (changed) {
				placeCaretIn(context.target);
				this.#afterCommand();
			}
		}

		#applyListType(listType, olType = "") {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			if (listType === "definition") {
				document.execCommand("insertHTML", false, "<dl><dt>Term</dt><dd>Definition</dd></dl>");
				this.#afterCommand();
				return;
			}

			if (listType === "indent") {
				this.#applyIndent();
				return;
			}

			if (listType === "outdent") {
				this.#applyOutdent();
				return;
			}

			if (listType === "bullet") {
				document.execCommand("insertUnorderedList", false, null);
				this.#afterCommand();
				return;
			}

			document.execCommand("insertOrderedList", false, null);
			const context = this.#selectionListContext();
			const ol = context?.list?.tagName?.toLowerCase() === "ol" ? context.list : null;
			if (ol) {
				if (olType) ol.setAttribute("type", olType);
				else ol.removeAttribute("type");
			}
			this.#afterCommand();
		}

		#runCommand(button) {
			const prose = this.#getRoot();
			if (!prose) return;
			prose.focus();

			const action = button.dataset.action;
			if (action === "link") {
				this.#openLinkPopover(button);
				return;
			}
			if (action === "image") {
				this.#openMediaModal();
				return;
			}
			if (action === "table") {
				this.#openTableModal();
				return;
			}
			if (action === "chart") {
				this.#openChartModal();
				return;
			}

			const block = button.dataset.block;
			if (block) {
				// Toggle a heading back to a paragraph when it is already applied.
				const current = this.#currentBlockTag();
				const next = current === block && block !== "p" ? "p" : block;
				document.execCommand("formatBlock", false, next);
				this.#afterCommand();
				return;
			}

			const listType = button.dataset.listType;
			if (listType) {
				this.#applyListType(listType, button.dataset.olType || "");
				return;
			}

			const textAlign = button.dataset.textAlign;
			if (textAlign) {
				this.#applyTextAlign(textAlign);
				return;
			}

			const command = button.dataset.command;
			if (!command) return;
			document.execCommand(command, false, null);
			this.#afterCommand();
		}

		#emitChange() {
			this.dispatchEvent(new CustomEvent("ppe-toolbar-change", { bubbles: true }));
		}

		#emitChartSelected(figure) {
			this.dispatchEvent(new CustomEvent("ppe-chart-selected", { bubbles: true, detail: { figure } }));
		}

		#wireCharts(root) {
			if (!root) return;
			root.querySelectorAll(ATOMIC_BLOCK_SELECTOR).forEach((figure) => prepareAtomicChartElement(figure));
			this.dispatchEvent(new CustomEvent("ppe-charts-wired", { bubbles: true, detail: { root } }));
		}

		#afterCommand() {
			this.#emitChange();
			this.#updateToolbarState();
		}

		#bindProseStateSync() {
			this.#unbindProseStateSync();
			const prose = this.#getRoot();
			if (!prose) return;

			this.__stateSyncProse = prose;
			this.__onProseStateSync = () => this.#scheduleToolbarStateUpdate();
			prose.addEventListener("mouseup", this.__onProseStateSync);
			prose.addEventListener("keyup", this.__onProseStateSync);
			prose.addEventListener("click", this.__onProseStateSync);
		}

		#unbindProseStateSync() {
			if (!this.__stateSyncProse) return;
			this.__stateSyncProse.removeEventListener("mouseup", this.__onProseStateSync);
			this.__stateSyncProse.removeEventListener("keyup", this.__onProseStateSync);
			this.__stateSyncProse.removeEventListener("click", this.__onProseStateSync);
			this.__stateSyncProse = null;
			this.__onProseStateSync = null;
		}

		#scheduleToolbarStateUpdate() {
			if (this.__toolbarStateRaf) return;
			this.__toolbarStateRaf = requestAnimationFrame(() => {
				this.__toolbarStateRaf = null;
				this.#updateToolbarState();
			});
		}

		#selectionTouchesProse() {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!prose || !selection?.rangeCount) return false;
			return prose.contains(selection.getRangeAt(0).commonAncestorContainer);
		}

		#elementHasInlineFormat(element, command) {
			if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

			const tags = INLINE_FORMAT_TAGS[command];
			if (tags?.includes(element.tagName)) return true;

			const inlineTags = new Set(["SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "SUB", "SUP", "A", "FONT"]);
			if (!inlineTags.has(element.tagName)) return false;

			const style = window.getComputedStyle(element);
			if (command === "bold") {
				const weight = style.fontWeight;
				if (weight === "bold" || weight === "bolder" || Number.parseInt(weight, 10) >= 600) {
					return true;
				}
			}
			if (command === "italic" && style.fontStyle === "italic") return true;
			if (command === "strikeThrough") {
				const decoration = `${style.textDecorationLine} ${style.textDecoration}`;
				if (decoration.includes("line-through")) return true;
			}

			return false;
		}

		#selectionHasInlineFormat(command) {
			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!INLINE_FORMAT_TAGS[command] || !prose || !selection?.rangeCount) return false;

			const range = selection.getRangeAt(0);
			if (!prose.contains(range.commonAncestorContainer)) return false;

			const boundaryNodes = [range.startContainer, range.endContainer, range.commonAncestorContainer];
			for (const boundary of boundaryNodes) {
				let node = boundary.nodeType === Node.TEXT_NODE ? boundary.parentElement : boundary;
				while (node && prose.contains(node)) {
					if (this.#elementHasInlineFormat(node, command)) return true;
					node = node.parentElement;
				}
			}

			const walker = document.createTreeWalker(prose, NodeFilter.SHOW_ELEMENT);
			let element = walker.nextNode();
			while (element) {
				try {
					if (range.intersectsNode(element) && this.#elementHasInlineFormat(element, command)) {
						return true;
					}
				} catch (error) {
					/* ignore */
				}
				element = walker.nextNode();
			}

			return false;
		}

		#getInlineFormatState(command) {
			if (this.#selectionHasInlineFormat(command)) return true;

			const prose = this.#getRoot();
			const selection = window.getSelection();
			if (!prose || !selection?.rangeCount) return false;
			const range = selection.getRangeAt(0);
			if (!prose.contains(range.commonAncestorContainer)) return false;

			const savedRange = range.cloneRange();
			if (document.activeElement !== prose) {
				prose.focus({ preventScroll: true });
			}

			let active = false;
			try {
				active = document.queryCommandState(command);
			} catch (error) {
				/* ignore */
			}

			selection.removeAllRanges();
			selection.addRange(savedRange);
			return active;
		}

		#updateToolbarState() {
			if (!this.#selectionTouchesProse()) {
				for (const command of INLINE_FORMAT_COMMANDS) {
					const button = this.querySelector(`[data-command="${command}"]`);
					button?.classList.remove("is-active");
				}
				this.querySelector('[data-menu-toggle="underline"]')?.classList.remove("is-active");
			}

			for (const command of INLINE_FORMAT_COMMANDS) {
				const button = this.querySelector(`[data-command="${command}"]`);
				if (!button) continue;
				button.classList.toggle("is-active", this.#getInlineFormatState(command));
			}

			const underlineToggle = this.querySelector('[data-menu-toggle="underline"]');
			if (underlineToggle) {
				let underlineActive = this.#getInlineFormatState("underline");
				if (!underlineActive) {
					underlineActive = Boolean(this.#getSelectionUnderlineStyle());
				}
				underlineToggle.classList.toggle("is-active", underlineActive);
			}

			this.querySelectorAll(".ppe__tool[data-state]").forEach((btn) => {
				const state = btn.dataset.state;
				if (!state || INLINE_FORMAT_TAGS[state] || state === "underline") return;
				let active = false;
				try {
					active = document.queryCommandState(state);
				} catch (error) {
					/* ignore */
				}
				btn.classList.toggle("is-active", active);
			});

			const block = this.#currentBlockTag();

			this.querySelectorAll('[data-block]').forEach((item) => {
				item.classList.toggle("is-active", item.dataset.block === block);
			});

			const headingToggle = this.querySelector('[data-menu-toggle="heading"]');
			if (headingToggle) {
				const blockLabel = HEADING_LABEL_BY_BLOCK[block] || HEADING_LABEL_BY_BLOCK.p;
				const labelEl = headingToggle.querySelector(".ppe__menu-toggle-label");
				if (labelEl) labelEl.textContent = blockLabel;
				headingToggle.title = blockLabel;
			}

			const alignTarget = this.#getAlignTarget();
			const activeAlign = alignTarget?.getAttribute("data-align") || "left";
			this.querySelectorAll("[data-text-align]").forEach((btn) => {
				btn.classList.toggle("is-active", btn.dataset.textAlign === activeAlign);
			});

			const linkButton = this.querySelector('[data-action="link"]');
			if (linkButton) {
				linkButton.classList.toggle("is-active", Boolean(this.#anchorAtSelection()));
			}

			const listContext = this.#selectionListContext();
			const activeList = listContext
				? (LIST_OPTIONS.find((item) => item.listType === listContext.kind) || LIST_OPTIONS[0])
				: null;
			this.querySelectorAll(".ppe__menu-item[data-list-type]").forEach((item) => {
				item.classList.toggle("is-active", Boolean(activeList && item.dataset.listType === activeList.listType));
			});

			const activeUnderline = this.#getSelectionUnderlineStyle();
			this.querySelectorAll("[data-underline-style]").forEach((item) => {
				const style = item.dataset.underlineStyle;
				if (style === "none") {
					item.classList.toggle("is-active", !activeUnderline);
					return;
				}
				item.classList.toggle("is-active", activeUnderline === style);
			});
		}

		// ---- Link popover --------------------------------------------------
		#saveSelection() {
			const selection = window.getSelection();
			if (selection && selection.rangeCount) {
				this.__savedRange = selection.getRangeAt(0).cloneRange();
			}
		}

		#restoreSelection() {
			if (!this.__savedRange) return;
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(this.__savedRange);
		}

		#anchorAtSelection() {
			const selection = window.getSelection();
			if (!selection || !selection.rangeCount) return null;
			let node = selection.getRangeAt(0).commonAncestorContainer;
			if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
			return node?.closest?.("a") || null;
		}

		#bindLinkPopover() {
			const pop = this.querySelector(".ppe__link-popover");
			if (!pop) return;
			pop.querySelector(".ppe__link-apply")?.addEventListener("click", () => this.#applyLink());
			pop.querySelector(".ppe__link-remove")?.addEventListener("click", () => this.#removeLink());
			pop.querySelector(".ppe__link-cancel")?.addEventListener("click", () => this.#closeLinkPopover());
			pop.querySelector(".ppe__link-url")?.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.#applyLink();
				}
			});
			const personInput = pop.querySelector(".ppe__link-person");
			personInput?.addEventListener("input", () => this.#searchPeople(personInput.value));
		}

		#openLinkPopover(button) {
			this.#saveSelection();
			const pop = this.querySelector(".ppe__link-popover");
			const urlInput = pop.querySelector(".ppe__link-url");
			const existing = this.#anchorAtSelection();
			urlInput.value = existing ? (existing.getAttribute("href") || "") : "";
			pop.querySelector(".ppe__link-person").value = "";
			const results = pop.querySelector(".ppe__link-results");
			results.hidden = true;
			results.innerHTML = "";
			pop.querySelector(".ppe__link-remove").hidden = !existing;

			pop.hidden = false;
			const rect = button.getBoundingClientRect();
			const host = this.getBoundingClientRect();
			pop.style.top = `${rect.bottom - host.top + 6}px`;
			pop.style.left = `${Math.max(8, Math.min(rect.left - host.left, host.width - pop.offsetWidth - 8))}px`;
			urlInput.focus();

			this.__onOutsideLink = (event) => {
				if (!pop.contains(event.target) && event.target !== button && !button.contains(event.target)) {
					this.#closeLinkPopover();
				}
			};
			setTimeout(() => document.addEventListener("mousedown", this.__onOutsideLink), 0);
		}

		#closeLinkPopover() {
			const pop = this.querySelector(".ppe__link-popover");
			if (pop) pop.hidden = true;
			if (this.__onOutsideLink) {
				document.removeEventListener("mousedown", this.__onOutsideLink);
				this.__onOutsideLink = null;
			}
		}

		#applyLink() {
			const pop = this.querySelector(".ppe__link-popover");
			const url = pop.querySelector(".ppe__link-url").value.trim();
			if (!url) {
				this.#closeLinkPopover();
				return;
			}
			const prose = this.#getRoot();
			prose.focus();
			this.#restoreSelection();
			const selection = window.getSelection();
			if (selection && selection.isCollapsed) {
				// No selected text — insert the address as the link text.
				const anchor = document.createElement("a");
				anchor.setAttribute("href", url);
				anchor.textContent = url;
				selection.getRangeAt(0).insertNode(anchor);
			} else {
				document.execCommand("createLink", false, url);
			}
			this.#closeLinkPopover();
			this.#afterCommand();
		}

		#removeLink() {
			const prose = this.#getRoot();
			prose.focus();
			this.#restoreSelection();
			document.execCommand("unlink", false, null);
			this.#closeLinkPopover();
			this.#afterCommand();
		}

		#loadPeople() {
			if (this.__peoplePromise) return this.__peoplePromise;
			this.__peoplePromise = (async () => {
				try {
					if (window.PeopleRegistry?.loadPeopleRegistry) {
						return await window.PeopleRegistry.loadPeopleRegistry();
					}
					const res = await fetch(resolveSiteUrl("people/people.json"), { cache: "no-store" });
					const data = await res.json();
					return Array.isArray(data?.people) ? data.people : [];
				} catch (error) {
					return [];
				}
			})();
			return this.__peoplePromise;
		}

		async #searchPeople(query) {
			const pop = this.querySelector(".ppe__link-popover");
			const results = pop.querySelector(".ppe__link-results");
			const q = query.trim().toLowerCase();
			if (!q) {
				results.hidden = true;
				results.innerHTML = "";
				return;
			}
			const people = await this.#loadPeople();
			const matches = people.filter((person) => {
				const name = [person.firstName, person.lastName].filter(Boolean).join(" ").toLowerCase();
				return name.includes(q) || String(person.id) === q;
			}).slice(0, 8);

			results.innerHTML = matches.length
				? matches.map((person) => {
					const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || `Profile ${person.id}`;
					return `<li><button type="button" class="ppe__link-result" data-id="${escapeHtml(String(person.id))}">${escapeHtml(name)} <span>#${escapeHtml(String(person.id))}</span></button></li>`;
				}).join("")
				: '<li class="ppe__link-empty">No matching profiles</li>';
			results.hidden = false;
			results.querySelectorAll(".ppe__link-result").forEach((btn) => {
				btn.addEventListener("click", () => {
					pop.querySelector(".ppe__link-url").value = `../${btn.dataset.id}/profile.html`;
					results.hidden = true;
				});
			});
		}

		// ---- Image insertion -----------------------------------------------
		#bindMediaModal() {
			const modal = this.querySelector(".ppe__media-modal");
			if (!modal) return;
			modal.querySelectorAll("[data-media-close]").forEach((el) => el.addEventListener("click", () => this.#closeMediaModal()));
			modal.querySelector(".ppe__media-url-insert")?.addEventListener("click", () => {
				const url = modal.querySelector(".ppe__media-url").value.trim();
				if (url) this.#insertImage(url, "");
				this.#closeMediaModal();
			});
			modal.querySelector(".ppe__media-url")?.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					modal.querySelector(".ppe__media-url-insert")?.click();
				}
			});

			const fileInput = modal.querySelector(".ppe__media-file");
			const dropzone = modal.querySelector("[data-media-upload]");
			if (fileInput && dropzone) {
				dropzone.addEventListener("click", () => {
					if (!dropzone.disabled) fileInput.click();
				});
				fileInput.addEventListener("change", () => {
					const file = fileInput.files?.[0];
					fileInput.value = "";
					if (file) void this.#handleMediaUpload(file);
				});
				["dragenter", "dragover"].forEach((eventName) => {
					dropzone.addEventListener(eventName, (event) => {
						event.preventDefault();
						dropzone.classList.add("is-dragover");
					});
				});
				["dragleave", "dragend", "drop"].forEach((eventName) => {
					dropzone.addEventListener(eventName, () => dropzone.classList.remove("is-dragover"));
				});
				dropzone.addEventListener("drop", (event) => {
					event.preventDefault();
					const file = event.dataTransfer?.files?.[0];
					if (file) void this.#handleMediaUpload(file);
				});
			}
		}

		#setMediaModalStatus(message, type = "info") {
			const status = this.querySelector(".ppe__media-status");
			if (!status) return;
			status.textContent = message || "";
			status.dataset.type = type;
			status.hidden = !message;
		}

		#setMediaModalBusy(busy) {
			const modal = this.querySelector(".ppe__media-modal");
			if (!modal) return;
			modal.classList.toggle("is-busy", busy);
			const dropzone = modal.querySelector("[data-media-upload]");
			const urlInsert = modal.querySelector(".ppe__media-url-insert");
			if (dropzone) dropzone.disabled = busy;
			if (urlInsert) urlInsert.disabled = busy;
		}

		#openMediaModal() {
			this.#saveSelection();
			const modal = this.querySelector(".ppe__media-modal");
			modal.querySelector(".ppe__media-url").value = "";
			this.#setMediaModalStatus("");
			this.#setMediaModalBusy(false);
			modal.hidden = false;
			modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";
			void this.#loadMediaGrid();
		}

		#closeMediaModal() {
			const modal = this.querySelector(".ppe__media-modal");
			modal.hidden = true;
			modal.setAttribute("aria-hidden", "true");
			document.body.style.overflow = "";
			this.#setMediaModalStatus("");
			this.#setMediaModalBusy(false);
		}

		#bindTableModal() {
			const modal = this.querySelector(".ppe__table-modal");
			if (!modal) return;

			modal.querySelectorAll("[data-table-close]").forEach((el) => {
				el.addEventListener("click", () => this.#closeTableModal());
			});
			modal.querySelector(".ppe__table-insert")?.addEventListener("click", () => this.#insertTable());
			modal.querySelectorAll(".ppe__table-rows, .ppe__table-cols, .ppe__table-header-row, .ppe__table-header-col, .ppe__table-caption").forEach((input) => {
				input.addEventListener("input", () => this.#updateTablePreview());
				input.addEventListener("change", () => this.#updateTablePreview());
			});
		}

		#readTableModalOptions() {
			const modal = this.querySelector(".ppe__table-modal");
			return {
				rows: modal?.querySelector(".ppe__table-rows")?.value,
				cols: modal?.querySelector(".ppe__table-cols")?.value,
				headerRow: modal?.querySelector(".ppe__table-header-row")?.checked,
				headerCol: modal?.querySelector(".ppe__table-header-col")?.checked,
				caption: modal?.querySelector(".ppe__table-caption")?.value || "",
			};
		}

		#updateTablePreview() {
			const preview = this.querySelector(".ppe__table-preview");
			if (!preview) return;
			preview.innerHTML = buildProfileTableHtml(this.#readTableModalOptions());
		}

		#openTableModal() {
			this.#saveSelection();
			const modal = this.querySelector(".ppe__table-modal");
			if (!modal) return;

			const rows = modal.querySelector(".ppe__table-rows");
			const cols = modal.querySelector(".ppe__table-cols");
			const headerRow = modal.querySelector(".ppe__table-header-row");
			const headerCol = modal.querySelector(".ppe__table-header-col");
			const caption = modal.querySelector(".ppe__table-caption");
			if (rows) rows.value = "3";
			if (cols) cols.value = "3";
			if (headerRow) headerRow.checked = true;
			if (headerCol) headerCol.checked = false;
			if (caption) caption.value = "";

			this.#updateTablePreview();
			modal.hidden = false;
			modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";
			rows?.focus();
		}

		#closeTableModal() {
			const modal = this.querySelector(".ppe__table-modal");
			if (!modal) return;
			modal.hidden = true;
			modal.setAttribute("aria-hidden", "true");
			document.body.style.overflow = "";
		}

		#insertTable() {
			const prose = this.#getRoot();
			if (!prose) return;

			const html = buildProfileTableHtml(this.#readTableModalOptions());
			this.#insertHtmlIntoRoot(`${html}<p><br></p>`);
			this.#afterCommand();
			this.#closeTableModal();
		}

		#bindChartModal() {
			const modal = this.querySelector(".ppe__chart-modal");
			if (!modal) return;

			modal.querySelectorAll("[data-chart-close]").forEach((el) => {
				el.addEventListener("click", () => this.#closeChartModal());
			});
			modal.querySelector(".ppe__chart-insert")?.addEventListener("click", () => this.#insertChart());
			modal.addEventListener("input", (event) => {
				if (event.target.matches(".ppe__chart-points")) {
					this.#syncChartDataRows();
				}
				if (event.target.matches(".ppe__chart-type, .ppe__chart-title, .ppe__chart-points, .ppe__chart-label, .ppe__chart-value")) {
					this.#updateChartPreview();
				}
			});
			modal.addEventListener("change", (event) => {
				if (event.target.matches(".ppe__chart-type, .ppe__chart-points")) {
					if (event.target.matches(".ppe__chart-points")) {
						this.#syncChartDataRows();
					}
					this.#updateChartPreview();
				}
			});
		}

		#readChartModalOptions() {
			const modal = this.querySelector(".ppe__chart-modal");
			const rows = [...(modal?.querySelectorAll(".ppe__chart-data tbody tr") || [])];
			return normalizeChartOptions({
				type: modal?.querySelector(".ppe__chart-type")?.value || "bar",
				title: modal?.querySelector(".ppe__chart-title")?.value || "",
				labels: rows.map((row, index) => {
					const label = row.querySelector(".ppe__chart-label")?.value?.trim();
					return label || `Category ${index + 1}`;
				}),
				values: rows.map((row) => parseChartNumber(row.querySelector(".ppe__chart-value")?.value)),
			});
		}

		#updateChartPreview() {
			const preview = this.querySelector(".ppe__chart-preview");
			if (!preview) return;
			preview.innerHTML = buildProfileChartHtml(this.#readChartModalOptions());
		}

		#syncChartDataRows(presetOptions = null) {
			const modal = this.querySelector(".ppe__chart-modal");
			const tbody = modal?.querySelector(".ppe__chart-data tbody");
			const pointsInput = modal?.querySelector(".ppe__chart-points");
			if (!modal || !tbody || !pointsInput) return;

			const existing = presetOptions || this.#readChartModalOptions();
			const count = clampTableInt(existing.labels?.length || pointsInput.value, 2, 12, 4);
			pointsInput.value = String(count);
			tbody.innerHTML = "";

			for (let index = 0; index < count; index += 1) {
				const row = document.createElement("tr");
				const label = existing.labels[index] || `Category ${index + 1}`;
				const value = Number.isFinite(existing.values[index])
					? existing.values[index]
					: CHART_SAMPLE_VALUES[index % CHART_SAMPLE_VALUES.length];
				row.innerHTML = `
					<td><input type="text" class="ppe__chart-label" value="${escapeHtml(label)}"></td>
					<td><input type="number" class="ppe__chart-value" value="${escapeHtml(String(value))}" min="0" step="any" inputmode="decimal"></td>
				`;
				tbody.appendChild(row);
			}
		}

		#populateChartModal(options = null) {
			const modal = this.querySelector(".ppe__chart-modal");
			if (!modal) return;

			const defaults = {
				type: "bar",
				title: "",
				labels: ["Category 1", "Category 2", "Category 3", "Category 4"],
				values: CHART_SAMPLE_VALUES.slice(0, 4),
			};
			const next = normalizeChartOptions(options || defaults);
			const type = modal.querySelector(".ppe__chart-type");
			const points = modal.querySelector(".ppe__chart-points");
			const title = modal.querySelector(".ppe__chart-title");
			if (type) type.value = next.type;
			if (points) points.value = String(next.labels.length);
			if (title) title.value = next.title;

			this.#syncChartDataRows(next);
			this.#updateChartPreview();
		}

		#setChartModalMode(mode = "insert") {
			const modal = this.querySelector(".ppe__chart-modal");
			if (!modal) return;
			const isEdit = mode === "edit";
			const heading = modal.querySelector(".ppe__media-header h2");
			const panel = modal.querySelector(".ppe__chart-panel");
			const button = modal.querySelector(".ppe__chart-insert");
			if (heading) heading.textContent = isEdit ? "Edit Chart" : "Insert Chart";
			if (panel) panel.setAttribute("aria-label", isEdit ? "Edit Chart" : "Insert Chart");
			if (button) button.textContent = isEdit ? "Update Chart" : "Insert Chart";
		}

		#showChartModal() {
			const modal = this.querySelector(".ppe__chart-modal");
			if (!modal) return;
			modal.hidden = false;
			modal.setAttribute("aria-hidden", "false");
			document.body.style.overflow = "hidden";
		}

		#openChartModal() {
			this.#saveSelection();
			this.__editingChart = null;
			this.#setChartModalMode("insert");
			this.#populateChartModal();
			this.#showChartModal();
			this.querySelector(".ppe__chart-type")?.focus();
		}

		#openChartEditor(figure) {
			if (!figure?.matches?.(ATOMIC_BLOCK_SELECTOR)) return;
			this.__editingChart = figure;
			this.#emitChartSelected(figure);
			this.#setChartModalMode("edit");
			this.#populateChartModal(parseChartFromFigure(figure));
			this.#showChartModal();
			this.querySelector(".ppe__chart-type")?.focus();
		}

		#closeChartModal() {
			const modal = this.querySelector(".ppe__chart-modal");
			if (!modal) return;
			modal.hidden = true;
			modal.setAttribute("aria-hidden", "true");
			document.body.style.overflow = "";
			this.__editingChart = null;
			this.#setChartModalMode("insert");
		}

		#insertChart() {
			const prose = this.#getRoot();
			if (!prose) return;

			const options = this.#readChartModalOptions();
			if (!options.values.some((value) => value > 0)) {
				const modal = this.querySelector(".ppe__chart-modal");
				const firstValue = modal?.querySelector(".ppe__chart-value");
				firstValue?.focus();
				return;
			}

			const editing = this.__editingChart?.isConnected ? this.__editingChart : null;
			const html = buildProfileChartHtml(options);
			if (editing) {
				const wrapper = document.createElement("div");
				wrapper.innerHTML = buildProfileChartHtml(options);
				const replacement = wrapper.firstElementChild;
				if (replacement) {
					editing.replaceWith(replacement);
					prepareAtomicChartElement(replacement);
					this.dispatchEvent(new CustomEvent("ppe-chart-replaced", { bubbles: true, detail: { figure: replacement, previous: editing } }));
					this.#emitChartSelected(replacement);
				}
				prose.focus({ preventScroll: true });
			} else {
				this.#insertHtmlIntoRoot(`${html}<p><br></p>`);
				this.#wireCharts(prose);
				const chart = [...prose.querySelectorAll(ATOMIC_BLOCK_SELECTOR)].at(-1);
				if (chart) this.#emitChartSelected(chart);
			}

			this.#afterCommand();
			this.#closeChartModal();
		}

		async #loadMediaGrid() {
			const modal = this.querySelector(".ppe__media-modal");
			const gallery = modal.querySelector(".ppe__media-gallery");
			const grid = modal.querySelector(".ppe__media-grid");
			if (!gallery || !grid) return;

			grid.innerHTML = "";
			gallery.hidden = true;
			this.#setMediaModalStatus("Loading profile images…");

			const images = await this.#fetchProfileImages();
			if (!images.length) {
				this.#setMediaModalStatus("");
				return;
			}

			this.#setMediaModalStatus("");
			gallery.hidden = false;
			grid.innerHTML = images.map((img) =>
				`<button type="button" class="ppe__media-thumb" data-name="${escapeHtml(img.name)}"><img src="${escapeHtml(img.url)}" alt="" loading="lazy"><span>${escapeHtml(captionFromFileName(img.name))}</span></button>`,
			).join("");
			grid.querySelectorAll(".ppe__media-thumb").forEach((btn) => {
				btn.addEventListener("click", () => {
					this.#insertImage(`images/${btn.dataset.name}`, captionFromFileName(btn.dataset.name));
					this.#closeMediaModal();
				});
			});
		}

		async #fetchProfileImages() {
			const apiUrl = resolveGitHubApiUrl("github-media.php");
			if (!apiUrl) return [];
			try {
				const url = new URL(apiUrl);
				url.searchParams.set("person", this.#getPersonId());
				const res = await fetch(url.href, gitHubFetchInit({ cache: "no-store" }));
				const payload = await res.json().catch(() => null);
				if (res.ok && payload?.ok) {
					return (payload.images || [])
						.map((img) => ({
							name: String(img?.name || ""),
							url: String(img?.download_url || "") || this.#resolveImageUrl(`images/${img?.name || ""}`),
						}))
						.filter((img) => img.name);
				}
			} catch (error) {
				/* fall through to empty */
			}
			return [];
		}

		async #handleMediaUpload(file) {
			if (!file || !String(file.type || "").startsWith("image/")) {
				this.#setMediaModalStatus("Choose an image file (JPG, PNG, GIF, WebP, or SVG).", "error");
				return;
			}

			this.#setMediaModalBusy(true);
			try {
				const result = await this.#submitImageUpload(file);
				if (!result?.filename) {
					throw new Error("Upload did not return a filename.");
				}
				const caption = captionFromFileName(result.filename);
				this.#insertImage(`images/${result.filename}`, caption);
				if (result.payload?.pull_request?.url) {
									} else {
									}
				this.#closeMediaModal();
			} catch (error) {
				console.warn("Could not upload image", error);
				this.#setMediaModalStatus(error?.message || "Could not upload image.", "error");
				this.#setMediaModalBusy(false);
			}
		}

		async #submitImageUpload(file) {
			const apiUrl = resolveGitHubApiUrl("github-media.php");
			if (!apiUrl) throw new Error("Sign in with GitHub from the site header to upload images.");

			this.#setMediaModalStatus("Preparing image…");
			const prepared = await prepareImageForUpload(file);
			const base64 = String(prepared.dataUrl || "").replace(/^data:[^;]+;base64,/, "");
			const filename = String(prepared.filename || file.name).replace(/\s+/g, "-");

			this.#setMediaModalStatus("Uploading image…");
			const response = await fetch(apiUrl, gitHubFetchInit({
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "upload",
					filename,
					caption: "",
					content_base64: base64,
					person_id: this.#getPersonId(),
				}),
			}));

			let payload = null;
			try {
				payload = await response.json();
			} catch (error) {
				payload = null;
			}

			if (!response.ok || !payload?.ok) {
				if (payload?.error === "authentication_required") {
					throw new Error("Sign in with GitHub from the site header first.");
				}
				throw new Error(payload?.message || `Upload failed (${response.status}).`);
			}

			return { filename: payload.filename || filename, payload };
		}

		#insertImage(src, caption) {
			const prose = this.#getRoot();
			if (!prose) return;
			const isRelative = !/^(https?:)?\/\//i.test(src) && !src.startsWith("data:");
			const displaySrc = isRelative ? this.#resolveImageUrl(src) : src;
			const dataAttr = isRelative ? ` data-ppe-src="${escapeHtml(src)}"` : "";
			const cap = escapeHtml(caption || "");
			const html = `<figure class="profile-figure"><img src="${escapeHtml(displaySrc)}"${dataAttr} alt="${cap}"><figcaption>${cap || "Add a caption"}</figcaption></figure>`;
			this.#insertHtmlIntoRoot(`${html}<p><br></p>`);
			this.#afterCommand();
		}
	}

	customElements.define("profile-prose-toolbar", ProfileProseToolbar);

	window.ProfileProseToolbar = {
		buildProfileChartHtml,
		buildProfileTableHtml,
		prepareAtomicChartElement,
		parseChartFromFigure,
		ATOMIC_BLOCK_SELECTOR,
	};
})();