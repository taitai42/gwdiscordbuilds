/**
 * Guild Wars 1 Skill Data
 *
 * Skill names come from the static SKILL_TEMPLATE_MAP.
 * Full skill details (description, energy, activation, recharge, type, campaign)
 * are loaded from cache/skillData.json  — populated by scripts/downloadSkillData.js.
 * Icons are loaded from cache/icons/    — populated by scripts/downloadIcons.js.
 * No runtime network calls are made.
 */

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SKILL_TEMPLATE_MAP } from '../data/skillMap.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR  = join(__dirname, '../../cache');
const ICONS_DIR  = join(CACHE_DIR, 'icons');
const SKILL_DATA = join(CACHE_DIR, 'skillData.json');

// Ensure directories exist
for (const d of [CACHE_DIR, ICONS_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// Load pre-downloaded skill details (may be empty if script hasn't been run yet)
let _skillDB = {};
if (existsSync(SKILL_DATA)) {
  try { _skillDB = JSON.parse(readFileSync(SKILL_DATA, 'utf8')); } catch { /* empty */ }
}

/** Convert a skill name to the safe filename used by downloadIcons.js */
function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

/** Return the local icon path if it exists, otherwise null */
function localIconPath(name) {
  const p = join(ICONS_DIR, `${safeFilename(name)}.jpg`);
  return existsSync(p) ? p : null;
}

function buildSkillObject(name) {
  const db      = _skillDB[name] ?? {};
  const wikified = name.replace(/ /g, '_').replace(/"/g, '"');
  const wikiUrl  = `https://wiki.guildwars.com/wiki/${encodeURIComponent(wikified)}`;
  const iconUrl  = `https://wiki.guildwars.com/wiki/Special:FilePath/${encodeURIComponent(wikified)}.jpg`;

  return {
    name,
    type:        db.type        ?? 'Skill',
    attribute:   db.attribute   ?? null,
    energy:      db.energy      ?? null,
    activation:  db.activation  ?? null,
    recharge:    db.recharge    ?? null,
    campaign:    db.campaign    ?? null,
    description: db.description ?? `[View on GW Wiki](${wikiUrl})`,
    iconUrl,
    iconLocal:   localIconPath(name),
  };
}

function buildEmpty() {
  return { name: 'Empty', type: 'None', description: '', iconUrl: null, iconLocal: null };
}

function buildFallback(name) {
  return { name, type: 'Unknown', description: '', iconUrl: null, iconLocal: null };
}

/**
 * Resolve an array of 8 skill template IDs to skill objects.
 * iconLocal will be set if the icon was downloaded via scripts/downloadIcons.js.
 * Full details (description etc.) are set if cache/skillData.json exists.
 */
export function resolveSkills(templateIds) {
  return templateIds.map((id) => {
    if (id === 0) return buildEmpty();
    const name = SKILL_TEMPLATE_MAP[id];
    if (!name) return buildFallback(`Unknown (${id})`);
    return buildSkillObject(name);
  });
}

// Re-export for consumers that want direct map access
export { SKILL_TEMPLATE_MAP };
