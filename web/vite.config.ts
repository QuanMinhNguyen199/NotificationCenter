import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { chartColorsApi } from './chartColorsApi.ts'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site under /NotificationCenter/; local dev and preview stay at /.
  base: process.env.GITHUB_PAGES ? '/NotificationCenter/' : '/',
  plugins: [react(), tailwindcss(), chartColorsApi()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // Listen on every interface and allow VS Code / Dev Tunnels forwarded hosts
  server: { host: true, allowedHosts: ['.devtunnels.ms'] },
  // Tách thư viện nền thành chunk riêng: chunk chính nhỏ hơn và trình duyệt giữ cache khi code ứng dụng đổi.
  // ECharts đã tách riêng qua dynamic import (shared/components/Chart.tsx).
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
            { name: 'ui', test: /node_modules[\/](radix-ui|@radix-ui|@floating-ui|lucide-react|sonner|cmdk|react-day-picker|date-fns)[\/]/ },
            { name: 'motion', test: /node_modules[\/](motion|framer-motion|motion-dom|motion-utils)[\/]/ },
            { name: 'query', test: /node_modules[\/]@tanstack[\/]/ },
          ],
        },
      },
    },
  },
})
