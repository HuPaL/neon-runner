import Phaser from 'phaser';
import { COLORS, GAME_STATE, SCENES } from '../constants.js';
import { setGameState } from '../utils/GameState.js';
import { Background } from '../utils/Background.js';
import { groundY, syncLayout, isPortrait } from '../utils/Layout.js';
import { createButton, createSoundToggle, fadeIn, makeText, registerCleanup, transitionTo, watchLayout } from '../utils/ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    if (syncLayout(this)) {
      this.scene.restart();
      return;
    }
    setGameState(this.game, GAME_STATE.MENU);
    const { width: W, height: H } = this.scale;
    const portrait = isPortrait(this);
    const audio = this.registry.get('audio');
    const best = this.registry.get('storage').get('bestScore');

    this.bg = new Background(this, groundY(this));

    const titleY = portrait ? H * 0.16 : H * 0.2;
    const titleSize = portrait ? 56 : 84;
    const title = makeText(this, W / 2, titleY, 'NEON\nRUNNER', titleSize, COLORS.CSS.CYAN, {
      align: 'center',
      lineSpacing: -6,
      shadow: { color: COLORS.CSS.MAGENTA, blur: 24, fill: true },
    }).setDepth(50);
    if (!portrait) title.setText('NEON RUNNER');
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.04 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    makeText(this, W / 2, titleY + (portrait ? 100 : 60), `BEST  ${String(best).padStart(6, '0')}`, 22, COLORS.CSS.YELLOW).setDepth(50);

    const btnY = portrait ? H * 0.42 : H * 0.5;
    createButton(this, W / 2, btnY, 'PLAY', () => this.#start(), { width: 260, height: 64, fontSize: 28, color: COLORS.CYAN }).setDepth(50);
    createSoundToggle(this, W / 2, btnY + 78).setDepth(50);

    const help = [
      'SPACE / UP / W  -  JUMP (PRESS TWICE TO DOUBLE JUMP)',
      'ESC / P  -  PAUSE        M  -  MUTE',
      'TOUCH  -  TAP TO JUMP, TAP AGAIN IN THE AIR',
    ].join('\n');
    const helpText = makeText(this, W / 2, btnY + (portrait ? 190 : 170), help, portrait ? 12 : 14, '#b9aee0', {
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: W - 40 },
    }).setDepth(51);
    // Dim backing panel so the text stays readable over the sun / skyline.
    this.add
      .rectangle(helpText.x, helpText.y, helpText.width + 28, helpText.height + 20, COLORS.BG, 0.72)
      .setStrokeStyle(1, COLORS.PURPLE, 0.6)
      .setDepth(50);

    this.input.keyboard.on('keydown-ENTER', () => this.#start());
    this.input.keyboard.on('keydown-SPACE', (e) => {
      if (!e.repeat) this.#start();
    });
    this.input.keyboard.on('keydown-M', () => audio.toggleMute());
    this.input.keyboard.addCapture('SPACE');
    registerCleanup(this, () => this.input.keyboard?.removeCapture('SPACE'));

    // Rotating the device re-lays-out the menu.
    watchLayout(this, () => this.scene.restart());

    audio.startMusic();
    fadeIn(this);
  }

  #start() {
    transitionTo(this, SCENES.GAME);
  }

  update(_t, delta) {
    this.bg?.scroll(150, delta / 1000);
  }
}
