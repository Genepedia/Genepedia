/**
 * Shared conventions for the canonical, sharded JSON people database.
 *
 * Layout (under data/Genepedia-Database/people):
 *   manifest.json                     - version + counts + shard strategy
 *   persons/<bucket>/<id>.json        - canonical person record
 *   unions/<bucket>/<id>.json         - canonical family/union record
 *   graph/<bucket>/<id>.json          - adjacency for a person (tree neighborhood)
 *   index/summary/<bucket>.json       - lightweight person summaries
 *   index/search/<key>.json           - name-prefix search shards
 *   index/all-ids.json                - ordered id list (sitemaps / listings)
 *   sources/gedcom-id-map.json        - external GEDCOM id -> local id
 *   export/full-tree.ged              - regenerated GEDCOM (import/export only)
 *   reports/*.json                    - import / media / privacy audits
 *
 * Buckets keep at most SHARD_SIZE files per directory so the database scales to
 * millions of records without unbounded directory growth.
 */

export const DB_ROOT = 'data/Genepedia-Database/people';
export const SHARD_SIZE = 1000;
export const RESERVED_IDS = { 15: 'Nelson Mandela' };

/** Numeric bucket for a sequential person id (1..1000 -> 0, 1001..2000 -> 1, ...). */
export function bucketForId(id) {
  const n = Number(String(id).replace(/[^0-9]/g, '')) || 0;
  return Math.floor((Math.max(1, n) - 1) / SHARD_SIZE);
}

export function personPath(id) {
  return `${DB_ROOT}/persons/${bucketForId(id)}/${id}.json`;
}

export function unionPath(unionId) {
  return `${DB_ROOT}/unions/${bucketForId(unionId)}/${unionId}.json`;
}

export function graphPath(id) {
  return `${DB_ROOT}/graph/${bucketForId(id)}/${id}.json`;
}

export function ownershipPath(id) {
  return `${DB_ROOT}/ownership/${bucketForId(id)}/${id}.json`;
}

export function ownershipLoginIndexPath() {
  return `${DB_ROOT}/index/ownership-logins.json`;
}

export function sitemapPath() {
  return 'sitemap.xml';
}

export function summaryShardPath(id) {
  return `${DB_ROOT}/index/summary/${bucketForId(id)}.json`;
}

export function manifestPath() {
  return `${DB_ROOT}/manifest.json`;
}

export function idMapPath() {
  return `${DB_ROOT}/sources/gedcom-id-map.json`;
}

export function allIdsPath() {
  return `${DB_ROOT}/index/all-ids.json`;
}

export function exportGedcomPath() {
  return `${DB_ROOT}/export/full-tree.ged`;
}

/** Strip diacritics and lowercase for search/slug normalization. */
export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Search shard key for a token: first two normalized alphanumeric chars. */
export function searchShardKey(token) {
  const clean = normalizeText(token).replace(/[^a-z0-9]/g, '');
  if (!clean) {
    return '_';
  }
  return clean.length >= 2 ? clean.slice(0, 2) : clean;
}

export function searchShardPath(key) {
  return `${DB_ROOT}/index/search/${key}.json`;
}

/** Distinct search-shard keys produced by a person's searchable name tokens. */
export function searchKeysForTokens(tokens) {
  const keys = new Set();
  for (const token of tokens) {
    const key = searchShardKey(token);
    if (key && key !== '_') {
      keys.add(key);
    }
  }
  return [...keys];
}

/** Public, SEO-facing slug for a person (used for alias URLs; routing stays by id). */
export function slugify(name, fallbackId) {
  const slug = normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || `profile-${fallbackId}`;
}

/** Canonical public route for a person profile (directory route for clean URLs). */
export function profileRoute(id) {
  return `people/${id}/`;
}
