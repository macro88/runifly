import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://runifly.com/ is served at the domain root. Dev, preview, and the
// production build all use `/`, so asset URLs and the Spotify redirect path
// stay at the root.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
