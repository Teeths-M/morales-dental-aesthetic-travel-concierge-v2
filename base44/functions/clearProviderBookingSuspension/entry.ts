import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * clearProviderBookingSuspension — the ONLY path that may clear
 * Doctor.booking_suspended. Admin-only, requires a real override_reason —
 * mirrors bookingState.ts's clearHold discipline and
 * activateVerifiedDoctor's manual_override discipline.
 */

const bodySchema = strictObject({
  doctor_id: Fields.shortText(100),
  override_reason: Fields.shortText(1000),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { doctor_id, override_reason } = await body<{ doctor_id: string; override_reason: string }>();

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
  if (!doctor) return err('Provider not found', 404);
  if (!doctor.booking_suspended) return err('This provider is not currently suspended', 409);

  const nowISO = new Date().toISOString();
  await base44.asServiceRole.entities.Doctor.update(doctor_id, {
    booking_suspended: false,
    booking_suspended_reason: '',
    booking_suspended_at: '',
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'provider_booking_suspension_cleared',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'Doctor', resource_id: doctor_id, case_id: null,
    sensitive: false, timestamp: nowISO,
    details: { override_reason },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ doctor_id, booking_suspended: false });
}, { name: 'clearProviderBookingSuspension', requireAuth: true, allowedRoles: ['admin', 'platform_admin'], bodySchema }));
