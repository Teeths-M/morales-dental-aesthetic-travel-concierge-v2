import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { friendlyError, safeError } from '../src/lib/friendlyError.js';

// The whole point of this helper is that a raw message never reaches a patient.
// These tests assert the negative — that the returned string does NOT contain
// the leaked text — because that is the property that actually protects them.

let warn;
beforeEach(() => { warn = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { warn.mockRestore(); });

const LEAK = 'Request failed: Consultation.procedure_interest violates constraint at /deno/fn/abc123';
const FALLBACK = 'We could not save that. Please try again.';

describe('friendlyError', () => {
  it('never returns the raw message for an unclassified error', () => {
    const out = friendlyError(new Error(LEAK), FALLBACK);
    expect(out).toBe(FALLBACK);
    expect(out).not.toContain('constraint');
    expect(out).not.toContain('deno');
    expect(out).not.toContain('Consultation.');
  });

  it('logs the raw error so it is still debuggable', () => {
    friendlyError(new Error(LEAK), FALLBACK, 'TestContext');
    expect(warn).toHaveBeenCalled();
    const logged = warn.mock.calls[0];
    expect(logged[0]).toBe('[TestContext]');
    expect(String(logged[1]?.message)).toContain('constraint');
  });

  it('maps HTTP statuses to actionable sentences', () => {
    expect(friendlyError({ status: 401 }, FALLBACK)).toMatch(/sign in again/i);
    expect(friendlyError({ status: 403 }, FALLBACK)).toMatch(/access/i);
    expect(friendlyError({ status: 429 }, FALLBACK)).toMatch(/wait a minute/i);
    // Nested shapes — different clients in this codebase put status in
    // different places, and a miss here silently falls through to fallback.
    expect(friendlyError({ response: { status: 404 } }, FALLBACK)).toMatch(/find that/i);
  });

  it('never tells a patient about integration credits on a 402', () => {
    // 402 is our billing state, not theirs. It must not surface as "credits",
    // "quota" or "payment required" — a patient reading that on a medical
    // platform reasonably concludes THEIR payment failed.
    const out = friendlyError({ status: 402 }, FALLBACK);
    expect(out.toLowerCase()).not.toMatch(/credit|quota|billing|payment required/);
    expect(out).toMatch(/briefly unavailable/i);
  });

  it('reassures rather than alarms on a 5xx', () => {
    const out = friendlyError({ status: 503 }, FALLBACK);
    expect(out).toMatch(/our side/i);
    expect(out).toMatch(/nothing you entered has been lost/i);
  });

  it('detects offline from a fetch TypeError', () => {
    const out = friendlyError(new TypeError('Failed to fetch'), FALLBACK);
    expect(out).toMatch(/offline/i);
    expect(out).toMatch(/nothing was lost/i);
  });

  it('shows a message we authored as written', () => {
    const out = friendlyError(safeError('This clinic is not accepting bookings.'), FALLBACK);
    expect(out).toBe('This clinic is not accepting bookings.');
  });

  it('will NOT trust an arbitrary error that merely looks safe', () => {
    // Only safeError() sets the flag. A plain Error — however it was worded —
    // must still be mapped, or the guarantee is worthless.
    const impostor = new Error(LEAK);
    expect(friendlyError(impostor, FALLBACK)).toBe(FALLBACK);

    // And an object that arrived from the network cannot forge the flag by
    // carrying the property, because we only honour it alongside a string
    // message we can render. Belt and braces: assert the leak is still absent.
    const forged = { isSafeMessage: true, message: null };
    expect(friendlyError(forged, FALLBACK)).toBe(FALLBACK);
  });
});
