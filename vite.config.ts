import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          mermaid: ['mermaid'],
          katex: ['katex'],
          hljs: ['highlight.js'],
        },
      },
    },
  },
});
