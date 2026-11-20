import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/game/utils/Storage.js';

const fakeBackend = (initial = {}) => {
  const m = new Map(Object.entries(initial));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test('returns defaults for empty storage', () => {
  const s = createStorage(fakeBackend(), 'k');
  assert.equal(s.get('bestScore'), 0);
  assert.equal(s.get('muted'), false);
});

test('persists values and a fresh instance reads them back', () => {
  const b = fakeBackend();
  const a = createStorage(b, 'k');
  assert.equal(a.set('bestScore', 1234), true);
  a.set('muted', true);
  const again = createStorage(b, 'k');
  assert.equal(again.get('bestScore'), 1234);
  assert.equal(again.get('muted'), true);
});

test('corrupt JSON falls back to defaults instead of throwing', () => {
  const s = createStorage(fakeBackend({ k: '{not json' }), 'k');
  assert.equal(s.get('bestScore'), 0);
});

test('invalid field types are sanitised', () => {
  const s = createStorage(fakeBackend({ k: JSON.stringify({ bestScore: 'abc', muted: 'yes' }) }), 'k');
  assert.equal(s.get('bestScore'), 0);
  assert.equal(s.get('muted'), false);
  const neg = createStorage(fakeBackend({ k: JSON.stringify({ bestScore: -5 }) }), 'k');
  assert.equal(neg.get('bestScore'), 0);
});

test('a throwing backend (quota / disabled storage) never crashes and keeps working in memory', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
  const s = createStorage(bad, 'k');
  assert.equal(s.get('bestScore'), 0);
  assert.equal(s.set('bestScore', 50), false);
  assert.equal(s.get('bestScore'), 50);
});
