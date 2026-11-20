import { ANALYTICS_KEY } from '../constants.js';
import { resolveBackend } from '../utils/Storage.js';

/**
 * Local-only gameplay analytics (nothing leaves the device).
 *
 * A run normally ends with a collision, so "collisions / games" alone would be
 * ~100%. Runs the player abandons (quit from pause, restart, tab closed) are
 * counted as games *without* a collision, which makes the rate meaningful.
 *
 * Pure module (no Phaser import) so it is unit-tested in plain Node.
 */

const DEFAULTS = Object.freeze({ version: 1, games: 0, collisions: 0, totalScore: 0, totalDistance: 0, totalCrystals: 0 });
const COUNT_FIELDS = ['games', 'collisions', 'totalScore', 'totalDistance', 'totalCrystals'];

function sanitize(raw) {
  const data = { ...DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const f of COUNT_FIELDS) {
      const n = Number(raw[f]);
      if (Number.isFinite(n) && n >= 0) data[f] = Math.floor(n);
    }
  }
  data.collisions = Math.min(data.collisions, data.games); // a collision always belongs to a game
  return data;
}

export function createAnalytics(backend = resolveBackend(), key = ANALYTICS_KEY) {
  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const text = backend.getItem(key);
      cache = sanitize(text ? JSON.parse(text) : null);
    } catch {
      cache = sanitize(null);
    }
    return cache;
  }

  function persist() {
    try {
      backend.setItem(key, JSON.stringify(cache));
      return true;
    } catch {
      return false; // quota / disabled storage: keep counting in memory
    }
  }

  return {
    /**
     * Records one finished run.
     * @param {{score:number, distance:number, crystals:number, collided:boolean}} run
     */
    recordRun({ score = 0, distance = 0, crystals = 0, collided = false } = {}) {
      load();
      const clean = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
      cache = sanitize({
        ...cache,
        games: cache.games + 1,
        collisions: cache.collisions + (collided ? 1 : 0),
        totalScore: cache.totalScore + clean(score),
        totalDistance: cache.totalDistance + clean(distance),
        totalCrystals: cache.totalCrystals + clean(crystals),
      });
      return persist();
    },

    /** Raw totals plus derived metrics (all 0 when there are no games yet). */
    getStats() {
      const d = load();
      const games = d.games;
      return {
        games,
        collisions: d.collisions,
        totalDistance: d.totalDistance,
        avgScore: games ? Math.round(d.totalScore / games) : 0,
        avgDistance: games ? Math.round(d.totalDistance / games) : 0,
        avgCrystals: games ? Math.round((d.totalCrystals / games) * 10) / 10 : 0,
        collisionRate: games ? d.collisions / games : 0, // 0..1, share of games that ended in a crash
        collisionsPer1000: d.totalDistance ? (d.collisions / d.totalDistance) * 1000 : 0,
      };
    },

    reset() {
      cache = { ...DEFAULTS };
      return persist();
    },
  };
}
