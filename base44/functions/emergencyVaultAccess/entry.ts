import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// SEC-06: Fetch real prev_hash to maintain the tamper-evident audit chain
async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

async function validatePinSession(base44, token) {
  if (!token) return { valid: false, error: 'pin_session_token required' };
  const tokenHash = await sha256(token);
  const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash, is_revoked: false });
  if (!sessions.length) return { valid: false, error: 'Invalid or expired session' };
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: 'Session expired' };
  }
  await base44.asServiceRole.entities.PinSession.update(session.id, {
    last_used_at: new Date().toISOString(),
    use_count: (session.use_count || 0) + 1,
  });
  return { valid: true, session };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { pin_session_token } = await req.json();
    if (!pin_session_token) {
      return Response.json({ error: 'pin_session_token required' }, { status: 400 });
    }

    const sessionResult = await validatePinSession(base44, pin_session_token);
    if (!sessionResult.valid) {
      return Response.json({ error: sessionResult.error }, { status: 401 });
    }

    const session = sessionResult.session;
    const user_email = session.user_email;

    const vaults = await base44.asServiceRole.entities.PassportVault.filter(
      { user_email, is_emergency_accessible: true, status: 'active' },
      '-uploaded_at',
      50
    );

    const vaultList = vaults.map(v => ({
      vault_id: v.id,
      vault_token: v.passport_token,
      document_type: v.document_type,
      file_name: v.file_name,
      mime_type: v.mime_type,
      file_size_bytes: v.file_size_bytes,
      uploaded_at: v.uploaded_at,
      redacted_for_display: v.redacted_for_display,
    }));

    // SEC-06: Real prev_hash — hardcoded literals break the tamper-evident chain
    const prevHash = await getLastAuditHash(base44);
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'passport_access_requested',
      actor_id: session.user_id || 'emergency_pin_user',
      actor_role: 'emergency_pin',
      actor_name: 'Emergency PIN Access',
      resource_type: 'PassportVault',
      resource_id: 'multiple',
      resource_name: `Emergency vault access (${vaults.length} documents)`,
      details: {
        action: 'emergency_vault_access',
        user_email,
        vault_count: vaults.length,
        // Use the rightmost IP — proxies append, so rightmost = actual client
        ip_address: (() => { const f = req.headers.get('x-forwarded-for'); return f ? f.split(',').pop()?.trim() || 'unknown' : req.headers.get('cf-connecting-ip') || 'unknown'; })(),
      },
      sensitive: true,
      timestamp: new Date().toISOString(),
      prev_hash: prevHash,
    });

    return Response.json({
      success: true,
      user_email,
      vaults: vaultList,
      session_expires_at: session.expires_at
    });

  } catch (error) {
    // SEC-10: Never leak internal error details to the client
    console.error('[emergencyVaultAccess]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});