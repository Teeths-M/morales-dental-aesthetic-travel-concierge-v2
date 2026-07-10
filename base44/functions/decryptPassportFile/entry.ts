import { createHandler } from '../_shared/createHandler.ts';

// ZERO-KNOWLEDGE ARCHITECTURE:
// The backend does NOT hold encryption keys. It returns the encrypted blob + IV only.
// Decryption happens entirely in the client browser using the user's locally-stored key.

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { passport_token } = await body();
    if (!passport_token) return Response.json({ error: 'passport_token required' }, { status: 400 });

    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token });
    if (!vaults?.length) return Response.json({ error: 'Passport not found' }, { status: 404 });

    const vault = vaults[0];

    // BUG-R4-03 FIX: PassportVault schema stores `user_email` not `patient_email`.
    // The old check used `vault.patient_email` which is always undefined → always denied the owner.
    // Also check `vault.user_id` as a secondary fallback for records created before user_email was set.
    const isOwner = (vault.user_email && vault.user_email === user.email) ||
                    (vault.user_id && vault.user_id === user.id);
    if (!isOwner && user.role !== 'admin' && user.role !== 'platform_admin') {
      await base44.asServiceRole.entities.PassportAuditLog.create({
        passport_token,
        patient_email: vault.user_email || vault.patient_email,
        actor_id: user.id,
        actor_role: user.role || 'unknown',
        actor_name: user.full_name,
        action: 'view',
        status: 'denied',
        reason_if_denied: 'Unauthorized access attempt',
        timestamp: new Date().toISOString()
      });
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return a short-lived signed URL for the encrypted file + the IV.
    // The client uses its locally-held key + this IV to decrypt in-browser.
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: vault.encrypted_file_uri,
      expires_in: 60
    });

    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token,
      patient_email: vault.user_email || vault.patient_email,
      actor_id: user.id,
      actor_role: user.role === 'admin' ? 'admin' : 'patient',
      actor_name: user.full_name,
      action: 'view',
      status: 'success',
      timestamp: new Date().toISOString()
    });

    await base44.asServiceRole.entities.PassportVault.update(vault.id, {
      access_count: (vault.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    // Return the signed URL and IV — client fetches the blob and decrypts locally
    return Response.json({
      signed_url,
      encryption_iv_b64: vault.encryption_iv_b64,
      file_hash_sha256: vault.file_hash_sha256,
      redacted_for_display: vault.redacted_for_display
    });
}, { name: 'decryptPassportFile' }));
