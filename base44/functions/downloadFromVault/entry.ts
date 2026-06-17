import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { vault_token } = await req.json();
    if (!vault_token) return Response.json({ error: 'vault_token required' }, { status: 400 });

    // Entity field is passport_token, not vault_token
    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token: vault_token });
    if (!vaults?.length) return Response.json({ error: 'Vault entry not found' }, { status: 404 });

    const vault = vaults[0];

    // Authorization: owner or admin only
    if (vault.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Guard: encryption_salt_b64 was added after initial launch — older vault documents won't have it.
    // Fail fast BEFORE generating the signed URL or mutating any stats, since no download will occur.
    if (!vault.encryption_salt_b64) {
      return Response.json({
        error: 'This document was encrypted with a legacy format and cannot be decrypted. Please re-upload it.',
        error_code: 'LEGACY_ENCRYPTION_NO_SALT',
      }, { status: 422 });
    }

    // Return signed URL + encryption metadata (IV + salt, NOT the key)
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: vault.encrypted_file_uri,
      expires_in: 60
    });

    // Update access stats
    await base44.asServiceRole.entities.PassportVault.update(vault.id, {
      access_count: (vault.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    // Log to AuditLog
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'passport_token_viewed',
      actor_id: user.id,
      actor_role: user.role || 'client',
      actor_name: user.full_name,
      resource_type: 'PassportVault',
      resource_id: vault.id,
      resource_name: `${vault.document_type} - ${vault.file_name}`,
      details: {
        action: 'vault_download',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      },
      sensitive: true,
    });

    return Response.json({
      signed_url,
      encryption_iv_b64: vault.encryption_iv_b64,
      encryption_salt_b64: vault.encryption_salt_b64,
      integrity_hash: vault.integrity_hash,
      file_name: vault.file_name,
      mime_type: vault.mime_type,
      redacted_for_display: vault.redacted_for_display
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});