/**
 * Best-effort media downloader for imported GEDCOM portraits.
 *
 * Network access may be unavailable in some environments, so every failure is
 * non-fatal: the caller keeps the remote URL and records the miss in a report.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

export function extensionFor(url, form, contentType) {
  if (contentType && EXT_BY_TYPE[contentType.split(';')[0].trim().toLowerCase()]) {
    return EXT_BY_TYPE[contentType.split(';')[0].trim().toLowerCase()];
  }
  const fromForm = String(form || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromForm && fromForm.length <= 4) {
    return fromForm === 'jpeg' ? 'jpg' : fromForm;
  }
  const fromUrl = String(url || '').split('?')[0].match(/\.([a-z0-9]{3,4})$/i);
  if (fromUrl) {
    return fromUrl[1].toLowerCase() === 'jpeg' ? 'jpg' : fromUrl[1].toLowerCase();
  }
  return 'jpg';
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadWithCurl(url, targetPath, timeoutMs) {
  await execFile('curl', [
    '-L',
    '--fail',
    '--silent',
    '--show-error',
    '--output', targetPath,
    url,
  ], {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
}

/**
 * Download `url` into `destDir` as `baseName.<ext>`. Returns a result object;
 * never throws. When `skipExisting` is true an already-downloaded file is kept.
 */
export async function downloadMedia(url, destDir, baseName, { form, timeoutMs = 15000, skipExisting = true } = {}) {
  const result = { ok: false, url, localFile: null, bytes: 0, error: null, skipped: false };

  try {
    let ext = extensionFor(url, form, null);
    let targetPath = path.join(destDir, `${baseName}.${ext}`);

    if (skipExisting && await fileExists(targetPath)) {
      result.ok = true;
      result.skipped = true;
      result.localFile = path.basename(targetPath);
      return result;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const contentType = response.headers.get('content-type') || '';
    ext = extensionFor(url, form, contentType);
    targetPath = path.join(destDir, `${baseName}.${ext}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      result.error = 'empty response';
      return result;
    }

    await mkdir(destDir, { recursive: true });
    await writeFile(targetPath, buffer);
    result.ok = true;
    result.localFile = path.basename(targetPath);
    result.bytes = buffer.length;
    return result;
  } catch (error) {
    // Browser-style fetch can fail in some restricted environments while curl
    // still works. Fall back to curl before reporting failure.
    try {
      const ext = extensionFor(url, form, null);
      const targetPath = path.join(destDir, `${baseName}.${ext}`);
      await mkdir(destDir, { recursive: true });
      await downloadWithCurl(url, targetPath, timeoutMs);
      result.ok = true;
      result.localFile = path.basename(targetPath);
      return result;
    } catch (curlError) {
      result.error = curlError?.killed
        ? 'timeout'
        : (curlError?.message || error?.message || String(curlError || error));
      return result;
    }
  }
}
