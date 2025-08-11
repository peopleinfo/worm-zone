import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode  }) => {
  const isDev = mode  === 'development'
  return {
    plugins: [react()],
    base: isDev ? '/' : './', // Absolute paths in dev, relative in prod
    build: {
      outDir: 'dist',
      assetsDir: '.',
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      }
    },
  }
})