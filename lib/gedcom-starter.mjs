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
  const status = String(data.status || 'deceased').trim().toLowerCase();
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

if (typeof window !== 'undefined') {
  window.AppGedcomStarter = {
    buildProfileGedcom,
    buildProfileGedcomFromInfoboxData,
    buildProfileGedcomFromRegistryPerson,
    formatGedcomDate,
    genderToSex,
    splitPersonName,
  };
}
