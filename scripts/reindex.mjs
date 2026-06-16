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
  DB_ROOT, SHARD_SIZE, RESERVED_IDS,
  bucketForId, summaryShardPath, manifestPath, allIdsPath, searchShardPath,
  ownershipLoginIndexPath, searchKeysForTokens, profileRoute, sitemapPath,
} from './lib/people-db-paths.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PERSONS_DIR = path.join(REPO_ROOT, DB_ROOT, 'persons');
const OWNERSHIP_DIR = path.join(REPO_ROOT, DB_ROOT, 'ownership');

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
function sitemapUrls(canonicalBase, allIds) {
  const urls = [];
  for (const page of STATIC_SITEMAP_PAGES) {
    if (existsSync(path.join(REPO_ROOT, page))) {
      urls.push(`${canonicalBase}/${page}`);
    } else {
      console.warn(`Sitemap: skipping missing static page ${page}`);
    }
  }
  for (const id of allIds) {
    urls.push(`${canonicalBase}/people/${id}/index.html`);
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
  return {
    id: record.id,
    name: record.names?.display || '',
    given: record.names?.given || '',
    surname: record.names?.surname || '',
    birthYear: record.events?.birth?.year || null,
    deathYear: record.events?.death?.year || null,
    slug: record.slug || '',
    route: record.page?.route || profileRoute(record.id),
    hasImage: Boolean(record.media?.primary || (record.media?.items || []).length),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const canonicalBase = `https://${args.host}`;

  // Fast path: only regenerate sitemap.xml (no submodule index/shard writes).
  if (args.sitemapOnly) {
    const allIds = await readAllIds();
    const urls = sitemapUrls(canonicalBase, allIds);
    await writeText(path.join(REPO_ROOT, sitemapPath()), sitemapXml(urls));
    console.log(`Sitemap regenerated: ${urls.length} URL(s) — ${urls.length - allIds.length} static page(s) + ${allIds.length} profile(s).`);
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
      firstName: record.names?.given || '',
      lastName: record.names?.surname || '',
      birthYear: record.events?.birth?.year || null,
      deathYear: record.events?.death?.year || null,
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
  await writeJson(path.join(REPO_ROOT, 'people', 'people.json'), {
    generatedAt: new Date().toISOString(),
    count: registryPeople.length,
    people: registryPeople,
  });

  const sitemapUrlList = sitemapUrls(canonicalBase, allIds);
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
