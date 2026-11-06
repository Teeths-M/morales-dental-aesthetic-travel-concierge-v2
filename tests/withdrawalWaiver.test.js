import { describe, it, expect } from 'vitest';
import * as client from '@/lib/withdrawalWaiver';
import * as server from '../base44/shared/withdrawalWaiver.ts';

const FLOWS = ['package_payment', 'consultation_fee', 'slot_hold_deposit'];

describe('withdrawal waiver: browser and server copies', () => {
  it('hold exactly the same flows, wording, and version', () => {
    expect(server.WITHDRAWAL_WAIVER_FLOWS).toEqual(client.WITHDRAWAL_WAIVER_FLOWS);
    expect(server.WITHDRAWAL_WAIVER_TEXT).toBe(client.WITHDRAWAL_WAIVER_TEXT);
    expect(server.WITHDRAWAL_WAIVER_VERSION).toBe(client.WITHDRAWAL_WAIVER_VERSION);
  });

  it('only name checkouts that exist', () => {
    for (const flow of client.WITHDRAWAL_WAIVER_FLOWS) expect(FLOWS).toContain(flow);
  });

  it('agree on which checkouts need the box', () => {
    for (const flow of FLOWS) {
      expect(server.requiresWithdrawalWaiver(flow)).toBe(client.requiresWithdrawalWaiver(flow));
    }
  });
});

describe('what a checkout sends, and what the server accepts', () => {
  for (const flow of FLOWS) {
    it(`${flow}: the browser's payload is exactly what the server accepts`, () => {
      const needed = client.requiresWithdrawalWaiver(flow);
      // Not ticked: nothing sent. The server refuses only if this flow needs it.
      expect(client.buildWaiverPayload(flow, false)).toBeUndefined();
      expect(server.checkWithdrawalWaiver(flow, undefined).ok).toBe(!needed);
      // Ticked: the server accepts it and records the version and time.
      const sent = client.buildWaiverPayload(flow, true);
      const result = server.checkWithdrawalWaiver(flow, sent, new Date('2026-10-17T12:00:00Z'));
      expect(result.ok).toBe(true);
      if (needed && result.ok) {
        expect(result.metadata).toEqual({
          withdrawal_waiver_version: client.WITHDRAWAL_WAIVER_VERSION,
          withdrawal_waiver_accepted_at: '2026-10-17T12:00:00.000Z',
        });
      }
    });
  }

  it('refuses an old version of the wording', () => {
    const flow = client.WITHDRAWAL_WAIVER_FLOWS[0];
    if (!flow) return; // no checkout uses the box under this policy
    const result = server.checkWithdrawalWaiver(flow, { accepted: true, version: 'old' });
    expect(result.ok).toBe(false);
  });

  it('has wording, and a version that changes with it', () => {
    expect(client.WITHDRAWAL_WAIVER_TEXT.length).toBeGreaterThan(40);
    expect(client.WITHDRAWAL_WAIVER_VERSION).toMatch(/^wv-[0-9a-f]{10}$/);
  });
});
