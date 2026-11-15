import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'push-sw.js'],
      manifest: {
        name: 'Damar Kost',
        short_name: 'Damar Kost',
        description: 'Pengelolaan kos & homestay Damar Kost',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBF9F3',
        theme_color: '#3B4A2C',
        // Pintasan saat ikon ditekan lama (Android; iPhone belum mendukung)
        shortcuts: [
          { name: 'Catat bayar', short_name: 'Tagihan', url: '/#/tagihan', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Homestay', short_name: 'Homestay', url: '/#/homestay', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        importScripts: ['push-sw.js'],
      },
    }),
  ],
  server: { host: true },
})
