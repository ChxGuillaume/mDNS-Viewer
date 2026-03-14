import { resolve } from 'node:path';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'src/mainview'),

  plugins: [vue(), ui()],

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@nuxt/ui'))
              return 'nuxt-ui';
            if (id.includes('@vue') || id.includes('vue-router'))
              return 'vue-core';
            return 'vendor';
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
  },
});
