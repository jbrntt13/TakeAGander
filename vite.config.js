import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/honks': 'http://localhost:3000',
      '/api/login': 'http://localhost:3000',
      '/api/leaderboard': 'http://localhost:3000',
      '/api/watchtime': 'http://localhost:3000',
      '/api/watchboard': 'http://localhost:3000',
      '/api/visitors': 'http://localhost:3000',
    },
  },
})
