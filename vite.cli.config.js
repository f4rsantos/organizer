import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __NATIVE_BUILD__: JSON.stringify(false),
  },
  build: {
    ssr: 'src/cli/main.js',
    outDir: 'dist-cli',
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: {
      output: {
        entryFileNames: 'organizer.mjs',
        banner: '#!/usr/bin/env node',
        codeSplitting: false,
      },
    },
  },
})
