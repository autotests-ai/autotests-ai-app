import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const reactUiSrc = resolve(__dirname, 'vendor/react-ui/src/index.ts');
const mountBase = '/';

export default defineConfig({
  root: resolve(__dirname),
  base: mountBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: 'autotests.ai',
        short_name: 'autotests.ai',
        description: 'autotests-ai-app — TypeScript React SPA',
        start_url: mountBase,
        scope: mountBase,
        display: 'standalone',
        theme_color: '#151414',
        background_color: '#151414',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          'index.html',
          'assets/index.js',
          'assets/index.css',
          'manifest.webmanifest',
          'icons/pwa-192.png',
          'icons/pwa-512.png',
          'icons/pwa-maskable-512.png',
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /\/api\//,
          /\.(?:css|js|mjs|map|png|svg|ico|webmanifest|json|woff2?)$/i,
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    // vendor/react-ui imports `react` by name — keep this package's copy so the
    // alias does not pick up a second React higher in the tree ("Invalid hook call").
    dedupe: ['react', 'react-dom'],
    alias: {
      '@zero-design-system/react': reactUiSrc,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
