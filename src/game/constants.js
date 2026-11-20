/**
 * Global constants and tunable gameplay parameters.
 * Everything that affects game feel lives here so it can be tuned in one place.
 * This module must stay free of Phaser imports so it can be unit-tested in Node.
 */

export const GAME_STATE = Object.freeze({
  BOOT: 'BOOT',
  PRELOAD: 'PRELOAD',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

export const SCENES = Object.freeze({
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  GAME_OVER: 'GameOverScene',
});

/** Logical (design) resolutions. The Scale Manager FITs them into the window. */
export const LAYOUT = Object.freeze({
  LANDSCAPE: { width: 960, height: 540 },
  PORTRAIT: { width: 540, height: 960 },
  GROUND_HEIGHT: 90,
});

export const COLORS = Object.freeze({
  BG: 0x05010f,
  CYAN: 0x00f0ff,
  MAGENTA: 0xff2bd6,
  PURPLE: 0x9d4dff,
  YELLOW: 0xffe94d,
  WHITE: 0xffffff,
  PANEL: 0x0b0620,
  CSS: {
    CYAN: '#00f0ff',
    MAGENTA: '#ff2bd6',
    PURPLE: '#9d4dff',
    YELLOW: '#ffe94d',
    WHITE: '#ffffff',
    MUTED: '#8a7fb0',
  },
});

export const FONT_FAMILY = '"Orbitron", "Segoe UI", "Trebuchet MS", system-ui, sans-serif';

/** Vertical physics. Units: px, px/s, px/s^2. */
export const PHYSICS = Object.freeze({
  GRAVITY: 1800,
  JUMP_VELOCITY: -640,
  DOUBLE_JUMP_VELOCITY: -580,
  MAX_JUMPS: 2,
  MAX_FALL_SPEED: 1100,
  /** A jump pressed this long before landing is replayed on touchdown. */
  JUMP_BUFFER_MS: 120,
});

export const PLAYER = Object.freeze({
  BODY_W: 26,
  BODY_H: 46,
  TEXTURE_W: 48,
  TEXTURE_H: 64,
  X_LANDSCAPE: 170,
  X_PORTRAIT: 120,
});

/**
 * Obstacle definitions. `w`/`h` is the visual size, `hit` is the (slightly
 * forgiving) collision box relative to the visual's bottom-left corner.
 * The tallest obstacle (92px) must stay clearly below the single-jump apex
 * (~113px); tests/patterns.test.js verifies this with a jump simulation.
 */
export const OBSTACLES = Object.freeze({
  barrier: { w: 34, h: 64, hit: { ox: 3, w: 28, h: 61 } },
  laser: { w: 20, h: 92, hit: { ox: 4, w: 12, h: 90 } },
  spikes: { w: 72, h: 34, hit: { ox: 7, w: 58, h: 30 } },
});

/** Texture padding (px) around obstacle shapes, used for baked-in glow. */
export const GLOW_PAD = 10;

export const CRYSTAL = Object.freeze({
  POINTS: 10,
  W: 26,
  H: 34,
  BOB_AMPLITUDE: 6,
  BOB_SPEED: 4.2,
});

export const SCORING = Object.freeze({
  /** World pixels per "distance" unit (1 unit == 1 score point). */
  PX_PER_UNIT: 10,
  CRYSTAL_POINTS: CRYSTAL.POINTS,
});

/**
 * Difficulty is data-driven. Speed and spawn interval are linearly
 * interpolated between the anchors of consecutive levels, so difficulty ramps
 * smoothly instead of jumping at level boundaries.
 *
 * interval = [min, max] seconds of free space between the trailing edge of one
 * obstacle pattern and the leading edge of the next (at current speed).
 */
export const DIFFICULTY = Object.freeze({
  MAX_SPEED: 580,
  /** Hard floor for any spawn interval, regardless of level. */
  MIN_INTERVAL: 0.95,
  /** Distance after the last level start over which speed reaches MAX_SPEED. */
  FINAL_RAMP_DISTANCE: 3000,
  /** Seconds of empty track before the first obstacle. */
  INITIAL_DELAY: 1.4,
  LEVELS: [
    { level: 1, minDistance: 0, speed: 280, interval: [1.7, 2.4], patterns: ['barrier', 'spikes', 'laser'] },
    { level: 2, minDistance: 500, speed: 340, interval: [1.45, 2.0], patterns: ['barrier', 'spikes', 'laser', 'twinBarrier', 'spikesBarrier'] },
    { level: 3, minDistance: 1500, speed: 430, interval: [1.2, 1.7], patterns: ['barrier', 'spikes', 'laser', 'twinBarrier', 'spikesBarrier', 'barrierSpikes', 'tripleSpikes'] },
    { level: 4, minDistance: 3000, speed: 520, interval: [1.0, 1.4], patterns: ['spikes', 'laser', 'twinBarrier', 'spikesBarrier', 'barrierSpikes', 'tripleSpikes', 'gauntlet'] },
  ],
});

/**
 * Obstacle patterns: `dx` is the offset (px) of each part's left edge from the
 * pattern's left edge. Every pattern is verified to be clearable with at most
 * two jumps (see tests/patterns.test.js).
 */
export const PATTERNS = Object.freeze({
  barrier: { parts: [{ type: 'barrier', dx: 0 }] },
  spikes: { parts: [{ type: 'spikes', dx: 0 }] },
  laser: { parts: [{ type: 'laser', dx: 0 }] },
  twinBarrier: { parts: [{ type: 'barrier', dx: 0 }, { type: 'barrier', dx: 72 }] },
  spikesBarrier: { parts: [{ type: 'spikes', dx: 0 }, { type: 'barrier', dx: 120 }] },
  barrierSpikes: { parts: [{ type: 'barrier', dx: 0 }, { type: 'spikes', dx: 100 }] },
  tripleSpikes: { parts: [{ type: 'spikes', dx: 0 }, { type: 'spikes', dx: 110 }] },
  gauntlet: { parts: [{ type: 'barrier', dx: 0 }, { type: 'spikes', dx: 160 }, { type: 'barrier', dx: 340 }] },
});

export const STORAGE_KEY = 'neonrunner.v1';

export const TRANSITION_MS = 250;

/** Pool sizes. Larger than the worst case on screen so pools never run dry. */
export const POOLS = Object.freeze({
  OBSTACLES: 20,
  CRYSTALS: 40,
});
