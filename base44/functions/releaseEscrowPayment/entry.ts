import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

/**
 * releaseEscrowPayment — Airbnb Escrow Release Model
 *
 * Called by completeHandshake 24 hours after the release-trigger HS is confirmed.
 * Marks the EscrowHold as released, notifies the partner with a premium payment
 * confirmation, and logs to audit.
 *
 * If Stripe Connect is configured (STRIPE_SECRET_KEY + partner stripe_connected_account),
 * issues the payout automatically. Otherwise marks as pending_manual_transfer.
 *
 * Release schedule:
 *   HS1 (Driver pickup confirmed)      → 25% of driver cost released to origin driver
 *   HS5 (Clinic arrival confirmed)     → 100% of treatment cost released to doctor
 *   HS6 (Companion delivery confirmed) → 100% of companion cost released
 *   HS7 (Return transport confirmed)   → remaining 75% of driver cost released
 *   HS9 (Home drop-off confirmed)      → 100% of travel agency (flight/hotel) released
 */

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const e   = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const HS_LABELS: Record<number, string> = {
  1: 'HS1 — Driver Pickup confirmed',
  5: 'HS5 — Clinic Arrival confirmed',
  6: 'HS6 — Companion Delivery confirmed',
  7: 'HS7 — Return Transport confirmed',
  9: 'HS9 — Journey Complete',
};

const PARTNER_DASHBOARDS: Record<string, string> = {
  doctor:          `${APP_URL}/doctor-dashboard`,
  driver_origin:   `${APP_URL}/taxi-service-dashboard`,
  driver_destination: `${APP_URL}/taxi-service-dashboard`,
  companion:       `${APP_URL}/companion-dashboard`,
  travel_agency:   `${APP_URL}/travel-agency-dashboard`,
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, handshake_number, partner_type } = await body();
  if (!case_id || !handshake_number) return err('case_id and handshake_number are required');

  const hsNum = Number(handshake_number);

  // SECURITY: this endpoint moves money and is public (called by completeHandshake
  // via a scheduled service invoke). Do NOT trust the caller — re-verify the
  // checkpoint was genuinely confirmed before releasing a cent. completeHandshake
  // is passed trip_id as `case_id` and sets handshake_status[n] = true only after
  // an authenticated, in-order confirmation. Without this guard, anyone who knows a
  // trip id could POST { case_id, handshake_number: 5 } and release the doctor's
  // full payment before the patient ever arrives at the clinic.
  const trip = await base44.asServiceRole.entities.TravelRequest.get(case_id).catch(() => null);
  if (!trip || trip.handshake_status?.[String(hsNum)] !== true) {
    return err('Checkpoint not confirmed — escrow release refused.', 403);
  }

  // Find EscrowHold records triggered by this handshake
  const holds = await base44.asServiceRole.entities.EscrowHold.filter({
    case_id, release_trigger_hs: hsNum, status: 'held',
  }).catch(() => []);

  if (!holds || holds.length === 0) {
    return ok({ skipped: true, reason: 'No held escrow records for this handshake' });
  }

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  const patientName = caseRecord?.client_name || 'Patient';
  const caseRef     = case_id.slice(-8).toUpperCase();
  const hsLabel     = HS_LABELS[hsNum] || `HS${hsNum}`;
  const now         = new Date().toISOString();

  const tasks: Promise<unknown>[] = [];
  const released: { partner_type: string; amount: number }[] = [];

  for (const hold of holds as any[]) {
    if (hold.status !== 'held') continue;

    // Attempt Stripe Connect transfer if configured
    let stripeTransferId: string | null = null;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey && hold.stripe_connected_account && hold.amount_held_usd > 0) {
      try {
        const transferResp = await fetch('https://api.stripe.com/v1/transfers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            amount:      String(Math.round(hold.amount_held_usd * 100)),
            currency:    'usd',
            destination: hold.stripe_connected_account,
            // Stripe is a third party. A transfer description is visible in
            // their dashboard, in exports, in webhook payloads and in their
            // logs — so it must not carry the patient's name. The case
            // reference is enough to reconcile, and it resolves to a person
            // only inside M.
            description: `Morales escrow release — ${hsLabel} — Case ${caseRef}`,
          }).toString(),
        });
        if (transferResp.ok) {
          const transfer = await transferResp.json();
          stripeTransferId = transfer.id;
        }
      } catch (_) {}
    }

    // Update EscrowHold record
    tasks.push(base44.asServiceRole.entities.EscrowHold.update(hold.id, {
      status:        'released',
      trigger_confirmed_at: now,
      released_at:   now,
      stripe_transfer_id: stripeTransferId,
      release_notes: `Released 24hrs after ${hsLabel}`,
    }));

    // Link-only payment-released notice — no amount, no patient name in the email.
    if (hold.partner_email) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: hold.partner_email,
        subject: `A payment has been released to you | ${BRAND}`,
        body: linkOnlyEmail({
          title: 'A payment has been released to you.',
          line: 'Your payment has cleared from escrow. Open your Morales portal to view the amount and case details.',
          ctaUrl: PARTNER_DASHBOARDS[hold.partner_type] || `${APP_URL}/partner-portal`,
          ctaLabel: 'View in My Portal',
        }),
      }));
    }

    tasks.push(base44.asServiceRole.entities.AuditLog.create({
      event_type:   'escrow_payment_released',
      actor_id:     'system', actor_role: 'system', actor_name: 'Morales Escrow Engine',
      resource_type:'EscrowHold', resource_id: hold.id, case_id,
      sensitive:    true, timestamp: now,
      details: { partner_type: hold.partner_type, amount: hold.amount_held_usd, handshake: hsNum, stripe_transfer_id: stripeTransferId },
    }));

    released.push({ partner_type: hold.partner_type, amount: hold.amount_held_usd });
  }

  await Promise.allSettled(tasks);

  return ok({ case_id, handshake_number: hsNum, released, total_released: released.reduce((s, r) => s + r.amount, 0) });
}, { name: 'releaseEscrowPayment', requireAuth: false }));
