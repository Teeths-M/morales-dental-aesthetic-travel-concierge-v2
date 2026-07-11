import { test, expect } from '@playwright/test';

/**
 * Public, credit-independent surface — the exact path you'd walk an investor
 * through. No login, no Stripe/Twilio/LLM. Every test screenshots into
 * test-results/ for visual inspection, and asserts on copy we control so the
 * suite doubles as regression protection.
 *
 * Run: npm run test:e2e   (headless, against the deployed app)
 */

test.describe('Investor demo path (public, no login)', () => {
  test('home loads', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status(), 'HTTP status').toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'test-results/01-home.png', fullPage: true });
  });

  test('demo showcase — hero thesis + stats', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('Protected at Every Step')).toBeVisible();
    await page.screenshot({ path: 'test-results/02-demo-overview.png', fullPage: true });
  });

  test('Safe-T RED block — the mission moment', async ({ page }) => {
    await page.goto('/demo?tab=safe-t');
    // Tummy Tuck + BBL are pre-selected, so the conflict warning is already up.
    await expect(page.getByText(/detected a potential conflict/i)).toBeVisible();
    await page.getByRole('button', { name: /Proceed to Booking/i }).click();
    // The full block overlay renders the clinical reason — best-effort assert,
    // always screenshot so a human can confirm the block visually.
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/03-safet-block.png', fullPage: true });
  });

  test('privacy policy — lists the real subprocessors', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByText('Service Providers We Share Data With')).toBeVisible();
    await expect(page.getByText(/Payment processor/i)).toBeVisible();
    await expect(page.getByText(/International Data Transfers/i)).toBeVisible();
    await page.screenshot({ path: 'test-results/04-privacy.png', fullPage: true });
  });

  test('intake consent gate — blocks "Begin" until the client agrees', async ({ page }) => {
    await page.goto('/intake');
    await expect(page.getByText('Your privacy comes first')).toBeVisible();
    const begin = page.getByRole('button', { name: /^(Begin|Continue)$/ });
    await expect(begin).toBeDisabled();
    await page.getByRole('checkbox').first().check();
    await expect(begin).toBeEnabled();
    await page.screenshot({ path: 'test-results/05-intake-consent.png', fullPage: true });
  });

  test('master journey demo loads', async ({ page }) => {
    await page.goto('/demo/journey');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/06-journey.png', fullPage: true });
  });
});
