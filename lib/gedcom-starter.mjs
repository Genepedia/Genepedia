/**
 * Build minimal Genepedia starter GEDCOM 5.5.5 files (one root individual).
 */

const GEDCOM_EOL = '\r\n';
const GEDCOM_LIBRARY_SRC = 'https://cdn.jsdelivr.net/gh/Genepedia/GEDCOM@main/dist/genepedia-gedcom.min.js';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const POINTER_VALUE_TAGS = new Set([
  'ALIA',
  'ASSO',
  'CHIL',
  'FAMC',
  'FAMS',
  'HUSB',
  'NOTE',
  'OBJE',
  'REPO',
  'SOUR',
  'SUBM',
  'WIFE',
]);
const GEDCOM_POINTER_RE = /^@[^@]+@$/;

export function escapeGedcomText(value) {
  return String(value ?? '')
    .replace(/@/g, '@@')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function formatGedcomDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const month = MONTHS[Number(iso[2]) - 1];
    if (!month) return iso[1];
    return `${Number(iso[3])} ${month} ${iso[1]}`;
  }

  const slashFull = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashFull) {
    const month = MONTHS[Number(slashFull[2]) - 1];
    if (!month) return slashFull[1];
    return `${Number(slashFull[3])} ${month} ${slashFull[1]}`;
  }

  const slashYearMonth = text.match(/^(\d{4})\/(\d{1,2})$/);
  if (slashYearMonth) {
    const month = MONTHS[Number(slashYearMonth[2]) - 1];
    return month ? `${month} ${slashYearMonth[1]}` : slashYearMonth[1];
  }

  if (/^\d{4}$/.test(text)) {
    return text;
  }

  return escapeGedcomText(text);
}

export function genderToSex(gender) {
  const value = String(gender || '').trim().toLowerCase();
  if (value === 'male' || value === 'm') return 'M';
  if (value === 'female' || value === 'f') return 'F';
  return 'U';
}

export function splitPersonName({ displayName = '', firstName = '', lastName = '', birthSurname = '' } = {}) {
  const given = String(firstName || '').trim();
  const surname = String(lastName || birthSurname || '').trim();
  const display = String(displayName || '').trim();

  if (given || surname) {
    return {
      given: given || display || 'Unknown',
      surname: surname || 'Unknown',
      display: display || [given, surname].filter(Boolean).join(' ') || 'Unknown',
    };
  }

  const parts = display.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { given: 'Unknown', surname: 'Unknown', display: 'Unknown' };
  }

  if (parts.length === 1) {
    return { given: parts[0], surname: 'Unknown', display: parts[0] };
  }

  return {
    given: parts.slice(0, -1).join(' '),
    surname: parts[parts.length - 1],
    display,
  };
}

function formatGedcomHeaderDate(date = new Date()) {
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function pushEvent(lines, tag, date, place) {
  const gedDate = formatGedcomDate(date);
  const gedPlace = escapeGedcomText(place);
  if (!gedDate && !gedPlace) return;

  lines.push(`1 ${tag}`);
  if (gedDate) lines.push(`2 DATE ${gedDate}`);
  if (gedPlace) lines.push(`2 PLAC ${gedPlace}`);
}

/**
 * @param {object} profile
 * @param {string} profile.personId
 * @param {string} [profile.displayName]
 * @param {string} [profile.firstName]
 * @param {string} [profile.lastName]
 * @param {string} [profile.birthSurname]
 * @param {string} [profile.gender]
 * @param {string} [profile.birthDate]
 * @param {string} [profile.birthPlace]
 * @param {string} [profile.deathDate]
 * @param {string} [profile.deathPlace]
 */
export function buildProfileGedcom(profile = {}) {
  const personId = String(profile.personId || '').trim();
  if (!personId) {
    throw new Error('personId is required to build a profile GEDCOM file.');
  }

  const names = splitPersonName(profile);
  const given = escapeGedcomText(names.given);
  const surname = escapeGedcomText(names.surname);
  const display = escapeGedcomText(names.display);
  const xref = `@P${personId}@`;
  const lines = [
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
    `1 DATE ${formatGedcomHeaderDate()}`,
    '1 FILE family-tree.ged',
    '1 LANG English',
    '1 SUBM @U1@',
    '0 @U1@ SUBM',
    '1 NAME Genepedia',
    `0 ${xref} INDI`,
    `1 NAME ${display} /${surname}/`,
    `2 GIVN ${given}`,
    `2 SURN ${surname}`,
    `1 SEX ${genderToSex(profile.gender)}`,
  ];

  pushEvent(lines, 'BIRT', profile.birthDate, profile.birthPlace);
  pushEvent(lines, 'DEAT', profile.deathDate, profile.deathPlace);

  lines.push(`1 REFN ${escapeGedcomText(personId)}`);
  lines.push('2 TYPE genepedia');
  lines.push('0 TRLR');

  return `${lines.join(GEDCOM_EOL)}${GEDCOM_EOL}`;
}

export function buildProfileGedcomFromInfoboxData(personId, data = {}) {
  const status = String(data.status || 'unknown').trim().toLowerCase();
  return buildProfileGedcom({
    personId,
    displayName: data.displayName,
    firstName: data.firstName,
    lastName: data.lastName,
    birthSurname: data.birthSurname,
    gender: data.gender,
    birthDate: data.birth?.date,
    birthPlace: data.birth?.place,
    deathDate: status === 'deceased' ? data.death?.date : '',
    deathPlace: status === 'deceased' ? data.death?.place : '',
  });
}

export function buildProfileGedcomFromRegistryPerson(person) {
  return buildProfileGedcom({
    personId: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    displayName: [person.firstName, person.lastName].filter(Boolean).join(' '),
    birthDate: person.birthYear ? String(person.birthYear) : '',
    deathDate: person.deathYear ? String(person.deathYear) : '',
  });
}

const PROFILE_IDENTITY_TAGS = new Set(['NAME', 'SEX', 'BIRT', 'DEAT']);

function getGedcomApi() {
  const api = typeof window !== 'undefined' ? window.GenepediaGedcom : null;
  if (!api?.readGedcom) {
    throw new Error(`The GEDCOM parser was not loaded from ${GEDCOM_LIBRARY_SRC}.`);
  }
  return api;
}

function toGedcomBuffer(content) {
  if (content instanceof ArrayBuffer) {
    return content;
  }

  if (ArrayBuffer.isView(content)) {
    return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
  }

  return new TextEncoder().encode(String(content || '')).buffer;
}

function readGedcom(content, options = {}) {
  return getGedcomApi().readGedcom(toGedcomBuffer(content), options);
}

function cloneGedcomRecordTree(record) {
  const copy = {
    tag: record.tag,
    pointer: record.pointer ?? null,
    value: record.value ?? null,
    indexSource: record.indexSource ?? -1,
    indexRelative: record.indexRelative ?? 0,
    children: [],
  };
  copy.children = (record.children || []).map((child, index) => {
    const cloned = cloneGedcomRecordTree(child);
    cloned.indexRelative = index;
    return cloned;
  });
  return copy;
}

function gedcomRootRecords(gedcom) {
  return gedcom?.rootNode?.children || [];
}

function childValue(record, tag) {
  return (record.children || []).find((child) => child.tag === tag)?.value || '';
}

function findProfileIndividual(gedcom, personId) {
  const normalizedId = String(personId || '').trim();
  if (!normalizedId) {
    return null;
  }

  const individuals = gedcomRootRecords(gedcom).filter((record) => record.tag === 'INDI');
  for (const individual of individuals) {
    if (individual.pointer === `@P${normalizedId}@`) {
      return individual;
    }

    for (const refn of individual.children || []) {
      if (refn.tag !== 'REFN') {
        continue;
      }

      const type = String(childValue(refn, 'TYPE')).trim().toLowerCase();
      const value = String(refn.value || '').trim();
      if (value === normalizedId && (type === '' || type === 'genepedia')) {
        return individual;
      }
    }
  }

  return individuals.length === 1 ? individuals[0] : null;
}

function detectGedcomTerminator(text) {
  const match = String(text || '').match(/\r\n|\r|\n/);
  return match?.[0] || GEDCOM_EOL;
}

function escapeGedcomValue(tag, value) {
  const text = String(value);
  if (POINTER_VALUE_TAGS.has(tag) && GEDCOM_POINTER_RE.test(text)) {
    return text;
  }

  return text.replace(/@#(?:[A-Za-z0-9][A-Za-z0-9 ]*)@|@/g, (match) => {
    if (match.startsWith('@#')) return match;
    return '@@';
  });
}

function serializeGedcomNode(node, level, lines) {
  const fields = [String(level)];
  if (node.pointer) fields.push(node.pointer);
  fields.push(node.tag);
  if (node.value !== null && node.value !== undefined) {
    fields.push(escapeGedcomValue(node.tag, node.value));
  }
  lines.push(fields.join(' '));

  for (const child of node.children || []) {
    serializeGedcomNode(child, level + 1, lines);
  }
}

function serializeGedcom(gedcom, terminator = GEDCOM_EOL) {
  const lines = [];
  for (const record of gedcomRootRecords(gedcom)) {
    serializeGedcomNode(record, 0, lines);
  }
  return `${lines.join(terminator)}${terminator}`;
}

/**
 * Keep an existing family-tree.ged file intact while refreshing the profile
 * person's core identity fields from the infobox editor.
 */
export function syncProfileGedcomFromInfoboxData(existingText, personId, data = {}) {
  const freshText = buildProfileGedcomFromInfoboxData(personId, data);
  const existing = readGedcom(existingText, { noIndex: true, noInlineContinuations: true });
  const fresh = readGedcom(freshText, { noIndex: true, noInlineContinuations: true });

  const target = findProfileIndividual(existing, personId);
  const source = findProfileIndividual(fresh, personId);
  if (!target || !source) {
    return freshText;
  }

  target.children = (target.children || []).filter((child) => !PROFILE_IDENTITY_TAGS.has(child.tag));
  for (const child of source.children || []) {
    if (PROFILE_IDENTITY_TAGS.has(child.tag)) {
      target.children.push(cloneGedcomRecordTree(child));
    }
  }
  target.children.forEach((child, index) => {
    child.indexRelative = index;
  });

  return serializeGedcom(existing, detectGedcomTerminator(existingText));
}

if (typeof window !== 'undefined') {
  window.GenepediaGedcomStarter = {
    buildProfileGedcom,
    buildProfileGedcomFromInfoboxData,
    buildProfileGedcomFromRegistryPerson,
    syncProfileGedcomFromInfoboxData,
    formatGedcomDate,
    genderToSex,
    splitPersonName,
  };
}
