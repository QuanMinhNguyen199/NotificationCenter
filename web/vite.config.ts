import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { chartColorsApi } from './chartColorsApi.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), chartColorsApi()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // Listen on every interface and allow VS Code / Dev Tunnels forwarded hosts
  server: { host: true, allowedHosts: ['.devtunnels.ms'] },
})
