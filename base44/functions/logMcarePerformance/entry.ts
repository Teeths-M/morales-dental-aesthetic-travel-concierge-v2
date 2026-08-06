import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// logMcarePerformance — fire-and-forget analytics hook M-Care calls on every
// journey stage advance / key outcome. It reuses the tamper-evident audit chain
// (logAuditEvent) so no new chain logic is duplicated. Analytics must NEVER
// break the agent's conversation flow: any audit failure is swallowed and
// reported as logged:false rather than surfaced as an error to the agent.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      conversation_id,
      case_id,
      stage_from,
      stage_to,
      partner_type,
      outcome,
      notes,
    } = body || {};

    if (!stage_to) {
      return Response.json({ error: 'stage_to is required' }, { status: 400 });
    }

    try {
      const result = await base44.functions.invoke('logAuditEvent', {
        event_type: 'mcare_stage_transition',
        resource_type: 'mcare_conversation',
        resource_id: conversation_id || '',
        case_id: case_id || null,
        details: {
          stage_from: stage_from || null,
          stage_to,
          partner_type: partner_type || null,
          outcome: outcome || null,
          notes: notes || '',
        },
      });
      const auditId = result?.data?.audit_id || null;
      return Response.json({ ok: true, logged: true, audit_id: auditId });
    } catch (logErr) {
      // Best-effort analytics: never break the patient's journey.
      return Response.json({ ok: true, logged: false, reason: 'audit_log_unavailable' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}