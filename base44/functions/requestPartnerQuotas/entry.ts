import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

/**
 * requestPartnerQuotas — fan a case out to travel, transfer, companion and
 * clinic partners for pricing.
 *
 * ── Link-only (policy, 2026-07-18) ──────────────────────────────────────────
 * Each of the four emails used to carry a table headed "Patient / Procedure(s) /
 * Procedure Date / Case Reference", and the subject line was "Pricing Quote
 * Request — <patient name>". That disclosed a named person's surgery and travel
 * date to four separate commercial third parties, before any of them had been
 * selected — and to anyone who later read those inboxes.
 *
 * Partners now receive: you have a quote request, here is your portal link.
 * The case detail they need to price the work is behind the portal token,
 * which is what the token was for.
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// HMAC-signed to match verifyPortalToken() in getPortalData — was previously
// unsigned and would fail that verification (portal link non-functional).
async function makeToken(caseId: string, partnerId: string, portalType: string) {
  const payload = { consultation_id: caseId, partner_id: partnerId, portal_type: portalType, expires_at: Date.now() + 14 * 86_400_000 };
  const secret = (() => {
    // FAIL CLOSED. This used to fall back to 'change-me-in-production', a value
    // published in this repository — so anyone who could read the repo could
    // mint a portal token for any case and read a patient's record. Refusing to
    // sign is a support ticket; a forgeable token is a breach.
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
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
    const token = await makeToken(case_id, agency.id, 'travel');
    const url   = `${APP_URL}/portal/travel?token=${token}`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: agency.email,
      subject: `A new pricing request is waiting | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'requestPartnerQuotas/travel-agency',
        title: 'You have a new travel quote request.',
        line: 'A patient booking needs flights and accommodation priced. Open your portal to see the requirements and submit your quote.',
        ctaLabel: 'Submit My Quote',
        ctaUrl: url,
      }),
    }));
    // Push — travel agency phone buzzes with new booking request
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: agency.email,
      title:      '🗺️ New Quote Request',
      body:       'A patient booking needs flights and accommodation priced. Tap to submit your quote.',
      url:        url,
      type:       'booking',
      tag:        `quota-travel-${case_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('travel_agency');
  }

  // ── 2. Driver/Chauffeur ───────────────────────────────────────────────────
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver  = drivers[0];
  if (driver?.email) {
    const token = await makeToken(case_id, driver.id, 'transfer');
    const url   = `${APP_URL}/portal/transfer?token=${token}`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: driver.email,
      subject: `A new transfer quote is requested | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'requestPartnerQuotas/driver',
        title: 'You have a new transfer quote request.',
        line: 'A patient booking needs ground transfers priced. Open your portal to see the legs required and submit your quote.',
        ctaLabel: 'Submit My Quote',
        ctaUrl: url,
      }),
    }));
    // Push — driver phone buzzes with new transfer job
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: driver.email,
      title:      '🚗 New Transfer Request',
      body:       'A patient booking needs ground transfers priced. Tap to price your legs.',
      url:        url,
      type:       'booking',
      tag:        `quota-driver-${case_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('driver');
  }

  // ── 3. Companion ──────────────────────────────────────────────────────────
  const companions = await base44.asServiceRole.entities.Companion.filter({ verification_status: 'verified', is_available: true }).catch(() => []);
  const companion  = companions.find((c: any) => (c.service_regions || []).includes(caseRecord.procedure_country)) ?? companions[0];
  if (companion?.email) {
    const token = await makeToken(case_id, companion.id, 'companion');
    const url   = `${APP_URL}/companion-dashboard`;
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: companion.email,
      subject: `A new care assignment is waiting | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'requestPartnerQuotas/companion',
        title: 'You have a new care assignment request.',
        line: 'A recovery support assignment is waiting for your availability and pricing. Open your dashboard to review it.',
        ctaLabel: 'Open Companion Dashboard',
        ctaUrl: url,
      }),
    }));
    // Push — companion phone buzzes with new care assignment request
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: companion.email,
      title:      '🤱 New Companion Request',
      body:       'A recovery support assignment is waiting for your availability. Tap to confirm.',
      url:        url,
      type:       'companion',
      tag:        `quota-companion-${case_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}) ?? Promise.resolve());
    sent.push('companion');
  }

  // ── 4. Clinic (doctor's clinic) ───────────────────────────────────────────
  if (caseRecord.doctor_email) {
    dispatches.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: caseRecord.doctor_email,
      subject: `A facility fee quote is needed | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'requestPartnerQuotas/clinic',
        title: 'A facility fee quote is needed.',
        line: 'A confirmed case needs your clinic facility, anaesthesia and post-operative fees. Open your dashboard to submit them.',
        ctaLabel: 'Open Doctor Dashboard',
        ctaUrl: `/doctor-dashboard`,
      }),
    }));
    // Push — doctor gets clinic fee reminder
    dispatches.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: caseRecord.doctor_email,
      title:      '🏥 Facility Fee Quote Needed',
      body:       'A confirmed case needs your clinic facility and post-op fees. Tap to submit them.',
      url:        `${APP_URL}/doctor-dashboard`,
      type:       'success',
      tag:        `quota-clinic-${case_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
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
