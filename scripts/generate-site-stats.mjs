import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DB_ROOT = path.join(REPO_ROOT, 'data', 'Genepedia-Database', 'people');
const PERSONS_DIR = path.join(DB_ROOT, 'persons');
const OWNERSHIP_DIR = path.join(DB_ROOT, 'ownership');
const REPORTS_DIR = path.join(DB_ROOT, 'reports');
const OUT_PATH = path.join(REPO_ROOT, 'data', 'site-stats.json');

async function readJson(absPath, fallback = null) {
  try {
    return JSON.parse(await readFile(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readAllBucketedJson(rootDir) {
  const items = [];
  let bucketDirs = [];
  try {
    bucketDirs = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return items;
  }

  for (const bucketDir of bucketDirs) {
    if (!bucketDir.isDirectory()) continue;
    const dirPath = path.join(rootDir, bucketDir.name);
    const files = await readdir(dirPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const value = await readJson(path.join(dirPath, file), null);
      if (value) items.push(value);
    }
  }
  return items;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function median(values) {
  const nums = values.map((v) => Number(v || 0)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

async function main() {
  const persons = await readAllBucketedJson(PERSONS_DIR);
  const ownership = await readAllBucketedJson(OWNERSHIP_DIR);
  const manifest = await readJson(path.join(DB_ROOT, 'manifest.json'), {});
  const importReport = await readJson(path.join(REPORTS_DIR, 'import-report.json'), {});
  const mediaReport = await readJson(path.join(REPORTS_DIR, 'media-report.json'), {});
  const privacyReport = await readJson(path.join(REPORTS_DIR, 'privacy-report.json'), {});
  const fileStats = await readJson(path.join(REPO_ROOT, 'data', 'file-stats.json'), []);
  const ownershipLogins = await readJson(path.join(DB_ROOT, 'index', 'ownership-logins.json'), { count: 0, logins: {} });

  const peopleDirs = await readdir(path.join(REPO_ROOT, 'people'), { withFileTypes: true }).catch(() => []);
  const profileDirCount = peopleDirs.filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name)).length;

  const withImages = persons.filter((person) => person.media?.primary || (person.media?.items || []).length > 0);
  const mediaItemsPerProfile = persons.map((person) => (person.media?.items || []).length);
  const narrativeLengths = persons.map((person) => Number(person.about?.hasNarrative ? 1 : 0));
  const living = persons.filter((person) => person.living).length;
  const deceased = persons.length - living;
  const withBirth = persons.filter((person) => person.events?.birth).length;
  const withDeath = persons.filter((person) => person.events?.death).length;
  const withOccupation = persons.filter((person) => person.occupation).length;
  const withRelationships = persons.filter((person) => (person.relationships?.parents || []).length || (person.relationships?.children || []).length || (person.relationships?.spouses || []).length).length;
  const claimedProfiles = ownership.filter((config) => config.owner && config.owner.githubLogin).length;
  const maintainerAssignments = sum(ownership.map((config) => Array.isArray(config.maintainers) ? config.maintainers.length : 0));
  const uniqueLogins = Object.keys(ownershipLogins.logins || {}).length;
  const generatedAt = new Date().toISOString();

  const stats = {
    generatedAt,
    site: {
      appName: 'Genepedia',
      host: manifest.host || 'www.genepedia.org',
      profileDirectoryCount: profileDirCount,
    },
    profiles: {
      total: persons.length,
      living,
      deceased,
      withNarrative: manifest.counts?.withNarrative || sum(narrativeLengths),
      withImages: withImages.length,
      withBirth,
      withDeath,
      withOccupation,
      withRelationships,
      claimedProfiles,
      uniqueLoginMappings: uniqueLogins,
      maintainerAssignments,
    },
    families: {
      unions: manifest.counts?.unions || importReport.counts?.unions || 0,
    },
    media: {
      downloaded: mediaReport.downloaded || 0,
      skipped: mediaReport.skipped || 0,
      failed: mediaReport.failed || 0,
      totalItems: sum(mediaItemsPerProfile),
      profilesWithMedia: withImages.length,
      averageItemsPerProfileWithMedia: withImages.length ? Math.round((sum(mediaItemsPerProfile) / withImages.length) * 10) / 10 : 0,
      medianItemsPerProfile: median(mediaItemsPerProfile),
    },
    privacy: {
      emailsRedacted: privacyReport.emailsRedacted || manifest.counts?.emailsRedacted || 0,
    },
    content: {
      fileStatsEntries: Array.isArray(fileStats) ? fileStats.length : 0,
      latestImportAt: importReport.generatedAt || manifest.generatedAt || null,
      latestMediaSyncAt: mediaReport.generatedAt || null,
    },
    ownership: {
      creatorProfiles: ownership.filter((config) => config.creator?.githubLogin).length,
      ownerProfiles: claimedProfiles,
      maintainerAssignments,
      loginMappings: uniqueLogins,
    },
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(stats, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, OUT_PATH)} with ${persons.length} profiles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
