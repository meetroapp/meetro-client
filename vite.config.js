import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    'globalThis.__MEETRO_BUILD_ID__': JSON.stringify(
      process.env.VITE_APP_BUILD_ID ||
        process.env.VITE_APP_VERSION ||
        new Date().toISOString()
    ),
  },
  plugins: [react()],
})
