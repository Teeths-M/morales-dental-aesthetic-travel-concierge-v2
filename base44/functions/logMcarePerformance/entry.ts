import { createHandler, ok, err } from '../../shared/createHandler.ts';

// logMcarePerformance — fire-and-forget analytics hook M-Care calls on every
// journey stage advance / key outcome. It reuses the tamper-evident audit chain
// (logAuditEvent) so no new chain logic is duplicated. Analytics must NEVER
// break the agent's conversation flow: any audit failure is swallowed and
// reported as logged:false rather than surfaced as an error to the agent.

Deno.serve(createHandler(async ({ base44, body }) => {
    const {
      conversation_id,
      case_id,
      stage_from,
      stage_to,
      partner_type,
      outcome,
      notes,
    } = await body() || {};

    if (!stage_to) {
      return err('stage_to is required');
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
      return ok({ ok: true, logged: true, audit_id: auditId });
    } catch (logErr) {
      // Best-effort analytics: never break the patient's journey.
      return ok({ ok: true, logged: false, reason: 'audit_log_unavailable' });
    }
}, { name: 'logMcarePerformance' }));