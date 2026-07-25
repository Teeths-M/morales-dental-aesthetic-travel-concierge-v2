import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { runAgentTask } from './lib/aiAgent.js';
import { testMailboxConfigured, waitForTestEmail } from './lib/testMailbox.js';

/**
 * AI-agent-driven pilot: submit a doctor nomination as a client, approve it
 * as admin, confirm the real outreach email, then opt out. Dogfoods the
 * doctor-nomination feature end-to-end against the deployed app — the first
 * flow this session that had never actually been clicked through.
 *
 * Every real pass/fail check here is a normal Playwright/assertion against
 * live DOM or a live inbox — the agent only decides what to click. See
 * lib/aiAgent.js's header comment for why that split matters.
 *
 * Requires (all skip cleanly if any are missing, same as journey.spec.js):
 *   - tests/e2e/.auth/user.json    npm run test:e2e:auth
 *     ⚠ that account needs an existing, non-cancelled CaseRecord —
 *       submitDoctorNomination rejects nominations from accounts with no
 *       real case history.
 *   - tests/e2e/.auth/admin.json   npm run test:e2e:auth:admin
 *     (an account with the admin/platform_admin role)
 *   - ANTHROPIC_API_KEY
 *   - TEST_MAILBOX_HOST / TEST_MAILBOX_PORT / TEST_MAILBOX_USER /
 *     TEST_MAILBOX_PASSWORD, and optionally TEST_DOCTOR_EMAIL (defaults to
 *     TEST_MAILBOX_USER) — a mailbox the team owns. Never point this at a
 *     real doctor's address.
 *
 * Run: npm run test:e2e:ai
 */
const userAuthFile = 'tests/e2e/.auth/user.json';
const adminAuthFile = 'tests/e2e/.auth/admin.json';
const hasUserAuth = fs.existsSync(userAuthFile);
const hasAdminAuth = fs.existsSync(adminAuthFile);
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const hasMailbox = testMailboxConfigured();

const RUN_ID = Date.now().toString(36);
const TEST_DOCTOR_NAME = `Zzz Test Doctor ${RUN_ID}`;
const TEST_DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL || process.env.TEST_MAILBOX_USER;
// A unique marker instead of a free-written review — lets the mailbox check
// assert precisely that the review text never reaches the doctor, instead
// of guessing at keywords in whatever sentence the agent happened to write.
const REVIEW_MARKER = `TESTREVIEW-${RUN_ID}`;

test.describe('AI agent: doctor nomination, end to end', () => {
  test.skip(!hasUserAuth, 'No saved client session — run `npm run test:e2e:auth` once.');
  test.skip(!hasAdminAuth, 'No saved admin session — run `npm run test:e2e:auth:admin` once.');
  test.skip(!hasApiKey, 'ANTHROPIC_API_KEY is not set — this test drives the browser via Claude tool calls.');
  test.skip(!hasMailbox, 'TEST_MAILBOX_HOST/USER/PASSWORD are not set — cannot verify the outreach email.');

  test('nominate → approve → email → opt-out', async ({ browser }) => {
    test.setTimeout(180_000);
    const submittedAt = new Date();

    // ── Client leg ────────────────────────────────────────────────────────
    const clientCtx = await browser.newContext({ storageState: userAuthFile });
    const clientPage = await clientCtx.newPage();
    await clientPage.goto('/nominate-doctor');

    const clientResult = await runAgentTask(
      clientPage,
      `Search for a doctor named "${TEST_DOCTOR_NAME}" to confirm there's no existing match, `
        + `then continue to the nomination form. Fill in the doctor's name as `
        + `"${TEST_DOCTOR_NAME}", email as "${TEST_DOCTOR_EMAIL}", country as "Testland". `
        + `For the review field, type exactly this text and nothing else: "${REVIEW_MARKER}". `
        + `Check the consent checkbox. Submit the form.`,
      { maxSteps: 14 },
    );
    await test.info().attach('client-agent-transcript', {
      body: JSON.stringify(clientResult, null, 2), contentType: 'application/json',
    });

    // Deterministic — never trust the agent's own report of success.
    await expect(clientPage.getByText(/thank you|we've got it/i)).toBeVisible({ timeout: 10_000 });
    await clientCtx.close();

    // ── Admin leg ─────────────────────────────────────────────────────────
    const adminCtx = await browser.newContext({ storageState: adminAuthFile });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('/admin/doctor-nominations');

    // Preflight: the saved admin.json account must actually have admin access.
    await expect(adminPage, 'the admin.json session was not accepted as admin').not.toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(adminPage.getByText(/doctor nominations/i)).toBeVisible({ timeout: 10_000 });

    const adminResult = await runAgentTask(
      adminPage,
      `Find the pending nomination for "${TEST_DOCTOR_NAME}" and click "Approve & invite doctor".`,
      { maxSteps: 10 },
    );
    await test.info().attach('admin-agent-transcript', {
      body: JSON.stringify(adminResult, null, 2), contentType: 'application/json',
    });

    // Deterministic — the row should be gone from the pending queue.
    await expect(adminPage.getByText(TEST_DOCTOR_NAME)).toHaveCount(0, { timeout: 10_000 });
    await adminCtx.close();

    // ── Mailbox check — no agent involved, plain assertions ────────────────
    const email = await waitForTestEmail({ toAddress: TEST_DOCTOR_EMAIL, sinceDate: submittedAt, timeoutMs: 90_000 });
    expect(email, 'no outreach email arrived within 90s of approval').not.toBeNull();

    const body = `${email.subject}\n${email.text}\n${email.html}`;
    expect(body, 'the review text must never reach the doctor\'s inbox').not.toContain(REVIEW_MARKER);
    const optOutLink = email.links.find((l) => l.includes('/doctor-outreach-opt-out/'));
    expect(optOutLink, 'no working opt-out link found in the outreach email').toBeTruthy();

    // ── Opt-out leg ──────────────────────────────────────────────────────
    const optOutCtx = await browser.newContext();
    const optOutPage = await optOutCtx.newPage();
    await optOutPage.goto(optOutLink);
    await expect(optOutPage.getByText(/opted out/i)).toBeVisible({ timeout: 15_000 });
    await optOutCtx.close();
  });
});
