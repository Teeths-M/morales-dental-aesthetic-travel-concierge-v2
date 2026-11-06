/**
 * ageGate — a neutral date-of-birth check before anyone can create an account.
 *
 * "Neutral" follows the FTC's guidance for COPPA age screens: ask for the full
 * date of birth with no hint of the cutoff, don't pre-fill it, show a generic
 * message when someone is too young, and don't let them go straight back and
 * try another year. Patients under the minimum age are booked by a parent or
 * guardian on the guardian's own account.
 *
 * Only the result is kept on the device (passed or blocked, when, and against
 * which minimum age). The date of birth itself is never stored anywhere.
 * After sign-in, useAgeGateAccountSync copies a pass onto the account.
 */

export const MIN_ACCOUNT_AGE = 18;
export const AGE_GATE_STORAGE_KEY = 'morales_age_gate';
// How long a "too young" answer blocks a second try on the same device.
export const BLOCK_REMEMBER_MS = 24 * 60 * 60 * 1000;

const EARLIEST_YEAR = 1900;

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** True for a real calendar date: no Feb 30, no month 13. */
export function isRealDate({ year, month, day }) {
  if (![year, month, day].every(Number.isInteger)) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Age in whole years on `today`. Someone born on 29 February has their
 * birthday on 1 March in other years, the later and safer of the two common
 * conventions.
 */
export function ageOn({ year, month, day }, today) {
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1;
  const d = today.getDate();
  if (m < month || (m === month && d < day)) age -= 1;
  return age;
}

/** 'pass', 'block', or 'invalid' for a date of birth. */
export function evaluateDob(dob, today = new Date(), minAge = MIN_ACCOUNT_AGE) {
  if (!isRealDate(dob) || dob.year < EARLIEST_YEAR) return 'invalid';
  const born = new Date(dob.year, dob.month - 1, dob.day);
  if (born.getTime() > today.getTime()) return 'invalid';
  return ageOn(dob, today) >= minAge ? 'pass' : 'block';
}

/**
 * This device's saved result, or null. An expired block reads as null, so the
 * question is asked again after BLOCK_REMEMBER_MS.
 */
export function readAgeGate({ storage = safeStorage(), now = Date.now() } = {}) {
  try {
    const raw = storage?.getItem(AGE_GATE_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || (saved.status !== 'passed' && saved.status !== 'blocked')) return null;
    const at = Date.parse(saved.at);
    if (Number.isNaN(at)) return null;
    if (saved.status === 'blocked' && now - at > BLOCK_REMEMBER_MS) return null;
    return { status: saved.status, at: saved.at, minAge: Number(saved.min_age) || 0 };
  } catch {
    return null;
  }
}

/** Save 'passed' or 'blocked' for this device. Never the date of birth. */
export function rememberAgeGate(status, { storage = safeStorage(), now = Date.now() } = {}) {
  try {
    storage?.setItem(AGE_GATE_STORAGE_KEY, JSON.stringify({
      status,
      at: new Date(now).toISOString(),
      min_age: MIN_ACCOUNT_AGE,
    }));
  } catch {
    // Private browsing or a full disk: the check still worked for this visit.
  }
}

/**
 * True when this device passed the check against today's minimum age. A pass
 * recorded against a lower minimum (if the minimum is ever raised) doesn't count.
 */
export function hasPassedAgeGate(options) {
  const saved = readAgeGate(options);
  return saved?.status === 'passed' && saved.minAge >= MIN_ACCOUNT_AGE;
}

/** True while a recent "too young" answer is still blocking this device. */
export function isAgeGateBlocked(options) {
  return readAgeGate(options)?.status === 'blocked';
}
