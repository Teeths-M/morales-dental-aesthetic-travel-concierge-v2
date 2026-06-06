import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Allowlist of valid event types — matches AuditLog entity enum exactly
const ALLOWED_EVENT_TYPES = [
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
  'partner_notified',
  'safet_risk_status_changed',
  'clinical_boundary_acknowledged',
  'handshake_created',
  'handshake_completed',
  'case_accessed',
  'role_escalation_attempt',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: Authentication required — all actor fields derived from session, never from request body
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event_type, resource_type, resource_id, resource_name, case_id, details } = body;

    if (!event_type) {
      return Response.json({ error: 'event_type is required' }, { status: 400 });
    }

    // Validate event_type against allowlist — reject unknown event types
    if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
      return Response.json({
        error: `Invalid event_type. Allowed values: ${ALLOWED_EVENT_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // SECURITY: actor_id, actor_role, actor_email, and sensitive flag are ALWAYS derived
    // from the authenticated session — callers cannot forge these fields.
    // asServiceRole write is safe here — all actor fields are derived from the verified
    // user session above (never from request body). The auth.me() gate enforces authentication.
    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      event_type,
      actor_id: user.id,
      actor_role: user.role || 'user',
      actor_name: user.full_name || '',
      actor_email: user.email || '',
      resource_type: resource_type || 'unknown',
      resource_id: resource_id || '',
      resource_name: resource_name || '',
      case_id: case_id || null,
      details: details || {},
      sensitive: false, // Only internal server-side code (not callers) may log sensitive events
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, audit_id: auditEntry.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});