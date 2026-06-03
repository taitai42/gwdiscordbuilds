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
 * @param {number} [scale=1] Multiply all layout dimensions (1 = ~568px wide, 1.4 = ~800px)
 * @returns {Promise<Buffer>}
 */
export async function renderBuildBarWiki(decoded, skills, savedName = null, scale = 1) {
  const profColor = PROFESSION_COLORS[decoded.primary]   ?? PROFESSION_COLORS.None;

  // Scaled layout
  const s         = (n) => Math.round(n * scale);
  const iconSize  = s(ICON_SIZE);
  const iconGap   = s(ICON_GAP);
  const nameH     = s(NAME_AREA_H);
  const headerH   = s(HEADER_H);
  const outerPad  = s(OUTER_PAD);
  const rowGap    = s(ROW_GAP);
  const radius    = s(BAR_RADIUS);
  const innerW    = iconSize * 8 + iconGap * 7;
  const totalW    = innerW + outerPad * 2;
  const totalH    = headerH + rowGap + iconSize + rowGap + nameH + outerPad * 2;

  // Scaled font sizes
  const profFont   = `bold ${s(16)}px sans-serif`;
  const nameInHdrFont = `${s(14)}px sans-serif`;
  const pillFont   = `${s(12)}px sans-serif`;
  const emptyFont  = `${s(24)}px sans-serif`;
  const fallbackFont = `bold ${s(22)}px sans-serif`;
  const badgeFont  = `bold ${s(10)}px sans-serif`;
  const nameFont   = `${s(11)}px sans-serif`;
  const lineH      = s(13);

  const canvas = createCanvas(totalW, totalH);
  const ctx    = canvas.getContext('2d');

  // Background card
  ctx.fillStyle = BG_COLOR;
  roundRect(ctx, 0, 0, totalW, totalH, radius);
  ctx.fill();

  // ── Header ─────────────────────────────────────────────────────────────────
  const headerY = outerPad;
  ctx.fillStyle = HEADER_BG;
  roundRect(ctx, outerPad, headerY, innerW, headerH, s(6));
  ctx.fill();

  // Profession stripe accent on header
  ctx.fillStyle = profColor;
  roundRect(ctx, outerPad, headerY, s(4), headerH, s(6));
  ctx.fill();

  // Left text: "W/Mo · Build name"
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.font         = profFont;
  ctx.fillStyle    = TEXT_PRI;
  const profLabel = `${decoded.primary}${decoded.secondary && decoded.secondary !== 'None' ? ' / ' + decoded.secondary : ''}`;
  let leftX = outerPad + s(14);
  ctx.fillText(profLabel, leftX, headerY + headerH / 2);
  leftX += ctx.measureText(profLabel).width + s(10);

  if (savedName) {
    ctx.font      = nameInHdrFont;
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText('· ' + savedName.slice(0, 30), leftX, headerY + headerH / 2);
  }

  // Right side: attribute pills
  const attrRows = (decoded.attributes ?? [])
    .filter(a => a.level > 0)
    .map(a => ({ name: getAttributeName(a.id), level: a.level }));

  if (attrRows.length > 0) {
    ctx.font = pillFont;
    let pillX = outerPad + innerW - s(8);
    const pillY = headerY + headerH / 2;
    const PILL_H = s(20);

    for (let i = attrRows.length - 1; i >= 0; i--) {
      const a = attrRows[i];
      const label = `${a.level} ${a.name}`;
      const w = Math.ceil(ctx.measureText(label).width) + s(14);
      const x = pillX - w;

      ctx.fillStyle = PILL_BG;
      roundRect(ctx, x, pillY - PILL_H / 2, w, PILL_H, s(6));
      ctx.fill();

      ctx.fillStyle = profColor;
      ctx.fillRect(x + s(4), pillY - PILL_H / 2 + s(4), s(3), PILL_H - s(8));

      ctx.fillStyle = TEXT_PRI;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + s(10), pillY);

      pillX = x - s(6);
      if (pillX < outerPad + s(200)) break;
    }
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'right';
    ctx.font      = pillFont;
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText('No attributes', outerPad + innerW - s(10), headerY + headerH / 2);
    ctx.textAlign = 'left';
  }

  // ── Skill icons row ────────────────────────────────────────────────────────
  const iconY = headerY + headerH + rowGap;
  for (let i = 0; i < 8; i++) {
    const skill   = skills[i];
    const isEmpty = !skill || skill.type === 'None';
    const cellX   = outerPad + i * (iconSize + iconGap);

    ctx.fillStyle = isEmpty ? EMPTY_BG : CELL_BG;
    roundRect(ctx, cellX, iconY, iconSize, iconSize, s(6));
    ctx.fill();
    ctx.strokeStyle = isEmpty ? BORDER_CLR : profColor + '88';
    ctx.lineWidth   = Math.max(1, s(1.5));
    roundRect(ctx, cellX, iconY, iconSize, iconSize, s(6));
    ctx.stroke();

    if (isEmpty) {
      ctx.font         = emptyFont;
      ctx.fillStyle    = BORDER_CLR;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('×', cellX + iconSize / 2, iconY + iconSize / 2);
      ctx.textAlign    = 'left';
      continue;
    }

    const img = await tryLoadImage(skill.iconLocal ?? skill.iconUrl);
    if (img) {
      ctx.save();
      roundRect(ctx, cellX + s(2), iconY + s(2), iconSize - s(4), iconSize - s(4), s(4));
      ctx.clip();
      ctx.drawImage(img, cellX + s(2), iconY + s(2), iconSize - s(4), iconSize - s(4));
      ctx.restore();
    } else {
      ctx.font         = fallbackFont;
      ctx.fillStyle    = profColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText((skill.name ?? '?')[0].toUpperCase(), cellX + iconSize / 2, iconY + iconSize / 2);
      ctx.textAlign    = 'left';
    }

    // Slot number badge
    const badgeW = s(16);
    const badgeH = s(14);
    ctx.fillStyle = '#000000aa';
    roundRect(ctx, cellX + s(3), iconY + s(3), badgeW, badgeH, s(3));
    ctx.fill();
    ctx.font         = badgeFont;
    ctx.fillStyle    = '#ffffffcc';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    ctx.fillText(`${i + 1}`, cellX + s(3) + badgeW / 2, iconY + s(3) + badgeH / 2);
    ctx.textAlign    = 'left';
  }

  // ── Skill names row ────────────────────────────────────────────────────────
  const nameY = iconY + iconSize + rowGap;
  ctx.fillStyle = NAME_BG;
  roundRect(ctx, outerPad, nameY, innerW, nameH, s(6));
  ctx.fill();

  ctx.font = nameFont;
  for (let i = 0; i < 8; i++) {
    const skill   = skills[i];
    const isEmpty = !skill || skill.type === 'None';
    const cellX   = outerPad + i * (iconSize + iconGap);
    const cx      = cellX + iconSize / 2;

    if (isEmpty) {
      ctx.fillStyle    = TEXT_DIM;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('—', cx, nameY + nameH / 2);
      ctx.textAlign    = 'left';
      continue;
    }

    const lines = wrapName(ctx, skill.name, iconSize - s(2), 2);
    ctx.fillStyle    = TEXT_PRI;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';
    const startY = nameY + s(5) + (lines.length === 1 ? s(6) : 0);
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], cx, startY + li * lineH);
    }
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

/**
 * Render a full team build (wiki style) — vertical stack.
 *
 * Each bar is rendered at TEAM_BUILD_SCALE (default 1.4 → ~800px wide), which
 * is the largest Discord will display without further downscaling.
 *
 * @param {Array<{decoded, skills, savedName?}>} builds
 */
export async function renderTeamBuildImageWiki(builds) {
  const scale = Math.max(0.5, Math.min(3, parseFloat(process.env.TEAM_BUILD_SCALE) || 1.4));

  const barBuffers = await Promise.all(builds.map(b =>
    renderBuildBarWiki(b.decoded, b.skills, b.savedName ?? null, scale),
  ));
  const barImages  = await Promise.all(barBuffers.map(buf => loadImage(buf)));

  const gap    = Math.round(8 * scale);
  const padOut = Math.round(10 * scale);
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
