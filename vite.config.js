import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    // i18next@26 uses `exports` conditions ('import'/'require') that Rollup's
    // node-resolve fails to match on Linux CI. Pin direct paths to the ESM
    // dist files so Rollup never needs to walk the package.json exports field.
    alias: {
      'i18next': path.resolve(__dirname, 'node_modules/i18next/dist/cjs/i18next.js'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next/dist/commonjs/index.js'),
      'i18next-browser-languagedetector': path.resolve(__dirname, 'node_modules/i18next-browser-languagedetector/dist/cjs/i18nextBrowserLanguageDetector.js'),
    },
  },
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    },
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});