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

const GEDCOM_DATA_URL = "./family-tree.ged";

async function loadTreeData(url) {
	const api = window.GenipediaGedcom;
	if (!api || typeof api.loadTreeData !== "function") {
		throw new Error(
			"GenipediaGedcom library not loaded. Ensure ../lib/gedcom.js is included before tree-test-1/index.js.",
		);
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
		const name = el("div", "node__name");
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

async function main() {
	const mainLayout = document.getElementById("mainLayout");
	const viewport = document.getElementById("viewport");
	const scene = document.getElementById("scene");
	const svg = document.getElementById("links");
	const nodesRoot = document.getElementById("nodes");
	const relationMenu = document.getElementById("relationMenu");
	const sidebar = document.getElementById("sidebar");
	const sidebarContent = document.getElementById("sidebarContent");
	const closeSidebarBtn = document.getElementById("closeSidebarBtn");
	const treeSearchInput = document.getElementById("treeSearchInput");
	const treeSearchResults = document.getElementById("treeSearchResults");
	const treeSearchRoot = treeSearchInput?.closest?.(".tree-search") ?? null;

	if (!viewport || !scene || !svg || !nodesRoot) return;
	if (relationMenu) relationMenu.classList.add("menu--hidden");

	let data = await loadTreeData(GEDCOM_DATA_URL);
	let indexes = buildIndexes(data);
	let engine = createLayoutEngine(data, indexes);
	let currentRootUnionId = data.rootUnionId;
	let layoutResult = null;
	let rendered = null;
	let contentBbox = null;
	let defaultTransform = null;

	const treePeopleStats = document.getElementById("treePeopleStats");
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
		const title = document.getElementById("relationMenuTitle");
		const selectedName = formatDisplayName(personById(personId)) || personId;
		if (title) title.textContent = `Add relative for ${selectedName}`;

		relationMenuAnchor = anchorEl;
		relationMenuIsOpen = true;
		positionRelationMenu(anchorEl);
		relationMenu.querySelector("button")?.focus();
	};

	document.addEventListener(
		"pointerdown",
		(e) => {
			if (!relationMenuIsOpen || !relationMenu) return;
			const target = e.target;
			if (target instanceof Node && relationMenu.contains(target)) return;
			if (relationMenuAnchor && target === relationMenuAnchor) return;
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
			const target = e.target;
			if (target instanceof Node && treeSearchRoot.contains(target)) return;
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
		updateSidebar(selectedPersonId);
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
			const scale = clamp(prevTransform.scale, CONFIG.minScale, CONFIG.maxScale);
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

	renderTree();

	closeSidebarBtn?.addEventListener("click", (e) => {
		e.preventDefault();
		rendered?.setSelected(null, { source: "sidebar" });
		viewport?.focus();
	});

	const fitBtn = document.getElementById("fitBtn");
	const resetBtn = document.getElementById("resetBtn");
	const importGedcomBtn = document.getElementById("importGedcomBtn");
	const gedcomFileInput = document.getElementById("gedcomFileInput");
	const downloadSvgBtn = document.getElementById("downloadSvgBtn");
	const downloadPngBtn = document.getElementById("downloadPngBtn");
	const zoomInBtn = document.getElementById("zoomInBtn");
	const zoomOutBtn = document.getElementById("zoomOutBtn");

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

	importGedcomBtn?.addEventListener("click", () => {
		gedcomFileInput?.click();
	});

	gedcomFileInput?.addEventListener("change", async () => {
		const file = gedcomFileInput.files?.[0] ?? null;
		gedcomFileInput.value = "";
		if (!file) return;

		const api = window.GenipediaGedcom;
		if (!api || typeof api.parseGedcom555FromBytes !== "function") {
			console.error(
				"GenipediaGedcom library not loaded. Ensure ../lib/gedcom.js is included before tree-test-1/index.js.",
			);
			return;
		}

		try {
			if (importGedcomBtn) importGedcomBtn.disabled = true;
			const buf = await file.arrayBuffer();
			const gedcom = api.parseGedcom555FromBytes(buf);
			const nextData = api.gedcomToTreeData(gedcom);

			data = nextData;
			indexes = buildIndexes(data);
			engine = createLayoutEngine(data, indexes);
			currentRootUnionId = data.rootUnionId;
			layoutResult = null;
			rendered = null;
			contentBbox = null;
			defaultTransform = null;
			selectedPersonId = null;

			closeRelationMenu();
			closeTreeSearch();
			if (treeSearchInput) treeSearchInput.value = "";
			updateSidebar(null);
			renderTree({ transformMode: "fit" });
			viewport?.focus();
		} catch (err) {
			console.error(err);
		} finally {
			if (importGedcomBtn) importGedcomBtn.disabled = false;
		}
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
}

main().catch((err) => {
	console.error(err);
	const nodesRoot = document.getElementById("nodes");
	if (nodesRoot) {
		const message = el("div", "node");
		message.style.left = "180px";
		message.style.top = "120px";
		message.textContent = err instanceof Error ? err.message : "Unable to load GEDCOM data.";
		nodesRoot.replaceChildren(message);
	}
});
