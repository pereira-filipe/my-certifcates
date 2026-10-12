/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Same origin in dev: the browser calls /api on Vite, which forwards to Spring Boot.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    // pdf.js (the PDF viewer) is ~630 kB on its own, but it's loaded only when a visitor opens a PDF.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'], // e2e/ is for Playwright
  },
})
