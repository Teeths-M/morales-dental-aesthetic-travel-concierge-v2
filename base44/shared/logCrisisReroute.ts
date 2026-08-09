/**
 * logCrisisReroute — a small, NEVER-THROWING logging helper for the real
 * automated safety-net functions (checkPartnerSLABreaches, detectFallbackCrisis,
 * escalateMissedDriverHandshake, dispatchSecurityForCheckIn, escalateSoloCheckIn).
 *
 * It does NOT search for backups or send notifications — every caller already
 * does that work itself. This only writes the CrisisReroute audit row so
 * /admin/crisis-reroutes reflects what the real cron safety net is doing,
 * not just chat-agent-invoked handleCrisisReroute calls.
 *
 * Logging must never block or fail the real safety action that calls it —
 * the entire body is wrapped in try/catch, and any failure is swallowed
 * after a console.error.
 */

export async function logCrisisReroute(base44: any, fields: {
  case_id: string;
  crisis_type: string;
  detected_by: string;
  original_provider_type?: string;
  original_provider_name?: string;
  status: 'detected' | 'rerouting' | 'resolved' | 'human_escalated' | 'failed';
  selected_backup_id?: string;
  selected_backup_name?: string;
  selected_backup_type?: string;
  human_escalated?: boolean;
  human_escalated_reason?: string;
  source_message?: string;
}): Promise<void> {
  try {
    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(fields.case_id);
    } catch (_) {
      caseRecord = null;
    }

    await base44.asServiceRole.entities.CrisisReroute.create({
      case_id: fields.case_id,
      client_email: caseRecord?.client_email || '',
      client_name: caseRecord?.client_name || '',
      original_booking_id: fields.case_id,
      original_provider_type: fields.original_provider_type || '',
      original_provider_name: fields.original_provider_name || '',
      crisis_type: fields.crisis_type,
      detected_at: new Date().toISOString(),
      detected_by: fields.detected_by,
      source_message: fields.source_message || '',
      status: fields.status,
      selected_backup_id: fields.selected_backup_id || '',
      selected_backup_name: fields.selected_backup_name || '',
      selected_backup_type: fields.selected_backup_type || '',
      human_escalated: !!fields.human_escalated,
      human_escalated_reason: fields.human_escalated_reason || '',
    });
  } catch (error) {
    console.error('[logCrisisReroute] failed to log — not blocking the real safety action', error);
  }
}
