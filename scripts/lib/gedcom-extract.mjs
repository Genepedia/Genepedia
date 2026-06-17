/**
 * Structured extraction from parsed GEDCOM INDI/FAM nodes.
 *
 * Pure helpers: no I/O, no id assignment. The orchestrator wires these into the
 * canonical person/union records and assigns local ids.
 */

import { childrenWithTag, firstChild, childValue } from './gedcom-parse.mjs';
import { aboutMeToHtml, parseGeniProps } from './geni-notes.mjs';

const MONTHS = {
  JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April',
  MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August',
  SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December',
};

const MONTH_NUM = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const QUALIFIERS = {
  ABT: 'about', EST: 'estimated', CAL: 'calculated',
  BEF: 'before', AFT: 'after', FROM: 'from', TO: 'to',
};

// GEDCOM date qualifier -> infobox precision vocabulary.
const PRECISION_BY_QUALIFIER = {
  about: 'about', estimated: 'about', calculated: 'about',
  before: 'before', after: 'after',
};

const CURRENT_YEAR = new Date().getUTCFullYear();
const LIVING_WINDOW_YEARS = 100;

/** The numeric Geni node id encoded in a GEDCOM xref like @I600000...@. */
export function geniIdFromXref(xref) {
  return String(xref || '').replace(/\D/g, '') || null;
}

export function isPrivateName(display) {
  return /^private\b/i.test(String(display || '').trim());
}

export function parseName(nameNode) {
  if (!nameNode) {
    return { display: '', given: '', surname: '', nick: '', married: '' };
  }
  const raw = String(nameNode.value || '');
  let given = childValue(nameNode, 'GIVN').trim();
  let surname = childValue(nameNode, 'SURN').trim();
  const slash = raw.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (slash) {
    if (!given) {
      given = slash[1].trim();
    }
    if (!surname) {
      surname = slash[2].trim();
    }
  }
  let display = raw.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
  if (!display) {
    display = [given, surname].filter(Boolean).join(' ').trim();
  }
  return {
    display,
    given,
    surname,
    nick: childValue(nameNode, 'NICK').trim(),
    married: (childValue(nameNode, '_MARNM') || childValue(nameNode, 'MARNM')).trim(),
  };
}

export function parseDate(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    return null;
  }

  const yearMatch = value.match(/\d{3,4}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  const parts = value.split(/\s+/);
  let qualifier = '';
  const tokens = [...parts];
  if (tokens[0] && QUALIFIERS[tokens[0].toUpperCase()]) {
    qualifier = QUALIFIERS[tokens[0].toUpperCase()];
    tokens.shift();
  }

  let day = '';
  let monthName = '';
  let monthNum = '';
  let displayYear = '';
  for (const token of tokens) {
    if (/^\d{1,2}$/.test(token) && !day) {
      day = token;
    } else if (MONTHS[token.toUpperCase()]) {
      monthName = MONTHS[token.toUpperCase()];
      monthNum = MONTH_NUM[token.toUpperCase()];
    } else if (/^\d{3,4}$/.test(token)) {
      displayYear = token;
    }
  }

  let display = '';
  if (monthName && day && displayYear) {
    display = `${monthName} ${Number(day)}, ${displayYear}`;
  } else if (monthName && displayYear) {
    display = `${monthName} ${displayYear}`;
  } else if (displayYear) {
    display = displayYear;
  } else {
    display = value;
  }
  if (qualifier) {
    display = `${qualifier} ${display}`;
  }

  // Stored ISO-ish form (YYYY / YYYY-MM / YYYY-MM-DD) for structured rendering.
  let iso = '';
  if (displayYear) {
    const yyyy = displayYear.padStart(4, '0');
    if (monthNum && day) {
      iso = `${yyyy}-${monthNum}-${String(day).padStart(2, '0')}`;
    } else if (monthNum) {
      iso = `${yyyy}-${monthNum}`;
    } else {
      iso = yyyy;
    }
  }
  const precision = PRECISION_BY_QUALIFIER[qualifier] || 'exact';

  return { raw: value, year, display, iso, precision };
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueNonEmpty(values) {
  const seen = new Set();
  return values.flatMap((value) => {
    const text = normalizeText(value);
    if (!text) return [];
    const key = text.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [text];
  });
}

function splitListValue(value) {
  return uniqueNonEmpty(String(value || '').split(/[;,\n|]/));
}

function hasLocationParts(location) {
  if (!location || typeof location !== 'object') return false;
  return Object.values(location).some((value) => normalizeText(value));
}

function formatLocationSummary(location, fallbackLabel = '') {
  if (!location || typeof location !== 'object') {
    return normalizeText(fallbackLabel);
  }

  const primary = uniqueNonEmpty([
    location.placeName,
    location.city,
    location.county,
    location.stateProvince,
    location.country,
  ]);
  if (primary.length) {
    return primary.join(', ');
  }

  const secondary = uniqueNonEmpty([
    location.addressLine1,
    location.addressLine2,
    location.addressLine3,
    location.label,
    fallbackLabel,
  ]);
  return normalizeText(secondary.join(', '));
}

function derivePlaceName(rawPlace, location) {
  const place = normalizeText(rawPlace);
  if (!place) return '';

  const parts = place.split(',').map((part) => normalizeText(part)).filter(Boolean);
  if (!parts.length) return '';

  const trailingCandidates = uniqueNonEmpty([
    location.city,
    location.county,
    location.stateProvince,
    location.country,
  ]).map((value) => value.toLowerCase());

  while (parts.length && trailingCandidates.includes(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }

  return parts.join(', ');
}

function parseLocation(node) {
  if (!node) {
    return null;
  }

  const rawPlace = normalizeText(childValue(node, 'PLAC'));
  const addressNode = firstChild(node, 'ADDR');
  const mapNode = firstChild(node, 'MAP');
  const location = {
    label: '',
    placeName: '',
    addressLine1: normalizeText(childValue(addressNode, 'ADR1') || addressNode?.value || ''),
    addressLine2: normalizeText(childValue(addressNode, 'ADR2')),
    addressLine3: normalizeText(childValue(addressNode, 'ADR3')),
    city: normalizeText(childValue(addressNode, 'CITY')),
    postalCode: normalizeText(childValue(addressNode, 'POST')),
    county: normalizeText(childValue(addressNode, 'CNTY')),
    stateProvince: normalizeText(childValue(addressNode, 'STAE')),
    country: normalizeText(childValue(addressNode, 'CTRY')),
    countryCode: '',
    latitude: normalizeText(childValue(mapNode, 'LATI')),
    longitude: normalizeText(childValue(mapNode, 'LONG')),
    source: '',
  };

  if (rawPlace) {
    const derivedPlaceName = derivePlaceName(rawPlace, location);
    location.placeName = derivedPlaceName || (!hasLocationParts(location) ? rawPlace : '');
  }

  const label = formatLocationSummary(location, rawPlace);
  if (label) {
    location.label = normalizeText(label);
  }

  return hasLocationParts(location) || rawPlace ? location : null;
}

function firstNodeValue(node, tags) {
  for (const tag of tags) {
    const child = firstChild(node, tag);
    const value = normalizeText(child?.value || '');
    if (value) return value;
  }
  return '';
}

function collectTypedFacts(indi) {
  const facts = new Map();
  for (const node of [...childrenWithTag(indi, 'FACT'), ...childrenWithTag(indi, 'EVEN')]) {
    const type = normalizeText(childValue(node, 'TYPE')).toLowerCase();
    const value = normalizeText(
      firstNodeValue(node, ['NOTE', 'TEXT', 'PLAC'])
      || node.value
      || '',
    );
    if (!type || !value) continue;
    if (!facts.has(type)) facts.set(type, []);
    facts.get(type).push(value);
  }
  return facts;
}

function factValues(facts, keys) {
  return keys.flatMap((key) => facts.get(key) || []);
}

function combineHeight(props) {
  const first = normalizeText(props.height_1 || props.height || '');
  const second = normalizeText(props.height_2 || '');
  const parts = [];
  if (first) parts.push(first);
  if (second) {
    parts.push(second);
  }
  return parts.join(' ').trim() || null;
}

function extractAttributes(indi, props) {
  const facts = collectTypedFacts(indi);
  const religionNode = firstChild(indi, 'RELI');
  const languageNodes = childrenWithTag(indi, 'LANG').map((node) => normalizeText(node.value)).filter(Boolean);

  return {
    hairColor: normalizeText(props.hair_color || '') || null,
    eyeColor: normalizeText(props.eye_color || '') || null,
    height: combineHeight(props),
    heightYear: null,
    weight: normalizeText(props.weight || factValues(facts, ['weight']).at(0) || '') || null,
    weightYear: null,
    ethnicity: normalizeText(props.ethnicity || factValues(facts, ['ethnicity', 'ethnic group', 'ethnicity']).at(0) || firstChild(indi, 'NATI')?.value || '') || null,
    religion: normalizeText(props.religion || factValues(facts, ['religion', 'faith']).at(0) || religionNode?.value || '') || null,
    politicalViews: normalizeText(props.political_views || props.political || factValues(facts, ['political views', 'politics', 'political']).at(0) || '') || null,
    languages: uniqueNonEmpty([
      ...splitListValue(props.languages || props.language || ''),
      ...factValues(facts, ['languages', 'language']).flatMap((value) => splitListValue(value)),
      ...languageNodes,
    ]),
    hobbies: uniqueNonEmpty([
      ...splitListValue(props.hobbies || props.hobby || ''),
      ...factValues(facts, ['hobbies', 'hobby']).flatMap((value) => splitListValue(value)),
    ]),
    shoeSize: normalizeText(props.shoe_size || props.shoesize || factValues(facts, ['shoe size', 'shoe']).at(0) || '') || null,
    shoeSizeYear: null,
    smoking: normalizeText(props.smoking || props.smoker || factValues(facts, ['smoking', 'smoker']).at(0) || '') || null,
  };
}

function parseEducationEntries(indi) {
  const nodes = Array.isArray(indi?.children)
    ? indi.children.filter((node) => node && (node.tag === 'EDUC' || node.tag === 'GRAD'))
    : [];

  return nodes
    .map((node, index) => {
      const event = parseEvent(node);
      const title = normalizeText(node.value || childValue(node, 'TYPE') || '');
      const note = uniqueNonEmpty(
        childrenWithTag(node, 'NOTE').map((noteNode) => normalizeText(noteNode.value || '')),
      ).join('\n');

      return {
        id: `edu-${index + 1}`,
        sourceTag: node.tag === 'GRAD' ? 'GRAD' : 'EDUC',
        title: title || (node.tag === 'GRAD' ? 'Graduation' : ''),
        date: event?.date || null,
        year: event?.year ?? null,
        iso: event?.iso || null,
        precision: event?.precision || 'exact',
        display: event?.display || null,
        place: event?.place || null,
        ...(event?.location ? { location: event.location } : {}),
        ...(note ? { note } : {}),
      };
    })
    .filter((entry) => entry.title || entry.place || entry.iso || entry.note);
}

export function parseEvent(node) {
  if (!node) {
    return null;
  }
  const date = parseDate(childValue(node, 'DATE'));
  const location = parseLocation(node);
  const place = location ? formatLocationSummary(location, childValue(node, 'PLAC').trim()) : childValue(node, 'PLAC').trim();
  if (!date && !place && !location) {
    return null;
  }
  const event = {
    date: date?.raw || null,
    year: date?.year ?? null,
    iso: date?.iso || null,
    precision: date?.precision || 'exact',
    display: date?.display || null,
    place: place || null,
  };
  if (location) {
    event.location = location;
  }
  return event;
}

export function extractMedia(indi) {
  const items = [];
  for (const obje of childrenWithTag(indi, 'OBJE')) {
    const file = childValue(obje, 'FILE').trim();
    if (!file) {
      continue;
    }
    const form = (childValue(obje, 'FORM') || '').trim().toLowerCase();
    const title = childValue(obje, 'TITL').trim();
    const primary = /^y/i.test((childValue(obje, '_PRIM') || '').trim());
    items.push({ remote: file, form, title, primary });
  }
  if (items.length && !items.some((item) => item.primary)) {
    items[0].primary = true;
  }
  return items;
}

export function extractNotes(indi) {
  const noteValues = childrenWithTag(indi, 'NOTE').map((note) => String(note.value || ''));
  const aboutRaw = noteValues.find((value) => /\{geni:about_me\}/.test(value)) || '';
  const props = parseGeniProps(noteValues);
  return { aboutRaw, props };
}

export function extractEmails(indi) {
  const emails = new Set();
  for (const node of indi.children) {
    if (node.tag === 'EMAIL' && node.value) {
      emails.add(node.value.trim());
    }
    if (node.tag === 'ADDR' && node.value && /@/.test(node.value)) {
      const match = node.value.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (match) {
        emails.add(match[0]);
      }
    }
  }
  return [...emails];
}

/**
 * Extract a normalized person record from an INDI node. Relationship ids stay
 * as raw GEDCOM xrefs here; the orchestrator maps them to local ids.
 */
export function extractPerson(indi) {
  const xref = indi.pointer;
  const nameNodes = childrenWithTag(indi, 'NAME');
  const primaryName = parseName(nameNodes[0]);
  const aliases = nameNodes.slice(1).map((node) => parseName(node).display).filter(Boolean);

  const sexRaw = (childValue(indi, 'SEX') || '').trim().toUpperCase();
  const sex = sexRaw === 'M' ? 'male' : sexRaw === 'F' ? 'female' : 'unknown';

  const birth = parseEvent(firstChild(indi, 'BIRT'));
  const death = parseEvent(firstChild(indi, 'DEAT'));
  const baptism = parseEvent(firstChild(indi, 'BAPM') || firstChild(indi, 'CHR'));
  const burial = parseEvent(firstChild(indi, 'BURI'));

  // Enrich death with cause and burial with cremation/burial type when present.
  const deatNode = firstChild(indi, 'DEAT');
  if (death && deatNode) {
    const cause = (childValue(deatNode, 'CAUS') || '').trim();
    if (cause) {
      death.cause = cause;
    }
  }
  const buriNode = firstChild(indi, 'BURI') || firstChild(indi, 'CREM');
  if (burial && buriNode) {
    burial.type = buriNode.tag === 'CREM' ? 'cremation' : 'burial';
  }

  const { aboutRaw, props } = extractNotes(indi);
  const media = extractMedia(indi);
  const emails = extractEmails(indi);
  const lastResidenceLocation = [...childrenWithTag(indi, 'RESI')]
    .map((node) => parseLocation(node))
    .filter(Boolean)
    .at(-1) || null;
  const lastResidence = lastResidenceLocation ? formatLocationSummary(lastResidenceLocation, '') || null : null;

  const isPrivate = isPrivateName(primaryName.display);
  const hasDeath = Boolean(death);
  const birthYear = birth?.year ?? null;
  const tooRecentToBeDead = birthYear == null || birthYear > CURRENT_YEAR - LIVING_WINDOW_YEARS;
  const living = isPrivate || (!hasDeath && tooRecentToBeDead);

  const parentFamilies = childrenWithTag(indi, 'FAMC').map((node) => ({
    xref: node.pointer || node.value,
    pedigree: (childValue(node, 'PEDI') || '').trim().toLowerCase() || null,
  }));
  const spouseFamilies = childrenWithTag(indi, 'FAMS')
    .map((node) => node.pointer || node.value)
    .filter(Boolean);

  return {
    xref,
    geniId: geniIdFromXref(xref),
    rfn: (childValue(indi, 'RFN') || '').trim() || null,
    name: primaryName,
    aliases,
    sex,
    living,
    isPrivate,
    events: { birth, death, baptism, burial },
    lastResidence,
    lastResidenceLocation,
    occupation: (childValue(indi, 'OCCU') || '').trim() || null,
    attributes: extractAttributes(indi, props),
    education: parseEducationEntries(indi),
    media,
    aboutRaw,
    emails,
    relationships: { parentFamilies, spouseFamilies },
    changed: (childValue(firstChild(indi, 'CHAN'), 'DATE') || '').trim() || null,
  };
}

export function extractUnion(fam) {
  const xref = fam.pointer;
  const partners = [
    ...childrenWithTag(fam, 'HUSB'),
    ...childrenWithTag(fam, 'WIFE'),
  ].map((node) => node.pointer || node.value).filter(Boolean);
  const children = childrenWithTag(fam, 'CHIL')
    .map((node) => node.pointer || node.value)
    .filter(Boolean);

  return {
    xref,
    partners,
    children,
    events: {
      engagement: parseEvent(firstChild(fam, 'ENGA')),
      marriage: parseEvent(firstChild(fam, 'MARR')),
      divorce: parseEvent(firstChild(fam, 'DIV')),
    },
  };
}

export { aboutMeToHtml };
