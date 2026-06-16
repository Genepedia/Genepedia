import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { detectCharset } = require('../../lib/GEDCOM/src/parse/decoder.js');
const {
  decodeUtf,
  decodeCp1252,
  decodeAnsel,
  decodeMacintosh,
  decodeCp850,
} = require('../../lib/GEDCOM/src/parse/decoding/index.js');

/**
 * Minimal, dependency-free GEDCOM 5.5.x tree parser.
 *
 * Produces a tree of nodes:
 *   { level, tag, pointer, value, children: [] }
 *
 * CONT/CONC continuation lines are folded into the parent node's value so the
 * caller sees one logical value per node (CONT => newline, CONC => no break).
 */

function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }

  return new TextEncoder().encode(String(value || '')).buffer;
}

export function detectGedcomCharset(value) {
  return detectCharset(toArrayBuffer(value));
}

export function decodeGedcomBuffer(value) {
  const buffer = toArrayBuffer(value);
  const charset = detectGedcomCharset(buffer);

  let text = '';
  if (charset === 'UTF-8' || charset === 'UTF-16be' || charset === 'UTF-16le') {
    text = decodeUtf(buffer);
  } else if (charset === 'Cp1252') {
    text = decodeCp1252(buffer);
  } else if (charset === 'ANSEL') {
    text = decodeAnsel(buffer, undefined, false);
  } else if (charset === 'Macintosh') {
    text = decodeMacintosh(buffer);
  } else if (charset === 'Cp850') {
    text = decodeCp850(buffer);
  } else {
    text = decodeUtf(buffer);
  }

  return { text, charset };
}

export function parseGedcom(text) {
  const root = { level: -1, tag: 'ROOT', pointer: null, value: null, children: [] };
  const stack = [root];
  const lines = String(text || '').split(/\r\n|\r|\n/);

  for (const raw of lines) {
    if (!raw || !raw.trim()) {
      continue;
    }

    const head = raw.match(/^(\d+)\s?(.*)$/s);
    if (!head) {
      continue;
    }

    const level = Number(head[1]);
    const rest = head[2] ?? '';

    let pointer = null;
    let tag = '';
    let value = null;

    const pointerMatch = rest.match(/^@([^@]+)@\s+(\S+)(?:\s(.*))?$/s);
    if (pointerMatch) {
      pointer = `@${pointerMatch[1]}@`;
      tag = pointerMatch[2];
      value = pointerMatch[3] ?? null;
    } else {
      const tagMatch = rest.match(/^(\S+)(?:\s(.*))?$/s);
      if (!tagMatch) {
        continue;
      }
      tag = tagMatch[1];
      value = tagMatch[2] ?? null;
    }

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];

    if (tag === 'CONT') {
      parent.value = `${parent.value ?? ''}\n${value ?? ''}`;
      continue;
    }
    if (tag === 'CONC') {
      parent.value = `${parent.value ?? ''}${value ?? ''}`;
      continue;
    }

    const node = { level, tag, pointer, value: value ?? null, children: [] };
    parent.children.push(node);
    stack.push(node);
  }

  return root;
}

export function childrenWithTag(node, tag) {
  if (!node || !Array.isArray(node.children)) {
    return [];
  }
  return node.children.filter((child) => child.tag === tag);
}

export function firstChild(node, tag) {
  if (!node || !Array.isArray(node.children)) {
    return null;
  }
  return node.children.find((child) => child.tag === tag) || null;
}

export function childValue(node, tag) {
  const child = firstChild(node, tag);
  return child ? (child.value ?? '') : '';
}

/** Top-level records of a given tag (e.g. INDI, FAM). */
export function records(root, tag) {
  return childrenWithTag(root, tag);
}
