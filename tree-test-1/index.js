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

/**
 * Data model:
 * - people: id -> { id, name, gender?: "M"|"F"|"U", birthSurname?, born?, died?, photoUrl? }
 * - unions: id -> { id, partners: [personId...], children: [personId...] }
 */
function buildDemoData() {
	// Base dataset (then expanded with parents/siblings/grandparents).
	const people = [
		{ id: "p100", name: "Robert Johnson", gender: "M", born: 1925, died: 1990 },
		{ id: "p101", name: "Evelyn Johnson", birthSurname: "Carter", gender: "F", born: 1927, died: 2001 },
		{ id: "p1", name: "Alex Johnson", gender: "M", born: 1950 },
		{ id: "p2", name: "Morgan Johnson", birthSurname: "Lee", gender: "F", born: 1952 },
		{ id: "p10", name: "Jamie Johnson", gender: "M", born: 1955 },
		{ id: "p11", name: "Pat Johnson", gender: "M", born: 1960 },
		{ id: "p13", name: "Leslie Nguyen", gender: "F", born: 1956 },
		{ id: "p16", name: "Robin Smith", gender: "F", born: 1961 },

		{ id: "p3", name: "Casey Johnson", gender: "M", born: 1975 },
		{ id: "p4", name: "Taylor Johnson", birthSurname: "Kim", gender: "F", born: 1976 },
		{ id: "p5", name: "Jordan Johnson", gender: "M", born: 1978 },
		{ id: "p6", name: "Riley Patel", gender: "F", born: 1980 },
		{ id: "p12", name: "Cameron Johnson", gender: "M", born: 1981 },
		{ id: "p19", name: "Bailey Chen", gender: "F", born: 1979 },
		{ id: "p14", name: "Drew Johnson", gender: "M", born: 1982 },
		{ id: "p21", name: "Parker Brooks", gender: "F", born: 1983 },
		{ id: "p15", name: "Sky Johnson", gender: "F", born: 1985 },

		{ id: "p7", name: "Avery Johnson", gender: "F", born: 2000 },
		{ id: "p8", name: "Quinn Johnson", gender: "M", born: 2003 },
		{ id: "p17", name: "Harper Johnson", gender: "F", born: 2007 },
		{ id: "p9", name: "Sam Patel", gender: "F", born: 2005 },
		{ id: "p18", name: "Rowan Patel", gender: "F", born: 2009 },
		{ id: "p20", name: "Emerson Johnson", gender: "M", born: 2008 },
		{ id: "p22", name: "Reese Brooks", gender: "F", born: 2010 },
		{ id: "p23", name: "Sydney Thompson", gender: "M", born: 2001 },
		{ id: "p24", name: "Noah Alexander Johnson", gender: "M", born: 2023 },
		{ id: "p25", name: "Luna Rose Johnson", gender: "F", born: 2025 },
		{ id: "p26", name: "Kai Rivera", gender: "F", born: 2002 },
		{ id: "p27", name: "Milo Johnson-Rivera", gender: "M", born: 2024 },
		{ id: "p28", name: "Aiden Brooks", gender: "M", born: 2004 },
		{ id: "p29", name: "Sienna Patel", gender: "F", born: 2027 },
		{ id: "p30", name: "Harper Elizabeth Patel", gender: "F", born: 2029 },
		{ id: "p31", name: "Dana Johnson", gender: "F", born: 1958 },
		{ id: "p32", name: "Christopher Benjamin Evans", gender: "M", born: 1957 },
		{ id: "p33", name: "Logan Christopher Evans-Johnson", gender: "M", born: 1984 },
		{ id: "p34", name: "Mia Isabella Evans", gender: "F", born: 1987 },
		{ id: "p35", name: "Ethan Williams", gender: "M", born: 1986 },
		{ id: "p36", name: "Sophie Williams", gender: "F", born: 2012 },
		{ id: "p37", name: "Oliver Williams", gender: "M", born: 2014 },

		{ id: "p38", name: "Sage Johnson", gender: "F", born: 2016 },
		{ id: "p39", name: "River Johnson", gender: "M", born: 2018 },
		{ id: "p40", name: "Charlie Johnson", gender: "M", born: 2020 },
	];

	const unions = [
		{ id: "u0", partners: ["p100", "p101"], children: ["p1", "p10", "p11", "p31"] },
		{ id: "u1", partners: ["p1", "p2"], children: ["p3", "p5", "p12"] },
		{ id: "u4", partners: ["p10", "p13"], children: ["p14", "p15"] },
		{ id: "u5", partners: ["p11", "p16"], children: ["p38", "p39", "p40"] },
		{ id: "u2", partners: ["p3", "p4"], children: ["p7", "p8", "p17"] },
		{ id: "u3", partners: ["p5", "p6"], children: ["p9", "p18"] },
		{ id: "u6", partners: ["p12", "p19"], children: ["p20"] },
		{ id: "u7", partners: ["p14", "p21"], children: ["p22"] },
		{ id: "u8", partners: ["p7", "p23"], children: ["p24", "p25"] },
		{ id: "u9", partners: ["p8", "p26"], children: ["p27"] },
		{ id: "u10", partners: ["p9", "p28"], children: ["p29", "p30"] },
		{ id: "u11", partners: ["p31", "p32"], children: ["p33", "p34"] },
		{ id: "u12", partners: ["p34", "p35"], children: ["p36", "p37"] },
	];

	const peopleById = byId(people);
	const unionsById = byId(unions);

	const parentUnionByChild = new Map();
	for (const union of unions) {
		for (const childId of union.children ?? []) {
			if (!parentUnionByChild.has(childId)) parentUnionByChild.set(childId, union.id);
		}
	}

	let nextPersonNum = 200;
	let nextUnionNum = 100;

	const MALE_FIRST = [
		"William",
		"James",
		"George",
		"Charles",
		"Henry",
		"Edward",
		"Frank",
		"Arthur",
		"Albert",
		"Samuel",
		"Joseph",
		"Walter",
		"Thomas",
		"John",
		"Richard",
		"Peter",
		"David",
		"Harold",
		"Frederick",
	];
	const FEMALE_FIRST = [
		"Mary",
		"Elizabeth",
		"Margaret",
		"Anna",
		"Florence",
		"Rose",
		"Dorothy",
		"Ethel",
		"Alice",
		"Helen",
		"Ruth",
		"Mabel",
		"Clara",
		"Emma",
		"Sarah",
		"Catherine",
		"Frances",
		"Lillian",
	];
	const MAIDEN_SURNAMES = [
		"Harris",
		"Baker",
		"Miller",
		"Clark",
		"Davis",
		"Wilson",
		"Moore",
		"Taylor",
		"Anderson",
		"Thomas",
		"White",
		"Martin",
		"Thompson",
		"Young",
		"Walker",
		"Hall",
		"Allen",
		"King",
	];

	const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
	const safeMaidenSurname = (familySurname, seed) => {
		const first = pick(MAIDEN_SURNAMES, seed);
		if (!familySurname) return first;
		if (first.toLowerCase() !== familySurname.toLowerCase()) return first;
		return pick(MAIDEN_SURNAMES, seed + 1);
	};

	const allocPersonId = () => {
		while (peopleById.has(`p${nextPersonNum}`)) nextPersonNum += 1;
		const id = `p${nextPersonNum}`;
		nextPersonNum += 1;
		return id;
	};

	const allocUnionId = () => {
		while (unionsById.has(`u${nextUnionNum}`)) nextUnionNum += 1;
		const id = `u${nextUnionNum}`;
		nextUnionNum += 1;
		return id;
	};

	const addPerson = (person) => {
		if (!person || !person.id) return;
		if (peopleById.has(person.id)) {
			Object.assign(peopleById.get(person.id), person);
			return;
		}
		people.push(person);
		peopleById.set(person.id, person);
	};

	const addUnion = (union) => {
		if (!union || !union.id) return;
		if (unionsById.has(union.id)) {
			Object.assign(unionsById.get(union.id), union);
			return;
		}
		unions.push(union);
		unionsById.set(union.id, union);
		for (const childId of union.children ?? []) {
			if (!parentUnionByChild.has(childId)) parentUnionByChild.set(childId, union.id);
		}
	};

	const bornYear = (id) => {
		const p = peopleById.get(id);
		return typeof p?.born === "number" ? p.born : null;
	};

	const familySurnameFor = (person) => {
		if (!person) return "";
		const gender = normalizeGender(person.gender);
		if (gender === "F" && typeof person.birthSurname === "string" && person.birthSurname.trim()) {
			return person.birthSurname.trim();
		}
		return surnameFromName(person.name) || "";
	};

	const maybeDeathYear = (born, seed) => {
		if (typeof born !== "number") return undefined;
		if (born <= 1938) return born + 66 + (Math.abs(seed) % 22);
		if (born <= 1958 && Math.abs(seed) % 3 === 0) return born + 60 + (Math.abs(seed) % 26);
		return undefined;
	};

	const ensureParents = (personId, seed = 1) => {
		if (parentUnionByChild.has(personId)) return parentUnionByChild.get(personId);
		const person = peopleById.get(personId);
		if (!person) return null;

		const familySurname = familySurnameFor(person) || "Unknown";
		const childBorn = typeof person.born === "number" ? person.born : null;
		const fatherBorn = typeof childBorn === "number" ? childBorn - (28 + (Math.abs(seed) % 7)) : 1930;
		const motherBorn = fatherBorn + 2;

		const fatherId = allocPersonId();
		const motherId = allocPersonId();
		addPerson({
			id: fatherId,
			name: `${pick(MALE_FIRST, seed)} ${familySurname}`,
			gender: "M",
			born: fatherBorn,
			died: maybeDeathYear(fatherBorn, seed + 11),
		});
		addPerson({
			id: motherId,
			name: `${pick(FEMALE_FIRST, seed + 3)} ${familySurname}`,
			birthSurname: safeMaidenSurname(familySurname, seed + 17),
			gender: "F",
			born: motherBorn,
			died: maybeDeathYear(motherBorn, seed + 19),
		});

		const siblingCount = 2;
		const siblingIds = [];
		for (let i = 0; i < siblingCount; i += 1) {
			const sibId = allocPersonId();
			const sibGender = i % 2 === 0 ? "F" : "M";
			const first = sibGender === "M" ? pick(MALE_FIRST, seed + 40 + i) : pick(FEMALE_FIRST, seed + 40 + i);
			const sibBorn = typeof childBorn === "number" ? childBorn + (-3 + i * 2) : undefined;
			addPerson({
				id: sibId,
				name: `${first} ${familySurname}`,
				gender: sibGender,
				born: sibBorn,
				died: maybeDeathYear(sibBorn, seed + 90 + i),
			});
			siblingIds.push(sibId);
		}

		const unionId = allocUnionId();
		addUnion({ id: unionId, partners: [fatherId, motherId], children: [personId, ...siblingIds] });
		parentUnionByChild.set(personId, unionId);
		return unionId;
	};

	const ensureAncestors = (personId, generations = 2, seed = 1, stack = new Set()) => {
		if (!personId || generations <= 0) return;
		if (stack.has(personId)) return;
		stack.add(personId);
		const parentUnionId = ensureParents(personId, seed);
		if (!parentUnionId) {
			stack.delete(personId);
			return;
		}
		if (generations <= 1) {
			stack.delete(personId);
			return;
		}
		const union = unionsById.get(parentUnionId);
		for (let idx = 0; idx < (union?.partners?.length ?? 0); idx += 1) {
			ensureAncestors(union.partners[idx], generations - 1, seed + 200 + idx * 17, stack);
		}
		stack.delete(personId);
	};

	// Ensure unions with a single child get at least one sibling.
	const ensureUnionHasSibling = (unionId, seed) => {
		const union = unionsById.get(unionId);
		if (!union) return;
		const children = union.children ?? [];
		if (children.length >= 2) return;
		const baseChildId = children[0];
		const baseBorn = bornYear(baseChildId);
		const baseSurname = surnameFromName(peopleById.get(baseChildId)?.name ?? "") || "";
		const newId = allocPersonId();
		const gender = Math.abs(seed) % 2 === 0 ? "F" : "M";
		const first = gender === "M" ? pick(MALE_FIRST, seed) : pick(FEMALE_FIRST, seed);
		const b = typeof baseBorn === "number" ? baseBorn + 2 : undefined;
		addPerson({ id: newId, name: `${first} ${baseSurname}`.trim() || newId, gender, born: b, died: maybeDeathYear(b, seed) });
		union.children = [...children, newId];
		parentUnionByChild.set(newId, unionId);
	};

	ensureUnionHasSibling("u6", 601);
	ensureUnionHasSibling("u7", 701);
	ensureUnionHasSibling("u9", 901);

	// Snapshot current people IDs, then ensure parents+grandparents for all of them.
	const idsToEnsure = people.map((p) => p.id);
	for (let i = 0; i < idsToEnsure.length; i += 1) {
		ensureAncestors(idsToEnsure[i], 2, 1000 + i);
	}

	return { people, unions, rootUnionId: "u0" };
}

const DATA = buildDemoData();

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function byId(list) {
	const map = new Map();
	for (const item of list) map.set(item.id, item);
	return map;
}

function formatDates(person) {
	const born = typeof person.born === "number" ? String(person.born) : "";
	const died = typeof person.died === "number" ? String(person.died) : "";
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

	for (const id of unionIds) {
		if (id !== excludeUnionId) return id;
	}
	return null;
}

function createLayoutEngine(data, indexes) {
	const widthMemo = new Map();

	function measureUnion(unionId, stack = new Set()) {
		if (widthMemo.has(unionId)) return widthMemo.get(unionId);
		const union = indexes.unionsById.get(unionId);
		if (!union) return CONFIG.nodeWidth;

		if (stack.has(unionId)) {
			const partnersWidth =
				union.partners.length * CONFIG.nodeWidth +
				Math.max(0, union.partners.length - 1) * CONFIG.partnerGap;
			return partnersWidth;
		}

		stack.add(unionId);

		const partnersWidth =
			union.partners.length * CONFIG.nodeWidth +
			Math.max(0, union.partners.length - 1) * CONFIG.partnerGap;

		const childIds = union.children ?? [];
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

			stack.add(unionId);

			const unionWidth = measureUnion(unionId);
			const centerX = xLeft + unionWidth / 2;
			const y = CONFIG.padding + depth * CONFIG.generationGap;

			const partnersWidth =
				union.partners.length * CONFIG.nodeWidth +
				Math.max(0, union.partners.length - 1) * CONFIG.partnerGap;
			const partnersLeft = centerX - partnersWidth / 2;

			for (let idx = 0; idx < union.partners.length; idx += 1) {
				const personId = union.partners[idx];
				const x =
					partnersLeft + idx * (CONFIG.nodeWidth + CONFIG.partnerGap) + CONFIG.nodeWidth / 2;
				positions.people.set(personId, { x, y });
			}

			const unionLineY = y + CONFIG.nodeHeight / 2 + 18;
			positions.unions.set(unionId, { x: centerX, y: unionLineY });

			const childIds = union.children ?? [];
			if (childIds.length === 0) {
				stack.delete(unionId);
				return;
			}

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

				edges.push({ fromUnionId: unionId, toPersonId: group.childId });
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

	// Render nodes.
	for (const [personId, pos] of positions.people.entries()) {
		const person = peopleById.get(personId) ?? { id: personId, name: personId };
		const gender = normalizeGender(person.gender);
		const displayName = formatDisplayName(person) || personId;

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
		const editAction = document.createElement("button");
		editAction.type = "button";
		editAction.className = "icon-button";
		editAction.setAttribute("aria-label", "Edit person");
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
		addAction.appendChild(createBiIcon("plus-lg"));
		addAction.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			setSelected(personId, { source: "action" });
			onAdd?.({ personId, anchorEl: addAction });
		});

		const treeAction = document.createElement("button");
		treeAction.type = "button";
		treeAction.className = "icon-button";
		treeAction.setAttribute("aria-label", "Open tree");
		treeAction.appendChild(createBiIcon("diagram-3"));
		treeAction.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			onTree?.({ personId });
		});

		actions.append(editAction, addAction, treeAction);

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

function createPanZoom({ viewport, scene }) {
	const state = { x: 0, y: 0, scale: 1 };

	function apply() {
		scene.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
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

	viewport.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		if (e.target && e.target.closest && e.target.closest(".node")) return;
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY, startX: state.x, startY: state.y };
		viewport.setPointerCapture(e.pointerId);
	});

	viewport.addEventListener("pointermove", (e) => {
		if (!isPanning || !panStart) return;
		const dx = e.clientX - panStart.x;
		const dy = e.clientY - panStart.y;
		setTransform({ x: panStart.startX + dx, y: panStart.startY + dy, scale: state.scale });
	});

	viewport.addEventListener("pointerup", () => {
		isPanning = false;
		panStart = null;
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

function main() {
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

	const indexes = buildIndexes(DATA);
	const engine = createLayoutEngine(DATA, indexes);
	let currentRootUnionId = DATA.rootUnionId;
	let layoutResult = null;
	let rendered = null;
	let contentBbox = null;
	let defaultTransform = null;
	const panZoom = createPanZoom({ viewport, scene });

	viewport.addEventListener("click", () => rendered?.setSelected(null, { source: "viewport" }));

	const personById = (id) => indexes.peopleById.get(id) ?? { id, name: id, gender: "U" };
	const genderLabel = (gender) => {
		const g = normalizeGender(gender);
		if (g === "M") return "Male";
		if (g === "F") return "Female";
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
		subtitle.textContent = `${genderLabel(gender)}${datesText ? ` • ${datesText}` : ""} • ${person.id}`;
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
		addDetail("Birth:", typeof person.born === "number" ? String(person.born) : "—");
		addDetail("Death:", typeof person.died === "number" ? String(person.died) : "—");
		addDetail("Gender:", genderLabel(gender));
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

		const pad = 90;
		const maxScaleX = (vw - pad * 2) / CONFIG.nodeWidth;
		const maxScaleY = (vh - pad * 2) / CONFIG.nodeHeight;
		const maxScaleForNode = Math.max(CONFIG.minScale, Math.min(maxScaleX, maxScaleY, CONFIG.maxScale));

		const current = panZoom.get();
		const desired = Math.max(current.scale, 1.5);
		const scale = clamp(Math.min(desired, maxScaleForNode), CONFIG.minScale, CONFIG.maxScale);
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
		layoutResult = engine.layout(currentRootUnionId);
		rendered = render({
			data: DATA,
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
		panZoom.set(defaultTransform);

		if (opts.selectPersonId) {
			rendered.setSelected(opts.selectPersonId, { source: opts.source ?? "tree" });
		}
	};

	function openTreeForPerson(personId) {
		if (!personId) return;
		closeRelationMenu();
		currentRootUnionId = getPreferredRootUnionIdForPerson(personId);
		renderTree({ selectPersonId: personId, source: "tree" });
	}

	renderTree();

	closeSidebarBtn?.addEventListener("click", (e) => {
		e.preventDefault();
		rendered?.setSelected(null, { source: "sidebar" });
		viewport?.focus();
	});

	const fitBtn = document.getElementById("fitBtn");
	const resetBtn = document.getElementById("resetBtn");
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
	downloadSvgBtn?.addEventListener("click", () => {
		if (!layoutResult) return;
		const { svg: exportSvg } = buildExportSvg({ data: DATA, indexes, layoutResult });
		downloadBlob("family-tree.svg", new Blob([exportSvg], { type: "image/svg+xml;charset=utf-8" }));
	});
	downloadPngBtn?.addEventListener("click", async () => {
		try {
			if (!layoutResult) return;
			const exported = buildExportSvg({ data: DATA, indexes, layoutResult });
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
	});
	resizeObserver.observe(viewport);
}

main();
