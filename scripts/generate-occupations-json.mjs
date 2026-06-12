#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'data', 'occupations-onet-usa.json');
const sourceUrl = 'https://raw.githubusercontent.com/lookdeepu/Occupations-Masterlist/refs/heads/main/All_Occupations_Onet_USA.csv';

const EXTRA_OCCUPATIONS = [
  'Farmer',
  'Teacher',
  'Doctor',
  'Nurse',
  'Lawyer',
  'Engineer',
  'Clerk',
  'Blacksmith',
  'Carpenter',
  'Soldier',
  'Police officer',
  'Merchant',
  'Priest',
  'Laborer',
  'Tailor',
  'Seaman',
  'Cook',
  'Butcher',
  'Shopkeeper',
  'Artist',
  'Musician',
  'Accountant',
  'Civil servant',
  'Architect',
  'Mechanic',
  'Driver',
  'Photographer',
  'Writer',
  'Publisher',
  'Business owner',
  'Homemaker',
  'Retired',
  'Student',
  'Unknown',
  'Vibe Coder',
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function parseOccupationsCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const occupationIndex = headers.findIndex((header) => header.toLowerCase() === 'occupation');
  if (occupationIndex < 0) {
    throw new Error('Could not find Occupation column in source CSV.');
  }

  return lines
    .slice(1)
    .map((line) => parseCsvLine(line)[occupationIndex]?.trim() || '')
    .filter(Boolean);
}

function mergeOccupations(onetOccupations) {
  const seen = new Set();
  const merged = [];

  for (const occupation of [...EXTRA_OCCUPATIONS, ...onetOccupations]) {
    const key = occupation.toLocaleLowerCase('en-US');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(occupation);
  }

  return merged;
}

async function generateOccupationsJson() {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download occupations CSV: ${response.status}`);
  }

  const onetOccupations = parseOccupationsCsv(await response.text());
  const occupations = mergeOccupations(onetOccupations);

  if (occupations.length < 1000) {
    throw new Error(`Expected at least 1000 occupations, received ${occupations.length}.`);
  }

  return {
    source: 'https://github.com/lookdeepu/Occupations-Masterlist/blob/main/All_Occupations_Onet_USA.csv',
    generatedAt: new Date().toISOString(),
    count: occupations.length,
    occupations,
  };
}

const payload = await generateOccupationsJson();
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${payload.count} occupations to ${path.relative(repoRoot, outputPath)}`);
