import { LAYOUT } from '../constants.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Picks the logical design resolution for the current window. The short side is fixed
 * (540) so gameplay proportions never change; the long side follows the screen aspect
 * ratio within sane limits, which minimises letterbox bars on phones and ultrawides.
 */
export function getTargetSize() {
  if (typeof window === 'undefined') return LAYOUT.LANDSCAPE;
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  const short = LAYOUT.LANDSCAPE.height; // 540
  if (h > w) {
    return { width: short, height: clamp(Math.round((short * h) / w), LAYOUT.PORTRAIT.height, 1200) };
  }
  return { width: clamp(Math.round((short * w) / h), LAYOUT.LANDSCAPE.width, 1260), height: short };
}

export function isPortrait(scene) {
  return scene.scale.height > scene.scale.width;
}

/**
 * Makes the game's logical size match the window orientation.
 * Returns true if the size had to change - the caller must then restart its
 * scene and stop creating objects, because the old layout is stale.
 */
export function syncLayout(scene) {
  const target = getTargetSize();
  const { width, height } = scene.scale.gameSize;
  if (width === target.width && height === target.height) return false;
  scene.scale.setGameSize(target.width, target.height);
  return true;
}

export function groundY(scene) {
  return scene.scale.height - LAYOUT.GROUND_HEIGHT;
}
