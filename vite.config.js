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
      '/api/goose-status': 'http://localhost:3000',
      '/api/heartbeat': 'http://localhost:3000',
      '/api/viewers': 'http://localhost:3000',
      '/api/goose-force': 'http://localhost:3000',
      '/api/goose-log': 'http://localhost:3000',
      '/api/goose-history': 'http://localhost:3000',
      '/api/goose-screenshot': 'http://localhost:3000',
    },
  },
})
