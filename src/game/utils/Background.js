import { LAYOUT } from '../constants.js';

/**
 * Multi-layer parallax city. Used by the menu (slow constant scroll) and the game
 * (scroll driven by world speed). Only a handful of TileSprites are drawn.
 */
export class Background {
  constructor(scene, groundY) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    this.groundY = groundY;

    scene.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(W, H).setDepth(-100);
    scene.add.image(W * 0.68, groundY - 200, 'sun').setDepth(-99).setAlpha(0.9);

    const layer = (key, factor, depth) => {
      const tex = scene.textures.get(key).getSourceImage();
      const ts = scene.add.tileSprite(0, groundY - tex.height, W, tex.height, key).setOrigin(0, 0).setDepth(depth);
      return { ts, factor };
    };
    this.layers = [
      layer('bg_far', 0.1, -90),
      layer('bg_far_lights', 0.1, -89),
      layer('bg_mid', 0.25, -80),
      layer('bg_mid_lights', 0.25, -79),
      layer('bg_near', 0.5, -70),
      layer('bg_near_lights', 0.5, -69),
    ];

    // Animated neon: the lights layers pulse out of phase (3 tweens, created once).
    this.layers.forEach(({ ts }, i) => {
      if (i % 2 === 1) {
        scene.tweens.add({
          targets: ts,
          alpha: { from: 0.45, to: 1 },
          duration: 900 + i * 350,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });

    this.ground = scene.add
      .tileSprite(0, groundY, W, LAYOUT.GROUND_HEIGHT, 'ground')
      .setOrigin(0, 0)
      .setDepth(10);

    this.scanlines = scene.add.tileSprite(0, 0, W, H, 'scanlines').setOrigin(0, 0).setDepth(1000).setAlpha(0.7);
    this.groundOffset = 0;
  }

  /** @param {number} speed world speed in px/s @param {number} dt seconds */
  scroll(speed, dt) {
    const d = speed * dt;
    for (const { ts, factor } of this.layers) ts.tilePositionX += d * factor;
    this.ground.tilePositionX += d;
  }
}
