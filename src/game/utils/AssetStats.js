/**
 * Asset measurement: how long texture generation takes and how much GPU memory
 * the generated textures occupy (width * height * 4 bytes, RGBA8, no mipmaps).
 */

const BYTES_PER_PIXEL = 4;

/** @param {{key:string,width:number,height:number}[]} items */
export function summarizeTextures(items) {
  const rows = items
    .map(({ key, width, height }) => ({ key, width, height, bytes: width * height * BYTES_PER_PIXEL }))
    .sort((a, b) => b.bytes - a.bytes);
  const totalBytes = rows.reduce((sum, r) => sum + r.bytes, 0);
  return { rows, totalBytes };
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** Collects every user-generated texture from a Phaser TextureManager (skips built-ins). */
export function collectTextures(textureManager) {
  const items = [];
  for (const key of textureManager.getTextureKeys()) {
    if (key.startsWith('__')) continue;
    const src = textureManager.get(key).getSourceImage();
    items.push({ key, width: src.width, height: src.height });
  }
  return items;
}

/** Runs `fn`, returns its duration in ms. */
export function timeIt(fn) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

export function logTextureReport(ms, textureManager) {
  const { rows, totalBytes } = summarizeTextures(collectTextures(textureManager));
  console.groupCollapsed(`[NEON RUNNER] textures: ${rows.length}, ${formatBytes(totalBytes)}, generated in ${ms.toFixed(1)} ms`);
  console.table(rows.map((r) => ({ key: r.key, size: `${r.width}x${r.height}`, memory: formatBytes(r.bytes) })));
  console.groupEnd();
}
