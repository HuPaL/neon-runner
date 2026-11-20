import { OBSTACLES, PATTERNS, PHYSICS, PLAYER, DIFFICULTY } from '../constants.js';

/** Total horizontal extent (px) of a pattern, from first left edge to last right edge. */
export function patternSpan(pattern) {
  let max = 0;
  for (const p of pattern.parts) max = Math.max(max, p.dx + OBSTACLES[p.type].w);
  return max;
}

export function patternMaxHeight(pattern) {
  let max = 0;
  for (const p of pattern.parts) max = Math.max(max, OBSTACLES[p.type].h);
  return max;
}

/**
 * Brute-force jump simulation used to PROVE patterns are avoidable (tests) and
 * to measure how forgiving the timing window is.
 *
 * Model: player stands still at x=0, obstacles slide left at `speed`. The player
 * may jump once at t1 and optionally a second time at t2 > t1 (the double jump).
 * Collision uses the real hit boxes plus a safety margin.
 *
 * Returns { single, double, singleWindow }:
 *  - single:  true if some single-jump timing clears the pattern
 *  - double:  true if some two-jump timing clears it
 *  - singleWindow: width in seconds of the valid t1 range for a single jump
 */
export function simulateClearance(pattern, speed, { margin = 5, dt = 1 / 240 } = {}) {
  const g = PHYSICS.GRAVITY;
  const halfW = PLAYER.BODY_W / 2 + margin;
  const lead = 260; // distance from player centre to the first obstacle's left edge at t=0
  const boxes = pattern.parts.map((p) => {
    const def = OBSTACLES[p.type];
    return { x: lead + p.dx + def.hit.ox, w: def.hit.w, h: def.hit.h + margin };
  });
  const span = patternSpan(pattern);
  const tEnd = (lead + span + halfW) / speed + 0.05;

  const run = (t1, t2) => {
    let y = 0;
    let vy = 0;
    let airborne = false;
    let jumps = 0;
    for (let t = 0; t <= tEnd; t += dt) {
      if (!airborne && t >= t1) {
        vy = PHYSICS.JUMP_VELOCITY;
        airborne = true;
        jumps = 1;
      } else if (airborne && jumps === 1 && t2 !== null && t >= t2) {
        vy = PHYSICS.DOUBLE_JUMP_VELOCITY;
        jumps = 2;
      }
      if (airborne) {
        vy += g * dt;
        y -= vy * dt; // y positive == up
        if (y <= 0) {
          if (t2 !== null && jumps < 2) return false; // landed before the planned 2nd jump
          y = 0;
          vy = 0;
          airborne = false;
          t1 = Infinity;
        }
      }
      for (const b of boxes) {
        const left = b.x - speed * t;
        const right = left + b.w;
        if (right > -halfW && left < halfW && y < b.h) return false;
      }
    }
    return true;
  };

  let singleCount = 0;
  let single = false;
  let double = false;
  const step = 0.01;
  for (let t1 = 0; t1 <= tEnd; t1 += step) {
    if (run(t1, null)) {
      single = true;
      singleCount++;
    }
  }
  if (!single) {
    outer: for (let t1 = 0; t1 <= tEnd; t1 += 0.02) {
      for (let t2 = t1 + 0.05; t2 <= t1 + 1.1; t2 += 0.02) {
        if (run(t1, t2)) {
          double = true;
          break outer;
        }
      }
    }
  } else {
    double = true;
  }
  return { single, double, singleWindow: singleCount * step };
}

/** Speed at which a level's patterns must remain clearable (end of that level's ramp). */
export function worstCaseSpeedForLevel(levelIndex) {
  const levels = DIFFICULTY.LEVELS;
  const next = levels[levelIndex + 1];
  return next ? next.speed : DIFFICULTY.MAX_SPEED;
}

export function getPattern(id) {
  return PATTERNS[id];
}
