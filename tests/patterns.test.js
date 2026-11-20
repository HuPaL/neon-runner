import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, PATTERNS, OBSTACLES, PHYSICS } from '../src/game/constants.js';
import { patternSpan, simulateClearance, worstCaseSpeedForLevel } from '../src/game/systems/Patterns.js';

test('every pattern id referenced by a level exists', () => {
  for (const l of DIFFICULTY.LEVELS) for (const id of l.patterns) assert.ok(PATTERNS[id], id);
});

test('tallest obstacle is well below the single-jump apex', () => {
  const apex = (PHYSICS.JUMP_VELOCITY ** 2) / (2 * PHYSICS.GRAVITY);
  for (const o of Object.values(OBSTACLES)) assert.ok(o.h <= apex - 15, `${o.h} vs apex ${apex}`);
});

DIFFICULTY.LEVELS.forEach((level, idx) => {
  for (const id of level.patterns) {
    test(`level ${level.level}: pattern "${id}" is avoidable at worst-case speed`, () => {
      const speed = worstCaseSpeedForLevel(idx);
      const r = simulateClearance(PATTERNS[id], speed);
      assert.ok(r.double, `${id} cannot be cleared with two jumps at ${speed}px/s`);
      // Levels 1-3 must be clearable with a single jump and a forgiving window.
      if (id !== 'gauntlet') {
        assert.ok(r.single, `${id} needs a double jump but is not flagged as one`);
        assert.ok(r.singleWindow >= 0.1, `${id} timing window too tight: ${r.singleWindow}s (span ${patternSpan(PATTERNS[id])})`);
      }
    });
  }
});
