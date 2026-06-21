/**
 * Offline Vault PIN Verification - 100% Local, No Network Required
 * Uses PBKDF2-SHA256 with 600,000 iterations for secure local verification
 */

const VAULT_PIN_PREFIX = 'morales_vault_pin_';
const VAULT_SALT_PREFIX = 'morales_vault_salt_';

/**
 * Generate deterministic salt from email (same as server-side)
 */
export async function generateVaultSalt(email) {
  const encoder = new TextEncoder();
  const emailData = encoder.encode(`morales_vault_${email.toLowerCase()}`);
  const saltBuffer = await crypto.subtle.digest('SHA-256', emailData);
  return btoa(String.fromCharCode(...new Uint8Array(saltBuffer)));
}

/**
 * Hash PIN using PBKDF2-SHA256 with 600,000 iterations
 */
export async function hashVaultPIN(pin, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const saltBinary = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBinary,
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}

/**
 * Save PIN hash to localStorage (works offline)
 */
export async function saveVaultPIN(email, pin) {
  const salt = await generateVaultSalt(email);
  const pinHash = await hashVaultPIN(pin, salt);
  
  localStorage.setItem(`${VAULT_PIN_PREFIX}${email.toLowerCase()}`, pinHash);
  localStorage.setItem(`${VAULT_SALT_PREFIX}${email.toLowerCase()}`, salt);
  
  console.log('[OfflineVaultPIN] PIN saved for', email);
}

/**
 * Verify PIN against stored hash (100% offline)
 */
export async function verifyVaultPIN(email, pin) {
  const pinHash = localStorage.getItem(`${VAULT_PIN_PREFIX}${email.toLowerCase()}`);
  const salt = localStorage.getItem(`${VAULT_SALT_PREFIX}${email.toLowerCase()}`);
  
  if (!pinHash || !salt) {
    return { valid: false, error: 'No PIN found for this email' };
  }
  
  const inputHash = await hashVaultPIN(pin, salt);
  const isValid = pinHash === inputHash;
  
  console.log('[OfflineVaultPIN] Verification result:', isValid);
  return { valid: isValid };
}

/**
 * Check if PIN exists for email
 */
export function hasVaultPIN(email) {
  return !!localStorage.getItem(`${VAULT_PIN_PREFIX}${email.toLowerCase()}`);
}

/**
 * Clear PIN (for logout)
 */
export function clearVaultPIN(email) {
  localStorage.removeItem(`${VAULT_PIN_PREFIX}${email.toLowerCase()}`);
  localStorage.removeItem(`${VAULT_SALT_PREFIX}${email.toLowerCase()}`);
}