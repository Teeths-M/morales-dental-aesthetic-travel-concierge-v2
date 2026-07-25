import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Loads settings (API keys, test mailbox, etc.) from a local .env.local file
// — the same file this project already uses for VITE_BASE44_APP_ID etc. —
// so nobody has to type them into a terminal. That file is gitignored and
// never leaves your machine.
dotenv.config({ path: '.env.local' });

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
    // One-time login capture (run headed). Google blocks sign-in from
    // Playwright's own bundled test browser ("This browser or app may not
    // be secure") even when headed — using the real installed Edge instead
    // (a normal branded browser, not a bare test one) avoids that block.
    // Anchored so this never also matches admin.auth.setup.js below (that
    // filename contains "auth.setup.js" as a substring — an unanchored
    // regex here would match both files and open two browser windows at once).
    { name: 'setup', testMatch: /(^|\/)auth\.setup\.js$/, use: { channel: 'msedge' } },
    // Same capture, for a second SEPARATE admin-role test account — needed
    // by the ai-agent project's admin leg (approve a nomination).
    { name: 'setup-admin', testMatch: /admin\.auth\.setup\.js$/, use: { channel: 'msedge' } },
    // Post-auth journeys — reuse the session saved by the setup project.
    { name: 'authenticated', testMatch: /journey\.spec\.js/ },
    // Partner signup flows — reuses the saved auth session (same as authenticated).
    // partner-signup.spec.js also carries a no-auth reachability layer that runs
    // even without a captured session (the full journeys skip themselves).
    { name: 'partner-signup', testMatch: /(doctor|partner)-signup\.spec\.js/ },
    // Morales-specific LIVE edge checks (mobile overlap + unauth endpoint probe).
    // Read-only against the deployed app; no login required.
    { name: 'morales-live', testMatch: /morales-live\.spec\.js/ },
    // AI-agent-driven journey — an LLM picks what to click/fill from a
    // natural-language task instead of hardcoded selectors, reusing the
    // client + admin sessions saved by setup/setup-admin. Manual/local only
    // (not wired into CI) — needs ANTHROPIC_API_KEY + a test mailbox; skips
    // itself cleanly when those aren't configured. See tests/e2e/lib/aiAgent.js.
    { name: 'ai-agent', testMatch: /ai-agent\.spec\.js/, timeout: 180_000 },
    // Internal red-team of the safety-decision layer — deterministic, no browser,
    // no network, no credits. Runs in CI whenever the AI functions change.
    { name: 'redteam', testDir: './tests/redteam', testMatch: /.*\.spec\.js/ },
  ],
});