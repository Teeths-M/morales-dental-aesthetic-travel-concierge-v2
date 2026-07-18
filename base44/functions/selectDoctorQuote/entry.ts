import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { guardedStatusUpdate, BOOKING } from '../_shared/bookingState.ts';

/**
 * selectDoctorQuote — the patient's final say. They pick one submitted quote.
 *
 * INVARIANTS:
 *   • The caller must OWN the request (user.email === request.patient_email) unless admin.
 *   • Only a SUBMITTED quote can be chosen.
 *   • Full identity/PHI is revealed ONLY to the chosen doctor (by assigning them to the
 *     case); un-chosen doctors only ever saw the de-identified summary and are declined.
 *   • The chosen quote fills the CLINIC quota so the existing one-quotation / one-payment
 *     / escrow chain runs unchanged; the patient proceeds straight to booking.
 *   • ON-PLATFORM / LINK-ONLY OUT: notifications carry no PHI — only a teaser + link.
 *
 * Requires: entities DoctorQuote + DoctorQuoteRequest.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';

function linkEmail(title: string, line: string, ctaUrl: string, ctaLabel: string): string {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px;">
  <div style="font-size:24px;font-weight:900;color:#D4AF37;margin-bottom:16px;">M</div>
  <p style="font-size:16px;color:#fff;margin:0 0 10px;font-weight:700;">${title}</p>
  <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 22px;line-height:1.6;">${line}</p>
  <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:13px 30px;border-radius:99px;text-decoration:none;">${ctaLabel} →</a>
  <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:22px 0 0;">Details stay in your Morales portal — nothing private is sent by email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { quote_id } = await body<{ quote_id?: string }>();
  if (!quote_id) return err('quote_id is required');

  const chosen = await base44.asServiceRole.entities.DoctorQuote.get(quote_id).catch(() => null);
  if (!chosen) return err('Quote not found', 404);

  const request = await base44.asServiceRole.entities.DoctorQuoteRequest.get(chosen.request_id).catch(() => null);
  if (!request) return err('Quote request not found', 404);

  // ── Ownership: only the patient who made the request may choose (admins exempt) ─
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdmin && (user?.email || '').toLowerCase() !== String(request.patient_email || '').toLowerCase()) {
    return err('This request does not belong to you.', 403);
  }

  if (request.status === 'selected' || chosen.status === 'chosen') {
    return ok({ already_selected: true, quote_id, message: 'A doctor has already been selected for this request.' });
  }
  if (chosen.status !== 'submitted') {
    return err('That quote is not ready to be chosen yet.');
  }

  const now = new Date().toISOString();

  // ── Mark chosen; decline the rest (link-only notice, no PHI) ────────────────
  const siblings = await base44.asServiceRole.entities.DoctorQuote.filter(
    { request_id: request.id }, '-created_date', 50,
  ).catch(() => []);

  await base44.asServiceRole.entities.DoctorQuote.update(quote_id, { status: 'chosen' });

  await Promise.allSettled((siblings as any[])
    .filter((q) => q.id !== quote_id)
    .map(async (q) => {
      await base44.asServiceRole.entities.DoctorQuote.update(q.id, { status: 'not_chosen' }).catch(() => {});
      if (q.doctor_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: q.doctor_email,
          subject: `Update on a patient request — ${BRAND}`,
          body: linkEmail(
            'This request went to another provider.',
            'Thank you for your time and your quote. We look forward to matching you with a future patient.',
            `${APP_URL}/doctor-dashboard`, 'Open My Portal'),
        }).catch(() => {});
      }
    }));

  // ── Reveal full case to the CHOSEN doctor + fill the clinic quota ────────────
  const doctor = chosen.doctor_id
    ? await base44.asServiceRole.entities.Doctor.get(chosen.doctor_id).catch(() => null)
    : null;
  const total = Number(chosen.total_usd || 0);

  if (chosen.case_id) {
    // Assign the chosen doctor (this is what grants them the case/PHI) and set the
    // clinic quota so the existing package-assembly + escrow chain can proceed.
    await base44.asServiceRole.entities.CaseRecord.update(chosen.case_id, {
      doctor_selected: doctor?.full_name || chosen.doctor_email || '',
      doctor_email: chosen.doctor_email || '',
      doctor_id: chosen.doctor_id || '',
      clinic_selected: doctor?.clinic_name || '',
      procedure_country: doctor?.clinic_country || request.patient_country || '',
      clinic_cost: total,
      treatment_cost: 0,               // avoid double-counting; clinic_cost carries the doctor fee
      clinic_quote_status: 'CONFIRMED',
      doctor_confirmation_status: 'PENDING',
      doctor_notified_at: now,
    }).catch(() => {});

    // Guarded advance: Quotes-In → Doctor-Pending.
    await guardedStatusUpdate(base44, chosen.case_id, BOOKING.DOCTOR_PENDING)
      .catch((e) => console.error('[selectDoctorQuote] status advance failed:', e.message));
  }

  await base44.asServiceRole.entities.DoctorQuoteRequest.update(request.id, {
    status: 'selected', chosen_quote_id: quote_id,
  }).catch(() => {});

  // ── Notify the chosen doctor (link-only, no PHI) ────────────────────────────
  if (chosen.doctor_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: chosen.doctor_email,
      subject: `A patient has selected you — ${BRAND}`,
      body: linkEmail(
        'Good news — a patient has selected you.',
        'Please open your portal to review the full case and confirm your date to lock the appointment.',
        `${APP_URL}/doctor-dashboard`, 'Confirm in My Portal'),
    }).catch(() => {});
  }

  // ── Audit ───────────────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_quote_selected',
    actor_id: user?.id || 'patient', actor_role: 'client',
    actor_name: request.patient_first_name || user?.email || 'Patient',
    resource_type: 'DoctorQuote', resource_id: quote_id, case_id: chosen.case_id || '',
    sensitive: true, timestamp: now,
    details: { request_id: request.id, chosen_doctor_id: chosen.doctor_id, total_usd: total },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    quote_id, chosen: true, case_id: chosen.case_id,
    message: 'Doctor selected. You can proceed to secure your booking; your doctor will confirm the date.',
  });
}, { name: 'selectDoctorQuote', requireAuth: true }));
