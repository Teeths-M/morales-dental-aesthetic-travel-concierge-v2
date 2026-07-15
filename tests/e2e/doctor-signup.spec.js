import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * Doctor Signup — surgical E2E test
 *
 * Walks the full 5-step doctor signup flow:
 *   Step 1: Personal info (name, email, phone, country, city, background)
 *   Step 2: Procedure category selection
 *   Step 2b: Per-procedure pricing
 *   Step 3: License upload + payout details + submit (creates Doctor entity)
 *   Step 4: Internet Intelligence scan (skip or continue)
 *   Step 5: Success screen
 *
 * Reuses the saved auth session from auth.setup.js — run that once first:
 *   npm run test:e2e:auth
 * Then:
 *   npx playwright test --project=partner-signup
 *
 * NOTE: This test creates a real Doctor record with a timestamp-based email.
 * Clean up via admin dashboard after the run if needed.
 */
const authFile = 'tests/e2e/.auth/user.json';
const hasAuth = fs.existsSync(authFile);

test.describe('Doctor Signup Flow', () => {
  test.skip(!hasAuth, 'No saved session — run `npm run test:e2e:auth` once to capture a login.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('completes full doctor signup from Step 1 to Success screen', async ({ page }) => {
    const testEmail = `dr.test.${Date.now()}@example.com`;

    // ── Navigate ──
    await page.goto('/doctor-signup');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('SAFE-T 4LIFE')).toBeVisible();
    // Wait for auto-detection to settle before overriding the country
    await page.waitForTimeout(2000);

    // ── Step 1: Personal Info ──
    await page.fill('input[placeholder="Dr. Jane Smith"]', 'Dr. Test Manual');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="+1 868 123 4567"]', '+1 555 123 4567');

    // Country — Radix Select
    await page.locator('button[role="combobox"]').click();
    await page.locator('[role="option"]:has-text("Mexico")').click();

    // City — custom dropdown
    await page.locator('button:has-text("Select a city")').click();
    await page.locator('li:has-text("Cancun")').click();

    // Professional background + experience
    await page.fill('input[placeholder="Education, certifications, board memberships"]', 'MD, Board Certified');
    await page.fill('input[type="number"]', '10');

    // Click Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.screenshot({ path: 'test-results/doctor-step1-done.png', fullPage: true });

    // ── Step 2: Categories & Procedures ──
    // Clicking a category auto-selects all procedures within it
    await page.locator('button:has-text("General Dentistry")').click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Next/i }).click();
    await page.screenshot({ path: 'test-results/doctor-step2-done.png', fullPage: true });

    // ── Step 2b: Pricing ──
    // Fill every price input with a default value
    const priceInputs = page.locator('input[type="number"]');
    const priceCount = await priceInputs.count();
    for (let i = 0; i < priceCount; i++) {
      await priceInputs.nth(i).fill('500');
    }

    await page.getByRole('button', { name: /Continue/i }).click();
    await page.screenshot({ path: 'test-results/doctor-step2b-done.png', fullPage: true });

    // ── Step 3: License & Payout ──
    // License number
    await page.fill('input[placeholder="e.g. CO-123456 or RETHUS-789"]', 'TEST-LIC-12345');

    // Upload license file (in-memory buffer — no fixture file needed)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-license.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\nTest license document'),
    });
    // Wait for upload to complete — the file name appears with a checkmark
    await expect(page.getByText(/✓ test-license\.pdf/)).toBeVisible({ timeout: 15000 });

    // Payout method
    await page.locator('button:has-text("Stripe")').click();
    await page.fill('input[placeholder="acct_XXXXXXXXXXXXXXXX"]', 'acct_test_12345678');

    // Legal confirmation checkbox (Radix renders as button[role="checkbox"])
    await page.locator('button[role="checkbox"]').click();

    // Submit — the button says "Submit & Join" or similar
    await page.getByRole('button', { name: /Submit|Join/i }).click();
    await page.screenshot({ path: 'test-results/doctor-step3-done.png', fullPage: true });

    // ── Step 4: Internet Intelligence Scan ──
    // The scan auto-starts. Wait for it to finish or error, then click
    // whichever button appears: "Continue to Confirmation", "I Understand",
    // or "Skip — admin will review manually".
    const continueBtn = page.getByRole('button', { name: /Continue to Confirmation/i });
    const understandBtn = page.getByRole('button', { name: /I Understand/i });
    const skipLink = page.getByText(/Skip.*admin will review/i);

    // Race: whichever appears first
    await expect.poll(async () => {
      return (await continueBtn.isVisible().catch(() => false)) ||
             (await understandBtn.isVisible().catch(() => false)) ||
             (await skipLink.isVisible().catch(() => false));
    }, { timeout: 45_000, message: 'Intelligence scan did not finish in time' }).toBeTruthy();

    if (await skipLink.isVisible().catch(() => false)) {
      await skipLink.click();
    } else if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    } else {
      await understandBtn.click();
    }

    // ── Step 5: Success ──
    // The success screen shows "Portal access sent to {email}" — proving the
    // Doctor entity was created with our test email.
    await expect(page.getByText(`Portal access sent to ${testEmail}`)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Go to Doctor Dashboard/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/doctor-signup-success.png', fullPage: true });
  });
});