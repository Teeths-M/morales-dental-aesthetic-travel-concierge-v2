import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, validate, Fields } from '../../shared/validate.ts';
import { guardedPartnerStatusUpdate, PARTNER_STATE } from '../../shared/partnerOnboardingState.ts';

// ── reviewTaxiServiceVerification ────────────────────────────────────────────
// Transport Partner Platform — Foundation. The real admin approve/reject
// action for a taxi service's verification, replacing what AdminPartners.jsx
// used to do: an unconditional client-side
// `TaxiService.update(id, {status:'active', license_verified:true,
// insurance_verified:true})` — approving a partner set BOTH verified flags
// true regardless of what initiatePartnerVerification's real sanctions/
// fraud-scan pipeline actually found, and regardless of the guarded state
// machine. "Never represent an unverified background check as verified" is
// the whole point of this function existing.
//
// license_verified/insurance_verified are ONLY ever set true here — this IS
// the human final-approval step, same discipline as activateVerifiedDoctor
// for doctors (AI does pre-checks, a human decides). They are never set at
// signup (see TaxiServiceSignupStep3.jsx's license_self_attested/
// insurance_self_attested — a claim, not a verification).

const ReviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), taxi_service_id: Fields.shortText(100) }),
  z.object({ action: z.literal('reject'), taxi_service_id: Fields.shortText(100), reason: Fields.shortText(500).optional().default('Rejected by admin during partner review.') }),
]);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const raw = await body();
  const result = validate(ReviewSchema, raw);
  if (!result.ok) return err(result.message);
  const { action, taxi_service_id } = result.data;

  const taxi = await base44.asServiceRole.entities.TaxiService.get(taxi_service_id);
  if (!taxi) return err('Taxi service not found', 404);

  // The real verification pipeline's own record — sanctions/fraud-scan
  // results — must actually gate approval, not just exist unread.
  const verifications = await base44.asServiceRole.entities.PartnerVerification.filter(
    { partner_id: taxi_service_id, partner_type: 'taxi_service' },
    '-created_at',
    1,
  ).catch(() => []);
  const verification = verifications?.[0] || null;

  if (action === 'approve') {
    if (verification?.verification_status === 'sanctions_blocked' || verification?.verification_status === 'denied') {
      return err('Cannot approve — automated screening flagged this partner. Review the verification record before overriding.');
    }

    // Route through VERIFYING first if the taxi service is still sitting at
    // pending_verification (e.g. initiatePartnerVerification never ran or
    // failed silently) — guardedPartnerStatusUpdate's own no-op rule makes
    // the second call harmless if it's already there.
    if (taxi.status === PARTNER_STATE.PENDING_VERIFICATION) {
      await guardedPartnerStatusUpdate(base44, 'TaxiService', taxi_service_id, PARTNER_STATE.VERIFYING);
    }
    await guardedPartnerStatusUpdate(base44, 'TaxiService', taxi_service_id, PARTNER_STATE.ACTIVE, {
      license_verified: true,
      insurance_verified: true,
      verification_can_be_activated: true,
    });

    await base44.functions.invoke('logAuditEvent', {
      event_type: 'partner_verification_approved',
      actor_id: user!.id,
      actor_role: user!.role,
      actor_name: user!.full_name || 'Admin',
      resource_type: 'TaxiService',
      resource_id: taxi_service_id,
      resource_name: taxi.company_name || taxi.agency_name || taxi.driver_name || taxi_service_id,
      details: {
        previous_status: taxi.status,
        ai_fraud_score: verification?.ai_fraud_score ?? null,
        verification_status_at_approval: verification?.verification_status ?? null,
      },
    }).catch(() => {});

    return ok({ status: PARTNER_STATE.ACTIVE });
  }

  // reject
  const { reason } = result.data;
  await guardedPartnerStatusUpdate(base44, 'TaxiService', taxi_service_id, PARTNER_STATE.REJECTED, {
    verification_status: 'rejected',
  });

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'partner_verification_rejected',
    actor_id: user!.id,
    actor_role: user!.role,
    actor_name: user!.full_name || 'Admin',
    resource_type: 'TaxiService',
    resource_id: taxi_service_id,
    resource_name: taxi.company_name || taxi.agency_name || taxi.driver_name || taxi_service_id,
    details: { previous_status: taxi.status, reason },
  }).catch(() => {});

  return ok({ status: PARTNER_STATE.REJECTED });
}, { name: 'reviewTaxiServiceVerification', allowedRoles: ['admin', 'platform_admin'] }));
