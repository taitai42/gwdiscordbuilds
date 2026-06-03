/**
 * Tiny in-memory key/value store with per-entry TTL.
 *
 * Used to back the interactive `/teambuilder` flow and the team-build
 * "replace slot" flow without leaking memory when users abandon a session.
 *
 * Limitation: single-process only. If you ever shard or run multiple
 * replicas of the bot, swap this for Redis (or similar).
 */

const DEFAULT_TTL_MS  = 30 * 60 * 1000; // 30 minutes
const SWEEP_INTERVAL  =  5 * 60 * 1000; //  5 minutes

export class SessionStore {
  /**
   * @param {object} [opts]
   * @param {number} [opts.ttlMs]   How long a session lives after last access.
   * @param {number} [opts.sweepMs] How often expired entries are evicted.
   */
  constructor({ ttlMs = DEFAULT_TTL_MS, sweepMs = SWEEP_INTERVAL } = {}) {
    this.ttlMs = ttlMs;
    this._map  = new Map();

    // unref so the timer never keeps the process alive on its own
    this._timer = setInterval(() => this.sweep(), sweepMs);
    if (typeof this._timer.unref === 'function') this._timer.unref();
  }

  /** Get a session, refreshing its TTL. Returns `undefined` if expired/missing. */
  get(key) {
    const entry = this._map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this._map.delete(key);
      return undefined;
    }
    entry.expiresAt = Date.now() + this.ttlMs;
    return entry.value;
  }

  /** Store a session (overwrites). */
  set(key, value) {
    this._map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Delete a session. */
  delete(key) {
    this._map.delete(key);
  }

  /** Evict all expired entries. Called automatically by the sweep timer. */
  sweep() {
    const now = Date.now();
    for (const [key, entry] of this._map) {
      if (entry.expiresAt <= now) this._map.delete(key);
    }
  }

  /** Stop the sweep timer. Useful for tests / graceful shutdown. */
  stop() {
    clearInterval(this._timer);
  }
}
