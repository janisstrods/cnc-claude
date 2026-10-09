/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative asset paths: the site is served from a sub-path on GitHub Pages (routes are hash-based)
  base: './',
  // GitHub Pages serves main:/docs, so the build is committed there
  build: { outDir: 'docs', emptyOutDir: true },
  plugins: [react()],
  worker: { format: 'es' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
  },
});
