import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served at /<repo>/ — keep this in sync with the repo name.
export default defineConfig({
  plugins: [react()],
  base: '/poc-hackathon-team-razors-edge/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
