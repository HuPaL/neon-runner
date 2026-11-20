import Phaser from 'phaser';
import { DIFFICULTY, PATTERNS, POOLS } from '../constants.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Collectible } from '../entities/Collectible.js';
import { patternMaxHeight, patternSpan } from './Patterns.js';

const SPAWN_MARGIN = 60; // px beyond the right edge where things appear
const RECYCLE_MARGIN = 140; // px beyond the left edge where things are recycled

/**
 * Owns both object pools and decides what appears when.
 *
 * Fairness rules:
 *  - patterns come from DifficultyManager's per-level list (all verified avoidable)
 *  - the gap between patterns is expressed in seconds of travel at the current speed,
 *    with a hard floor (DIFFICULTY.MIN_INTERVAL)
 *  - the same pattern never repeats more than twice in a row
 *  - crystals never block anything (they are not hazards) and ride the jump arc
 */
export class SpawnManager {
  constructor(scene, difficulty, groundY) {
    this.scene = scene;
    this.difficulty = difficulty;
    this.groundY = groundY;
    this.width = scene.scale.width;

    this.obstacles = scene.physics.add.group({
      classType: Obstacle,
      maxSize: POOLS.OBSTACLES,
      runChildUpdate: false,
      allowGravity: false,
      immovable: true,
    });
    this.crystals = scene.physics.add.group({
      classType: Collectible,
      maxSize: POOLS.CRYSTALS,
      runChildUpdate: false,
      allowGravity: false,
    });

    this.reset(0, DIFFICULTY.LEVELS[0].speed);
  }

  reset(distance, speed) {
    for (const o of this.obstacles.getChildren()) if (o.active) o.recycle();
    for (const c of this.crystals.getChildren()) if (c.active) c.recycle();
    this.traveled = 0;
    this.lastSpan = 0;
    this.gapSeconds = DIFFICULTY.INITIAL_DELAY;
    this.lastPattern = null;
    this.repeatCount = 0;
    this.speed = speed;
    this.distance = distance;
  }

  /**
   * @param {number} dt seconds
   * @param {number} time scene time in ms
   * @param {number} speed world speed px/s
   * @param {number} distance distance units travelled
   */
  update(dt, time, speed, distance) {
    this.speed = speed;
    this.distance = distance;
    this.traveled += speed * dt;

    if (this.traveled - this.lastSpan >= this.gapSeconds * speed) this.#spawnPattern();

    for (const o of this.obstacles.getChildren()) {
      if (!o.active) continue;
      o.body.velocity.x = -speed;
      if (o.x + o.width < -RECYCLE_MARGIN) o.recycle();
    }
    for (const c of this.crystals.getChildren()) {
      if (!c.active) continue;
      c.animate(time, speed);
      if (c.x < -RECYCLE_MARGIN) c.recycle();
    }
  }

  #pickPattern() {
    const ids = this.difficulty.getPatternIds(this.distance);
    let id = ids[Math.floor(Math.random() * ids.length)];
    if (id === this.lastPattern && this.repeatCount >= 2 && ids.length > 1) {
      const others = ids.filter((i) => i !== id);
      id = others[Math.floor(Math.random() * others.length)];
    }
    this.repeatCount = id === this.lastPattern ? this.repeatCount + 1 : 1;
    this.lastPattern = id;
    return id;
  }

  #spawnPattern() {
    const id = this.#pickPattern();
    const pattern = PATTERNS[id];
    const spawnX = this.width + SPAWN_MARGIN;
    const span = patternSpan(pattern);

    for (const part of pattern.parts) {
      const o = this.obstacles.get(0, 0);
      if (!o) break; // pool exhausted: skip rather than allocate
      o.spawn(part.type, spawnX + part.dx, this.groundY, this.speed);
    }

    // Next gap is fixed now (in seconds) so it stays fair if speed keeps rising.
    const [min, max] = this.difficulty.getInterval(this.distance);
    this.gapSeconds = Phaser.Math.FloatBetween(min, max);
    this.traveled = 0;
    this.lastSpan = span;

    this.#spawnCrystals(pattern, spawnX, span);
  }

  #spawnCrystals(pattern, spawnX, span) {
    const roll = Math.random();
    if (roll < 0.55) {
      // Arc over the obstacle(s): rewards a well-timed jump, never forces one.
      const n = 5;
      const arcW = span + 150;
      const cx = spawnX + span / 2;
      const peak = Math.min(125, patternMaxHeight(pattern) + 40);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = cx + (u - 0.5) * arcW;
        const y = this.groundY - 45 - peak * 4 * u * (1 - u);
        this.#placeCrystal(x, y);
      }
    } else if (roll < 0.85) {
      // Ground line in the free gap after the pattern.
      const gapPx = this.gapSeconds * this.speed;
      const startX = spawnX + span + gapPx * 0.5 - 60;
      for (let i = 0; i < 4; i++) this.#placeCrystal(startX + i * 40, this.groundY - 38);
    }
  }

  #placeCrystal(x, y) {
    const c = this.crystals.get(0, 0);
    if (c) c.spawn(x, y, this.speed);
  }

  /** Active obstacle count (debug overlay). */
  get activeCounts() {
    return {
      obstacles: this.obstacles.countActive(true),
      crystals: this.crystals.countActive(true),
    };
  }
}
