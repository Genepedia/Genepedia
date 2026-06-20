/**
 * Rebuild the derived database indexes from the canonical per-person records.
 *
 * The editors and API write only canonical files (persons/<id>.json,
 * ownership/<id>.json, data/profile.html, people/<id>/index.html). The summary
 * and search shards, all-ids list, people.json registry, sitemap, and manifest
 * counts are DERIVED — regenerate them with this script after edits/adds, either
 * locally or from CI.
 *
 * Usage:
 *   node scripts/reindex.mjs                 # rebuild every derived index
 *   node scripts/reindex.mjs --host www.genepedia.org
 *   node scripts/reindex.mjs --sitemap-only  # only regenerate sitemap.xml
 */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DB_ROOT, PETS_DB_ROOT, SHARD_SIZE, RESERVED_IDS,
  bucketForId, summaryShardPath, manifestPath, allIdsPath, searchShardPath,
  ownershipLoginIndexPath, searchKeysForTokens, profileRoute, sitemapPath,
  petsRegistryPath,
} from './lib/people-db-paths.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PERSONS_DIR = path.join(REPO_ROOT, DB_ROOT, 'persons');
const OWNERSHIP_DIR = path.join(REPO_ROOT, DB_ROOT, 'ownership');
const PETS_PERSONS_DIR = path.join(REPO_ROOT, PETS_DB_ROOT, 'persons');

function parseArgs(argv) {
  const args = { host: 'www.genepedia.org', sitemapOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host') {
      args.host = String(argv[++i] || args.host).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    } else if (argv[i] === '--sitemap-only') {
      args.sitemapOnly = true;
    }
  }
  return args;
}

// Public static pages to include in the sitemap, as direct .html paths
// (repo-relative). Account/app pages (settings, notifications, edit) and error
// pages (404) are intentionally excluded — they shouldn't be indexed.
const STATIC_SITEMAP_PAGES = [
  'index.html',
  'pages/privacy_policy.html',
  'pages/terms_of_use.html',
  'pages/code_of_conduct.html',
  'pages/cookie_statement.html',
  'pages/legal_and_safety_contacts.html',
  'pages/contact.html',
  'pages/search.html',
  'pages/statistics.html',
  'pages/gedcom.html',
  'pages/gedcom/import.html',
  'pages/gedcom/export.html',
  'pages/gedcom/tree-viewer.html',
];

// Build the ordered list of sitemap URLs: static pages first, then one direct
// .html URL per person profile. Missing static pages are skipped with a warning
// so the sitemap never advertises a 404.
function sitemapEntryRoute(entry) {
  const id = typeof entry === 'object' ? entry.id : entry;
  const kind = typeof entry === 'object' ? entry.kind : 'person';
  return profileRoute(id, kind);
}

function sitemapUrls(canonicalBase, allIds) {
  const urls = [];
  for (const page of STATIC_SITEMAP_PAGES) {
    if (existsSync(path.join(REPO_ROOT, page))) {
      urls.push(`${canonicalBase}/${page}`);
    } else {
      console.warn(`Sitemap: skipping missing static page ${page}`);
    }
  }
  for (const entry of allIds) {
    urls.push(`${canonicalBase}/${sitemapEntryRoute(entry)}index.html`);
  }
  return urls;
}

function sitemapXml(urls) {
  const body = urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// Resolve the ordered list of person ids without a full reindex. Prefers the
// derived all-ids.json; falls back to scanning the canonical person records.
async function readAllIds() {
  try {
    const data = JSON.parse(await readFile(path.join(REPO_ROOT, allIdsPath()), 'utf8'));
    if (Array.isArray(data?.ids)) {
      return [...data.ids].map(Number).sort((a, b) => a - b);
    }
  } catch {
    // fall through to scanning person records
  }
  const persons = await readAllPersons();
  return persons.map((p) => Number(p.id)).sort((a, b) => a - b);
}

async function writeJson(absPath, value) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(absPath, value) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, value, 'utf8');
}

async function readAllPersons() {
  const persons = [];
  let bucketDirs = [];
  try {
    bucketDirs = await readdir(PERSONS_DIR, { withFileTypes: true });
  } catch {
    return persons;
  }
  for (const bucketDir of bucketDirs) {
    if (!bucketDir.isDirectory()) continue;
    const files = await readdir(path.join(PERSONS_DIR, bucketDir.name));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const record = JSON.parse(await readFile(path.join(PERSONS_DIR, bucketDir.name, file), 'utf8'));
        if (record && record.id != null) {
          persons.push(record);
        }
      } catch (error) {
        console.warn(`Skipping unreadable record ${bucketDir.name}/${file}: ${error.message}`);
      }
    }
  }
  return persons;
}

// Read every record from the separate pets database (animals + their own
// families). Returns the records sorted by id.
async function readAllPets() {
  const pets = [];
  let bucketDirs = [];
  try {
    bucketDirs = await readdir(PETS_PERSONS_DIR, { withFileTypes: true });
  } catch {
    return pets;
  }
  for (const bucketDir of bucketDirs) {
    if (!bucketDir.isDirectory()) continue;
    const files = await readdir(path.join(PETS_PERSONS_DIR, bucketDir.name));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const record = JSON.parse(await readFile(path.join(PETS_PERSONS_DIR, bucketDir.name, file), 'utf8'));
        if (record && record.id != null) pets.push(record);
      } catch (error) {
        console.warn(`Skipping unreadable pet ${bucketDir.name}/${file}: ${error.message}`);
      }
    }
  }
  pets.sort((a, b) => Number(a.id) - Number(b.id));
  return pets;
}

// Read every union (animal family) from the pets database.
async function readAllPetUnions() {
  const unions = [];
  const dir = path.join(REPO_ROOT, PETS_DB_ROOT, 'unions');
  let bucketDirs = [];
  try {
    bucketDirs = await readdir(dir, { withFileTypes: true });
  } catch {
    return unions;
  }
  for (const bucketDir of bucketDirs) {
    if (!bucketDir.isDirectory()) continue;
    const files = await readdir(path.join(dir, bucketDir.name));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const union = JSON.parse(await readFile(path.join(dir, bucketDir.name, file), 'utf8'));
        if (union && union.id != null) unions.push(union);
      } catch (error) {
        console.warn(`Skipping unreadable pet union ${bucketDir.name}/${file}: ${error.message}`);
      }
    }
  }
  return unions;
}

function petNameTokens(record) {
  const names = record.names || {};
  const tokens = [];
  for (const value of [names.display, names.callName, names.registeredName, record.species, record.breed, ...(names.aliases || [])]) {
    for (const part of String(value || '').split(/\s+/)) {
      if (part) tokens.push(part);
    }
  }
  return tokens;
}

function petSummaryOf(record) {
  return {
    id: record.id,
    name: record.names?.display || '',
    species: record.species || '',
    breed: record.breed || '',
    sex: record.sex || 'unknown',
    birthYear: record.events?.birth?.year || null,
    deathYear: record.events?.death?.year || null,
    owner: record.owner != null ? record.owner : null,
    slug: record.slug || '',
    route: profileRoute(record.id, 'pet'),
    hasImage: Boolean(record.media?.primary || (record.media?.items || []).length),
  };
}

function petGedDate(event) {
  return event && event.date ? String(event.date).replace(/[\r\n]+/g, ' ').trim() : '';
}

// Self-contained GEDCOM of the whole pets database (animals + their families).
function buildPetsGedcom(pets, unions) {
  const lines = [
    '0 HEAD', '1 GEDC', '2 VERS 5.5.5', '2 FORM LINEAGE-LINKED', '3 VERS 5.5.5',
    '1 CHAR UTF-8', '1 SOUR GENEPEDIA', '2 NAME Genepedia', '2 VERS 1.0.0',
    '1 DEST GENEPEDIA', '1 FILE pets-tree.ged', '1 LANG English',
    '1 SUBM @U1@', '0 @U1@ SUBM', '1 NAME Genepedia',
  ];
  for (const pet of pets) {
    const name = String(pet.names?.display || 'Pet').replace(/\//g, ' ').replace(/[\r\n]+/g, ' ').trim() || 'Pet';
    lines.push(`0 @P${pet.id}@ INDI`);
    lines.push(`1 NAME ${name}`);
    lines.push(`1 SEX ${pet.sex === 'male' ? 'M' : pet.sex === 'female' ? 'F' : 'U'}`);
    for (const [tag, event] of [['BIRT', pet.events?.birth], ['DEAT', pet.events?.death]]) {
      if (event && (event.date || event.place)) {
        lines.push(`1 ${tag}`);
        if (event.date) lines.push(`2 DATE ${petGedDate(event)}`);
        if (event.place) lines.push(`2 PLAC ${String(event.place).replace(/[\r\n]+/g, ' ').trim()}`);
      }
    }
    lines.push(`1 REFN ${pet.id}`);
    lines.push('2 TYPE genepedia');
    lines.push(`1 _PET ${String(pet.species || '').replace(/[\r\n]+/g, ' ').trim() || 'Y'}`);
    if (pet.breed) lines.push(`1 _BREED ${String(pet.breed).replace(/[\r\n]+/g, ' ').trim()}`);
    for (const fid of pet.relationships?.parentUnions || []) lines.push(`1 FAMC @${fid}@`);
    for (const fid of pet.relationships?.spouseUnions || []) lines.push(`1 FAMS @${fid}@`);
  }
  const sexById = new Map(pets.map((p) => [String(p.id), p.sex]));
  for (const union of unions) {
    lines.push(`0 @${union.id}@ FAM`);
    for (const pid of union.partners || []) {
      lines.push(`1 ${sexById.get(String(pid)) === 'female' ? 'WIFE' : 'HUSB'} @P${pid}@`);
    }
    for (const pid of union.children || []) lines.push(`1 CHIL @P${pid}@`);
  }
  lines.push('0 TRLR');
  return `${lines.join('\n')}\n`;
}

// Rebuild the pets database derived layer so it mirrors the people database:
// index/{summary,search,all-ids}, manifest, ownership, export GEDCOM, plus the
// public registry. Returns sitemap entries.
async function processPets(host) {
  const pets = await readAllPets();
  const unions = await readAllPetUnions();
  const petsRoot = path.join(REPO_ROOT, PETS_DB_ROOT);

  // index/summary + index/search (replace wholesale so deletions don't linger).
  await rm(path.join(petsRoot, 'index', 'summary'), { recursive: true, force: true });
  await rm(path.join(petsRoot, 'index', 'search'), { recursive: true, force: true });
  const summaryByBucket = new Map();
  const searchByKey = new Map();
  for (const record of pets) {
    const summary = petSummaryOf(record);
    const bucket = bucketForId(record.id);
    if (!summaryByBucket.has(bucket)) summaryByBucket.set(bucket, []);
    summaryByBucket.get(bucket).push(summary);
    for (const key of searchKeysForTokens(petNameTokens(record))) {
      if (!searchByKey.has(key)) searchByKey.set(key, []);
      searchByKey.get(key).push(summary);
    }
  }
  for (const [bucket, list] of summaryByBucket) {
    list.sort((a, b) => a.id - b.id);
    await writeJson(path.join(petsRoot, 'index', 'summary', `${bucket}.json`), { bucket, count: list.length, animals: list });
  }
  for (const [key, list] of searchByKey) {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.id - b.id);
    await writeJson(path.join(petsRoot, 'index', 'search', `${key}.json`), { key, count: list.length, animals: list });
  }

  // index/all-ids.json
  const allIds = pets.map((p) => Number(p.id)).sort((a, b) => a - b);
  await writeJson(path.join(petsRoot, 'index', 'all-ids.json'), { count: allIds.length, ids: allIds });

  // ownership/<bucket>/<id>.json — a pet is editable by its owning person.
  await rm(path.join(petsRoot, 'ownership'), { recursive: true, force: true });
  for (const record of pets) {
    await writeJson(path.join(petsRoot, 'ownership', String(bucketForId(record.id)), `${record.id}.json`), {
      creator: null,
      owner: record.owner != null ? { personId: record.owner } : null,
      maintainers: [],
    });
  }

  // export/full-tree.ged — the whole pets database as one GEDCOM.
  await writeText(path.join(petsRoot, 'export', 'full-tree.ged'), buildPetsGedcom(pets, unions));

  // sources/ + reports/ so the layout mirrors people (kept as real placeholders).
  await writeJson(path.join(petsRoot, 'sources', 'animal-id-map.json'), {});
  await writeJson(path.join(petsRoot, 'reports', 'reindex-report.json'), {
    generatedAt: new Date().toISOString(),
    animals: pets.length,
    unions: unions.length,
  });
  // unions/ exists even before any animal families are recorded.
  await mkdir(path.join(petsRoot, 'unions'), { recursive: true });
  await writeText(path.join(petsRoot, 'unions', '.gitkeep'), '');

  // manifest.json
  const speciesCounts = {};
  for (const record of pets) {
    const key = String(record.species || 'Unknown');
    speciesCounts[key] = (speciesCounts[key] || 0) + 1;
  }
  await writeJson(path.join(petsRoot, 'manifest.json'), {
    schema: 'genepedia/animal-db@1',
    generatedAt: new Date().toISOString(),
    host,
    shardSize: SHARD_SIZE,
    routes: { profile: 'pages/pets/<id>/' },
    layout: {
      persons: `${PETS_DB_ROOT}/persons/<bucket>/<id>.json`,
      unions: `${PETS_DB_ROOT}/unions/<bucket>/<id>.json`,
      summary: `${PETS_DB_ROOT}/index/summary/<bucket>.json`,
      search: `${PETS_DB_ROOT}/index/search/<key>.json`,
    },
    counts: {
      animals: pets.length,
      unions: unions.length,
      withMedia: pets.filter((p) => p.media?.primary || (p.media?.items || []).length).length,
      living: pets.filter((p) => p.living).length,
      species: speciesCounts,
    },
  });

  // Public registry (pages/pets/pets.json).
  const registry = pets.map((record) => ({
    id: record.id,
    displayName: record.names?.display || '',
    species: record.species || '',
    breed: record.breed || '',
    sex: record.sex || 'unknown',
    birthYear: record.events?.birth?.year || null,
    deathYear: record.events?.death?.year || null,
    owner: record.owner != null ? record.owner : null,
    kind: 'pet',
  }));
  await writeJson(path.join(REPO_ROOT, petsRegistryPath()), {
    generatedAt: new Date().toISOString(),
    count: registry.length,
    pets: registry,
  });

  return pets.map((record) => ({ id: record.id, kind: 'pet' }));
}

async function readAllOwnershipConfigs() {
  const configs = [];
  let bucketDirs = [];
  try {
    bucketDirs = await readdir(OWNERSHIP_DIR, { withFileTypes: true });
  } catch {
    return configs;
  }
  for (const bucketDir of bucketDirs) {
    if (!bucketDir.isDirectory()) continue;
    const files = await readdir(path.join(OWNERSHIP_DIR, bucketDir.name));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const config = JSON.parse(await readFile(path.join(OWNERSHIP_DIR, bucketDir.name, file), 'utf8'));
        configs.push({
          personId: file.replace(/\.json$/i, ''),
          config: config && typeof config === 'object' ? config : {},
        });
      } catch (error) {
        console.warn(`Skipping unreadable ownership ${bucketDir.name}/${file}: ${error.message}`);
      }
    }
  }
  return configs;
}

function buildOwnershipLoginIndex(configs) {
  const logins = {};
  for (const { personId, config } of configs) {
    const entries = [
      config?.creator,
      config?.owner,
      ...(Array.isArray(config?.maintainers) ? config.maintainers : []),
    ];
    for (const entry of entries) {
      const login = String(entry?.githubLogin || '').trim().toLowerCase();
      const mappedPersonId = String(entry?.personId || '').trim() || String(personId || '').trim();
      if (login && mappedPersonId && !logins[login]) {
        logins[login] = mappedPersonId;
      }
    }
  }
  return logins;
}

function nameTokens(record) {
  const names = record.names || {};
  const tokens = [];
  const push = (value) => {
    for (const part of String(value || '').split(/\s+/)) {
      if (part) tokens.push(part);
    }
  };
  push(names.given);
  push(names.surname);
  push(names.married);
  push(names.nick);
  for (const alias of names.aliases || []) push(alias);
  return tokens;
}

function summaryOf(record) {
  const kind = record.kind === 'pet' ? 'pet' : 'person';
  return {
    id: record.id,
    name: record.names?.display || '',
    given: record.names?.given || '',
    surname: record.names?.surname || '',
    birthYear: record.events?.birth?.year || null,
    deathYear: record.events?.death?.year || null,
    slug: record.slug || '',
    route: profileRoute(record.id, kind),
    ...(kind === 'pet' ? { kind: 'pet', species: record.species || '' } : {}),
    hasImage: Boolean(record.media?.primary || (record.media?.items || []).length),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const canonicalBase = `https://${args.host}`;

  // Fast path: only regenerate sitemap.xml (no submodule index/shard writes).
  if (args.sitemapOnly) {
    const allIds = await readAllIds();
    const petEntries = await processPets(args.host);
    const urls = sitemapUrls(canonicalBase, [...allIds, ...petEntries]);
    await writeText(path.join(REPO_ROOT, sitemapPath()), sitemapXml(urls));
    console.log(`Sitemap regenerated: ${urls.length} URL(s) — incl. ${allIds.length} people + ${petEntries.length} pets.`);
    return;
  }

  const persons = await readAllPersons();
  const ownershipConfigs = await readAllOwnershipConfigs();
  persons.sort((a, b) => Number(a.id) - Number(b.id));
  console.log(`Read ${persons.length} person records from ${DB_ROOT}/persons.`);

  const summaryByBucket = new Map();
  const searchByKey = new Map();
  const allIds = [];
  const registryPeople = [];

  for (const record of persons) {
    const summary = summaryOf(record);
    const bucket = bucketForId(record.id);
    if (!summaryByBucket.has(bucket)) summaryByBucket.set(bucket, []);
    summaryByBucket.get(bucket).push(summary);

    for (const key of searchKeysForTokens(nameTokens(record))) {
      if (!searchByKey.has(key)) searchByKey.set(key, []);
      searchByKey.get(key).push(summary);
    }
    allIds.push(Number(record.id));
    registryPeople.push({
      id: record.id,
      displayName: record.names?.display || '',
      firstName: record.names?.given || '',
      lastName: record.names?.surname || '',
      birthYear: record.events?.birth?.year || null,
      deathYear: record.events?.death?.year || null,
      ...(record.kind === 'pet' ? { kind: 'pet', species: record.species || '' } : {}),
    });
  }

  // Replace the index/ trees wholesale so deleted people don't linger.
  await rm(path.join(REPO_ROOT, DB_ROOT, 'index', 'summary'), { recursive: true, force: true });
  await rm(path.join(REPO_ROOT, DB_ROOT, 'index', 'search'), { recursive: true, force: true });

  for (const [bucket, list] of summaryByBucket) {
    list.sort((a, b) => a.id - b.id);
    await writeJson(path.join(REPO_ROOT, summaryShardPath(bucket * SHARD_SIZE + 1)), { bucket, count: list.length, persons: list });
  }
  for (const [key, list] of searchByKey) {
    list.sort((a, b) => (a.surname || '').localeCompare(b.surname || '') || a.id - b.id);
    await writeJson(path.join(REPO_ROOT, searchShardPath(key)), { key, count: list.length, persons: list });
  }

  allIds.sort((a, b) => a - b);
  await writeJson(path.join(REPO_ROOT, allIdsPath()), { count: allIds.length, ids: allIds });
  const ownershipLogins = buildOwnershipLoginIndex(ownershipConfigs);
  await writeJson(path.join(REPO_ROOT, ownershipLoginIndexPath()), {
    generatedAt: new Date().toISOString(),
    count: Object.keys(ownershipLogins).length,
    logins: ownershipLogins,
  });

  registryPeople.sort((a, b) => Number(a.id) - Number(b.id));
  await writeJson(path.join(REPO_ROOT, 'pages', 'people', 'people.json'), {
    generatedAt: new Date().toISOString(),
    count: registryPeople.length,
    people: registryPeople,
  });

  // Pets are a separate database; register them and add to the shared sitemap.
  const petEntries = await processPets(args.host);
  const sitemapEntries = [
    ...registryPeople.map((p) => ({ id: p.id, kind: 'person' })),
    ...petEntries,
  ];
  const sitemapUrlList = sitemapUrls(canonicalBase, sitemapEntries);
  await writeText(path.join(REPO_ROOT, sitemapPath()), sitemapXml(sitemapUrlList));

  // Refresh manifest counts (keep other fields).
  try {
    const manifestAbs = path.join(REPO_ROOT, manifestPath());
    const manifest = JSON.parse(await readFile(manifestAbs, 'utf8'));
    manifest.generatedAt = new Date().toISOString();
    manifest.counts = {
      ...(manifest.counts || {}),
      persons: persons.length,
      withNarrative: persons.filter((p) => p.about?.hasNarrative).length,
      withMedia: persons.filter((p) => p.media?.primary || (p.media?.items || []).length).length,
      living: persons.filter((p) => p.living).length,
    };
    await writeJson(manifestAbs, manifest);
  } catch (error) {
    console.warn(`Could not refresh manifest counts: ${error.message}`);
  }

  console.log(`Reindex complete: ${summaryByBucket.size} summary shard(s), ${searchByKey.size} search shard(s), people.json (${registryPeople.length}), ownership logins (${Object.keys(ownershipLogins).length}), sitemap (${sitemapUrlList.length} URLs).`);
  console.log(`Reserved ids preserved if present: ${Object.keys(RESERVED_IDS).join(', ')}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
