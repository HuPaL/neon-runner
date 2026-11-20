import Phaser from 'phaser';
import { CRYSTAL } from '../constants.js';

/** Pooled energy crystal with a bobbing/swaying idle animation driven by the scene clock. */
export class Collectible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = 0, y = 0) {
    super(scene, x, y, 'crystal');
    this.phase = 0;
  }

  spawn(x, y, speed) {
    this.enableBody(true, x, y, true, true);
    this.body.setAllowGravity(false);
    this.body.setSize(CRYSTAL.W + 6, CRYSTAL.H + 6, true);
    this.phase = Math.random() * Math.PI * 2;
    this.setVelocity(-speed, 0);
    this.setAlpha(1);
    this.setAngle(0);
    return this;
  }

  /**
   * Called every frame by the SpawnManager for active crystals.
   * Bobbing is done through velocity (the body owns the position), pulsing and
   * swaying through alpha/angle - none of which resize the physics body.
   */
  animate(time, speed) {
    const t = time / 1000;
    this.body.velocity.x = -speed;
    this.body.velocity.y = Math.cos(t * CRYSTAL.BOB_SPEED + this.phase) * CRYSTAL.BOB_AMPLITUDE * CRYSTAL.BOB_SPEED;
    this.alpha = 0.8 + 0.2 * Math.sin(t * 6 + this.phase);
    this.angle = Math.sin(t * 3 + this.phase) * 10;
  }

  recycle() {
    this.disableBody(true, true);
  }
}
