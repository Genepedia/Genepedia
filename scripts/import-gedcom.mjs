/**
 * Genepedia GEDCOM -> file-based JSON people database importer.
 *
 * Transforms data/export-Forest.ged into:
 *   - a canonical, sharded JSON database under data/Genepedia-Database/people/
 *   - SEO-friendly per-person profile folders under people/<id>/
 *   - a compatibility people/people.json registry
 *   - import / media / privacy reports
 *
 * Local ids are assigned sequentially from 1, skipping reserved id 15
 * (Nelson Mandela, kept standalone). Nothing is committed; files only.
 *
 * Usage:
 *   node scripts/import-gedcom.mjs --dry-run         # compute + print counts, write nothing
 *   node scripts/import-gedcom.mjs --reset           # remove old people/<n> (except reserved) then import
 *   node scripts/import-gedcom.mjs --media           # also download portraits locally (best effort)
 *   node scripts/import-gedcom.mjs --limit 50        # only import the first N individuals (testing)
 *   node scripts/import-gedcom.mjs --host www.genepedia.org
 */

import { readFile, writeFile, mkdir, rm, readdir, rename as fsRename, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeGedcomBuffer, parseGedcom, records } from './lib/gedcom-parse.mjs';
import { extractPerson, extractUnion, aboutMeToHtml } from './lib/gedcom-extract.mjs';
import { htmlToPlainText } from './lib/geni-notes.mjs';
import { downloadMedia } from './lib/media-fetch.mjs';
import {
  DB_ROOT, SHARD_SIZE, RESERVED_IDS,
  bucketForId, personPath, unionPath, summaryShardPath, manifestPath,
  idMapPath, allIdsPath, exportGedcomPath, searchShardPath, searchKeysForTokens,
  ownershipLoginIndexPath, ownershipPath, sitemapPath, slugify, profileRoute,
} from './lib/people-db-paths.mjs';
import {
  renderProfilePageHtml, renderProfileProseHtml,
} from './lib/render-pages.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GEDCOM_FILE = path.join(REPO_ROOT, 'data', 'export-Forest.ged');
const RESERVED_SET = new Set(Object.keys(RESERVED_IDS).map(Number));
const KEEP_PEOPLE_FILES = new Set(['edit.html', 'index.html', 'people.json', 'new.html']);
const LOCAL_MEDIA_PROFILE_IDS = new Set([1, 2, 3, 15]);

const DEFAULT_CREATOR = {
  personId: '1',
  name: 'Shaun Roselt',
  githubLogin: 'ShaunRoselt',
};

// Hand-authored profiles preserved across imports (standalone, not in the GEDCOM).
// They must still appear in the registry, search index, and summaries, and need
// an SEO index.html so the clean /people/<id>/ route resolves on static hosting.
// Structured data is stored in the JSON database like every other person; the
// editable narrative prose stays in people/<id>/profile.html.
const RESERVED_PEOPLE = [
  {
    id: 15,
    display: 'Nelson Mandela',
    given: 'Rolihlahla Nelson',
    surname: 'Mandela',
    sex: 'male',
    birthYear: 1918,
    deathYear: 2013,
    slug: 'nelson-mandela',
    image: 'images/nelson-mandela-1994.png',
    occupation: 'Anti-apartheid activist; President of South Africa',
    description: 'Nelson Rolihlahla Mandela (1918–2013) was a South African anti-apartheid activist and politician who served as the first president of South Africa from 1994 to 1999.',
    events: {
      birth: { date: '18 JUL 1918', year: 1918, iso: '1918-07-18', precision: 'exact', display: 'July 18, 1918', place: 'Mvezo, Cape Province, South Africa' },
      death: { date: '5 DEC 2013', year: 2013, iso: '2013-12-05', precision: 'exact', display: 'December 5, 2013', place: 'Houghton, Johannesburg, South Africa' },
      baptism: null,
      burial: { date: null, year: null, iso: null, precision: 'exact', display: null, place: 'Qunu, Eastern Cape, South Africa', type: 'burial' },
    },
    familyHtml: [
      '<p>Son of Gadla Henry Mphakanyiswa Mandela and Nosekeni Nonqaphi Fanny Mandela</p>',
      '<p>Husband of Graça Machel, DBE</p>',
      '<p>Ex-husband of Evelyn Mase and Winnie Madikizela-Mandela</p>',
      '<p>Father of Madiba (Thembi) Thembekile Mandela; Makaziwe Mandela; Makgatho Lewanika Mandela; and others</p>',
      '<p>Brother of Mabel Notancu Timakwe and Constance Mbekeni Mandela</p>',
    ].join('\n        '),
  },
];

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
  };
}

function parseArgs(argv) {
  const args = { dryRun: false, reset: false, media: false, limit: 0, mediaLimit: 0, host: 'www.genepedia.org', concurrency: 48 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--reset') args.reset = true;
    else if (arg === '--media') args.media = true;
    else if (arg === '--limit') args.limit = Number(argv[++i]) || 0;
    else if (arg === '--media-limit') args.mediaLimit = Number(argv[++i]) || 0;
    else if (arg === '--host') args.host = String(argv[++i] || args.host).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    else if (arg === '--concurrency') args.concurrency = Number(argv[++i]) || args.concurrency;
  }
  return args;
}

function makeIdAssigner(reserved) {
  let next = 1;
  return () => {
    while (reserved.has(next)) next += 1;
    const id = next;
    next += 1;
    return id;
  };
}

async function runPool(items, worker, concurrency = 48) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  const runners = [];
  for (let i = 0; i < Math.min(concurrency, Math.max(1, items.length)); i += 1) {
    runners.push(next());
  }
  await Promise.all(runners);
}

async function writeJson(absPath, value) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(absPath, value) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, value, 'utf8');
}

async function pathExists(absPath) {
  try {
    await stat(absPath);
    return true;
  } catch {
    return false;
  }
}

function gedcomNameValue(person) {
  const given = (person.names.given || '').replace(/\//g, ' ').trim();
  const surname = (person.names.surname || '').replace(/\//g, ' ').trim();
  return `${given} /${surname}/`.replace(/\s+/g, ' ').trim();
}

function gedcomSex(sex) {
  return sex === 'male' ? 'M' : sex === 'female' ? 'F' : 'U';
}

function sanitizeGedcomLine(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function normalizeRelationshipType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'birth' || normalized === 'biological' || normalized === 'natural') {
    return 'biological';
  }
  if (normalized === 'adopted' || normalized === 'foster' || normalized === 'step' || normalized === 'guardian') {
    return normalized;
  }
  return 'other';
}

function defaultPartnerRoleFor(person, otherPerson, union) {
  const divorced = Boolean(union?.events?.divorce);
  const engaged = Boolean(union?.events?.engagement?.date || union?.events?.engagement?.place);
  const married = Boolean(union?.events?.marriage?.date || union?.events?.marriage?.place);

  if (divorced) {
    if (person?.sex === 'male' && otherPerson?.sex === 'female') return 'ex-wife';
    if (person?.sex === 'female' && otherPerson?.sex === 'male') return 'ex-husband';
    return 'ex-spouse';
  }

  if (engaged && !married) {
    return 'fiance';
  }

  if (married) {
    if (person?.sex === 'male' && otherPerson?.sex === 'female') return 'wife';
    if (person?.sex === 'female' && otherPerson?.sex === 'male') return 'husband';
    return 'spouse';
  }

  return 'partner';
}

function emitIndi(lines, person) {
  lines.push(`0 @P${person.id}@ INDI`);
  lines.push(`1 NAME ${sanitizeGedcomLine(gedcomNameValue(person))}`);
  if (person.names.given) lines.push(`2 GIVN ${sanitizeGedcomLine(person.names.given)}`);
  if (person.names.surname) lines.push(`2 SURN ${sanitizeGedcomLine(person.names.surname)}`);
  if (person.names.display) lines.push(`2 _DISP ${sanitizeGedcomLine(person.names.display)}`);
  lines.push(`1 SEX ${gedcomSex(person.sex)}`);
  for (const [tag, event] of [['BIRT', person.events.birth], ['DEAT', person.events.death]]) {
    if (event && (event.date || event.place)) {
      lines.push(`1 ${tag}`);
      if (event.date) lines.push(`2 DATE ${sanitizeGedcomLine(event.date)}`);
      if (event.place) lines.push(`2 PLAC ${sanitizeGedcomLine(event.place)}`);
    }
  }
  lines.push(`1 REFN ${person.id}`);
  lines.push('2 TYPE genepedia');
  for (const unionId of person.relationships.parentUnions) {
    lines.push(`1 FAMC @${unionId}@`);
    const parentLinks = Array.isArray(person.relationships?.parentLinks)
      ? person.relationships.parentLinks.filter((entry) => String(entry?.unionId || '') === String(unionId))
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
  for (const unionId of person.relationships.spouseUnions) lines.push(`1 FAMS @${unionId}@`);
}

function emitFam(lines, union, personsById) {
  lines.push(`0 @${union.id}@ FAM`);
  const husbands = [];
  const wives = [];
  for (const pid of union.partners) {
    const partner = personsById.get(pid);
    if (partner && partner.sex === 'female') wives.push(pid);
    else husbands.push(pid);
  }
  for (const pid of husbands) lines.push(`1 HUSB @P${pid}@`);
  for (const pid of wives) lines.push(`1 WIFE @P${pid}@`);
  for (const pid of union.children) lines.push(`1 CHIL @P${pid}@`);
  if (union.events.engagement && (union.events.engagement.date || union.events.engagement.place)) {
    lines.push('1 ENGA');
    if (union.events.engagement.date) lines.push(`2 DATE ${sanitizeGedcomLine(union.events.engagement.date)}`);
    if (union.events.engagement.place) lines.push(`2 PLAC ${sanitizeGedcomLine(union.events.engagement.place)}`);
  }
  if (union.events.marriage && (union.events.marriage.date || union.events.marriage.place)) {
    lines.push('1 MARR');
    if (union.events.marriage.date) lines.push(`2 DATE ${sanitizeGedcomLine(union.events.marriage.date)}`);
    if (union.events.marriage.place) lines.push(`2 PLAC ${sanitizeGedcomLine(union.events.marriage.place)}`);
  }
  if (union.events.divorce && (union.events.divorce.date || union.events.divorce.place)) {
    lines.push('1 DIV');
    if (union.events.divorce.date) lines.push(`2 DATE ${sanitizeGedcomLine(union.events.divorce.date)}`);
    if (union.events.divorce.place) lines.push(`2 PLAC ${sanitizeGedcomLine(union.events.divorce.place)}`);
  }
}

function gedcomHeader(extra = '') {
  const today = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const date = `${today.getUTCDate()} ${months[today.getUTCMonth()]} ${today.getUTCFullYear()}`;
  return [
    '0 HEAD',
    '1 GEDC',
    '2 VERS 5.5.5',
    '2 FORM LINEAGE-LINKED',
    '3 VERS 5.5.5',
    '1 CHAR UTF-8',
    '1 SOUR GENEPEDIA',
    '2 NAME Genepedia',
    '2 VERS 1.0.0',
    '1 DEST GENEPEDIA',
    `1 DATE ${date}`,
    `1 FILE ${extra || 'family-tree.ged'}`,
    '1 LANG English',
    '1 SUBM @U1@',
    '0 @U1@ SUBM',
    '1 NAME Genepedia',
  ];
}

function buildFullTreeGedcom(personsById, unionsById) {
  const lines = gedcomHeader('full-tree.ged');
  for (const person of personsById.values()) emitIndi(lines, person);
  for (const union of unionsById.values()) emitFam(lines, union, personsById);
  lines.push('0 TRLR');
  return `${lines.join('\n')}\n`;
}

function nameTokens(person) {
  const tokens = [];
  const push = (value) => {
    for (const part of String(value || '').split(/\s+/)) {
      if (part) tokens.push(part);
    }
  };
  push(person.names.given);
  push(person.names.surname);
  push(person.names.married);
  push(person.names.nick);
  for (const alias of person.names.aliases || []) push(alias);
  return tokens;
}

function addOwnershipLoginEntries(target, ownership, fallbackPersonId) {
  const entries = [
    ownership?.creator,
    ownership?.owner,
    ...(Array.isArray(ownership?.maintainers) ? ownership.maintainers : []),
  ];

  for (const entry of entries) {
    const login = String(entry?.githubLogin || '').trim().toLowerCase();
    const personId = String(entry?.personId || '').trim() || String(fallbackPersonId || '').trim();
    if (login && personId && !target[login]) {
      target[login] = personId;
    }
  }
}

async function performReset(peopleDir) {
  let removed = 0;
  const entries = await readdir(peopleDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^[0-9]+$/.test(entry.name)) continue;
    if (RESERVED_SET.has(Number(entry.name))) continue;
    await rm(path.join(peopleDir, entry.name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const canonicalBase = `https://${args.host}`;

  console.log(`Reading GEDCOM: ${path.relative(REPO_ROOT, GEDCOM_FILE)}`);
  const sourceBuffer = await readFile(GEDCOM_FILE);
  const { text, charset } = decodeGedcomBuffer(sourceBuffer);
  const root = parseGedcom(text);
  console.log(`Detected GEDCOM charset: ${charset}`);

  let indiNodes = records(root, 'INDI');
  const famNodes = records(root, 'FAM');
  if (args.limit > 0) {
    indiNodes = indiNodes.slice(0, args.limit);
  }
  console.log(`Parsed ${indiNodes.length} individuals, ${famNodes.length} families.`);

  // --- Pass 1: extract + assign local ids (sequential, skipping reserved 15) ---
  const assignId = makeIdAssigner(RESERVED_SET);
  const extractedPersons = [];
  const xrefToLocalId = new Map();
  const geniIdToLocalId = new Map();

  for (const indi of indiNodes) {
    const extracted = extractPerson(indi);
    const id = assignId();
    extracted.id = id;
    xrefToLocalId.set(extracted.xref, id);
    if (extracted.geniId) geniIdToLocalId.set(extracted.geniId, id);
    extractedPersons.push(extracted);
  }

  // Unions keep their own id namespace: F1, F2, ... in file order.
  const extractedUnions = [];
  const xrefToUnionId = new Map();
  let unionCounter = 0;
  for (const fam of famNodes) {
    const extracted = extractUnion(fam);
    unionCounter += 1;
    extracted.id = `F${unionCounter}`;
    xrefToUnionId.set(extracted.xref, extracted.id);
    extractedUnions.push(extracted);
  }

  const pedigreeByChildAndUnion = new Map();
  for (const extracted of extractedPersons) {
    for (const family of extracted.relationships.parentFamilies || []) {
      const unionId = xrefToUnionId.get(family.xref);
      if (!unionId) continue;
      pedigreeByChildAndUnion.set(`${extracted.id}:${unionId}`, normalizeRelationshipType(family.pedigree));
    }
  }

  // --- Pass 2: build union records with local ids ---
  const unionsById = new Map();
  for (const union of extractedUnions) {
    const partners = union.partners.map((xref) => xrefToLocalId.get(xref)).filter((id) => id != null);
    const children = union.children.map((xref) => xrefToLocalId.get(xref)).filter((id) => id != null);
    unionsById.set(union.id, {
      id: union.id,
      schema: 'genepedia/union@1',
      partners,
      children,
      events: union.events,
      source: { gedcomXref: union.xref },
    });
  }

  // --- Pass 3: build person records + relationship sets ---
  const personsById = new Map();
  const relsById = new Map();
  const usedSlugs = new Map();

  function uniqueSlug(name, id) {
    let slug = slugify(name, id);
    if (usedSlugs.has(slug) && usedSlugs.get(slug) !== id) {
      slug = `${slug}-${id}`;
    }
    usedSlugs.set(slug, id);
    return slug;
  }

  function rewriteLink(url) {
    const match = String(url).match(/geni\.com\/people\/[^/]+\/(\d+)/i);
    if (match) {
      const localId = geniIdToLocalId.get(match[1]);
      if (localId) return `../${localId}/`;
    }
    return url;
  }

  for (const extracted of extractedPersons) {
    const id = extracted.id;
    const slug = uniqueSlug(extracted.name.display, id);
    const route = profileRoute(id);
    const canonical = `${canonicalBase}/${route}`;
    const aboutHtml = extracted.aboutRaw ? aboutMeToHtml(extracted.aboutRaw, { rewriteLink }) : '';

    relsById.set(id, {
      parents: new Set(), spouses: new Set(), exSpouses: new Set(),
      children: new Set(), siblings: new Set(),
      parentUnions: new Set(), spouseUnions: new Set(),
      parentLinks: [], partnerLinks: [], childLinks: [],
    });

    personsById.set(id, {
      id,
      schema: 'genepedia/person@1',
      slug,
      names: {
        display: extracted.name.display,
        given: extracted.name.given,
        surname: extracted.name.surname,
        married: extracted.name.married || '',
        nick: extracted.name.nick || '',
        aliases: extracted.aliases,
      },
      sex: extracted.sex,
      living: extracted.living,
      events: extracted.events,
      lastResidence: extracted.lastResidence,
      lastResidenceLocation: extracted.lastResidenceLocation,
      occupation: extracted.occupation,
      attributes: extracted.attributes,
      education: extracted.education,
      media: { primary: null, items: extracted.media },
      about: { hasNarrative: Boolean(aboutHtml) },
      relationships: {
        parents: [], spouses: [], exSpouses: [], children: [], siblings: [],
        parentUnions: [], spouseUnions: [], parentLinks: [], partnerLinks: [], childLinks: [],
      },
      source: {
        gedcomXref: extracted.xref,
        geniId: extracted.geniId,
        rfn: extracted.rfn,
        changed: extracted.changed,
      },
      page: { route, canonical },
      generatedAt: new Date().toISOString(),
      _aboutHtml: aboutHtml,
      _emails: extracted.emails,
    });
  }

  // Populate relationship sets from unions.
  for (const union of unionsById.values()) {
    const divorced = Boolean(union.events.divorce);
    for (const partnerId of union.partners) {
      const rel = relsById.get(partnerId);
      if (!rel) continue;
      rel.spouseUnions.add(union.id);
      for (const otherId of union.partners) {
        if (otherId === partnerId) continue;
        (divorced ? rel.exSpouses : rel.spouses).add(otherId);
        rel.partnerLinks.push({
          id: otherId,
          unionId: union.id,
          role: defaultPartnerRoleFor(personsById.get(partnerId), personsById.get(otherId), union),
        });
      }
      for (const childId of union.children) {
        rel.children.add(childId);
        rel.childLinks.push({
          id: childId,
          unionId: union.id,
          type: pedigreeByChildAndUnion.get(`${childId}:${union.id}`) || 'biological',
        });
      }
    }
    for (const childId of union.children) {
      const rel = relsById.get(childId);
      if (!rel) continue;
      rel.parentUnions.add(union.id);
      for (const parentId of union.partners) {
        rel.parents.add(parentId);
        rel.parentLinks.push({
          id: parentId,
          unionId: union.id,
          type: pedigreeByChildAndUnion.get(`${childId}:${union.id}`) || 'biological',
        });
      }
      for (const siblingId of union.children) {
        if (siblingId !== childId) rel.siblings.add(siblingId);
      }
    }
  }

  function dedupeRelationshipEntries(entries, valueKey) {
    const seen = new Set();
    return (entries || []).flatMap((entry) => {
      const id = entry?.id;
      const unionId = String(entry?.unionId || '').trim();
      if (id == null || !unionId) {
        return [];
      }
      const key = `${id}|${unionId}`;
      if (seen.has(key)) {
        return [];
      }
      seen.add(key);
      const value = String(entry?.[valueKey] || '').trim();
      const label = String(entry?.label || '').trim();
      return [{
        id,
        unionId,
        ...(value ? { [valueKey]: value } : {}),
        ...(label ? { label } : {}),
      }];
    });
  }

  // Finalize relationship arrays on each person record.
  for (const [id, rel] of relsById) {
    const person = personsById.get(id);
    person.relationships = {
      parents: [...rel.parents],
      spouses: [...rel.spouses],
      exSpouses: [...rel.exSpouses],
      children: [...rel.children],
      siblings: [...rel.siblings],
      parentUnions: [...rel.parentUnions],
      spouseUnions: [...rel.spouseUnions],
      parentLinks: dedupeRelationshipEntries(rel.parentLinks, 'type'),
      partnerLinks: dedupeRelationshipEntries(rel.partnerLinks, 'role'),
      childLinks: dedupeRelationshipEntries(rel.childLinks, 'type'),
    };
  }

  // --- Stats ---
  const stats = {
    persons: personsById.size,
    unions: unionsById.size,
    withNarrative: 0,
    withMedia: 0,
    living: 0,
    emailsRedacted: 0,
  };
  for (const person of personsById.values()) {
    if (person.about.hasNarrative) stats.withNarrative += 1;
    if (person.media.items.length) stats.withMedia += 1;
    if (person.living) stats.living += 1;
    if (person.living && person._emails.length) stats.emailsRedacted += person._emails.length;
  }

  console.log('Computed records:');
  console.log(`  persons:        ${stats.persons}`);
  console.log(`  unions:         ${stats.unions}`);
  console.log(`  with narrative: ${stats.withNarrative}`);
  console.log(`  with media:     ${stats.withMedia}`);
  console.log(`  living:         ${stats.living}`);

  // Verify id sequence (1.. skipping reserved).
  const ids = [...personsById.keys()].sort((a, b) => a - b);
  const expected = [];
  const assigner = makeIdAssigner(RESERVED_SET);
  for (let i = 0; i < ids.length; i += 1) expected.push(assigner());
  const sequenceOk = ids.length === expected.length && ids.every((v, i) => v === expected[i]);
  console.log(`  id sequence ok: ${sequenceOk} (min ${ids[0]}, max ${ids[ids.length - 1]}, reserved 15 skipped: ${!ids.includes(15)})`);

  if (args.dryRun) {
    console.log('\nDry run complete — no files written.');
    return;
  }

  // --- Reset old people folders (keep reserved) ---
  const peopleDir = path.join(REPO_ROOT, 'people');
  if (args.reset) {
    const removed = await performReset(peopleDir);
    console.log(`Reset: removed ${removed} old person folder(s) (kept reserved ${[...RESERVED_SET].join(', ')}).`);
  }

  // --- Media plan + optional download ---
  const mediaReport = { downloaded: 0, skipped: 0, failed: 0, pending: 0, failures: [] };
  let mediaProcessed = 0;

  async function resolveMediaItems(person) {
    const items = Array.isArray(person.media.items) ? person.media.items : [];
    if (!items.length) return [];

    const imagesDir = path.join(peopleDir, String(person.id), 'images');

    const resolved = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const entry = { ...item, local: item.local || null, remote: item.remote || null };
      const remoteUrl = String(item.remote || '').trim();
      if (!remoteUrl) {
        resolved.push(entry);
        continue;
      }

      if (args.media && (!args.mediaLimit || mediaProcessed < args.mediaLimit)) {
        mediaProcessed += 1;
        const baseName = item.primary ? `${person.slug}-portrait` : `${person.slug}-${index + 1}`;
        const result = await downloadMedia(remoteUrl, imagesDir, baseName, { form: item.form, timeoutMs: 180000 });
        if (result.ok) {
          if (result.skipped) mediaReport.skipped += 1; else mediaReport.downloaded += 1;
          entry.local = `images/${result.localFile}`;
        } else {
          mediaReport.failed += 1;
          if (mediaReport.failures.length < 25) {
            mediaReport.failures.push({ id: person.id, url: remoteUrl, error: result.error });
          }
        }
      } else {
        mediaReport.pending += 1;
      }

      resolved.push(entry);
    }

    return resolved;
  }

  // --- Write per-person folders (SEO shell + editable prose only) ---
  // Structured data lives in the JSON database; the frontend renders the infobox,
  // relationships, media, and tree from there. Ownership lives in the DB too.
  const ownershipLogins = {};
  const allPersons = [...personsById.values()];
  await runPool(allPersons, async (person) => {
    const personDir = path.join(peopleDir, String(person.id));
    const profilePath = path.join(personDir, 'profile.html');
    const ownership = {
      creator: DEFAULT_CREATOR,
      owner: null,
      maintainers: [DEFAULT_CREATOR],
    };

    // Imported living people default to private so their details aren't exposed
    // until a maintainer reviews them. Deceased profiles are always public and
    // get no privacy block. (Manually created profiles default to public.)
    if (person.living) {
      ownership.privacy = { visibility: 'private', maintainersOnly: true };
    }

    const resolvedMediaItems = await resolveMediaItems(person);
    person.media.items = resolvedMediaItems;
    const primaryItem = resolvedMediaItems.find((item) => item.primary) || resolvedMediaItems[0] || null;
    person.media.primary = primaryItem
      ? { local: primaryItem.local || null, remote: primaryItem.remote || null, alt: person.names.display }
      : null;

    const description = person._aboutHtml
      ? htmlToPlainText(person._aboutHtml, 160)
      : `${person.names.display} on Genepedia — relatives, biography, timeline, and sources.`;

    const birthYear = person.events.birth?.year || null;
    const deathYear = person.events.death?.year || null;
    const preferLocalShellMedia = LOCAL_MEDIA_PROFILE_IDS.has(Number(person.id));
    const imageUrl = person.media.primary
      ? (preferLocalShellMedia
        ? (person.media.primary.local ? `${person.page.canonical}${person.media.primary.local}` : person.media.primary.remote)
        : (person.media.primary.remote || (person.media.primary.local ? `${person.page.canonical}${person.media.primary.local}` : null)))
      : null;

    await Promise.all([
      writeText(path.join(personDir, 'index.html'), renderProfilePageHtml({
        id: person.id, person, canonicalUrl: person.page.canonical, description, imageUrl, birthYear, deathYear,
      })),
      writeText(profilePath, renderProfileProseHtml({ person, aboutHtml: person._aboutHtml })),
      writeJson(path.join(REPO_ROOT, ownershipPath(person.id)), ownership),
    ]);
    addOwnershipLoginEntries(ownershipLogins, ownership, person.id);
  }, args.concurrency);
  console.log(`Wrote ${allPersons.length} person folders (index.html + profile.html) and ownership records.`);

  // --- Write canonical JSON database ---
  const summaryByBucket = new Map();
  const searchByKey = new Map();
  const allIds = [];

  for (const person of allPersons) {
    const { _aboutHtml, _emails, ...record } = person;
    await writeJson(path.join(REPO_ROOT, personPath(person.id)), record);

    const birthYear = person.events.birth?.year || null;
    const deathYear = person.events.death?.year || null;
    const summary = {
      id: person.id,
      name: person.names.display,
      given: person.names.given,
      surname: person.names.surname,
      birthYear,
      deathYear,
      slug: person.slug,
      route: person.page.route,
      hasImage: Boolean(person.media.items.length),
    };

    const bucket = bucketForId(person.id);
    if (!summaryByBucket.has(bucket)) summaryByBucket.set(bucket, []);
    summaryByBucket.get(bucket).push(summary);

    for (const key of searchKeysForTokens(nameTokens(person))) {
      if (!searchByKey.has(key)) searchByKey.set(key, []);
      searchByKey.get(key).push(summary);
    }
    allIds.push(person.id);
  }

  // Inject reserved (hand-authored) people so they remain searchable + listed.
  const reservedSummaries = [];
  for (const reserved of RESERVED_PEOPLE) {
    const route = profileRoute(reserved.id);
    const summary = {
      id: reserved.id,
      name: reserved.display,
      given: reserved.given,
      surname: reserved.surname,
      birthYear: reserved.birthYear || null,
      deathYear: reserved.deathYear || null,
      slug: reserved.slug,
      route,
      hasImage: true,
    };
    reservedSummaries.push(summary);

    const bucket = bucketForId(reserved.id);
    if (!summaryByBucket.has(bucket)) summaryByBucket.set(bucket, []);
    summaryByBucket.get(bucket).push(summary);
    const tokens = [reserved.given, reserved.surname, reserved.display].filter(Boolean);
    for (const key of searchKeysForTokens(tokens)) {
      if (!searchByKey.has(key)) searchByKey.set(key, []);
      searchByKey.get(key).push(summary);
    }
    allIds.push(reserved.id);

    // Canonical record — structured data in the database, same as everyone else.
    // familyHtml preserves the hand-authored immediate-family text (standalone).
    const reservedImageLocal = reserved.image || null;
    await writeJson(path.join(REPO_ROOT, personPath(reserved.id)), {
      id: reserved.id,
      schema: 'genepedia/person@1',
      slug: reserved.slug,
      names: { display: reserved.display, given: reserved.given, surname: reserved.surname, married: '', nick: '', aliases: [] },
      sex: reserved.sex,
      living: false,
      events: reserved.events || {
        birth: reserved.birthYear ? { date: null, year: reserved.birthYear, iso: String(reserved.birthYear), display: String(reserved.birthYear), place: null } : null,
        death: reserved.deathYear ? { date: null, year: reserved.deathYear, iso: String(reserved.deathYear), display: String(reserved.deathYear), place: null } : null,
        baptism: null,
        burial: null,
      },
      occupation: reserved.occupation || null,
      lastResidence: null,
      lastResidenceLocation: null,
      attributes: emptyAttributes(),
      education: [],
      media: { primary: reservedImageLocal ? { local: reservedImageLocal, remote: null, alt: reserved.display } : null, items: [] },
      about: { hasNarrative: true },
      relationships: { parents: [], spouses: [], exSpouses: [], children: [], siblings: [], parentUnions: [], spouseUnions: [] },
      familyHtml: reserved.familyHtml || '',
      source: { reserved: true, note: 'Hand-authored standalone profile, preserved across imports.' },
      page: { route, canonical: `${canonicalBase}/${route}` },
      generatedAt: new Date().toISOString(),
    });

    const reservedDir = path.join(peopleDir, String(reserved.id));
    if (await pathExists(reservedDir)) {
      const canonicalUrl = `${canonicalBase}/${route}`;
      const personLike = {
        names: { display: reserved.display, given: reserved.given, surname: reserved.surname, aliases: [] },
        sex: reserved.sex,
        events: reserved.events || {
          birth: reserved.birthYear ? { date: null, year: reserved.birthYear } : null,
          death: reserved.deathYear ? { date: null, year: reserved.deathYear } : null,
        },
      };
      const imageUrl = reservedImageLocal ? `${canonicalUrl}${reservedImageLocal}` : null;

      // Preserve ownership from the legacy per-person profile.json, then migrate
      // it into the database and remove the redundant per-person files.
      let ownership = { creator: null, owner: null, maintainers: [] };
      try {
        const legacy = JSON.parse(await readFile(path.join(reservedDir, 'profile.json'), 'utf8'));
        if (legacy && typeof legacy === 'object') {
          ownership = {
            creator: legacy.creator ?? null,
            owner: legacy.owner ?? null,
            maintainers: Array.isArray(legacy.maintainers) ? legacy.maintainers : [],
          };
        }
      } catch {
        // no legacy ownership; keep defaults
      }
      await writeJson(path.join(REPO_ROOT, ownershipPath(reserved.id)), ownership);
      addOwnershipLoginEntries(ownershipLogins, ownership, reserved.id);

      // Keep the editable prose, but drop the legacy infobox include — the
      // identity infobox is now rendered from the database record.
      try {
        const prosePath = await pathExists(path.join(reservedDir, 'profile.html'))
          ? path.join(reservedDir, 'profile.html')
          : path.join(reservedDir, 'data', 'profile.html');
        let prose = await readFile(prosePath, 'utf8');
        const cleaned = prose.replace(/\s*<include\s+src=["']profile-table\.html["']\s*>\s*<\/include>\s*/gi, '\n\n');
        await writeText(path.join(reservedDir, 'profile.html'), cleaned !== prose ? cleaned : prose);
      } catch {
        // no prose file; nothing to clean
      }

      try {
        const oldImagesDir = path.join(reservedDir, 'data', 'images');
        const newImagesDir = path.join(reservedDir, 'images');
        if (await pathExists(oldImagesDir) && !(await pathExists(newImagesDir))) {
          await fsRename(oldImagesDir, newImagesDir);
        }
      } catch {
        // leave existing images in place if migration fails
      }

      await writeText(path.join(reservedDir, 'index.html'), renderProfilePageHtml({
        id: reserved.id, person: personLike, canonicalUrl, description: reserved.description,
        imageUrl, birthYear: reserved.birthYear || null, deathYear: reserved.deathYear || null,
      }));

      // Remove redundant per-person files now superseded by the database.
      for (const stale of ['profile.json', 'data/profile-table.html', 'data/family-tree.ged', 'data/media.html', 'data/tree.html']) {
        await rm(path.join(reservedDir, stale), { force: true }).catch(() => { });
      }
      await rm(path.join(reservedDir, 'data'), { recursive: true, force: true }).catch(() => { });
    }
  }

  for (const union of unionsById.values()) {
    await writeJson(path.join(REPO_ROOT, unionPath(union.id)), union);
  }
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
  await writeJson(path.join(REPO_ROOT, ownershipLoginIndexPath()), {
    generatedAt: new Date().toISOString(),
    count: Object.keys(ownershipLogins).length,
    logins: ownershipLogins,
  });

  // --- Sitemap for SEO (one URL per profile directory route) ---
  const sitemapEntries = allIds
    .map((id) => `  <url><loc>${canonicalBase}/${profileRoute(id)}</loc></url>`)
    .join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
  await writeText(path.join(REPO_ROOT, sitemapPath()), sitemapXml);

  await writeJson(path.join(REPO_ROOT, idMapPath()), {
    generatedAt: new Date().toISOString(),
    byXref: Object.fromEntries(xrefToLocalId),
    byGeniId: Object.fromEntries(geniIdToLocalId),
    unionsByXref: Object.fromEntries(xrefToUnionId),
  });

  await writeText(path.join(REPO_ROOT, exportGedcomPath()), buildFullTreeGedcom(personsById, unionsById));

  await writeJson(path.join(REPO_ROOT, manifestPath()), {
    schema: 'genepedia/people-db@1',
    generatedAt: new Date().toISOString(),
    host: args.host,
    source: 'data/export-Forest.ged',
    shardSize: SHARD_SIZE,
    reserved: RESERVED_IDS,
    routes: { profile: 'people/<id>/' },
    layout: {
      persons: `${DB_ROOT}/persons/<bucket>/<id>.json`,
      unions: `${DB_ROOT}/unions/<bucket>/<id>.json`,
      summary: `${DB_ROOT}/index/summary/<bucket>.json`,
      search: `${DB_ROOT}/index/search/<key>.json`,
    },
    counts: stats,
  });

  // --- Compatibility registry (existing search/profile lookups) ---
  const registryPeople = allPersons
    .map((person) => ({
      id: person.id,
      firstName: person.names.given,
      lastName: person.names.surname,
      birthYear: person.events.birth?.year || null,
      deathYear: person.events.death?.year || null,
    }))
    .concat(RESERVED_PEOPLE.map((reserved) => ({
      id: reserved.id,
      firstName: reserved.given,
      lastName: reserved.surname,
      birthYear: reserved.birthYear || null,
      deathYear: reserved.deathYear || null,
    })))
    .sort((a, b) => a.id - b.id);
  await writeJson(path.join(peopleDir, 'people.json'), {
    generatedAt: new Date().toISOString(),
    count: registryPeople.length,
    people: registryPeople,
  });

  // --- Reports ---
  const reportsDir = path.join(REPO_ROOT, DB_ROOT, 'reports');
  await writeJson(path.join(reportsDir, 'import-report.json'), {
    generatedAt: new Date().toISOString(),
    counts: stats,
    idSequenceOk: sequenceOk,
    minId: ids[0],
    maxId: ids[ids.length - 1],
    reservedSkipped: [...RESERVED_SET],
  });
  await writeJson(path.join(reportsDir, 'media-report.json'), {
    generatedAt: new Date().toISOString(),
    mediaDownloadsEnabled: args.media,
    ...mediaReport,
  });
  await writeJson(path.join(reportsDir, 'privacy-report.json'), {
    generatedAt: new Date().toISOString(),
    livingPeople: stats.living,
    emailsRedacted: stats.emailsRedacted,
    note: 'Emails for living people are dropped from records and never rendered on pages.',
  });

  console.log(`\nDatabase written under ${DB_ROOT}/`);
  console.log(`Media: downloaded ${mediaReport.downloaded}, skipped ${mediaReport.skipped}, failed ${mediaReport.failed}, pending ${mediaReport.pending}`);
  console.log('Import complete.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
