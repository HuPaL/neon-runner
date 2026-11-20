import { PHYSICS, PLAYER } from '../constants.js';

export const PLAYER_STATE = Object.freeze({
  RUNNING: 'RUNNING',
  JUMPING: 'JUMPING',
  FALLING: 'FALLING',
  DEAD: 'DEAD',
});

/**
 * Player = invisible physics Zone (the exact collision body) + a visual Image that
 * follows it. Splitting them lets squash/stretch scale the visual without resizing
 * the hit box, which would otherwise make collisions inconsistent.
 *
 * Jump rules:
 *  - at most PHYSICS.MAX_JUMPS jumps between two ground contacts
 *  - key repeat / holding does not re-trigger (callers must pass requestJump() once per press)
 *  - a press shortly before landing is buffered and fires on touchdown
 */
export class Player {
  constructor(scene, x, groundY, effects = {}) {
    this.scene = scene;
    this.effects = effects; // { dust(x,y), burst(x,y), sound(name) }
    this.state = PLAYER_STATE.RUNNING;
    this.jumpsUsed = 0;
    this.grounded = true;
    this.jumpBuffer = 0;

    const cy = groundY - PLAYER.BODY_H / 2;
    this.zone = scene.add.zone(x, cy, PLAYER.BODY_W, PLAYER.BODY_H);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body;
    this.body.setAllowGravity(true);
    this.body.setGravityY(PHYSICS.GRAVITY);
    this.body.setMaxVelocityY(PHYSICS.MAX_FALL_SPEED);

    this.view = scene.add.sprite(x, groundY, 'player_run0').setOrigin(0.5, 1).setDepth(20);
    this.view.play('player-run');
  }

  get x() {
    return this.zone.x;
  }

  get feetY() {
    return this.body.bottom;
  }

  get dead() {
    return this.state === PLAYER_STATE.DEAD;
  }

  /** Call once per key press / tap (never for auto-repeat). */
  requestJump() {
    if (this.dead) return;
    if (this.jumpsUsed < PHYSICS.MAX_JUMPS) this.#jump();
    else this.jumpBuffer = PHYSICS.JUMP_BUFFER_MS;
  }

  #jump() {
    const first = this.jumpsUsed === 0;
    this.jumpsUsed += 1;
    this.body.setVelocityY(first ? PHYSICS.JUMP_VELOCITY : PHYSICS.DOUBLE_JUMP_VELOCITY);
    this.grounded = false;
    this.jumpBuffer = 0;
    this.effects.sound?.(first ? 'jump' : 'doubleJump');
    if (first) this.effects.dust?.(this.x, this.feetY);
    else this.effects.burst?.(this.x, this.feetY);
    this.#squash(0.78, 1.28, 170);
  }

  #squash(sx, sy, ms) {
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(sx, sy);
    this.scene.tweens.add({ targets: this.view, scaleX: 1, scaleY: 1, duration: ms, ease: 'Back.easeOut' });
  }

  /** @param {number} delta ms since last frame @param {number} runSpeed world speed px/s */
  update(delta, runSpeed) {
    if (this.dead) {
      this.#syncView();
      return;
    }
    const onGround = this.body.blocked.down || this.body.touching.down;

    if (onGround && this.body.velocity.y >= 0) {
      if (!this.grounded) this.#land();
      this.grounded = true;
      this.jumpsUsed = 0;
    } else if (!onGround) {
      // Left the ground without jumping (fell off something): that counts as the first jump.
      if (this.jumpsUsed === 0) this.jumpsUsed = 1;
      this.grounded = false;
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= delta;
      if (this.grounded && this.jumpBuffer > 0) this.#jump();
    }

    const next = this.grounded
      ? PLAYER_STATE.RUNNING
      : this.body.velocity.y < 0
        ? PLAYER_STATE.JUMPING
        : PLAYER_STATE.FALLING;
    this.#setState(next, runSpeed);
    this.#syncView();
  }

  #land() {
    this.effects.dust?.(this.x, this.feetY);
    this.#squash(1.3, 0.72, 160);
  }

  #setState(next, runSpeed) {
    if (next === this.state) {
      if (next === PLAYER_STATE.RUNNING) this.view.anims.timeScale = 0.7 + runSpeed / 700;
      return;
    }
    this.state = next;
    switch (next) {
      case PLAYER_STATE.RUNNING:
        this.view.play('player-run', true);
        break;
      case PLAYER_STATE.JUMPING:
        this.view.anims.stop();
        this.view.setTexture('player_jump');
        break;
      case PLAYER_STATE.FALLING:
        this.view.anims.stop();
        this.view.setTexture('player_fall');
        break;
      default:
        break;
    }
  }

  #syncView() {
    this.view.x = this.zone.x;
    this.view.y = this.body.bottom;
  }

  die() {
    if (this.dead) return;
    this.state = PLAYER_STATE.DEAD;
    this.view.anims.stop();
    this.view.setTexture('player_dead');
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(1);
    this.body.setVelocity(-120, -380);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.view);
    this.view.destroy();
    this.zone.destroy();
  }
}
