/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `base: './'` keeps asset paths relative, so the build works on GitHub Pages
// (served from /evenly/) and from any other sub-path without changes.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
