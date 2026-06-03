/**
 * Bulk builds importer.
 *
 * Accepts either:
 *   • a single .txt file whose contents is a build template code
 *   • a .zip containing many .txt files (e.g. the GW Templates/ folder)
 *
 * For each .txt file:
 *   - Filename (sans extension) becomes the save name
 *   - First non-empty line is parsed as the template code
 *   - Validated via decodeTemplate(); invalid entries are reported but skipped
 *
 * Duplicate names within the same archive get a suffix `(2)`, `(3)`, etc.
 */

import AdmZip from 'adm-zip';
import { decodeTemplate } from './templateDecoder.js';

const MAX_ENTRIES   = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5 MB total
const MAX_CODE_LEN  = 200;                // sanity cap per template code

/**
 * Parse a single template file's contents into a code string.
 * Strips BOM, whitespace, and any trailing notes after the first line.
 */
function extractCode(textContent) {
  if (!textContent) return '';
  const stripped = textContent.replace(/^\uFEFF/, '');
  for (const line of stripped.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) return trimmed.slice(0, MAX_CODE_LEN);
  }
  return '';
}

/** Strip the .txt extension and clean up the name. */
function nameFromFilename(fname) {
  // Take basename, strip extension
  const base = fname.split(/[\\/]/).pop() || fname;
  const dot  = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return stem.trim().slice(0, 80);
}

/**
 * Deduplicate names within the imported batch.
 * Mutates entries in place by appending `(2)`, `(3)`, … to clashes.
 */
function dedupeNames(entries) {
  const seen = new Map();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    const n   = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) e.name = `${e.name} (${n})`.slice(0, 80);
  }
}

/**
 * Build a single validated entry from a filename + raw text content.
 */
function buildEntry(filename, content) {
  const name = nameFromFilename(filename);
  const code = extractCode(content);
  if (!name) return { name: filename, code, valid: false, error: 'empty filename' };
  if (!code) return { name, code: '', valid: false, error: 'no template code in file' };
  try {
    decodeTemplate(code);
    return { name, code, valid: true };
  } catch (err) {
    return { name, code, valid: false, error: err.message };
  }
}

/**
 * Parse a Buffer that is either a `.txt` file or a `.zip` archive.
 *
 * @param {Buffer} buffer
 * @param {string} filename     Original filename (used for the single-txt case)
 * @returns {{ entries: Array<{name,code,valid,error?}>, format: 'txt'|'zip' }}
 */
export function parseImportBuffer(buffer, filename) {
  if (!buffer || !buffer.length) {
    return { entries: [], format: 'txt' };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large (${buffer.length} bytes, max ${MAX_FILE_SIZE}).`);
  }

  const lower = (filename || '').toLowerCase();

  // ── Single .txt ──────────────────────────────────────────────────────────
  if (lower.endsWith('.txt')) {
    return { entries: [buildEntry(filename, buffer.toString('utf8'))], format: 'txt' };
  }

  // ── .zip archive ─────────────────────────────────────────────────────────
  if (lower.endsWith('.zip') || isZipMagic(buffer)) {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length > MAX_ENTRIES) {
      throw new Error(`Archive contains too many entries (${zipEntries.length}, max ${MAX_ENTRIES}).`);
    }

    const out = [];
    for (const ze of zipEntries) {
      if (ze.isDirectory) continue;
      if (!ze.entryName.toLowerCase().endsWith('.txt')) continue;
      const data = ze.getData();
      if (data.length > 64 * 1024) {
        out.push({ name: nameFromFilename(ze.entryName), code: '', valid: false, error: 'file too large' });
        continue;
      }
      out.push(buildEntry(ze.entryName, data.toString('utf8')));
    }
    dedupeNames(out);
    return { entries: out, format: 'zip' };
  }

  throw new Error('Unsupported file type. Attach a .txt or a .zip of your Templates folder.');
}

/** PK\x03\x04 (or PK\x05\x06 empty zip / PK\x07\x08 spanned). */
function isZipMagic(buf) {
  return buf.length >= 4
    && buf[0] === 0x50 && buf[1] === 0x4b
    && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07);
}

/**
 * Download an attachment URL into a Buffer.
 * Validates content length up front when the server reports it.
 */
export async function fetchAttachment(url, sizeHint) {
  if (sizeHint != null && sizeHint > MAX_FILE_SIZE) {
    throw new Error(`Attachment too large (${sizeHint} bytes, max ${MAX_FILE_SIZE}).`);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal:  ctrl.signal,
      headers: { 'User-Agent': 'gwdiscordbuilds/1.0 (+https://github.com/taitai42/gwdiscordbuilds)' },
    });
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(timer);
  }
}
