/**
 * Guild Wars 1 Build Template Decoder
 *
 * Template format reference: https://wiki.guildwars.com/wiki/Template_format
 *
 * Standard base64 alphabet. Each character encodes 6 bits.
 * Bits within the stream are read LSB-first from each character.
 *
 * Build template structure (type = 14):
 *   [4 bits]  template type (must be 14)
 *   [4 bits]  version (must be 0)
 *   [2 bits]  profession bits extra  → profBits = value*2 + 4
 *   [profBits] primary profession index
 *   [profBits] secondary profession index
 *   [4 bits]  number of attributes
 *   [4 bits]  attribute bits extra   → attrBits = value + 4
 *   For each attribute:
 *     [attrBits] attribute ID  (flat global index)
 *     [4 bits]   attribute level (0–12)
 *   [4 bits]  skill bits extra       → skillBits = value + 8
 *   [skillBits] × 8  skill template IDs
 */

// Standard base64 alphabet (as used by GW1 template codes)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHAR_TO_VAL = {};
for (let i = 0; i < ALPHABET.length; i++) CHAR_TO_VAL[ALPHABET[i]] = i;

export const PROFESSIONS = [
  'None', 'Warrior', 'Ranger', 'Monk', 'Necromancer',
  'Mesmer', 'Elementalist', 'Assassin', 'Ritualist', 'Paragon', 'Dervish',
];

export const PROFESSION_SHORT = [
  'X', 'W', 'R', 'Mo', 'N', 'Me', 'El', 'A', 'Rt', 'P', 'D',
];

// Profession accent colours (hex) for rendering
export const PROFESSION_COLORS = {
  None:          '#888888',
  Warrior:       '#C0A060',
  Ranger:        '#4A7A3A',
  Monk:          '#DDDDAA',
  Necromancer:   '#338833',
  Mesmer:        '#AA44AA',
  Elementalist:  '#6688CC',
  Assassin:      '#552255',
  Ritualist:     '#6699AA',
  Paragon:       '#DDBB44',
  Dervish:       '#AA7744',
};

/** Convert a template code string into a flat array of bits (LSB-first per character). */
function toBitArray(code) {
  const bits = [];
  for (const ch of code) {
    const val = CHAR_TO_VAL[ch];
    if (val === undefined) continue; // skip whitespace / padding / '='
    // 6-bit value, LSB first (matches Python: "{0:06b}".format(d)[::-1])
    for (let b = 0; b < 6; b++) bits.push((val >> b) & 1);
  }
  return bits;
}

/** Read `n` bits from `bits` starting at index `offset` and return [value, newOffset]. */
function readBits(bits, offset, n) {
  let val = 0;
  for (let i = 0; i < n; i++) {
    if (offset + i >= bits.length) break;
    val |= bits[offset + i] << i;
  }
  return [val, offset + n];
}

/**
 * Decode a build template code.
 * @param {string} code  The raw template code string.
 * @returns {{ primary, secondary, attributes, skills, raw }}
 */
export function decodeTemplate(code) {
  // Strip leading/trailing whitespace and any trailing '='
  const clean = code.trim().replace(/=+$/, '');
  // Directly map each character to its 6-bit value — no atob/binary decode
  const bits = toBitArray(clean);

  let offset = 0;
  let val;

  // Template type (4 bits) — must be 14 for a build template
  [val, offset] = readBits(bits, offset, 4);
  if (val !== 14) throw new Error(`Not a build template (type ${val})`);

  // Version (4 bits) — must be 0
  [val, offset] = readBits(bits, offset, 4);
  if (val !== 0) throw new Error(`Unsupported template version ${val}`);

  // Profession field width: read 2 bits, profBits = value*2 + 4
  let profBitsExtra;
  [profBitsExtra, offset] = readBits(bits, offset, 2);
  const profBits = profBitsExtra * 2 + 4;

  // Professions
  let primaryIdx, secondaryIdx;
  [primaryIdx,   offset] = readBits(bits, offset, profBits);
  [secondaryIdx, offset] = readBits(bits, offset, profBits);

  const primary   = PROFESSIONS[primaryIdx]   ?? 'Unknown';
  const secondary = PROFESSIONS[secondaryIdx] ?? 'Unknown';

  // Attribute count + attribute field width
  let attrCount, attrBitsExtra;
  [attrCount,     offset] = readBits(bits, offset, 4);
  [attrBitsExtra, offset] = readBits(bits, offset, 4);
  const attrBits = attrBitsExtra + 4;

  const attributes = [];
  for (let i = 0; i < attrCount; i++) {
    let attrId, attrLevel;
    [attrId,    offset] = readBits(bits, offset, attrBits);
    [attrLevel, offset] = readBits(bits, offset, 4);
    attributes.push({ id: attrId, level: attrLevel });
  }

  // Skill field width: read 4 bits, skillBits = value + 8
  let skillBitsExtra;
  [skillBitsExtra, offset] = readBits(bits, offset, 4);
  const skillBits = skillBitsExtra + 8;

  // Skills — 8 slots
  const skills = [];
  for (let i = 0; i < 8; i++) {
    let skillId;
    [skillId, offset] = readBits(bits, offset, skillBits);
    skills.push(skillId);  // 0 means empty slot
  }

  return {
    primary,
    secondary,
    primaryIdx,
    secondaryIdx,
    attributes,
    skills,
    raw: clean,
  };
}
