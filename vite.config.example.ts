import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-service-worker',
      writeBundle() {
        copyFileSync(
          resolve(__dirname, 'public/service-worker.js'),
          resolve(__dirname, 'dist/service-worker.js')
        )
        console.log('[SUCCESS] Service worker copied to dist/')
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        // Configure via VITE_API_ENDPOINT env var
        // Contact FarmRPG community for API access
        target: process.env.VITE_API_ENDPOINT || 'https://YOUR_API_ENDPOINT_HERE',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    minify: 'terser',
    chunkSizeWarningLimit: 2000, // Increase for large JSON files
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split large quest data into separate chunk
          if (id.includes('quests-api.json')) {
            return 'quests-data'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
