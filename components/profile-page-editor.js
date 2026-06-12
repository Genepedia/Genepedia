/**
 * <profile-page-editor person="<id>">
 *
 * A WYSIWYG editor for a person's profile prose (people/<id>/data/profile.html).
 * It renders the page exactly as it appears live — the identity infobox floated
 * to the right with the article text wrapping around it — so editors see the
 * real layout while they type. Only the prose is editable here; the infobox is
 * read-only context (it is edited on the Identity tab) and the page title is the
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

	const INLINE_TOOLS = [
		{ command: "bold", icon: "bi-type-bold", label: "Bold (Ctrl+B)", state: "bold" },
		{ command: "italic", icon: "bi-type-italic", label: "Italic (Ctrl+I)", state: "italic" },
		{ command: "underline", icon: "bi-type-underline", label: "Underline (Ctrl+U)", state: "underline" },
		{ command: "strikeThrough", icon: "bi-type-strikethrough", label: "Strikethrough", state: "strikeThrough" },
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
		{ separator: true },
		{ listType: "indent", icon: "bi-text-indent-right", label: "Increase indent" },
		{ listType: "outdent", icon: "bi-text-indent-left", label: "Decrease indent" },
	];

	const BLOCK_LABELS = Object.fromEntries(HEADING_OPTIONS.map((item) => [item.block, item.label]));

	const TRAILING_TOOLS = [
		{ action: "link", icon: "bi-link-45deg", label: "Link" },
		{ command: "unlink", icon: "bi-link", label: "Remove link" },
		{ action: "image", icon: "bi-image", label: "Insert image" },
		{ separator: true },
		{ command: "removeFormat", icon: "bi-eraser", label: "Clear formatting" },
	];

	function renderToolButton(btn) {
		const attrs = [
			`data-command="${btn.command || ""}"`,
			`data-block="${btn.block || ""}"`,
			`data-action="${btn.action || ""}"`,
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

	function renderToolbarMenu(menuId, toggleIcon, toggleLabel, items) {
		return `
			<div class="ppe__menu" data-menu-group="${menuId}">
				<button type="button" class="ppe__tool ppe__menu-toggle" data-menu-toggle="${menuId}" aria-haspopup="menu" aria-expanded="false" title="${toggleLabel}">
					<i class="bi ${toggleIcon} ppe__menu-toggle-icon" aria-hidden="true"></i>
					<span class="ppe__menu-toggle-label">${toggleLabel}</span>
					<i class="bi bi-chevron-down ppe__menu-caret" aria-hidden="true"></i>
				</button>
				<div class="ppe__menu-panel" role="menu" hidden>
					${renderMenuItems(items, "ppe__menu-item")}
				</div>
			</div>`;
	}

	function renderToolbarHtml() {
		const parts = INLINE_TOOLS.map((btn) => renderToolButton(btn));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		parts.push(renderToolbarMenu("heading", "bi-type-h2", "Paragraph", HEADING_OPTIONS));
		parts.push(renderToolbarMenu("list", "bi-list-ul", "List", LIST_OPTIONS));
		parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
		for (const btn of TRAILING_TOOLS) {
			if (btn.separator) {
				parts.push('<span class="ppe__toolbar-sep" aria-hidden="true"></span>');
				continue;
			}
			parts.push(renderToolButton(btn));
		}
		return parts.join("");
	}

	// Tags kept when cleaning pasted HTML; everything else is unwrapped (its text
	// is preserved) and all attributes except a couple are stripped.
	const PASTE_ALLOWED_TAGS = new Set(["P", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "DL", "DT", "DD", "A", "B", "STRONG", "I", "EM", "U", "S", "BLOCKQUOTE"]);
	const PASTE_ALLOWED_ATTRS = { A: ["href"], OL: ["type"] };

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

	function identityHtmlHasBirth(identityHtml) {
		const match = String(identityHtml || "").match(/<table-birth\b[^>]*>([\s\S]*?)<\/table-birth>/i);
		if (!match) return false;
		return Boolean(match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
	}

	function asideHasBirthRow(aside) {
		return [...aside.querySelectorAll("tbody th")].some((th) => th.textContent.trim() === "Birth");
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
		const td = document.createElement("td");
		td.colSpan = 2;

		const img = document.createElement("img");
		img.src = photoUrl;
		img.alt = "Example profile photo";
		img.className = "ppe__infobox-photo--example";
		img.title = "Example profile photo — add one on the Identity tab";

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
				</div>
			`;

			this.#bindToolbar();
			this.#bindProse();
			this.#bindLinkPopover();
			this.#bindMediaModal();
			this.#loadExisting();
		}

		disconnectedCallback() {
			if (this.__onSelectionChange) {
				document.removeEventListener("selectionchange", this.__onSelectionChange);
			}
			if (this.__onOutsideMenu) {
				document.removeEventListener("mousedown", this.__onOutsideMenu);
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
				// Keep the prose selection while clicking a tool.
				event.preventDefault();
			});
			toolbar?.addEventListener("click", (event) => {
				const toggle = event.target.closest("[data-menu-toggle]");
				if (toggle) {
					this.#toggleMenu(toggle.dataset.menuToggle);
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
			this.__onOutsideMenu = (event) => {
				if (!event.target.closest(".ppe__menu")) this.#closeMenus();
			};
			document.addEventListener("mousedown", this.__onOutsideMenu);
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
			}
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
				document.execCommand("indent", false, null);
				this.#afterCommand();
				return;
			}

			if (listType === "outdent") {
				document.execCommand("outdent", false, null);
				this.#afterCommand();
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

			const block = button.dataset.block;
			if (block) {
				// Toggle a heading back to a paragraph when it is already applied.
				let current = "";
				try {
					current = (document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/^<|>$/g, "");
				} catch (error) {
					/* ignore */
				}
				const next = current === block && block !== "p" ? "p" : block;
				document.execCommand("formatBlock", false, next);
				this.#afterCommand();
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
				btn.classList.toggle("is-active", active);
			});

			let block = "";
			try {
				block = (document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/^<|>$/g, "");
			} catch (error) {
				/* ignore */
			}
			if (!block || block === "div") block = "p";

			const headingToggle = this.querySelector('[data-menu-toggle="heading"]');
			const headingLabel = headingToggle?.querySelector(".ppe__menu-toggle-label");
			const headingIcon = headingToggle?.querySelector(".ppe__menu-toggle-icon");
			if (headingLabel) headingLabel.textContent = BLOCK_LABELS[block] || "Paragraph";
			const activeHeading = HEADING_OPTIONS.find((item) => item.block === block) || HEADING_OPTIONS[0];
			if (headingIcon) {
				if (activeHeading?.icon) {
					headingIcon.className = `bi ${activeHeading.icon} ppe__menu-toggle-icon`;
					headingIcon.textContent = "";
				} else if (activeHeading?.text) {
					headingIcon.className = "ppe__menu-toggle-icon ppe__menu-toggle-mark";
					headingIcon.textContent = activeHeading.text;
				}
			}
			if (headingToggle) headingToggle.classList.toggle("is-active", block !== "p");
			this.querySelectorAll('.ppe__menu-item[data-block]').forEach((item) => {
				item.classList.toggle("is-active", item.dataset.block === block);
			});

			const listContext = this.#selectionListContext();
			const listToggle = this.querySelector('[data-menu-toggle="list"]');
			const listLabel = listToggle?.querySelector(".ppe__menu-toggle-label");
			const listIcon = listToggle?.querySelector(".ppe__menu-toggle-icon");
			const activeList = listContext
				? (LIST_OPTIONS.find((item) => item.listType === listContext.kind) || LIST_OPTIONS[0])
				: null;
			if (listLabel) listLabel.textContent = activeList?.label || "List";
			if (listIcon) listIcon.className = `bi ${activeList?.icon || "bi-list-ul"} ppe__menu-toggle-icon`;
			if (listToggle) listToggle.classList.toggle("is-active", Boolean(activeList));
			this.querySelectorAll(".ppe__menu-item[data-list-type]").forEach((item) => {
				item.classList.toggle("is-active", Boolean(activeList && item.dataset.listType === activeList.listType));
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
				if (!identityHtmlHasBirth(identityHtml)) {
					ensurePreviewBirth(aside);
				}
				this.#rewriteImagesForDisplay(aside);
				aside.classList.add("ppe__infobox");
				aside.setAttribute("contenteditable", "false");
				aside.setAttribute("role", "button");
				aside.setAttribute("tabindex", "0");
				aside.title = "Edit on the Identity tab";
				const note = document.createElement("p");
				note.className = "ppe__infobox-note";
				note.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i> Edit on the Identity tab';
				aside.append(note);
				const goToInfobox = () => document.dispatchEvent(
					new CustomEvent("profile-editor-activate-tab", { detail: { tab: "infobox" } }),
				);
				aside.addEventListener("click", goToInfobox);
				aside.addEventListener("keydown", (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						goToInfobox();
					}
				});
				// Float must share a containing block with the prose to wrap it.
				canvas.insertBefore(aside, prose);
			}
		}

		#includeSrc() {
			const match = this.__infoboxMarkup.match(/src=["']([^"']+)["']/i);
			const src = match ? match[1].trim() : "profile-table.html";
			return src.replace(/^\.?\//, "");
		}

		// Public: refresh the floated infobox + title from the infobox editor.
		// Called when the Article tab becomes active.
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
