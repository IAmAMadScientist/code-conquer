import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Ensure deep links like /bitjumper work (SPA history fallback)
  appType: 'spa',
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.bin'],
  // Use relative /api everywhere (prod & dev). In dev, proxy to the Spring backend.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
