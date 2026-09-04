import { describe, it, expect } from 'vitest';
import {
  resolveRecordingConsentPolicy,
  TWO_PARTY_CONSENT_US_STATES,
} from '../base44/shared/callConsentPolicy.ts';

describe('resolveRecordingConsentPolicy', () => {
  it('never records when no region is known — the honest default for every call today', () => {
    expect(resolveRecordingConsentPolicy(null).shouldRecord).toBe(false);
    expect(resolveRecordingConsentPolicy(undefined).shouldRecord).toBe(false);
    expect(resolveRecordingConsentPolicy('').shouldRecord).toBe(false);
  });

  it('never records in a known all-party-consent US state', () => {
    for (const state of TWO_PARTY_CONSENT_US_STATES) {
      const result = resolveRecordingConsentPolicy(state);
      expect(result.shouldRecord).toBe(false);
      expect(result.reason).toMatch(new RegExp(state));
    }
  });

  it('is case-insensitive on the region code', () => {
    expect(resolveRecordingConsentPolicy('ca').shouldRecord).toBe(false);
    expect(resolveRecordingConsentPolicy('Ca').shouldRecord).toBe(false);
  });

  it('stays conservative even for a region not in the two-party list — recording is still never enabled in this build', () => {
    const result = resolveRecordingConsentPolicy('TX');
    expect(result.shouldRecord).toBe(false);
    expect(result.reason).not.toMatch(/undefined|NaN/);
  });

  it('never records for an unrecognized/malformed region code', () => {
    expect(resolveRecordingConsentPolicy('not-a-real-region').shouldRecord).toBe(false);
    expect(resolveRecordingConsentPolicy('123').shouldRecord).toBe(false);
  });

  it('every real input combination produces a real reason string, never undefined/NaN', () => {
    const inputs = [null, undefined, '', 'CA', 'ca', 'TX', 'unknown', '  wa  '];
    for (const input of inputs) {
      const result = resolveRecordingConsentPolicy(input);
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason).not.toMatch(/undefined|NaN/);
    }
  });
});
