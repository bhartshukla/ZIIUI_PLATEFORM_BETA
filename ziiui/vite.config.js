import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative asset URLs, so the build works from any sub-path (GitHub Pages, etc.)
  base: './',
  build: {
    rollupOptions: {
      // Multi-page app: one entry per HTML file.
      input: {
        index: resolve(__dirname, 'index.html'),
        ai: resolve(__dirname, 'ai.html'),
        context: resolve(__dirname, 'context.html'),
        docs: resolve(__dirname, 'docs.html')
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js']
  }
});
