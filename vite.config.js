import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // `command === 'serve'` is the dev server; 'build' is the production bundle.
  const isDev = command === 'serve';

  return {
    // Warnings are suppressed in dev only. On a production build we want
    // Rollup's bundle-size and circular-dependency warnings to be visible —
    // hiding them meant nobody ever saw the chunk-size report.
    logLevel: isDev ? 'error' : 'warn',
    build: {
      // Without a chunking strategy Rollup emitted one large vendor chunk, so
      // a patient on hotel wifi downloaded charting, mapping and animation code
      // before the first screen painted. Splitting the heavy, rarely-changing
      // libraries lets them cache independently of app code.
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-motion': ['framer-motion'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
          },
        },
      },
      // The default 500 kB warning fired constantly and was ignored; 900 kB
      // reflects what we actually consider acceptable for a split vendor chunk,
      // so a NEW warning means something genuinely regressed.
      chunkSizeWarningLimit: 900,
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
        // Builder/editor tooling — dev only. These were unconditionally true,
        // so the visual-edit agent, HMR notifier, navigation notifier and
        // analytics tracker were all compiled into the bundle real patients
        // download. They are development affordances, not product.
        hmrNotifier: isDev,
        navigationNotifier: isDev,
        analyticsTracker: isDev,
        visualEditAgent: isDev,
      }),
      react(),
    ],
  };
});
