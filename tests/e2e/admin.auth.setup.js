import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * One-time login capture for a SEPARATE, admin-role test account — mirrors
 * auth.setup.js exactly, but as its own identity so ai-agent.spec.js can
 * drive both a client leg (submit a nomination) and an admin leg (approve
 * it) in the same run. Sign in with an account that actually has the
 * admin/platform_admin role — ai-agent.spec.js preflights this and fails
 * with a clear message if the saved session doesn't have admin access.
 *
 * Run: npm run test:e2e:auth:admin   (opens a real browser window)
 *
 * The saved file contains a live session token — it is gitignored (same
 * tests/e2e/.auth/ rule as user.json) and must never be committed.
 */
const authFile = 'tests/e2e/.auth/admin.json';

test('capture authenticated admin session', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/login');
  console.log('\n>> Sign in as an ADMIN account in the browser window that just opened.');
  console.log('>> Phone path: the "DEMO MODE" banner shows the code to type,');
  console.log('>> then finish with Google. Or just use "Continue with Google".');
  console.log('>> Waiting up to 4 minutes for you to reach the dashboard/admin area...\n');

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 240_000 });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  console.log(`\n>> Admin session saved to ${authFile}.`);
  console.log('>> Now run: npm run test:e2e:ai\n');
});
