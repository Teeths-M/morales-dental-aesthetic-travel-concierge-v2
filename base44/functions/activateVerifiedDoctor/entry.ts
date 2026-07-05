import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// ── activateVerifiedDoctor ────────────────────────────────────────────────────
// THE SINGLE GATED FUNCTION that can set a Doctor to status='active'.
//
// SECURITY DESIGN:
//  • Two ways in: (1) an authenticated admin, or (2) a cryptographically signed
//    auto-activation proof generated ONLY by initiatePartnerVerification's clear-
//    scan path (see verifyAutoActivationProof below). No other caller shape works.
//  • All three sub-checks (license, identity, background) must be in a
//    terminal-passed state before activation is permitted.
//  • The auto-activation path additionally requires all three checks to be
//    strictly 'passed' (never 'manual_override') — an override always means a
//    human already had to weigh in, so it can never ride the no-human-touch path.
//  • If any check is in 'manual_override' state, an override_reason is
//    mandatory — it is stored permanently in the audit log and on the record.
//  • Every activation is written to AuditLog with the admin's identity (or
//    'system:auto_clear_scan' for the automated path), timestamps, and the
//    state of all three checks at the moment of approval.
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

// Verifies a short-lived HMAC proof that only initiatePartnerVerification can produce
// (it holds the same DOCTOR_AUTO_ACTIVATION_SECRET). Proof expires after 60 seconds so
// it can never be replayed later or reused for a different doctor.
function verifyAutoActivationProof(doctorId: string, timestamp: string, proof: string): boolean {
  const secret = Deno.env.get('DOCTOR_AUTO_ACTIVATION_SECRET');
  if (!secret || !timestamp || !proof) return false;
  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() - ts) > 60_000) return false;
  const expected = createHmac('sha256', secret).update(`${doctorId}:${timestamp}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const proofBuf = Buffer.from(proof, 'hex');
  if (expectedBuf.length !== proofBuf.length) return false;
  return timingSafeEqual(expectedBuf, proofBuf);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { doctor_id, override_reason, auto_activation_timestamp, auto_activation_proof } = await req.json();
    if (!doctor_id) return Response.json({ error: 'doctor_id required' }, { status: 400 });

    // NOTE: a nested base44.functions.invoke() call (e.g. from initiatePartnerVerification)
    // carries the original caller's session forward, so `user` is often NOT null even for
    // the legitimate automated path. Legitimacy here is decided purely by the cryptographic
    // proof, never by whether a user happens to be present.
    const user = await base44.auth.me().catch(() => null);
    const isAutoActivation = verifyAutoActivationProof(doctor_id, auto_activation_timestamp, auto_activation_proof);

    if (!isAutoActivation && (!user || !ADMIN_ROLES.has(user.role))) {
      return Response.json({ error: 'Unauthorized — admin access required' }, { status: 403 });
    }

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

    // The auto-activation (no-human-touch) path is only valid when every check
    // is strictly 'passed' — an override always implies a human already made a
    // judgment call, so it can never be the thing that grants a human-free activation.
    if (isAutoActivation && hasManualOverride) {
      return Response.json({
        error: 'Auto-activation is not permitted when any check is in manual_override state — this requires human admin approval.',
        code: 'AUTO_ACTIVATION_REQUIRES_CLEAN_PASS',
      }, { status: 422 });
    }

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
    const finalVerificationStatus = isManual ? 'manually_approved' : (isAutoActivation ? 'auto_verified' : 'verified');
    const actorId = isAutoActivation ? 'system' : user!.id;
    const actorEmail = isAutoActivation ? 'system:auto_clear_scan' : user!.email;
    const actorName = isAutoActivation ? 'Automated Clear-Scan Activation' : (user!.full_name || user!.email);

    // Activate the doctor
    await base44.asServiceRole.entities.Doctor.update(doctor_id, {
      status: 'active',
      verification_status: finalVerificationStatus,
      verified_at: now,
      verifying_admin_id: actorId,
      verifying_admin_email: actorEmail,
      verification_notes: isManual
        ? `Manually approved by ${actorEmail} on ${now}. Override reason: ${override_reason}`
        : isAutoActivation
          ? `Automatically activated — all checks (license, identity, background) passed cleanly with no manual review, per automated clear-scan policy. ${now}.`
          : `All checks passed. Approved by ${actorEmail} on ${now}.`,
      ...(isManual && override_reason ? { verification_override_reason: override_reason.trim() } : {}),
    });

    // Immutable audit record — always written, never suppressible
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'doctor_activated',
      resource_type: 'doctor',
      resource_id: doctor_id,
      case_id: null,
      actor_id: actorId,
      actor_name: actorName,
      details: {
        doctor_name: doctor.full_name,
        doctor_email: doctor.email,
        license_verification_status: doctor.license_verification_status,
        identity_verification_status: doctor.identity_verification_status,
        background_check_status: doctor.background_check_status,
        verification_method: doctor.verification_method,
        had_manual_overrides: isManual,
        auto_activated: isAutoActivation,
        override_reason: override_reason?.trim() || null,
        final_verification_status: finalVerificationStatus,
        activated_at: now,
        activated_by_admin: actorEmail,
      },
      sensitive: true,
      timestamp: now,
      prev_hash: await computePrevHash(base44),
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
      activated_by: actorEmail,
      auto_activated: isAutoActivation,
    });

  } catch (error) {
    console.error('[activateVerifiedDoctor]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
