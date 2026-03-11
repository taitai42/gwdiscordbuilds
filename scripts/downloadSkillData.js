/**
 * One-time script to download GW1 skill data (description, energy, activation,
 * recharge, type, campaign) from the official GW wiki and save to cache/skillData.json.
 *
 * Run once from your local machine:
 *   node scripts/downloadSkillData.js
 */

import axios from 'axios';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SKILL_TEMPLATE_MAP } from '../src/data/skillMap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR  = join(__dirname, '../cache');
const OUTPUT     = join(CACHE_DIR, 'skillData.json');

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// Load existing partial results so we can resume
let result = {};
if (existsSync(OUTPUT)) {
  try { result = JSON.parse(readFileSync(OUTPUT, 'utf8')); } catch { /* empty */ }
}

const WIKI_API = 'https://wiki.guildwars.com/api.php';
const HEADERS  = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

/**
 * Extract all key=value params from a wikitext infobox like {{Skill box|...}}.
 * Respects nested {{...}} so pipes inside templates don't split params.
 */
function parseInfoboxParams(wikitext) {
  // Find the first {{ that starts the infobox
  const start = wikitext.indexOf('{{');
  if (start === -1) return {};

  // Walk character by character, tracking depth, collecting params
  const params = {};
  let depth = 0, i = start;
  let current = '';

  while (i < wikitext.length) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++;
      current += '{{';
      i += 2;
    } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--;
      if (depth === 0) break; // end of top-level template
      current += '}}';
      i += 2;
    } else if (wikitext[i] === '|' && depth === 1) {
      // Top-level pipe: end of current param, start of next
      const eqIdx = current.indexOf('=');
      if (eqIdx !== -1) {
        const key = current.slice(0, eqIdx).trim().toLowerCase();
        params[key] = current.slice(eqIdx + 1).trim();
      }
      current = '';
      i++;
    } else {
      current += wikitext[i++];
    }
  }
  // Last param
  const eqIdx = current.indexOf('=');
  if (eqIdx !== -1) {
    const key = current.slice(0, eqIdx).trim().toLowerCase();
    params[key] = current.slice(eqIdx + 1).trim();
  }
  return params;
}

/** Clean wiki markup from an extracted value */
function cleanWiki(val) {
  if (!val) return null;
  return val
    .replace(/\{\{[^|{}]+\|([^}]*)\}\}/g, '$1') // {{template|text}} → text
    .replace(/\{\{[^{}]+\}\}/g, '')              // {{template}} → remove
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1') // [[Link|text]] → text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/(\d+)\|(\d+)/g, '$1...$2')         // 1|15 → 1...15 (GW stat ranges)
    .replace(/\s*\|\s*/g, ' ')                   // remaining pipes → space
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // [text](url) → text
    .replace(/\s{2,}/g, ' ')
    .trim() || null;
}

function parseSkill(name, wikitext) {
  const p = parseInfoboxParams(wikitext);
  // Prefer concise description; fall back to full description
  const rawDesc = p['concise description'] ?? p['description'] ?? null;
  return {
    name,
    type:        cleanWiki(p['type']),
    attribute:   cleanWiki(p['attribute']),
    energy:      cleanWiki(p['energy cost'] ?? p['energy']),
    activation:  cleanWiki(p['activation']),
    recharge:    cleanWiki(p['recharge']),
    campaign:    cleanWiki(p['campaign']),
    description: cleanWiki(rawDesc),
  };
}

// Unique skill names, skip placeholder
const names = [...new Set(
  Object.values(SKILL_TEMPLATE_MAP).filter(n => n && n !== 'No Skill'),
)];

// Only fetch what we don't already have
const todo = names.filter(n => !result[n]);
console.log(`${todo.length} skills to fetch (${names.length - todo.length} already cached)…`);

let ok = 0, fail = 0;
const BATCH = 50;

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  try {
    const { data } = await axios.get(WIKI_API, {
      params: {
        action:        'query',
        titles:         batch.join('|'),
        prop:           'revisions',
        rvprop:         'content',
        rvslots:        'main',
        format:         'json',
        formatversion:  2,
      },
      headers: HEADERS,
      timeout: 30000,
    });

    for (const page of (data.query?.pages ?? [])) {
      const content =
        page.revisions?.[0]?.slots?.main?.content ??
        page.revisions?.[0]?.content ?? '';
      result[page.title] = parseSkill(page.title, content);
      ok++;
    }
  } catch (err) {
    console.warn(`  Batch ${i}–${i + batch.length} failed: ${err.message}`);
    fail += batch.length;
  }

  if ((i / BATCH) % 10 === 0) {
    console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length} fetched…`);
    // Save progress each 500 skills
    writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  }
}

writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`\nDone. ${ok} fetched, ${fail} failed. Saved to ${OUTPUT}`);
