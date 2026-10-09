import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['plai-logo.jpg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CahierActif',
        short_name: 'CahierActif',
        description: 'Annoter un PDF ou une photo de feuille comme sur un cahier',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0f6e56',
        background_color: '#faf9f7',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,png,jpg,svg,woff2}'],
        globIgnores: ['spike-gestes.html'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // worker pdf.js ≈ 1 Mo
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
});
