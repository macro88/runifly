import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo at /runifly/. The dev server stays at /
// so http://127.0.0.1:5173/ and the local Spotify redirect keep working.
// `vite preview` uses production mode, so it serves dist under /runifly/.
const pagesBase = '/runifly/'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? pagesBase : '/',
  plugins: [react()],
}))
