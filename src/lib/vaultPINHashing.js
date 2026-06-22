/**
 * Client-side cryptographic hashing utilities for offline authentication.
 * Uses Web Crypto API for secure PBKDF2 hashing.
 */

/**
 * Generate a deterministic salt from user email for consistent hashing
 */
export async function generateSalt(email) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`morales_vault_${email.toLowerCase()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

/**
 * Hash a PIN using PBKDF2 with SHA-256 (OWASP 2023 standard: 600,000 iterations)
 * @param {string} pin - The PIN to hash
 * @param {string} salt - Base64 encoded salt
 * @returns {Promise<string>} Base64 encoded hash
 */
export async function hashPIN(pin, salt) {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  // Decode salt from base64
  const saltBinary = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  
  // Import the PIN as a key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2 with 600,000 iterations (OWASP 2023)
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
  
  // Convert to base64 for storage
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return btoa(String.fromCharCode(...hashArray));
}

/**
 * Generate and store salt + hash for a new PIN
 * @param {string} pin - The PIN to hash
 * @param {string} email - User email for salt generation
 * @returns {Promise<{salt: string, hash: string}>}
 */
export async function generatePINHash(pin, email) {
  const salt = await generateSalt(email);
  const hash = await hashPIN(pin, salt);
  return { salt, hash };
}

/**
 * Verify a PIN against a stored hash
 * @param {string} pin - The PIN to verify
 * @param {string} salt - Stored salt
 * @param {string} storedHash - Stored hash to compare against
 * @returns {Promise<boolean>}
 */
export async function verifyPIN(pin, salt, storedHash) {
  const inputHash = await hashPIN(pin, salt);
  return inputHash === storedHash;
}