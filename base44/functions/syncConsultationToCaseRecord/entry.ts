import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fields that may be synced from Consultation → CaseRecord.
// Any field not in this list is silently ignored — never blindly merge arbitrary payload.
const ALLOWED_SYNC_FIELDS = ['procedure_country', 'client_country'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: Require admin auth OR treat as automation (no user).
    // If a user session is present, it must be admin/platform_admin.
    // Automation calls from Base44 scheduled/entity triggers arrive without a user session.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { event, data } = await req.json();

    if (!data?.id || !data?.consultation_id) {
      return Response.json({ success: true, message: 'Missing required fields — skipping sync' });
    }

    let consultation = null;
    try {
      consultation = await base44.asServiceRole.entities.Consultation.get(data.consultation_id);
    } catch (_) { /* not found */ }
    if (!consultation) {
      return Response.json({ success: true, message: 'Consultation not found — skipping sync' });
    }

    // SECURITY: Only sync from ALLOWED_SYNC_FIELDS — never merge arbitrary request body fields
    const updates = {};
    if (!data.procedure_country && consultation.procedure_country) {
      updates.procedure_country = consultation.procedure_country;
    }
    if (!data.client_country && consultation.client_country) {
      updates.client_country = consultation.client_country;
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.CaseRecord.update(data.id, updates);

      // Audit every sync operation (non-fatal if fails in automation context)
      try { await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'case_accessed',
        actor_id: user?.id || 'system',
        actor_role: user?.role || 'system',
        actor_name: user?.full_name || 'Sync Automation',
        actor_email: user?.email || '',
        resource_type: 'CaseRecord',
        resource_id: data.id,
        case_id: data.id,
        details: {
          synced_fields: Object.keys(updates),
          consultation_id: data.consultation_id,
          source: 'syncConsultationToCaseRecord',
        },
        sensitive: false,
        timestamp: new Date().toISOString(),
      }); } catch (_) { /* audit log is best-effort in automation context */ }
    }

    return Response.json({ success: true, synced_fields: Object.keys(updates) });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});