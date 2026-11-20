import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any sub-path or static host.
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    // Phaser alone is ~1.2 MB minified; it is split into its own long-cacheable chunk.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: true, port: 5173 },
});
