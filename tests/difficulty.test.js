import test from 'node:test';
import assert from 'node:assert/strict';
import { DifficultyManager } from '../src/game/systems/DifficultyManager.js';
import { DIFFICULTY } from '../src/game/constants.js';

const dm = () => new DifficultyManager();

test('level thresholds follow the spec: 0 / 500 / 1500 / 3000', () => {
  const d = dm();
  assert.equal(d.getLevel(0), 1);
  assert.equal(d.getLevel(499.9), 1);
  assert.equal(d.getLevel(500), 2);
  assert.equal(d.getLevel(1499), 2);
  assert.equal(d.getLevel(1500), 3);
  assert.equal(d.getLevel(2999), 3);
  assert.equal(d.getLevel(3000), 4);
  assert.equal(d.getLevel(1e6), 4);
});

test('speed never decreases with distance and never exceeds MAX_SPEED', () => {
  const d = dm();
  let prev = 0;
  for (let x = 0; x <= 20000; x += 10) {
    const s = d.getSpeed(x);
    assert.ok(s >= prev - 1e-9, `speed dropped at ${x}`);
    assert.ok(s <= DIFFICULTY.MAX_SPEED + 1e-9);
    prev = s;
  }
  assert.equal(d.getSpeed(1e6), DIFFICULTY.MAX_SPEED);
});

test('difficulty ramps smoothly: no speed jump larger than 2px/s per distance unit', () => {
  const d = dm();
  for (let x = 0; x < 8000; x++) assert.ok(d.getSpeed(x + 1) - d.getSpeed(x) < 2, `abrupt change at ${x}`);
});

test('spawn interval never goes below the configured minimum and never grows', () => {
  const d = dm();
  let prev = Infinity;
  for (let x = 0; x <= 20000; x += 25) {
    const [min, max] = d.getInterval(x);
    assert.ok(min >= DIFFICULTY.MIN_INTERVAL - 1e-9);
    assert.ok(max >= min);
    assert.ok(min <= prev + 1e-9);
    prev = min;
  }
});

test('update() reports a level-up exactly once per level', () => {
  const d = dm();
  const ups = [];
  for (let x = 0; x <= 4000; x += 1) if (d.update(x)) ups.push([x, d.level]);
  assert.deepEqual(ups, [[500, 2], [1500, 3], [3000, 4]]);
});

test('reset returns to level 1', () => {
  const d = dm();
  d.update(3500);
  d.reset();
  assert.equal(d.level, 1);
});

test('every level has patterns and later levels introduce new ones', () => {
  const d = dm();
  assert.ok(d.getPatternIds(0).length >= 3);
  assert.ok(d.getPatternIds(3500).includes('gauntlet'));
  assert.ok(!d.getPatternIds(0).includes('gauntlet'));
});
