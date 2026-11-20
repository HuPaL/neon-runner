import { COLORS, CRYSTAL, GLOW_PAD, LAYOUT, OBSTACLES, PLAYER } from '../constants.js';

/**
 * Generates every texture the game needs with the Canvas 2D API at load time.
 * Glow is baked into the textures (shadowBlur), so it costs nothing per frame.
 * No external art is required, so the game can never fail on a missing asset.
 */

const css = (n) => `#${n.toString(16).padStart(6, '0')}`;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
}


/** Rounded-rect path without relying on ctx.roundRect (missing in older browsers). */
function rrect(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

export function generateTextures(scene) {
  const W = LAYOUT.LANDSCAPE.width; // tile width of the skyline layers
  const maxH = LAYOUT.PORTRAIT.height;

  // Soft round particle.
  canvasTexture(scene, 'spark', 16, 16, (c) => {
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });

  // Sky gradient with stars (stretched to the screen size at use).
  canvasTexture(scene, 'sky', 512, maxH, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05010f');
    g.addColorStop(0.55, '#1a0638');
    g.addColorStop(0.85, '#4a0f6b');
    g.addColorStop(1, '#8a1d7a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const rnd = mulberry32(7);
    for (let i = 0; i < 90; i++) {
      c.globalAlpha = 0.2 + rnd() * 0.6;
      c.fillStyle = '#fff';
      const y = rnd() * h * 0.6;
      c.fillRect(rnd() * w, y, 1.5, 1.5);
    }
    c.globalAlpha = 1;
  });

  // Synthwave sun.
  canvasTexture(scene, 'sun', 260, 260, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, '#ffe94d');
    g.addColorStop(0.5, '#ff6ad5');
    g.addColorStop(1, '#9d4dff');
    glow(c, '#ff2bd6', 30);
    c.fillStyle = g;
    c.beginPath();
    c.arc(130, 130, 100, 0, Math.PI * 2);
    c.fill();
    noGlow(c);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) c.fillRect(0, 150 + i * 18, 260, 2 + i * 1.6);
    c.globalCompositeOperation = 'source-over';
  });

  // Skyline layers (tileable horizontally). Each layer has a silhouette and a separate
  // "lights" texture so the lights can pulse independently (animated neon).
  const skyline = (key, seed, height, minH, maxBH, body, edge, lightColor, windowDensity) => {
    const litKey = `${key}_lights`;
    if (scene.textures.exists(key)) return;
    const rnd = mulberry32(seed);
    const buildings = [];
    for (let x = 0; x < W; ) {
      const w = Math.min(W - x, 50 + Math.floor(rnd() * 70));
      const h = minH + Math.floor(rnd() * (maxBH - minH));
      buildings.push({ x, w, h });
      x += w + (rnd() < 0.3 ? 6 : 0);
    }
    canvasTexture(scene, key, W, height, (c) => {
      c.fillStyle = body;
      for (const b of buildings) c.fillRect(b.x, height - b.h, b.w, b.h);
    });
    canvasTexture(scene, litKey, W, height, (c) => {
      const r2 = mulberry32(seed + 1);
      glow(c, lightColor, 8);
      c.strokeStyle = edge;
      c.lineWidth = 2;
      c.fillStyle = lightColor;
      for (const b of buildings) {
        c.beginPath();
        c.moveTo(b.x + 1, height);
        c.lineTo(b.x + 1, height - b.h);
        c.lineTo(b.x + b.w - 1, height - b.h);
        c.lineTo(b.x + b.w - 1, height);
        c.stroke();
        for (let wy = height - b.h + 10; wy < height - 8; wy += 14) {
          for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 12) {
            if (r2() < windowDensity) c.fillRect(wx, wy, 4, 6);
          }
        }
      }
    });
  };
  skyline('bg_far', 11, 300, 90, 230, '#120626', 'rgba(157,77,255,0.5)', '#9d4dff', 0.12);
  skyline('bg_mid', 23, 240, 70, 200, '#0b0420', 'rgba(255,43,214,0.7)', '#ff2bd6', 0.18);
  skyline('bg_near', 37, 170, 50, 150, '#060214', 'rgba(0,240,255,0.8)', '#00f0ff', 0.22);

  // Ground tile.
  canvasTexture(scene, 'ground', 64, LAYOUT.GROUND_HEIGHT, (c, w, h) => {
    c.fillStyle = '#0a0418';
    c.fillRect(0, 0, w, h);
    glow(c, css(COLORS.CYAN), 10);
    c.fillStyle = css(COLORS.CYAN);
    c.fillRect(0, 0, w, 3);
    noGlow(c);
    c.strokeStyle = 'rgba(255,43,214,0.45)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, h);
    for (let y = 20; y < h; y += 22) {
      c.moveTo(0, y);
      c.lineTo(w, y);
    }
    c.stroke();
  });

  // CRT scanline overlay tile.
  canvasTexture(scene, 'scanlines', 4, 4, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(0, 0, 4, 1);
  });

  // Obstacles. Shape is drawn at (GLOW_PAD, GLOW_PAD) so the glow has room.
  const P = GLOW_PAD;
  const b = OBSTACLES.barrier;
  canvasTexture(scene, 'obs_barrier', b.w + P * 2, b.h + P * 2, (c) => {
    glow(c, css(COLORS.MAGENTA), 14);
    c.fillStyle = '#2a0a3a';
    c.strokeStyle = css(COLORS.MAGENTA);
    c.lineWidth = 3;
    c.fillRect(P, P, b.w, b.h);
    c.strokeRect(P + 1.5, P + 1.5, b.w - 3, b.h - 3);
    noGlow(c);
    c.strokeStyle = 'rgba(255,233,77,0.9)'; // hazard stripes
    c.lineWidth = 3;
    c.save();
    c.beginPath();
    c.rect(P + 3, P + 3, b.w - 6, b.h - 6);
    c.clip();
    for (let y = -b.w; y < b.h + b.w; y += 14) {
      c.beginPath();
      c.moveTo(P, P + y + b.w);
      c.lineTo(P + b.w, P + y);
      c.stroke();
    }
    c.restore();
  });

  const l = OBSTACLES.laser;
  canvasTexture(scene, 'obs_laser', l.w + P * 2, l.h + P * 2, (c) => {
    c.fillStyle = '#1b0830';
    c.fillRect(P, P + l.h - 14, l.w, 14); // base
    c.fillRect(P, P, l.w, 12); // emitter
    glow(c, css(COLORS.CYAN), 18);
    c.fillStyle = '#ffffff';
    c.fillRect(P + l.w / 2 - 2, P + 12, 4, l.h - 26); // beam core
    noGlow(c);
    glow(c, css(COLORS.CYAN), 10);
    c.strokeStyle = css(COLORS.CYAN);
    c.lineWidth = 2;
    c.strokeRect(P + 1, P + 1, l.w - 2, 10);
    c.strokeRect(P + 1, P + l.h - 13, l.w - 2, 12);
  });

  const s = OBSTACLES.spikes;
  canvasTexture(scene, 'obs_spikes', s.w + P * 2, s.h + P * 2, (c) => {
    const n = 3;
    const sw = s.w / n;
    glow(c, css(COLORS.YELLOW), 14);
    c.fillStyle = '#2a2400';
    c.strokeStyle = css(COLORS.YELLOW);
    c.lineWidth = 2.5;
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.moveTo(P + i * sw + 1, P + s.h);
      c.lineTo(P + i * sw + sw / 2, P + 1);
      c.lineTo(P + (i + 1) * sw - 1, P + s.h);
      c.closePath();
      c.fill();
      c.stroke();
    }
  });

  // Energy crystal.
  canvasTexture(scene, 'crystal', CRYSTAL.W + 16, CRYSTAL.H + 16, (c, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    glow(c, css(COLORS.CYAN), 14);
    const g = c.createLinearGradient(0, cy - CRYSTAL.H / 2, 0, cy + CRYSTAL.H / 2);
    g.addColorStop(0, '#b6fbff');
    g.addColorStop(1, '#00a8ff');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx, cy - CRYSTAL.H / 2);
    c.lineTo(cx + CRYSTAL.W / 2, cy - 4);
    c.lineTo(cx, cy + CRYSTAL.H / 2);
    c.lineTo(cx - CRYSTAL.W / 2, cy - 4);
    c.closePath();
    c.fill();
    noGlow(c);
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx - CRYSTAL.W / 2, cy - 4);
    c.lineTo(cx + CRYSTAL.W / 2, cy - 4);
    c.moveTo(cx, cy - CRYSTAL.H / 2);
    c.lineTo(cx, cy + CRYSTAL.H / 2);
    c.stroke();
  });

  generatePlayerFrames(scene);
}

/** Draws one robot-runner pose. `leg` in [-1,1] drives the run cycle. */
function drawRunner(c, w, h, { legA = 0, legB = 0, armA = 0, lean = 0, dead = false, tuck = false }) {
  const cx = w / 2;
  const feet = h - 3;
  c.save();
  c.translate(cx, feet);
  c.rotate(lean);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  glow(c, css(COLORS.CYAN), 10);
  const limb = (x, y, len, ang, col, width) => {
    c.strokeStyle = col;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(ang) * len, y + Math.cos(ang) * len);
    c.stroke();
  };
  const hipY = -22;
  // back leg + arm, then body, then front leg + arm
  limb(0, hipY, tuck ? 14 : 22, legB, '#5b2fa8', 6);
  limb(0, -38, 16, -armA, '#5b2fa8', 5);
  // torso
  c.fillStyle = '#1b1040';
  c.strokeStyle = css(COLORS.CYAN);
  c.lineWidth = 2.5;
  c.beginPath();
  rrect(c, -9, -44, 18, 24, 5);
  c.fill();
  c.stroke();
  // visor head
  c.fillStyle = '#120a30';
  c.beginPath();
  rrect(c, -9, -60, 20, 15, 6);
  c.fill();
  c.stroke();
  noGlow(c);
  glow(c, css(COLORS.MAGENTA), 8);
  c.fillStyle = dead ? '#ff3b3b' : css(COLORS.MAGENTA);
  if (dead) {
    c.fillRect(0, -56, 10, 2);
    c.fillRect(4, -58, 2, 10);
  } else {
    c.fillRect(1, -55, 9, 4);
  }
  noGlow(c);
  glow(c, css(COLORS.CYAN), 8);
  limb(0, hipY, tuck ? 14 : 22, legA, css(COLORS.CYAN), 6);
  limb(0, -38, 16, armA, css(COLORS.CYAN), 5);
  // scarf
  c.strokeStyle = css(COLORS.MAGENTA);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-8, -48);
  c.quadraticCurveTo(-20, -48 - armA * 6, -26, -44 + armA * 8);
  c.stroke();
  c.restore();
}

function generatePlayerFrames(scene) {
  const w = PLAYER.TEXTURE_W;
  const h = PLAYER.TEXTURE_H;
  const run = [
    { legA: 0.9, legB: -0.9, armA: -0.9 },
    { legA: 0.3, legB: -0.2, armA: -0.3, lean: 0.05 },
    { legA: -0.9, legB: 0.9, armA: 0.9 },
    { legA: -0.2, legB: 0.3, armA: 0.3, lean: 0.05 },
  ];
  run.forEach((pose, i) => canvasTexture(scene, `player_run${i}`, w, h, (c) => drawRunner(c, w, h, { lean: 0.12, ...pose })));
  canvasTexture(scene, 'player_jump', w, h, (c) => drawRunner(c, w, h, { legA: 0.7, legB: -0.3, armA: -1.2, lean: 0.05, tuck: true }));
  canvasTexture(scene, 'player_fall', w, h, (c) => drawRunner(c, w, h, { legA: 0.2, legB: -0.4, armA: 1.4, lean: 0.18 }));
  canvasTexture(scene, 'player_dead', w, h, (c) => drawRunner(c, w, h, { legA: 0.5, legB: -0.7, armA: 1.6, lean: -0.5, dead: true }));
}

/** Registers global animations once (animations live on the game, not the scene). */
export function createAnimations(scene) {
  if (scene.anims.exists('player-run')) return;
  scene.anims.create({
    key: 'player-run',
    frames: [0, 1, 2, 3].map((i) => ({ key: `player_run${i}` })),
    frameRate: 12,
    repeat: -1,
  });
}
