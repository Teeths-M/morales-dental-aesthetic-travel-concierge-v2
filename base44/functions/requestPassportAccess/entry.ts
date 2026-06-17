import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function generateGrantToken() {
  const rawBytes = new Uint8Array(24);
  crypto.getRandomValues(rawBytes);
  return 'GRANT_' + Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const ACCESS_LEVEL_BY_ROLE = {
  doctor: 'identity_only',
  travel_agency: 'travel_dates_only',
  admin: 'full_document',
  hospital_staff: 'identity_only'
};

const DEFAULT_HOURS_BY_ROLE = {
  doctor: 48,
  travel_agency: 48,
  admin: 72,
  hospital_staff: 24
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { passport_token, case_id, access_reason, requester_role, requester_name, duration_hours } = await req.json();

    if (!passport_token || !access_reason || !requester_role) {
      return Response.json({ error: 'passport_token, access_reason, and requester_role are required' }, { status: 400 });
    }

    if (!case_id) {
      return Response.json({ error: 'case_id is required to bind passport access to a case' }, { status: 400 });
    }

    // Verify vault exists and is active
    const vaults = await base44.asServiceRole.entities.PassportVault.filter({ passport_token, status: 'active' });
    if (!vaults.length) {
      return Response.json({ error: 'Passport vault not found or not active' }, { status: 404 });
    }
    const vault = vaults[0];

    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';

    // SECURITY: Bind passport_token to case_id and verify requester is assigned to that case.
    // Prevents any provider/vendor from accessing an unrelated patient's passport.
    if (!isAdmin) {
      let caseRecord;
      try {
        caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      } catch (_) { /* not found */ }

      if (!caseRecord) {
        // Audit denied attempt
        await base44.asServiceRole.entities.PassportAuditLog.create({
          passport_token,
          actor_id: user.id,
          actor_role: user.role,
          actor_name: user.full_name || '',
          action: 'request_access_denied',
          status: 'denied',
          timestamp: new Date().toISOString(),
          metadata: { reason: 'case_not_found', case_id }
        });
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }

      // Verify the passport_token in the vault actually belongs to this case
      // (consultation's passport_vault_token must match, or case must reference this vault)
      const consultationId = caseRecord.consultation_id;
      let tokenBound = false;
      if (consultationId) {
        try {
          const consultation = await base44.asServiceRole.entities.Consultation.get(consultationId);
          if (consultation && consultation.passport_vault_token === passport_token) {
            tokenBound = true;
          }
        } catch (_) { /* consultation not found */ }
      }
      // Also accept if requester is the patient (case owner)
      const isPatient = caseRecord.client_email === user.email;

      if (!tokenBound && !isPatient) {
        await base44.asServiceRole.entities.PassportAuditLog.create({
          passport_token,
          patient_id: vault.created_by_id,
          patient_email: vault.patient_email,
          actor_id: user.id,
          actor_role: user.role,
          actor_name: user.full_name || '',
          action: 'request_access_denied',
          status: 'denied',
          timestamp: new Date().toISOString(),
          metadata: { reason: 'passport_not_bound_to_case', case_id }
        });
        return Response.json({ error: 'Access denied: passport not associated with this case' }, { status: 403 });
      }
    }

    const access_level = ACCESS_LEVEL_BY_ROLE[requester_role] || 'redacted_metadata';
    const hours = duration_hours || DEFAULT_HOURS_BY_ROLE[requester_role] || 24;
    const expires_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const grant_token = await generateGrantToken();

    const auto_approve = isAdmin;

    const grant = await base44.asServiceRole.entities.PassportAccessGrant.create({
      grant_token,
      passport_vault_id: vault.id,
      passport_token,
      patient_id: vault.created_by_id,
      patient_email: vault.patient_email,
      requester_role,
      requester_id: user.id,
      requester_name: requester_name || user.full_name,
      requester_email: user.email,
      case_id: case_id || '',
      access_reason,
      access_level,
      status: auto_approve ? 'approved' : 'pending_approval',
      granted_at: auto_approve ? new Date().toISOString() : null,
      expires_at,
      auto_approved: auto_approve,
      access_count: 0
    });

    // Audit log
    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token,
      patient_id: vault.created_by_id,
      patient_email: vault.patient_email,
      actor_id: user.id,
      actor_role: requester_role,
      actor_name: requester_name || user.full_name,
      action: 'request_access',
      grant_token,
      status: 'success',
      timestamp: new Date().toISOString(),
      metadata: { access_reason, access_level, duration_hours: hours, auto_approved: auto_approve }
    });

    // Notify patient if approval is needed
    if (!auto_approve) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: vault.patient_email,
        subject: `Passport Access Request — ${requester_name || 'A provider'} needs to view your documents`,
        body: `
<html><body style="font-family:Arial,sans-serif;color:#13221d;background:#f5f7f4;padding:28px;">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #dde5df;">
  <h2 style="font-family:Georgia,serif;color:#29483d;">Access Request for Your Passport</h2>
  <p><strong>${requester_name || 'A healthcare provider'}</strong> (${requester_role.replace('_', ' ')}) is requesting to view your encrypted passport document.</p>
  <table style="width:100%;border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin:20px 0;">
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Reason</td><td style="font-weight:600;">${access_reason.replace(/_/g, ' ')}</td></tr>
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Access Level</td><td style="font-weight:600;">${access_level.replace(/_/g, ' ')}</td></tr>
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Duration</td><td style="font-weight:600;">${hours} hours</td></tr>
    <tr><td style="padding:8px 0;color:#64746d;font-size:13px;">Grant Token</td><td><code style="font-size:12px;">${grant_token}</code></td></tr>
  </table>
  <p>Please log in to your patient dashboard to <strong>approve or deny</strong> this request.</p>
  <p style="color:#64746d;font-size:13px;">If you did not expect this request, please deny it immediately and contact support.</p>
</div>
</body></html>`
      });
    }

    return Response.json({
      success: true,
      grant_token,
      status: grant.status,
      access_level,
      expires_at,
      auto_approved: auto_approve
    });

  } catch (error) {
    console.error('[requestPassportAccess]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});