import { test, expect } from '@playwright/test';

// ── Morales live checks against the DEPLOYED public app ───────────────────────
// Read-only: these never write data. They cover the two edge-case items that can
// only be proven in a real browser / over the wire:
//   #12 the guide "chat" orb must never overlap hero body text at phone widths
//   #7  gated endpoints must reject an unauthenticated direct API call
//
// NOTE: there is no separate staging env — this hits production read-only. The
// #7 probe is non-mutating (no auth, empty body) and asserts the gate does not
// open, nothing more.

const APP_ID = process.env.BASE44_APP_ID || '6a01c1305c540b75f24dd373';
const fnUrl = (name) => `/api/apps/${APP_ID}/functions/${name}`;

// Rectangle intersection with a small tolerance (sub-pixel AA / shadow bleed).
function overlaps(a, b, pad = 1) {
  if (!a || !b) return false;
  return !(
    a.x + a.width  <= b.x + pad ||
    b.x + b.width  <= a.x + pad ||
    a.y + a.height <= b.y + pad ||
    b.y + b.height <= a.y + pad
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// #12 — Chat/guide orb must not overlap hero body text at common phone widths
// ══════════════════════════════════════════════════════════════════════════════
const PHONE_VIEWPORTS = [
  { w: 375, h: 667, label: 'iphone-se-375' },
  { w: 390, h: 844, label: 'iphone-13-390' },
  { w: 414, h: 896, label: 'iphone-xr-414' },
];

test.describe('#12 guide orb never overlaps hero body text (375-414px)', () => {
  for (const vp of PHONE_VIEWPORTS) {
    test(`no overlap @ ${vp.w}px (${vp.label})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto('/', { waitUntil: 'networkidle' });

      const orb = page.getByRole('button', { name: 'Open platform guide' });
      // The hero text we protect: subheadline + body paragraph (medical or non-medical copy).
      const heroTexts = page.locator('[data-hero]').getByText(
        /driver picks you up at home|Wherever you land, Morales is already there|world-class medical care|35,000 feet/i
      );
      const count = await heroTexts.count();
      expect(count, 'expected to find hero copy to measure against').toBeGreaterThan(0);

      // "Never overlaps" is satisfied two ways: the orb is kept out of the hero on
      // small screens (hidden until you scroll past it), OR it is positioned clear.
      // Either is a pass; an orb that is BOTH visible AND over the copy is the fail.
      const orbVisibleAtHero = await orb.isVisible().catch(() => false);
      const collisions = [];
      if (orbVisibleAtHero) {
        const orbBox = await orb.boundingBox();
        for (let i = 0; i < count; i++) {
          const el = heroTexts.nth(i);
          if (!(await el.isVisible().catch(() => false))) continue;
          const box = await el.boundingBox();
          if (overlaps(orbBox, box)) collisions.push({ text: (await el.innerText()).slice(0, 40), box });
        }
      }
      await page.screenshot({ path: `test-results/mobile-orb-${vp.label}.png`, fullPage: false });
      expect(collisions, `guide orb overlaps hero text at ${vp.w}px: ${JSON.stringify(collisions)}`).toEqual([]);

      // Guard against "fixed by deletion": the orb must still be reachable once the
      // hero is scrolled away, so users never lose the guide.
      await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.3));
      await expect(orb, 'guide orb must reappear after scrolling past the hero').toBeVisible({ timeout: 10000 });
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// #3 — Booking as a stated minor is HARD-blocked at the guardian gate (not flagged)
// ══════════════════════════════════════════════════════════════════════════════
// Proves the gate in the real wizard: stating a minor age surfaces a blocking
// guardian capture, and the wizard will NOT advance past step 0 without it. The
// server also re-derives the block (validateGuardianRequirement) — asserted in the
// deterministic suite. Runs against the deployed app once published; verified now
// against a local build.
test.describe('#3 minor without a guardian cannot advance the booking', () => {
  test('stated minor surfaces the guardian gate and blocks progress; adult clears it', async ({ page }) => {
    await page.goto('/booking', { waitUntil: 'networkidle' });

    // Empty-cart guests hit a procedure picker overlay first — choose one to enter
    // the wizard (otherwise the step-0 form sits behind a click-blocking overlay).
    const picker = page.getByText('Select a procedure to begin', { exact: false });
    if (await picker.isVisible().catch(() => false)) {
      await page.getByText('Dental Implants', { exact: true }).click();
      await expect(picker).toBeHidden({ timeout: 10000 });
    }

    // Age lives on step 0 (personal info). Target the age Select by its placeholder
    // text so it can't collide with the other selects or header controls.
    const ageTrigger = page.getByRole('combobox').filter({ hasText: 'Select age' });
    await expect(ageTrigger, 'age selector on step 0').toBeVisible({ timeout: 15000 });

    // State a minor age.
    await ageTrigger.click();
    await page.getByRole('option', { name: '16', exact: true }).click();

    // The hard guardian gate must appear with its no-skip copy + capture fields.
    const gate = page.getByText('A parent or guardian must be part of this journey');
    await expect(gate).toBeVisible();
    await expect(page.getByText(/cannot be skipped/i)).toBeVisible();
    await expect(page.getByPlaceholder('Phone or email')).toBeVisible();
    await gate.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/booking-minor-guardian-gate.png', fullPage: true });

    // Attempt to advance without a guardian → the wizard must NOT leave step 0.
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(gate, 'must stay on step 0 — a minor cannot advance without a guardian').toBeVisible();

    // Switching to an adult age removes the gate entirely (it is minor-specific).
    await page.getByRole('combobox').filter({ hasText: /^16$/ }).click();
    await page.getByRole('option', { name: '25', exact: true }).click();
    await expect(gate).toBeHidden();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #7 — Gated endpoints reject a direct, unauthenticated API call
// ══════════════════════════════════════════════════════════════════════════════
// A UI gate is meaningless if the endpoint answers an anonymous POST. We confirm
// the server does NOT return a usable 200 success for a caller with no session.
// (A 402 credit wall or 401/403 all satisfy "the gate did not open"; only an
// authenticated-looking 200 decision would be a finding.)
test.describe('#7 server-side gate rejects unauthenticated direct calls', () => {
  for (const fn of ['computeSafeTScreening', 'uploadToVault']) {
    test(`${fn} does not open to an anonymous POST`, async ({ request }) => {
      const res = await request.post(fnUrl(fn), {
        data: {},
        headers: { 'Content-Type': 'application/json' },
        failOnStatusCode: false,
      });
      const status = res.status();
      const bodyText = await res.text().catch(() => '');
      // Never a clean success for an unauthenticated caller.
      expect(status, `${fn} returned ${status}: ${bodyText.slice(0, 200)}`).not.toBe(200);
      // And it must not leak a safety decision to an anonymous caller.
      expect(bodyText).not.toMatch(/"risk_level"\s*:\s*"(low|moderate|elevated|review)"/);
      console.log(`[#7] ${fn} -> HTTP ${status} (gate held)`);
    });
  }
});
