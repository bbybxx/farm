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
        console.log('✅ Service worker copied to dist/')
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        // Configure via VITE_API_ENDPOINT env var - contact FarmRPG devs for access
        target: process.env.VITE_API_ENDPOINT || 'https://api.buddy.farm',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
