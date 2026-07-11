import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Dedicated Vitest config (kept separate from vite.config.js so the app build
// is never affected). Resolves the same `@/` alias the app uses.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(dir, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
