// ── Under-18 guardian gate (server authority) ─────────────────────────────────
// Server-side twin of src/lib/guardianGate.js — the two MUST stay identical.
// M PRINCIPLE: no booking proceeds for a patient under 18 without a captured
// parent/guardian identity. The client gates this in the booking/intake UI, but a
// client-side-only check can be skipped by calling Consultation.create() directly;
// validateGuardianRequirement uses this file to re-derive the same verdict so the
// hard block cannot be bypassed by going around the frontend. Mirrors the RED
// procedure block (procedureCompatibility.ts / validateProcedureSafety).

export const MINOR_AGE_THRESHOLD = 18;

/** True only when age parses to a real number under 18. Blank/unparseable = false. */
export function isMinorAge(age: unknown): boolean {
  const n = Number(String(age ?? '').trim());
  return Number.isFinite(n) && n > 0 && n < MINOR_AGE_THRESHOLD;
}

/** A guardian contact must be a plausible phone (7+ digits) or a valid email. */
export function isValidGuardianContact(contact: unknown): boolean {
  const c = String(contact ?? '').trim();
  if (!c) return false;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
  const phone = c.replace(/\D/g, '').length >= 7;
  return email || phone;
}

export interface GuardianGateInput {
  age?: unknown;
  guardian_name?: unknown;
  guardian_contact?: unknown;
}

export interface GuardianGateResult {
  isMinor: boolean;
  blocked: boolean;
  missing: string[];
  reason: string | null;
}

/**
 * For a minor, blocked:true until BOTH a guardian name and a valid guardian
 * contact are captured. For an adult (or unparseable age) it is never blocked.
 */
export function evaluateGuardianGate(input: GuardianGateInput): GuardianGateResult {
  if (!isMinorAge(input.age)) {
    return { isMinor: false, blocked: false, missing: [], reason: null };
  }
  const missing: string[] = [];
  if (!String(input.guardian_name ?? '').trim()) missing.push('guardian_name');
  if (!isValidGuardianContact(input.guardian_contact)) missing.push('guardian_contact');
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
