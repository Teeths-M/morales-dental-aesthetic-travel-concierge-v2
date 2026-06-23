import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── activateVerifiedDoctor ────────────────────────────────────────────────────
// THE SINGLE GATED FUNCTION that can set a Doctor to status='active'.
//
// SECURITY DESIGN:
//  • Admin-only — rejects any non-admin caller at the auth layer.
//  • All three sub-checks (license, identity, background) must be in a
//    terminal-passed state before activation is permitted.
//  • If any check is in 'manual_override' state, an override_reason is
//    mandatory — it is stored permanently in the audit log and on the record.
//  • Every activation is written to AuditLog with the admin's identity,
//    timestamps, and the state of all three checks at the moment of approval.
//  • Activation is permanent in terms of audit trail — even if a doctor is
//    later suspended, the original approval record is preserved.
//
// ADDING THIS FUNCTION IS NOT ENOUGH ON ITS OWN:
//  All other code paths that previously set status='active' directly
//  (verifyDoctorLicense, initiatePartnerVerification, manualReviewVerification,
//  ProviderVerificationOverride) must be patched to NOT set status='active'
//  and must route through this function instead.

const ADMIN_ROLES = new Set(['admin', 'platform_admin']);

// A check is "passed" if it was positively verified by any means,
// or the admin has explicitly chosen to override it with documented reasoning.
const PASSED = new Set(['passed', 'manual_override']);

function checksFailing(doctor: Record<string, unknown>): string[] {
  const failing: string[] = [];
  if (!PASSED.has(doctor.license_verification_status as string))
    failing.push(`license (${doctor.license_verification_status ?? 'not set'})`);
  if (!PASSED.has(doctor.identity_verification_status as string))
    failing.push(`identity (${doctor.identity_verification_status ?? 'not set'})`);
  if (!PASSED.has(doctor.background_check_status as string))
    failing.push(`background (${doctor.background_check_status ?? 'not set'})`);
  return failing;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !ADMIN_ROLES.has(user.role)) {
      return Response.json({ error: 'Unauthorized — admin access required' }, { status: 403 });
    }

    const { doctor_id, override_reason } = await req.json();
    if (!doctor_id) return Response.json({ error: 'doctor_id required' }, { status: 400 });

    const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id);
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    if (doctor.status === 'active') {
      return Response.json({ error: 'Doctor is already active — no action needed' }, { status: 400 });
    }

    // Determine whether any check is in manual_override state
    const hasManualOverride = [
      doctor.license_verification_status,
      doctor.identity_verification_status,
      doctor.background_check_status,
    ].includes('manual_override');

    // override_reason is mandatory when any check is overridden
    if (hasManualOverride && !override_reason?.trim()) {
      return Response.json({
        error: 'override_reason is required when any check is in manual_override state. Document your reasoning — this is a life-safety decision.',
        code: 'OVERRIDE_REASON_REQUIRED',
      }, { status: 400 });
    }

    // Gate: ALL three checks must be in a passed state
    const failing = checksFailing(doctor);
    if (failing.length > 0) {
      return Response.json({
        error: `Cannot activate: the following checks have not reached a passed state: ${failing.join(', ')}. Set each to "passed" or "manual_override" (with documented reasoning) before activating.`,
        failing_checks: failing,
        code: 'CHECKS_NOT_COMPLETE',
      }, { status: 422 });
    }

    const now = new Date().toISOString();
    const isManual = hasManualOverride;
    const finalVerificationStatus = isManual ? 'manually_approved' : 'verified';

    // Activate the doctor
    await base44.asServiceRole.entities.Doctor.update(doctor_id, {
      status: 'active',
      verification_status: finalVerificationStatus,
      verified_at: now,
      verifying_admin_id: user.id,
      verifying_admin_email: user.email,
      verification_notes: isManual
        ? `Manually approved by ${user.email} on ${now}. Override reason: ${override_reason}`
        : `All checks passed. Approved by ${user.email} on ${now}.`,
      ...(isManual && override_reason ? { verification_override_reason: override_reason.trim() } : {}),
    });

    // Immutable audit record — always written, never suppressible
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'doctor_activated',
      resource_type: 'doctor',
      resource_id: doctor_id,
      case_id: null,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      details: {
        doctor_name: doctor.full_name,
        doctor_email: doctor.email,
        license_verification_status: doctor.license_verification_status,
        identity_verification_status: doctor.identity_verification_status,
        background_check_status: doctor.background_check_status,
        verification_method: doctor.verification_method,
        had_manual_overrides: isManual,
        override_reason: override_reason?.trim() || null,
        final_verification_status: finalVerificationStatus,
        activated_at: now,
        activated_by_admin: user.email,
      },
      sensitive: true,
      timestamp: now,
    });

    // Notify the doctor — non-critical, never throws
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Platform',
        to: doctor.email,
        subject: '✅ Your Profile is Now Verified — Welcome to the Morales Network',
        body: `<p>Dear Dr. ${doctor.full_name},</p>
<p>Your credentials have been reviewed and approved. Your profile is now <strong>verified and active</strong> on the Morales Medical Travel Platform.</p>
<p>Patients searching for specialists in your field can now find and book with you.</p>
<p><strong>Important:</strong> Your verification must be renewed annually. We will contact you before it expires.</p>
<p>— The Morales Concierge Team</p>`,
      });
    } catch (_) { /* email failure is non-fatal */ }

    return Response.json({
      success: true,
      doctor_id,
      status: 'active',
      verification_status: finalVerificationStatus,
      had_manual_overrides: isManual,
      activated_at: now,
      activated_by: user.email,
    });

  } catch (error) {
    console.error('[activateVerifiedDoctor]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
