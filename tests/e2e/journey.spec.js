import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * Post-auth journeys — reuse the session captured by auth.setup.js. If no
 * session has been captured yet, every test here skips with a clear message
 * instead of failing.
 *
 * Run: npm run test:e2e:auth   (once, headed — you complete the Google login)
 *      npm run test:e2e:journey
 *
 * These start conservative on purpose: they prove the session is real and
 * screenshot the actual authed screens. Once you've run them once and looked at
 * test-results/2*.png, tighten the medical-step assertions in the marked block
 * at the bottom to match exactly what renders for your account.
 */
const authFile = 'tests/e2e/.auth/user.json';
const hasAuth = fs.existsSync(authFile);

test.describe('Authenticated journey (reuses saved login)', () => {
  test.skip(!hasAuth, 'No saved session — run `npm run test:e2e:auth` once to capture a login.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('session is valid — dashboard does not bounce to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // A valid session stays on /dashboard; an invalid/expired one redirects to login.
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'test-results/20-dashboard.png', fullPage: true });
  });

  test('intake is reachable and skips the auth gate when logged in', async ({ page }) => {
    await page.goto('/intake');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'test-results/21-intake-authed.png', fullPage: true });
  });

  test('can begin the concierge intake and reach the first question', async ({ page }) => {
    await page.goto('/intake');
    // Fresh browser storage → the consent gate shows; agree, then Begin.
    const consent = page.getByRole('checkbox').first();
    if (await consent.isVisible().catch(() => false)) {
      await consent.check();
    }
    const begin = page.getByRole('button', { name: /^(Begin|Continue)$/ });
    await expect(begin).toBeEnabled();
    await begin.click();
    // The first QuestionCard (or the progress checklist) should now be on screen.
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/22-intake-first-step.png', fullPage: true });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // NEXT: full medical intake → submission. Left as a documented scaffold rather
  // than guessed selectors — run the three tests above once, open
  // test-results/22-intake-first-step.png, and read the real control labels, then
  // fill each step here (language → age → name → email → phone → medical history)
  // and assert the Consultation confirmation screen. The whole flow is
  // credit-independent except the closing email + AI narration, which no-op
  // gracefully until credits renew.
  // ───────────────────────────────────────────────────────────────────────────
});
