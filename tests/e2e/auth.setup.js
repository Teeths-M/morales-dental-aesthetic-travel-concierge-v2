import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * One-time login capture.
 *
 * The phone-OTP screen still creates the real session via Google OAuth, and
 * Google blocks headless automation — so this MUST run headed and you complete
 * the sign-in yourself, once. Playwright then saves the authenticated session
 * (cookies + localStorage) so every other spec can run headless as you.
 *
 * Run: npm run test:e2e:auth   (opens a real browser window)
 *
 * The saved file contains a live session token — it is gitignored and must
 * never be committed.
 */
const authFile = 'tests/e2e/.auth/user.json';

test('capture authenticated session', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/login');
  console.log('\n>> Sign in in the browser window that just opened.');
  console.log('>> Phone path: the "DEMO MODE" banner shows the code to type,');
  console.log('>> then finish with Google. Or just use "Continue with Google".');
  console.log('>> Waiting up to 4 minutes for you to reach the dashboard...\n');

  await page.waitForURL('**/dashboard**', { timeout: 240_000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  console.log(`\n>> Session saved to ${authFile}.`);
  console.log('>> Now run: npm run test:e2e:journey\n');
});
