import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function generateShareToken() {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  return 'SHARE_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      vault_id,
      passport_token,
      recipient_email,
      recipient_domain,
      purpose = 'other',
      expires_in_hours = 24,
      max_access_count = 1
    } = await req.json();

    if (!vault_id || !passport_token) {
      return Response.json({ error: 'vault_id and passport_token required' }, { status: 400 });
    }

    // Verify ownership — SDK filter() cannot query by built-in `id` field.
    // Filter by passport_token (unique, indexed) and user_email to confirm ownership.
    const vaults = await base44.entities.PassportVault.filter({ passport_token, user_email: user.email });
    if (!vaults?.length) {
      return Response.json({ error: 'Vault not found or you do not own it' }, { status: 404 });
    }

    const vault = vaults[0];

    if (!vault.is_emergency_accessible && purpose !== 'medical') {
      return Response.json({ error: 'This document cannot be shared externally' }, { status: 403 });
    }

    const now = new Date();
    const expires_at = new Date(now.getTime() + expires_in_hours * 60 * 60 * 1000).toISOString();
    const share_token = await generateShareToken();

    // Create share link
    const shareLink = await base44.entities.SecureShareLink.create({
      share_token,
      vault_id,
      passport_token,
      owner_email: user.email,
      recipient_email: recipient_email || null,
      recipient_domain: recipient_domain || null,
      purpose,
      expires_at,
      max_access_count,
      access_count: 0,
      is_active: true,
      created_at: now.toISOString(),
      created_by: user.id
    });

    // Generate share URL
    const shareUrl = `${Deno.env.get('APP_URL')}/vault/share/${share_token}`;

    // Log to AuditLog
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'passport_access_approved',
      actor_id: user.id,
      actor_role: user.role || 'client',
      actor_name: user.full_name,
      resource_type: 'SecureShareLink',
      resource_id: shareLink.id,
      resource_name: `Share link for ${vault.document_type}`,
      details: {
        action: 'create_share_link',
        share_token,
        recipient_email,
        recipient_domain,
        purpose,
        expires_at,
        max_access_count,
        share_url: shareUrl,
      },
      sensitive: true,
    });

    return Response.json({
      success: true,
      share_token,
      share_url: shareUrl,
      expires_at,
      max_access_count
    });

  } catch (error) {
    console.error('[createSecureShareLink]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});