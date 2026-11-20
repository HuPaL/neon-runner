import Phaser from 'phaser';
import { COLORS, DIFFICULTY, GAME_STATE, PLAYER, SCENES, LAYOUT } from '../constants.js';
import { Player } from '../entities/Player.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { DifficultyManager } from '../systems/DifficultyManager.js';
import { Background } from '../utils/Background.js';
import { setGameState } from '../utils/GameState.js';
import { groundY, isPortrait, syncLayout } from '../utils/Layout.js';
import { createButton, createSoundToggle, fadeIn, makeText, registerCleanup, transitionTo } from '../utils/ui.js';

const DEATH_DELAY_MS = 900;
const COUNTDOWN_STEP_MS = 650;
const MAX_FRAME_MS = 50; // clamp huge deltas (tab switches, breakpoints)

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  init() {
    // Scene instances are reused on restart: reset *all* run state here.
    this.ready = false;
    this.state = GAME_STATE.PLAYING;
    this.resuming = false;
    this.dying = false;
    this.worldSpeed = DIFFICULTY.LEVELS[0].speed;
    this.hudCache = { score: -1, best: -1, level: -1, crystals: -1 };
    this.pauseOverlay = null;
    this.debugAccum = 0;
  }

  create() {
    if (syncLayout(this)) {
      this.scene.restart();
      return;
    }
    const { width: W, height: H } = this.scale;
    this.W = W;
    this.H = H;
    this.groundLine = groundY(this);
    this.audio = this.registry.get('audio');
    const storage = this.registry.get('storage');

    this.score = new ScoreManager(storage);
    this.difficulty = new DifficultyManager();
    this.background = new Background(this, this.groundLine);

    this.#createGround();
    this.#createEffects();
    this.#createPlayer();
    this.spawner = new SpawnManager(this, this.difficulty, this.groundLine);
    this.#createCollisions();
    this.#createHud();
    this.#createInput();
    this.#createLifecycleHooks();

    setGameState(this.game, GAME_STATE.PLAYING);
    this.audio.startMusic();
    this.audio.duckMusic(false);
    fadeIn(this);
    this.ready = true;
  }

  // ------------------------------------------------------------------ setup

  #createGround() {
    // Static, invisible collision slab under the visual ground tiles.
    this.ground = this.add.zone(this.W / 2, this.groundLine + LAYOUT.GROUND_HEIGHT / 2, this.W * 2, LAYOUT.GROUND_HEIGHT);
    this.physics.add.existing(this.ground, true);
  }

  #createEffects() {
    // Emitters are created once and fired with explode(); no particles objects per event.
    const base = { emitting: false, blendMode: 'ADD', depth: 30 };
    this.dustFx = this.add.particles(0, 0, 'spark', {
      ...base,
      speed: { min: 30, max: 110 },
      angle: { min: 190, max: 350 },
      lifespan: 380,
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: COLORS.PURPLE,
    });
    this.pickupFx = this.add.particles(0, 0, 'spark', {
      ...base,
      speed: { min: 60, max: 200 },
      lifespan: 420,
      scale: { start: 1.3, end: 0 },
      tint: COLORS.CYAN,
    });
    this.burstFx = this.add.particles(0, 0, 'spark', {
      ...base,
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      lifespan: 360,
      scale: { start: 1.4, end: 0 },
      tint: [COLORS.CYAN, COLORS.MAGENTA],
    });
    this.deathFx = this.add.particles(0, 0, 'spark', {
      ...base,
      speed: { min: 100, max: 420 },
      lifespan: 700,
      gravityY: 500,
      scale: { start: 2, end: 0 },
      tint: [COLORS.MAGENTA, COLORS.YELLOW, COLORS.CYAN],
    });

    // Small pool of floating "+10" labels.
    this.popups = [];
    for (let i = 0; i < 6; i++) {
      this.popups.push(makeText(this, 0, 0, '+10', 20, COLORS.CSS.CYAN).setDepth(60).setVisible(false));
    }
  }

  #createPlayer() {
    const x = isPortrait(this) ? PLAYER.X_PORTRAIT : PLAYER.X_LANDSCAPE;
    this.player = new Player(this, x, this.groundLine, {
      sound: (n) => this.audio.play(n),
      dust: (px, py) => this.dustFx.explode(6, px, py),
      burst: (px, py) => this.burstFx.explode(10, px, py),
    });
  }

  #createCollisions() {
    this.physics.add.collider(this.player.zone, this.ground);
    this.physics.add.overlap(this.player.zone, this.spawner.obstacles, this.#onHitObstacle, undefined, this);
    this.physics.add.overlap(this.player.zone, this.spawner.crystals, this.#onCollect, undefined, this);
  }

  #createHud() {
    const { W } = this;
    const portrait = isPortrait(this);
    const depth = 100;
    const left = 20;

    this.scoreText = makeText(this, left, 14, '', portrait ? 28 : 32, COLORS.CSS.WHITE).setOrigin(0, 0).setDepth(depth);
    this.bestText = makeText(this, left, portrait ? 50 : 52, '', 14, COLORS.CSS.YELLOW).setOrigin(0, 0).setDepth(depth);
    this.levelText = makeText(this, portrait ? W / 2 : W / 2, portrait ? 80 : 26, '', 20, COLORS.CSS.MAGENTA).setDepth(depth);
    this.crystalText = makeText(this, portrait ? W - 20 : W - 96, portrait ? 80 : 26, '', 20, COLORS.CSS.CYAN)
      .setOrigin(1, 0.5)
      .setDepth(depth);
    this.pauseBtn = createButton(this, W - 40, 40, 'II', () => this.togglePause(), {
      width: 52,
      height: 52,
      fontSize: 22,
      color: COLORS.PURPLE,
    }).setDepth(depth);

    this.levelBanner = makeText(this, W / 2, this.H * 0.28, '', portrait ? 40 : 56, COLORS.CSS.YELLOW, {
      shadow: { color: COLORS.CSS.YELLOW, blur: 20, fill: true },
    })
      .setDepth(depth)
      .setAlpha(0);

    this.countdownText = makeText(this, W / 2, this.H * 0.4, '', 96, COLORS.CSS.CYAN, {
      shadow: { color: COLORS.CSS.CYAN, blur: 24, fill: true },
    })
      .setDepth(depth + 10)
      .setVisible(false);

    this.debugText = this.registry.get('debug')
      ? makeText(this, 8, this.H - 70, '', 12, '#7CFF7C', { align: 'left' }).setOrigin(0, 0).setDepth(depth + 20)
      : null;
    this.#refreshHud(true);
  }

  #createInput() {
    const kb = this.input.keyboard;
    // Pointer: ignore taps that landed on a UI object (e.g. the pause button).
    this.input.addPointer(2);
    this.input.on('pointerdown', (_pointer, over) => {
      if (over.length === 0) this.#onJumpInput();
    });
    for (const key of ['SPACE', 'UP', 'W']) {
      // event.repeat === true for auto-repeat while the key is held: ignore it.
      kb.on(`keydown-${key}`, (e) => {
        if (!e.repeat) this.#onJumpInput();
      });
    }
    for (const key of ['ESC', 'P']) {
      kb.on(`keydown-${key}`, (e) => {
        if (!e.repeat) this.togglePause();
      });
    }
    kb.on('keydown-M', (e) => {
      if (!e.repeat) this.audio.toggleMute();
    });
    kb.on('keydown-F3', () => this.debugText?.setVisible(!this.debugText.visible));
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    registerCleanup(this, () => kb.removeCapture('SPACE,UP,DOWN,LEFT,RIGHT'));
  }

  #createLifecycleHooks() {
    // Auto-pause when the tab is hidden, persist the score when the page goes away.
    const onHidden = () => this.pause();
    const onPageHide = () => this.score?.commit();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    window.addEventListener('pagehide', onPageHide);

    // Rotating the device mid-run keeps the current (letterboxed) layout; the
    // new orientation is applied on the next scene start. Nothing to do here.
    registerCleanup(this, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      window.removeEventListener('pagehide', onPageHide);
      this.score?.commit();
    });
  }

  // ------------------------------------------------------------------ input

  #onJumpInput() {
    if (!this.ready || this.state !== GAME_STATE.PLAYING || this.resuming || this.dying) return;
    this.player.requestJump();
  }

  togglePause() {
    if (this.state === GAME_STATE.PAUSED) this.resume();
    else this.pause();
  }

  pause() {
    if (!this.ready || this.state !== GAME_STATE.PLAYING || this.resuming || this.dying) return;
    this.state = GAME_STATE.PAUSED;
    setGameState(this.game, GAME_STATE.PAUSED);
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.audio.duckMusic(true);
    this.#showPauseOverlay();
  }

  resume() {
    // Re-entrancy guard: ESC / pause button during the 3-2-1 countdown must not start a
    // second countdown (its late callback would un-pause a later, real pause).
    if (this.state !== GAME_STATE.PAUSED || this.resuming) return;
    this.#hidePauseOverlay();
    this.resuming = true;
    // 3-2-1 so the player is never thrown back into a fast-moving world unprepared.
    let n = 3;
    this.countdownText.setText(String(n)).setVisible(true);
    this.countdown = this.time.addEvent({
      delay: COUNTDOWN_STEP_MS,
      repeat: 2,
      callback: () => {
        n -= 1;
        if (n > 0) {
          this.countdownText.setText(String(n));
          return;
        }
        this.countdownText.setVisible(false);
        this.resuming = false;
        this.state = GAME_STATE.PLAYING;
        setGameState(this.game, GAME_STATE.PLAYING);
        this.physics.world.resume();
        this.tweens.resumeAll();
        this.audio.duckMusic(false);
      },
    });
  }

  #showPauseOverlay() {
    const { W, H } = this;
    const portrait = isPortrait(this);
    const items = [this.add.rectangle(W / 2, H / 2, W, H, COLORS.BG, 0.72)];
    items.push(
      makeText(this, W / 2, H * (portrait ? 0.26 : 0.2), 'PAUSED', portrait ? 52 : 64, COLORS.CSS.CYAN, {
        shadow: { color: COLORS.CSS.CYAN, blur: 20, fill: true },
      }),
    );
    const y0 = H * (portrait ? 0.38 : 0.38);
    const gap = 72;
    items.push(createButton(this, W / 2, y0, 'RESUME', () => this.resume(), { width: 260, height: 56, fontSize: 24 }));
    items.push(createButton(this, W / 2, y0 + gap, 'RESTART', () => this.#restart(), { width: 260, height: 52, fontSize: 20, color: COLORS.MAGENTA }));
    items.push(createButton(this, W / 2, y0 + gap * 2, 'MAIN MENU', () => this.#menu(), { width: 260, height: 52, fontSize: 20, color: COLORS.PURPLE }));
    items.push(createSoundToggle(this, W / 2, y0 + gap * 3));
    this.pauseOverlay = this.add.container(0, 0, items).setDepth(500);
    this.pauseBtn.disableInteractive();
  }

  #hidePauseOverlay() {
    this.pauseOverlay?.destroy();
    this.pauseOverlay = null;
    this.pauseBtn.setInteractive({ useHandCursor: true });
  }

  #restart() {
    transitionTo(this, SCENES.GAME);
  }

  #menu() {
    transitionTo(this, SCENES.MENU);
  }

  // ------------------------------------------------------------- collisions

  #onHitObstacle() {
    if (this.dying) return;
    this.dying = true;
    const p = this.player;
    p.die();
    this.audio.play('hit');
    this.cameras.main.shake(320, 0.014);
    this.cameras.main.flash(120, 255, 43, 214);
    this.deathFx.explode(36, p.x, p.body.center.y);
    this.score.commit();

    const result = {
      score: this.score.score,
      best: this.score.best,
      isNewRecord: this.score.isNewRecord,
      crystals: this.score.crystals,
      level: this.difficulty.level,
    };
    this.time.delayedCall(DEATH_DELAY_MS, () => transitionTo(this, SCENES.GAME_OVER, result));
  }

  #onCollect(_playerZone, crystal) {
    if (!crystal.active || this.dying) return;
    crystal.recycle();
    this.score.addCrystal();
    this.audio.play('crystal');
    this.pickupFx.explode(8, crystal.x, crystal.y);
    this.#popup(crystal.x, crystal.y - 20);
  }

  #popup(x, y) {
    const t = this.popups.find((p) => !p.visible);
    if (!t) return;
    this.tweens.killTweensOf(t);
    t.setPosition(x, y).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: t,
      y: y - 44,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => t.setVisible(false),
    });
  }

  // ----------------------------------------------------------------- update

  update(time, delta) {
    if (!this.ready || this.state !== GAME_STATE.PLAYING || this.resuming) return;
    const frameMs = Math.min(delta, MAX_FRAME_MS);
    const dt = frameMs / 1000;

    if (this.dying) {
      // The world glides to a stop after a crash.
      this.worldSpeed = Math.max(0, this.worldSpeed - 900 * dt);
      for (const o of this.spawner.obstacles.getChildren()) if (o.active) o.body.velocity.x = -this.worldSpeed;
      for (const c of this.spawner.crystals.getChildren()) if (c.active) c.body.velocity.x = -this.worldSpeed;
      this.background.scroll(this.worldSpeed, dt);
      this.player.update(frameMs, this.worldSpeed);
      return;
    }

    const speed = this.difficulty.getSpeed(this.score.distance);
    this.worldSpeed = speed;
    this.score.addPixels(speed * dt);
    if (this.difficulty.update(this.score.distance)) this.#onLevelUp();

    this.spawner.update(dt, time, speed, this.score.distance);
    this.background.scroll(speed, dt);
    this.player.update(frameMs, speed);
    this.#refreshHud(false);
    if (this.debugText?.visible) this.#updateDebug(delta);
  }

  #onLevelUp() {
    const level = this.difficulty.level;
    this.audio.play('levelUp');
    this.levelBanner.setText(`LEVEL ${level}`);
    this.tweens.killTweensOf(this.levelBanner);
    this.levelBanner.setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.levelBanner, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.levelBanner, alpha: 0, delay: 1100, duration: 450 });
    this.cameras.main.flash(160, 0, 240, 255, true);
  }

  /** Text objects are only touched when their displayed value changes. */
  #refreshHud(force) {
    const c = this.hudCache;
    const score = this.score.score;
    if (force || score !== c.score) {
      c.score = score;
      this.scoreText.setText(String(score).padStart(6, '0'));
    }
    const best = this.score.best;
    if (force || best !== c.best) {
      c.best = best;
      this.bestText.setText(`BEST ${String(best).padStart(6, '0')}`);
    }
    const level = this.difficulty.level;
    if (force || level !== c.level) {
      c.level = level;
      this.levelText.setText(`LEVEL ${level}`);
    }
    const crystals = this.score.crystals;
    if (force || crystals !== c.crystals) {
      c.crystals = crystals;
      this.crystalText.setText(`◆ ${crystals}`);
    }
  }

  #updateDebug(delta) {
    this.debugAccum += delta;
    if (this.debugAccum < 400) return;
    this.debugAccum = 0;
    const n = this.spawner.activeCounts;
    this.debugText.setText(
      [
        `FPS ${this.game.loop.actualFps.toFixed(0)}  (delta ${delta.toFixed(1)}ms)`,
        `speed ${this.worldSpeed.toFixed(0)}px/s  dist ${this.score.distance.toFixed(0)}`,
        `obstacles ${n.obstacles}  crystals ${n.crystals}`,
        `renderer ${this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'}`,
      ].join('\n'),
    );
  }
}
