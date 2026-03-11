/**
 * One-time script to download all GW1 skill icons locally.
 *
 * Run once from your local machine (not inside Docker):
 *   node scripts/downloadIcons.js
 *
 * Icons are saved to cache/icons/<Skill_Name>.jpg
 * Docker uses a bind mount so the container sees them automatically.
 */

import axios from 'axios';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { SKILL_TEMPLATE_MAP } from '../src/data/skillMap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../cache/icons');

if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

// Browser-like UA to avoid 403 from the wiki
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
  'Referer': 'https://wiki.guildwars.com/',
};

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

function iconUrl(name) {
  const wikified = name.replace(/ /g, '_').replace(/"/g, '"');
  return `https://wiki.guildwars.com/wiki/Special:FilePath/${encodeURIComponent(wikified)}.jpg`;
}

// Collect unique skill names
const names = [...new Set(Object.values(SKILL_TEMPLATE_MAP))];
console.log(`Downloading icons for ${names.length} skills…`);

let ok = 0, skip = 0, fail = 0;

// Process in batches of 5 to avoid hammering the wiki
for (let i = 0; i < names.length; i += 5) {
  const batch = names.slice(i, i + 5);
  await Promise.all(batch.map(async (name) => {
    const dest = join(ICONS_DIR, `${safeFilename(name)}.jpg`);
    if (existsSync(dest)) { skip++; return; }
    try {
      const res = await axios.get(iconUrl(name), {
        responseType: 'stream',
        headers: HEADERS,
        timeout: 15000,
        maxRedirects: 10,
      });
      await pipeline(res.data, createWriteStream(dest));
      ok++;
    } catch (err) {
      console.warn(`  FAIL [${name}]: ${err.message}`);
      fail++;
    }
  }));
  if ((i / 5) % 20 === 0) {
    console.log(`  ${i + batch.length}/${names.length} processed (${ok} ok, ${skip} skipped, ${fail} failed)`);
  }
}

console.log(`\nDone. ${ok} downloaded, ${skip} already existed, ${fail} failed.`);
