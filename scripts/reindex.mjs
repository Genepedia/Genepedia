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
 */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
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
  const args = { host: 'www.genepedia.org' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host') {
      args.host = String(argv[++i] || args.host).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }
  }
  return args;
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

  const sitemapEntries = allIds
    .map((id) => `  <url><loc>${canonicalBase}/${profileRoute(id)}</loc></url>`)
    .join('\n');
  await writeText(
    path.join(REPO_ROOT, sitemapPath()),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  );

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

  console.log(`Reindex complete: ${summaryByBucket.size} summary shard(s), ${searchByKey.size} search shard(s), people.json (${registryPeople.length}), ownership logins (${Object.keys(ownershipLogins).length}), sitemap (${allIds.length}).`);
  console.log(`Reserved ids preserved if present: ${Object.keys(RESERVED_IDS).join(', ')}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
