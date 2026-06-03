/**
 * MySQL connection pool and schema bootstrap.
 *
 * The pool is created lazily on first use so unit-tests / scripts that don't
 * touch the DB can still import other modules without a live MySQL server.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../../schema.sql');

let pool = null;

/**
 * Get (or create) the shared MySQL connection pool.
 * @returns {import('mysql2/promise').Pool}
 */
export function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host:               process.env.MYSQL_HOST     || 'db',
    port:     Number(  process.env.MYSQL_PORT)     || 3306,
    user:               process.env.MYSQL_USER     || 'gwbot',
    password:           process.env.MYSQL_PASSWORD || '',
    database:           process.env.MYSQL_DATABASE || 'gwbot',
    waitForConnections: true,
    connectionLimit:    10,
    charset:            'utf8mb4',
    multipleStatements: true, // needed for schema bootstrap
  });
  return pool;
}

/**
 * Apply schema.sql. Idempotent (uses CREATE TABLE IF NOT EXISTS).
 * Retries a few times so the bot can start alongside a slow MySQL container.
 */
export async function initSchema({ retries = 10, delayMs = 2000 } = {}) {
  const sql = readFileSync(SCHEMA_PATH, 'utf8');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await getPool().getConnection();
      try {
        await conn.query(sql);
      } finally {
        conn.release();
      }
      console.log('[db] Schema ready.');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[db] Schema init failed (attempt ${attempt}/${retries}): ${err.code || err.message}. Retrying in ${delayMs}ms…`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

/** Close the pool. Useful for tests / graceful shutdown. */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
