import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true, timeout: 60000 },
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'hls':   ['hls.js'],
          'react': ['react', 'react-dom'],
          'router':['react-router-dom'],
          'state': ['zustand', '@tanstack/react-query'],
          'utils': ['axios', 'date-fns'],
        },
      },
    },
  },
})
