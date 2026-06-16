/**
 * Client-side AES-256-GCM Passport Encryption Utility
 * ZERO-KNOWLEDGE ARCHITECTURE:
 * - Keys are generated and stored ONLY in the browser (sessionStorage).
 * - The backend never receives or stores an encryption key.
 * - Only the encrypted blob + IV are uploaded to the server.
 * - Decryption is performed entirely in-browser using the locally held key.
 */

const KEY_STORE_PREFIX = 'passport_key_';

/**
 * Generates a cryptographically secure AES-256-GCM key and stores it in sessionStorage.
 * Returns the CryptoKey and its passport_token reference.
 */
export async function generateAndStoreKey(passportToken) {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  // Store in sessionStorage — cleared when the browser tab closes
  sessionStorage.setItem(`${KEY_STORE_PREFIX}${passportToken}`, keyB64);
  return { cryptoKey: key, keyB64 };
}

/**
 * Loads a previously stored key from sessionStorage for a given passport token.
 * Returns null if the key is no longer available.
 */
export async function loadKeyForToken(passportToken) {
  const keyB64 = sessionStorage.getItem(`${KEY_STORE_PREFIX}${passportToken}`);
  if (!keyB64) return null;
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Encrypts a File or Blob using AES-256-GCM entirely in the browser.
 * The key is stored in sessionStorage under a temporary placeholder token.
 * Returns { encryptedB64, ivB64, hashB64, fileSizeBytes, tempKeyRef }
 * The caller must persist the key after learning the real passport_token from the server.
 */
export async function encryptFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // SHA-256 hash of original file for integrity verification
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Generate random IV (96-bit for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Generate key (stored temporarily under a random ref until real token is known)
  const tempRef = 'temp_' + Date.now();
  const { cryptoKey, keyB64 } = await generateAndStoreKey(tempRef);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    fileBytes
  );

  const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivB64 = btoa(String.fromCharCode(...iv));

  // SECURITY: keyB64 is NEVER returned to callers — it is stored only in sessionStorage.
  // Returning it in the result object risks it being logged, serialized, or transmitted.
  return { encryptedB64, ivB64, hashB64, fileSizeBytes: file.size, tempKeyRef: tempRef };
}

/**
 * After the server issues a real passport_token, migrate the key from the temp ref.
 */
export function migrateKeyToToken(tempRef, passportToken) {
  const keyB64 = sessionStorage.getItem(`${KEY_STORE_PREFIX}${tempRef}`);
  if (keyB64) {
    sessionStorage.setItem(`${KEY_STORE_PREFIX}${passportToken}`, keyB64);
    sessionStorage.removeItem(`${KEY_STORE_PREFIX}${tempRef}`);
  }
}

/**
 * Decrypts an encrypted passport file entirely in the browser.
 * Fetches the encrypted blob via signed URL from the backend (no key ever sent to server).
 * Requires the encryption key to be present in sessionStorage.
 */
export async function decryptFile(passportToken, mimeType = 'image/jpeg') {
  if (!passportToken) throw new Error('passport_token is required for decryption');

  const { base44 } = await import('@/api/base44Client');

  // Ask backend for: signed_url to encrypted blob + IV (no key)
  const res = await base44.functions.invoke('decryptPassportFile', { passport_token: passportToken });
  if (!res.data?.signed_url) throw new Error('Could not retrieve encrypted file from vault');

  const { signed_url, encryption_iv_b64 } = res.data;

  // Load decryption key from sessionStorage
  const cryptoKey = await loadKeyForToken(passportToken);
  if (!cryptoKey) {
    throw new Error(
      'Decryption key not found in this session. ' +
      'The passport was likely uploaded in a different browser session. ' +
      'Please re-upload your passport to create a new vault entry.'
    );
  }

  // Fetch the encrypted blob
  const blobRes = await fetch(signed_url);
  if (!blobRes.ok) throw new Error('Failed to fetch encrypted file');
  const encryptedBytes = new Uint8Array(await blobRes.arrayBuffer());

  const iv = Uint8Array.from(atob(encryption_iv_b64), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType });
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