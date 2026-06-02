/**
 * Client-side AES-256-GCM Passport Encryption Utility
 * Keys NEVER leave the browser. Only encrypted blobs are uploaded.
 */

/**
 * Generates a cryptographically secure AES-256-GCM key.
 */
export async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return {
    cryptoKey: key,
    keyB64: btoa(String.fromCharCode(...new Uint8Array(rawKey)))
  };
}

/**
 * Encrypts a File or Blob using AES-256-GCM.
 * Returns encrypted bytes (ArrayBuffer), iv (base64), and original file hash.
 */
export async function encryptFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // Generate a SHA-256 hash of original file for integrity
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Generate random IV (96 bits = 12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Generate encryption key
  const { cryptoKey, keyB64 } = await generateEncryptionKey();

  // Encrypt the file
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    fileBytes
  );

  const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivB64 = btoa(String.fromCharCode(...iv));

  return {
    encryptedB64,
    keyB64,
    ivB64,
    hashB64,
    fileSizeBytes: file.size
  };
}

/**
 * Decrypts an encrypted blob using the provided key + IV (both base64).
 * Returns a Blob (original file) for display.
 */
export async function decryptFile(encryptedB64, keyB64, ivB64, mimeType = 'image/jpeg') {
  const encryptedBytes = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBytes
  );

  return new Blob([decryptedBuffer], { type: mimeType });
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