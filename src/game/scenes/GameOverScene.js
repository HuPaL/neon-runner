import Phaser from 'phaser';
import { COLORS, GAME_STATE, SCENES } from '../constants.js';
import { setGameState } from '../utils/GameState.js';
import { Background } from '../utils/Background.js';
import { groundY, syncLayout, isPortrait } from '../utils/Layout.js';
import { createButton, fadeIn, makeText, transitionTo, watchLayout } from '../utils/ui.js';

/** Keys are ignored briefly so a mashed jump key can't skip the result screen. */
const INPUT_GRACE_MS = 600;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME_OVER);
  }

  init(data) {
    // Keep the result across a layout-triggered restart.
    this.result = data && data.score !== undefined ? data : this.result || { score: 0, best: 0, isNewRecord: false, crystals: 0, level: 1 };
  }

  create() {
    if (syncLayout(this)) {
      this.scene.restart(this.result);
      return;
    }
    setGameState(this.game, GAME_STATE.GAME_OVER);
    const { width: W, height: H } = this.scale;
    const portrait = isPortrait(this);
    const r = this.result;
    const pad = (n) => String(n).padStart(6, '0');

    this.bg = new Background(this, groundY(this));
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.BG, 0.55).setDepth(40);

    const cy = portrait ? H * 0.2 : H * 0.17;
    makeText(this, W / 2, cy, 'GAME OVER', portrait ? 48 : 68, COLORS.CSS.MAGENTA, {
      shadow: { color: COLORS.CSS.MAGENTA, blur: 22, fill: true },
    }).setDepth(50);

    makeText(this, W / 2, cy + (portrait ? 80 : 78), `SCORE  ${pad(r.score)}`, portrait ? 30 : 36, COLORS.CSS.WHITE).setDepth(50);
    makeText(this, W / 2, cy + (portrait ? 122 : 125), `BEST  ${pad(r.best)}`, 22, COLORS.CSS.YELLOW).setDepth(50);
    makeText(this, W / 2, cy + (portrait ? 154 : 158), `LEVEL ${r.level}   ·   CRYSTALS ${r.crystals}`, 15, COLORS.CSS.MUTED).setDepth(50);

    if (r.isNewRecord) {
      const rec = makeText(this, W / 2, cy + (portrait ? 196 : 200), 'NEW RECORD!', 26, COLORS.CSS.YELLOW, {
        shadow: { color: COLORS.CSS.YELLOW, blur: 16, fill: true },
      }).setDepth(50);
      this.tweens.add({ targets: rec, scale: { from: 1, to: 1.15 }, duration: 450, yoyo: true, repeat: -1 });
    }

    const by = portrait ? H * 0.58 : H * 0.7;
    createButton(this, W / 2, by, 'RESTART', () => this.#restart(), { width: 260, height: 60, fontSize: 26 }).setDepth(50);
    createButton(this, W / 2, by + 76, 'MAIN MENU', () => this.#menu(), { width: 260, height: 52, fontSize: 20, color: COLORS.PURPLE }).setDepth(50);

    this.armedAt = this.time.now + INPUT_GRACE_MS;
    this.input.keyboard.on('keydown-ENTER', () => this.time.now >= this.armedAt && this.#restart());
    this.input.keyboard.on('keydown-ESC', () => this.time.now >= this.armedAt && this.#menu());

    watchLayout(this, () => this.scene.restart(this.result));

    fadeIn(this);
  }

  #restart() {
    transitionTo(this, SCENES.GAME);
  }

  #menu() {
    transitionTo(this, SCENES.MENU);
  }

  update(_t, delta) {
    this.bg?.scroll(60, delta / 1000);
  }
}
