import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Allowlist of valid event types — matches AuditLog entity enum exactly
const ALLOWED_EVENT_TYPES = new Set([
  'sensitive_profile_viewed',
  'passport_token_viewed',
  'passport_access_requested',
  'passport_access_approved',
  'passport_access_denied',
  'dietary_profile_updated',
  'allergy_profile_updated',
  'waiver_requested',
  'waiver_signed',
  'waiver_refused',
  'companion_required_flagged',
  'companion_assigned',
  'companion_handshake_completed',
  'companion_job_accepted',
  'companion_job_cancelled',
  'partner_notified',
  'partner_verification_approved',
  'partner_verification_rejected',
  'safet_risk_status_changed',
  'clinical_boundary_acknowledged',
  'handshake_created',
  'handshake_completed',
  'case_accessed',
  'role_escalation_attempt',
  'safe_t_critical_block',
  'safe_t_high_risk_waiver_signed',
  'emergency_pin_reset',
  'vault_pin_reset',
  'emergency_pin_failed',
  'recovery_guidance_drafted',
  'recovery_guidance_approved',
  'recovery_guidance_rejected',
  'doctor_nomination_submitted',
  'doctor_nomination_approved',
  'doctor_nomination_rejected',
  'doctor_nomination_outreach_sent',
  'doctor_nomination_opted_out',
  'gdpr_deletion',
  'account_deletion_requested',
  'account_deletion_completed',
  'mcare_stage_transition',
]);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { event_type, resource_type, resource_id, resource_name, case_id, details } = await body();

  if (!event_type) return err('event_type is required');
  if (!ALLOWED_EVENT_TYPES.has(event_type)) {
    return err(`Invalid event_type. Allowed: ${[...ALLOWED_EVENT_TYPES].join(', ')}`);
  }

  // HASH CHAIN: Fetch last entry to compute chain link.
  // Any deletion or modification of a log entry breaks the chain — detectable on audit.
  let prevHash = 'GENESIS';
  try {
    const lastEntries = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    if (lastEntries?.length > 0) {
      prevHash = await sha256(JSON.stringify(lastEntries[0]));
    }
  } catch (_) {
    prevHash = 'GENESIS_FALLBACK';
  }

  // SECURITY: actor fields are always derived from the session — callers cannot forge them.
  const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
    event_type,
    actor_id: user!.id,
    actor_role: user!.role || 'user',
    actor_name: user!.full_name || '',
    actor_email: user!.email || '',
    resource_type: resource_type || 'unknown',
    resource_id: resource_id || '',
    resource_name: resource_name || '',
    case_id: case_id || null,
    details: details || {},
    sensitive: false,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash,
  });

  return ok({ success: true, audit_id: auditEntry.id });
}, { name: 'logAuditEvent', requireAuth: true }));