import { createHandler, ok, err } from '../_shared/createHandler.ts';

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

const BRAND   = 'Morales Dental & Aesthetics';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function activationEmail({ partnerName, role, patientName, procedureDate, caseRef, message, ctaUrl, ctaLabel }: {
  partnerName: string; role: string; patientName: string; procedureDate: string;
  caseRef: string; message: string; ctaUrl: string; ctaLabel: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Patient Confirmed — ${e(role)} Activation</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">Great news, ${e(partnerName)}!</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">${e(message)}</p>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure Date</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(procedureDate)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>
  <a href="${e(ctaUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">${e(ctaLabel)}</a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;">Questions? Contact us via WhatsApp. Thank you for your partnership.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
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
        subject: `Patient Confirmed & Paid — ${patientName} | ${BRAND}`,
        body: activationEmail({ partnerName: 'Doctor', role: 'Doctor', patientName, procedureDate, caseRef,
          message: `${patientName} has paid in full and is confirmed for their procedure. Please prepare your consultation and procedure notes. All logistics are now being finalised.`,
          ctaUrl: `${APP_URL}/doctor-dashboard`, ctaLabel: 'Open My Dashboard →' }),
      }));
      cascaded.push('doctor');
    }

    // Driver
    if (driver?.email && !c.driver_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: driver.email,
        subject: `Transfer Confirmed — ${patientName} | ${BRAND}`,
        body: activationEmail({ partnerName: driver.driver_name || driver.company_name || 'Driver', role: 'Chauffeur', patientName, procedureDate, caseRef,
          message: `${patientName}'s payment is confirmed. Your transfer services are now active. Please review the pickup schedule and confirm your availability for all transfer legs.`,
          ctaUrl: `${APP_URL}/portal/transfer?case=${case_id}`, ctaLabel: 'View Transfer Details →' }),
      }));
      cascaded.push('driver');
    }

    // Companion
    if (companion?.email && !c.companion_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: companion.email,
        subject: `Companion Assignment Confirmed — ${patientName} | ${BRAND}`,
        body: activationEmail({ partnerName: companion.full_name || companion.email, role: 'Companion', patientName, procedureDate, caseRef,
          message: `${patientName}'s journey is confirmed. You are assigned as their recovery companion. Please review the patient's dietary brief and be available from the procedure date onwards.`,
          ctaUrl: `${APP_URL}/companion-dashboard`, ctaLabel: 'Open Companion Dashboard →' }),
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
        subject: `Travel Booking Confirmed — ${patientName} | ${BRAND}`,
        body: activationEmail({ partnerName: agency.agency_name || agency.email, role: 'Travel Agency', patientName, procedureDate, caseRef,
          message: `${patientName} has made a 50% deposit. Please proceed with booking their flights and hotel. Full payment will be made before the departure date.`,
          ctaUrl: `${APP_URL}/portal/travel?case=${case_id}`, ctaLabel: 'Start Travel Booking →' }),
      }));
      cascaded.push('travel_agency');
    }

    // Doctor — informational only (not fully activated yet)
    if (c.doctor_email && !c.doctor_cascade_sent) {
      dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: c.doctor_email,
        subject: `Patient Deposit Received — ${patientName} (Balance Pending) | ${BRAND}`,
        body: activationEmail({ partnerName: 'Doctor', role: 'Doctor', patientName, procedureDate, caseRef,
          message: `${patientName} has paid a 50% deposit and confirmed their intent to proceed. Travel is being arranged. You will receive full activation once the balance is paid (typically 7+ days before the procedure).`,
          ctaUrl: `${APP_URL}/doctor-dashboard`, ctaLabel: 'View Case →' }),
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
        subject: `Travel Booking Confirmed — ${patientName} | ${BRAND}`,
        body: activationEmail({ partnerName: agency.agency_name || agency.email, role: 'Travel Agency', patientName, procedureDate, caseRef,
          message: `${patientName}'s payment is confirmed. Please finalise and book their flights and hotel package. All details are in your portal.`,
          ctaUrl: `${APP_URL}/portal/travel?case=${case_id}`, ctaLabel: 'Start Booking →' }),
      }));
      cascaded.push('travel_agency');
    }
  }

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
