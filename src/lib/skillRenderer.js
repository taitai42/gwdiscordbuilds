/**
 * Skill Bar Renderer
 *
 * Renders a Guild Wars 1 build as a horizontal skill bar image,
 * resembling the style used on pvxwiki / wiki.guildwars.com.
 *
 * Layout (per build):
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  W/Mo                                                          │  ← header
 *   │  Axe Mastery     ████████████░░░░  12                          │  ← attribute rows
 *   │  Swordsmanship   █████████░░░░░░░   9                          │
 *   │  [Sk1][Sk2][Sk3][Sk4][Sk5][Sk6][Sk7][Sk8]                     │  ← skill row
 *   └────────────────────────────────────────────────────────────────┘
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { existsSync, readFileSync } from 'fs';
import { PROFESSION_COLORS } from './templateDecoder.js';
import { getAttributeName } from '../data/attributeMap.js';

// ── Layout constants ─────────────────────────────────────────────────────────
const SKILL_SIZE     = 80;
const PADDING        = 12;
const INNER_W        = SKILL_SIZE * 8 + PADDING * 7;
const HEADER_H       = 36;
const ATTR_ROW_H     = 24;
const SKILL_ROW_H    = SKILL_SIZE + 6;
const OUTER_PAD      = 14;
const BAR_RADIUS     = 7;
const MAX_ATTR_LEVEL = 12;

// ── Colours ──────────────────────────────────────────────────────────────────
const BG_COLOR    = '#111827';
const HEADER_BG   = '#1f2937';
const CELL_BG     = '#1f2937';
const EMPTY_BG    = '#111827';
const BORDER_CLR  = '#374151';
const TEXT_PRI    = '#f3f4f6';
const TEXT_DIM    = '#9ca3af';
const BAR_TRACK   = '#374151';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  } catch { /* fall through */ }
  return null;
}

/** Draw a labelled attribute bar with a fill track. */
function drawAttrBar(ctx, x, y, w, label, level, profColor) {
  const LABEL_W = 180;
  const LEVEL_W = 36;
  const BAR_H   = 12;
  const barW    = w - LABEL_W - LEVEL_W - 8;

  // Attribute name
  ctx.font         = '13px sans-serif';
  ctx.fillStyle    = TEXT_DIM;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText(label, x, y + ATTR_ROW_H / 2);

  // Track background
  const bx = x + LABEL_W;
  const by = y + (ATTR_ROW_H - BAR_H) / 2;
  ctx.fillStyle = BAR_TRACK;
  roundRect(ctx, bx, by, barW, BAR_H, 3);
  ctx.fill();

  // Filled portion
  const fillW = Math.round((level / MAX_ATTR_LEVEL) * barW);
  if (fillW > 0) {
    ctx.fillStyle = profColor;
    roundRect(ctx, bx, by, fillW, BAR_H, 3);
    ctx.fill();
  }

  // Level number
  ctx.font      = 'bold 13px sans-serif';
  ctx.fillStyle = TEXT_PRI;
  ctx.textAlign = 'right';
  ctx.fillText(String(level), x + w - 2, y + ATTR_ROW_H / 2);
  ctx.textAlign = 'left';
}

/**
 * Render a single build bar and return a PNG Buffer.
 *
 * @param {object} decoded   Output from decodeTemplate()
 * @param {Array}  skills    Array of 8 skill data objects from resolveSkills()
 * @returns {Promise<Buffer>}
 */
export async function renderBuildBarClassic(decoded, skills, savedName = null) {
  const profColor = PROFESSION_COLORS[decoded.primary]   ?? PROFESSION_COLORS.None;
  const secColor  = PROFESSION_COLORS[decoded.secondary] ?? PROFESSION_COLORS.None;

  // Resolve attribute names using the flat global attribute index
  const attrRows = decoded.attributes
    .map(a => ({
      name:  getAttributeName(a.id),
      level: a.level,
    }))
    .filter(a => a.level > 0);

  // Dynamic canvas height
  const attrAreaH = attrRows.length * ATTR_ROW_H + (attrRows.length > 0 ? PADDING / 2 : 0);
  const totalH    = OUTER_PAD + HEADER_H + attrAreaH + SKILL_ROW_H + OUTER_PAD;
  const totalW    = INNER_W + OUTER_PAD * 2 + 4;

  const canvas = createCanvas(totalW, totalH);
  const ctx    = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = BG_COLOR;
  roundRect(ctx, 0, 0, totalW, totalH, BAR_RADIUS + 2);
  ctx.fill();

  // Left profession accent stripe
  ctx.fillStyle = profColor;
  ctx.fillRect(OUTER_PAD, OUTER_PAD, 4, totalH - OUTER_PAD * 2);

  const contentX = OUTER_PAD + 4 + PADDING;
  const contentW = INNER_W;
  let curY = OUTER_PAD;

  // ── Header ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = HEADER_BG;
  roundRect(ctx, contentX - 2, curY, contentW + 4, HEADER_H, 4);
  ctx.fill();

  ctx.font         = 'bold 18px sans-serif';
  ctx.fillStyle    = TEXT_PRI;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText(`${decoded.primary} / ${decoded.secondary}`, contentX + 4, curY + HEADER_H / 2);

  // Saved name right-aligned in header (takes priority over secondary label)
  if (savedName) {
    ctx.font      = 'bold 13px sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.textAlign = 'right';
    ctx.fillText(savedName.slice(0, 40), contentX + contentW, curY + HEADER_H / 2);
    ctx.textAlign = 'left';
  } else if (decoded.secondary !== 'None') {
    ctx.font      = '13px sans-serif';
    ctx.fillStyle = secColor;
    ctx.textAlign = 'right';
    ctx.fillText(decoded.secondary, contentX + contentW, curY + HEADER_H / 2);
    ctx.textAlign = 'left';
  }

  // Separator line under header
  ctx.strokeStyle = profColor + '55';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, curY + HEADER_H);
  ctx.lineTo(contentX + contentW, curY + HEADER_H);
  ctx.stroke();

  curY += HEADER_H + 4;

  // ── Attribute rows ──────────────────────────────────────────────────────────
  for (const attr of attrRows) {
    drawAttrBar(ctx, contentX, curY, contentW, attr.name, attr.level, profColor);
    curY += ATTR_ROW_H;
  }
  if (attrRows.length > 0) curY += PADDING / 2;

  // ── Skill cells ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 8; i++) {
    const skill   = skills[i];
    const cellX   = contentX + i * (SKILL_SIZE + PADDING);
    const cellY   = curY;
    const isEmpty = !skill || skill.type === 'None';

    ctx.fillStyle = isEmpty ? EMPTY_BG : CELL_BG;
    roundRect(ctx, cellX, cellY, SKILL_SIZE, SKILL_SIZE, 4);
    ctx.fill();

    ctx.strokeStyle = isEmpty ? BORDER_CLR : profColor + '99';
    ctx.lineWidth   = 1.5;
    roundRect(ctx, cellX, cellY, SKILL_SIZE, SKILL_SIZE, 4);
    ctx.stroke();

    if (isEmpty) {
      ctx.font         = '28px sans-serif';
      ctx.fillStyle    = '#374151';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText('×', cellX + SKILL_SIZE / 2, cellY + SKILL_SIZE / 2);
      ctx.textAlign    = 'left';
      continue;
    }

    const img = await tryLoadImage(skill.iconLocal ?? skill.iconUrl);
    if (img) {
      ctx.save();
      roundRect(ctx, cellX, cellY, SKILL_SIZE, SKILL_SIZE, 4);
      ctx.clip();
      ctx.drawImage(img, cellX, cellY, SKILL_SIZE, SKILL_SIZE);
      ctx.restore();
    } else {
      ctx.font         = 'bold 24px sans-serif';
      ctx.fillStyle    = profColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText((skill.name ?? '?')[0].toUpperCase(), cellX + SKILL_SIZE / 2, cellY + SKILL_SIZE / 2);
      ctx.textAlign    = 'left';
    }

    // Slot number badge
    ctx.fillStyle    = '#00000099';
    ctx.fillRect(cellX, cellY + SKILL_SIZE - 18, SKILL_SIZE, 18);
    ctx.font         = 'bold 11px sans-serif';
    ctx.fillStyle    = '#ffffff99';
    ctx.textBaseline = 'bottom';
    ctx.textAlign    = 'center';
    ctx.fillText(`${i + 1}`, cellX + SKILL_SIZE / 2, cellY + SKILL_SIZE - 1);
    ctx.textAlign    = 'left';
  }

  return canvas.toBuffer('image/png');
}

/**
 * Render a full team build (up to 8 builds stacked vertically).
 * Returns a PNG Buffer.
 *
 * @param {Array<{decoded, skills}>} builds
 */
export async function renderTeamBuildImageClassic(builds) {
  const barBuffers = await Promise.all(builds.map(b => renderBuildBarClassic(b.decoded, b.skills, b.savedName ?? null)));
  const barImages  = await Promise.all(barBuffers.map(buf => loadImage(buf)));

  const gap    = 6;
  const padOut = 10;
  const totalH = padOut + barImages.reduce((s, img) => s + img.height + gap, 0) - gap + padOut;
  const totalW = Math.max(...barImages.map(img => img.width)) + padOut * 2;

  const canvas = createCanvas(totalW, totalH);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, totalW, totalH);

  let y = padOut;
  for (const img of barImages) {
    ctx.drawImage(img, padOut, y);
    y += img.height + gap;
  }

  return canvas.toBuffer('image/png');
}

// -- Style dispatcher ----------------------------------------------------------
// Set BUILD_STYLE=classic to use the original renderer, otherwise the wiki-style
// renderer is used (default).
import { renderBuildBarWiki, renderTeamBuildImageWiki } from './skillRendererWiki.js';

const STYLE = (process.env.BUILD_STYLE || 'wiki').toLowerCase();

export const renderBuildBar = STYLE === 'classic'
  ? renderBuildBarClassic
  : renderBuildBarWiki;

export const renderTeamBuildImage = STYLE === 'classic'
  ? renderTeamBuildImageClassic
  : renderTeamBuildImageWiki;
