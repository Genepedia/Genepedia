/**
 * Build minimal Genepedia starter GEDCOM 5.5.5 files (one root individual).
 */

const GEDCOM_EOL = '\r\n';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

function cloneGedcomRecordTree(record, parent = null) {
  const copy = {
    level: record.level,
    tag: record.tag,
    value: record.value,
    xref: record.xref,
    logicalValue: record.logicalValue,
    rawLogicalValue: record.rawLogicalValue,
    children: [],
    parent,
  };
  copy.children = (record.children || []).map((child) => cloneGedcomRecordTree(child, copy));
  return copy;
}

function findProfileIndividual(records, personId) {
  const normalizedId = String(personId || '').trim();
  if (!normalizedId) {
    return null;
  }

  const individuals = (records || []).filter((record) => record.tag === 'INDI');
  for (const individual of individuals) {
    if (individual.xref === `@P${normalizedId}@`) {
      return individual;
    }

    for (const refn of individual.children || []) {
      if (refn.tag !== 'REFN') {
        continue;
      }

      const type = String(
        (refn.children || []).find((child) => child.tag === 'TYPE')?.logicalValue || '',
      ).trim().toLowerCase();
      const value = String(refn.logicalValue || '').trim();
      if (value === normalizedId && (type === '' || type === 'genepedia')) {
        return individual;
      }
    }
  }

  return individuals.length === 1 ? individuals[0] : null;
}

/**
 * Keep an existing family-tree.ged file intact while refreshing the profile
 * person's core identity fields from the infobox editor.
 */
export function syncProfileGedcomFromInfoboxData(existingText, personId, data = {}) {
  const parse = typeof window !== 'undefined' ? window.AppGedcom?.parseGedcom555 : null;
  const stringify = typeof window !== 'undefined' ? window.AppGedcom?.stringifyGedcom555 : null;
  if (!parse || !stringify) {
    return buildProfileGedcomFromInfoboxData(personId, data);
  }

  const freshText = buildProfileGedcomFromInfoboxData(personId, data);
  let existing;
  let fresh;
  try {
    existing = parse(String(existingText || ''));
    fresh = parse(freshText);
  } catch (error) {
    return freshText;
  }

  const target = findProfileIndividual(existing.records, personId);
  const source = findProfileIndividual(fresh.records, personId);
  if (!target || !source) {
    return freshText;
  }

  target.children = (target.children || []).filter((child) => !PROFILE_IDENTITY_TAGS.has(child.tag));
  for (const child of source.children || []) {
    if (PROFILE_IDENTITY_TAGS.has(child.tag)) {
      target.children.push(cloneGedcomRecordTree(child, target));
    }
  }

  return stringify(existing, { terminator: existing.terminator || '\r\n' });
}

if (typeof window !== 'undefined') {
  window.AppGedcomStarter = {
    buildProfileGedcom,
    buildProfileGedcomFromInfoboxData,
    buildProfileGedcomFromRegistryPerson,
    syncProfileGedcomFromInfoboxData,
    formatGedcomDate,
    genderToSex,
    splitPersonName,
  };
}
