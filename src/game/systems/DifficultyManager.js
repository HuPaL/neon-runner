import { DIFFICULTY } from '../constants.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/**
 * Pure, data-driven difficulty curve. All outputs are functions of distance.
 */
export class DifficultyManager {
  constructor(config = DIFFICULTY) {
    this.config = config;
    this.level = 1;
    // Anchors: each level start, plus a final anchor where MAX_SPEED is reached.
    const levels = config.LEVELS;
    const last = levels[levels.length - 1];
    this.anchors = levels.map((l) => ({
      d: l.minDistance,
      speed: l.speed,
      min: l.interval[0],
      max: l.interval[1],
    }));
    this.anchors.push({
      d: last.minDistance + config.FINAL_RAMP_DISTANCE,
      speed: config.MAX_SPEED,
      min: config.MIN_INTERVAL,
      max: config.MIN_INTERVAL + 0.2,
    });
  }

  reset() {
    this.level = 1;
  }

  getLevel(distance) {
    const levels = this.config.LEVELS;
    let level = 1;
    for (const l of levels) if (distance >= l.minDistance) level = l.level;
    return level;
  }

  /** Advances the tracked level. Returns true when a new level was just reached. */
  update(distance) {
    const next = this.getLevel(distance);
    if (next > this.level) {
      this.level = next;
      return true;
    }
    return false;
  }

  #sample(distance) {
    const a = this.anchors;
    if (distance <= a[0].d) return a[0];
    for (let i = 1; i < a.length; i++) {
      if (distance <= a[i].d) {
        const t = clamp01((distance - a[i - 1].d) / (a[i].d - a[i - 1].d));
        return {
          speed: lerp(a[i - 1].speed, a[i].speed, t),
          min: lerp(a[i - 1].min, a[i].min, t),
          max: lerp(a[i - 1].max, a[i].max, t),
        };
      }
    }
    return a[a.length - 1];
  }

  /** World scroll speed in px/s, never above MAX_SPEED. */
  getSpeed(distance) {
    return Math.min(this.config.MAX_SPEED, this.#sample(distance).speed);
  }

  /** [min, max] spawn interval in seconds, never below MIN_INTERVAL. */
  getInterval(distance) {
    const s = this.#sample(distance);
    const floor = this.config.MIN_INTERVAL;
    return [Math.max(floor, s.min), Math.max(floor, s.max)];
  }

  getPatternIds(distance) {
    const levels = this.config.LEVELS;
    return levels[this.getLevel(distance) - 1].patterns;
  }
}
