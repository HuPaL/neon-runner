import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics } from '../src/game/systems/Analytics.js';

const fakeBackend = (initial = {}) => {
  const m = new Map(Object.entries(initial));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test('empty analytics gives zeros and never divides by zero', () => {
  const s = createAnalytics(fakeBackend(), 'k').getStats();
  assert.deepEqual(s, { games: 0, collisions: 0, totalDistance: 0, avgScore: 0, avgDistance: 0, avgCrystals: 0, collisionRate: 0, collisionsPer1000: 0 });
});

test('averages and collision metrics are derived from recorded runs', () => {
  const a = createAnalytics(fakeBackend(), 'k');
  a.recordRun({ score: 100, distance: 80, crystals: 2, collided: true });
  a.recordRun({ score: 300, distance: 220, crystals: 8, collided: true });
  a.recordRun({ score: 200, distance: 100, crystals: 0, collided: false }); // abandoned run
  const s = a.getStats();
  assert.equal(s.games, 3);
  assert.equal(s.collisions, 2);
  assert.equal(s.avgScore, 200);
  assert.equal(s.avgDistance, Math.round(400 / 3));
  assert.equal(s.avgCrystals, 3.3);
  assert.equal(s.collisionRate, 2 / 3);
  assert.equal(s.collisionsPer1000, (2 / 400) * 1000);
});

test('data persists and a fresh instance reads it back', () => {
  const b = fakeBackend();
  assert.equal(createAnalytics(b, 'k').recordRun({ score: 50, distance: 40, collided: true }), true);
  const s = createAnalytics(b, 'k').getStats();
  assert.equal(s.games, 1);
  assert.equal(s.collisions, 1);
});

test('invalid run values are ignored instead of corrupting totals', () => {
  const a = createAnalytics(fakeBackend(), 'k');
  a.recordRun({ score: NaN, distance: -5, crystals: Infinity, collided: true });
  const s = a.getStats();
  assert.equal(s.games, 1);
  assert.equal(s.avgScore, 0);
  assert.equal(s.totalDistance, 0);
});

test('corrupt or tampered stored data is sanitised', () => {
  assert.equal(createAnalytics(fakeBackend({ k: '{not json' }), 'k').getStats().games, 0);
  const b = fakeBackend({ k: JSON.stringify({ games: 2, collisions: 9, totalScore: 'x', totalDistance: -1 }) });
  const s = createAnalytics(b, 'k').getStats();
  assert.equal(s.games, 2);
  assert.equal(s.collisions, 2); // clamped to games
  assert.equal(s.avgScore, 0);
});

test('a throwing backend never crashes and keeps counting in memory', () => {
  const bad = { getItem: () => { throw new Error('off'); }, setItem: () => { throw new Error('quota'); }, removeItem() {} };
  const a = createAnalytics(bad, 'k');
  assert.equal(a.recordRun({ score: 10, distance: 10, collided: true }), false);
  assert.equal(a.getStats().games, 1);
});

test('reset clears everything', () => {
  const a = createAnalytics(fakeBackend(), 'k');
  a.recordRun({ score: 10, distance: 10, collided: true });
  a.reset();
  assert.equal(a.getStats().games, 0);
});
