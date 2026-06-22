import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * expireConfigChanges — scheduled every 60 minutes.
 * Marks expired pending SystemConfigChange records as "expired" and logs to AuditLog.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // BUG-R6-05 FIX: bound the query — unbounded filter loads the full table into memory each cron run
    const pending = await base44.asServiceRole.entities.SystemConfigChange.filter({ status: 'pending' }, '-created_date', 200);
    const now = new Date();
    const expired = (pending || []).filter(r => r.expires_at && new Date(r.expires_at) < now);

    const results = [];
    for (const record of expired) {
      await base44.asServiceRole.entities.SystemConfigChange.update(record.id, { status: 'expired' });
      // BUG-R4-12 FIX: logAuditEvent calls base44.auth.me() internally which requires a user JWT.
      // In a scheduled cron context there is no user session, so the invoke would return 401 and
      // throw, aborting the entire expiry loop after the first record.
      // Write directly to AuditLog via service role instead of invoking the user-auth-gated endpoint.
      try {
        // BUG-R6-01 FIX: prev_hash must be computed from the last real AuditLog entry.
        // Hardcoding 'SYSTEM_EXPIRY' writes a literal that breaks the hash chain —
        // every subsequent verifyAuditChain run will detect a false-positive integrity
        // violation and send a critical alert email for every expiry event.
        let prevHash = 'GENESIS';
        try {
          const lastLogs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
          if (lastLogs && lastLogs[0]) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(lastLogs[0])));
            prevHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          }
        } catch (_) { prevHash = 'GENESIS_FALLBACK'; }

        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'role_escalation_attempt',
          actor_id: 'system',
          actor_role: 'system',
          actor_name: 'Automated Config Expiry',
          resource_type: 'SystemConfigChange',
          resource_id: record.id,
          resource_name: record.config_key,
          details: { action: 'config_change_expired', config_key: record.config_key, expired_at: now.toISOString() },
          sensitive: false,
          timestamp: now.toISOString(),
          prev_hash: prevHash,
        });
      } catch (logErr) {
        console.error('[expireConfigChanges] audit log failed for', record.id, logErr);
      }
      results.push(record.id);
    }

    return Response.json({ success: true, expired_count: results.length, expired_ids: results });
  } catch (error) {
    // BUG-R4-07 FIX: SEC-10 — never expose internal error details
    console.error('[expireConfigChanges]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});