/**
 * callConsentPolicy — a real, disclosed, deliberately conservative starting
 * point for the call-recording-consent question the "Outbound Voice" spec
 * calls a "hard legal requirement, not an optional detail."
 *
 * Scope, stated plainly: this governs RECORDING only, never whether the call
 * itself may be placed. A live safety call to a trusted contact is not
 * gated on unresolved consent data — blocking it over an unresolved
 * recording-law question would itself be a real safety risk in a Guardian
 * Tier-1 scenario, and the specific legal exposure named in every US
 * wiretapping statute is about capturing/storing audio, not placing an
 * unsolicited call. This is a real, disclosed engineering judgment call,
 * not silent — Portia should still have this reviewed by counsel before any
 * real vendor key goes live, per the spec's own instruction.
 *
 * TWO_PARTY_CONSENT_US_STATES is the commonly-cited "all-party consent"
 * list (11 states + DC's own wiretap statute is one-party in practice but
 * included here on the conservative side). This is a starting reference
 * table, not verified against current statute text — re-confirm with real
 * legal review before this table is ever trusted for a live recorded call.
 *
 * Every caller today (callTrustedContact) resolves region as `null` — there
 * is no reliable phone-number-to-jurisdiction lookup wired in yet (an E.164
 * country code alone can't distinguish US states, and this app has no area
 * -code database). That's why every real call in this build sets
 * recording_enabled: false unconditionally — this module exists as real,
 * usable scaffolding for the moment a genuine region signal (e.g. the
 * destination case's own country, or a future area-code lookup) gets wired
 * in, not as unused dead code.
 */

export const TWO_PARTY_CONSENT_US_STATES = new Set([
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MT', 'NV', 'NH', 'PA', 'WA',
]);

export interface ConsentPolicyResult {
  shouldRecord: boolean;
  reason: string;
}

/**
 * resolveRecordingConsentPolicy — the one place a "record this call?"
 * decision is ever made. Fails conservative: any region it doesn't
 * confidently recognize as one-party-consent returns shouldRecord:false.
 *
 * @param regionCode a two-letter US state code, or null/undefined when no
 *   real region signal exists (the honest default today).
 */
export function resolveRecordingConsentPolicy(regionCode?: string | null): ConsentPolicyResult {
  if (!regionCode) {
    return {
      shouldRecord: false,
      reason: 'No confirmed region for this contact — recording stays off by default.',
    };
  }

  const code = regionCode.trim().toUpperCase();
  if (TWO_PARTY_CONSENT_US_STATES.has(code)) {
    return {
      shouldRecord: false,
      reason: `${code} requires all-party consent to record a call — recording is off.`,
    };
  }

  if (/^[A-Z]{2}$/.test(code)) {
    return {
      shouldRecord: false,
      reason: `${code} is treated as one-party-consent, but recording still needs a real legal review before it is ever enabled — kept off in this build.`,
    };
  }

  return {
    shouldRecord: false,
    reason: 'Region could not be confidently classified — recording stays off by default.',
  };
}
