import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          calendar: ['@fullcalendar/react', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/core'],
          ui: ['framer-motion', 'lucide-react', 'react-hot-toast'],
          query: ['@tanstack/react-query', 'axios'],
          utils: ['jspdf', 'xlsx', 'socket.io-client', 'zustand']
        }
      }
    }
  }
})
