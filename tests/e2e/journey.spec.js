import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * Post-auth journeys — reuse the session captured by auth.setup.js. If no
 * session has been captured yet, every test here skips with a clear message
 * instead of failing.
 *
 * Run: npm run test:e2e:journey
 *
 * These start intentionally conservative (prove the session works, screenshot
 * the real authed screens). Tighten the medical-step assertions after the first
 * run, once the screenshots show exactly what renders for your account.
 */
const authFile = 'tests/e2e/.auth/user.json';
const hasAuth = fs.existsSync(authFile);

test.describe('Authenticated journey (reuses saved login)', () => {
  test.skip(!hasAuth, 'No saved session — run `npm run test:e2e:auth` once to capture a login.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('dashboard loads while authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // A valid session stays on /dashboard; an invalid one bounces to /login.
    await expect(page).not.toHaveURL(/\/login/);
    await page.screenshot({ path: 'test-results/20-dashboard.png', fullPage: true });
  });

  test('intake is reachable while authenticated', async ({ page }) => {
    await page.goto('/intake');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'test-results/21-intake-authed.png', fullPage: true });
  });
});
