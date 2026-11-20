import Phaser from 'phaser';
import { COLORS } from './constants.js';
import { getTargetSize } from './utils/Layout.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

export function createConfig() {
  const { width, height } = getTargetSize();
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width,
    height,
    backgroundColor: COLORS.BG,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    // Audio is handled by our own Web Audio AudioManager.
    audio: { noAudio: true },
    input: { activePointers: 3 },
    disableContextMenu: true,
    fps: { target: 60, smoothStep: true },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
  };
}
