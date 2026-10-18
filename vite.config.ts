import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 相對路徑：放在網域根目錄或子路徑（例如 GitHub Pages 的 /jungle-chess/）都能用。
  base: './',
  plugins: [
    react(),
    // PWA：可以加到主畫面、離線玩。圖示由 public/icon.svg 產生（npm run icons）。
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '動物棋',
        short_name: '動物棋',
        description: '給小朋友玩的鬥獸棋，可以和電腦或家人一起下。',
        lang: 'zh-Hant',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f2f6ea',
        theme_color: '#f2f6ea',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 遊戲音效與動物叫聲只預先快取網頁版 MP3；WAV 母檔與音效試聽頁不放進離線快取。BGM 見下方。
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}', 'audio/{sfx,animals}/*.mp3'],
        globIgnores: ['**/node_modules/**', 'audio-preview/**'],
        cleanupOutdatedCaches: true,
        // 字型來自 Google Fonts：第一次連網時存起來，之後離線也有圓體字。
        runtimeCaching: [
          // 背景音樂約 1 MB：不預先下載，第一次播放時存起來，之後離線也有音樂（檔名帶版本，換版會換網址）。
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/bgm/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bgm',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
