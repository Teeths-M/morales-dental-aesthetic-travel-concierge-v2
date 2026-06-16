/**
 * Client-side AES-256-GCM Encryption with PBKDF2 Key Derivation
 * ZERO-KNOWLEDGE ARCHITECTURE:
 * - Keys are derived from user's password using PBKDF2 (Web Crypto API)
 * - Keys are stored ONLY in the browser (sessionStorage).
 * - The backend never receives or stores encryption keys.
 * - Only encrypted blobs + IV are uploaded to the server.
 * - Decryption is performed entirely in-browser.
 */

const KEY_STORE_PREFIX = 'vault_key_';
const SALT_STORE_PREFIX = 'vault_salt_';

/**
 * Derives an AES-256-GCM key from a password using PBKDF2.
 * @param {string} password - User's password
 * @param {Uint8Array} salt - Random salt (store this with the vault)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a cryptographically secure random salt.
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypts a File using AES-256-GCM with PBKDF2 key derivation.
 * @param {File} file - The file to encrypt
 * @param {string} password - User's password for key derivation
 * @returns {Promise<{encryptedB64: string, ivB64: string, saltB64: string, hashB64: string, fileSizeBytes: number}>}
 */
export async function encryptFileWithPassword(file, password) {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // SHA-256 hash of original file for integrity verification
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Generate random salt and IV
  const salt = generateSalt();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const cryptoKey = await deriveKeyFromPassword(password, salt);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    fileBytes
  );

  const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const saltB64 = btoa(String.fromCharCode(...salt));

  // Algorithm envelope
  const envelope = {
    alg: 'AES-256-GCM',
    v: 2,  // Version 2 = PBKDF2 key derivation
    ciphertext: encryptedB64,
  };
  const envelopeB64 = btoa(JSON.stringify(envelope));

  return {
    encryptedB64: envelopeB64,
    ivB64,
    saltB64,
    hashB64,
    fileSizeBytes: file.size
  };
}

/**
 * Decrypts a file using password-derived key.
 * @param {string} encryptedB64 - Base64 encoded encrypted envelope
 * @param {string} ivB64 - Base64 IV
 * @param {string} saltB64 - Base64 salt
 * @param {string} password - User's password
 * @param {string} mimeType - Original MIME type
 * @returns {Promise<Blob>}
 */
export async function decryptFileWithPassword(encryptedB64, ivB64, saltB64, password, mimeType = 'application/octet-stream') {
  // Decode envelope
  const envelopeStr = atob(encryptedB64);
  const envelope = JSON.parse(envelopeStr);
  const encryptedBytes = Uint8Array.from(atob(envelope.ciphertext), c => c.charCodeAt(0));

  // Decode IV and salt
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

  // Derive key
  const cryptoKey = await deriveKeyFromPassword(password, salt);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType });
}

/**
 * Stores encryption metadata in sessionStorage for a vault token.
 */
export function storeVaultKey(vaultToken, saltB64) {
  sessionStorage.setItem(`${SALT_STORE_PREFIX}${vaultToken}`, saltB64);
}

/**
 * Retrieves salt for a vault token.
 */
export function getSaltForToken(vaultToken) {
  return sessionStorage.getItem(`${SALT_STORE_PREFIX}${vaultToken}`);
}

/**
 * Verifies file integrity by comparing SHA-256 hashes.
 */
export async function verifyFileIntegrity(file, expectedHashB64) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(arrayBuffer));
  const actualHashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return actualHashB64 === expectedHashB64;
}