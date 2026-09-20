import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
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

const STRIP_META_CSP_ON_NATIVE = true

function nativeCspStrip() {
  return {
    name: 'native-csp-strip',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!IS_NATIVE || !STRIP_META_CSP_ON_NATIVE) return html
        return html.replace(
          /\s*<meta http-equiv="Content-Security-Policy" content="[\s\S]*?"\s*\/>/,
          '',
        )
      },
    },
  }
}

const TESSERACT_FILES = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
]

function tesseractAssets() {
  const resolve = rel => path.join(__dirname, 'node_modules', rel)
  return {
    name: 'tesseract-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = TESSERACT_FILES.find(([, name]) => req.url?.includes(`/tesseract/${name}`))
        if (!match) return next()
        res.setHeader('Content-Type', 'text/javascript')
        fs.createReadStream(resolve(match[0])).pipe(res)
      })
    },
    generateBundle() {
      for (const [rel, name] of TESSERACT_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `tesseract/${name}`,
          source: fs.readFileSync(resolve(rel)),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stripAnalytics(),
    nativeCspStrip(),
    tesseractAssets(),
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
        globIgnores: ['**/tesseract*', '**/*.traineddata*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
    include: ['tests/**/*.test.js'],
  },
})
