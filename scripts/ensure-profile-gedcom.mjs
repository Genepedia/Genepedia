#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProfileGedcom,
  buildProfileGedcomFromRegistryPerson,
} from '../lib/gedcom-starter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const peopleDir = path.join(repoRoot, 'people');

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function parseIdentityTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  if (!match) return '';
  const firstLine = match[1].split(/<br\s*\/?>/i)[0] || match[1];
  return stripHtml(firstLine);
}

function parseIdentityLines(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  if (!match) return [];
  return match[1]
    .split(/<br\s*\/?>/i)
    .map((part) => stripHtml(part))
    .filter(Boolean);
}

function parseGender(html) {
  const gender = parseIdentityTag(html, 'table-gender').toLowerCase();
  if (gender.startsWith('m')) return 'male';
  if (gender.startsWith('f')) return 'female';
  return 'unknown';
}

function parseFriendlyDate(value) {
  const text = String(value || '').trim().replace(/^c\.?\s*/i, '').replace(/^(before|after|about)\s+/i, '');
  let match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match) {
    const monthIndex = String(match[1]).slice(0, 3).toLowerCase();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const idx = months.indexOf(monthIndex);
    if (idx >= 0) {
      return `${match[3]}-${String(idx + 1).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`;
    }
  }
  match = text.match(/(\d{4})/);
  return match ? match[1] : '';
}

function listPersonIds() {
  return fs.readdirSync(peopleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(peopleDir, id, 'profile.html')))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function profileSources(personDir) {
  const candidates = [
    path.join(personDir, 'data', 'profile-table.html'),
    path.join(personDir, 'data', 'profile.html'),
    path.join(personDir, 'profile.html'),
  ];
  return candidates.map((filePath) => readText(filePath)).filter(Boolean).join('\n');
}

function buildGedcomForPerson(personId, registryPerson = null) {
  const personDir = path.join(peopleDir, personId);
  const html = profileSources(personDir);
  const displayName = parseIdentityTag(html, 'table-name')
    || stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');

  const birthLines = parseIdentityLines(html, 'table-birth');
  const deathLines = parseIdentityLines(html, 'table-death');

  const profile = {
    personId,
    displayName: displayName || [registryPerson?.firstName, registryPerson?.lastName].filter(Boolean).join(' '),
    firstName: registryPerson?.firstName || '',
    lastName: registryPerson?.lastName || '',
    gender: parseGender(html),
    birthDate: parseFriendlyDate(birthLines[0]) || registryPerson?.birthYear || '',
    birthPlace: birthLines[1] || '',
    deathDate: parseFriendlyDate(deathLines[0]?.replace(/\s*\(age[^)]*\)/i, '')) || registryPerson?.deathYear || '',
    deathPlace: deathLines[1] || '',
  };

  if (registryPerson && !profile.firstName && !profile.lastName) {
    return buildProfileGedcomFromRegistryPerson(registryPerson);
  }

  return buildProfileGedcom(profile);
}

function loadRegistryPeople() {
  const registryPath = path.join(peopleDir, 'people.json');
  if (!fs.existsSync(registryPath)) return new Map();
  const payload = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  return new Map((payload.people || []).map((person) => [String(person.id), person]));
}

function ensureProfileGedcom({ write = true } = {}) {
  const registry = loadRegistryPeople();
  const created = [];
  const existing = [];

  for (const personId of listPersonIds()) {
    const gedPath = path.join(peopleDir, personId, 'data', 'family-tree.ged');
    if (fs.existsSync(gedPath)) {
      existing.push(personId);
      continue;
    }

    const content = buildGedcomForPerson(personId, registry.get(personId) || null);
    if (write) {
      fs.mkdirSync(path.dirname(gedPath), { recursive: true });
      fs.writeFileSync(gedPath, content, 'utf8');
    }
    created.push(personId);
  }

  return { created, existing };
}

const { created, existing } = ensureProfileGedcom();
if (created.length) {
  console.log(`Created family-tree.ged for: ${created.join(', ')}`);
} else {
  console.log('All profiles already have family-tree.ged files.');
}
console.log(`Profiles with GEDCOM: ${existing.length + created.length}`);
