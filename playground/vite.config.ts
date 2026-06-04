import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  },
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    // 代理 /api 至后端服务，解决 CORS 问题
    proxy: {
      '/api': {
        target: 'http://localhost:7001',
        changeOrigin: true
      }
    }
  },
})
