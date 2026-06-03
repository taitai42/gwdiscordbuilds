/**
 * Persistent store for saved builds and team builds, backed by MySQL.
 *
 * Scoping rules:
 *   • Every record belongs to a single Discord guild (`guildId`).
 *   • `userId === null`   → "shared" build, visible to anyone in that guild.
 *   • `userId !== null`   → "private" build, visible only to that user in that guild.
 *
 * Name lookups are case-insensitive (we store a lower-cased `name_key`).
 * On load, a user's private build with the same name takes precedence over a
 * shared build of the same name in the same guild.
 */

import { getPool } from './db.js';

const nameKey = (name) => name.trim().toLowerCase();

// ── Single builds ─────────────────────────────────────────────────────────────

/**
 * Insert or update a saved build.
 * @param {object}      args
 * @param {string}      args.guildId
 * @param {string}      args.userId          Discord ID of the user performing the save
 * @param {string}      args.name            Display name
 * @param {string}      args.code            Template code
 * @param {boolean}     [args.private=false] If true, build is private to the user inside the guild
 */
export async function saveBuild({ guildId, userId, name, code, private: isPrivate = false }) {
  const scopeUserId = isPrivate ? userId : null;
  await getPool().query(
    `INSERT INTO builds (guild_id, user_id, name, name_key, code, created_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       code       = VALUES(code),
       name       = VALUES(name),
       updated_at = CURRENT_TIMESTAMP`,
    [guildId, scopeUserId, name, nameKey(name), code, userId],
  );
}

/**
 * Load a single build by name within a guild.
 * Prefers the caller's private build over a shared build of the same name.
 * @param {object} args
 * @param {string} args.guildId
 * @param {string} args.userId
 * @param {string} args.name
 * @returns {Promise<{ name: string, code: string, scope: 'private'|'shared' } | null>}
 */
export async function loadBuild({ guildId, userId, name }) {
  const [rows] = await getPool().query(
    `SELECT name, code, user_id
       FROM builds
      WHERE guild_id = ?
        AND name_key = ?
        AND (user_id = ? OR user_id IS NULL)
      ORDER BY user_id IS NULL ASC
      LIMIT 1`,
    [guildId, nameKey(name), userId],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return { name: row.name, code: row.code, scope: row.user_id ? 'private' : 'shared' };
}

// ── Team builds ───────────────────────────────────────────────────────────────

/**
 * Insert or update a saved team build.
 * @param {object}      args
 * @param {string}      args.guildId
 * @param {string}      args.userId
 * @param {string}      args.name
 * @param {string[]}    args.codes
 * @param {boolean}     [args.private=false]
 */
export async function saveTeamBuild({ guildId, userId, name, codes, private: isPrivate = false }) {
  const scopeUserId = isPrivate ? userId : null;
  await getPool().query(
    `INSERT INTO team_builds (guild_id, user_id, name, name_key, codes, created_by)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE
       codes      = VALUES(codes),
       name       = VALUES(name),
       updated_at = CURRENT_TIMESTAMP`,
    [guildId, scopeUserId, name, nameKey(name), JSON.stringify(codes), userId],
  );
}

/**
 * Load a team build by name. Same precedence rules as `loadBuild`.
 * @param {object} args
 * @param {string} args.guildId
 * @param {string} args.userId
 * @param {string} args.name
 * @returns {Promise<{ name: string, codes: string[], scope: 'private'|'shared' } | null>}
 */
export async function loadTeamBuild({ guildId, userId, name }) {
  const [rows] = await getPool().query(
    `SELECT name, codes, user_id
       FROM team_builds
      WHERE guild_id = ?
        AND name_key = ?
        AND (user_id = ? OR user_id IS NULL)
      ORDER BY user_id IS NULL ASC
      LIMIT 1`,
    [guildId, nameKey(name), userId],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  const codes = Array.isArray(row.codes) ? row.codes : JSON.parse(row.codes);
  return { name: row.name, codes, scope: row.user_id ? 'private' : 'shared' };
}

// ── Listing & lookup helpers ──────────────────────────────────────────────────

/**
 * List all builds visible to a user inside a guild
 * (the guild's shared builds + the user's own private builds).
 * @param {object} args
 * @param {string} args.guildId
 * @param {string} args.userId
 * @returns {Promise<Array<{ name: string, code: string, scope: 'private'|'shared' }>>}
 */
export async function listBuilds({ guildId, userId }) {
  const [rows] = await getPool().query(
    `SELECT name, code, user_id
       FROM builds
      WHERE guild_id = ?
        AND (user_id = ? OR user_id IS NULL)
      ORDER BY name ASC`,
    [guildId, userId],
  );
  return rows.map(r => ({
    name:  r.name,
    code:  r.code,
    scope: r.user_id ? 'private' : 'shared',
  }));
}

/**
 * Find a saved build by its template code (within a guild, visible to the user).
 * Used to surface "this code matches a saved build" hints in team-build embeds.
 * @param {object} args
 * @param {string} args.guildId
 * @param {string} args.userId
 * @param {string} args.code
 * @returns {Promise<{ name: string, code: string } | null>}
 */
export async function findBuildByCode({ guildId, userId, code }) {
  const [rows] = await getPool().query(
    `SELECT name, code
       FROM builds
      WHERE guild_id = ?
        AND code     = ?
        AND (user_id = ? OR user_id IS NULL)
      ORDER BY user_id IS NULL ASC
      LIMIT 1`,
    [guildId, code, userId],
  );
  return rows[0] ?? null;
}
