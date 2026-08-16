/**
 * pinHashing — the two real PBKDF2 hash "shapes" this app's server-side PIN
 * systems need, extracted into one source of truth each. Previously each of
 * verifyVaultPIN.ts, confirmPINReset.ts, and verifyEmergencyPIN.ts kept its
 * own independent inline copy, all hardcoded to 600,000 iterations (OWASP
 * 2023) — until a live incident showed this Deno runtime's WebCrypto caps
 * PBKDF2 at 100,000 iterations, meaning every one of those copies has been
 * throwing on every call. Fixed at the source, once, so a future iteration-
 * count change can't silently drift out of sync across files again.
 *
 * MAX_PBKDF2_ITERATIONS is the confirmed platform ceiling (from the real
 * error message: "iteration counts above 100000 are not supported"). Every
 * new hash this app creates uses exactly this value, stored alongside the
 * hash itself (VaultPIN.iterations / EmergencyPIN.iterations) — so
 * verification always hashes at whatever count a given record was actually
 * created with, not a single global assumption. That self-describing design
 * is what makes a *future* platform change (or a deliberate strength bump)
 * safe: it only affects new records, never breaks existing ones the way this
 * bug just did.
 *
 * LEGACY_ITERATIONS (200,000) is not a safe value to compute either — it's
 * only used as the assumed count for a record with no stored `iterations`
 * field (predates this fix), so callers can distinguish "this record was
 * genuinely hashed at an unreachable historical count, tell the user to
 * reset" from a real crypto bug.
 */

export const MAX_PBKDF2_ITERATIONS = 100000;
export const LEGACY_ITERATIONS = 200000;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * hashVaultPIN — base64 output, salt = base64(SHA256("morales_vault_"+email)).
 * Used by verifyVaultPIN.ts (set + current_pin check) and confirmPINReset.ts's
 * vault-PIN reset branch. Matches the client-side scheme in vaultPINHashing.js
 * (a separate, browser-only offline-verification path — unaffected by this
 * bug, since browser WebCrypto doesn't carry this Deno-specific cap).
 */
export async function hashVaultPIN(pin: string, email: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const saltDigest = await crypto.subtle.digest('SHA-256', enc.encode('morales_vault_' + email.toLowerCase()));
  const salt = toBase64(new Uint8Array(saltDigest));
  const saltBinary = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBinary, iterations },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/**
 * hashEmergencyPIN — hex output, salt = SHA256("morales-pin-salt:"+email).
 * Used by verifyEmergencyPIN.ts (setup/current_pin/verify) and
 * confirmPINReset.ts's emergency-PIN reset branch. The two must stay
 * byte-identical (they already did, before this extraction, per
 * verifyEmergencyPIN.ts's own "must stay identical" comment) — now
 * structurally guaranteed by sharing one implementation.
 */
export async function hashEmergencyPIN(pin: string, email: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const saltBuf = await crypto.subtle.digest('SHA-256', enc.encode('morales-pin-salt:' + email.toLowerCase()));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/**
 * The friendly, honest message for a record whose stored (or assumed
 * legacy) iteration count exceeds what this runtime can actually compute —
 * there is no way to verify it, ever, on this platform; a reset is the only
 * real fix. Never a raw 500 for this specific, anticipated case.
 */
export const LEGACY_PIN_RESET_MESSAGE =
  'Your PIN needs to be reset — it was created before a required security update. Use "Forgot PIN?" to set a new one.';
