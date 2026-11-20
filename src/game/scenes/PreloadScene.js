import Phaser from 'phaser';
import { COLORS, GAME_STATE, SCENES } from '../constants.js';
import { setGameState } from '../utils/GameState.js';
import { generateTextures, createAnimations } from '../utils/TextureFactory.js';
import { makeText } from '../utils/ui.js';

/**
 * Optional external assets. The game ships none (everything is generated), but the
 * loader path is real: a failed file is logged and skipped, never fatal.
 * Add entries like { key: 'logo', url: 'assets/images/logo.png' } to use it.
 */
const OPTIONAL_IMAGES = [];

const MIN_DISPLAY_MS = 600;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  preload() {
    setGameState(this.game, GAME_STATE.PRELOAD);
    const { width: W, height: H } = this.scale;
    const barW = Math.min(360, W * 0.7);

    makeText(this, W / 2, H / 2 - 60, 'NEON RUNNER', 40, COLORS.CSS.CYAN, {
      shadow: { color: COLORS.CSS.CYAN, blur: 18, fill: true },
    });
    this.status = makeText(this, W / 2, H / 2 + 40, 'LOADING 0%', 16, COLORS.CSS.MAGENTA);
    this.add.rectangle(W / 2, H / 2, barW, 14, COLORS.PANEL).setStrokeStyle(2, COLORS.PURPLE);
    this.bar = this.add.rectangle(W / 2 - barW / 2 + 2, H / 2, 0, 8, COLORS.CYAN).setOrigin(0, 0.5);
    this.barW = barW - 4;

    this.load.on('progress', (p) => this.#setProgress(p));
    this.load.on('loaderror', (file) => console.warn(`[NEON RUNNER] optional asset failed to load: ${file.key}`));
    for (const img of OPTIONAL_IMAGES) this.load.image(img.key, img.url);
  }

  create() {
    this.#setProgress(1);
    generateTextures(this);
    createAnimations(this);
    this.time.delayedCall(MIN_DISPLAY_MS, () => this.scene.start(SCENES.MENU));
  }

  #setProgress(p) {
    this.bar.width = this.barW * p;
    this.status.setText(`LOADING ${Math.round(p * 100)}%`);
  }
}
