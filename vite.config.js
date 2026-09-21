import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteApiDev } from './scripts/vite-api-dev.mjs'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteApiDev()],
  server: { port: 5173, open: false },
})
