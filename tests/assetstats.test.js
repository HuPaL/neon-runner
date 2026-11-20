import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTextures, formatBytes } from '../src/game/utils/AssetStats.js';

test('summarizeTextures sorts by size and sums RGBA bytes', () => {
  const { rows, totalBytes } = summarizeTextures([
    { key: 'small', width: 4, height: 4 },
    { key: 'big', width: 10, height: 10 },
  ]);
  assert.equal(rows[0].key, 'big');
  assert.equal(rows[0].bytes, 400);
  assert.equal(totalBytes, 400 + 64);
});

test('formatBytes picks a sensible unit', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB');
});
