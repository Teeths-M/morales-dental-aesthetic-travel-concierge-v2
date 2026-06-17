/**
 * Vault Service
 * Centralises all PassportVault + SecureShareLink data access.
 * Components import from here — never call base44.entities directly for vault ops.
 */
import { base44 } from '@/api/base44Client';

export const vaultService = {
  /** Fetch all active vault documents for a user */
  getActiveDocuments: (userEmail) =>
    base44.entities.PassportVault.filter({ user_email: userEmail, status: 'active' }, '-uploaded_at', 50),

  /** Check if a user has at least one active vault document */
  hasDocuments: async (userEmail) => {
    const results = await base44.entities.PassportVault.filter({ user_email: userEmail, status: 'active' }, '-uploaded_at', 1);
    return results.length > 0;
  },

  /** Soft-delete (archive) a vault document */
  archiveDocument: (vaultId) =>
    base44.entities.PassportVault.update(vaultId, { status: 'archived' }),

  /** Fetch active share links for a user */
  getActiveShareLinks: (ownerEmail) =>
    base44.entities.SecureShareLink.filter({ owner_email: ownerEmail, is_active: true }, '-created_at', 20),

  /** Fetch audit log entries for a user */
  getAuditLog: (userId) =>
    base44.entities.AuditLog.filter({ actor_id: userId }, '-timestamp', 50),

  /** Request a signed download URL + metadata for decryption */
  requestDownload: (vaultToken) =>
    base44.functions.invoke('downloadFromVault', { vault_token: vaultToken }),

  /** Create a time-limited, access-capped share link */
  createShareLink: ({ vaultId, passportToken, purpose, expiresInHours, maxAccessCount }) =>
    base44.functions.invoke('createSecureShareLink', {
      vault_id: vaultId,
      passport_token: passportToken,
      purpose,
      expires_in_hours: expiresInHours,
      max_access_count: maxAccessCount,
    }),

  /** Upload a pre-encrypted file to the vault */
  uploadEncrypted: (payload) => base44.functions.invoke('uploadToVault', payload),
};