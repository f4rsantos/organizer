import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IS_NATIVE = process.env.BUILD_TARGET === 'native'
const BASE_PATH = IS_NATIVE ? './' : '/organizer/'
const MANIFEST_SCOPE = IS_NATIVE ? '.' : BASE_PATH

const ANALYTICS_BLOCK = /\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/

function stripAnalytics() {
  return {
    name: 'strip-analytics',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: html => (IS_NATIVE ? html.replace(ANALYTICS_BLOCK, '\n  ') : html),
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stripAnalytics(),
    VitePWA({
      disable: IS_NATIVE,
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Organizer',
        short_name: 'Organizer',
        description: 'Your calm space for uni work.',
        theme_color: '#f7f6f4',
        background_color: '#f7f6f4',
        display: 'standalone',
        start_url: MANIFEST_SCOPE,
        scope: MANIFEST_SCOPE,
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Tasks', short_name: 'Tasks', url: `${BASE_PATH}?tab=tasks`, icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
          { name: 'Kanban', short_name: 'Kanban', url: `${BASE_PATH}?tab=kanban`, icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
          { name: 'Calendar', short_name: 'Calendar', url: `${BASE_PATH}?tab=calendar`, icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
          { name: 'Focus', short_name: 'Focus', url: `${BASE_PATH}?tab=focus`, icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
        ],
      },
      workbox: {
        navigateFallback: `${BASE_PATH}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __NATIVE_BUILD__: JSON.stringify(IS_NATIVE),
  },
  base: BASE_PATH,
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
