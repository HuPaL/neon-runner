import Phaser from 'phaser';
import { GAME_STATE, SCENES } from '../constants.js';
import { createStorage } from '../utils/Storage.js';
import { AudioManager } from '../systems/AudioManager.js';
import { setGameState } from '../utils/GameState.js';
import { syncLayout } from '../utils/Layout.js';

/** Creates shared services once (storage, audio, debug flag), then hands off to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    setGameState(this.game, GAME_STATE.BOOT);
    const reg = this.registry;

    if (!reg.has('storage')) {
      const storage = createStorage();
      const audio = new AudioManager(storage);
      audio.attachUnlockListeners();
      reg.set('storage', storage);
      reg.set('audio', audio);
      this.game.events.once(Phaser.Core.Events.DESTROY, () => audio.destroy());
    }
    reg.set('debug', new URLSearchParams(window.location.search).has('debug'));

    syncLayout(this);
    this.scene.start(SCENES.PRELOAD);
  }
}
