import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/audios': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/analytics': 'http://localhost:3000'
    }
  }
})
