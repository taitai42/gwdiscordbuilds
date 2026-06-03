/**
 * Wiki-style Skill Bar Renderer (Option B)
 *
 * Layout per build:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  W/Mo  ·  My Build              [12 Axe] [10 Str] [8 Tactics]   │  ← header strip
 *   │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                │
 *   │  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 │                │  ← skill icons
 *   │  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                │
 *   │  Eviscer- "For   Heal..  ...   ...   ...   ...   Res.           │  ← skill names (2 lines)
 *   │  ate     Great!"                                                 │
 *   └──────────────────────────────────────────────────────────────────┘
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readFileSync } from 'fs';
import { PROFESSION_COLORS } from './templateDecoder.js';
import { getAttributeName } from '../data/attributeMap.js';

// ── Layout constants ─────────────────────────────────────────────────────────
const ICON_SIZE      = 64;
const ICON_GAP       = 8;
const NAME_AREA_H    = 38;            // 2-line name area below icons
const HEADER_H       = 40;
const OUTER_PAD      = 12;
const ROW_GAP        = 6;
const BAR_RADIUS     = 8;

const INNER_W        = ICON_SIZE * 8 + ICON_GAP * 7;
const TOTAL_W        = INNER_W + OUTER_PAD * 2;
const TOTAL_H        = HEADER_H + ROW_GAP + ICON_SIZE + ROW_GAP + NAME_AREA_H + OUTER_PAD * 2;

// ── Colours ──────────────────────────────────────────────────────────────────
const BG_COLOR    = '#0f1419';
const HEADER_BG   = '#1a2030';
const CELL_BG     = '#1a2030';
const EMPTY_BG    = '#0f1419';
const BORDER_CLR  = '#2c3a4d';
const TEXT_PRI    = '#e6edf3';
const TEXT_DIM    = '#8b9eb5';
const PILL_BG     = '#243044';
const NAME_BG     = '#141a24';

function roundRect(ctx, x, y, w, h, r = BAR_RADIUS) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function tryLoadImage(src) {
  if (!src) return null;
  try {
    if (src.startsWith('http')) {
      const res = await fetch(src);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return await loadImage(buf);
    }
    if (existsSync(src)) return await loadImage(readFileSync(src));
  } catch { /* swallow */ }
  return null;
}

/** Wrap a single-line skill name into up to 2 lines that fit `maxW`. */
function wrapName(ctx, text, maxW, maxLines = 2) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';

  const pushLine = (s) => {
    // Truncate the line itself if it's still too wide (single long word)
    let trimmed = s;
    while (trimmed.length > 1 && ctx.measureText(trimmed).width > maxW) {
      trimmed = trimmed.slice(0, -1);
    }
    lines.push(trimmed);
  };

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      if (cur) pushLine(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) pushLine(cur);

  // If we ran out of lines, ellipsize the last one
  if (lines.length === maxLines) {
    const remaining = words.slice(lines.join(' ').split(/\s+/).length).join(' ');
    if (remaining) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + '…';
    }
  }
  return lines;
}

/**
 * Render a single build in the wiki style.
 * @param {object} decoded
 * @param {Array}  skills
 * @param {string|null} savedName
 * @returns {Promise<Buffer>}
 */
export async function renderBuildBarWiki(decoded, skills, savedName = null) {
  const profColor = PROFESSION_COLORS[decoded.primary]   ?? PROFESSION_COLORS.None;

  const canvas = createCanvas(TOTAL_W, TOTAL_H);
  const ctx    = canvas.getContext('2d');

  // Background card
  ctx.fillStyle = BG_COLOR;
  roundRect(ctx, 0, 0, TOTAL_W, TOTAL_H, BAR_RADIUS);
  ctx.fill();

  // ── Header ─────────────────────────────────────────────────────────────────
  const headerY = OUTER_PAD;
  ctx.fillStyle = HEADER_BG;
  roundRect(ctx, OUTER_PAD, headerY, INNER_W, HEADER_H, 6);
  ctx.fill();

  // Profession stripe accent on header
  ctx.fillStyle = profColor;
  roundRect(ctx, OUTER_PAD, headerY, 4, HEADER_H, 6);
  ctx.fill();

  // Left text: "W/Mo · Build name"
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.font         = 'bold 16px sans-serif';
  ctx.fillStyle    = TEXT_PRI;
  const profLabel = `${decoded.primary}${decoded.secondary && decoded.secondary !== 'None' ? ' / ' + decoded.secondary : ''}`;
  let leftX = OUTER_PAD + 14;
  ctx.fillText(profLabel, leftX, headerY + HEADER_H / 2);
  leftX += ctx.measureText(profLabel).width + 10;

  if (savedName) {
    ctx.font      = '14px sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText('· ' + savedName.slice(0, 30), leftX, headerY + HEADER_H / 2);
  }

  // Right side: attribute pills
  const attrRows = (decoded.attributes ?? [])
    .filter(a => a.level > 0)
    .map(a => ({ name: getAttributeName(a.id), level: a.level }));

  if (attrRows.length > 0) {
    ctx.textAlign = 'right';
    ctx.font      = '12px sans-serif';
    let pillX = OUTER_PAD + INNER_W - 8;
    const pillY = headerY + HEADER_H / 2;
    const PILL_H = 20;

    // Draw from right to left so they read left-to-right in order
    for (let i = attrRows.length - 1; i >= 0; i--) {
      const a = attrRows[i];
      const label = `${a.level} ${a.name}`;
      const w = Math.ceil(ctx.measureText(label).width) + 14;
      const x = pillX - w;

      ctx.fillStyle = PILL_BG;
      roundRect(ctx, x, pillY - PILL_H / 2, w, PILL_H, 6);
      ctx.fill();

      // Tiny prof-colored bar at left of pill
      ctx.fillStyle = profColor;
      ctx.fillRect(x + 4, pillY - PILL_H / 2 + 4, 3, PILL_H - 8);

      ctx.fillStyle = TEXT_PRI;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 10, pillY);

      pillX = x - 6;
      if (pillX < OUTER_PAD + 200) break; // give up if running out of room
    }
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'right';
    ctx.font      = '12px sans-serif';
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText('No attributes', OUTER_PAD + INNER_W - 10, headerY + HEADER_H / 2);
    ctx.textAlign = 'left';
  }

  // ── Skill icons row ────────────────────────────────────────────────────────
  const iconY = headerY + HEADER_H + ROW_GAP;
  for (let i = 0; i < 8; i++) {
    const skill   = skills[i];
    const isEmpty = !skill || skill.type === 'None';
    const cellX   = OUTER_PAD + i * (ICON_SIZE + ICON_GAP);

    // Cell background + border
    ctx.fillStyle = isEmpty ? EMPTY_BG : CELL_BG;
    roundRect(ctx, cellX, iconY, ICON_SIZE, ICON_SIZE, 6);
    ctx.fill();
    ctx.strokeStyle = isEmpty ? BORDER_CLR : profColor + '88';
    ctx.lineWidth   = 1.5;
    roundRect(ctx, cellX, iconY, ICON_SIZE, ICON_SIZE, 6);
    ctx.stroke();

    if (isEmpty) {
      ctx.font         = '24px sans-serif';
      ctx.fillStyle    = BORDER_CLR;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('×', cellX + ICON_SIZE / 2, iconY + ICON_SIZE / 2);
      ctx.textAlign    = 'left';
      continue;
    }

    const img = await tryLoadImage(skill.iconLocal ?? skill.iconUrl);
    if (img) {
      ctx.save();
      roundRect(ctx, cellX + 2, iconY + 2, ICON_SIZE - 4, ICON_SIZE - 4, 4);
      ctx.clip();
      ctx.drawImage(img, cellX + 2, iconY + 2, ICON_SIZE - 4, ICON_SIZE - 4);
      ctx.restore();
    } else {
      ctx.font         = 'bold 22px sans-serif';
      ctx.fillStyle    = profColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText((skill.name ?? '?')[0].toUpperCase(), cellX + ICON_SIZE / 2, iconY + ICON_SIZE / 2);
      ctx.textAlign    = 'left';
    }

    // Slot number badge — small, top-left
    ctx.fillStyle = '#000000aa';
    roundRect(ctx, cellX + 3, iconY + 3, 16, 14, 3);
    ctx.fill();
    ctx.font         = 'bold 10px sans-serif';
    ctx.fillStyle    = '#ffffffcc';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillText(`${i + 1}`, cellX + 11, iconY + 10);
    ctx.textAlign    = 'left';
  }

  // ── Skill names row ────────────────────────────────────────────────────────
  const nameY = iconY + ICON_SIZE + ROW_GAP;
  ctx.fillStyle = NAME_BG;
  roundRect(ctx, OUTER_PAD, nameY, INNER_W, NAME_AREA_H, 6);
  ctx.fill();

  ctx.font = '11px sans-serif';
  for (let i = 0; i < 8; i++) {
    const skill   = skills[i];
    const isEmpty = !skill || skill.type === 'None';
    const cellX   = OUTER_PAD + i * (ICON_SIZE + ICON_GAP);
    const cx      = cellX + ICON_SIZE / 2;

    if (isEmpty) {
      ctx.fillStyle    = TEXT_DIM;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('—', cx, nameY + NAME_AREA_H / 2);
      ctx.textAlign    = 'left';
      continue;
    }

    const lines = wrapName(ctx, skill.name, ICON_SIZE - 2, 2);
    ctx.fillStyle    = TEXT_PRI;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';
    const lineH = 13;
    const startY = nameY + 5 + (lines.length === 1 ? 6 : 0);
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], cx, startY + li * lineH);
    }
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

/**
 * Render a full team build (wiki style) — vertical stack.
 * @param {Array<{decoded, skills, savedName?}>} builds
 */
export async function renderTeamBuildImageWiki(builds) {
  const barBuffers = await Promise.all(builds.map(b =>
    renderBuildBarWiki(b.decoded, b.skills, b.savedName ?? null),
  ));
  const barImages  = await Promise.all(barBuffers.map(buf => loadImage(buf)));

  const gap    = 8;
  const padOut = 10;
  const totalH = padOut + barImages.reduce((s, img) => s + img.height + gap, 0) - gap + padOut;
  const totalW = Math.max(...barImages.map(img => img.width)) + padOut * 2;

  const canvas = createCanvas(totalW, totalH);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, totalW, totalH);

  let y = padOut;
  for (const img of barImages) {
    ctx.drawImage(img, padOut, y);
    y += img.height + gap;
  }

  return canvas.toBuffer('image/png');
}
