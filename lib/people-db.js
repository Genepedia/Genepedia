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
    data.gender = record.sex === 'male' || record.sex === 'female' ? record.sex : 'unknown';
    data.occupation = record.occupation || '';

    const hasDeath = Boolean(record.events?.death);
    data.status = hasDeath ? 'deceased' : (record.living ? 'living' : 'unknown');

    const applyEvent = (target, event) => {
      if (!event) {
        return;
      }
      target.date = event.iso || (event.year ? String(event.year) : '');
      target.precision = event.precision || 'exact';
      target.circa = event.precision === 'about';
      target.place = event.place || '';
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

  function personLink(id, name) {
    if (isPrivateName(name)) {
      return '<span class="profile-private">private</span>';
    }
    return `<a href="../${escapeHtml(String(id))}/">${escapeHtml(name)}</a>`;
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

  async function buildImmediateFamilyHtml(record) {
    // Only show immediate-family when there are explicit relationships recorded.
    // Previously we unconditionally rendered `record.familyHtml` which caused
    // hand-authored profile prose to display family lists even when the person
    // had no linked relationships in the canonical DB. To ensure the identity
    // box reflects the family tree, ignore `familyHtml` unless relationships
    // are present.
    const rel = record.relationships || {};
    const allIds = [
      ...(rel.parents || []), ...(rel.spouses || []), ...(rel.exSpouses || []),
      ...(rel.children || []), ...(rel.siblings || []),
    ];
    if (!allIds.length) {
      return '';
    }
    const names = await resolveNames(allIds);
    const pairsFor = (ids) => (ids || []).map((id) => [id, names.get(String(id)) || `Profile ${id}`]);
    const sex = record.sex || 'unknown';
    const role = (kind) => ROLE_WORDS[kind][sex] || ROLE_WORDS[kind].unknown;
    const lines = [];
    if (rel.parents?.length) lines.push(`<p>${role('parent')} of ${joinPeople(pairsFor(rel.parents))}</p>`);
    if (rel.spouses?.length) lines.push(`<p>${role('spouse')} of ${joinPeople(pairsFor(rel.spouses))}</p>`);
    if (rel.exSpouses?.length) lines.push(`<p>${role('exSpouse')} of ${joinPeople(pairsFor(rel.exSpouses))}</p>`);
    if (rel.children?.length) lines.push(`<p>${role('child')} of ${joinPeople(pairsFor(rel.children))}</p>`);
    if (rel.siblings?.length) lines.push(`<p>${role('sibling')} of ${joinPeople(pairsFor(rel.siblings))}</p>`);
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
    const infobox = window.AppProfileInfobox;
    if (!infobox) {
      return '';
    }
    const data = toInfoboxData(record);
    const familyHtml = await buildImmediateFamilyHtml(record);
    return infobox.buildFragment(data, familyHtml);
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

  function emitIndi(lines, record) {
    const names = record.names || {};
    const given = (names.given || '').replace(/\//g, ' ').trim();
    const surname = (names.surname || '').replace(/\//g, ' ').trim();
    lines.push(`0 @P${record.id}@ INDI`);
    lines.push(`1 NAME ${`${given} /${surname}/`.replace(/\s+/g, ' ').trim()}`);
    if (given) lines.push(`2 GIVN ${given}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    lines.push(`1 SEX ${record.sex === 'male' ? 'M' : record.sex === 'female' ? 'F' : 'U'}`);
    for (const [tag, event] of [['BIRT', record.events?.birth], ['DEAT', record.events?.death]]) {
      if (event && (event.date || event.place)) {
        lines.push(`1 ${tag}`);
        if (event.date) lines.push(`2 DATE ${gedDate(event)}`);
        if (event.place) lines.push(`2 PLAC ${String(event.place).replace(/[\r\n]+/g, ' ').trim()}`);
      }
    }
    lines.push(`1 REFN ${record.id}`);
    lines.push('2 TYPE genepedia');
    for (const fid of record.relationships?.parentUnions || []) lines.push(`1 FAMC @${fid}@`);
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
    if (union.events?.marriage?.date) lines.push('1 MARR'), lines.push(`2 DATE ${gedDate(union.events.marriage)}`);
  }

  function gedHeader() {
    return [
      '0 HEAD', '1 GEDC', '2 VERS 5.5.5', '2 FORM LINEAGE-LINKED', '3 VERS 5.5.5',
      '1 CHAR UTF-8', '1 SOUR GENEPEDIA', '2 NAME Genepedia', '2 VERS 1.0.0',
      '1 DEST GENEPEDIA', '1 FILE family-tree.ged', '1 LANG English',
      '1 SUBM @U1@', '0 @U1@ SUBM', '1 NAME Genepedia',
    ];
  }

  /** Build the immediate-neighborhood GEDCOM for a person from the JSON DB. */
  async function buildNeighborhoodGedcom(idOrRecord) {
    const focus = typeof idOrRecord === 'object' ? idOrRecord : await loadPerson(idOrRecord);
    if (!focus) {
      return null;
    }
    const unionIds = [
      ...(focus.relationships?.parentUnions || []),
      ...(focus.relationships?.spouseUnions || []),
    ];
    const unions = (await Promise.all(unionIds.map(loadUnion))).filter(Boolean);

    const personIds = new Set([String(focus.id)]);
    for (const union of unions) {
      for (const pid of union.partners || []) personIds.add(String(pid));
      for (const pid of union.children || []) personIds.add(String(pid));
    }
    const records = (await Promise.all([...personIds].map(loadPerson))).filter(Boolean);
    const sexById = new Map(records.map((r) => [String(r.id), r.sex]));

    const lines = gedHeader();
    for (const record of records) emitIndi(lines, record);
    for (const union of unions) {
      emitFam(lines, {
        ...union,
        partners: (union.partners || []).filter((pid) => personIds.has(String(pid))),
        children: (union.children || []).filter((pid) => personIds.has(String(pid))),
      }, sexById);
    }
    lines.push('0 TRLR');
    return `${lines.join('\n')}\n`;
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

  // ---- Write helpers (editors persist canonical records to the database) ----

  function recordPath(id) {
    return `${DB_ROOT}/persons/${bucketForId(id)}/${id}.json`;
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
      occupation: null,
      attributes: { hairColor: null, eyeColor: null, height: null },
      media: { primary: null, items: [] },
      about: { hasNarrative: false },
      relationships: { parents: [], spouses: [], exSpouses: [], children: [], siblings: [], parentUnions: [], spouseUnions: [] },
      source: {},
      page: { route: `people/${id}/`, canonical: '' },
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
    const place = String(group.place || '').trim();
    if (!iso && !place) {
      return null;
    }
    const year = iso ? Number(iso.slice(0, 4)) || null : null;
    const out = { date: iso || null, year, iso: iso || null, precision: group.precision || 'exact', display: null, place: place || null };
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
    next.sex = data.gender === 'male' || data.gender === 'female' ? data.gender : 'unknown';
    next.occupation = (data.occupation || '').trim() || null;
    next.living = data.status === 'living';
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
    const canonical = `https://${host}/people/${id}/`;
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
\t<script src="../../site-info.js"></script>
\t<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css">
\t<style>
\t\thtml,
\t\tbody {
\t\t\tmargin: 0;
\t\t}
\t</style>
\t<script defer src="../../lib/Web-Framework/components/mini-header.js"></script>
\t<script defer src="../../lib/Web-Framework/components/full-header.js"></script>
\t<script defer src="../../components/people-page-profile-table.js"></script>
\t<script defer src="../../lib/Web-Framework/components/full-page-toolbar.js"></script>
\t<script defer src="../../lib/people-db.js"></script>
\t<script defer src="../../components/people-page.js"></script>
\t<script defer src="../../lib/Web-Framework/components/full-footer.js"></script>
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
    bucketForId,
    loadPerson,
    loadUnion,
    loadSummary,
    resolveNames,
    toInfoboxData,
    buildImmediateFamilyHtml,
    buildInfoboxFragment,
    normalizeMediaItems,
    upsertMediaItem,
    removeMediaItem,
    primePerson,
    buildNeighborhoodGedcom,
    buildTreeGedcomUrl,
    recordPath,
    ownershipPath,
    applyInfoboxToRecord,
    emptyRecord,
    buildProfileShellHtml,
  };
})();
