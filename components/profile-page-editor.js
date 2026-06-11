/**
 * <profile-page-editor person="<id>">
 *
 * A WYSIWYG editor for a person's profile prose (people/<id>/data/profile.html).
 * It renders the page exactly as it appears live — the identity infobox floated
 * to the right with the article text wrapping around it — so editors see the
 * real layout while they type. Only the prose is editable here; the infobox is
 * read-only context (it is edited on the Infobox tab) and the page title is the
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

	const FORMAT_BUTTONS = [
		{ command: "bold", icon: "bi-type-bold", label: "Bold (Ctrl+B)", state: "bold" },
		{ command: "italic", icon: "bi-type-italic", label: "Italic (Ctrl+I)", state: "italic" },
		{ command: "underline", icon: "bi-type-underline", label: "Underline (Ctrl+U)", state: "underline" },
		{ command: "strikeThrough", icon: "bi-type-strikethrough", label: "Strikethrough", state: "strikeThrough" },
		{ separator: true },
		{ block: "h2", icon: "bi-type-h2", label: "Heading 2" },
		{ block: "h3", icon: "bi-type-h3", label: "Heading 3" },
		{ block: "p", icon: "bi-paragraph", label: "Paragraph" },
		{ separator: true },
		{ command: "insertUnorderedList", icon: "bi-list-ul", label: "Bulleted list", state: "insertUnorderedList" },
		{ command: "insertOrderedList", icon: "bi-list-ol", label: "Numbered list", state: "insertOrderedList" },
		{ separator: true },
		{ action: "link", icon: "bi-link-45deg", label: "Link" },
		{ command: "unlink", icon: "bi-link", label: "Remove link" },
		{ action: "image", icon: "bi-image", label: "Insert image" },
		{ separator: true },
		{ command: "removeFormat", icon: "bi-eraser", label: "Clear formatting" },
	];

	// Tags kept when cleaning pasted HTML; everything else is unwrapped (its text
	// is preserved) and all attributes except a couple are stripped.
	const PASTE_ALLOWED_TAGS = new Set(["P", "BR", "H2", "H3", "UL", "OL", "LI", "A", "B", "STRONG", "I", "EM", "U", "S", "BLOCKQUOTE"]);
	const PASTE_ALLOWED_ATTRS = { A: ["href"] };

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
						${FORMAT_BUTTONS.map((btn) => btn.separator
							? '<span class="ppe__toolbar-sep" aria-hidden="true"></span>'
							: `<button type="button" class="ppe__tool" data-command="${btn.command || ""}" data-block="${btn.block || ""}" data-action="${btn.action || ""}" data-state="${btn.state || ""}" aria-label="${btn.label}" title="${btn.label}"><i class="bi ${btn.icon}" aria-hidden="true"></i></button>`
						).join("")}
					</div>
					<div class="ppe__status" role="status" hidden></div>
					<div class="ppe__canvas-scroll">
						<article class="people-page__content ppe__canvas">
							<h1 class="ppe__title"></h1>
							<div class="ppe__prose" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Profile text"></div>
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
						<div class="ppe__media-panel" role="dialog" aria-label="Insert image">
							<header class="ppe__media-header">
								<h2>Insert image</h2>
								<button type="button" class="ppe__media-x" aria-label="Close" data-media-close>✕</button>
							</header>
							<div class="ppe__media-body">
								<p class="ppe__media-status">Loading images…</p>
								<div class="ppe__media-grid"></div>
								<label class="ppe__popover-label ppe__media-url-row">Or paste an image URL
									<input type="url" class="ppe__media-url" placeholder="https://…">
								</label>
								<div class="ppe__popover-actions">
									<button type="button" class="ppe__btn ppe__btn--primary ppe__media-url-insert">Insert URL</button>
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
			this.#loadExisting();
		}

		disconnectedCallback() {
			if (this.__onSelectionChange) {
				document.removeEventListener("selectionchange", this.__onSelectionChange);
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
				const button = event.target.closest(".ppe__tool");
				if (!button) return;
				this.#runCommand(button);
			});
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
					current = (document.queryCommandValue("formatBlock") || "").toLowerCase();
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
				block = (document.queryCommandValue("formatBlock") || "").toLowerCase();
			} catch (error) {
				/* ignore */
			}
			this.querySelectorAll(".ppe__tool[data-block]").forEach((btn) => {
				const b = btn.dataset.block;
				if (!b) return;
				btn.classList.toggle("is-active", b === block || (b === "p" && (block === "" || block === "div")));
			});
		}

		#onProseChanged() {
			this.dispatchEvent(new CustomEvent("profile-page-dirty-change", { bubbles: true }));
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
		}

		#openMediaModal() {
			this.#saveSelection();
			const modal = this.querySelector(".ppe__media-modal");
			modal.querySelector(".ppe__media-url").value = "";
			modal.hidden = false;
			modal.setAttribute("aria-hidden", "false");
			this.#loadMediaGrid();
		}

		#closeMediaModal() {
			const modal = this.querySelector(".ppe__media-modal");
			modal.hidden = true;
			modal.setAttribute("aria-hidden", "true");
		}

		async #loadMediaGrid() {
			const modal = this.querySelector(".ppe__media-modal");
			const grid = modal.querySelector(".ppe__media-grid");
			const status = modal.querySelector(".ppe__media-status");
			grid.innerHTML = "";
			status.hidden = false;
			status.textContent = "Loading images…";

			const images = await this.#fetchProfileImages();
			if (!images.length) {
				status.textContent = "No images for this profile yet. Add some on the Media tab, or paste a URL below.";
				return;
			}
			status.hidden = true;
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
			try {
				const base = String(window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase || "").trim();
				if (base) {
					const url = new URL("github-media.php", base.replace(/\/+$/, "") + "/");
					url.searchParams.set("person", this.__personId);
					const init = window.App?.getGitHubFetchInit?.({ cache: "no-store" }) || { credentials: "include", cache: "no-store" };
					const res = await fetch(url.href, init);
					const payload = await res.json().catch(() => null);
					if (res.ok && payload?.ok) {
						return (payload.images || [])
							.map((img) => ({
								name: String(img?.name || ""),
								url: String(img?.download_url || "") || this.#resolveImageUrl(`images/${img?.name || ""}`),
							}))
							.filter((img) => img.name);
					}
				}
			} catch (error) {
				/* fall through to empty */
			}
			return [];
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
			try {
				const url = resolveSiteUrl(`people/${this.__personId}/data/profile.html`);
				const response = await fetch(url, { cache: "no-store" });
				if (response.ok) {
					parsed = parseProfileFragment(await response.text());
				}
			} catch (error) {
				console.warn("Could not load profile.html", error);
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
			}
			this.__savedProse = this.#getProseHtml();

			await this.#renderInfobox();
			this.#setStatus("");
		}

		#resolveImageUrl(src) {
			if (!src || /^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return src;
			return resolveSiteUrl(`people/${this.__personId}/data/${src.replace(/^\.?\//, "")}`);
		}

		#rewriteImagesForDisplay(root, { track = false } = {}) {
			root.querySelectorAll("img[src]").forEach((img) => {
				const src = img.getAttribute("src");
				if (!src || /^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return;
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

			const infoboxEl = document.querySelector("profile-infobox-editor");
			if (infoboxEl && typeof infoboxEl.getIdentityFragmentHtml === "function") {
				try {
					aside = renderIdentityAside(infoboxEl.getIdentityFragmentHtml());
				} catch (error) {
					aside = null;
				}
			}

			if (!aside) {
				if (this.__infoboxIsInclude) {
					const src = this.#includeSrc();
					if (src) {
						try {
							const url = resolveSiteUrl(`people/${this.__personId}/data/${src}`);
							const response = await fetch(url, { cache: "no-store" });
							if (response.ok) aside = renderIdentityAside(await response.text());
						} catch (error) {
							// fall through
						}
					}
				} else if (this.__infoboxMarkup) {
					aside = renderIdentityAside(this.__infoboxMarkup);
				}
			}

			canvas.querySelector("aside.ppe__infobox")?.remove();
			if (aside) {
				this.#rewriteImagesForDisplay(aside);
				aside.classList.add("ppe__infobox");
				aside.setAttribute("contenteditable", "false");
				aside.setAttribute("role", "button");
				aside.setAttribute("tabindex", "0");
				aside.title = "Edit on the Infobox tab";
				const note = document.createElement("p");
				note.className = "ppe__infobox-note";
				note.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i> Edit on the Infobox tab';
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
		// Called when the Profile page tab becomes active.
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
		// profile that had no infobox just gained one on the Infobox tab.
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
