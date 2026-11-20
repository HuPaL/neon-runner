import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, TRANSITION_MS } from '../constants.js';
import { getTargetSize } from './Layout.js';

/** Text with the shared arcade style. resolution=2 keeps it crisp when the canvas is upscaled. */
export function makeText(scene, x, y, text, size = 24, color = COLORS.CSS.WHITE, extra = {}) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      resolution: 2,
      ...extra,
    })
    .setOrigin(0.5);
}

/**
 * Neon button. Hover/press feedback is applied immediately (no tweens), so it also
 * works while the game's tweens are paused. Fires on pointer-up after a pointer-down
 * on the same button, which is the expected touch behaviour.
 */
export function createButton(scene, x, y, label, onClick, { width = 240, height = 56, color = COLORS.CYAN, fontSize = 22 } = {}) {
  const css = `#${color.toString(16).padStart(6, '0')}`;
  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    bg.fillStyle(COLORS.PANEL, 0.92);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(hover ? 5 : 3, color, hover ? 0.35 : 0.2);
    bg.strokeRoundedRect(-width / 2 - 2, -height / 2 - 2, width + 4, height + 4, 14);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
  };
  draw(false);
  const text = makeText(scene, 0, 0, label, fontSize, css);
  const btn = scene.add.container(x, y, [bg, text]).setSize(width, height);
  btn.setInteractive({ useHandCursor: true });
  let pressed = false;
  btn.on('pointerover', () => {
    draw(true);
    btn.setScale(1.04);
  });
  btn.on('pointerout', () => {
    draw(false);
    btn.setScale(1);
    pressed = false;
  });
  btn.on('pointerdown', () => {
    pressed = true;
    btn.setScale(0.97);
  });
  btn.on('pointerup', () => {
    btn.setScale(1.04);
    if (!pressed) return;
    pressed = false;
    scene.registry.get('audio')?.play('click');
    onClick();
  });
  btn.setLabel = (t) => text.setText(t);
  return btn;
}

/** Fades the camera out, then starts another scene. Guards against double triggers. */
export function transitionTo(scene, key, data) {
  if (scene._transitioning) return;
  scene._transitioning = true;
  scene.input.enabled = false;
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  scene.cameras.main.fadeOut(TRANSITION_MS, 5, 1, 15);
}

export function fadeIn(scene) {
  scene._transitioning = false;
  scene.cameras.main.fadeIn(TRANSITION_MS, 5, 1, 15);
}

/**
 * Collects teardown callbacks (global listeners, scale events...) and runs them when
 * the scene shuts down, so restarting a scene never leaks listeners.
 */
export function registerCleanup(scene, fn) {
  // Scene instances are reused on restart, so re-arm whenever the list is empty.
  if (!scene._cleanups || scene._cleanups.length === 0) {
    scene._cleanups = [];
    const run = () => {
      scene.events.off('shutdown', run);
      scene.events.off('destroy', run);
      for (const f of scene._cleanups.splice(0)) f();
    };
    scene.events.once('shutdown', run);
    scene.events.once('destroy', run);
  }
  scene._cleanups.push(fn);
}

/** Sound on/off toggle button bound to the shared AudioManager. */
export function createSoundToggle(scene, x, y, opts = {}) {
  const audio = scene.registry.get('audio');
  const label = () => (audio.muted ? 'SOUND: OFF' : 'SOUND: ON');
  const btn = createButton(scene, x, y, label(), () => audio.toggleMute(), {
    width: 190,
    height: 44,
    fontSize: 16,
    color: COLORS.PURPLE,
    ...opts,
  });
  const off = audio.subscribe(() => btn.setLabel(label()));
  registerCleanup(scene, off);
  return btn;
}

/**
 * Re-lays-out a menu-type scene when the window orientation/aspect changes.
 * Debounced so dragging a desktop window edge does not restart the scene per pixel.
 * `restart` is called with no args; it should call scene.restart(...).
 */
export function watchLayout(scene, restart, delay = 200) {
  let timer = null;
  const onResize = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const t = getTargetSize();
      const g = scene.scale.gameSize;
      if (t.width !== g.width || t.height !== g.height) restart();
    }, delay);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
  registerCleanup(scene, () => {
    if (timer) clearTimeout(timer);
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize);
  });
}
