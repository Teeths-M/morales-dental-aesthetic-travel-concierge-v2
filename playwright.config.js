import { defineConfig } from '@playwright/test';

// Point at the deployed app by default — local dev can't complete a Base44
// session (no local credentials). Override with E2E_BASE_URL when needed.
const BASE_URL = process.env.E2E_BASE_URL || 'https://sentinel-dental-care.base44.app';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    // Public, credit-independent surface — the investor demo path. No login.
    { name: 'public', testMatch: /public\.spec\.js/ },
    // One-time login capture (run headed). Google OAuth can't be automated.
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    // Post-auth journeys — reuse the session saved by the setup project.
    { name: 'authenticated', testMatch: /journey\.spec\.js/ },
    // Morales-specific LIVE edge checks (mobile overlap + unauth endpoint probe).
    // Read-only against the deployed app; no login required.
    { name: 'morales-live', testMatch: /morales-live\.spec\.js/ },
    // Internal red-team of the safety-decision layer — deterministic, no browser,
    // no network, no credits. Runs in CI whenever the AI functions change.
    { name: 'redteam', testDir: './tests/redteam', testMatch: /.*\.spec\.js/ },
  ],
});
