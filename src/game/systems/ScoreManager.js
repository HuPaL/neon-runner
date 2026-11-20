import { SCORING } from '../constants.js';

/**
 * Tracks the current run's score and the persisted best score.
 * Storage is only written in commit() (run end / page hide) or when a record
 * is beaten, never every frame.
 */
export class ScoreManager {
  /** @param {{get:Function,set:Function}} storage */
  constructor(storage) {
    this.storage = storage;
    this.reset();
  }

  reset() {
    this.distance = 0; // distance units (float)
    this.crystals = 0;
    this.previousBest = this.storage.get('bestScore');
    this.best = this.previousBest;
    this.dirty = false;
  }

  get score() {
    return Math.floor(this.distance) + this.crystals * SCORING.CRYSTAL_POINTS;
  }

  get isNewRecord() {
    return this.score > this.previousBest && this.score > 0;
  }

  /** @param {number} pixels world pixels travelled this frame */
  addPixels(pixels) {
    this.distance += pixels / SCORING.PX_PER_UNIT;
    this.#syncBest();
  }

  addCrystal() {
    this.crystals += 1;
    this.#syncBest();
  }

  /** Persists the best score if it changed. Returns true if something was written. */
  commit() {
    if (!this.dirty) return false;
    this.dirty = false;
    return this.storage.set('bestScore', this.best);
  }

  #syncBest() {
    const s = this.score;
    if (s > this.best) {
      this.best = s;
      this.dirty = true;
    }
  }
}
