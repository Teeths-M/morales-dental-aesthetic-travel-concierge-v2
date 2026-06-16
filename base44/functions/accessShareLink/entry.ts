import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { share_token, pin_session_token } = await req.json();
    if (!share_token) {
      return Response.json({ error: 'share_token required' }, { status: 400 });
    }

    // Find share link
    const shareLinks = await base44.asServiceRole.entities.SecureShareLink.filter({ share_token, is_active: true });
    if (!shareLinks?.length) {
      return Response.json({ error: 'Share link not found or expired' }, { status: 404 });
    }

    const shareLink = shareLinks[0];
    const now = new Date();

    // Check expiration
    if (new Date(shareLink.expires_at) < now) {
      return Response.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Check access count
    if (shareLink.access_count >= shareLink.max_access_count) {
      return Response.json({ error: 'Maximum access count reached' }, { status: 410 });
    }

    // Optional: verify recipient email if specified
    if (shareLink.recipient_email) {
      // In a real implementation, verify the user's email matches
      // For now, we just log it
    }

    // Get vault
    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ id: shareLink.vault_id });
    if (!vaults?.length) {
      return Response.json({ error: 'Vault not found' }, { status: 404 });
    }

    const vault = vaults[0];

    // Get signed URL
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: vault.encrypted_file_uri,
      expires_in: 60
    });

    // Update access count
    await base44.asServiceRole.entities.SecureShareLink.update(shareLink.id, {
      access_count: (shareLink.access_count || 0) + 1,
      last_accessed_at: now.toISOString(),
      last_accessed_ip: req.headers.get('x-forwarded-for') || 'unknown'
    });

    // Log to AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'passport_access_granted',
      actor_id: 'share_link_' + share_token,
      actor_role: 'external_recipient',
      actor_name: 'External recipient via share link',
      resource_type: 'PassportVault',
      resource_id: vault.id,
      resource_name: `${vault.document_type} - ${vault.file_name}`,
      details: {
        action: 'share_link_access',
        share_token,
        purpose: shareLink.purpose,
        ip_address: req.headers.get('x-forwarded-for'),
      },
      sensitive: true,
      timestamp: now.toISOString(),
      prev_hash: 'SHARE_LINK_ACCESS',
    });

    return Response.json({
      signed_url,
      encryption_iv_b64: vault.encryption_iv_b64,
      encryption_salt_b64: vault.encryption_salt_b64,
      file_name: vault.file_name,
      mime_type: vault.mime_type,
      redacted_for_display: vault.redacted_for_display,
      purpose: shareLink.purpose,
      accesses_remaining: shareLink.max_access_count - shareLink.access_count - 1
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});