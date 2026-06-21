/**
 * Browser-side client for the file-based people database (data/Genepedia-Database/people).
 *
 * The frontend reads ALL structured person data from this database:
 *   - the identity infobox is rendered from the person JSON record,
 *   - immediate-family links are resolved from relationships + summary shards,
 *   - the family tree is built on demand as GEDCOM from the JSON records.
 *
 * The editable narrative prose still lives in people/<id>/profile.html.
 */
(function () {
  'use strict';

  if (window.PeopleDB) {
    return;
  }

  const DB_ROOT = typeof window.App?.resolvePeopleDbPath === 'function'
    ? window.App.resolvePeopleDbPath('')
    : 'data/Genepedia-Database/people';
  const PERSON_MEDIA_ROOT = 'data/Genepedia-Media/people';
  const LOCAL_MEDIA_PROFILE_IDS = new Set(['1', '2', '3', '15']);
  const SHARD_SIZE = 1000;

  const personCache = new Map();
  const unionCache = new Map();
  const summaryShardCache = new Map();
  const summaryByIdCache = new Map();

  function bucketForId(id) {
    const n = Number(String(id).replace(/[^0-9]/g, '')) || 0;
    return Math.floor((Math.max(1, n) - 1) / SHARD_SIZE);
  }

  function resolveSiteUrl(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    if (typeof window.App?.resolveSiteUrl === 'function') {
      return window.App.resolveSiteUrl(clean);
    }
    return new URL(`../../${clean}`, window.location.href).href;
  }

  function normalizeSitePath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  }

  function hasAbsoluteUrlScheme(value) {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || '').trim());
  }

  function resolvePersonMediaPath(personId, mediaPath = '') {
    if (typeof window.App?.resolvePersonMediaPath === 'function') {
      return window.App.resolvePersonMediaPath(personId, mediaPath);
    }

    const id = String(personId || '').trim();
    const root = `${PERSON_MEDIA_ROOT}/${id}`;
    const normalized = normalizeSitePath(mediaPath);
    if (!normalized) {
      return `${root}/`;
    }

    if (normalized.startsWith(`${PERSON_MEDIA_ROOT}/`)) {
      return normalized;
    }

    if (normalized.startsWith('images/')) {
      return `${root}/${normalized.slice('images/'.length)}`;
    }

    if (normalized.startsWith('data/images/')) {
      return `${root}/${normalized.slice('data/images/'.length)}`;
    }

    const personMediaPrefixes = [
      `people/${id}/images/`,
      `people/${id}/data/images/`,
    ];
    for (const prefix of personMediaPrefixes) {
      if (normalized.startsWith(prefix)) {
        return `${root}/${normalized.slice(prefix.length)}`;
      }
    }

    if (/^(assets|data|lib|pages|people)\//.test(normalized)) {
      return normalized;
    }

    return `${root}/${normalized}`;
  }

  function resolvePersonMediaUrl(personId, mediaPath = '') {
    const value = String(mediaPath || '').trim();
    if (hasAbsoluteUrlScheme(value)) {
      return value;
    }
    if (typeof window.App?.resolvePersonMediaUrl === 'function') {
      return window.App.resolvePersonMediaUrl(personId, value);
    }
    return resolveSiteUrl(resolvePersonMediaPath(personId, value));
  }

  function prefersLocalPersonMedia(personId) {
    if (typeof window.App?.prefersLocalPersonMedia === 'function') {
      return Boolean(window.App.prefersLocalPersonMedia(personId));
    }
    return LOCAL_MEDIA_PROFILE_IDS.has(String(personId || '').trim());
  }

  function resolvePreferredPersonMedia(personId, mediaEntry = null) {
    if (typeof window.App?.resolvePreferredPersonMedia === 'function') {
      return window.App.resolvePreferredPersonMedia(personId, mediaEntry);
    }

    const local = String(mediaEntry?.local || '').trim();
    const remote = String(mediaEntry?.remote || '').trim();

    if (prefersLocalPersonMedia(personId)) {
      if (local) {
        return { url: resolvePersonMediaUrl(personId, local), sourceType: 'file', local, remote };
      }
      if (remote) {
        return { url: remote, sourceType: 'link', local, remote };
      }
      return { url: '', sourceType: '', local, remote };
    }

    if (remote) {
      return { url: remote, sourceType: 'link', local, remote };
    }
    if (local) {
      return { url: resolvePersonMediaUrl(personId, local), sourceType: 'file', local, remote };
    }
    return { url: '', sourceType: '', local, remote };
  }

  function buildPreferredPersonMediaCanonicalUrl(host, personId, mediaEntry = null) {
    const local = String(mediaEntry?.local || '').trim();
    const remote = String(mediaEntry?.remote || '').trim();
    if (!prefersLocalPersonMedia(personId) && remote) {
      return remote;
    }
    if (local) {
      return buildPersonMediaCanonicalUrl(host, personId, local);
    }
    return remote;
  }

  function buildPersonMediaCanonicalUrl(host, personId, mediaPath = '') {
    const value = String(mediaPath || '').trim();
    if (!value) {
      return '';
    }
    if (hasAbsoluteUrlScheme(value)) {
      return value;
    }
    return `https://${host}/${resolvePersonMediaPath(personId, value).replace(/^\/+/, '')}`;
  }

  async function fetchJson(path) {
    const response = await fetch(resolveSiteUrl(path), { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  async function loadPerson(id) {
    const key = String(id);
    if (personCache.has(key)) {
      return personCache.get(key);
    }
    const promise = fetchJson(`${DB_ROOT}/persons/${bucketForId(id)}/${id}.json`).catch(() => null);
    personCache.set(key, promise);
    return promise;
  }

  // Pets are a SEPARATE parallel database (data/Genepedia-Database/pets) that
  // mirrors the people layout — its own persons/, unions/, and indexes — with its
  // own id sequence starting at 1. This keeps pet ids from colliding with people
  // and lets animals have full family trees of their own (pet unions, children),
  // while still linking back to a person via each pet's `owner` field and the
  // owner's `pets: [petId,...]` array.
  const PETS_DB_ROOT = DB_ROOT.replace(/\/people$/, '/pets');
  const petCache = new Map();
  const petUnionCache = new Map();
  function petRecordPath(id) {
    return `${PETS_DB_ROOT}/persons/${bucketForId(id)}/${id}.json`;
  }
  function petUnionPath(id) {
    return `${PETS_DB_ROOT}/unions/${bucketForId(id)}/${id}.json`;
  }
  async function loadPet(id) {
    const key = String(id);
    if (petCache.has(key)) {
      return petCache.get(key);
    }
    const promise = fetchJson(petRecordPath(id)).catch(() => null);
    petCache.set(key, promise);
    return promise;
  }
  async function loadPetUnion(id) {
    const key = String(id);
    if (petUnionCache.has(key)) {
      return petUnionCache.get(key);
    }
    const promise = fetchJson(petUnionPath(id)).catch(() => null);
    petUnionCache.set(key, promise);
    return promise;
  }
  function primePet(record) {
    if (record && record.id != null) {
      petCache.set(String(record.id), Promise.resolve(record));
    }
    return record;
  }

  async function loadUnion(unionId) {
    const key = String(unionId);
    if (unionCache.has(key)) {
      return unionCache.get(key);
    }
    const promise = fetchJson(`${DB_ROOT}/unions/${bucketForId(unionId)}/${unionId}.json`).catch(() => null);
    unionCache.set(key, promise);
    return promise;
  }

  async function loadSummaryShard(bucket) {
    if (summaryShardCache.has(bucket)) {
      return summaryShardCache.get(bucket);
    }
    const promise = fetchJson(`${DB_ROOT}/index/summary/${bucket}.json`)
      .then((data) => {
        const persons = Array.isArray(data?.persons) ? data.persons : [];
        for (const person of persons) {
          summaryByIdCache.set(String(person.id), person);
        }
        return persons;
      })
      .catch(() => []);
    summaryShardCache.set(bucket, promise);
    return promise;
  }

  async function loadSummary(id) {
    const key = String(id);
    if (summaryByIdCache.has(key)) {
      return summaryByIdCache.get(key);
    }
    await loadSummaryShard(bucketForId(id));
    return summaryByIdCache.get(key) || null;
  }

  /** Resolve display names for a set of related person ids via summary shards. */
  async function resolveNames(ids) {
    const unique = [...new Set(ids.map(String))];
    const buckets = new Set(unique.map((id) => bucketForId(id)));
    await Promise.all([...buckets].map((bucket) => loadSummaryShard(bucket)));
    const map = new Map();
    for (const id of unique) {
      const summary = summaryByIdCache.get(id);
      map.set(id, summary ? summary.name : `Profile ${id}`);
    }
    return map;
  }

  function isPrivateName(name) {
    return /^private\b/i.test(String(name || '').trim());
  }

  function emptyLocationData() {
    return {
      label: '',
      placeName: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      city: '',
      postalCode: '',
      county: '',
      stateProvince: '',
      country: '',
      countryCode: '',
      latitude: '',
      longitude: '',
      source: '',
    };
  }

  function normalizeLocationData(location, fallbackLabel = '') {
    const infobox = window.AppProfileInfobox;
    if (typeof infobox?.normalizeLocationData === 'function') {
      return infobox.normalizeLocationData(location, fallbackLabel);
    }

    const next = emptyLocationData();
    if (location && typeof location === 'object') {
      Object.keys(next).forEach((key) => {
        if (location[key] != null) {
          next[key] = String(location[key]).trim();
        }
      });
    }
    if (!next.label && fallbackLabel) {
      next.label = String(fallbackLabel).trim();
    }
    return next;
  }

  function formatLocationSummary(location, fallbackLabel = '') {
    const infobox = window.AppProfileInfobox;
    if (typeof infobox?.formatLocationSummary === 'function') {
      return infobox.formatLocationSummary(location, fallbackLabel);
    }

    const normalized = normalizeLocationData(location, fallbackLabel);
    const values = [
      normalized.placeName,
      normalized.city,
      normalized.county,
      normalized.stateProvince,
      normalized.country,
      normalized.addressLine1,
      normalized.addressLine2,
      normalized.addressLine3,
      normalized.label,
      String(fallbackLabel || '').trim(),
    ];
    const seen = new Set();
    return values.filter((value) => {
      const text = String(value || '').trim();
      if (!text) return false;
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join(', ');
  }

  function ensureLocationDetails(location, fallbackLabel = '') {
    const infobox = window.AppProfileInfobox;
    const normalized = normalizeLocationData(location, fallbackLabel);
    if (typeof infobox?.ensureLocationDetailsFromSummary === 'function') {
      return infobox.ensureLocationDetailsFromSummary(normalized);
    }
    if (!normalized.placeName) {
      normalized.placeName = normalized.label || String(fallbackLabel || '').trim();
    }
    normalized.label = formatLocationSummary(normalized, fallbackLabel);
    return normalized;
  }

  function hasLocationValue(location) {
    const normalized = normalizeLocationData(location);
    return Object.values(normalized).some((value) => String(value || '').trim());
  }

  function uniqueStrings(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map((value) => String(value || '').trim())
      .filter((value) => {
        if (!value) return false;
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeString(value) {
    const text = String(value || '').trim();
    return text || null;
  }

  function normalizeStringList(value) {
    if (Array.isArray(value)) {
      return uniqueStrings(value);
    }
    if (typeof value === 'string') {
      return uniqueStrings(value.split(','));
    }
    return [];
  }

  function emptyAttributes() {
    return {
      hairColor: null,
      eyeColor: null,
      height: null,
      heightYear: null,
      weight: null,
      weightYear: null,
      ethnicity: null,
      religion: null,
      politicalViews: null,
      languages: [],
      hobbies: [],
      shoeSize: null,
      shoeSizeYear: null,
      smoking: null,
      alcoholUse: null,
      disabilities: [],
      bloodType: null,
      allergies: [],
      handedness: null,
      // Optional year-tagged measurements (editor-managed). The plain field
      // above holds the current value, with *Year for its date; each history
      // entry is { year, value }.
      heightHistory: [],
      weightHistory: [],
      shoeSizeHistory: [],
    };
  }

  function normalizeMeasurementYear(value) {
    const year = Number.parseInt(value, 10);
    return Number.isFinite(year) ? year : null;
  }

  // Normalize a list of { year, value } measurement entries: drop blanks, coerce
  // the year to an integer, and order newest-first.
  function normalizeMeasurementHistory(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    const out = [];
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const yearNum = Number.parseInt(entry.year, 10);
      const year = Number.isFinite(yearNum) ? yearNum : null;
      const value = normalizeString(entry.value);
      if (year == null && !value) {
        continue;
      }
      out.push({ year, value });
    }
    out.sort((a, b) => (b.year || 0) - (a.year || 0));
    return out;
  }

  function normalizeAttributes(attributes) {
    const next = emptyAttributes();
    const source = attributes && typeof attributes === 'object' ? attributes : {};
    next.hairColor = normalizeString(source.hairColor);
    next.eyeColor = normalizeString(source.eyeColor);
    next.height = normalizeString(source.height);
    next.heightYear = next.height ? normalizeMeasurementYear(source.heightYear) : null;
    next.weight = normalizeString(source.weight);
    next.weightYear = next.weight ? normalizeMeasurementYear(source.weightYear) : null;
    next.ethnicity = normalizeString(source.ethnicity);
    next.religion = normalizeString(source.religion);
    next.politicalViews = normalizeString(source.politicalViews);
    next.languages = normalizeStringList(source.languages);
    next.hobbies = normalizeStringList(source.hobbies);
    next.shoeSize = normalizeString(source.shoeSize);
    next.shoeSizeYear = next.shoeSize ? normalizeMeasurementYear(source.shoeSizeYear) : null;
    next.smoking = normalizeString(source.smoking);
    next.alcoholUse = normalizeString(source.alcoholUse);
    next.disabilities = normalizeStringList(source.disabilities);
    next.bloodType = normalizeString(source.bloodType);
    next.allergies = normalizeStringList(source.allergies);
    next.handedness = normalizeString(source.handedness);
    next.heightHistory = normalizeMeasurementHistory(source.heightHistory);
    next.weightHistory = normalizeMeasurementHistory(source.weightHistory);
    next.shoeSizeHistory = normalizeMeasurementHistory(source.shoeSizeHistory);
    return next;
  }

  function toPersonalData(record) {
    return normalizeAttributes(record?.attributes);
  }

  function applyPersonalToRecord(record, data) {
    const next = record && typeof record === 'object' ? record : emptyRecord(data?.id || 0);
    next.attributes = normalizeAttributes(data);
    next.generatedAt = new Date().toISOString();
    return next;
  }

  function normalizeEducationSourceTag(value) {
    return String(value || '').trim().toUpperCase() === 'GRAD' ? 'GRAD' : 'EDUC';
  }

  function normalizeEducationPrecision(value) {
    const precision = String(value || '').trim().toLowerCase();
    return ['exact', 'before', 'after', 'about', 'between'].includes(precision) ? precision : 'exact';
  }

  function normalizeEducationEntry(entry, index = 0) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const id = String(source.id || `edu-${index + 1}`).trim() || `edu-${index + 1}`;
    const location = source.location || source.place
      ? ensureLocationDetails(source.location, source.place || '')
      : null;
    const normalizedLocation = location && hasLocationValue(location) ? location : null;
    const iso = normalizeString(source.iso);
    const date = normalizeString(source.date) || iso;
    const isoTo = normalizeString(source.isoTo);
    const dateTo = normalizeString(source.dateTo) || isoTo;
    const year = iso && /^\d{4}/.test(iso)
      ? Number(iso.slice(0, 4)) || null
      : (Number(source.year) || null);
    const place = normalizedLocation
      ? formatLocationSummary(normalizedLocation, source.place || '') || null
      : normalizeString(source.place);

    return {
      id,
      sourceTag: normalizeEducationSourceTag(source.sourceTag),
      type: normalizeString(source.type) || null,
      title: normalizeString(source.title || source.qualification || source.award || source.study),
      date,
      year,
      iso,
      precision: normalizeEducationPrecision(source.precision),
      isoTo,
      dateTo,
      display: normalizeString(source.display),
      place,
      location: normalizedLocation,
      note: normalizeString(source.note || source.notes || source.description),
    };
  }

  function normalizeEducationList(value) {
    const entries = Array.isArray(value) ? value : [];
    return entries
      .map((entry, index) => normalizeEducationEntry(entry, index))
      .filter((entry) => entry.title || entry.place || entry.iso || entry.note);
  }

  function toEducationData(record) {
    return normalizeEducationList(record?.education);
  }

  function applyEducationToRecord(record, data) {
    const next = record && typeof record === 'object' ? record : emptyRecord(data?.id || 0);
    next.education = normalizeEducationList(data);
    next.generatedAt = new Date().toISOString();
    return next;
  }

  function normalizeCareerSourceTag(value) {
    return String(value || '').trim().toUpperCase() === 'OCCU' ? 'OCCU' : 'WORK';
  }

  function normalizeCareerEntry(entry, index = 0) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const id = String(source.id || `career-${index + 1}`).trim() || `career-${index + 1}`;
    const location = source.location || source.place || source.company || source.employer
      ? ensureLocationDetails(source.location, source.place || source.company || source.employer || '')
      : null;
    const normalizedLocation = location && hasLocationValue(location) ? location : null;
    const iso = normalizeString(source.iso);
    const date = normalizeString(source.date) || iso;
    const isoTo = normalizeString(source.isoTo);
    const dateTo = normalizeString(source.dateTo) || isoTo;
    const year = iso && /^\d{4}/.test(iso)
      ? Number(iso.slice(0, 4)) || null
      : (Number(source.year) || null);
    const place = normalizedLocation
      ? formatLocationSummary(normalizedLocation, source.place || source.company || source.employer || '') || null
      : normalizeString(source.place || source.company || source.employer || source.organization);

    return {
      id,
      sourceTag: normalizeCareerSourceTag(source.sourceTag),
      type: normalizeString(source.type) || null,
      title: normalizeString(source.title || source.role || source.position || source.occupation),
      date,
      year,
      iso,
      precision: normalizeEducationPrecision(source.precision),
      isoTo,
      dateTo,
      display: normalizeString(source.display),
      place,
      location: normalizedLocation,
      note: normalizeString(source.note || source.notes || source.description),
    };
  }

  function normalizeCareerList(value) {
    const entries = Array.isArray(value) ? value : [];
    return entries
      .map((entry, index) => normalizeCareerEntry(entry, index))
      .filter((entry) => entry.title || entry.place || entry.iso || entry.note);
  }

  function careerDateRank(entry, index = 0) {
    const iso = normalizeString(entry?.iso);
    const isoTo = normalizeString(entry?.isoTo);
    const year = Number(entry?.year) || 0;
    const start = iso && /^\d{4}/.test(iso)
      ? Number(iso.replace(/[^0-9]/g, '').padEnd(8, '0').slice(0, 8)) || 0
      : (year ? year * 10000 : 0);
    const end = isoTo && /^\d{4}/.test(isoTo)
      ? Number(isoTo.replace(/[^0-9]/g, '').padEnd(8, '0').slice(0, 8)) || 0
      : 0;
    const currentBoost = start && !end ? 30000000 : 0;
    return (end || start || index) + currentBoost;
  }

  function deriveLatestCareerOccupation(career) {
    const entries = normalizeCareerList(career).filter((entry) => normalizeString(entry.title));
    if (!entries.length) {
      return '';
    }
    const latest = entries.reduce((best, entry, index) => {
      const rank = careerDateRank(entry, index + 1);
      if (!best || rank >= best.rank) {
        return { entry, rank };
      }
      return best;
    }, null);
    return normalizeString(latest?.entry?.title);
  }

  function toCareerData(record) {
    return normalizeCareerList(record?.career);
  }

  function applyCareerToRecord(record, data) {
    const next = record && typeof record === 'object' ? record : emptyRecord(data?.id || 0);
    next.career = normalizeCareerList(data);
    next.occupation = deriveLatestCareerOccupation(next.career) || null;
    next.generatedAt = new Date().toISOString();
    return next;
  }

  // ---- Pets (standalone profiles flagged kind:'pet') ------------------------

  function normalizePetSex(value) {
    const sex = String(value || '').trim().toLowerCase();
    return ['male', 'female', 'intersex'].includes(sex) ? sex : 'unknown';
  }

  function normalizePetEvent(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const iso = normalizeString(value.iso || value.date);
    const place = normalizeString(value.place);
    if (!iso && !place) {
      return null;
    }
    const year = iso && /^\d{4}/.test(iso)
      ? Number(iso.slice(0, 4)) || null
      : (Number(value.year) || null);
    return {
      date: normalizeString(value.date) || iso || null,
      year,
      iso: iso || null,
      precision: normalizeEducationPrecision(value.precision),
      display: normalizeString(value.display) || null,
      place: place || null,
    };
  }

  /**
   * Empty animal record. Mirrors the person record's top-level shape (so pets get
   * profiles, infoboxes, tree nodes, and their own unions/relationships) but the
   * identity and attribute fields are animal-specific — no occupation, education,
   * career, religion, baptism/burial, hair/eye/shoe-size, etc.
   */
  function emptyPetRecord(id) {
    return {
      id: Number(id),
      schema: 'genepedia/animal@1',
      kind: 'pet',
      slug: `pet-${id}`,
      species: '',
      breed: '',
      owner: null,
      names: { display: '', callName: '', registeredName: '', aliases: [] },
      sex: 'unknown',
      desexed: null,
      living: false,
      // Animal life events: born/died, when acquired, and desexing (neuter/spay).
      events: { birth: null, death: null, adoption: null, desexing: null },
      // Physical + husbandry traits relevant to animals.
      attributes: {
        color: null,
        coat: null,
        markings: null,
        eyeColor: null,
        weight: null,
        weightHistory: [],
        height: null,
        heightHistory: [],
        temperament: null,
        microchipId: null,
        registrationNumber: null,
        vaccinated: null,
        allergies: [],
        conditions: [],
      },
      // Titles/classes (analogous to education) and show results (analogous to career).
      training: [],
      awards: [],
      media: { primary: null, items: [] },
      about: { hasNarrative: false },
      // Animal family — built from the pets database's own unions.
      relationships: {
        parents: [], spouses: [], exSpouses: [], children: [], siblings: [],
        parentUnions: [], spouseUnions: [], parentLinks: [], partnerLinks: [], childLinks: [],
      },
      source: {},
      page: { route: `pages/pets/${id}/`, canonical: `https://www.genepedia.org/pages/pets/${id}/` },
      generatedAt: new Date().toISOString(),
    };
  }

  /** Build an animal record (kind:'pet') from editor form data. */
  function buildPetRecord(id, data = {}) {
    const record = emptyPetRecord(id);
    const name = normalizeString(data.name) || `Pet ${id}`;
    record.species = normalizeString(data.species);
    record.breed = normalizeString(data.breed);
    record.owner = data.owner != null && String(data.owner).trim() !== '' ? data.owner : null;
    record.slug = slugifyName(name, id);
    record.names = {
      display: name,
      callName: normalizeString(data.callName) || name,
      registeredName: normalizeString(data.registeredName),
      aliases: [],
    };
    record.sex = normalizePetSex(data.sex);
    record.desexed = data.desexed == null ? null : Boolean(data.desexed);
    record.living = !normalizePetEvent(data.events?.death);
    record.events = {
      birth: normalizePetEvent(data.events?.birth),
      death: normalizePetEvent(data.events?.death),
      adoption: normalizePetEvent(data.events?.adoption),
      desexing: normalizePetEvent(data.events?.desexing),
    };
    record.attributes = {
      ...record.attributes,
      color: normalizeString(data.color) || null,
      coat: normalizeString(data.coat) || null,
      markings: normalizeString(data.markings) || null,
      eyeColor: normalizeString(data.eyeColor) || null,
      weight: normalizeString(data.weight) || null,
      temperament: normalizeString(data.temperament) || null,
      microchipId: normalizeString(data.microchip || data.microchipId) || null,
      registrationNumber: normalizeString(data.registrationNumber) || null,
    };
    // Preserve animal-family relationships when rebuilding an existing pet.
    if (data.relationships && typeof data.relationships === 'object') {
      record.relationships = { ...record.relationships, ...data.relationships };
    }
    if (normalizeString(data.notes)) {
      record.about = { hasNarrative: true };
    }
    return record;
  }

  /** Extract editor form data from an existing animal record. */
  function toPetData(record) {
    const attrs = record?.attributes || {};
    return {
      id: record?.id,
      name: record?.names?.display || record?.names?.callName || '',
      registeredName: record?.names?.registeredName || '',
      species: record?.species || '',
      breed: record?.breed || '',
      sex: normalizePetSex(record?.sex),
      color: attrs.color || '',
      microchip: attrs.microchipId || '',
      events: {
        birth: normalizePetEvent(record?.events?.birth),
        death: normalizePetEvent(record?.events?.death),
        adoption: normalizePetEvent(record?.events?.adoption),
      },
    };
  }

  function isPetRecord(record) {
    return record?.kind === 'pet';
  }

  // ---- Infobox (identity) rendering from a person record --------------------

  function toInfoboxData(record) {
    const infobox = window.AppProfileInfobox;
    const data = infobox ? infobox.emptyData() : {};
    const names = record.names || {};
    data.title = '';
    data.firstName = names.given || '';
    data.lastName = names.surname || '';
    data.birthSurname = names.birthSurname || '';
    data.displayName = names.display || '';
    data.alsoKnownAs = [names.nick, ...(names.aliases || [])].filter(Boolean);
    data.gender = ['male', 'female', 'intersex'].includes(record.sex) ? record.sex : 'unknown';
    data.occupation = deriveLatestCareerOccupation(record.career);
    data.lastResidenceLocation = ensureLocationDetails(record.lastResidenceLocation, record.lastResidence || '');
    data.lastResidence = formatLocationSummary(data.lastResidenceLocation, record.lastResidence || '');

    const hasDeath = Boolean(record.events?.death);
    data.status = hasDeath ? 'deceased' : (record.living ? 'living' : 'unknown');

    const applyEvent = (target, event) => {
      if (!event) {
        return;
      }
      target.date = event.iso || (event.year ? String(event.year) : '');
      target.precision = event.precision || 'exact';
      target.circa = event.precision === 'about';
      target.location = ensureLocationDetails(event.location, event.place || '');
      target.place = formatLocationSummary(target.location, event.place || '');
    };
    applyEvent(data.birth, record.events?.birth);
    applyEvent(data.baptism, record.events?.baptism);
    applyEvent(data.death, record.events?.death);
    applyEvent(data.burial, record.events?.burial);
    if (record.events?.death?.cause) {
      data.death.cause = record.events.death.cause;
    }
    if (record.events?.burial?.type) {
      data.burial.type = record.events.burial.type;
    }

    const primary = record.media?.primary;
    if (primary) {
      data.photo = {
        src: resolvePreferredPersonMedia(record.id, primary).url || '',
        alt: names.display || '',
      };
    }
    return infobox ? infobox.normalizeData(data) : data;
  }

  const ROLE_WORDS = {
    parent: { male: 'Son', female: 'Daughter', unknown: 'Child' },
    spouse: { male: 'Husband', female: 'Wife', unknown: 'Spouse' },
    exSpouse: { male: 'Ex-husband', female: 'Ex-wife', unknown: 'Former spouse' },
    child: { male: 'Father', female: 'Mother', unknown: 'Parent' },
    sibling: { male: 'Brother', female: 'Sister', unknown: 'Sibling' },
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function familyLifeSpan(summary, record) {
    const birth = summary?.birthYear ?? record?.events?.birth?.year ?? null;
    const death = summary?.deathYear ?? record?.events?.death?.year ?? null;
    if (birth && death) {
      const age = death - birth;
      return age > 0 && age < 130 ? `${birth}–${death} (aged ${age})` : `${birth}–${death}`;
    }
    if (birth) return `b. ${birth}`;
    if (death) return `d. ${death}`;
    return '';
  }

  function personLink(id, name) {
    if (isPrivateName(name)) {
      return '<span class="profile-private">private</span>';
    }
    const safeId = escapeHtml(String(id));
    return `<a class="gp-person-link" href="../${safeId}/index.html" data-person-id="${safeId}">${escapeHtml(name)}</a>`;
  }

  function joinPeople(pairs) {
    const parts = pairs.map(([id, name]) => personLink(id, name)).filter(Boolean);
    if (parts.length <= 1) {
      return parts.join('');
    }
    if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`;
    }
    return `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`;
  }

  // Pet (animal) link — marked with data-pet-id so the hover card resolves from
  // the pets database, not the people database (where the same id is a person).
  function petLink(id, name) {
    const safeId = escapeHtml(String(id));
    return `<a class="gp-person-link" href="../${safeId}/index.html" data-pet-id="${safeId}">${escapeHtml(name)}</a>`;
  }

  function joinPets(pairs) {
    const parts = pairs.map(([id, name]) => petLink(id, name)).filter(Boolean);
    if (parts.length <= 1) {
      return parts.join('');
    }
    if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`;
    }
    return `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`;
  }

  /** Hover-card detail for an animal, resolved from the pets database. */
  async function getPetCardInfo(id) {
    const key = String(id);
    const record = await loadPet(key).catch(() => null);
    if (!record) {
      return null;
    }
    const names = record.names || {};
    const name = names.display || names.callName || `Pet ${key}`;
    const eventDetail = (event) => {
      if (!event) return null;
      const date = event.display || event.date || (event.year ? String(event.year) : '');
      const place = String(event.place || event.location?.label || '').trim();
      return (date || place) ? { date, place } : null;
    };
    const rel = record.relationships || {};
    const countIds = (...lists) => {
      const seen = new Set();
      for (const list of lists) {
        for (const entry of (Array.isArray(list) ? list : [])) {
          const cid = String((entry && typeof entry === 'object' ? entry.id : entry) || '').trim();
          if (cid) seen.add(cid);
        }
      }
      return seen.size;
    };
    const birthYear = record.events?.birth?.year;
    const deathYear = record.events?.death?.year;
    const primary = record.media?.primary;
    return {
      id: key,
      name,
      isPet: true,
      photo: primary ? (resolvePreferredPersonMedia(key, primary).url || '') : '',
      lifeSpan: birthYear && deathYear ? `${birthYear}–${deathYear}` : (birthYear ? `b. ${birthYear}` : (deathYear ? `d. ${deathYear}` : '')),
      gender: ['male', 'female', 'intersex'].includes(record.sex) ? record.sex : '',
      alsoKnownAs: [names.registeredName].map((v) => String(v || '').trim()).filter(Boolean),
      born: eventDetail(record.events?.birth),
      died: eventDetail(record.events?.death),
      // Species/breed surfaces in the card's free-text row.
      occupation: [record.species, record.breed].filter(Boolean).join(' · '),
      childrenCount: countIds(rel.children, rel.childLinks),
      spouseCount: countIds(rel.spouses, rel.partnerLinks),
    };
  }

  // Structured detail for a single person, used by the immediate-family hover
  // card. Records and summaries are cached, so repeat hovers cost nothing.
  // Returns null for private people so no detail leaks into the preview.
  async function getPersonCardInfo(id) {
    const key = String(id);
    const [record, summary] = await Promise.all([
      loadPerson(key).catch(() => null),
      loadSummary(key).catch(() => null),
    ]);
    const names = record?.names || {};
    const name = names.display || summary?.name || `Profile ${key}`;
    if (isPrivateName(name)) {
      return null;
    }
    const eventDetail = (event) => {
      if (!event) {
        return null;
      }
      const date = event.display || event.date || (event.year ? String(event.year) : '');
      const place = String(event.place || event.location?.label || '').trim();
      const cause = String(event.cause || '').trim();
      return (date || place || cause) ? { date, place, cause } : null;
    };
    // "Also known as" — nicknames/aliases, minus internal id-like tokens (geni
    // exports sometimes store a guid in `nick`).
    const looksLikeId = (value) => /^[a-z0-9]+$/i.test(value) && /\d/.test(value);
    const aka = [names.nick, ...(Array.isArray(names.aliases) ? names.aliases : [])]
      .map((value) => String(value || '').trim())
      .filter((value) => value && value !== name && !looksLikeId(value));
    const rel = record?.relationships || {};
    const countIds = (...lists) => {
      const seen = new Set();
      for (const list of lists) {
        for (const entry of (Array.isArray(list) ? list : [])) {
          const cid = String((entry && typeof entry === 'object' ? entry.id : entry) || '').trim();
          if (cid) seen.add(cid);
        }
      }
      return seen.size;
    };
    const primary = record?.media?.primary;
    return {
      id: key,
      name,
      photo: primary ? (resolvePreferredPersonMedia(key, primary).url || '') : '',
      lifeSpan: familyLifeSpan(summary, record),
      gender: ['male', 'female', 'intersex'].includes(record?.sex) ? record.sex : '',
      alsoKnownAs: [...new Set(aka)],
      born: eventDetail(record?.events?.birth),
      baptism: eventDetail(record?.events?.baptism),
      died: eventDetail(record?.events?.death),
      buried: eventDetail(record?.events?.burial),
      occupation: deriveLatestCareerOccupation(record?.career),
      residence: String(record?.lastResidence || record?.lastResidenceLocation?.label || '').trim(),
      childrenCount: countIds(rel.children, rel.childLinks),
      spouseCount: countIds(rel.spouses, rel.partnerLinks),
    };
  }

  async function buildImmediateFamilyHtml(record) {
    // Only show immediate-family when there are explicit relationships recorded.
    // Previously we unconditionally rendered `record.familyHtml` which caused
    // hand-authored profile prose to display family lists even when the person
    // had no linked relationships in the canonical DB. To ensure the identity
    // box reflects the family tree, ignore `familyHtml` unless relationships
    // are present.
    const rel = record.relationships || {};
    const parentLinks = (Array.isArray(rel.parentLinks) && rel.parentLinks.length)
      ? rel.parentLinks
      : (rel.parents || []).map((id) => ({ id, type: 'biological' }));
    let childLinks = (Array.isArray(rel.childLinks) && rel.childLinks.length)
      ? rel.childLinks
      : (rel.children || []).map((id) => ({ id, type: 'biological' }));
    // Pets are linked like children but shown only in the family tree, not the
    // human immediate-family list. Drop any child whose summary marks it a pet.
    try {
      const childKinds = await Promise.all(childLinks.map((cl) => loadSummary(String(cl.id)).then((s) => s?.kind).catch(() => null)));
      childLinks = childLinks.filter((cl, index) => childKinds[index] !== 'pet');
    } catch (e) {
      // ignore summary lookup failures — fall back to showing all children
    }
    const partnerLinks = (Array.isArray(rel.partnerLinks) && rel.partnerLinks.length)
      ? rel.partnerLinks
      : [
        ...(rel.spouses || []).map((id) => ({ id, role: 'spouse' })),
        ...(rel.exSpouses || []).map((id) => ({ id, role: 'ex-spouse' })),
      ];
    const siblingIds = (rel.siblings || []).map((id) => String(id)).filter(Boolean);

    // Classify siblings as full vs half. Full siblings share the person's own
    // parental union(s) (both parents); half-siblings are children of a parent's
    // *other* union (one shared parent). The union walk also augments the
    // explicit sibling list, so older imports that only recorded union members
    // still show everyone on the live site.
    const selfId = String(record.id);
    const focusParentUnionIds = new Set(
      (Array.isArray(rel.parentUnions) ? rel.parentUnions : [])
        .map((u) => String(u || '').trim())
        .filter(Boolean),
    );
    const fullSet = new Set();
    const halfSet = new Set();
    try {
      const parentIds = (parentLinks || []).map((pl) => String(pl?.id || '').trim()).filter(Boolean);
      // Every union touching a parent: the person's parental unions (full) plus
      // each parent's other unions (half).
      const unionIdSet = new Set(focusParentUnionIds);
      if (parentIds.length) {
        const parentRecords = await Promise.all(parentIds.map((pid) => loadPerson(pid)));
        for (const parentRec of parentRecords) {
          const spouseUnions = parentRec?.relationships?.spouseUnions;
          if (!Array.isArray(spouseUnions)) continue;
          for (const uid of spouseUnions) {
            const u = String(uid || '').trim();
            if (u) unionIdSet.add(u);
          }
        }
      }
      const unionPairs = await Promise.all(
        [...unionIdSet].map(async (uid) => [uid, await loadUnion(uid).catch(() => null)]),
      );
      for (const [uid, union] of unionPairs) {
        if (!union || !Array.isArray(union.children)) continue;
        const isFullUnion = focusParentUnionIds.has(uid);
        for (const cid of union.children) {
          const idStr = String(cid || '').trim();
          if (!idStr || idStr === selfId) continue;
          if (isFullUnion) {
            fullSet.add(idStr);
          } else {
            halfSet.add(idStr);
          }
        }
      }
    } catch (e) {
      // ignore parent/union loading errors — fall back to the explicit list
    }
    // Full always wins over half. Without a known parental union we can't tell
    // them apart, so fall back to treating everyone as a plain sibling.
    for (const id of fullSet) halfSet.delete(id);
    if (!focusParentUnionIds.size) {
      for (const id of halfSet) fullSet.add(id);
      halfSet.clear();
    }
    const finalSiblingIds = [...new Set([...siblingIds, ...fullSet, ...halfSet])];
    const allIds = [
      ...parentLinks.map((entry) => entry?.id),
      ...partnerLinks.map((entry) => entry?.id),
      ...childLinks.map((entry) => entry?.id),
      ...finalSiblingIds,
    ]
      .map((id) => String(id || '').trim())
      .filter(Boolean);
    if (!allIds.length) {
      return '';
    }
    const names = await resolveNames(allIds);
    const sex = record.sex || 'unknown';
    const role = (kind) => ROLE_WORDS[kind][sex] || ROLE_WORDS[kind].unknown;
    const dedupeEntries = (entries, keyFor) => {
      const seen = new Set();
      return (entries || []).filter((entry) => {
        const id = String(entry?.id || '').trim();
        if (!id) {
          return false;
        }
        const key = keyFor(entry, id);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    };
    const groupedPairs = (entries, phraseFor) => {
      const groups = new Map();
      for (const entry of entries) {
        const id = String(entry?.id || '').trim();
        if (!id) {
          continue;
        }
        const phrase = phraseFor(entry);
        if (!groups.has(phrase)) {
          groups.set(phrase, []);
        }
        groups.get(phrase).push([id, names.get(id) || `Profile ${id}`]);
      }
      return groups;
    };
    const parentPhrase = (entry) => {
      const childWord = role('parent').toLowerCase();
      const custom = String(entry?.label || '').trim();
      switch (String(entry?.type || '').trim().toLowerCase()) {
        case 'adopted':
          return `Adopted ${childWord} of`;
        case 'foster':
          return `Foster ${childWord} of`;
        case 'step':
          return `Step${childWord} of`;
        case 'guardian':
          return 'Ward of';
        case 'other':
          return custom ? `${custom} of` : `${role('parent')} of`;
        case 'biological':
        default:
          return `${role('parent')} of`;
      }
    };
    const childPhrase = (entry) => {
      const parentWord = role('child').toLowerCase();
      const custom = String(entry?.label || '').trim();
      switch (String(entry?.type || '').trim().toLowerCase()) {
        case 'adopted':
          return `Adoptive ${parentWord} of`;
        case 'foster':
          return `Foster ${parentWord} of`;
        case 'step':
          return `Step${parentWord} of`;
        case 'guardian':
          return 'Guardian of';
        case 'other':
          return custom ? `${custom} of` : `${role('child')} of`;
        case 'biological':
        default:
          return `${role('child')} of`;
      }
    };
    const partnerPhrase = (entry) => {
      const custom = String(entry?.label || '').trim();
      switch (String(entry?.role || '').trim().toLowerCase()) {
        case 'wife':
          return 'Husband of';
        case 'husband':
          return 'Wife of';
        case 'partner':
          return 'Partner of';
        case 'fiance':
        case 'fiancee':
          return 'Engaged to';
        case 'ex-wife':
        case 'ex-husband':
        case 'ex-spouse':
          return 'Divorced from';
        case 'ex-partner':
        case 'former-partner':
          return 'Former partner of';
        case 'other':
          return custom ? `${custom} of` : `${role('spouse')} of`;
        case 'spouse':
        default:
          return `${role('spouse')} of`;
      }
    };
    const lines = [];
    const parentGroups = groupedPairs(dedupeEntries(parentLinks, (entry, id) => `${id}|${entry?.unionId || ''}|${entry?.type || ''}|${entry?.label || ''}`), parentPhrase);
    const partnerGroups = groupedPairs(dedupeEntries(partnerLinks, (entry, id) => `${id}|${entry?.unionId || ''}|${entry?.role || ''}|${entry?.label || ''}`), partnerPhrase);
    const childGroups = groupedPairs(dedupeEntries(childLinks, (entry, id) => `${id}|${entry?.unionId || ''}|${entry?.type || ''}|${entry?.label || ''}`), childPhrase);
    for (const [phrase, pairs] of parentGroups.entries()) {
      lines.push(`<p>${phrase} ${joinPeople(pairs)}</p>`);
    }
    for (const [phrase, pairs] of partnerGroups.entries()) {
      lines.push(`<p>${phrase} ${joinPeople(pairs)}</p>`);
    }
    for (const [phrase, pairs] of childGroups.entries()) {
      lines.push(`<p>${phrase} ${joinPeople(pairs)}</p>`);
    }
    if (finalSiblingIds.length) {
      const isHalf = (id) => halfSet.has(id) && !fullSet.has(id);
      const toPair = (id) => [id, names.get(id) || `Profile ${id}`];
      const fullPairs = finalSiblingIds.filter((id) => !isHalf(id)).map(toPair);
      const halfPairs = finalSiblingIds.filter(isHalf).map(toPair);
      if (fullPairs.length) {
        lines.push(`<p>${role('sibling')} of ${joinPeople(fullPairs)}</p>`);
      }
      if (halfPairs.length) {
        lines.push(`<p>Half-${role('sibling').toLowerCase()} of ${joinPeople(halfPairs)}</p>`);
      }
    }
    if (!lines.length) {
      return '';
    }
    return `<table-immediate-family>\n        ${lines.join('\n        ')}\n    </table-immediate-family>`;
  }

  /** Full <profile-identity> infobox fragment HTML, rendered from the DB record. */
  async function buildInfoboxFragment(idOrRecord) {
    const record = typeof idOrRecord === 'object' ? idOrRecord : await loadPerson(idOrRecord);
    if (!record) {
      return '';
    }
    if (record.kind === 'pet') {
      return buildPetInfoboxFragment(record);
    }
    const infobox = window.AppProfileInfobox;
    if (!infobox) {
      return '';
    }
    const data = toInfoboxData(record);
    const familyHtml = await buildImmediateFamilyHtml(record);
    return infobox.buildFragment(data, familyHtml);
  }

  // Map an animal record onto the infobox's data shape (call name → first name,
  // registered name → also-known-as, species/breed handled as extra rows).
  function toPetInfoboxData(record) {
    const infobox = window.AppProfileInfobox;
    const data = infobox ? infobox.emptyData() : {};
    const names = record.names || {};
    data.title = '';
    data.firstName = names.callName || names.display || '';
    data.lastName = '';
    data.displayName = names.display || names.callName || '';
    data.alsoKnownAs = [names.registeredName, ...(names.aliases || [])].filter(Boolean);
    data.gender = ['male', 'female', 'intersex'].includes(record.sex) ? record.sex : 'unknown';
    data.status = record.events?.death ? 'deceased' : (record.living ? 'living' : 'unknown');
    const applyEvent = (target, event) => {
      if (!event) return;
      target.date = event.iso || (event.year ? String(event.year) : '');
      target.precision = event.precision || 'exact';
      target.circa = event.precision === 'about';
      target.location = ensureLocationDetails(event.location, event.place || '');
      target.place = formatLocationSummary(target.location, event.place || '');
    };
    applyEvent(data.birth, record.events?.birth);
    applyEvent(data.death, record.events?.death);
    const primary = record.media?.primary;
    if (primary) {
      data.photo = { src: resolvePreferredPersonMedia(record.id, primary).url || '', alt: names.display || '' };
    }
    return infobox ? infobox.normalizeData(data) : data;
  }

  // Immediate-family rows for an animal, resolved from the PETS database (so a
  // pet's relatives are other pets, never people with the same ids).
  async function buildPetImmediateFamilyHtml(record) {
    const rel = record.relationships || {};
    const ids = [...new Set([
      ...(rel.parents || []), ...(rel.spouses || []), ...(rel.children || []), ...(rel.siblings || []),
    ].map((x) => String(x).trim()).filter(Boolean))];
    if (!ids.length) {
      return '';
    }
    const nameById = new Map();
    await Promise.all(ids.map(async (id) => {
      const pet = await loadPet(id).catch(() => null);
      nameById.set(id, pet?.names?.display || `Pet ${id}`);
    }));
    const sex = record.sex || 'unknown';
    const role = (kind) => ROLE_WORDS[kind][sex] || ROLE_WORDS[kind].unknown;
    const pairs = (list) => (list || []).map((id) => String(id).trim()).filter(Boolean).map((id) => [id, nameById.get(id) || `Pet ${id}`]);
    const lines = [];
    if (rel.parents?.length) lines.push(`<p>${role('parent')} of ${joinPets(pairs(rel.parents))}</p>`);
    if (rel.spouses?.length) lines.push(`<p>${role('spouse')} of ${joinPets(pairs(rel.spouses))}</p>`);
    if (rel.children?.length) lines.push(`<p>${role('child')} of ${joinPets(pairs(rel.children))}</p>`);
    if (rel.siblings?.length) lines.push(`<p>${role('sibling')} of ${joinPets(pairs(rel.siblings))}</p>`);
    if (!lines.length) {
      return '';
    }
    return `<table-immediate-family>\n        ${lines.join('\n        ')}\n    </table-immediate-family>`;
  }

  /** <profile-identity> infobox for an animal: identity + species/breed/owner. */
  async function buildPetInfoboxFragment(record) {
    const infobox = window.AppProfileInfobox;
    if (!infobox || !record) {
      return '';
    }
    const data = toPetInfoboxData(record);
    const familyHtml = await buildPetImmediateFamilyHtml(record);
    let fragment = infobox.buildFragment(data, familyHtml);

    // buildFragment falls back to a person-silhouette photo; drop it for a pet
    // that has no portrait of its own (rather than show a human placeholder).
    if (!record.media?.primary) {
      fragment = fragment.replace(/\s*<table-photo>[\s\S]*?<\/table-photo>/, '');
    }

    const extra = [];
    if (record.species) extra.push(`    <table-species>${escapeHtml(record.species)}</table-species>`);
    if (record.breed) extra.push(`    <table-breed>${escapeHtml(record.breed)}</table-breed>`);
    const attrs = record.attributes || {};
    if (attrs.color) extra.push(`    <table-color>${escapeHtml(attrs.color)}</table-color>`);
    if (attrs.microchipId) extra.push(`    <table-microchip>${escapeHtml(attrs.microchipId)}</table-microchip>`);
    if (record.owner != null && String(record.owner).trim() !== '') {
      const owner = await loadPerson(record.owner).catch(() => null);
      const ownerName = owner?.names?.display || `Profile ${record.owner}`;
      const ownerHref = resolveSiteUrl(`pages/people/${record.owner}/index.html`);
      extra.push(`    <table-owner><a class="gp-person-link" href="${escapeHtml(ownerHref)}" data-person-id="${escapeHtml(String(record.owner))}">${escapeHtml(ownerName)}</a></table-owner>`);
    }
    if (extra.length) {
      // Slot the animal-specific rows right after the gender row.
      fragment = fragment.includes('</table-gender>')
        ? fragment.replace('</table-gender>', `</table-gender>\n${extra.join('\n')}`)
        : fragment.replace('</profile-identity>', `${extra.join('\n')}\n</profile-identity>`);
    }
    return fragment;
  }

  // ---- Canonical media helpers --------------------------------------------

  function mediaItemKey(item) {
    if (!item || typeof item !== 'object') {
      return '';
    }
    return String(item.local || item.remote || '').trim();
  }

  function resolveRecordMediaUrl(personId, item) {
    return resolvePreferredPersonMedia(personId, item).url;
  }

  function mediaCaption(item) {
    const title = String(item?.title || item?.alt || '').trim();
    if (title) {
      return title;
    }
    const raw = String(item?.local || item?.remote || '').split('?')[0];
    const fileName = decodeURIComponent((raw.split('/').pop() || '').trim());
    return fileName ? fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') : 'Media';
  }

  function normalizeMediaItems(record, personId) {
    const items = [];
    const seen = new Set();
    for (const item of record?.media?.items || []) {
      const key = mediaItemKey(item);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const preferred = resolvePreferredPersonMedia(personId, item);
      items.push({
        key,
        name: String(item.local || item.remote || '').split('?')[0].split('/').pop() || key,
        url: preferred.url,
        title: mediaCaption(item),
        local: String(item.local || '').trim(),
        remote: String(item.remote || '').trim(),
        primary: Boolean(item.primary),
        sourceType: preferred.sourceType || (item.local ? 'file' : 'link'),
      });
    }

    const primary = record?.media?.primary;
    const primaryKey = primary ? String(primary.local || primary.remote || '').trim() : '';
    if (primaryKey && !seen.has(primaryKey)) {
      const preferred = resolvePreferredPersonMedia(personId, primary);
      items.unshift({
        key: primaryKey,
        name: String(primary.local || primary.remote || '').split('?')[0].split('/').pop() || primaryKey,
        url: preferred.url,
        title: String(primary.alt || '').trim() || mediaCaption(primary),
        local: String(primary.local || '').trim(),
        remote: String(primary.remote || '').trim(),
        primary: true,
        sourceType: preferred.sourceType || (primary.local ? 'file' : 'link'),
      });
    }

    return items;
  }

  function upsertMediaItem(record, item, { setPrimary = false } = {}) {
    if (!record || !item) {
      return record;
    }
    record.media = record.media || { primary: null, items: [] };
    record.media.items = Array.isArray(record.media.items) ? record.media.items : [];
    const key = mediaItemKey(item);
    if (!key) {
      return record;
    }

    let match = record.media.items.find((entry) => mediaItemKey(entry) === key) || null;
    if (!match) {
      match = { local: null, remote: null, title: '', form: '', primary: false };
      record.media.items.push(match);
    }
    match.local = item.local ? String(item.local).replace(/^\.?\//, '') : null;
    match.remote = item.remote ? String(item.remote).trim() : null;
    match.title = String(item.title || match.title || '').trim();
    if (item.form != null) {
      match.form = String(item.form || '').trim();
    }

    if (setPrimary) {
      for (const entry of record.media.items) {
        entry.primary = mediaItemKey(entry) === key;
      }
      record.media.primary = {
        local: match.local || null,
        remote: match.remote || null,
        alt: String(item.alt || record.names?.display || '').trim(),
      };
    }

    return record;
  }

  function removeMediaItem(record, itemKey) {
    if (!record || !itemKey) {
      return record;
    }
    record.media = record.media || { primary: null, items: [] };
    record.media.items = (record.media.items || []).filter((entry) => mediaItemKey(entry) !== String(itemKey).trim());
    const primaryKey = String(record.media?.primary?.local || record.media?.primary?.remote || '').trim();
    if (primaryKey === String(itemKey).trim()) {
      const nextPrimary = record.media.items.find((entry) => entry.primary) || record.media.items[0] || null;
      if (nextPrimary) {
        for (const entry of record.media.items) {
          entry.primary = mediaItemKey(entry) === mediaItemKey(nextPrimary);
        }
        record.media.primary = {
          local: nextPrimary.local || null,
          remote: nextPrimary.remote || null,
          alt: String(record.media.primary?.alt || record.names?.display || '').trim(),
        };
      } else {
        record.media.primary = null;
      }
    }
    return record;
  }

  function primePerson(record) {
    if (record && record.id != null) {
      personCache.set(String(record.id), Promise.resolve(record));
    }
    return record;
  }

  // ---- On-demand GEDCOM for the family tree viewer --------------------------

  function gedDate(event) {
    return event && event.date ? String(event.date).replace(/[\r\n]+/g, ' ').trim() : '';
  }

  function emitIndi(lines, record, ownerNameById = null, moreCount = 0) {
    const names = record.names || {};
    // Animal records use `callName` instead of given/surname; fall back to it so
    // the GEDCOM NAME line is populated for pet (animal-tree) records too.
    const given = (names.given || names.callName || '').replace(/\//g, ' ').trim();
    const surname = (names.surname || '').replace(/\//g, ' ').trim();
    const display = (names.display || names.callName || '').replace(/[\r\n]+/g, ' ').trim();
    lines.push(`0 @P${record.id}@ INDI`);
    lines.push(`1 NAME ${`${given} /${surname}/`.replace(/\s+/g, ' ').trim()}`);
    if (given) lines.push(`2 GIVN ${given}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    // Carry the curated display name so viewers can show it verbatim instead of
    // reconstructing "given surname" (e.g. "Nelson Mandela" not "Rolihlahla Nelson Mandela").
    if (display) lines.push(`2 _DISP ${display}`);
    lines.push(`1 SEX ${record.sex === 'male' ? 'M' : record.sex === 'female' ? 'F' : record.sex === 'intersex' ? 'X' : 'U'}`);
    for (const [tag, event] of [['BIRT', record.events?.birth], ['DEAT', record.events?.death]]) {
      if (event && (event.date || event.place)) {
        lines.push(`1 ${tag}`);
        if (event.date) lines.push(`2 DATE ${gedDate(event)}`);
        if (event.place) lines.push(`2 PLAC ${String(event.place).replace(/[\r\n]+/g, ' ').trim()}`);
      }
    }
    lines.push(`1 REFN ${record.id}`);
    lines.push('2 TYPE genepedia');
    // Count of immediate relatives that exist in the database but are NOT drawn
    // in this neighbourhood, so the viewer can offer a "re-centre tree" button
    // on the frontier people (mirroring Geni's "+N" badges).
    if (moreCount > 0) lines.push(`1 _MORE ${moreCount}`);
    // Animal records carry their species/breed so the viewer styles them as pets
    // (paw avatar, /pages/pets/ links) within an animal family tree.
    if (record.kind === 'pet') {
      const species = String(record.species || '').replace(/[\r\n]+/g, ' ').trim();
      lines.push(`1 _PET ${species || 'Y'}`);
      if (record.breed) lines.push(`1 _BREED ${String(record.breed).replace(/[\r\n]+/g, ' ').trim()}`);
      // Owner back-reference so the animal tree can show (and link to) the person.
      const ownerId = record.owner != null && String(record.owner).trim() !== '' ? String(record.owner).trim() : '';
      if (ownerId) {
        const ownerName = (ownerNameById && ownerNameById.get(ownerId)) || `Profile ${ownerId}`;
        lines.push(`1 _OWNER ${String(ownerName).replace(/[\r\n]+/g, ' ').trim()}`);
        lines.push(`2 _OID ${ownerId}`);
      }
    }
    for (const fid of record.relationships?.parentUnions || []) {
      lines.push(`1 FAMC @${fid}@`);
      const parentLinks = Array.isArray(record.relationships?.parentLinks)
        ? record.relationships.parentLinks.filter((entry) => String(entry?.unionId || '') === String(fid))
        : [];
      const linkTypes = [...new Set(parentLinks.map((entry) => String(entry?.type || '').trim().toLowerCase()).filter(Boolean))];
      if (linkTypes.length === 1) {
        if (linkTypes[0] === 'adopted') {
          lines.push('2 PEDI adopted');
        } else if (linkTypes[0] === 'foster') {
          lines.push('2 PEDI foster');
        }
      }
    }
    for (const fid of record.relationships?.spouseUnions || []) lines.push(`1 FAMS @${fid}@`);
  }

  function emitFam(lines, union, sexById) {
    lines.push(`0 @${union.id}@ FAM`);
    const husbands = [];
    const wives = [];
    for (const pid of union.partners || []) {
      if (sexById.get(String(pid)) === 'female') wives.push(pid);
      else husbands.push(pid);
    }
    for (const pid of husbands) lines.push(`1 HUSB @P${pid}@`);
    for (const pid of wives) lines.push(`1 WIFE @P${pid}@`);
    for (const pid of union.children || []) lines.push(`1 CHIL @P${pid}@`);
    if (union.events?.engagement?.date || union.events?.engagement?.place) {
      lines.push('1 ENGA');
      if (union.events.engagement.date) lines.push(`2 DATE ${gedDate(union.events.engagement)}`);
      if (union.events.engagement.place) lines.push(`2 PLAC ${String(union.events.engagement.place).replace(/[\r\n]+/g, ' ').trim()}`);
    }
    if (union.events?.marriage?.date) lines.push('1 MARR'), lines.push(`2 DATE ${gedDate(union.events.marriage)}`);
    if (union.events?.marriage?.place) {
      if (!union.events?.marriage?.date) lines.push('1 MARR');
      lines.push(`2 PLAC ${String(union.events.marriage.place).replace(/[\r\n]+/g, ' ').trim()}`);
    }
    if (union.events?.divorce?.date || union.events?.divorce?.place) {
      lines.push('1 DIV');
      if (union.events.divorce.date) lines.push(`2 DATE ${gedDate(union.events.divorce)}`);
      if (union.events.divorce.place) lines.push(`2 PLAC ${String(union.events.divorce.place).replace(/[\r\n]+/g, ' ').trim()}`);
    }
  }

  // Emit a person's pets as INDI records (xref @PET<id>@, REFN = pet id so the
  // viewer links to /pages/pets/<id>/) under a synthetic @PETF_<ownerId>@ family
  // tagged `_PETFAM` (each pet tagged `_PET <species>`). The viewer hides these
  // behind its "Show pets" toggle.
  function emitPetRecords(indiLines, famLines, ownerRecord, petRecords) {
    if (!petRecords.length) {
      return;
    }
    const ownerId = ownerRecord.id;
    const childRefs = [];
    for (const pet of petRecords) {
      const xref = `PET${pet.id}`;
      childRefs.push(xref);
      const name = String(pet.names?.display || pet.names?.given || 'Pet').replace(/\//g, ' ').replace(/[\r\n]+/g, ' ').trim() || 'Pet';
      indiLines.push(`0 @${xref}@ INDI`);
      indiLines.push(`1 NAME ${name}`);
      indiLines.push(`2 GIVN ${name}`);
      indiLines.push(`1 SEX ${pet.sex === 'male' ? 'M' : pet.sex === 'female' ? 'F' : pet.sex === 'intersex' ? 'X' : 'U'}`);
      for (const [tag, event] of [['BIRT', pet.events?.birth], ['DEAT', pet.events?.death]]) {
        if (event && (event.date || event.place)) {
          indiLines.push(`1 ${tag}`);
          if (event.date) indiLines.push(`2 DATE ${gedDate(event)}`);
          if (event.place) indiLines.push(`2 PLAC ${String(event.place).replace(/[\r\n]+/g, ' ').trim()}`);
        }
      }
      indiLines.push(`1 REFN ${pet.id}`);
      indiLines.push('2 TYPE genepedia');
      const species = String(pet.species || '').replace(/[\r\n]+/g, ' ').trim();
      indiLines.push(`1 _PET ${species || 'Y'}`);
      if (pet.breed) indiLines.push(`1 _BREED ${String(pet.breed).replace(/[\r\n]+/g, ' ').trim()}`);
      // Mark pets that have an animal family of their own (in the pets DB) so the
      // viewer offers a Tree button to jump to it — it isn't shown in this people
      // tree, so there IS more to see.
      const rel = pet.relationships || {};
      if ((rel.spouseUnions?.length || rel.parentUnions?.length || rel.children?.length || rel.parents?.length)) {
        indiLines.push('1 _HASFAM Y');
      }
      indiLines.push(`1 FAMC @PETF_${ownerId}@`);
    }
    famLines.push(`0 @PETF_${ownerId}@ FAM`);
    famLines.push(`1 ${ownerRecord.sex === 'female' ? 'WIFE' : 'HUSB'} @P${ownerId}@`);
    for (const ref of childRefs) famLines.push(`1 CHIL @${ref}@`);
    famLines.push('1 _PETFAM Y');
  }

  function gedHeader() {
    return [
      '0 HEAD', '1 GEDC', '2 VERS 5.5.5', '2 FORM LINEAGE-LINKED', '3 VERS 5.5.5',
      '1 CHAR UTF-8', '1 SOUR GENEPEDIA', '2 NAME Genepedia', '2 VERS 1.0.0',
      '1 DEST GENEPEDIA', '1 FILE family-tree.ged', '1 LANG English',
      '1 SUBM @U1@', '0 @U1@ SUBM', '1 NAME Genepedia',
    ];
  }

  /**
   * Build the immediate-neighborhood GEDCOM for a record from a JSON DB. The
   * loaders are injectable so the same walk renders either a people tree
   * (loadPerson/loadUnion, with each person's pets attached) or a self-contained
   * animal tree from the pets database (loadPet/loadPetUnion).
   */
  async function buildNeighborhoodGedcom(idOrRecord, { loadRecord = loadPerson, loadUnionFn = loadUnion, withPets = true } = {}) {
    const focus = typeof idOrRecord === 'object' ? idOrRecord : await loadRecord(idOrRecord);
    if (!focus) {
      return null;
    }
    const focusId = String(focus.id);
    const parentUnionIds = (focus.relationships?.parentUnions || []).map(String);
    const spouseUnionIds = (focus.relationships?.spouseUnions || []).map(String);

    // Parent-side unions: the focus's own parent unions, plus every other union
    // each parent took part in. Children of those extra unions are the focus's
    // half-siblings (a parent's children with a different partner), and that
    // partner (the step-parent) comes along so the half-siblings have both
    // parents shown.
    const parentSideUnionIds = new Set(parentUnionIds);
    const parentUnions = (await Promise.all(parentUnionIds.map(loadUnionFn))).filter(Boolean);
    const parentIds = new Set();
    for (const union of parentUnions) {
      for (const pid of union.partners || []) parentIds.add(String(pid));
    }
    const parentRecords = (await Promise.all([...parentIds].map(loadRecord))).filter(Boolean);
    for (const parentRec of parentRecords) {
      for (const su of parentRec.relationships?.spouseUnions || []) {
        parentSideUnionIds.add(String(su));
      }
    }

    // Full + half siblings are the children of all the parent-side unions.
    const parentSideUnions = (await Promise.all([...parentSideUnionIds].map(loadUnionFn))).filter(Boolean);
    const siblingIds = new Set();
    for (const union of parentSideUnions) {
      for (const cid of union.children || []) {
        const c = String(cid);
        if (c !== focusId) siblingIds.add(c);
      }
    }

    // Each sibling's spouse unions give the niece/nephew children and the
    // partner the sibling had them with.
    const siblingRecords = (await Promise.all([...siblingIds].map(loadRecord))).filter(Boolean);
    const siblingSpouseUnionIds = new Set();
    for (const sib of siblingRecords) {
      for (const su of sib.relationships?.spouseUnions || []) {
        siblingSpouseUnionIds.add(String(su));
      }
    }

    // Everything we render: parents + (half-)siblings, their children and
    // partners, plus the focus's own spouses and children.
    const unionIdSet = new Set([
      ...parentSideUnionIds,
      ...siblingSpouseUnionIds,
      ...spouseUnionIds,
    ]);
    const allUnions = (await Promise.all([...unionIdSet].map(loadUnionFn))).filter(Boolean);

    const personIds = new Set([focusId]);
    for (const union of allUnions) {
      for (const pid of union.partners || []) personIds.add(String(pid));
      for (const pid of union.children || []) personIds.add(String(pid));
    }

    const records = (await Promise.all([...personIds].map(loadRecord))).filter(Boolean);
    const sexById = new Map(records.map((r) => [String(r.id), r.sex]));

    // Resolve owner display names for any pets in this tree (e.g. an animal tree)
    // so each animal node can show — and link to — its owning person.
    const ownerIds = [...new Set(
      records.filter((r) => r.kind === 'pet' && r.owner != null && String(r.owner).trim() !== '').map((r) => String(r.owner).trim()),
    )];
    const ownerRecords = await Promise.all(ownerIds.map((id) => loadPerson(id).catch(() => null)));
    const ownerNameById = new Map(ownerIds.map((id, i) => [id, ownerRecords[i]?.names?.display || '']));

    const lines = gedHeader();
    // For each rendered person, count the immediate relatives (parents, partners,
    // children, siblings) that live in the database but fall outside this
    // neighbourhood — the viewer turns a non-zero count into a Tree button that
    // re-centres on that person.
    const moreCountFor = (record) => {
      const rel = record.relationships || {};
      const immediate = [
        ...(rel.parents || []),
        ...(rel.spouses || []),
        ...(rel.exSpouses || []),
        ...(rel.children || []),
        ...(rel.siblings || []),
      ].map(String);
      return new Set(immediate.filter((rid) => rid && !personIds.has(rid))).size;
    };
    for (const record of records) emitIndi(lines, record, ownerNameById, moreCountFor(record));
    for (const union of allUnions) {
      emitFam(lines, {
        ...union,
        partners: (union.partners || []).filter((pid) => personIds.has(String(pid))),
        children: (union.children || []).filter((pid) => personIds.has(String(pid))),
      }, sexById);
    }
    // People trees attach each rendered person's pets (from the pets database) as
    // INDI records under a synthetic @PETF_<ownerId>@ family. Distinct xref space
    // (@PET<id>@) means a pet id never collides with a person id. Animal trees
    // (withPets=false) don't do this — they already contain the pets themselves.
    if (withPets) {
      const petIndiLines = [];
      const petFamLines = [];
      for (const record of records) {
        const petIds = Array.isArray(record.pets) ? record.pets : [];
        if (!petIds.length) continue;
        const petRecords = (await Promise.all(petIds.map(loadPet))).filter(Boolean);
        emitPetRecords(petIndiLines, petFamLines, record, petRecords);
      }
      lines.push(...petIndiLines, ...petFamLines);
    }
    lines.push('0 TRLR');
    return `${lines.join('\n')}\n`;
  }

  /** Build a self-contained animal-family GEDCOM from the pets database. */
  async function buildPetNeighborhoodGedcom(idOrRecord) {
    return buildNeighborhoodGedcom(idOrRecord, { loadRecord: loadPet, loadUnionFn: loadPetUnion, withPets: false });
  }

  /** Build a tree GEDCOM and expose it as a blob: URL for the family-tree viewer. */
  async function buildTreeGedcomUrl(idOrRecord) {
    const text = await buildNeighborhoodGedcom(idOrRecord);
    if (!text) {
      return null;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  }

  /** Build an animal-tree GEDCOM blob: URL for a pet profile's tree tab. */
  async function buildPetTreeGedcomUrl(idOrRecord) {
    const text = await buildPetNeighborhoodGedcom(idOrRecord);
    if (!text) {
      return null;
    }
    return URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  }

  // ---- Write helpers (editors persist canonical records to the database) ----

  function recordPath(id) {
    return `${DB_ROOT}/persons/${bucketForId(id)}/${id}.json`;
  }

  function unionPath(id) {
    return `${DB_ROOT}/unions/${bucketForId(id)}/${id}.json`;
  }

  function ownershipPath(id) {
    return `${DB_ROOT}/ownership/${bucketForId(id)}/${id}.json`;
  }

  function emptyRecord(id) {
    return {
      id: Number(id),
      schema: 'genepedia/person@1',
      slug: `profile-${id}`,
      names: { display: '', given: '', surname: '', married: '', nick: '', aliases: [] },
      sex: 'unknown',
      living: false,
      events: { birth: null, death: null, baptism: null, burial: null },
      lastResidence: null,
      lastResidenceLocation: null,
      occupation: null,
      attributes: emptyAttributes(),
      education: [],
      career: [],
      media: { primary: null, items: [] },
      about: { hasNarrative: false },
      relationships: {
        parents: [], spouses: [], exSpouses: [], children: [], siblings: [],
        parentUnions: [], spouseUnions: [], parentLinks: [], partnerLinks: [], childLinks: [],
      },
      source: {},
      page: { route: `pages/people/${id}/`, canonical: '' },
      generatedAt: new Date().toISOString(),
    };
  }

  function slugifyName(name, id) {
    const slug = String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || `profile-${id}`;
  }

  function eventFromInfobox(group) {
    if (!group) {
      return null;
    }
    const iso = String(group.date || '').trim();
    const location = ensureLocationDetails(group.location, group.place || '');
    const placeText = formatLocationSummary(location, group.place || '');
    const place = String(placeText || '').trim();
    if (!iso && !place) {
      return null;
    }
    const year = iso ? Number(iso.slice(0, 4)) || null : null;
    const out = { date: iso || null, year, iso: iso || null, precision: group.precision || 'exact', display: null, place: place || null };
    if (hasLocationValue(location)) out.location = location;
    if (group.cause) out.cause = group.cause;
    if (group.type) out.type = group.type;
    return out;
  }

  /**
   * Merge canonical infobox data (AppProfileInfobox shape) into a person record.
   * Relationships, about, and source are preserved; identity fields are replaced.
   */
  function applyInfoboxToRecord(record, data) {
    const next = record && typeof record === 'object' ? record : emptyRecord(data?.id || 0);
    const infobox = window.AppProfileInfobox;
    const display = infobox ? infobox.displayNameFrom(data) : (data.displayName || '');
    next.names = {
      display: display || '',
      given: data.firstName || '',
      surname: data.lastName || '',
      birthSurname: data.birthSurname || '',
      married: next.names?.married || '',
      nick: '',
      aliases: Array.isArray(data.alsoKnownAs) ? data.alsoKnownAs.filter(Boolean) : [],
    };
    next.slug = slugifyName(display, next.id);
    next.sex = ['male', 'female', 'intersex'].includes(data.gender) ? data.gender : 'unknown';
    next.occupation = deriveLatestCareerOccupation(next.career) || null;
    next.living = data.status === 'living';
    next.lastResidenceLocation = hasLocationValue(data.lastResidenceLocation)
      ? ensureLocationDetails(data.lastResidenceLocation, data.lastResidence || '')
      : null;
    next.lastResidence = next.lastResidenceLocation
      ? formatLocationSummary(next.lastResidenceLocation, data.lastResidence || '') || null
      : (String(data.lastResidence || '').trim() || null);
    next.events = {
      birth: eventFromInfobox(data.birth),
      death: data.status === 'deceased' ? eventFromInfobox(data.death) : (eventFromInfobox(data.death) || null),
      baptism: eventFromInfobox(data.baptism),
      burial: eventFromInfobox(data.burial),
    };
    const photoSrc = String(data.photo?.src || '').trim();
    if (photoSrc) {
      const isRemote = /^https?:\/\//i.test(photoSrc);
      next.media = next.media || { primary: null, items: [] };
      upsertMediaItem(next, {
        local: isRemote ? null : photoSrc.replace(/^\.?\//, ''),
        remote: isRemote ? photoSrc : (next.media.primary?.remote || null),
        title: data.photo?.alt || display || '',
        alt: data.photo?.alt || display || '',
      }, { setPrimary: true });
    }
    next.generatedAt = new Date().toISOString();
    return next;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  /** Build the static SEO shell (people/<id>/index.html) from a person record. */
  function buildProfileShellHtml(record, options = {}) {
    const host = (options.host || 'www.genepedia.org').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const id = record.id;
    const name = record.names?.display || `Profile ${id}`;
    const birthYear = record.events?.birth?.year || null;
    const deathYear = record.events?.death?.year || null;
    const span = birthYear && deathYear ? `${birthYear}\u2013${deathYear}` : birthYear ? `b. ${birthYear}` : deathYear ? `d. ${deathYear}` : '';
    const titleText = span ? `${name} (${span})` : name;
    const route = record.kind === 'pet' ? `pages/pets/${id}/` : `pages/people/${id}/`;
    const canonical = `https://${host}/${route}`;
    const desc = (options.description || `${name} on Genepedia — relatives, biography, timeline, and sources.`).slice(0, 300);
    const primary = record.media?.primary;
    const imageUrl = primary
      ? buildPreferredPersonMediaCanonicalUrl(host, id, primary)
      : '';

    const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name, url: canonical };
    if (record.names?.given) jsonLd.givenName = record.names.given;
    if (record.names?.surname) jsonLd.familyName = record.names.surname;
    if (record.sex === 'male' || record.sex === 'female') jsonLd.gender = record.sex === 'male' ? 'Male' : 'Female';
    if (birthYear) jsonLd.birthDate = String(birthYear);
    if (deathYear) jsonLd.deathDate = String(deathYear);
    if (imageUrl) jsonLd.image = imageUrl;

    const ogImage = imageUrl
      ? `\n\t<meta property="og:image" content="${escapeAttr(imageUrl)}">\n\t<meta name="twitter:card" content="summary_large_image">`
      : '\n\t<meta name="twitter:card" content="summary">';

    return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
\t<meta charset="UTF-8">
\t<meta name="viewport" content="width=device-width, initial-scale=1">
\t<title>${escapeHtml(titleText)} - Genepedia</title>
\t<meta name="description" content="${escapeAttr(desc)}">
\t<link rel="canonical" href="${escapeAttr(canonical)}">
\t<meta property="og:type" content="profile">
\t<meta property="og:title" content="${escapeAttr(titleText)}">
\t<meta property="og:description" content="${escapeAttr(desc)}">
\t<meta property="og:url" content="${escapeAttr(canonical)}">${record.names?.given ? `\n\t<meta property="profile:first_name" content="${escapeAttr(record.names.given)}">` : ''}${record.names?.surname ? `\n\t<meta property="profile:last_name" content="${escapeAttr(record.names.surname)}">` : ''}${ogImage}
\t<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
\t</script>
\t<script src="../../../site-info.js"></script>
\t<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css">
\t<style>
\t\thtml,
\t\tbody {
\t\t\tmargin: 0;
\t\t}
\t</style>
\t<script defer src="../../../lib/Web-Framework/components/mini-header.js"></script>
\t<script defer src="../../../lib/Web-Framework/components/full-header.js"></script>
\t<script defer src="../../../components/people-page-profile-table.js"></script>
\t<script defer src="../../../lib/Web-Framework/components/full-page-toolbar.js"></script>
\t<script defer src="../../../lib/people-db.js"></script>
\t<script defer src="../../../components/people-page.js"></script>
\t<script defer src="../../../lib/Web-Framework/components/full-footer.js"></script>
</head>

<body>
\t<full-header></full-header>
\t<article>
\t\t<people-page>
\t\t\t<h1>${escapeHtml(name)}</h1>
\t\t\t<p>${escapeHtml(desc)}</p>
\t\t\t<noscript>
\t\t\t\t<p>${escapeHtml(name)}${span ? ` (${escapeHtml(span)})` : ''} on Genepedia.
\t\t\t\tEnable JavaScript to view the full profile, family relationships, and tree.</p>
\t\t\t</noscript>
\t\t</people-page>
\t\t<full-footer></full-footer>
\t</article>
</body>

</html>`;
  }

  window.PeopleDB = {
    DB_ROOT,
    PETS_DB_ROOT,
    bucketForId,
    loadPerson,
    loadPet,
    loadPetUnion,
    primePet,
    petRecordPath,
    petUnionPath,
    loadUnion,
    loadSummary,
    resolveNames,
    toInfoboxData,
    buildImmediateFamilyHtml,
    buildPetInfoboxFragment,
    getPersonCardInfo,
    getPetCardInfo,
    buildInfoboxFragment,
    normalizeMediaItems,
    upsertMediaItem,
    removeMediaItem,
    primePerson,
    buildNeighborhoodGedcom,
    buildPetNeighborhoodGedcom,
    buildTreeGedcomUrl,
    buildPetTreeGedcomUrl,
    recordPath,
    unionPath,
    ownershipPath,
    toPersonalData,
    toEducationData,
    toCareerData,
    deriveLatestCareerOccupation,
    applyPersonalToRecord,
    applyEducationToRecord,
    applyCareerToRecord,
    emptyPetRecord,
    buildPetRecord,
    toPetData,
    isPetRecord,
    applyInfoboxToRecord,
    emptyRecord,
    buildProfileShellHtml,
  };
})();
