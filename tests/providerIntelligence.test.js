import { describe, it, expect, vi } from 'vitest';
import {
  CAPABILITY_GAP,
  providerDiscoveryStatus,
  verificationCapabilityFor,
  outreachCapabilityFor,
} from '../base44/shared/capabilityGap.ts';
import { logProviderContactAttempt } from '../base44/shared/logProviderContactAttempt.ts';
import { isFresh, TTL_MS } from '../base44/shared/freshness.ts';

describe('capabilityGap — honest "not real yet" signaling', () => {
  // providerDiscoveryStatus reads Deno.env.get('TAVILY_API_KEY') directly —
  // no Deno global exists in vitest's environment, so these two tests stub
  // the minimal surface it touches, restoring it afterward. Deliberately not
  // skipped: unlike an AudioContext/SpeechRecognition-coupled function
  // elsewhere in this repo, Deno.env.get is a trivial, deterministic stub
  // that doesn't risk masking real behavior — worth the coverage.
  const withDenoEnv = (value, fn) => {
    const prevDeno = globalThis.Deno;
    globalThis.Deno = { env: { get: (key) => (key === 'TAVILY_API_KEY' ? value : undefined) } };
    try {
      return fn();
    } finally {
      globalThis.Deno = prevDeno;
    }
  };

  it('providerDiscoveryStatus reports unavailable when no TAVILY_API_KEY is configured', () => {
    const result = withDenoEnv(undefined, () => providerDiscoveryStatus());
    expect(result.available).toBe(false);
    expect(result.state).toBe(CAPABILITY_GAP.DISCOVERY_UNAVAILABLE);
    expect(result.reason).toMatch(/self-registered|search|discover|TAVILY/i);
  });

  it('providerDiscoveryStatus reports available once a real TAVILY_API_KEY exists', () => {
    const result = withDenoEnv('fake-tavily-key', () => providerDiscoveryStatus());
    expect(result).toEqual({ available: true });
  });

  it('verificationCapabilityFor reports available for a real registry country (US)', () => {
    expect(verificationCapabilityFor('US')).toEqual({ available: true });
  });

  it('verificationCapabilityFor is case-insensitive on country code', () => {
    expect(verificationCapabilityFor('us')).toEqual({ available: true });
    expect(verificationCapabilityFor('Co')).toEqual({ available: true });
  });

  it('verificationCapabilityFor reports unavailable for an uncovered country', () => {
    const result = verificationCapabilityFor('TT');
    expect(result.available).toBe(false);
    expect(result.state).toBe(CAPABILITY_GAP.VERIFICATION_UNAVAILABLE);
    expect(result.reason).toContain('TT');
  });

  it('verificationCapabilityFor reports unavailable when no country is known', () => {
    const result = verificationCapabilityFor(null);
    expect(result.available).toBe(false);
    expect(result.state).toBe(CAPABILITY_GAP.VERIFICATION_UNAVAILABLE);
  });

  it('outreachCapabilityFor is available only for an already-known partner', () => {
    expect(outreachCapabilityFor(true)).toEqual({ available: true });
    const result = outreachCapabilityFor(false);
    expect(result.available).toBe(false);
    expect(result.state).toBe(CAPABILITY_GAP.OUTREACH_UNAVAILABLE);
  });
});

describe('logProviderContactAttempt — provider-facing audit, never patient PHI', () => {
  function makeBase44(createImpl) {
    return {
      asServiceRole: {
        entities: {
          ContactAttempt: { create: createImpl },
        },
      },
    };
  }

  it('writes only provider-facing fields, never a patient-identifying field', async () => {
    let written = null;
    const base44 = makeBase44(async (fields) => { written = fields; return fields; });

    await logProviderContactAttempt(base44, {
      case_id: 'case_123',
      partner_type: 'travel_agency',
      partner_id: 'agency_1',
      partner_name: 'Cancun Travel Co',
      channel: 'email',
      purpose: 'quote_request',
      recipient: 'quotes@cancuntravel.example',
      initiated_by: 'assignTravelAgency',
      result: 'sent',
    });

    expect(written).not.toBeNull();
    const keys = Object.keys(written);
    // Only the fields the schema defines — no free-text patient content field exists to leak into.
    const allowed = new Set([
      'case_id', 'partner_type', 'partner_id', 'partner_name', 'channel',
      'purpose', 'recipient', 'initiated_by', 'result', 'error_detail', 'created_at',
    ]);
    for (const k of keys) expect(allowed.has(k)).toBe(true);
    // The one identity-shaped field present (recipient) must be the provider's, not a patient's.
    expect(written.recipient).toBe('quotes@cancuntravel.example');
    expect(written.partner_name).toBe('Cancun Travel Co');
  });

  it('never throws even if the entity write fails', async () => {
    const base44 = makeBase44(async () => { throw new Error('write failed'); });
    await expect(logProviderContactAttempt(base44, {
      partner_type: 'doctor',
      channel: 'email',
      purpose: 'case_assignment',
      initiated_by: 'assignDoctorToCase',
      result: 'sent',
    })).resolves.toBeUndefined();
  });

  it('defaults optional fields to empty strings rather than undefined', async () => {
    let written = null;
    const base44 = makeBase44(async (fields) => { written = fields; });
    await logProviderContactAttempt(base44, {
      partner_type: 'taxi_service',
      channel: 'sms',
      purpose: 'quote_request',
      initiated_by: 'assignChauffeurServices',
      result: 'skipped',
    });
    expect(written.case_id).toBe('');
    expect(written.partner_id).toBe('');
    expect(written.recipient).toBe('');
    expect(written.error_detail).toBe('');
  });
});

describe('license freshness — the concrete, minimal version of memory decay', () => {
  it('a license checked moments ago is fresh within the 7-day TTL', () => {
    expect(isFresh(new Date().toISOString(), TTL_MS.doctor_license)).toBe(true);
  });

  it('a license checked 8 days ago is stale', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(isFresh(eightDaysAgo, TTL_MS.doctor_license)).toBe(false);
  });

  it('a license checked 6 days ago is still fresh', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    expect(isFresh(sixDaysAgo, TTL_MS.doctor_license)).toBe(true);
  });

  it('no prior check timestamp is never treated as fresh', () => {
    expect(isFresh(null, TTL_MS.doctor_license)).toBe(false);
    expect(isFresh(undefined, TTL_MS.doctor_license)).toBe(false);
  });
});
