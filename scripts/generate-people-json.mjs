#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const peopleDir = path.join(repoRoot, 'people');
const outputPath = path.join(peopleDir, 'people.json');

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readProfileSource(personDir) {
  const candidates = [
    path.join(personDir, 'data', 'profile.html'),
    path.join(personDir, 'profile.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf8');
    }
  }

  return '';
}

function readProfileTableSource(personDir) {
  const tablePath = path.join(personDir, 'data', 'profile-table.html');
  if (fs.existsSync(tablePath)) {
    return fs.readFileSync(tablePath, 'utf8');
  }

  return '';
}

function parseIdentityTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  if (!match) {
    return '';
  }

  const firstLine = match[1].split(/<br\s*\/?>/i)[0] || match[1];
  return stripHtml(firstLine);
}

function extractYear(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  const years = text.match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g);
  return years ? years[years.length - 1] : '';
}

function parseProfileDates(profileHtml, tableHtml) {
  const combined = `${profileHtml}\n${tableHtml}`;
  const birthLine = parseIdentityTag(combined, 'table-birth');
  const deathLine = parseIdentityTag(combined, 'table-death').replace(/\s*\(age[^)]*\)/gi, '');
  const birthYear = extractYear(birthLine);
  const deathYear = extractYear(deathLine);
  const dates = {};

  if (birthYear) {
    dates.birthYear = birthYear;
  }

  if (deathYear) {
    dates.deathYear = deathYear;
  }

  return dates;
}

function parseProfileName(html) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const titleMatch = withoutComments.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return stripHtml(titleMatch?.[1] || '');
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function listPersonIds() {
  return fs.readdirSync(peopleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((id) => readProfileSource(path.join(peopleDir, id)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function generatePeopleJson() {
  const people = listPersonIds().map((id) => {
    const personDir = path.join(peopleDir, id);
    const profileHtml = readProfileSource(personDir);
    const tableHtml = readProfileTableSource(personDir);
    const fullName = parseProfileName(profileHtml);
    const { firstName, lastName } = splitName(fullName);

    return {
      id,
      firstName: firstName || `Profile`,
      lastName: lastName || id,
      ...parseProfileDates(profileHtml, tableHtml),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    people,
  };
}

const payload = generatePeopleJson();
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${payload.people.length} people to ${path.relative(repoRoot, outputPath)}`);

const missingGedcom = listPersonIds().filter((id) => {
  return !fs.existsSync(path.join(peopleDir, id, 'data', 'family-tree.ged'));
});
if (missingGedcom.length) {
  console.warn(`Missing family-tree.ged for profile(s): ${missingGedcom.join(', ')}`);
  console.warn('Run: node scripts/ensure-profile-gedcom.mjs');
}
