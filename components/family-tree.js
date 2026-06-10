/**
 * <family-tree> — an interactive, pan/zoom GEDCOM family-tree viewer rendered
 * inline on the profile Tree tab.
 *
 * It is fully self-contained: the markup, styles and bootstrap-icons stylesheet
 * are injected into a shadow root so nothing leaks into (or is affected by) the
 * host page. The GEDCOM parsing library (window.AppGedcom) is loaded on demand.
 *
 * Attributes:
 *   ged    — URL of the GEDCOM file to render (absolute, or resolved against the
 *            current page).
 *   person — a Genepedia profile id (or GEDCOM xref) to open centred/selected.
 *   theme  — "light" | "dark" (falls back to the site/OS theme).
 */
(function () {
	"use strict";

	const CONFIG = {
		nodeWidth: 260,
		nodeHeight: 96,
		partnerGap: 28,
		siblingGap: 70,
		generationGap: 170,
		padding: 80,
		minScale: 0.2,
		maxScale: 2.8,
	};

	const BOOTSTRAP_ICONS_HREF =
		"https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css";

	// Resolve a site-root-relative path. Prefer the shared site helper (present on
	// every page that loads site-info.js); otherwise fall back to walking up from
	// the current profile page (…/people/<id>/profile.html → site root).
	function resolveSitePath(path) {
		const cleanPath = String(path || "").replace(/^\/+/, "");
		if (window.App?.resolveSiteUrl) return window.App.resolveSiteUrl(cleanPath);
		return new URL(`../../${cleanPath}`, window.location.href).href;
	}

	// Load lib/gedcom.js once (it defines the global window.AppGedcom). The
	// profile page doesn't include it, so the component pulls it in on demand.
	let gedcomLibPromise = null;
	function ensureGedcomLibrary() {
		if (window.AppGedcom && typeof window.AppGedcom.loadTreeData === "function") {
			return Promise.resolve();
		}
		if (gedcomLibPromise) return gedcomLibPromise;

		gedcomLibPromise = new Promise((resolve, reject) => {
			const existing = document.querySelector("script[data-app-gedcom]");
			if (existing) {
				if (window.AppGedcom) {
					resolve();
					return;
				}
				existing.addEventListener("load", () => resolve());
				existing.addEventListener("error", () => reject(new Error("Could not load the GEDCOM library.")));
				return;
			}

			const script = document.createElement("script");
			script.src = resolveSitePath("lib/gedcom.js");
			script.dataset.appGedcom = "1";
			script.addEventListener("load", () => resolve());
			script.addEventListener("error", () => reject(new Error("Could not load the GEDCOM library.")));
			document.head.appendChild(script);
		});
		return gedcomLibPromise;
	}

	async function loadTreeData(url) {
		const api = window.AppGedcom;
		if (!api || typeof api.loadTreeData !== "function") {
			throw new Error("The GEDCOM library (window.AppGedcom) is not available.");
		}
		return api.loadTreeData(url);
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function byId(list) {
		const map = new Map();
		for (const item of list) map.set(item.id, item);
		return map;
	}

	function formatDates(person) {
		const born = person.birthDate || (typeof person.born === "number" ? String(person.born) : "");
		const died = person.deathDate || (typeof person.died === "number" ? String(person.died) : "");
		if (!born && !died) return "";
		return `(${born} - ${died})`;
	}

	function normalizeGender(gender) {
		if (gender === "M" || gender === "F") return gender;
		return "U";
	}

	function surnameFromName(name) {
		const parts = String(name)
			.replace(/\s+/g, " ")
			.trim()
			.split(" ")
			.filter(Boolean);
		if (parts.length === 0) return "";
		return parts[parts.length - 1];
	}

	function formatDisplayName(person) {
		if (!person) return "";
		const base = String(person.name ?? person.id ?? "");
		const gender = normalizeGender(person.gender);
		if (gender !== "F") return base;

		const birthSurname = typeof person.birthSurname === "string" ? person.birthSurname.trim() : "";
		if (!birthSurname) return base;
		const currentSurname = surnameFromName(base);
		if (!currentSurname) return base;
		if (currentSurname.toLowerCase() === birthSurname.toLowerCase()) return base;
		return `${base} (${birthSurname})`;
	}

	function buildIndexes(data) {
		const peopleById = byId(data.people);
		const unionsById = byId(data.unions);
		const unionsByPartner = new Map();
		const parentUnionsByChild = new Map();

		for (const union of data.unions) {
			for (const partnerId of union.partners) {
				if (!unionsByPartner.has(partnerId)) unionsByPartner.set(partnerId, []);
				unionsByPartner.get(partnerId).push(union.id);
			}

			for (const childId of union.children ?? []) {
				if (!parentUnionsByChild.has(childId)) parentUnionsByChild.set(childId, []);
				parentUnionsByChild.get(childId).push(union.id);
			}
		}

		return { peopleById, unionsById, unionsByPartner, parentUnionsByChild };
	}

	function pickSingleUnionForPerson(personId, indexes, opts = {}) {
		const excludeUnionId = opts.excludeUnionId;
		const unionIds = indexes.unionsByPartner.get(personId) ?? [];

		// If a person has multiple unions (e.g. multiple marriages), prefer the most
		// recently-added union. This keeps spouse selection stable when re-rooting.
		for (let i = unionIds.length - 1; i >= 0; i -= 1) {
			const id = unionIds[i];
			if (id !== excludeUnionId) return id;
		}
		return null;
	}

	function createLayoutEngine(data, indexes) {
		const widthMemo = new Map();
		const clusterMemo = new Map();

		function getUnionCluster(primaryUnionId) {
			if (clusterMemo.has(primaryUnionId)) return clusterMemo.get(primaryUnionId);
			const primary = indexes.unionsById.get(primaryUnionId);
			if (!primary) {
				const empty = {
					unionIds: [primaryUnionId],
					partnerIds: [],
					childIds: [],
				};
				clusterMemo.set(primaryUnionId, empty);
				return empty;
			}

			// Cluster = primary union plus any unions for the primary union's partners.
			// This is what enables multi-partner display (e.g. show all spouses for Leslie).
			const unionIds = [];
			const seenUnionIds = new Set();
			const pushUnionId = (id) => {
				if (!id || seenUnionIds.has(id)) return;
				seenUnionIds.add(id);
				unionIds.push(id);
			};
			pushUnionId(primaryUnionId);
			for (const partnerId of primary.partners ?? []) {
				const ids = indexes.unionsByPartner.get(partnerId) ?? [];
				for (const id of ids) pushUnionId(id);
			}

			const partnerIds = [];
			const seenPartnerIds = new Set();
			const pushPartnerId = (id) => {
				if (!id || seenPartnerIds.has(id)) return;
				seenPartnerIds.add(id);
				partnerIds.push(id);
			};
			for (const id of primary.partners ?? []) pushPartnerId(id);
			for (const unionId of unionIds) {
				const union = indexes.unionsById.get(unionId);
				for (const id of union?.partners ?? []) pushPartnerId(id);
			}

			const childIds = [];
			const seenChildIds = new Set();
			const pushChildId = (id) => {
				if (!id || seenChildIds.has(id)) return;
				seenChildIds.add(id);
				childIds.push(id);
			};
			for (const id of primary.children ?? []) pushChildId(id);
			for (const unionId of unionIds) {
				if (unionId === primaryUnionId) continue;
				const union = indexes.unionsById.get(unionId);
				for (const id of union?.children ?? []) pushChildId(id);
			}

			const cluster = { unionIds, partnerIds, childIds };
			clusterMemo.set(primaryUnionId, cluster);
			return cluster;
		}

		function measureUnion(unionId, stack = new Set()) {
			if (widthMemo.has(unionId)) return widthMemo.get(unionId);
			const union = indexes.unionsById.get(unionId);
			if (!union) return CONFIG.nodeWidth;
			const cluster = getUnionCluster(unionId);

			const partnersWidth =
				cluster.partnerIds.length * CONFIG.nodeWidth +
				Math.max(0, cluster.partnerIds.length - 1) * CONFIG.partnerGap;

			if (stack.has(unionId)) {
				return partnersWidth;
			}

			stack.add(unionId);

			const childIds = cluster.childIds;
			const childGroups = childIds.map((childId) => {
				const childUnionId = pickSingleUnionForPerson(childId, indexes);
				if (childUnionId) {
					return {
						type: "union",
						id: childUnionId,
						width: measureUnion(childUnionId, stack),
					};
				}
				return { type: "person", id: childId, width: CONFIG.nodeWidth };
			});

			const childrenWidth =
				childGroups.length === 0
					? 0
					: childGroups.reduce((sum, g) => sum + g.width, 0) +
					Math.max(0, childGroups.length - 1) * CONFIG.siblingGap;

			const unionWidth = Math.max(partnersWidth, childrenWidth);
			widthMemo.set(unionId, unionWidth);
			stack.delete(unionId);
			return unionWidth;
		}

		function layout(rootUnionId) {
			const positions = {
				people: new Map(),
				unions: new Map(),
			};

			const edges = [];

			function layoutUnion(unionId, xLeft, depth, stack = new Set()) {
				if (stack.has(unionId)) return;
				const union = indexes.unionsById.get(unionId);
				if (!union) return;
				const cluster = getUnionCluster(unionId);

				stack.add(unionId);

				const unionWidth = measureUnion(unionId);
				const centerX = xLeft + unionWidth / 2;
				const y = CONFIG.padding + depth * CONFIG.generationGap;

				const partnersWidth =
					cluster.partnerIds.length * CONFIG.nodeWidth +
					Math.max(0, cluster.partnerIds.length - 1) * CONFIG.partnerGap;
				const partnersLeft = centerX - partnersWidth / 2;

				for (let idx = 0; idx < cluster.partnerIds.length; idx += 1) {
					const personId = cluster.partnerIds[idx];
					const x =
						partnersLeft + idx * (CONFIG.nodeWidth + CONFIG.partnerGap) + CONFIG.nodeWidth / 2;
					positions.people.set(personId, { x, y });
				}

				const unionLineY = y + CONFIG.nodeHeight / 2 + 18;
				for (const clusterUnionId of cluster.unionIds) {
					const u = indexes.unionsById.get(clusterUnionId);
					if (!u) continue;
					const partnerXs = (u.partners ?? [])
						.filter((pid) => positions.people.has(pid))
						.map((pid) => positions.people.get(pid).x);
					if (partnerXs.length === 0) continue;
					const minX = Math.min(...partnerXs);
					const maxX = Math.max(...partnerXs);
					positions.unions.set(clusterUnionId, { x: (minX + maxX) / 2, y: unionLineY });
				}

				const childIds = cluster.childIds;
				if (childIds.length === 0) {
					stack.delete(unionId);
					return;
				}

				const childToParentUnionIds = new Map();
				for (const clusterUnionId of cluster.unionIds) {
					const u = indexes.unionsById.get(clusterUnionId);
					if (!u) continue;
					for (const childId of u.children ?? []) {
						if (!childToParentUnionIds.has(childId)) childToParentUnionIds.set(childId, []);
						childToParentUnionIds.get(childId).push(clusterUnionId);
					}
				}
				const edgeKeys = new Set();
				const pushEdge = (fromUnionId, toPersonId) => {
					const key = `${fromUnionId}|${toPersonId}`;
					if (edgeKeys.has(key)) return;
					edgeKeys.add(key);
					edges.push({ fromUnionId, toPersonId });
				};

				const childGroups = childIds.map((childId) => {
					const childUnionId = pickSingleUnionForPerson(childId, indexes);
					if (childUnionId) {
						return {
							type: "union",
							childId,
							id: childUnionId,
							width: measureUnion(childUnionId),
						};
					}
					return { type: "person", childId, id: childId, width: CONFIG.nodeWidth };
				});

				const totalChildrenWidth =
					childGroups.reduce((sum, g) => sum + g.width, 0) +
					Math.max(0, childGroups.length - 1) * CONFIG.siblingGap;

				let cursorX = centerX - totalChildrenWidth / 2;
				for (const group of childGroups) {
					if (group.type === "person") {
						const childCenterX = cursorX + group.width / 2;
						positions.people.set(group.id, { x: childCenterX, y: y + CONFIG.generationGap });
					} else {
						layoutUnion(group.id, cursorX, depth + 1, stack);
					}

					const parentUnionIds = childToParentUnionIds.get(group.childId) ?? [];
					for (const parentUnionId of parentUnionIds) {
						pushEdge(parentUnionId, group.childId);
					}
					cursorX += group.width + CONFIG.siblingGap;
				}

				stack.delete(unionId);
			}

			const rootWidth = measureUnion(rootUnionId);
			layoutUnion(rootUnionId, CONFIG.padding, 0, new Set());

			// Normalize all positions into a positive coordinate space with padding.
			const bbox = computeBBox(positions.people);
			const offsetX = CONFIG.padding - bbox.minX;
			const offsetY = CONFIG.padding - bbox.minY;
			for (const [id, pos] of positions.people.entries()) {
				positions.people.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
			}
			for (const [id, pos] of positions.unions.entries()) {
				positions.unions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
			}

			const bbox2 = computeBBox(positions.people);
			const sceneWidth = Math.max(rootWidth + CONFIG.padding * 2, bbox2.maxX + CONFIG.padding);
			const sceneHeight = bbox2.maxY + CONFIG.padding;

			return {
				positions,
				edges,
				sceneSize: { width: sceneWidth, height: sceneHeight },
			};
		}

		return { layout };
	}

	function computeBBox(peoplePositions) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const pos of peoplePositions.values()) {
			minX = Math.min(minX, pos.x - CONFIG.nodeWidth / 2);
			maxX = Math.max(maxX, pos.x + CONFIG.nodeWidth / 2);
			minY = Math.min(minY, pos.y - CONFIG.nodeHeight / 2);
			maxY = Math.max(maxY, pos.y + CONFIG.nodeHeight / 2);
		}

		if (!Number.isFinite(minX)) {
			minX = 0;
			minY = 0;
			maxX = 0;
			maxY = 0;
		}

		return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
	}

	function el(tag, className) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		return node;
	}

	function initialsFromName(name) {
		const words = String(name)
			.trim()
			.split(/\s+/g)
			.filter(Boolean);
		if (words.length === 0) return "?";
		if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
		return (words[0][0] + words[words.length - 1][0]).toUpperCase();
	}

	function createBiIcon(name, extraClass) {
		const icon = document.createElement("i");
		icon.className = `bi bi-${name}${extraClass ? ` ${extraClass}` : ""}`;
		icon.setAttribute("aria-hidden", "true");
		return icon;
	}

	function render({
		data,
		indexes,
		layoutResult,
		viewport,
		scene,
		svg,
		nodesRoot,
		onSelect,
		onEdit,
		onAdd,
		onTree,
	}) {
		const { peopleById } = indexes;
		const { positions, edges, sceneSize } = layoutResult;

		// Size the scene and SVG.
		scene.style.width = `${sceneSize.width}px`;
		scene.style.height = `${sceneSize.height}px`;
		svg.setAttribute("width", String(sceneSize.width));
		svg.setAttribute("height", String(sceneSize.height));
		svg.setAttribute("viewBox", `0 0 ${sceneSize.width} ${sceneSize.height}`);

		// Clear old.
		nodesRoot.replaceChildren();
		while (svg.firstChild) svg.removeChild(svg.firstChild);

		let selectedPersonId = null;
		function setSelected(personId, opts = {}) {
			selectedPersonId = personId;
			for (const node of nodesRoot.querySelectorAll(".node")) {
				node.classList.toggle("node--selected", node.dataset.personId === selectedPersonId);
			}
			onSelect?.(selectedPersonId, opts);
		}

		const visiblePersonIds = new Set(positions.people.keys());

		// Render nodes.
		for (const [personId, pos] of positions.people.entries()) {
			const person = peopleById.get(personId) ?? { id: personId, name: personId };
			const gender = normalizeGender(person.gender);
			const displayName = formatDisplayName(person) || personId;

			const hiddenImmediateFamilyIds = (() => {
				// "Immediate family" for the Tree button means: parents or siblings.
				// The Tree button is only shown if at least one of those relatives is NOT
				// currently visible in the viewport.
				const ids = new Set();
				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				for (const uid of parentUnionIds) {
					const union = indexes.unionsById.get(uid);
					if (!union) continue;
					for (const pid of union.partners ?? []) {
						if (pid) ids.add(pid);
					}
					for (const cid of union.children ?? []) {
						if (cid && cid !== personId) ids.add(cid);
					}
				}

				return [...ids].filter((id) => !visiblePersonIds.has(id));
			})();
			const hasImmediateFamilyToShow = hiddenImmediateFamilyIds.length > 0;

			const node = el("div", "node");
			node.dataset.personId = personId;
			node.dataset.gender = gender;
			node.style.left = `${pos.x}px`;
			node.style.top = `${pos.y}px`;
			node.tabIndex = 0;
			node.setAttribute("role", "button");
			node.setAttribute("aria-label", displayName);

			const avatar = el("div", "node__avatar");
			if (person.photoUrl) {
				const img = document.createElement("img");
				img.decoding = "async";
				img.loading = "lazy";
				img.alt = "";
				img.src = person.photoUrl;
				avatar.appendChild(img);
			} else {
				avatar.appendChild(createBiIcon("person-circle", "node__avatar-icon"));
			}

			const content = el("div", "node__content");
			// When the person has a Genepedia profile, their name is a link to it;
			// otherwise it stays plain text.
			const genepediaId = String(person.genepediaId ?? "").trim();
			let name;
			if (genepediaId) {
				name = document.createElement("a");
				name.className = "node__name";
				name.href = resolveSitePath(`people/${encodeURIComponent(genepediaId)}/profile.html`);
				name.addEventListener("click", (e) => {
					// Let the link navigate; don't also trigger node selection.
					e.stopPropagation();
				});
			} else {
				name = el("div", "node__name");
			}
			name.textContent = displayName;

			const datesText = formatDates(person);
			const meta = el("div", "node__meta");
			meta.textContent = datesText || " ";

			const actions = el("div", "node__actions");

			let treeAction = null;
			if (hasImmediateFamilyToShow) {
				treeAction = document.createElement("button");
				treeAction.type = "button";
				treeAction.className = "icon-button node__tree-action";
				treeAction.setAttribute("aria-label", "Open tree");
				treeAction.setAttribute("data-tooltip", "Tree");
				treeAction.appendChild(createBiIcon("diagram-3"));
				treeAction.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					onTree?.({ personId });
				});
			}

			const editAction = document.createElement("button");
			editAction.type = "button";
			editAction.className = "icon-button";
			editAction.setAttribute("aria-label", "Edit person");
			editAction.setAttribute("data-tooltip", "Edit");
			editAction.appendChild(createBiIcon("pencil"));
			editAction.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				setSelected(personId, { source: "action" });
				onEdit?.({ personId, anchorEl: editAction });
			});

			const addAction = document.createElement("button");
			addAction.type = "button";
			addAction.className = "icon-button";
			addAction.setAttribute("aria-label", "Add relative");
			addAction.setAttribute("data-tooltip", "Add");
			addAction.appendChild(createBiIcon("plus-lg"));
			addAction.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				setSelected(personId, { source: "action" });
				onAdd?.({ personId, anchorEl: addAction });
			});

			// Order: Tree, Edit, Add (Tree omitted if nothing new to show)
			if (treeAction) actions.append(treeAction);
			actions.append(editAction, addAction);

			content.append(name, meta);
			node.append(avatar, content, actions);
			node.addEventListener("click", (e) => {
				e.stopPropagation();
				setSelected(personId, { source: "node" });
			});
			node.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setSelected(personId, { source: "node" });
				}
			});
			nodesRoot.append(node);
		}

		const makePath = (d) => {
			const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
			p.setAttribute("d", d);
			return p;
		};

		// Spouse/union lines.
		for (const union of data.unions) {
			const anchor = positions.unions.get(union.id);
			if (!anchor) continue;

			const partners = union.partners.filter((pid) => positions.people.has(pid));
			if (partners.length === 0) continue;

			const xs = partners
				.map((pid) => positions.people.get(pid).x)
				.slice()
				.sort((a, b) => a - b);

			for (const pid of partners) {
				const pPos = positions.people.get(pid);
				const bottomY = pPos.y + CONFIG.nodeHeight / 2;
				svg.appendChild(makePath(`M ${pPos.x} ${bottomY} L ${pPos.x} ${anchor.y}`));
			}

			if (xs.length > 1) {
				svg.appendChild(makePath(`M ${xs[0]} ${anchor.y} L ${xs[xs.length - 1]} ${anchor.y}`));
			}
		}

		// Parent->child connectors.
		for (const edge of edges) {
			const from = positions.unions.get(edge.fromUnionId);
			const to = positions.people.get(edge.toPersonId);
			if (!from || !to) continue;

			const endY = to.y - CONFIG.nodeHeight / 2;
			const midY = from.y + (endY - from.y) * 0.5;
			const d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`;
			svg.appendChild(makePath(d));
		}

		const contentBbox = computeBBox(positions.people);
		return { setSelected, getContentBbox: () => contentBbox };
	}

	function createPanZoom({ viewport, scene, onChange }) {
		const state = { x: 0, y: 0, scale: 1 };
		const DRAG_THRESHOLD_PX = 6;
		const dragThresholdSq = DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

		function apply() {
			scene.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
			onChange?.({ ...state });
		}

		function setTransform(next) {
			state.x = next.x;
			state.y = next.y;
			state.scale = next.scale;
			apply();
		}

		function zoomAbout({ scale, clientX, clientY }) {
			const rect = viewport.getBoundingClientRect();
			const px = clientX - rect.left;
			const py = clientY - rect.top;
			const prevScale = state.scale;
			const nextScale = clamp(scale, CONFIG.minScale, CONFIG.maxScale);

			const sx = (px - state.x) / prevScale;
			const sy = (py - state.y) / prevScale;
			const nextX = px - sx * nextScale;
			const nextY = py - sy * nextScale;

			setTransform({ x: nextX, y: nextY, scale: nextScale });
		}

		let isPanning = false;
		let panStart = null;
		let panMoved = false;
		let suppressNextClick = false;

		viewport.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if (e.target && e.target.closest && e.target.closest(".node")) return;
			suppressNextClick = false;
			isPanning = true;
			panMoved = false;
			panStart = { x: e.clientX, y: e.clientY, startX: state.x, startY: state.y };
			viewport.setPointerCapture(e.pointerId);
		});

		viewport.addEventListener("pointermove", (e) => {
			if (!isPanning || !panStart) return;
			const dx = e.clientX - panStart.x;
			const dy = e.clientY - panStart.y;

			if (!panMoved) {
				const distSq = dx * dx + dy * dy;
				if (distSq < dragThresholdSq) return;
				panMoved = true;
			}

			setTransform({ x: panStart.startX + dx, y: panStart.startY + dy, scale: state.scale });
		});

		viewport.addEventListener("pointerup", () => {
			if (isPanning && panMoved) suppressNextClick = true;
			isPanning = false;
			panStart = null;
			panMoved = false;
		});

		viewport.addEventListener("pointercancel", () => {
			isPanning = false;
			panStart = null;
			panMoved = false;
		});

		viewport.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				const factor = Math.exp(-e.deltaY * 0.001);
				zoomAbout({ scale: state.scale * factor, clientX: e.clientX, clientY: e.clientY });
			},
			{ passive: false }
		);

		apply();
		return {
			consumeClickSuppression: () => {
				const value = suppressNextClick;
				suppressNextClick = false;
				return value;
			},
			get: () => ({ ...state }),
			set: (next) => setTransform(next),
			zoomIn: () => {
				const rect = viewport.getBoundingClientRect();
				zoomAbout({
					scale: state.scale * 1.15,
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2,
				});
			},
			zoomOut: () => {
				const rect = viewport.getBoundingClientRect();
				zoomAbout({
					scale: state.scale / 1.15,
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2,
				});
			},
			reset: () => setTransform({ x: 0, y: 0, scale: 1 }),
			zoomAbout,
		};
	}

	function fitToTransform({ viewport, contentBbox, padding = 24 }) {
		const vw = viewport.clientWidth;
		const vh = viewport.clientHeight;
		if (vw <= 0 || vh <= 0) return { x: 0, y: 0, scale: 1 };

		const bboxW = Math.max(1, contentBbox.width + padding * 2);
		const bboxH = Math.max(1, contentBbox.height + padding * 2);
		const scale = clamp(Math.min(vw / bboxW, vh / bboxH), CONFIG.minScale, 1.6);

		const cx = (contentBbox.minX + contentBbox.maxX) / 2;
		const cy = (contentBbox.minY + contentBbox.maxY) / 2;
		const x = vw / 2 - cx * scale;
		const y = vh / 2 - cy * scale;

		return { x, y, scale };
	}

	function escapeXml(text) {
		return String(text)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&apos;");
	}

	function downloadBlob(filename, blob) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function buildExportSvg({ data, indexes, layoutResult }) {
		const { peopleById } = indexes;
		const { positions, edges, sceneSize } = layoutResult;

		const width = Math.max(1, Math.ceil(sceneSize.width));
		const height = Math.max(1, Math.ceil(sceneSize.height));

		const fontFamily =
			"system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji";

		const parts = [];
		parts.push('<?xml version="1.0" encoding="UTF-8"?>');
		parts.push(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		);
		parts.push(
			"<style><![CDATA[" +
			`.link{stroke:#000;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:.45}` +
			`.node-rect{stroke:#666}` +
			`.node-rect--M{fill:#e8f1ff}` +
			`.node-rect--F{fill:#ffe8f3}` +
			`.node-rect--U{fill:#f2f2f2}` +
			`.avatar-divider{stroke:#666}` +
			`.avatar-text{font:700 16px ${fontFamily};fill:#000;opacity:.85}` +
			`.node-name{font:650 14px ${fontFamily};fill:#000}` +
			`.node-meta{font:12px ${fontFamily};fill:#000;opacity:.75}` +
			"]]></style>",
		);
		parts.push('<rect width="100%" height="100%" fill="#fff"/>');

		const linkPath = (d) => `<path class="link" d="${d}"/>`;

		// Spouse/union lines.
		for (const union of data.unions) {
			const anchor = positions.unions.get(union.id);
			if (!anchor) continue;

			const partners = union.partners.filter((pid) => positions.people.has(pid));
			if (partners.length === 0) continue;

			const xs = partners
				.map((pid) => positions.people.get(pid).x)
				.slice()
				.sort((a, b) => a - b);

			for (const pid of partners) {
				const pPos = positions.people.get(pid);
				const bottomY = pPos.y + CONFIG.nodeHeight / 2;
				parts.push(linkPath(`M ${pPos.x} ${bottomY} L ${pPos.x} ${anchor.y}`));
			}

			if (xs.length > 1) {
				parts.push(linkPath(`M ${xs[0]} ${anchor.y} L ${xs[xs.length - 1]} ${anchor.y}`));
			}
		}

		// Parent->child connectors.
		for (const edge of edges) {
			const from = positions.unions.get(edge.fromUnionId);
			const to = positions.people.get(edge.toPersonId);
			if (!from || !to) continue;

			const endY = to.y - CONFIG.nodeHeight / 2;
			const midY = from.y + (endY - from.y) * 0.5;
			const d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`;
			parts.push(linkPath(d));
		}

		// Nodes.
		for (const [personId, pos] of positions.people.entries()) {
			const person = peopleById.get(personId) ?? { id: personId, name: personId };
			const gender = normalizeGender(person.gender);
			const metaText = formatDates(person);
			const displayName = formatDisplayName(person) || personId;
			const x = pos.x;
			const y = pos.y;

			const rectX = -CONFIG.nodeWidth / 2;
			const rectY = -CONFIG.nodeHeight / 2;
			const avatarW = CONFIG.nodeHeight;
			const dividerX = rectX + avatarW;
			const nameX = dividerX + 10;
			const nameY = rectY + 26;
			const metaY = rectY + 52;

			parts.push(`<g transform="translate(${x} ${y})">`);
			parts.push(
				`<rect class="node-rect node-rect--${gender}" x="${rectX}" y="${rectY}" width="${CONFIG.nodeWidth}" height="${CONFIG.nodeHeight}" rx="0" ry="0"/>`,
			);
			parts.push(
				`<line class="avatar-divider" x1="${dividerX}" y1="${rectY}" x2="${dividerX}" y2="${rectY + CONFIG.nodeHeight}"/>`,
			);
			parts.push(
				`<text class="avatar-text" x="${rectX + avatarW / 2}" y="0" text-anchor="middle" dominant-baseline="central">${escapeXml(initialsFromName(person.name))}</text>`,
			);
			parts.push(`<text class="node-name" x="${nameX}" y="${nameY}">${escapeXml(displayName)}</text>`);
			if (metaText) {
				parts.push(`<text class="node-meta" x="${nameX}" y="${metaY}">${escapeXml(metaText)}</text>`);
			}
			parts.push("</g>");
		}

		parts.push("</svg>");
		return { svg: parts.join("\n"), width, height };
	}

	async function svgToPngBlob({ svg, width, height, scale = 2 }) {
		const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
		const url = URL.createObjectURL(svgBlob);

		try {
			const img = new Image();
			img.decoding = "async";
			const loaded = new Promise((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
			});
			img.src = url;
			await loaded;

			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.floor(width * scale));
			canvas.height = Math.max(1, Math.floor(height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Canvas 2D context unavailable");
			ctx.setTransform(scale, 0, 0, scale, 0, 0);
			ctx.drawImage(img, 0, 0);

			const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
			if (!blob) throw new Error("PNG export failed");
			return blob;
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	const TREE_CSS = `
:host {
	--node-w: 260px;
	--node-h: 96px;
	--sidebar-w: 320px;
	--node-ui-gap: 4px;

	--gender-male-bg: rgba(13, 110, 253, 0.10);
	--gender-female-bg: rgba(214, 51, 132, 0.10);
	--gender-unknown-bg: rgba(0, 0, 0, 0.04);
	--gender-male-bg: color-mix(in srgb, Canvas 88%, #0d6efd 12%);
	--gender-female-bg: color-mix(in srgb, Canvas 88%, #d63384 12%);
	--gender-unknown-bg: color-mix(in srgb, Canvas 92%, GrayText 8%);

	/* Chrome colour tokens mirror the site header so the toolbar controls match
	   the header notification button and search box exactly. Dark is the default;
	   :host([data-theme="light"]) flips to light. */
	--tree-chrome-fg: #eaecf0;
	--tree-chrome-btn-border: rgba(255, 255, 255, 0.2);
	--tree-chrome-btn-bg: rgba(255, 255, 255, 0.04);
	--tree-chrome-btn-hover: rgba(255, 255, 255, 0.08);
	--tree-chrome-search-bg: #1e2125;
	--tree-chrome-search-border: rgba(255, 255, 255, 0.08);
	--tree-chrome-search-icon: #c8ccd1;

	display: block;
	height: 100%;
	overflow: hidden;
	background: transparent;
	color: CanvasText;
	font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans,
		"Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

:host([data-theme="light"]) {
	--tree-chrome-fg: #202122;
	--tree-chrome-btn-border: rgba(0, 0, 0, 0.14);
	--tree-chrome-btn-bg: rgba(0, 0, 0, 0.03);
	--tree-chrome-btn-hover: rgba(0, 0, 0, 0.06);
	--tree-chrome-search-bg: #f8f9fa;
	--tree-chrome-search-border: rgba(0, 0, 0, 0.12);
	--tree-chrome-search-icon: #72777d;
}

* {
	box-sizing: border-box;
}

#app {
	height: 100%;
	display: grid;
	grid-template-rows: auto 1fr;
	min-height: 0;
	min-width: 0;
}

.main {
	min-height: 0;
	min-width: 0;
	display: grid;
	grid-template-columns: 1fr;
}

.main--sidebar {
	grid-template-columns: 1fr var(--sidebar-w);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-bottom: 0;
}

.toolbar__right {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}

/* Toolbar action buttons match the header notification button. */
.toolbar__right .icon-button {
	width: 39px;
	height: 39px;
	border: 1px solid var(--tree-chrome-btn-border);
	border-radius: 2px;
	background: var(--tree-chrome-btn-bg);
	color: var(--tree-chrome-fg);
}

.toolbar__right .icon-button i {
	font-size: 16.5px;
}

.toolbar__right .icon-button:hover {
	background: var(--tree-chrome-btn-hover);
}

.toolbar__stats {
	font-size: 12px;
	opacity: 0.75;
	white-space: nowrap;
	align-self: center;
}

.tree-search {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	height: 39px;
	padding-left: 0.75em;
	border: 1px solid var(--tree-chrome-search-border);
	border-radius: 2px;
	background: var(--tree-chrome-search-bg);
	color: var(--tree-chrome-fg);
}

.tree-search:focus-within {
	border-color: color-mix(in srgb, var(--tree-chrome-fg) 35%, transparent);
}

.tree-search__icon {
	color: var(--tree-chrome-search-icon);
}

.tree-search__input {
	border: 0;
	outline: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	padding: 6px 10px 6px 0;
	width: 240px;
	min-width: 140px;
}

.tree-search__results {
	position: absolute;
	top: calc(100% + 8px);
	left: -1px;
	right: -1px;
	z-index: 1200;
	border: 1px solid GrayText;
	background: Canvas;
	padding: 8px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-height: 320px;
	overflow: auto;
}

.tree-search__results--hidden {
	display: none;
}

.tree-search__result {
	width: 100%;
	text-align: left;
	border-radius: 0;
	border: 1px solid GrayText;
	background: var(--gender-unknown-bg);
	padding: 10px 10px;
	font-weight: 650;
	cursor: pointer;
}

.tree-search__result[data-gender="M"] {
	background: var(--gender-male-bg);
}

.tree-search__result[data-gender="F"] {
	background: var(--gender-female-bg);
}

.tree-search__result[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.tree-search__result:hover {
	border-color: Highlight;
}

.tree-search__result:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

button {
	appearance: none;
	border: 1px solid GrayText;
	background: Canvas;
	color: CanvasText;
	border-radius: 0;
	padding: 6px 10px;
	cursor: pointer;
}

.icon-button {
	width: 32px;
	height: 32px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	box-sizing: border-box;
	font-size: 0;
}

.icon-button i {
	width: 16px;
	height: 16px;
	display: grid;
	place-items: center;
	font-size: 16px;
	line-height: 1;
	margin: 0;
	padding: 0;
	font-style: normal;
}

.icon-button i::before {
	display: block;
	line-height: 1;
}

button:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

button:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

/* Tooltip for buttons with data-tooltip */
[data-tooltip] {
	position: relative;
}

[data-tooltip]::after {
	content: attr(data-tooltip);
	position: absolute;
	bottom: calc(100% + 6px);
	left: 50%;
	transform: translateX(-50%);
	padding: 4px 8px;
	font-size: 12px;
	line-height: 1;
	white-space: nowrap;
	background: Canvas;
	color: CanvasText;
	border: 1px solid GrayText;
	pointer-events: none;
	opacity: 0;
	visibility: hidden;
	transition: opacity 0.15s ease, visibility 0.15s ease;
	z-index: 10;
}

[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after {
	opacity: 1;
	visibility: visible;
}

/* Toolbar sits at the very top of the (overflow-hidden) viewer, so its
   tooltips must drop below the button instead of being clipped above. */
.toolbar [data-tooltip]::after {
	bottom: auto;
	top: calc(100% + 6px);
}

.viewport {
	position: relative;
	overflow: hidden;
	touch-action: none;
	min-width: 0;
}

.viewport:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: -2px;
}

.scene {
	position: absolute;
	left: 0;
	top: 0;
	transform-origin: 0 0;
	color: CanvasText;
}

.links {
	position: absolute;
	left: 0;
	top: 0;
	overflow: visible;
	pointer-events: none;
}

.links path {
	stroke: currentColor;
	stroke-width: 2;
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.45;
}

.nodes {
	position: absolute;
	left: 0;
	top: 0;
}

.node {
	position: absolute;
	width: var(--node-w);
	height: var(--node-h);
	transform: translate(-50%, -50%);
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	grid-template-rows: 1fr auto;
	column-gap: var(--node-ui-gap);
	row-gap: var(--node-ui-gap);
	border: 1px solid GrayText;
	border-radius: 0;
	background: var(--gender-unknown-bg);
	color: CanvasText;
	padding: var(--node-ui-gap);
	user-select: none;
	cursor: pointer;
	min-width: 0;
}

.node[data-gender="M"] {
	background: var(--gender-male-bg);
}

.node[data-gender="F"] {
	background: var(--gender-female-bg);
}

.node[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.node__avatar {
	width: auto;
	height: 100%;
	aspect-ratio: 1 / 1;
	grid-column: 1;
	grid-row: 1 / -1;
	border: 1px solid GrayText;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.node__avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.node__avatar-icon {
	font-size: 44px;
	opacity: 0.55;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	margin: 0;
	padding: 0;
	line-height: 1;
}

.node__content {
	min-width: 0;
	grid-column: 2;
	grid-row: 1;
	padding: 0;
}

.node__actions {
	grid-column: 2;
	grid-row: 2;
	justify-self: end;
	display: flex;
	gap: var(--node-ui-gap);
}

.node__actions .icon-button {
	width: 28px;
	height: 28px;
}

.node:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.node__name {
	font-weight: 650;
	font-size: 14px;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: normal;
	word-break: break-word;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.node__meta {
	margin-top: 4px;
	font-size: 12px;
	opacity: 0.75;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.node--selected {
	border-color: Highlight;
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.menu {
	position: fixed;
	z-index: 1000;
	min-width: 230px;
	padding: 8px;
	border: 1px solid GrayText;
	border-radius: 0;
	background: Canvas;
	color: CanvasText;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.menu--hidden {
	display: none;
}

.menu__title {
	font-size: 12px;
	opacity: 0.75;
	padding: 6px 8px 8px 8px;
	border-bottom: 1px solid GrayText;
	margin-bottom: 0;
}

.menu__item {
	width: 100%;
	text-align: left;
	border-radius: 0;
	border: 1px solid GrayText;
	background: var(--gender-unknown-bg);
	padding: 10px 10px;
	font-weight: 600;
}

.menu__item[data-gender="M"] {
	background: var(--gender-male-bg);
}

.menu__item[data-gender="F"] {
	background: var(--gender-female-bg);
}

.menu__item[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.menu__item:hover {
	border-color: Highlight;
}

.menu__item:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}

.sidebar {
	border-left: 1px solid GrayText;
	background: Canvas;
	color: CanvasText;
	padding: 12px;
	overflow: auto;
	min-width: 0;
}

.sidebar__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding-bottom: 10px;
	margin-bottom: 10px;
	border-bottom: 1px solid GrayText;
}

.sidebar__title {
	font-weight: 800;
}

.sidebar--hidden {
	display: none;
}

.sidebar__content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.sidebar__person {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}

.sidebar__avatar {
	width: 72px;
	height: 72px;
	border: 1px solid GrayText;
	border-radius: 0;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
}

.sidebar__avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.sidebar__avatar-icon {
	font-size: 54px;
	opacity: 0.55;
}

.sidebar__subtitle {
	font-size: 12px;
	opacity: 0.75;
	margin-top: 2px;
}

.sidebar__heading {
	font-weight: 800;
	text-decoration: underline;
	text-underline-offset: 3px;
}

.sidebar__details {
	display: grid;
	grid-template-columns: 96px 1fr;
	gap: 8px 10px;
	font-size: 13px;
}

.sidebar__details-label {
	font-weight: 700;
}

.sidebar__family-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.sidebar__group-title {
	font-weight: 800;
	font-size: 13px;
}

.sidebar__list--plain {
	list-style: none;
	padding-left: 0;
}

.sidebar__list--plain li {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 4px 0;
}

.sidebar__partner-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 4px 0;
}

.sidebar__dot {
	width: 10px;
	height: 10px;
	border: 1px solid GrayText;
	display: inline-block;
	flex: 0 0 auto;
}

.sidebar__dot[data-gender="M"] {
	background: var(--gender-male-bg);
}

.sidebar__dot[data-gender="F"] {
	background: var(--gender-female-bg);
}

.sidebar__dot[data-gender="U"] {
	background: var(--gender-unknown-bg);
}

.sidebar__nested {
	margin: 4px 0 0 18px;
}

.sidebar__name {
	font-weight: 800;
	font-size: 16px;
}

.sidebar__meta {
	font-size: 13px;
	opacity: 0.8;
}

.sidebar__section-title {
	font-size: 12px;
	opacity: 0.75;
}

.sidebar__list {
	margin: 0;
	padding-left: 18px;
}

/* Link from the details sidebar to a Genepedia profile page. */
.sidebar__profile-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 10px 0 2px;
	font-size: 13px;
	font-weight: 600;
	color: LinkText;
	text-decoration: none;
}

.sidebar__profile-link:hover {
	text-decoration: underline;
}

.sidebar__profile-link-icon {
	font-size: 14px;
	line-height: 1;
}

/* Clickable person name -> Genepedia profile. Looks like the node title,
   not a blue link, with an underline only on hover. */
a.node__name {
	color: inherit;
	text-decoration: none;
	cursor: pointer;
}

a.node__name:hover {
	text-decoration: underline;
}

a.node__name:focus-visible {
	outline: 2px solid Highlight;
	outline-offset: 2px;
}
`;

	const APP_MARKUP = `
<div id="app">
	<header class="toolbar" role="banner">
		<div class="toolbar__right">
			<div class="tree-search" role="search" aria-label="Search people in this tree">
				<i class="bi bi-search tree-search__icon" aria-hidden="true"></i>
				<input id="treeSearchInput" class="tree-search__input" type="search" placeholder="Search this tree" autocomplete="off" />
				<div id="treeSearchResults" class="tree-search__results tree-search__results--hidden" role="listbox" aria-label="Search results"></div>
			</div>
			<div id="treePeopleStats" class="toolbar__stats" aria-live="polite"></div>
			<button id="fitBtn" class="icon-button" type="button" aria-label="Fit to screen" data-tooltip="Fit to screen"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i></button>
			<button id="resetBtn" class="icon-button" type="button" aria-label="Reset view" data-tooltip="Reset view"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
			<button id="downloadSvgBtn" class="icon-button" type="button" aria-label="Download SVG" data-tooltip="Download SVG"><i class="bi bi-filetype-svg" aria-hidden="true"></i></button>
			<button id="downloadPngBtn" class="icon-button" type="button" aria-label="Download PNG" data-tooltip="Download PNG"><i class="bi bi-filetype-png" aria-hidden="true"></i></button>
			<button id="zoomOutBtn" class="icon-button" type="button" aria-label="Zoom out" data-tooltip="Zoom out"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
			<button id="zoomInBtn" class="icon-button" type="button" aria-label="Zoom in" data-tooltip="Zoom in"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
		</div>
	</header>

	<div id="mainLayout" class="main">
		<main id="viewport" class="viewport" tabindex="0" aria-label="Family tree viewport">
			<div id="scene" class="scene">
				<svg id="links" class="links" xmlns="http://www.w3.org/2000/svg"></svg>
				<div id="nodes" class="nodes"></div>
			</div>
		</main>

		<aside id="sidebar" class="sidebar sidebar--hidden" aria-label="Selected person details">
			<div class="sidebar__header">
				<div class="sidebar__title">Details</div>
				<button id="closeSidebarBtn" class="icon-button sidebar__close" type="button" aria-label="Close sidebar">
					<i class="bi bi-x-lg" aria-hidden="true"></i>
				</button>
			</div>
			<div id="sidebarContent" class="sidebar__content"></div>
		</aside>
	</div>

	<div id="relationMenu" class="menu menu--hidden" role="menu" aria-label="Add relative menu"></div>
</div>
`;

	class FamilyTree extends HTMLElement {
		connectedCallback() {
			if (this.__rendered) return;
			this.__rendered = true;

			const root = this.attachShadow({ mode: "open" });
			root.innerHTML =
				`<link rel="stylesheet" href="${BOOTSTRAP_ICONS_HREF}"><style>${TREE_CSS}</style>${APP_MARKUP}`;

			this.#applyTheme();

			// Follow the shared theme key across tabs/windows.
			this.__onStorage = (event) => {
				if (event.key === "app-theme" && (event.newValue === "dark" || event.newValue === "light")) {
					this.#applyTheme(event.newValue);
				}
			};
			window.addEventListener("storage", this.__onStorage);

			this.#init(root).catch((err) => {
				console.error(err);
				const nodesRoot = root.getElementById("nodes");
				if (nodesRoot) {
					const message = el("div", "node");
					message.style.left = "180px";
					message.style.top = "120px";
					message.textContent = err instanceof Error ? err.message : "Unable to load GEDCOM data.";
					nodesRoot.replaceChildren(message);
				}
			});
		}

		disconnectedCallback() {
			if (this.__onStorage) window.removeEventListener("storage", this.__onStorage);
			this.__resizeObserver?.disconnect();
		}

		#resolveTheme(override) {
			const candidates = [override, this.getAttribute("theme")];
			for (const value of candidates) {
				const normalized = String(value || "").toLowerCase();
				if (normalized === "dark" || normalized === "light") return normalized;
			}
			try {
				const stored = localStorage.getItem("app-theme");
				if (stored === "dark" || stored === "light") return stored;
			} catch {
				// ignore storage failures
			}
			if (document.body?.classList?.contains("theme-dark")) return "dark";
			return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
		}

		// The stylesheet uses system colours (Canvas/CanvasText/…); forcing
		// color-scheme on the host restyles the whole shadow tree, and the
		// data-theme attribute drives the header-matching chrome tokens.
		#applyTheme(override) {
			const theme = this.#resolveTheme(override);
			this.style.colorScheme = theme;
			this.dataset.theme = theme;
		}

		async #init(root) {
			const mainLayout = root.getElementById("mainLayout");
			const viewport = root.getElementById("viewport");
			const scene = root.getElementById("scene");
			const svg = root.getElementById("links");
			const nodesRoot = root.getElementById("nodes");
			const relationMenu = root.getElementById("relationMenu");
			const sidebar = root.getElementById("sidebar");
			const sidebarContent = root.getElementById("sidebarContent");
			const closeSidebarBtn = root.getElementById("closeSidebarBtn");
			const treeSearchInput = root.getElementById("treeSearchInput");
			const treeSearchResults = root.getElementById("treeSearchResults");
			const treeSearchRoot = treeSearchInput?.closest?.(".tree-search") ?? null;

			if (!viewport || !scene || !svg || !nodesRoot) return;
			if (relationMenu) relationMenu.classList.add("menu--hidden");

			const gedAttr = (this.getAttribute("ged") || "").trim();
			const personRef = (this.getAttribute("person") || "").trim();
			const gedUrl = gedAttr
				? new URL(gedAttr, window.location.href).href
				: resolveSitePath("data/family-tree.ged");

			await ensureGedcomLibrary();

			let data = await loadTreeData(gedUrl);
			let indexes = buildIndexes(data);
			let engine = createLayoutEngine(data, indexes);
			let currentRootUnionId = data.rootUnionId;
			let layoutResult = null;
			let rendered = null;
			let contentBbox = null;
			let defaultTransform = null;

			const treePeopleStats = root.getElementById("treePeopleStats");
			let statsRaf = 0;
			let statsTimer = 0;
			const updateTreeStatsNow = () => {
				if (!treePeopleStats) return;
				const total = data?.people?.length ?? 0;
				const viewportRect = viewport.getBoundingClientRect();
				let onScreen = 0;
				for (const node of nodesRoot.querySelectorAll(".node")) {
					const r = node.getBoundingClientRect();
					const intersects =
						r.right > viewportRect.left &&
						r.left < viewportRect.right &&
						r.bottom > viewportRect.top &&
						r.top < viewportRect.bottom;
					if (intersects) onScreen += 1;
				}
				treePeopleStats.textContent = `People: ${total} total • ${onScreen} on screen`;
			};
			const scheduleTreeStatsUpdate = () => {
				if (!treePeopleStats) return;
				if (statsRaf || statsTimer) return;

				statsTimer = window.setTimeout(() => {
					statsTimer = 0;
					if (statsRaf) {
						cancelAnimationFrame(statsRaf);
						statsRaf = 0;
					}
					updateTreeStatsNow();
				}, 120);

				statsRaf = requestAnimationFrame(() => {
					if (statsTimer) {
						clearTimeout(statsTimer);
						statsTimer = 0;
					}
					statsRaf = 0;
					updateTreeStatsNow();
				});
			};

			const panZoom = createPanZoom({ viewport, scene, onChange: scheduleTreeStatsUpdate });

			viewport.addEventListener("click", () => {
				if (panZoom.consumeClickSuppression?.()) return;
				rendered?.setSelected(null, { source: "viewport" });
			});

			const personById = (id) => indexes.peopleById.get(id) ?? { id, name: id, gender: "U" };
			const sexLabel = (sex) => {
				const s = String(sex ?? "U").toUpperCase();
				if (s === "M") return "Male";
				if (s === "F") return "Female";
				if (s === "X") return "Intersex";
				if (s === "N") return "Not recorded";
				return "Unknown";
			};

			const relationOptions = [
				"Father",
				"Mother",
				"Brother",
				"Sister",
				"Husband",
				"Wife",
				"Son",
				"Daughter",
			];

			const genderForRelationLabel = (label) => {
				if (["Father", "Brother", "Husband", "Son"].includes(label)) return "M";
				if (["Mother", "Sister", "Wife", "Daughter"].includes(label)) return "F";
				return "U";
			};

			let relationMenuAnchor = null;
			let relationMenuIsOpen = false;
			let relationMenuPersonId = null;

			const closeRelationMenu = () => {
				if (!relationMenu) return;
				relationMenu.classList.add("menu--hidden");
				relationMenuIsOpen = false;
				relationMenuAnchor = null;
				relationMenuPersonId = null;
			};

			// If the user zooms while the "Add relative" menu is open, close it.
			viewport.addEventListener(
				"wheel",
				() => {
					if (relationMenuIsOpen) closeRelationMenu();
				},
				{ passive: true, capture: true },
			);

			const _zoomIn = panZoom.zoomIn;
			const _zoomOut = panZoom.zoomOut;
			panZoom.zoomIn = () => {
				if (relationMenuIsOpen) closeRelationMenu();
				_zoomIn();
			};
			panZoom.zoomOut = () => {
				if (relationMenuIsOpen) closeRelationMenu();
				_zoomOut();
			};

			const ensureRelationMenuContent = () => {
				if (!relationMenu) return;
				if (relationMenu.childElementCount > 0) return;

				const title = el("div", "menu__title");
				title.id = "relationMenuTitle";
				title.textContent = "Add to tree";
				relationMenu.appendChild(title);

				for (const label of relationOptions) {
					const item = document.createElement("button");
					item.type = "button";
					item.className = "menu__item";
					item.setAttribute("role", "menuitem");
					item.dataset.gender = genderForRelationLabel(label);
					item.textContent = label;
					item.addEventListener("click", (evt) => {
						evt.preventDefault();
						if (!relationMenuPersonId) return;
						console.log("Add", label, "for", relationMenuPersonId);
						closeRelationMenu();
					});
					relationMenu.appendChild(item);
				}
			};

			const positionRelationMenu = (anchorEl) => {
				if (!relationMenu) return;
				const margin = 8;
				const anchorRect = anchorEl.getBoundingClientRect();

				relationMenu.style.left = "0px";
				relationMenu.style.top = "0px";
				relationMenu.classList.remove("menu--hidden");

				const menuRect = relationMenu.getBoundingClientRect();
				let left = anchorRect.right - menuRect.width;
				let top = anchorRect.bottom + 8;

				if (left + menuRect.width > window.innerWidth - margin) {
					left = window.innerWidth - margin - menuRect.width;
				}
				left = Math.max(margin, left);

				if (top + menuRect.height > window.innerHeight - margin) {
					top = anchorRect.top - 8 - menuRect.height;
				}
				top = Math.max(margin, top);

				relationMenu.style.left = `${left}px`;
				relationMenu.style.top = `${top}px`;
			};

			const openRelationMenu = ({ personId, anchorEl }) => {
				if (!relationMenu) return;
				relationMenuPersonId = personId;
				ensureRelationMenuContent();
				const title = root.getElementById("relationMenuTitle");
				const selectedName = formatDisplayName(personById(personId)) || personId;
				if (title) title.textContent = `Add relative for ${selectedName}`;

				relationMenuAnchor = anchorEl;
				relationMenuIsOpen = true;
				positionRelationMenu(anchorEl);
				relationMenu.querySelector("button")?.focus();
			};

			// Close the menu when clicking outside it. Events crossing the shadow
			// boundary are retargeted, so test the composed path, not e.target.
			document.addEventListener(
				"pointerdown",
				(e) => {
					if (!relationMenuIsOpen || !relationMenu) return;
					const path = e.composedPath();
					if (path.includes(relationMenu)) return;
					if (relationMenuAnchor && path.includes(relationMenuAnchor)) return;
					closeRelationMenu();
				},
				true,
			);

			window.addEventListener("keydown", (e) => {
				if (!relationMenuIsOpen) return;
				if (e.key === "Escape") closeRelationMenu();
			});

			const uniq = (list) => [...new Set((list ?? []).filter(Boolean))];
			const displayPersonName = (personId) => formatDisplayName(personById(personId)) || personId;
			const displayPersonGender = (personId) => normalizeGender(personById(personId).gender);

			let searchIsOpen = false;
			const closeTreeSearch = () => {
				if (!treeSearchResults) return;
				treeSearchResults.classList.add("tree-search__results--hidden");
				treeSearchResults.replaceChildren();
				searchIsOpen = false;
			};

			const openTreeSearch = () => {
				if (!treeSearchResults) return;
				treeSearchResults.classList.remove("tree-search__results--hidden");
				searchIsOpen = true;
			};

			const updateTreeSearchResults = () => {
				if (!treeSearchInput || !treeSearchResults) return;
				const query = treeSearchInput.value.trim().toLowerCase();
				if (!query) {
					closeTreeSearch();
					return;
				}

				const visibleIds = layoutResult ? [...layoutResult.positions.people.keys()] : [];
				const candidates = visibleIds
					.map((id) => {
						const person = personById(id);
						const name = displayPersonName(id);
						const dates = formatDates(person);
						return {
							id,
							name,
							gender: displayPersonGender(id),
							label: dates ? `${name} ${dates}` : name,
						};
					})
					.filter((c) => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query))
					.sort((a, b) => a.name.localeCompare(b.name))
					.slice(0, 12);

				treeSearchResults.replaceChildren();
				if (candidates.length === 0) {
					closeTreeSearch();
					return;
				}

				for (const c of candidates) {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "tree-search__result";
					btn.dataset.gender = c.gender;
					btn.setAttribute("role", "option");
					btn.textContent = c.label;
					btn.addEventListener("click", (e) => {
						e.preventDefault();
						treeSearchInput.value = "";
						closeTreeSearch();
						rendered?.setSelected(c.id, { source: "search" });
						viewport?.focus();
					});
					treeSearchResults.appendChild(btn);
				}

				openTreeSearch();
			};

			treeSearchInput?.addEventListener("input", updateTreeSearchResults);
			treeSearchInput?.addEventListener("focus", updateTreeSearchResults);
			treeSearchInput?.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					closeTreeSearch();
					treeSearchInput.blur();
				}
			});

			document.addEventListener(
				"pointerdown",
				(e) => {
					if (!searchIsOpen) return;
					if (!treeSearchRoot) {
						closeTreeSearch();
						return;
					}
					if (e.composedPath().includes(treeSearchRoot)) return;
					closeTreeSearch();
				},
				true,
			);

			const createSidebarAvatar = (person) => {
				const avatar = el("div", "sidebar__avatar");
				if (person.photoUrl) {
					const img = document.createElement("img");
					img.decoding = "async";
					img.loading = "lazy";
					img.alt = "";
					img.src = person.photoUrl;
					avatar.appendChild(img);
				} else {
					avatar.appendChild(createBiIcon("person-circle", "sidebar__avatar-icon"));
				}
				return avatar;
			};

			const createPersonList = (ids) => {
				const ul = document.createElement("ul");
				ul.className = "sidebar__list sidebar__list--plain";
				for (const id of ids ?? []) {
					const li = document.createElement("li");
					const dot = el("span", "sidebar__dot");
					dot.dataset.gender = displayPersonGender(id);
					const text = document.createElement("span");
					text.textContent = displayPersonName(id);
					li.append(dot, text);
					ul.appendChild(li);
				}
				return ul;
			};

			const updateSidebar = (personId) => {
				if (!sidebar || !sidebarContent) return;
				sidebarContent.replaceChildren();
				if (!personId) {
					sidebar.classList.add("sidebar--hidden");
					mainLayout?.classList.remove("main--sidebar");
					return;
				}

				sidebar.classList.remove("sidebar--hidden");
				mainLayout?.classList.add("main--sidebar");

				const person = personById(personId);
				const gender = normalizeGender(person.gender);
				const datesText = formatDates(person);

				const top = el("div", "sidebar__person");
				const topInfo = el("div");
				const headerName = el("div", "sidebar__name");
				headerName.textContent = formatDisplayName(person) || personId;
				const subtitle = el("div", "sidebar__subtitle");
				subtitle.textContent = `${sexLabel(person.sex ?? gender)}${datesText ? ` • ${datesText}` : ""} • ${person.id}`;
				topInfo.append(headerName, subtitle);
				top.append(createSidebarAvatar(person), topInfo);
				sidebarContent.append(top);

				if (person.genepediaId) {
					const profileLink = document.createElement("a");
					profileLink.className = "sidebar__profile-link";
					profileLink.href = resolveSitePath(`people/${encodeURIComponent(person.genepediaId)}/profile.html`);
					profileLink.append(createBiIcon("person-badge", "sidebar__profile-link-icon"));
					const linkText = document.createElement("span");
					linkText.textContent = "View Genepedia profile";
					profileLink.append(linkText);
					sidebarContent.append(profileLink);
				}

				const profileHeading = el("div", "sidebar__heading");
				profileHeading.textContent = "Profile Details";
				sidebarContent.append(profileHeading);

				const details = el("div", "sidebar__details");
				const addDetail = (label, value) => {
					const l = el("div", "sidebar__details-label");
					l.textContent = label;
					const v = el("div");
					v.textContent = value;
					details.append(l, v);
				};
				addDetail("Birth:", person.birthDate || (typeof person.born === "number" ? String(person.born) : "-"));
				addDetail("Birth place:", person.birthPlace || "-");
				addDetail("Death:", person.deathDate || (typeof person.died === "number" ? String(person.died) : "-"));
				addDetail("Death place:", person.deathPlace || "-");
				addDetail("Sex:", sexLabel(person.sex ?? gender));
				if (typeof person.birthSurname === "string" && person.birthSurname.trim()) {
					addDetail("Birth surname:", person.birthSurname.trim());
				}
				sidebarContent.append(details);

				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				const parentIds = uniq(parentUnionIds.flatMap((uid) => indexes.unionsById.get(uid)?.partners ?? []));
				const siblingIds = uniq(parentUnionIds.flatMap((uid) => indexes.unionsById.get(uid)?.children ?? [])).filter(
					(id) => id !== personId,
				);

				const unionIds = indexes.unionsByPartner.get(personId) ?? [];

				const familyHeading = el("div", "sidebar__heading");
				familyHeading.textContent = "Immediate Family";
				sidebarContent.append(familyHeading);

				const addFamilyGroup = (titleText, ids) => {
					if (!ids || ids.length === 0) return;
					const group = el("div", "sidebar__family-group");
					const title = el("div", "sidebar__group-title");
					title.textContent = titleText;
					group.append(title, createPersonList(ids));
					sidebarContent.append(group);
				};

				addFamilyGroup("Parents", parentIds);
				addFamilyGroup("Siblings", siblingIds);

				// Partners and children (grouped by union)
				const unions = unionIds.map((uid) => indexes.unionsById.get(uid)).filter(Boolean);
				if (unions.length > 0) {
					const group = el("div", "sidebar__family-group");
					const title = el("div", "sidebar__group-title");
					title.textContent = "Partners and Children";
					group.append(title);

					for (const union of unions) {
						const otherPartners = (union.partners ?? []).filter((pid) => pid !== personId);
						if (otherPartners.length > 0) {
							const row = el("div", "sidebar__partner-row");
							const dot = el("span", "sidebar__dot");
							dot.dataset.gender =
								otherPartners.length === 1 ? displayPersonGender(otherPartners[0]) : "U";
							const text = document.createElement("span");
							text.textContent = otherPartners.map(displayPersonName).join(" & ");
							row.append(dot, text);
							group.append(row);
						}

						const kids = union.children ?? [];
						if (kids.length > 0) {
							const kidsList = createPersonList(kids);
							kidsList.classList.add("sidebar__nested");
							group.append(kidsList);
						}
					}

					sidebarContent.append(group);
				}
			};

			let selectedPersonId = null;
			const focusSelectedPerson = (personId) => {
				if (!personId) return;
				const pos = layoutResult?.positions?.people?.get(personId);
				if (!pos) return;
				const vw = viewport.clientWidth;
				const vh = viewport.clientHeight;
				if (vw <= 0 || vh <= 0) return;

				const current = panZoom.get();
				const scale = clamp(current.scale, CONFIG.minScale, CONFIG.maxScale);
				const x = vw / 2 - pos.x * scale;
				const y = vh / 2 - pos.y * scale;
				panZoom.set({ x, y, scale });
			};

			const handleSelect = (personId, opts = {}) => {
				const prev = selectedPersonId;
				selectedPersonId = personId;
				if (prev !== selectedPersonId) closeRelationMenu();
				// On initial deep-link selection, highlight and centre the person but
				// keep the details sidebar closed so the tree stays fully visible.
				if (opts.source !== "init") updateSidebar(selectedPersonId);
				if (selectedPersonId) focusSelectedPerson(selectedPersonId);
			};

			const getPreferredRootUnionIdForPerson = (personId) => {
				const parentUnionIds = indexes.parentUnionsByChild.get(personId) ?? [];
				if (parentUnionIds.length > 0) return parentUnionIds[0];
				const partnerUnionIds = indexes.unionsByPartner.get(personId) ?? [];
				if (partnerUnionIds.length > 0) return partnerUnionIds[0];
				return currentRootUnionId;
			};

			const renderTree = (opts = {}) => {
				closeTreeSearch();
				const prevTransform = panZoom.get();
				layoutResult = engine.layout(currentRootUnionId);
				rendered = render({
					data,
					indexes,
					layoutResult,
					viewport,
					scene,
					svg,
					nodesRoot,
					onSelect: handleSelect,
					onEdit: ({ personId }) => {
						console.log("Edit person:", personId);
					},
					onAdd: ({ personId, anchorEl }) => {
						if (
							relationMenuIsOpen &&
							relationMenuAnchor === anchorEl &&
							relationMenuPersonId === personId
						) {
							closeRelationMenu();
							return;
						}
						openRelationMenu({ personId, anchorEl });
					},
					onTree: ({ personId }) => openTreeForPerson(personId),
				});

				contentBbox = rendered.getContentBbox();
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });

				const transformMode = opts.transformMode ?? "fit";
				if (transformMode === "fit") {
					panZoom.set(defaultTransform);
				} else {
					const vw = viewport.clientWidth;
					const vh = viewport.clientHeight;
					// opts.scale lets callers request a specific zoom (e.g. opening the
					// tab centred on a person at roughly the page's own text size).
					const baseScale = opts.scale ?? prevTransform.scale;
					const scale = clamp(baseScale, CONFIG.minScale, CONFIG.maxScale);
					let x = prevTransform.x;
					let y = prevTransform.y;
					const focusId = opts.selectPersonId;
					const pos = focusId ? layoutResult?.positions?.people?.get(focusId) : null;
					if (pos && vw > 0 && vh > 0) {
						x = vw / 2 - pos.x * scale;
						y = vh / 2 - pos.y * scale;
					}
					panZoom.set({ x, y, scale });
				}

				if (opts.selectPersonId) {
					rendered.setSelected(opts.selectPersonId, { source: opts.source ?? "tree" });
				}

				updateTreeStatsNow();
			};

			function openTreeForPerson(personId) {
				if (!personId) return;
				closeRelationMenu();
				currentRootUnionId = getPreferredRootUnionIdForPerson(personId);
				renderTree({ selectPersonId: personId, source: "tree", transformMode: "pan" });
			}

			const findPersonIdByRef = (ref) => {
				const needle = String(ref ?? "").trim();
				if (!needle) return null;

				for (const person of data.people) {
					if (String(person.genepediaId ?? "").trim() === needle) return person.id;
				}

				if (indexes.peopleById.has(needle)) return needle;
				const asXref = `@${needle.replace(/^@|@$/g, "")}@`;
				if (indexes.peopleById.has(asXref)) return asXref;
				return null;
			};

			const initialPersonId = findPersonIdByRef(personRef);
			if (initialPersonId) {
				currentRootUnionId = getPreferredRootUnionIdForPerson(initialPersonId);
				// Open zoomed in on the selected person so the node text reads at
				// roughly the same size as body text on the rest of the website
				// (node name is 14px; ~1.15x lands it near the page's 16px).
				renderTree({ selectPersonId: initialPersonId, source: "init", transformMode: "pan", scale: 1.15 });
			} else {
				renderTree();
			}

			closeSidebarBtn?.addEventListener("click", (e) => {
				e.preventDefault();
				rendered?.setSelected(null, { source: "sidebar" });
				viewport?.focus();
			});

			const fitBtn = root.getElementById("fitBtn");
			const resetBtn = root.getElementById("resetBtn");
			const downloadSvgBtn = root.getElementById("downloadSvgBtn");
			const downloadPngBtn = root.getElementById("downloadPngBtn");
			const zoomInBtn = root.getElementById("zoomInBtn");
			const zoomOutBtn = root.getElementById("zoomOutBtn");

			const applyFit = () => {
				if (!contentBbox) return;
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });
				panZoom.set(defaultTransform);
			};

			fitBtn?.addEventListener("click", applyFit);
			resetBtn?.addEventListener("click", () => {
				if (!defaultTransform) return;
				panZoom.set(defaultTransform);
			});

			downloadSvgBtn?.addEventListener("click", () => {
				if (!layoutResult) return;
				const { svg: exportSvg } = buildExportSvg({ data, indexes, layoutResult });
				downloadBlob("family-tree.svg", new Blob([exportSvg], { type: "image/svg+xml;charset=utf-8" }));
			});
			downloadPngBtn?.addEventListener("click", async () => {
				try {
					if (!layoutResult) return;
					const exported = buildExportSvg({ data, indexes, layoutResult });
					const pngBlob = await svgToPngBlob({
						svg: exported.svg,
						width: exported.width,
						height: exported.height,
						scale: 2,
					});
					downloadBlob("family-tree.png", pngBlob);
				} catch (err) {
					console.error(err);
				}
			});
			zoomInBtn?.addEventListener("click", () => panZoom.zoomIn());
			zoomOutBtn?.addEventListener("click", () => panZoom.zoomOut());

			viewport.addEventListener("keydown", (e) => {
				if (e.key === "+" || e.key === "=") {
					e.preventDefault();
					panZoom.zoomIn();
				}
				if (e.key === "-" || e.key === "_") {
					e.preventDefault();
					panZoom.zoomOut();
				}
				if (e.key === "0") {
					e.preventDefault();
					if (!defaultTransform) return;
					panZoom.set(defaultTransform);
				}
				if (e.key.toLowerCase() === "f") {
					e.preventDefault();
					applyFit();
				}
			});

			const isNear = (a, b, eps) => Math.abs(a - b) <= eps;
			const isTransformNear = (a, b) =>
				isNear(a.x, b.x, 0.5) && isNear(a.y, b.y, 0.5) && isNear(a.scale, b.scale, 0.001);

			// Re-fit on resize (only if user hasn't moved away from default).
			const resizeObserver = new ResizeObserver(() => {
				if (!contentBbox || !defaultTransform) return;
				const current = panZoom.get();
				const wasAtDefault = isTransformNear(current, defaultTransform);
				defaultTransform = fitToTransform({ viewport, contentBbox, padding: 36 });
				if (wasAtDefault) panZoom.set(defaultTransform);
				updateTreeStatsNow();
			});
			resizeObserver.observe(viewport);
			this.__resizeObserver = resizeObserver;
		}
	}

	if (!customElements.get("family-tree")) {
		customElements.define("family-tree", FamilyTree);
	}
})();
