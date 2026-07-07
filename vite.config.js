import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_PATH = '/organizer/'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Organizer',
        short_name: 'Organizer',
        description: 'Your calm space for uni work.',
        theme_color: '#f7f6f4',
        background_color: '#f7f6f4',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
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
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  base: BASE_PATH,
})
