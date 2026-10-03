#!/usr/bin/env node

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');

const allowedExtensions = new Set([
  '.b64', '.css', '.csv', '.eot', '.ged', '.gif', '.html', '.ico', '.jpeg', '.jpg',
  '.js', '.json', '.mjs', '.mp3', '.mp4', '.ogg', '.otf', '.pdf', '.png', '.svg',
  '.tsv', '.ttf', '.txt', '.wav', '.webmanifest', '.webm', '.webp', '.woff', '.woff2', '.xml',
]);

const blockedDirectoryNames = new Set([
  '.git', '.github', '.openai', 'coverage', 'deploy', 'docs', 'node_modules', 'test-results',
  'tests', 'vendor',
]);

const blockedFileName = /^(?:\.env(?:\..*)?|credentials(?:\..*)?|secrets(?:\..*)?)$|(?:^|[-_.])(?:private[-_.]?)?(?:key|pem|p12|pfx|crt|cer)$|(?:github-config|token|secret).*\.php$/i;

function isSafePublicFile(relativePath) {
  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment.startsWith('.'))) return false;
  if (segments.some((segment) => blockedDirectoryNames.has(segment.toLowerCase()))) return false;

  const fileName = segments.at(-1) || '';
  if (blockedFileName.test(fileName)) return false;
  if (fileName.endsWith('.map')) return false;
  return allowedExtensions.has(path.extname(fileName).toLowerCase());
}

async function copyFilteredTree(sourceRelative, destinationRelative = sourceRelative) {
  const sourceRoot = path.join(projectRoot, sourceRelative);
  const destinationRoot = path.join(outputRoot, destinationRelative);

  async function visit(sourceDirectory, destinationDirectory, prefix) {
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const sourcePath = path.join(sourceDirectory, entry.name);
      const destinationPath = path.join(destinationDirectory, entry.name);

      if (entry.isDirectory()) {
        if (blockedDirectoryNames.has(entry.name.toLowerCase()) || entry.name.startsWith('.')) continue;
        await visit(sourcePath, destinationPath, relativePath);
      } else if (entry.isFile() && isSafePublicFile(relativePath)) {
        await mkdir(destinationDirectory, { recursive: true });
        await cp(sourcePath, destinationPath);
      }
    }
  }

  await visit(sourceRoot, destinationRoot, '');
}

async function copyRequiredFile(relativePath) {
  if (!isSafePublicFile(relativePath)) {
    throw new Error(`Refusing to package a non-public frontend file: ${relativePath}`);
  }
  const sourcePath = path.join(projectRoot, relativePath);
  const destinationPath = path.join(outputRoot, relativePath);
  const sourceInfo = await stat(sourcePath);
  if (!sourceInfo.isFile()) throw new Error(`Expected a frontend file: ${relativePath}`);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath);
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const file of ['index.html', '404.html', 'index.js', 'site-info.js', 'sitemap.xml']) {
  await copyRequiredFile(file);
}

for (const tree of ['assets', 'components', 'pages']) {
  await copyFilteredTree(tree);
}

for (const file of [
  'lib/download-manager.js',
  'lib/gedcom-starter.mjs',
  'lib/notifications.js',
  'lib/page-tabs.js',
  'lib/people-db.js',
  'lib/people-registry.js',
  'lib/profile-infobox-render.js',
  'lib/routing.js',
  'lib/Web-Framework/site-runtime.js',
  'lib/Web-Framework/third-party-icons.data.js',
  'lib/Web-Framework/third-party-icons.js',
]) {
  await copyRequiredFile(file);
}

for (const tree of [
  'lib/Web-Framework/assets',
  'lib/Web-Framework/components',
  'lib/Web-Framework/styles',
]) {
  await copyFilteredTree(tree);
}

const packagedFiles = await listFiles(outputRoot);
const forbiddenOutput = packagedFiles.filter((file) =>
  !isSafePublicFile(file)
  || /^(?:data\/Genepedia-(?:Database|Media)|lib\/API|docs|deploy)(?:\/|$)/i.test(file)
  || /(?:^|\/)\.git(?:\/|$)/i.test(file)
);
if (forbiddenOutput.length) {
  throw new Error(`Static output contains forbidden files: ${forbiddenOutput.slice(0, 10).join(', ')}`);
}

for (const required of ['index.html', 'site-info.js', 'pages/search.html']) {
  if (!packagedFiles.includes(required)) throw new Error(`Static output is missing ${required}`);
}

const hasCleanProfileRoute = (kind) => packagedFiles.some((file) =>
  new RegExp(`^pages/${kind}/\\d+/index\\.html$`).test(file)
);
if (!hasCleanProfileRoute('people') || !hasCleanProfileRoute('pets')) {
  throw new Error('Static output must keep both person and pet index.html routes.');
}

console.log(`Packaged ${packagedFiles.length} public frontend files into ${path.relative(projectRoot, outputRoot)}/`);
