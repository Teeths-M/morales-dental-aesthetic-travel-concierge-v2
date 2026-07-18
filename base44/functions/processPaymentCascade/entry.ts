import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

/**
 * processPaymentCascade
 *
 * Called by stripePaymentWebhook after a confirmed payment.
 * Routes partner activation based on payment type:
 *
 * Full Pay:   → Doctor + Travel Agency + Driver + Companion (all 4 simultaneously)
 * 50% Terms:  → Travel Agency only + Doctor info email; Driver/Companion wait
 * Balance:    → Remaining partners (Doctor/Driver/Companion) after 2nd installment
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// LINK-ONLY: the partner opens their portal for the patient + case details. The email
// carries no name, date, amount, or message — nothing private leaves M. Extra params
// are accepted (call sites pass them) but ignored.
function activationEmail({ role, ctaUrl, ctaLabel }: {
  partnerName?: string; role: string; patientName?: string; procedureDate?: string;
  caseRef?: string; message?: string; ctaUrl: string; ctaLabel: string;
}) {
  return linkOnlyEmail({
    title: 'A patient is confirmed — your assignment is ready.',
    line: `Your ${role} assignment has been activated. Open your Morales portal to see the patient, dates, and next steps.`,
    ctaUrl,
    ctaLabel,
  });
}

async function sendSms(to: string, message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), token = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, payment_type, amount_paid, stripe_payment_id } = await body();
  if (!case_id || !payment_type) return err('case_id and payment_type are required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  // SECURITY: this public endpoint triggers the full paid-journey cascade —
  // partner dispatch and "payment received" confirmations. Only
  // stripePaymentWebhook should reach it, after a signature-verified, genuinely
  // paid Stripe event. Do NOT trust the caller: re-verify a real completed
  // payment exists for this case first. Without this, anyone could POST a
  // case_id and set the whole journey in motion without ever paying.
  const paidTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
    case_id, status: 'succeeded',
  }).catch(() => []);
  if (!paidTxns || paidTxns.length === 0) {
    return err('No completed payment on record for this case — cascade refused.', 403);
  }

  const caseRef      = case_id.slice(-8).toUpperCase();
  const patientName  = c.client_name;
  const procedureDate = c.procedure_date
    ? new Date(c.procedure_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'To be confirmed';

  const isFullPay = payment_type === 'full_pay';
  const isBalance = payment_type === 'balance';   // 2nd installment of terms

  const dispatches: Promise<unknown>[] = [];
  const cascaded: string[] = [];

  // ── Load active partners ───────────────────────────────────────────────────
  const [agencies, drivers, companions] = await Promise.all([
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []),
    base44.asServiceRole.entities.Companion.filter({ verification_status: 'verified', is_available: true }).catch(() => []),
  ]);
  const agency   = (agencies as any[])[0];
  const driver   = (drivers as any[])[0];
  const companion = (companions as any[]).find((cp: any) => (cp.service_regions || []).includes(c.procedure_country)) ?? (companions as any[])[0];

  // ── Full Pay: trigger ALL 4 partners ──────────────────────────────────────
  if (isFullPay || isBalance) {
    // Doctor
    if (c.doctor_email && !c.doctor_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: c.doctor_email,
        subject: `Patient Confirmed & Paid | ${BRAND}`,
        body: activationEmail({ partnerName: 'Doctor', role: 'Doctor',           ctaUrl: `${APP_URL}/doctor-dashboard`, ctaLabel: 'Open My Dashboard →' }),
      }));
      cascaded.push('doctor');
    }

    // Driver
    if (driver?.email && !c.driver_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: driver.email,
        subject: `Transfer Confirmed | ${BRAND}`,
        body: activationEmail({ partnerName: driver.driver_name || driver.company_name || 'Driver', role: 'Chauffeur',           ctaUrl: `${APP_URL}/portal/transfer?case=${case_id}`, ctaLabel: 'View Transfer Details →' }),
      }));
      cascaded.push('driver');
    }

    // Companion
    if (companion?.email && !c.companion_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: companion.email,
        subject: `Companion Assignment Confirmed | ${BRAND}`,
        body: activationEmail({ partnerName: companion.full_name || companion.email, role: 'Companion',           ctaUrl: `${APP_URL}/companion-dashboard`, ctaLabel: 'Open Companion Dashboard →' }),
      }));
      // Also send companion meal brief
      dispatches.push(base44.asServiceRole.functions?.invoke?.('sendCompanionMealBrief', { case_id, companion_email: companion.email }).catch(() => {}));
      cascaded.push('companion');
    }
  }

  // ── 50% Terms: Travel Agency only + Doctor info email ─────────────────────
  if (!isFullPay && !isBalance) {
    // Travel Agency — activated immediately
    if (agency?.email && !c.travel_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: agency.email,
        subject: `Travel Booking Confirmed | ${BRAND}`,
        body: activationEmail({ partnerName: agency.agency_name || agency.email, role: 'Travel Agency',           ctaUrl: `${APP_URL}/portal/travel?case=${case_id}`, ctaLabel: 'Start Travel Booking →' }),
      }));
      cascaded.push('travel_agency');
    }

    // Doctor — informational only (not fully activated yet)
    if (c.doctor_email && !c.doctor_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: c.doctor_email,
        subject: `Patient Deposit Received (Balance Pending) | ${BRAND}`,
        body: activationEmail({ partnerName: 'Doctor', role: 'Doctor',           ctaUrl: `${APP_URL}/doctor-dashboard`, ctaLabel: 'View Case →' }),
      }));
      // Doctor marked as sent even for info email — they get full activation on balance
      cascaded.push('doctor_info');
    }
  }

  // Always activate Travel Agency (even on full pay)
  if ((isFullPay || (!isFullPay && !isBalance)) && agency?.email && !c.travel_cascade_sent) {
    if (!cascaded.includes('travel_agency')) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: agency.email,
        subject: `Travel Booking Confirmed | ${BRAND}`,
        body: activationEmail({ partnerName: agency.agency_name || agency.email, role: 'Travel Agency',           ctaUrl: `${APP_URL}/portal/travel?case=${case_id}`, ctaLabel: 'Start Booking →' }),
      }));
      cascaded.push('travel_agency');
    }
  }

  // ── Create EscrowHold records (Airbnb trust model) ───────────────────────
  // Partners are notified and activated, but funds are held until
  // the patient physically completes the relevant handshake checkpoint.
  const escrowTasks: Promise<unknown>[] = [];
  const now = new Date().toISOString();
  const baseCost = Number(c.base_cost || 0);
  const consult  = 49;
  const adj      = Math.max(baseCost - consult, 0);

  const ESCROW_MAP = [
    { partner_type: 'doctor',         release_trigger_hs: 5, amount: Number(c.treatment_cost || 0) + Number(c.clinic_cost || 0), email: c.doctor_email },
    { partner_type: 'companion',      release_trigger_hs: 6, amount: Number(c.companion_cost || 0), email: null },
    { partner_type: 'driver_origin',  release_trigger_hs: 1, amount: Math.round(Number(c.pickup_cost || 0) * 0.25), email: null },
    { partner_type: 'driver_destination', release_trigger_hs: 7, amount: Number(c.local_transfer_cost || 0), email: null },
    { partner_type: 'travel_agency',  release_trigger_hs: 9, amount: Number(c.flight_cost || 0) + Number(c.hotel_cost || 0), email: agency?.email },
  ];

  for (const em of ESCROW_MAP) {
    if (em.amount <= 0) continue;
    escrowTasks.push(
      base44.asServiceRole.entities.EscrowHold.create({
        case_id:           case_id,
        partner_type:      em.partner_type,
        partner_id:        em.partner_type === 'doctor' ? (c.doctor_id || '') : '',
        partner_email:     em.email || '',
        amount_held_usd:   em.amount,
        release_trigger_hs: em.release_trigger_hs,
        status:            'held',
        payment_confirmed_at: now,
      }).catch(() => {})
    );
  }
  if (escrowTasks.length > 0) await Promise.allSettled(escrowTasks);

  // Generate itinerary calendar (async, non-blocking)
  base44.asServiceRole.functions?.invoke?.('generateItineraryCalendar', { case_id }).catch(() => {});

  // Generate receipt + update case record
  const newPaymentStatus = isFullPay ? 'Paid In Full' : isBalance ? 'Paid In Full' : '50% Paid';
  const amountPaid  = Number(amount_paid || 0);
  const amtRemaining = isFullPay || isBalance ? 0 : (c.package_price_first_installment ?? 0);
  const nextDue     = !isFullPay && !isBalance
    ? new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
    : undefined;

  dispatches.push(
    base44.asServiceRole.entities.CaseRecord.update(case_id, {
      payment_status:       newPaymentStatus,
      payment_type:         isFullPay ? 'full_pay' : 'terms',
      deposit_option:       isFullPay ? 'Full' : '50%',
      amount_paid:          amountPaid,
      amount_remaining:     amtRemaining,
      next_payment_due:     nextDue,
      stripe_payment_id:    stripe_payment_id || c.stripe_payment_id,
      doctor_cascade_sent:  cascaded.includes('doctor') || cascaded.includes('doctor_info') || c.doctor_cascade_sent,
      travel_cascade_sent:  cascaded.includes('travel_agency') || c.travel_cascade_sent,
      driver_cascade_sent:  cascaded.includes('driver') || c.driver_cascade_sent,
      companion_cascade_sent: cascaded.includes('companion') || c.companion_cascade_sent,
      status:               isFullPay || isBalance ? 'Travel-Coordination' : 'Deposit-Paid',
    }),
    // Generate receipt
    base44.asServiceRole.functions?.invoke?.('sendPaymentReceipt', { case_id, payment_type, amount_paid: amountPaid, stripe_payment_id }).catch(() => {}),
    // Push notification — confident double buzz when payment lands
    c.client_email ? base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: c.client_email,
      title:      '✅ Payment Confirmed',
      body:       `${isFullPay ? 'Full payment' : '50% deposit'} received. Your partners are being confirmed now.`,
      url:        '/dashboard/bookings',
      type:       'payment',
      tag:        `payment-${case_id}`,
    }).catch(() => {}) : Promise.resolve(),
    base44.asServiceRole.entities.AuditLog.create({
      event_type: 'payment_cascade_triggered', actor_id: 'system', actor_role: 'system',
      actor_name: 'Morales Automation', resource_type: 'CaseRecord', resource_id: case_id,
      case_id, sensitive: false, timestamp: new Date().toISOString(),
      details: { payment_type, amount_paid: amountPaid, cascaded, new_status: newPaymentStatus },
    })
  );

  await Promise.allSettled(dispatches);

  return ok({ case_id, payment_type, cascaded, new_payment_status: newPaymentStatus });
}, { name: 'processPaymentCascade', requireAuth: false }));
