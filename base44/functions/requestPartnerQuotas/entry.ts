import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));
}

function quotaEmail({ partnerName, partnerType, patientName, procedures, procedureDate, caseRef, portalUrl, services }: {
  partnerName: string; partnerType: string; patientName: string; procedures: string;
  procedureDate: string; caseRef: string; portalUrl: string; services: string[];
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Pricing Quote Request — ${e(partnerType)}</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">Hello ${e(partnerName)},</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    We have a new patient arriving through the Morales platform and would appreciate your pricing quote for the services below.
    Please submit your quote within <strong>48 hours</strong> so we can finalise the patient's care package.
  </p>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:20px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure(s)</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(procedures)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure Date</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(procedureDate)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>
  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#13221d;">Services required from you:</p>
  <ul style="margin:0 0 24px;padding-left:20px;">
    ${services.map(s => `<li style="font-size:14px;color:#40514a;line-height:1.8;">${e(s)}</li>`).join('')}
  </ul>
  <a href="${e(portalUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">Submit My Quote →</a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;line-height:1.6;">This link is valid for 14 days. Questions? Reply to this email or reach us on WhatsApp.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);
  if (caseRecord.doctor_confirmation_status !== 'CONFIRMED') return err('Doctor has not confirmed the case yet');

  const patientName  = caseRecord.client_name;
  const procedures   = (caseRecord.procedures || []).join(', ') || 'Procedure TBC';
  const procedureDate = caseRecord.procedure_date || caseRecord.departure_date
    ? new Date(caseRecord.procedure_date || caseRecord.departure_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'To be confirmed';
  const caseRef = case_id.slice(-8).toUpperCase();
  const now = new Date().toISOString();
  const dispatches: Promise<unknown>[] = [];
  const sent: string[] = [];

  // ── 1. Travel Agency ──────────────────────────────────────────────────────
  const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []);
  const agency = agencies[0];
  if (agency?.email) {
    const token = makeToken(case_id, agency.id, 'travel');
    const url   = `${APP_URL}/portal/travel?token=${token}`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: agency.email,
      subject: `Pricing Quote Request — ${patientName} | ${BRAND}`,
      body: quotaEmail({ partnerName: agency.agency_name || agency.email, partnerType: 'Travel Agency', patientName, procedures, procedureDate, caseRef, portalUrl: url,
        services: ['Round-trip flights from patient origin to procedure country', 'Hotel accommodation (procedure + recovery nights)'] }),
    }));
    // Push — travel agency phone buzzes with new booking request
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: agency.email,
      title:      '🗺️ New Quote Request',
      body:       `${patientName} needs a travel package to ${caseRecord.procedure_country || 'destination'} · ${procedureDate}. Tap to submit your quote.`,
      url:        url,
      type:       'booking',
      tag:        `quota-travel-${case_id}`,
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('travel_agency');
  }

  // ── 2. Driver/Chauffeur ───────────────────────────────────────────────────
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver  = drivers[0];
  if (driver?.email) {
    const token = makeToken(case_id, driver.id, 'transfer');
    const url   = `${APP_URL}/portal/transfer?token=${token}`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: driver.email,
      subject: `Transfer Pricing Quote — ${patientName} | ${BRAND}`,
      body: quotaEmail({ partnerName: driver.driver_name || driver.company_name || driver.email, partnerType: 'Chauffeur', patientName, procedures, procedureDate, caseRef, portalUrl: url,
        services: ['Origin: Home → Airport (departure)', 'Destination: Airport → Hotel, Hotel → Clinic, Clinic → Hotel, Hotel → Airport', 'Origin: Airport → Home (return)'] }),
    }));
    // Push — driver phone buzzes with new transfer job
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: driver.email,
      title:      '🚗 New Transfer Request',
      body:       `${patientName} needs medical transport. Procedure on ${procedureDate}. Tap to price your legs.`,
      url:        url,
      type:       'booking',
      tag:        `quota-driver-${case_id}`,
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('driver');
  }

  // ── 3. Companion ──────────────────────────────────────────────────────────
  const companions = await base44.asServiceRole.entities.Companion.filter({ verification_status: 'verified', is_available: true }).catch(() => []);
  const companion  = companions.find((c: any) => (c.service_regions || []).includes(caseRecord.procedure_country)) ?? companions[0];
  if (companion?.email) {
    const token = makeToken(case_id, companion.id, 'companion');
    const url   = `${APP_URL}/companion-dashboard`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: companion.email,
      subject: `Companion Service Quote — ${patientName} | ${BRAND}`,
      body: quotaEmail({ partnerName: companion.full_name || companion.email, partnerType: 'Companion', patientName, procedures, procedureDate, caseRef, portalUrl: url,
        services: [`Recovery support for ${caseRecord.recovery_days || 3} days post-procedure`, 'Meal delivery and dietary care', 'Emotional support and language assistance'] }),
    }));
    // Push — companion phone buzzes with new care assignment request
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: companion.email,
      title:      '🤱 New Companion Request',
      body:       `${patientName} needs recovery support for ${caseRecord.recovery_days || 3} days in ${caseRecord.procedure_country || 'destination'}. Tap to confirm availability.`,
      url:        url,
      type:       'companion',
      tag:        `quota-companion-${case_id}`,
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('companion');
  }

  // ── 4. Clinic (doctor's clinic) ───────────────────────────────────────────
  if (caseRecord.doctor_email) {
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: caseRecord.doctor_email,
      subject: `Clinic Facility Quote — ${patientName} | ${BRAND}`,
      body: quotaEmail({ partnerName: caseRecord.clinic_selected || 'Doctor', partnerType: 'Clinic', patientName, procedures, procedureDate, caseRef, portalUrl: `${APP_URL}/doctor-dashboard`,
        services: ['Clinic facility fee', 'Anaesthesia fee (if applicable)', 'Post-operative follow-up consultation'] }),
    }));
    // Push — doctor gets clinic fee reminder
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: caseRecord.doctor_email,
      title:      '🏥 Facility Fee Quote Needed',
      body:       `${patientName} · ${procedures}. Please submit clinic fee, anaesthesia, and post-op cost.`,
      url:        `${APP_URL}/doctor-dashboard`,
      type:       'success',
      tag:        `quota-clinic-${case_id}`,
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('clinic');
  }

  // Create QuoteRequest records + update CaseRecord
  const partnerQuotasPrevHash = await computePrevHash(base44);
  dispatches.push(
    base44.asServiceRole.entities.CaseRecord.update(case_id, {
      status: 'Vendor-Pending',
      quotas_requested_at: now,
      companion_quote_status: 'PENDING',
      clinic_quote_status: 'PENDING',
    }),
    base44.asServiceRole.entities.AuditLog.create({
      event_type: 'partner_quotas_requested', actor_id: 'system', actor_role: 'system',
      actor_name: 'Morales Automation', resource_type: 'CaseRecord', resource_id: case_id,
      case_id, details: { sent_to: sent, patient: patientName }, sensitive: false, timestamp: now,
      prev_hash: partnerQuotasPrevHash,
    })
  );

  await Promise.allSettled(dispatches);

  return ok({ quotas_requested_to: sent, case_ref: caseRef });
}, { name: 'requestPartnerQuotas', requireAuth: false }));
