/**
 * <profile-page-editor person="<id>">
 *
 * A WYSIWYG editor for a person's profile prose (people/<id>/data/profile.html).
 * It renders the page exactly as it appears live — the identity infobox floated
 * to the right with the article text wrapping around it — so editors see the
 * real layout while they type. Only the prose is editable here; the infobox is
 * read-only context (identity details are edited on the Identity tab; the
 * portrait can be changed from the Page tab) and the page title is the
 * display name (also owned by the infobox).
 *
 * On save it reconstructs the fragment as:
 *   <!-- header comment -->  (preserved verbatim if present)
 *   <h1>Display name</h1>
 *   <profile-identity>…</profile-identity>  OR  <include src="profile-table.html">
 *   …edited prose…
 * keeping the infobox node exactly as it was found (inline identity or include),
 * so this editor never rewrites how the infobox is stored.
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
	];

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

	const TRAILING_TOOLS = [
		{ action: "link", icon: "bi-link-45deg", label: "Link" },
		{ command: "unlink", icon: "bi-link", label: "Remove link" },
		{ action: "image", icon: "bi-image", label: "Insert image" },
		{ action: "table", icon: "bi-table", label: "Insert Table" },
		{ separator: true },
		{ command: "removeFormat", icon: "bi-eraser", label: "Clear formatting" },
	];

	const SPECIAL_CHARACTER_GROUPS = [
		{
			label: "Accents",
			characters: [
				"á", "à", "â", "ä", "ã", "å", "æ",
				"é", "è", "ê", "ë",
				"í", "ì", "î", "ï",
				"ó", "ò", "ô", "ö", "õ", "ø", "œ",
				"ú", "ù", "û", "ü",
				"ñ", "ç", "ý", "ÿ", "ß", "ł", "đ",
			],
		},
		{
			label: "Punctuation",
			characters: ["–", "—", "…", "·", "°", "′", "″", "§", "¶", "†", "‡", "©", "®"],
		},
		{
			label: "Quotes",
			characters: ["‘", "’", "“", "”", "«", "»"],
		},
	];

	function renderToolButton(btn) {
		const attrs = [
			`data-command="${btn.command || ""}"`,
			`data-block="${btn.block || ""}"`,
			`data-action="${btn.action || ""}"`,
			`data-list-type="${btn.listType || ""}"`,
			`data-ol-type="${btn.olType || ""}"`,
			`data-state="${btn.state || ""}"`,
			`aria-label="${btn.label}"`,
			`title="${btn.label}"`,
		].join(" ");
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
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="special-chars" aria-haspopup="menu" aria-expanded="false" title="Special characters">
					<i class="bi bi-omega ppe__menu-toggle-icon" aria-hidden="true"></i>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel ppe__special-chars-panel" hidden>
					${renderSpecialCharacterGroups()}
					<div class="ppe__special-chars-custom">
						<label class="ppe__special-chars-custom-label">
							<span>Add character</span>
							<input type="text" class="ppe__special-chars-input" maxlength="4" placeholder="Type a character" autocomplete="off" spellcheck="false">
						</label>
						<button type="button" class="ppe__btn ppe__special-chars-insert">Insert</button>
					</div>
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

	function renderToolbarHtml() {
		const parts = PRIMARY_INLINE_TOOLS.map((btn) => renderToolButton(btn));
		parts.push(renderUnderlineMenu());
		parts.push(...SECONDARY_INLINE_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		parts.push(renderToolbarMenu("heading", "bi-paragraph", "Paragraph", HEADING_OPTIONS, { labelOnly: true }));
		parts.push(renderToolbarMenu("list", "bi-list-ul", "List", LIST_OPTIONS));
		parts.push(...LIST_INDENT_TOOLS.map((btn) => renderToolButton(btn)));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		for (const btn of TRAILING_TOOLS) {
			if (btn.separator) {
				parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
				continue;
			}
			parts.push(renderToolButton(btn));
			if (btn.action === "image") {
				parts.push(renderSpecialCharsMenu());
			}
		}
		return parts.join("");
	}

	// Tags kept when cleaning pasted HTML; everything else is unwrapped (its text
	// is preserved) and all attributes except a couple are stripped.
	const PASTE_ALLOWED_TAGS = new Set(["P", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "DL", "DT", "DD", "A", "B", "STRONG", "I", "EM", "U", "S", "SUB", "SUP", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "CAPTION"]);
	const PASTE_ALLOWED_ATTRS = { A: ["href"], OL: ["type"], U: ["class"], TABLE: ["class"], TH: ["colspan", "rowspan"], TD: ["colspan", "rowspan"] };
	const MAX_BLOCK_INDENT = 8;
	const BLOCK_INDENT_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, dt, dd";

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

	// Shown in the profile-page preview only when the infobox has no portrait yet.
	const DEFAULT_PROFILE_PHOTO = "assets/default-profile-photo.svg";

	// Split the profile fragment into the leading comment, the <h1> title, the
	// infobox node (inline <profile-identity> or an <include>), and the prose.
	function parseProfileFragment(html) {
		// Preserve a leading template comment from the raw string — the HTML
		// parser hoists it out of <body>, so it can't be recovered from the DOM.
		const headerMatch = html.match(/^\s*(<!--[\s\S]*?-->)/);
		const headerComment = headerMatch ? headerMatch[1] : "";

		const doc = new DOMParser().parseFromString(html, "text/html");
		const body = doc.body;

		let title = "";
		let infoboxNode = null;
		const proseNodes = [];

		for (const node of [...body.childNodes]) {
			if (node.nodeType === Node.COMMENT_NODE) {
				continue;
			}
			if (node.nodeType === Node.ELEMENT_NODE) {
				const tag = node.tagName.toLowerCase();
				if (tag === "h1" && !title) {
					title = node.textContent.trim();
					continue;
				}
				if (!infoboxNode && (tag === "profile-identity" || tag === "include" || node.hasAttribute("data-include"))) {
					infoboxNode = node;
					continue;
				}
			}
			// Keep meaningful prose (skip empty whitespace-only text nodes).
			if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) continue;
			proseNodes.push(node);
		}

		const proseContainer = doc.createElement("div");
		proseNodes.forEach((node) => proseContainer.append(node));

		const isInclude = Boolean(infoboxNode && infoboxNode.tagName.toLowerCase() !== "profile-identity");
		const includeSrc = isInclude ? (infoboxNode.getAttribute("src") || infoboxNode.getAttribute("data-include") || "").replace(/^\.?\//, "") : "";

		return {
			headerComment,
			title,
			infoboxMarkup: infoboxNode ? infoboxNode.outerHTML.trim() : "",
			infoboxIsInclude: isInclude,
			// Canonical = already the standard <include src="profile-table.html">.
			infoboxCanonical: includeSrc === "profile-table.html",
			proseHtml: proseContainer.innerHTML.trim() || "<p></p>",
		};
	}

	// Turn a <profile-identity> fragment into the floated identity <aside> the
	// live page renders, importing it into the current document. Returns null
	// when there are no rows to show.
	function renderIdentityAside(identityHtml) {
		if (!identityHtml || !identityHtml.includes("profile-identity")) return null;
		const doc = new DOMParser().parseFromString(`<body>${identityHtml}</body>`, "text/html");
		if (typeof window.upgradeProfileIdentityInDocument === "function") {
			window.upgradeProfileIdentityInDocument(doc);
		}
		const aside = doc.querySelector('aside[aria-label="Identity"]') || doc.querySelector("aside");
		if (!aside) return null;
		if (!aside.querySelector("tbody")?.children.length) return null;
		return document.importNode(aside, true);
	}

	function identityHtmlHasPhoto(identityHtml) {
		const match = String(identityHtml || "").match(/<table-photo\b[\s\S]*?<img\b[^>]*\bsrc=["']([^"']*)["']/i);
		return Boolean(match?.[1]?.trim());
	}

	function identityHtmlHasName(identityHtml) {
		return /<table-name\b/i.test(String(identityHtml || ""));
	}

	function identityHtmlHasBirth(identityHtml) {
		const match = String(identityHtml || "").match(/<table-birth\b[^>]*>([\s\S]*?)<\/table-birth>/i);
		if (!match) return false;
		return Boolean(match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
	}

	function asideHasNameRow(aside) {
		return [...aside.querySelectorAll("tbody th")].some((th) => th.textContent.trim() === "Name");
	}

	function asideHasBirthRow(aside) {
		return [...aside.querySelectorAll("tbody th")].some((th) => th.textContent.trim() === "Birth");
	}

	// Preview-only placeholder name; never written to profile-table.html.
	function ensurePreviewName(aside) {
		if (!aside || asideHasNameRow(aside)) return;
		const tbody = aside.querySelector("tbody");
		if (!tbody) return;

		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.textContent = "Name";
		const td = document.createElement("td");
		tr.append(th, td);

		const genderRow = [...tbody.querySelectorAll("tr")].find((row) => row.querySelector("th")?.textContent.trim() === "Gender");
		if (genderRow) {
			tbody.insertBefore(tr, genderRow);
			return;
		}

		const photoRow = tbody.querySelector(".ppe__infobox-photo-row");
		if (photoRow) {
			photoRow.after(tr);
			return;
		}

		tbody.prepend(tr);
	}

	// Preview-only placeholder birth; never written to profile-table.html.
	function ensurePreviewBirth(aside) {
		if (!aside || asideHasBirthRow(aside)) return;
		const tbody = aside.querySelector("tbody");
		if (!tbody) return;

		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.textContent = "Birth";
		const td = document.createElement("td");
		td.textContent = "Unknown";
		tr.append(th, td);

		const genderRow = [...tbody.querySelectorAll("tr")].find((row) => row.querySelector("th")?.textContent.trim() === "Gender");
		if (genderRow) genderRow.after(tr);
		else tbody.append(tr);
	}

	// Preview-only placeholder portrait; never written to profile-table.html.
	function ensurePreviewPhoto(aside, photoUrl) {
		if (!aside || aside.querySelector("tbody img[src]")) return;
		const tbody = aside.querySelector("tbody");
		if (!tbody) return;

		const tr = document.createElement("tr");
		tr.className = "ppe__infobox-photo-row";
		const td = document.createElement("td");
		td.colSpan = 2;

		const img = document.createElement("img");
		img.src = photoUrl;
		img.alt = "Example profile photo";
		img.className = "ppe__infobox-photo--example";
		img.title = "Change profile photo";

		td.append(img);
		tr.append(td);
		tbody.prepend(tr);
	}

	// Reduce arbitrary pasted HTML to the small set of tags profiles use, keeping
	// the text but dropping styles, classes, spans, fonts, scripts, etc.
	function sanitizePastedHtml(html) {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const body = doc.body;
		body.querySelectorAll("script, style, meta, link, title, head, noscript").forEach((el) => el.remove());
		cleanPastedNode(body);
		return body.innerHTML.replace(/\s+/g, " ").trim();
	}

	function cleanPastedNode(node) {
		[...node.childNodes].forEach((child) => {
			if (child.nodeType === Node.COMMENT_NODE) {
				child.remove();
				return;
			}
			if (child.nodeType !== Node.ELEMENT_NODE) return;

			cleanPastedNode(child);
			const tag = child.tagName.toUpperCase();
			if (!PASTE_ALLOWED_TAGS.has(tag)) {
				const parent = child.parentNode;
				while (child.firstChild) parent.insertBefore(child.firstChild, child);
				parent.removeChild(child);
				return;
			}

			const allowed = PASTE_ALLOWED_ATTRS[tag] || [];
			[...child.attributes].forEach((attr) => {
				if (!allowed.includes(attr.name.toLowerCase())) child.removeAttribute(attr.name);
			});
			if (tag === "A") {
				const href = child.getAttribute("href") || "";
				if (/^\s*javascript:/i.test(href)) child.removeAttribute("href");
			}
		});
	}

	function brandName() {
		return window.App?.getName?.() || window.App?.Name || "";
	}

	// Render {{APP_NAME}} as the brand name in a non-editable chip, so editors see
	// the real word while the token is preserved on save (see restoreBrandTokens).
	function applyBrandTokensForDisplay(root) {
		const name = brandName();
		if (!name || !root) return;
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
		const targets = [];
		while (walker.nextNode()) {
			if (/\{\{\s*[A-Z0-9_]+\s*\}\}/.test(walker.currentNode.nodeValue || "")) targets.push(walker.currentNode);
		}
		targets.forEach((textNode) => {
			const text = textNode.nodeValue;
			const frag = document.createDocumentFragment();
			const re = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
			let last = 0;
			let match;
			while ((match = re.exec(text))) {
				if (match.index > last) frag.append(document.createTextNode(text.slice(last, match.index)));
				if (match[1] === "APP_NAME") {
					const span = document.createElement("span");
					span.className = "ppe__brand";
					span.setAttribute("contenteditable", "false");
					span.setAttribute("data-brand", match[1]);
					span.textContent = name;
					frag.append(span);
				} else {
					frag.append(document.createTextNode(match[0]));
				}
				last = re.lastIndex;
			}
			if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
			textNode.replaceWith(frag);
		});
	}

	function restoreBrandTokens(root) {
		root.querySelectorAll("span[data-brand]").forEach((span) => {
			span.replaceWith(document.createTextNode(`{{${span.getAttribute("data-brand")}}}`));
		});
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

	class ProfilePageEditor extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;

			this.__personId = (this.getAttribute("person")
				|| new URLSearchParams(window.location.search).get("person")
				|| "").trim();

			this.__headerComment = "";
			this.__infoboxMarkup = "";
			this.__infoboxIsInclude = false;
			this.__displayName = "";
			this.__savedProse = "";

			this.innerHTML = `
				<div class="ppe">
					<div class="ppe__toolbar" role="toolbar" aria-label="Text formatting">
						${renderToolbarHtml()}
					</div>
					<div class="ppe__status" role="status" hidden></div>
					<div class="ppe__canvas-scroll">
						<article class="people-page__content ppe__canvas">
							<h1 class="ppe__title"></h1>
							<div class="ppe__prose ppe__prose--empty" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Profile text" data-placeholder="Write this profile…"></div>
						</article>
					</div>

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
				</div>
			`;

			this.#bindToolbar();
			this.#bindProse();
			this.#bindLinkPopover();
			this.#bindMediaModal();
			this.#bindTableModal();
			this.__onProfilePhotoChange = () => this.refreshInfoboxPreview();
			document.addEventListener("profile-photo-change", this.__onProfilePhotoChange);
			this.#loadExisting();
		}

		disconnectedCallback() {
			if (this.__onSelectionChange) {
				document.removeEventListener("selectionchange", this.__onSelectionChange);
			}
			if (this.__onOutsideMenu) {
				document.removeEventListener("mousedown", this.__onOutsideMenu);
			}
			if (this.__onProfilePhotoChange) {
				document.removeEventListener("profile-photo-change", this.__onProfilePhotoChange);
			}
		}

		#els() {
			return {
				canvas: this.querySelector(".ppe__canvas"),
				title: this.querySelector(".ppe__title"),
				prose: this.querySelector(".ppe__prose"),
				status: this.querySelector(".ppe__status"),
				toolbar: this.querySelector(".ppe__toolbar"),
			};
		}

		#setStatus(message, type = "info") {
			const { status } = this.#els();
			if (!status) return;
			status.textContent = message || "";
			status.dataset.type = type;
			status.hidden = !message;
		}

		#bindToolbar() {
			const { toolbar } = this.#els();
			toolbar?.addEventListener("mousedown", (event) => {
				if (event.target.closest(".ppe__special-chars-input, .ppe__special-chars-insert")) {
					return;
				}
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
				if (event.target.closest(".ppe__special-chars-insert")) {
					event.preventDefault();
					const input = this.querySelector(".ppe__special-chars-input");
					const value = String(input?.value || "").trim();
					if (!value) return;
					this.#insertSpecialCharacter(value);
					if (input) input.value = "";
					this.#closeMenus();
					return;
				}
				const menuItem = event.target.closest(".ppe__menu-item");
				if (menuItem) {
					this.#runMenuItem(menuItem);
					this.#closeMenus();
					return;
				}
				const button = event.target.closest(".ppe__tool:not(.ppe__menu-toggle)");
				if (!button) return;
				this.#runCommand(button);
			});
			this.querySelector(".ppe__special-chars-input")?.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.querySelector(".ppe__special-chars-insert")?.click();
				}
			});
			this.__onOutsideMenu = (event) => {
				if (!event.target.closest(".ppe__menu")) this.#closeMenus();
			};
			document.addEventListener("mousedown", this.__onOutsideMenu);
			this.#updateToolbarState();
		}

		#insertSpecialCharacter(value) {
			const { prose } = this.#els();
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
			const { prose } = this.#els();
			let block = "";
			try {
				block = (document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/^<|>$/g, "");
			} catch (error) {
				/* ignore */
			}

			if ((!block || block === "div") && prose) {
				const selection = window.getSelection();
				let node = selection?.anchorNode;
				if (node && prose.contains(node)) {
					if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
					const blockEl = node?.closest?.("p, h1, h2, h3, h4, h5, h6");
					if (blockEl && prose.contains(blockEl)) {
						block = blockEl.tagName.toLowerCase();
					}
				}
			}

			if (!block || block === "div") block = "p";
			return block;
		}

		#toggleMenu(menuId) {
			const menu = this.querySelector(`[data-menu-group="${menuId}"]`);
			if (!menu) return;
			const panel = menu.querySelector(".ppe__menu-panel");
			const toggle = menu.querySelector("[data-menu-toggle]");
			const willOpen = panel?.hidden;
			this.#closeMenus();
			if (!willOpen || !panel || !toggle) return;
			panel.hidden = false;
			toggle.setAttribute("aria-expanded", "true");
			menu.classList.add("is-open");
		}

		#closeMenus() {
			this.querySelectorAll(".ppe__menu").forEach((menu) => {
				menu.classList.remove("is-open");
				const panel = menu.querySelector(".ppe__menu-panel");
				const toggle = menu.querySelector("[data-menu-toggle]");
				if (panel) panel.hidden = true;
				if (toggle) toggle.setAttribute("aria-expanded", "false");
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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

		#getIndentContext() {
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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

			const command = button.dataset.command;
			if (!command) return;
			document.execCommand(command, false, null);
			this.#afterCommand();
		}

		#afterCommand() {
			this.#onProseChanged();
			this.#updateToolbarState();
		}

		#bindProse() {
			const { prose } = this.#els();
			if (!prose) return;
			prose.addEventListener("input", () => this.#onProseChanged());
			prose.addEventListener("paste", (event) => this.#handlePaste(event));
			prose.addEventListener("blur", () => this.#syncProsePlaceholder());
			prose.addEventListener("keydown", (event) => {
				if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
					event.preventDefault();
					this.#applyUnderlineStyle("solid");
				}
			});

			// Reflect the caret's formatting in the toolbar.
			this.__onSelectionChange = () => {
				const selection = window.getSelection();
				if (selection?.anchorNode && prose.contains(selection.anchorNode)) {
					this.#updateToolbarState();
				}
			};
			document.addEventListener("selectionchange", this.__onSelectionChange);
			["keyup", "mouseup", "focus"].forEach((evt) => prose.addEventListener(evt, () => this.#updateToolbarState()));

			// Prefer real tags over inline styles, and <p> between paragraphs.
			prose.addEventListener("focus", () => {
				try {
					document.execCommand("styleWithCSS", false, false);
					document.execCommand("defaultParagraphSeparator", false, "p");
				} catch (error) {
					// Older engines: ignore.
				}
			}, { once: true });
		}

		#updateToolbarState() {
			this.querySelectorAll(".ppe__tool[data-state]").forEach((btn) => {
				const state = btn.dataset.state;
				if (!state) return;
				let active = false;
				try {
					active = document.queryCommandState(state);
				} catch (error) {
					/* ignore */
				}
				if (state === "underline" && !active) {
					active = Boolean(this.#getSelectionUnderlineStyle());
				}
				btn.classList.toggle("is-active", active);
			});

			const block = this.#currentBlockTag();

			this.querySelectorAll('.ppe__menu-item[data-block]').forEach((item) => {
				item.classList.toggle("is-active", item.dataset.block === block);
			});

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

		#onProseChanged() {
			this.#syncProsePlaceholder();
			this.dispatchEvent(new CustomEvent("profile-page-dirty-change", { bubbles: true }));
		}

		#proseIsEmpty(prose) {
			return !String(prose?.textContent || "").replace(/\u00a0/g, " ").trim();
		}

		#syncProsePlaceholder() {
			const { prose } = this.#els();
			if (!prose) return;
			prose.classList.toggle("ppe__prose--empty", this.#proseIsEmpty(prose));
		}

		// ---- Paste cleanup -------------------------------------------------
		#handlePaste(event) {
			const data = event.clipboardData;
			if (!data) return;
			event.preventDefault();
			const html = data.getData("text/html");
			if (html) {
				document.execCommand("insertHTML", false, sanitizePastedHtml(html));
			} else {
				const text = data.getData("text/plain");
				if (text) document.execCommand("insertText", false, text);
			}
			this.#afterCommand();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
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
			const { prose } = this.#els();
			if (!prose) return;

			const html = buildProfileTableHtml(this.#readTableModalOptions());
			prose.focus();
			this.#restoreSelection();
			document.execCommand("insertHTML", false, `${html}<p></p>`);
			this.#afterCommand();
			this.#closeTableModal();
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
				url.searchParams.set("person", this.__personId);
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
					this.#setStatus("Image submitted for review and inserted into the article.", "success");
				} else {
					this.#setStatus("Image uploaded and inserted into the article.", "success");
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
					person_id: this.__personId,
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
			const { prose } = this.#els();
			prose.focus();
			this.#restoreSelection();
			const isRelative = !/^(https?:)?\/\//i.test(src) && !src.startsWith("data:");
			const displaySrc = isRelative ? this.#resolveImageUrl(src) : src;
			const dataAttr = isRelative ? ` data-ppe-src="${escapeHtml(src)}"` : "";
			const cap = escapeHtml(caption || "");
			const html = `<figure class="profile-figure"><img src="${escapeHtml(displaySrc)}"${dataAttr} alt="${cap}"><figcaption>${cap || "Add a caption"}</figcaption></figure>`;
			document.execCommand("insertHTML", false, html);
			this.#afterCommand();
		}

		async #loadExisting() {
			this.#setStatus("Loading…");
			let parsed = null;
			if (!(await isDraftProfile(this.__personId))) {
				const response = await fetchSiteResource(resolveSiteUrl(`people/${this.__personId}/data/profile.html`));
				if (response) {
					parsed = parseProfileFragment(await response.text());
				}
			}

			if (!parsed) {
				parsed = { headerComment: "", title: "", infoboxMarkup: "", infoboxIsInclude: false, infoboxCanonical: false, proseHtml: "<p></p>" };
			}

			this.__headerComment = parsed.headerComment;
			this.__infoboxMarkup = parsed.infoboxMarkup;
			this.__infoboxIsInclude = parsed.infoboxIsInclude;
			this.__infoboxCanonical = parsed.infoboxCanonical;
			this.__hadInfoboxNode = Boolean(parsed.infoboxMarkup);
			this.__displayName = parsed.title;
			// Let the shell label the breadcrumb with the profile name. The infobox
			// overrides this if it carries an explicit display name.
			if (parsed.title) {
				document.dispatchEvent(new CustomEvent("profile-display-name-change", { detail: { name: parsed.title } }));
			}

			const { title, prose } = this.#els();
			if (title) title.textContent = parsed.title;
			if (prose) {
				prose.innerHTML = parsed.proseHtml;
				// Resolve image paths (relative to data/) for display, remembering
				// the originals so they round-trip unchanged on save. Links are left
				// alone — like the live page, only images are rewritten.
				this.#rewriteImagesForDisplay(prose, { track: true });
				// Show {{APP_NAME}} as the brand name (preserved on save).
				applyBrandTokensForDisplay(prose);
				this.#syncProsePlaceholder();
			}
			this.__savedProse = this.#getProseHtml();

			await this.#renderInfobox();
			this.#updateToolbarState();
			this.#setStatus("");
		}

		#resolveImageUrl(src) {
			if (!src || isAbsoluteUrl(src) || src.startsWith("data:")) return src;
			const normalized = src.replace(/^\.?\//, "");
			if (normalized.startsWith("assets/")) return resolveSiteUrl(normalized);
			return resolveSiteUrl(`people/${this.__personId}/data/${normalized}`);
		}

		#rewriteImagesForDisplay(root, { track = false } = {}) {
			root.querySelectorAll("img[src]").forEach((img) => {
				const src = img.getAttribute("src");
				if (!src || isAbsoluteUrl(src) || src.startsWith("data:")) return;
				if (track) img.setAttribute("data-ppe-src", src);
				img.setAttribute("src", this.#resolveImageUrl(src));
			});
		}

		// Render the floated identity card. Prefer the live infobox editor's
		// current data (so edits show immediately); fall back to the stored file.
		// The <aside> is a direct sibling of the prose so the article text wraps
		// around it exactly like the live page.
		async #renderInfobox() {
			const { canvas, prose } = this.#els();
			if (!canvas || !prose) return;

			let aside = null;
			let identityHtml = "";

			const infoboxEl = document.querySelector("profile-infobox-editor");
			const infoboxPreviewReady = typeof infoboxEl?.isPreviewReady === "function"
				? infoboxEl.isPreviewReady()
				: true;
			if (infoboxPreviewReady && infoboxEl && typeof infoboxEl.getIdentityFragmentHtml === "function") {
				try {
					identityHtml = infoboxEl.getIdentityFragmentHtml();
					aside = renderIdentityAside(identityHtml);
				} catch (error) {
					aside = null;
				}
			}

			if (!aside && !(await isDraftProfile(this.__personId))) {
				if (this.__infoboxIsInclude) {
					const src = this.#includeSrc();
					if (src) {
						const response = await fetchSiteResource(resolveSiteUrl(`people/${this.__personId}/data/${src}`));
						if (response) {
							identityHtml = await response.text();
							aside = renderIdentityAside(identityHtml);
						}
					}
				} else if (this.__infoboxMarkup) {
					identityHtml = this.__infoboxMarkup;
					aside = renderIdentityAside(identityHtml);
				}
			}

			canvas.querySelector("aside.ppe__infobox")?.remove();
			if (aside) {
				if (!identityHtmlHasPhoto(identityHtml)) {
					ensurePreviewPhoto(aside, resolveSiteUrl(DEFAULT_PROFILE_PHOTO));
				}
				if (!identityHtmlHasName(identityHtml)) {
					ensurePreviewName(aside);
				}
				if (!identityHtmlHasBirth(identityHtml)) {
					ensurePreviewBirth(aside);
				}
				this.#rewriteImagesForDisplay(aside);
				this.#wireInfoboxPhoto(aside, infoboxEl);
				this.#wireInfoboxQuickEdits(aside, infoboxEl);
				aside.classList.add("ppe__infobox");
				aside.setAttribute("contenteditable", "false");
				const note = document.createElement("button");
				note.type = "button";
				note.className = "ppe__infobox-note";
				note.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i> Edit Identity Details';
				note.addEventListener("click", (event) => {
					event.stopPropagation();
					document.dispatchEvent(
						new CustomEvent("profile-editor-activate-tab", { detail: { tab: "infobox" } }),
					);
				});
				aside.append(note);
				// Float must share a containing block with the prose to wrap it.
				canvas.insertBefore(aside, prose);
			}
		}

		#buildQuickEditorHtml(config) {
			if (config.type === "select") {
				const options = (config.options || []).map((option) => {
					const selected = option.value === config.value ? " selected" : "";
					return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
				}).join("");
				return `<select class="ppe__infobox-field-input">${options}</select>`;
			}

			if (config.type === "textarea") {
				const rows = Number(config.rows) > 0 ? Number(config.rows) : 2;
				const placeholder = config.placeholder ? ` placeholder="${escapeHtml(config.placeholder)}"` : "";
				return `<textarea class="ppe__infobox-field-input" rows="${rows}"${placeholder}>${escapeHtml(config.value || "")}</textarea>`;
			}

			if (config.type === "date") {
				return `<span class="pie__date-input-wrap ppe__infobox-date-wrap">
					<input type="date" class="ppe__infobox-field-input pie__date-input" value="${escapeHtml(config.value || "")}">
					<button type="button" class="pie__date-picker-button" aria-label="Choose date">
						<i class="bi bi-calendar3" aria-hidden="true"></i>
					</button>
				</span>`;
			}

			if (config.type === "name") {
				const fields = config.fields || {};
				const nameInput = (key, placeholder) => `<input type="text" class="ppe__infobox-field-input" data-name-field="${key}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(fields[key] || "")}">`;
				return `<div class="ppe__infobox-name-fields">
					${nameInput("title", "Title")}
					<div class="ppe__infobox-name-split">
						${nameInput("firstName", "First Name")}
						${nameInput("middleName", "Middle Name")}
					</div>
					<div class="ppe__infobox-name-split">
						${nameInput("lastName", "Last Name")}
						${nameInput("suffix", "Suffix")}
					</div>
					${nameInput("birthSurname", "Birth Surname")}
				</div>`;
			}

			return `<input type="text" class="ppe__infobox-field-input" value="${escapeHtml(config.value || "")}">`;
		}

		#closeQuickFieldEditor(td) {
			if (!td) return;
			const valueEl = td.querySelector(".ppe__infobox-value");
			const editorEl = td.querySelector(".ppe__infobox-field-editor");
			const editBtn = td.querySelector(".ppe__infobox-field-edit");
			const saveBtn = td.querySelector(".ppe__infobox-field-save");
			const cancelBtn = td.querySelector(".ppe__infobox-field-cancel");
			if (valueEl) valueEl.hidden = false;
			if (editorEl) {
				editorEl.hidden = true;
				editorEl.innerHTML = "";
			}
			if (editBtn) editBtn.hidden = false;
			if (saveBtn) saveBtn.hidden = true;
			if (cancelBtn) cancelBtn.hidden = true;
			td.classList.remove("is-editing");
		}

		#openQuickFieldEditor(td, infoboxEl, label) {
			const config = infoboxEl.getQuickEditForLabel?.(label);
			if (!config) return;

			td.closest("aside")?.querySelectorAll(".ppe__infobox-field.is-editing").forEach((cell) => {
				this.#closeQuickFieldEditor(cell);
			});

			const valueEl = td.querySelector(".ppe__infobox-value");
			const editorEl = td.querySelector(".ppe__infobox-field-editor");
			const editBtn = td.querySelector(".ppe__infobox-field-edit");
			const saveBtn = td.querySelector(".ppe__infobox-field-save");
			const cancelBtn = td.querySelector(".ppe__infobox-field-cancel");
			if (!valueEl || !editorEl || !editBtn || !saveBtn || !cancelBtn) return;

			editorEl.innerHTML = this.#buildQuickEditorHtml(config);
			valueEl.hidden = true;
			editorEl.hidden = false;
			editBtn.hidden = true;
			saveBtn.hidden = false;
			cancelBtn.hidden = false;
			td.classList.add("is-editing");

			const readEditorValue = () => {
				if (config.type === "name") {
					const values = {};
					editorEl.querySelectorAll("[data-name-field]").forEach((field) => {
						values[field.dataset.nameField] = field.value;
					});
					return values;
				}

				const primaryInput = editorEl.querySelector(".ppe__infobox-field-input");
				return primaryInput?.tagName === "SELECT" ? primaryInput.value : primaryInput?.value;
			};

			const input = editorEl.querySelector(".ppe__infobox-field-input");
			if (config.type === "date") {
				const dateInput = editorEl.querySelector('input[type="date"]');
				const pickerBtn = editorEl.querySelector(".pie__date-picker-button");
				const openPicker = () => {
					if (!dateInput || dateInput.disabled) {
						return;
					}
					dateInput.focus({ preventScroll: true });
					try {
						if (typeof dateInput.showPicker === "function") {
							dateInput.showPicker();
						}
					} catch (error) {
						// showPicker may be blocked outside a direct user gesture.
					}
				};
				dateInput?.addEventListener("click", openPicker);
				pickerBtn?.addEventListener("click", (event) => {
					event.preventDefault();
					openPicker();
				});
				dateInput?.focus();
			} else if (config.type === "name") {
				editorEl.querySelector('[data-name-field="firstName"]')?.focus();
			} else {
				input?.focus();
			}

			const finish = (apply) => {
				if (apply) {
					if (infoboxEl.applyQuickEdit?.(label, readEditorValue())) {
						this.refreshInfoboxPreview();
						return;
					}
				}
				this.#closeQuickFieldEditor(td);
			};

			saveBtn.addEventListener("click", (event) => {
				event.stopPropagation();
				finish(true);
			}, { once: true });

			cancelBtn.addEventListener("click", (event) => {
				event.stopPropagation();
				finish(false);
			}, { once: true });

			const handleEditorKeydown = (event) => {
				if (config.type === "name" && !event.target.matches("[data-name-field]")) {
					return;
				}
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					finish(false);
				} else if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && !event.shiftKey) {
					event.preventDefault();
					finish(true);
				}
			};

			if (config.type === "name") {
				editorEl.addEventListener("keydown", handleEditorKeydown, { once: true });
			} else {
				input?.addEventListener("keydown", handleEditorKeydown, { once: true });
			}
		}

		#wireInfoboxQuickEdits(aside, infoboxEl) {
			if (!infoboxEl?.getQuickEditForLabel) return;

			aside.querySelectorAll("tbody tr").forEach((row) => {
				if (row.classList.contains("ppe__infobox-photo-row")) return;

				const th = row.querySelector("th");
				const td = row.querySelector("td");
				if (!th || !td || td.classList.contains("ppe__infobox-field")) return;

				const label = th.textContent.trim();
				if (!infoboxEl.getQuickEditForLabel(label)) return;

				td.classList.add("ppe__infobox-field");
				td.dataset.fieldLabel = label;

				const main = document.createElement("div");
				main.className = "ppe__infobox-field-main";

				const valueEl = document.createElement("span");
				valueEl.className = "ppe__infobox-value";
				valueEl.innerHTML = td.innerHTML;

				const editorEl = document.createElement("div");
				editorEl.className = "ppe__infobox-field-editor";
				editorEl.hidden = true;

				main.append(valueEl, editorEl);

				const controls = document.createElement("div");
				controls.className = "ppe__infobox-field-controls";

				const editBtn = document.createElement("button");
				editBtn.type = "button";
				editBtn.className = "ppe__infobox-field-edit";
				editBtn.setAttribute("aria-label", `Edit ${label}`);
				editBtn.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i>';

				const saveBtn = document.createElement("button");
				saveBtn.type = "button";
				saveBtn.className = "ppe__infobox-field-save";
				saveBtn.setAttribute("aria-label", `Save ${label}`);
				saveBtn.hidden = true;
				saveBtn.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';

				const cancelBtn = document.createElement("button");
				cancelBtn.type = "button";
				cancelBtn.className = "ppe__infobox-field-cancel";
				cancelBtn.setAttribute("aria-label", `Cancel editing ${label}`);
				cancelBtn.hidden = true;
				cancelBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

				controls.append(editBtn, saveBtn, cancelBtn);
				td.replaceChildren(main, controls);

				editBtn.addEventListener("click", (event) => {
					event.stopPropagation();
					this.#openQuickFieldEditor(td, infoboxEl, label);
				});
			});
		}

		#wireInfoboxPhoto(aside, infoboxEl) {
			const img = aside.querySelector("tbody img");
			if (!img || !infoboxEl || typeof infoboxEl.openPhotoEditor !== "function") return;

			const row = img.closest("tr");
			if (row) row.classList.add("ppe__infobox-photo-row");

			let frame = img.closest(".ppe__infobox-photo-frame");
			if (!frame) {
				frame = document.createElement("div");
				frame.className = "ppe__infobox-photo-frame";
				img.parentNode.insertBefore(frame, img);
				frame.append(img);
			}

			if (!frame.querySelector(".ppe__infobox-photo-actions")) {
				const actions = document.createElement("div");
				actions.className = "ppe__infobox-photo-actions";
				actions.setAttribute("role", "group");
				actions.setAttribute("aria-label", "Profile photo");
				actions.innerHTML = `
					<button type="button" class="ppe__infobox-photo-action ppe__infobox-photo-action--change" aria-label="Change profile photo">
						<i class="bi bi-camera" aria-hidden="true"></i>
						<span>Change photo</span>
					</button>
					<button type="button" class="ppe__infobox-photo-action ppe__infobox-photo-action--remove" aria-label="Remove profile photo" hidden>
						<i class="bi bi-trash" aria-hidden="true"></i>
						<span>Remove photo</span>
					</button>
				`;
				frame.append(actions);
			}

			const changeBtn = frame.querySelector(".ppe__infobox-photo-action--change");
			const removeBtn = frame.querySelector(".ppe__infobox-photo-action--remove");
			const hasRealPhoto = !img.classList.contains("ppe__infobox-photo--example");
			const changeLabel = changeBtn?.querySelector("span");
			if (changeLabel) changeLabel.textContent = hasRealPhoto ? "Change photo" : "Add photo";
			if (removeBtn) removeBtn.hidden = !hasRealPhoto;

			if (!frame.dataset.photoEditorBound) {
				frame.dataset.photoEditorBound = "1";
				changeBtn?.addEventListener("click", (event) => {
					event.stopPropagation();
					event.preventDefault();
					void infoboxEl.openPhotoEditor();
				});
				removeBtn?.addEventListener("click", (event) => {
					event.stopPropagation();
					event.preventDefault();
					infoboxEl.removePhoto?.();
				});
			}
		}

		#includeSrc() {
			const match = this.__infoboxMarkup.match(/src=["']([^"']+)["']/i);
			const src = match ? match[1].trim() : "profile-table.html";
			return src.replace(/^\.?\//, "");
		}

		// Public: refresh the floated infobox + title from the infobox editor.
		// Called when the Page tab becomes active.
		refreshInfoboxPreview() {
			void this.#renderInfobox();
		}

		// Public: keep the rendered <h1> in step with the infobox display name.
		setDisplayName(name) {
			const clean = String(name || "").trim();
			if (!clean) return;
			this.__displayName = clean;
			const { title } = this.#els();
			if (title) title.textContent = clean;
		}

		#getProseHtml() {
			const { prose } = this.#els();
			if (!prose) return "";
			const clone = prose.cloneNode(true);
			// Restore original (relative) image paths so the saved file is unchanged.
			clone.querySelectorAll("img[data-ppe-src]").forEach((img) => {
				img.setAttribute("src", img.getAttribute("data-ppe-src"));
				img.removeAttribute("data-ppe-src");
			});
			// Turn brand chips back into {{APP_NAME}} tokens.
			restoreBrandTokens(clone);
			// Drop any inline styles execCommand may have added (we use tag-based
			// formatting), but otherwise leave the markup as-is so existing files
			// keep their <b>/<i> conventions and diffs stay small.
			clone.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
			return clone.innerHTML.replace(/\s+$/g, "").trim();
		}

		isDirty() {
			return this.#getProseHtml() !== this.__savedProse;
		}

		setSavedBaseline() {
			this.__savedProse = this.#getProseHtml();
			// After a save, profile.html now carries the canonical include.
			if (this.#hasInfobox()) {
				this.__hadInfoboxNode = true;
				this.__infoboxCanonical = true;
			}
		}

		#infoboxEditorHasData() {
			const el = document.querySelector("profile-infobox-editor");
			if (el && typeof el.getIdentityFragmentHtml === "function") {
				return Boolean(renderIdentityAside(el.getIdentityFragmentHtml()));
			}
			return false;
		}

		#hasInfobox() {
			return Boolean(this.__hadInfoboxNode) || this.#infoboxEditorHasData();
		}

		// True when profile.html must be (re)written to adopt the canonical
		// <include> — either a legacy inline identity is being converted, or a
		// profile that had no infobox just gained one on the Identity tab.
		hasPendingInfoboxStructureChange() {
			return this.#hasInfobox() && !this.__infoboxCanonical;
		}

		// When converting a legacy inline identity to the include form, also write
		// the fragment file so the new <include> resolves. The infobox editor's
		// richer fragment supersedes this whenever it is the file being saved.
		getInfoboxMigrationFile() {
			if (this.__infoboxCanonical || !this.__infoboxMarkup || !this.__infoboxMarkup.includes("profile-identity")) {
				return null;
			}
			return {
				path: `people/${this.__personId}/data/profile-table.html`,
				content: `<!-- Profile identity table fragment -->\n${this.__infoboxMarkup}\n`,
			};
		}

		// Reconstruct the full profile.html fragment for publishing. The infobox is
		// always written as the canonical <include> so no profile is ever inline.
		getPublishFile() {
			const prose = this.#getProseHtml() || "<p></p>";
			const parts = [];
			if (this.__headerComment) parts.push(this.__headerComment);
			parts.push(`<h1>${escapeHtml(this.__displayName || "")}</h1>`);
			if (this.#hasInfobox()) parts.push('<include src="profile-table.html"></include>');
			parts.push(prose);
			const content = `${parts.join("\n\n")}\n`;
			return {
				path: `people/${this.__personId}/data/profile.html`,
				content,
			};
		}
	}

	if (!customElements.get("profile-page-editor")) {
		customElements.define("profile-page-editor", ProfilePageEditor);
	}
})();
