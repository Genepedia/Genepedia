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
    const profileHtml = readProfileSource(path.join(peopleDir, id));
    const fullName = parseProfileName(profileHtml);
    const { firstName, lastName } = splitName(fullName);

    return {
      id,
      firstName: firstName || `Profile`,
      lastName: lastName || id,
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
