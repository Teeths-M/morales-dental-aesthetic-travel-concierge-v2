import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Handles admin decisions on the BACKGROUND CHECK sub-check only.
// Background approval is one of three required checks; activation only happens
// via activateVerifiedDoctor, which enforces all three checks pass first.
//
// Actions: approve | reject | manual_override (requires override_reason) | request_review

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { doctorId, action, notes, override_reason } = await body();
  if (!doctorId || !action) return err('Missing required fields: doctorId, action');

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctorId);
  if (!doctor) return err('Doctor not found');

  const now = new Date().toISOString();
  const adminNote = notes || '';
  let updateData: Record<string, unknown> = {};
  let auditAction = '';

  if (action === 'approve') {
    updateData = {
      background_check_status: 'passed',
      background_check_cleared: true,
      verification_notes: `Background check PASSED by ${user.email} on ${now}. ${adminNote}`,
    };
    auditAction = 'background_check_passed';

  } else if (action === 'reject') {
    updateData = {
      background_check_status: 'failed',
      background_check_cleared: false,
      verification_status: 'failed',
      status: 'inactive',
      verification_notes: `Background check FAILED by ${user.email} on ${now}. ${adminNote}`,
    };
    auditAction = 'background_check_failed';

  } else if (action === 'manual_override') {
    if (!override_reason?.trim()) {
      return err('override_reason is required for manual_override');
    }
    updateData = {
      background_check_status: 'manual_override',
      background_check_cleared: true,
      verification_notes: `Background check MANUALLY OVERRIDDEN by ${user.email} on ${now}. Reason: ${override_reason}. ${adminNote}`,
      verification_override_reason: override_reason.trim(),
    };
    auditAction = 'background_check_manual_override';

  } else if (action === 'request_review') {
    updateData = {
      background_check_status: 'pending',
      verification_status: 'pending_manual',
      verification_notes: `Background check returned to review queue by ${user.email} on ${now}. ${adminNote}`,
    };
    auditAction = 'background_check_returned_to_queue';

  } else {
    return err('Invalid action. Must be: approve, reject, manual_override, or request_review');
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
      background_check_status: updateData.background_check_status,
      timestamp: now,
    },
    sensitive: true,
    timestamp: now,
  });

  const nextStep = action === 'approve' || action === 'manual_override'
    ? 'Background check complete. Verify license and identity checks, then call activateVerifiedDoctor to activate.'
    : action === 'reject'
      ? 'Doctor marked inactive.'
      : 'Returned to manual review queue.';

  return ok({
    doctor_id: doctorId,
    action,
    background_check_status: updateData.background_check_status,
    next_step: nextStep,
  });
}, { name: 'verifyDoctorBackground', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
