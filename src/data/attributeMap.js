/**
 * GW1 Attribute name lookups for build template rendering.
 *
 * In build templates, attribute IDs are a flat global index into the ATTRIBUTES
 * list below (same order used by the GW1 template format spec).
 *
 * Call getAttributeName(attrId) to resolve a name.
 */

// Flat global attribute list — exact index from the wiki spec
// https://wiki.guildwars.com/wiki/Skill_template_format#Attribute_index
export const ATTRIBUTES = [
  'Fast Casting',        //  0 - Mesmer
  'Illusion Magic',      //  1 - Mesmer
  'Domination Magic',    //  2 - Mesmer
  'Inspiration Magic',   //  3 - Mesmer
  'Blood Magic',         //  4 - Necromancer
  'Death Magic',         //  5 - Necromancer
  'Soul Reaping',        //  6 - Necromancer
  'Curses',              //  7 - Necromancer
  'Air Magic',           //  8 - Elementalist
  'Earth Magic',         //  9 - Elementalist
  'Fire Magic',          // 10 - Elementalist
  'Water Magic',         // 11 - Elementalist
  'Energy Storage',      // 12 - Elementalist
  'Healing Prayers',     // 13 - Monk
  'Smiting Prayers',     // 14 - Monk
  'Protection Prayers',  // 15 - Monk
  'Divine Favor',        // 16 - Monk
  'Strength',            // 17 - Warrior
  'Axe Mastery',         // 18 - Warrior
  'Hammer Mastery',      // 19 - Warrior
  'Swordsmanship',       // 20 - Warrior
  'Tactics',             // 21 - Warrior
  'Beast Mastery',       // 22 - Ranger
  'Expertise',           // 23 - Ranger
  'Wilderness Survival', // 24 - Ranger
  'Marksmanship',        // 25 - Ranger
  undefined,             // 26 - (unused)
  undefined,             // 27 - (unused)
  undefined,             // 28 - (unused)
  'Dagger Mastery',      // 29 - Assassin
  'Deadly Arts',         // 30 - Assassin
  'Shadow Arts',         // 31 - Assassin
  'Communing',           // 32 - Ritualist
  'Restoration Magic',   // 33 - Ritualist
  'Channeling Magic',    // 34 - Ritualist
  'Critical Strikes',    // 35 - Assassin
  'Spawning Power',      // 36 - Ritualist
  'Spear Mastery',       // 37 - Paragon
  'Command',             // 38 - Paragon
  'Motivation',          // 39 - Paragon
  'Leadership',          // 40 - Paragon
  'Scythe Mastery',      // 41 - Dervish
  'Wind Prayers',        // 42 - Dervish
  'Earth Prayers',       // 43 - Dervish
  'Mysticism',           // 44 - Dervish
];

/**
 * Resolve a flat template attribute ID to a human-readable name.
 *
 * @param {number} attrId  Global attribute index from the template
 * @returns {string}
 */
export function getAttributeName(attrId) {
  return ATTRIBUTES[attrId] ?? `Attribute ${attrId}`;
}
