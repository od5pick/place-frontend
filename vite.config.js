
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // dev 서버 포트를 명시해 HMR WebSocket URL에 port가 빠지는 경우 완화
  server: {
    port: 5173,
  },
})
