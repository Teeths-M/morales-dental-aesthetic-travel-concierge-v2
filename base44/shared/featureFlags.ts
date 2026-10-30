/**
 * featureFlags — one place that answers "is this module on?".
 *
 * Every reader FAILS CLOSED. A missing row, an RLS refusal, a network error or
 * a malformed record all resolve to `false`. That direction is deliberate: a
 * feature flag that fails open is not a flag, it is a coin flip on whether an
 * unfinished module is reachable in production. This one ships the minor
 * reunification module disabled, so "we couldn't tell" must mean "off".
 */

export const MINOR_REUNIFICATION_FLAG = 'minor_reunification';

/**
 * Trip assistance — scripts, written requests and the emergency packet.
 * Ships off: absence of the row, an RLS refusal or a malformed record all mean
 * "off", which is the only safe direction for a module that can send a packet.
 */
export const TRIP_ASSISTANCE_FLAG = 'trip_assistance';

export async function isFeatureEnabled(
  base44: any,
  key: string,
  fallback = false,
): Promise<boolean> {
  try {
    const rows = await base44.asServiceRole.entities.FeatureFlag
      .filter({ key }, '-updated_date', 1);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return fallback;
    // Explicit true only. Anything else — undefined, null, "true", 1 — is off.
    return row.enabled === true;
  } catch (error) {
    console.error('[featureFlags] read failed, treating as disabled', key, error);
    return fallback;
  }
}

export function isMinorReunificationEnabled(base44: any): Promise<boolean> {
  return isFeatureEnabled(base44, MINOR_REUNIFICATION_FLAG, false);
}