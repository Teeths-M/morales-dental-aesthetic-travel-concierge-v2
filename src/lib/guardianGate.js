// ── Under-18 guardian gate (client authority) ─────────────────────────────────
// M PRINCIPLE — we never plan or book care for a patient under 18 without a
// captured parent/guardian identity. This is a HARD block, not a soft flag:
// booking cannot advance and cannot submit until a guardian name + a valid
// contact are present. The server twin (base44/functions/_shared/guardianGate.ts)
// re-derives the SAME verdict so a direct API call can't skip it — keep the two
// files in lockstep (the RED-block pattern, procedureCompatibility.js/.ts).

export const MINOR_AGE_THRESHOLD = 18;

/**
 * True only when age parses to a real number under 18. Unparseable ages
 * ("forty-five", blank) return false — an adult with a typo must never be routed
 * into the guardian flow (the requirement re-derives server-side from the stored
 * age at submit anyway).
 */
export function isMinorAge(age) {
  const n = Number(String(age ?? '').trim());
  return Number.isFinite(n) && n > 0 && n < MINOR_AGE_THRESHOLD;
}

/** A guardian contact must be a plausible phone (7+ digits) or a valid email. */
export function isValidGuardianContact(contact) {
  const c = String(contact ?? '').trim();
  if (!c) return false;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
  const phone = c.replace(/\D/g, '').length >= 7;
  return email || phone;
}

/**
 * The single decision. For a minor, returns blocked:true until BOTH a guardian
 * name and a valid guardian contact are captured. For an adult (or unparseable
 * age) it is never blocked.
 */
export function evaluateGuardianGate({ age, guardian_name, guardian_contact } = {}) {
  if (!isMinorAge(age)) {
    return { isMinor: false, blocked: false, missing: [], reason: null };
  }
  const missing = [];
  if (!String(guardian_name ?? '').trim()) missing.push('guardian_name');
  if (!isValidGuardianContact(guardian_contact)) missing.push('guardian_contact');
  const blocked = missing.length > 0;
  return {
    isMinor: true,
    blocked,
    missing,
    reason: blocked
      ? 'This patient is under 18. A parent or guardian’s name and a valid phone or email are required before booking can proceed — this is a safety requirement and cannot be skipped.'
      : null,
  };
}
