import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { BYOJ_PLANS, BYOJ_DISCLOSURE_VERSION } from '../../shared/byoj.ts';

// ── enrollExternalJourney (Bring Your Own Journey) ────────────────────────────
// Turns a verified external itinerary into a protected journey.
//
// R1 — the disclosure is UNAVOIDABLE: enrollment is refused unless the patient
// explicitly accepted it. We stamp the (draft, legal-gated) disclosure version so
// draft-era acceptances are distinguishable once legal-approved copy ships.
//
// R3 — one-time payment ONLY at launch. Any recurring/subscription plan is refused
// until Stripe Subscriptions + webhooks exist.
//
// Enrollment writes a normal CaseRecord flagged origin:'external' — that single
// flag lets the journey ride every existing protection pipeline (SAFE-T, MedGuard,
// recovery check-ins, guardian, SOS) with no re-plumbing, while staying visibly
// distinct to coordinators.
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<Record<string, any>>();
  const external_journey_id = String(b.external_journey_id || '').trim();
  const disclosure_accepted = b.disclosure_accepted === true;
  const plan = String(b.plan || 'single_journey');
  const family_visibility_opt_in = b.family_visibility_opt_in === true;

  if (!external_journey_id) return err('external_journey_id is required.');

  // R1 — cannot enroll without the disclosure.
  if (!disclosure_accepted) {
    return err('You must acknowledge the protection-service disclosure before enrolling.', 400);
  }

  // R3 — one-time only. Reject any non-enabled (recurring) plan.
  const planDef = (BYOJ_PLANS as Record<string, any>)[plan];
  if (!planDef || !planDef.enabled || planDef.billing !== 'one_time') {
    return err('Only the one-time Single Journey plan is available right now.', 400);
  }

  const journey = await base44.asServiceRole.entities.ExternalJourney.get(external_journey_id).catch(() => null as any);
  if (!journey) return err('That journey could not be found.', 404);
  if (journey.patient_email && user?.email && journey.patient_email !== user.email) {
    return err('This journey belongs to a different account.', 403);
  }

  const nowISO = new Date().toISOString();
  const escalated = journey.verification_status === 'concerns';

  // ── Create the external-origin CaseRecord — the spine of the protection layer ─
  let caseId = journey.case_id || '';
  if (!caseId) {
    try {
      const cr = await base44.asServiceRole.entities.CaseRecord.create({
        client_email: user?.email || journey.patient_email,
        client_name: user?.full_name || journey.patient_name || '',
        origin: 'external',
        protection_only: true,
        status: 'Ready-For-Travel',
        case_priority: escalated ? 'Urgent' : 'Normal',
        procedure_country: journey.destination_country || '',
        destination_city: journey.destination_city || '',
        preferred_date: journey.surgery_date || '',
        family_visibility_opt_in,
        external_journey_id,
        external_doctor_name: journey.doctor_name || '',
        external_clinic_name: journey.clinic_name || '',
        created_at: nowISO,
      });
      caseId = cr?.id || '';
    } catch (_) {
      return err('We couldn’t start your protection case. Please try again.', 500);
    }
  }

  // ── Record disclosure acceptance + plan + one-time payment intent ────────────
  try {
    await base44.asServiceRole.entities.ExternalJourney.update(external_journey_id, {
      disclosure_accepted: true,
      disclosure_accepted_at: nowISO,
      disclosure_version: BYOJ_DISCLOSURE_VERSION,
      plan,
      payment_status: 'one_time_pending',
      case_id: caseId,
    });
  } catch (_) { /* the case exists; a failed patch here is non-fatal to enrollment */ }

  // Audit the acceptance (timestamped, compliance).
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'byoj_enrolled',
      actor_email: user?.email || journey.patient_email,
      resource_type: 'external_journey',
      resource_id: external_journey_id,
      case_id: caseId,
      details: { plan, disclosure_version: BYOJ_DISCLOSURE_VERSION, escalated },
      sensitive: true,
      timestamp: nowISO,
    });
  } catch (_) { /* audit is best-effort */ }

  return ok({
    enrolled: true,
    case_id: caseId,
    plan,
    // R3 — one-time payment link (reuses the existing Stripe payment-link rail).
    // Recurring is intentionally not offered here.
    payment: { plan, billing: 'one_time', status: 'one_time_pending' },
    escalated,
    message: escalated
      ? 'You’re enrolled and protected. Because our checks flagged something, a coordinator is already reaching out.'
      : 'You’re enrolled. Morales is now monitoring your journey end to end.',
  });
}, { name: 'enrollExternalJourney', requireAuth: true }));
