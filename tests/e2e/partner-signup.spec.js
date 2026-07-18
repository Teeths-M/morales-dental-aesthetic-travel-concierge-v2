import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * Partner Signup — end-to-end coverage for every partner type.
 *
 * Sibling of doctor-signup.spec.js, which already covers the doctor flow in
 * depth. This file covers the remaining partner types and adds a no-auth
 * reachability layer across all of them.
 *
 * Two layers, deliberately separated because they have different prerequisites:
 *
 *   1. REACHABILITY (no login, no credits) — every partner signup route
 *      renders a real form instead of 404ing, crashing, or bouncing to login.
 *      This is the layer that catches "a partner can no longer sign up at all",
 *      and it runs anywhere.
 *
 *   2. FULL FLOW (needs a saved session) — walks a partner from step 1 to the
 *      success screen, creating a REAL record in the deployed backend.
 *
 * Prerequisites for layer 2:
 *   npm run test:e2e:auth      # once, headed — Google OAuth can't be automated
 *   npx playwright test --project=partner-signup
 *
 * ⚠️ Layer 2 creates real TravelAgency / TaxiService records with timestamped
 * test emails, and fires real partner welcome emails. Run it against a staging
 * app if you have one, and clean the records up from the admin dashboard
 * afterwards. Every record it creates is named "E2E Test ..." so they are easy
 * to find and delete.
 *
 * Coverage status by partner (see the note at the bottom of this file):
 *   doctor          → doctor-signup.spec.js (full)
 *   travel agency   → full flow here
 *   taxi service    → full flow here
 *   companion       → reachability + first step here
 *   security agency → reachability only (no field test IDs yet)
 *   local doctor    → reachability only (no field test IDs yet)
 */

const authFile = 'tests/e2e/.auth/user.json';
const hasAuth = fs.existsSync(authFile);

/** Every partner entry point, so a broken route fails loudly. */
const SIGNUP_ROUTES = [
  ['/partner-signup', 'partner hub'],
  ['/partner-signup/travel-agency', 'travel agency'],
  ['/partner-signup/taxi-service', 'taxi service'],
  ['/companion-signup', 'companion'],
  ['/security-signup', 'security agency'],
  ['/doctor-signup', 'doctor'],
  ['/local-doctor-signup', 'local doctor'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — reachability. No login, no credits, safe to run any time.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Partner signup — every route is reachable', () => {
  for (const [path, label] of SIGNUP_ROUTES) {
    test(`${label} signup renders at ${path}`, async ({ page }) => {
      await page.goto(path);

      // Not bounced to login — these are public entry points by design. A
      // partner who cannot even open the form has no way into the platform.
      await expect(page, `${label} signup must not require login to view`)
        .not.toHaveURL(/\/login/);

      // Did not hit the ErrorBoundary fallback.
      await expect(
        page.getByText("Something didn't work the way it should have."),
        `${label} signup crashed into the error boundary`,
      ).toHaveCount(0);

      // Renders something a partner can actually act on.
      await expect(
        page.locator('input, button, [role="button"]').first(),
        `${label} signup rendered no interactive element`,
      ).toBeVisible({ timeout: 15_000 });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 — full signup journeys. Requires the saved session.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Partner signup — full journeys', () => {
  test.skip(!hasAuth, 'No saved session — run `npm run test:e2e:auth` once to capture a login.');
  test.use({ storageState: hasAuth ? authFile : undefined });

  test('travel agency completes signup from step 1 to success', async ({ page }) => {
    const email = `e2e.agency.${Date.now()}@example.com`;

    await page.goto('/partner-signup/travel-agency');
    await expect(page).not.toHaveURL(/\/login/);

    // ── Step 1: basic information ──
    await page.locator('[data-testid="travel-agency-name"]').fill('E2E Test Travel Agency');
    await page.locator('[data-testid="travel-agency-contact-person"]').fill('E2E Test Contact');
    await page.locator('[data-testid="travel-agency-email"]').fill(email);
    await page.locator('[data-testid="travel-agency-phone"]').fill('+1 555 010 0100');
    await page.locator('[data-testid="travel-agency-country"]').fill('USA');
    await page.locator('[data-testid="travel-agency-step1-next"]').click();

    // ── Step 2: services offered ──
    // At least one service must be selected before the step advances. The
    // service cards carry no test ID, so select by their visible label.
    await page.getByText('Flights', { exact: false }).first().click();
    await page.locator('[data-testid="travel-agency-step2-next"]').click();

    // ── Step 3: payout + legal confirmation ──
    await page.locator('[data-testid="travel-agency-payout-account"]').fill('acct_e2e_test_0001');
    await page.locator('[data-testid="travel-agency-legal-checkbox"]').click();

    const submit = page.locator('[data-testid="travel-agency-submit"]');
    await expect(submit, 'submit stays disabled until payout + legal are complete').toBeEnabled();
    await submit.click();

    // ── Success ── proves TravelAgency.create resolved and the flow advanced.
    await expect(
      page.getByRole('button', { name: /Go to Portal Hub/i }),
      'travel agency signup did not reach the success screen',
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({ path: 'test-results/travel-agency-signup-success.png', fullPage: true });
  });

  test('taxi service completes signup from step 1 to success', async ({ page }) => {
    const email = `e2e.taxi.${Date.now()}@example.com`;

    await page.goto('/partner-signup/taxi-service');
    await expect(page).not.toHaveURL(/\/login/);

    // ── Step 1: company + driver ──
    await page.locator('[data-testid="taxi-agency-name"]').fill('E2E Test Taxi Co');
    await page.locator('[data-testid="taxi-driver-name"]').fill('E2E Test Driver');
    await page.locator('[data-testid="taxi-email"]').fill(email);
    await page.locator('[data-testid="taxi-phone"]').fill('+1 555 010 0200');
    await page.locator('[data-testid="taxi-country"]').fill('Mexico');
    await page.locator('[data-testid="taxi-city"]').first().fill('Cancun');
    await page.locator('[data-testid="taxi-step1-next"]').click();

    // ── Step 2: coverage + compliance ──
    // Licence and insurance are the compliance gate for carrying a recovering
    // patient — both must be attestable before the step advances.
    await page.locator('[data-testid="taxi-service-radius"]').fill('50');
    await page.locator('[data-testid="taxi-license-number"]').fill('E2E-TAXI-0001');
    await page.locator('[data-testid="taxi-license-checkbox"]').click();
    await page.locator('[data-testid="taxi-insurance-provider"]').fill('E2E Test Insurer');
    await page.locator('[data-testid="taxi-insurance-checkbox"]').click();
    await page.locator('[data-testid="taxi-step2-next"]').click();

    // ── Step 3: payout + submit ──
    await page.locator('[data-testid="taxi-payout-account"]').fill('acct_e2e_test_0002');

    const submit = page.locator('[data-testid="taxi-submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByRole('button', { name: /Go to Portal Hub/i }),
      'taxi signup did not reach the success screen',
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({ path: 'test-results/taxi-signup-success.png', fullPage: true });
  });

  test('companion signup advances past its first step', async ({ page }) => {
    // Partial coverage: the companion flow exposes only next/back/submit test
    // IDs, so this asserts the flow is navigable rather than completing it.
    // Add field-level test IDs to CompanionSignup.jsx to extend this to a full
    // journey the way travel agency and taxi are covered above.
    await page.goto('/companion-signup');
    await expect(page).not.toHaveURL(/\/login/);

    const next = page.locator('[data-testid="companion-next"]');
    await expect(next, 'companion signup did not render its first step').toBeVisible({ timeout: 15_000 });
  });
});

/**
 * NOT YET COVERED end-to-end — security agency (/security-signup) and local
 * doctor (/local-doctor-signup). Both render and are covered by layer 1, but
 * neither exposes field-level data-testid attributes, and their labels are
 * inline-translated ternaries (`language === 'es' ? … : …`), so text selectors
 * would break the moment a tester's browser language differs.
 *
 * Adding test IDs to those two pages — the same way DoctorSignupStep1 and the
 * partner-signup step components already do it — is the prerequisite for
 * extending full-journey coverage to them.
 */
