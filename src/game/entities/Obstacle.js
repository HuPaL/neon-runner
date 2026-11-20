import Phaser from 'phaser';
import { GLOW_PAD, OBSTACLES } from '../constants.js';

/**
 * Pooled obstacle. Created once by the pool group and re-used via spawn()/recycle().
 * Texture glow padding is compensated in the body offset so the hit box is exact.
 */
export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = 0, y = 0) {
    super(scene, x, y, 'obs_barrier');
    this.obstacleType = 'barrier';
  }

  /** @param {number} x left edge of the visual @param {number} groundY y of the ground surface */
  spawn(type, x, groundY, speed) {
    const def = OBSTACLES[type];
    this.obstacleType = type;
    this.setTexture(`obs_${type}`);
    this.setOrigin(0, 1);
    this.enableBody(true, x - GLOW_PAD, groundY + GLOW_PAD, true, true);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(def.hit.w, def.hit.h, false);
    this.body.setOffset(GLOW_PAD + def.hit.ox, GLOW_PAD + (def.h - def.hit.h));
    this.setAlpha(1);
    this.setVelocityX(-speed);
    return this;
  }

  recycle() {
    this.disableBody(true, true);
  }
}
