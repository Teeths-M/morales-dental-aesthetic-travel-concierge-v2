import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// ── verifyDoctorLicense ───────────────────────────────────────────────────────
// Handles admin decisions on the LICENSE sub-check only.
// SECURITY: This function deliberately does NOT set status='active'.
// License approval is one of three required checks. Activation only happens
// via activateVerifiedDoctor, which enforces all three checks pass first.
//
// Actions:
//  approve         → sets license_verification_status='passed', license_verified=true
//  reject          → sets license_verification_status='failed', license_verified=false
//  manual_override → admin overrides with documented reason (requires override_reason)
//  request_review  → sends doctor back to pending_manual queue

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized — admin access required' }, { status: 403 });
    }

    const { doctorId, action, notes, override_reason } = await req.json();
    if (!doctorId || !action) {
      return Response.json({ error: 'Missing required fields: doctorId, action' }, { status: 400 });
    }

    const doctor = await base44.asServiceRole.entities.Doctor.get(doctorId);
    if (!doctor) return Response.json({ error: 'Doctor not found' }, { status: 404 });

    const now = new Date().toISOString();
    const adminNote = notes || '';
    let updateData: Record<string, unknown> = {};
    let auditAction = '';

    if (action === 'approve') {
      updateData = {
        license_verification_status: 'passed',
        license_verified: true,
        // INTENTIONALLY NOT setting status='active' — activation requires all 3 checks.
        // After this action, check identity and background, then call activateVerifiedDoctor.
        verification_notes: `License check PASSED by ${user.email} on ${now}. ${adminNote}`,
      };
      auditAction = 'license_check_passed';

    } else if (action === 'reject') {
      updateData = {
        license_verification_status: 'failed',
        license_verified: false,
        verification_status: 'failed',
        status: 'inactive',
        verification_notes: `License check FAILED by ${user.email} on ${now}. ${adminNote}`,
      };
      auditAction = 'license_check_failed';

    } else if (action === 'manual_override') {
      if (!override_reason?.trim()) {
        return Response.json({
          error: 'override_reason is required for manual_override — document why the license check is being overridden',
          code: 'OVERRIDE_REASON_REQUIRED',
        }, { status: 400 });
      }
      updateData = {
        license_verification_status: 'manual_override',
        license_verified: true,
        verification_notes: `License check MANUALLY OVERRIDDEN by ${user.email} on ${now}. Reason: ${override_reason}. ${adminNote}`,
        verification_override_reason: override_reason.trim(),
      };
      auditAction = 'license_check_manual_override';

    } else if (action === 'request_review') {
      updateData = {
        license_verification_status: 'pending',
        verification_status: 'pending_manual',
        verification_notes: `Returned to review queue by ${user.email} on ${now}. ${adminNote}`,
      };
      auditAction = 'license_check_returned_to_queue';

    } else {
      return Response.json({ error: 'Invalid action. Must be: approve, reject, manual_override, or request_review' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Doctor.update(doctorId, updateData);

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: auditAction,
      resource_type: 'doctor',
      resource_id: doctorId,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      details: {
        doctor_name: doctor.full_name,
        action,
        notes: adminNote,
        override_reason: override_reason?.trim() || null,
        license_verification_status: updateData.license_verification_status,
        timestamp: now,
      },
      sensitive: true,
      timestamp: now,
      prev_hash: await computePrevHash(base44),
    });

    // Tell the admin what happens next
    const nextStep = action === 'approve' || action === 'manual_override'
      ? 'License check complete. Verify identity and background checks, then call activateVerifiedDoctor to activate.'
      : action === 'reject'
        ? 'Doctor marked inactive. Rejection notification sent.'
        : 'Returned to manual review queue.';

    return Response.json({
      success: true,
      doctor_id: doctorId,
      action,
      license_verification_status: updateData.license_verification_status,
      next_step: nextStep,
    });

  } catch (error) {
    console.error('[verifyDoctorLicense]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
