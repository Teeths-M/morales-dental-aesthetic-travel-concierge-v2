import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

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

    // SEC-03: Enforce recipient_email restriction — this was previously a no-op stub
    if (shareLink.recipient_email) {
      let requestUser = null;
      try { requestUser = await base44.auth.me(); } catch (_) {}
      if (!requestUser || requestUser.email !== shareLink.recipient_email) {
        return Response.json({ error: 'This share link is restricted to a specific recipient. Please log in with the correct account.' }, { status: 403 });
      }
    }

    // Get vault — SDK filter() cannot query by built-in `id` field.
    // Use passport_token (stored on SecureShareLink as passport_token) for the lookup.
    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token: shareLink.passport_token });
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

    // BUG-01 FIX: 'passport_access_granted' is NOT in the AuditLog entity enum — it caused
    // a validation error on every access, making the entire share link feature return 500.
    // Correct enum value is 'passport_access_approved' (document shared = access approved).
    const prevHash = await getLastAuditHash(base44);
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'passport_access_approved',
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
      prev_hash: prevHash,
    });

    return Response.json({
      signed_url,
      encryption_iv_b64: vault.encryption_iv_b64,
      encryption_salt_b64: vault.encryption_salt_b64,
      file_name: vault.file_name,
      mime_type: vault.mime_type,
      redacted_for_display: vault.redacted_for_display,
      purpose: shareLink.purpose,
      // BUG-10 FIX: shareLink.access_count is the pre-update stale value (+1 was written above).
      // Add 1 to the stale count before subtracting to get the correct post-update remainder.
      accesses_remaining: Math.max(0, shareLink.max_access_count - (shareLink.access_count + 1))
    });

  } catch (error) {
    // SEC-10: Never leak internal stack details to clients
    console.error('[accessShareLink]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});