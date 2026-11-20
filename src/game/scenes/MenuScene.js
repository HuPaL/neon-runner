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
    // Two small buttons side by side so the help panel below keeps its place.
    createButton(this, W / 2 - 101, btnY + 78, 'STATS', () => this.#toggleStats(), {
      width: 190,
      height: 44,
      fontSize: 16,
      color: COLORS.YELLOW,
    }).setDepth(50);
    createSoundToggle(this, W / 2 + 101, btnY + 78).setDepth(50);

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

    this.statsPanel = null;
    this.input.keyboard.on('keydown-ENTER', () => this.#start());
    this.input.keyboard.on('keydown-SPACE', (e) => {
      if (!e.repeat) this.#start();
    });
    this.input.keyboard.on('keydown-ESC', () => this.#hideStats());
    this.input.keyboard.on('keydown-S', (e) => {
      if (!e.repeat) this.#toggleStats();
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
    if (this.statsPanel) return; // Enter/Space while the stats panel is open must not start a run
    transitionTo(this, SCENES.GAME);
  }

  #toggleStats() {
    if (this.statsPanel) this.#hideStats();
    else this.#showStats();
  }

  #hideStats() {
    this.statsPanel?.destroy();
    this.statsPanel = null;
  }

  #showStats() {
    const { width: W, height: H } = this.scale;
    const portrait = isPortrait(this);
    const s = this.registry.get('analytics').getStats();
    const pct = (v) => `${(v * 100).toFixed(0)}%`;
    const rows = [
      ['GAMES PLAYED', String(s.games)],
      ['AVG SCORE', String(s.avgScore)],
      ['AVG DISTANCE', `${s.avgDistance} m`],
      ['AVG CRYSTALS', String(s.avgCrystals)],
      ['COLLISIONS', String(s.collisions)],
      ['COLLISION RATE', s.games ? `${pct(s.collisionRate)} of games` : '-'],
      ['PER 1000 m', s.totalDistance ? s.collisionsPer1000.toFixed(1) : '-'],
    ];
    const panelW = Math.min(W - 40, 520);
    const rowH = portrait ? 34 : 30;
    const panelH = 120 + rows.length * rowH + 70;
    const cy = H / 2;
    const items = [
      // Full-screen interactive backdrop: swallows taps so buttons below stay untouched.
      this.add.rectangle(W / 2, H / 2, W, H, COLORS.BG, 0.82).setInteractive(),
      this.add.rectangle(W / 2, cy, panelW, panelH, COLORS.PANEL, 0.95).setStrokeStyle(2, COLORS.YELLOW, 0.9),
      makeText(this, W / 2, cy - panelH / 2 + 40, 'STATISTICS', 34, COLORS.CSS.YELLOW, {
        shadow: { color: COLORS.CSS.YELLOW, blur: 16, fill: true },
      }),
    ];
    let y = cy - panelH / 2 + 100;
    for (const [label, value] of rows) {
      items.push(makeText(this, W / 2 - panelW / 2 + 28, y, label, 16, '#b9aee0').setOrigin(0, 0.5));
      items.push(makeText(this, W / 2 + panelW / 2 - 28, y, value, 18, COLORS.CSS.WHITE).setOrigin(1, 0.5));
      y += rowH;
    }
    items.push(createButton(this, W / 2, cy + panelH / 2 - 42, 'CLOSE', () => this.#hideStats(), { width: 180, height: 44, fontSize: 18, color: COLORS.YELLOW }));
    this.statsPanel = this.add.container(0, 0, items).setDepth(300);
  }

  update(_t, delta) {
    this.bg?.scroll(150, delta / 1000);
  }
}
