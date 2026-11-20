import { STORAGE_KEY } from '../constants.js';

const DEFAULTS = Object.freeze({ version: 1, bestScore: 0, muted: false });

/** In-memory backend used when localStorage is unavailable (private mode, blocked cookies). */
function createMemoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

/** Returns window.localStorage if it really works, otherwise an in-memory fallback. */
export function resolveBackend() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return createMemoryBackend();
    const probe = '__neonrunner_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return createMemoryBackend();
  }
}

function sanitize(raw) {
  const data = { ...DEFAULTS };
  if (raw && typeof raw === 'object') {
    const best = Number(raw.bestScore);
    if (Number.isFinite(best) && best >= 0) data.bestScore = Math.floor(best);
    if (typeof raw.muted === 'boolean') data.muted = raw.muted;
  }
  return data;
}

/**
 * Small, defensive persistence layer. All data lives in one JSON document;
 * corrupt data or a throwing backend never crashes the game.
 */
export function createStorage(backend = resolveBackend(), key = STORAGE_KEY) {
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
      return false; // quota exceeded / storage disabled: keep running from memory
    }
  }

  return {
    get(name) {
      return load()[name];
    },
    set(name, value) {
      load();
      cache = sanitize({ ...cache, [name]: value });
      return persist();
    },
    reset() {
      cache = { ...DEFAULTS };
      return persist();
    },
  };
}
