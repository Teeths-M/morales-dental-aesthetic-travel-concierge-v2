import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'url'

 
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Enable content hashing for CDN caching
    rollupOptions: {
      output: {
        // Content-hash filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Enable minification
    minify: 'terser',
    // Source maps for error tracking
    sourcemap: true,
  },
  // CDN configuration for production
  base: '/',
})