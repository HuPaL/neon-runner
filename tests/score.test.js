import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoreManager } from '../src/game/systems/ScoreManager.js';
import { createStorage } from '../src/game/utils/Storage.js';
import { SCORING } from '../src/game/constants.js';

const mem = (initial) => {
  const m = new Map(Object.entries(initial || {}));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test('distance converts to points', () => {
  const sm = new ScoreManager(createStorage(mem(), 'k'));
  sm.addPixels(SCORING.PX_PER_UNIT * 100);
  assert.equal(sm.score, 100);
});

test('each crystal adds exactly 10 points', () => {
  const sm = new ScoreManager(createStorage(mem(), 'k'));
  sm.addCrystal();
  sm.addCrystal();
  assert.equal(sm.score, 20);
  assert.equal(sm.crystals, 2);
});

test('fractional distance accumulates without drift across many small frames', () => {
  const sm = new ScoreManager(createStorage(mem(), 'k'));
  for (let i = 0; i < 600; i++) sm.addPixels(5); // 600 frames * 5px = 3000px = 300 units
  assert.equal(sm.score, 300);
});

test('best updates immediately and is only written on commit', () => {
  const backend = mem();
  const storage = createStorage(backend, 'k');
  const sm = new ScoreManager(storage);
  sm.addCrystal();
  assert.equal(sm.best, 10);
  assert.equal(storage.get('bestScore'), 0, 'not persisted before commit');
  assert.equal(sm.commit(), true);
  assert.equal(createStorage(backend, 'k').get('bestScore'), 10);
  assert.equal(sm.commit(), false, 'second commit has nothing to write');
});

test('new record is flagged only when beating the previous best', () => {
  const storage = createStorage(mem({ k: JSON.stringify({ bestScore: 50 }) }), 'k');
  const sm = new ScoreManager(storage);
  sm.addCrystal();
  assert.equal(sm.isNewRecord, false);
  for (let i = 0; i < 5; i++) sm.addCrystal();
  assert.equal(sm.score, 60);
  assert.equal(sm.isNewRecord, true);
  assert.equal(sm.best, 60);
});

test('reset starts a clean run but keeps the persisted best', () => {
  const storage = createStorage(mem(), 'k');
  const sm = new ScoreManager(storage);
  sm.addCrystal();
  sm.commit();
  sm.reset();
  assert.equal(sm.score, 0);
  assert.equal(sm.crystals, 0);
  assert.equal(sm.best, 10);
  assert.equal(sm.isNewRecord, false);
});

test('score of zero is never a record', () => {
  const sm = new ScoreManager(createStorage(mem(), 'k'));
  assert.equal(sm.isNewRecord, false);
});
