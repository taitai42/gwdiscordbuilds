/**
 * Persistent store for saved builds and team builds.
 * Data is written to cache/savedBuilds.json and cache/savedTeamBuilds.json.
 * Keys are stored lowercase for case-insensitive lookup.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILDS_FILE      = join(__dirname, '../../cache/savedBuilds.json');
const TEAMBUILDS_FILE  = join(__dirname, '../../cache/savedTeamBuilds.json');

function read(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

function write(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

// ── Single builds ─────────────────────────────────────────────────────────────

/**
 * Save a single build. Overwrites any existing entry with the same name.
 * @param {string} name  Display name (stored lowercase)
 * @param {string} code  Template code
 */
export function saveBuild(name, code) {
  const data = read(BUILDS_FILE);
  data[name.toLowerCase()] = { name, code, savedAt: Date.now() };
  write(BUILDS_FILE, data);
}

/**
 * Load a single build by name. Returns null if not found.
 * @param {string} name
 * @returns {{ name: string, code: string, savedAt: number } | null}
 */
export function loadBuild(name) {
  const data = read(BUILDS_FILE);
  return data[name.toLowerCase()] ?? null;
}

// ── Team builds ───────────────────────────────────────────────────────────────

/**
 * Save a team build. Overwrites any existing entry with the same name.
 * @param {string}   name   Display name (stored lowercase)
 * @param {string[]} codes  Array of template codes
 */
export function saveTeamBuild(name, codes) {
  const data = read(TEAMBUILDS_FILE);
  data[name.toLowerCase()] = { name, codes, savedAt: Date.now() };
  write(TEAMBUILDS_FILE, data);
}

/**
 * Load a team build by name. Returns null if not found.
 * @param {string} name
 * @returns {{ name: string, codes: string[], savedAt: number } | null}
 */
export function loadTeamBuild(name) {
  const data = read(TEAMBUILDS_FILE);
  return data[name.toLowerCase()] ?? null;
}

/**
 * Return all saved single builds sorted alphabetically by name.
 * @returns {{ name: string, code: string, savedAt: number }[]}
 */
export function listBuilds() {
  const data = read(BUILDS_FILE);
  return Object.values(data).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find a saved build by its template code. Returns null if not found.
 * @param {string} code
 * @returns {{ name: string, code: string } | null}
 */
export function findBuildByCode(code) {
  const data = read(BUILDS_FILE);
  return Object.values(data).find(b => b.code === code) ?? null;
}
