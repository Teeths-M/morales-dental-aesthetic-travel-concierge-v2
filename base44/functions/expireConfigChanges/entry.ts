import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * expireConfigChanges — scheduled every 60 minutes.
 * Marks expired pending SystemConfigChange records as "expired" and logs to AuditLog.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const pending = await base44.asServiceRole.entities.SystemConfigChange.filter({ status: 'pending' });
    const now = new Date();
    const expired = (pending || []).filter(r => r.expires_at && new Date(r.expires_at) < now);

    const results = [];
    for (const record of expired) {
      await base44.asServiceRole.entities.SystemConfigChange.update(record.id, { status: 'expired' });
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'role_escalation_attempt',
        actor_id: 'system',
        actor_role: 'system',
        actor_name: 'Automated Expiry',
        actor_email: 'system@internal',
        resource_type: 'SystemConfigChange',
        resource_id: record.id,
        resource_name: record.config_key,
        details: { action: 'config_change_expired', config_key: record.config_key, expired_at: now.toISOString() },
        sensitive: true,
        timestamp: now.toISOString(),
      });
      results.push(record.id);
    }

    return Response.json({ success: true, expired_count: results.length, expired_ids: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});