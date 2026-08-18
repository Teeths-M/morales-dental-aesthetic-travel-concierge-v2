import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';
import { signPortalToken } from '../../shared/portalToken.ts';
import { sendWhatsApp } from '../../shared/twilioWhatsApp.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { widenPartnerSearch } from '../../shared/partnerSearchWidening.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// Doctor confirmation is written by respondToDoctorPortalCase as mixed-case
// 'Confirmed' — the old strict `!== 'CONFIRMED'` check here made this
// precondition permanently false for every real confirmation. Both forms are
// accepted (CaseRecord.jsonc's own enum keeps both for the same reason).
const CONFIRMED_STATUSES = new Set(['CONFIRMED', 'Confirmed']);

// Local HTML-escape helper — same shape/spirit as assignChauffeurServices'
// `e()`. The previous version of this file interpolated every value
// (including the patient's own name) into the HTML body unescaped — a latent
// XSS-in-email gap, closed here while the file is already being rewritten.
const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Consultation.jsonc's real enum is exempt | evisa | embassy | unknown —
// phrased in plain language for a travel-agency reader, never invented.
function visaPhrase(status: string | undefined | null): string {
  switch (status) {
    case 'exempt':  return 'visa-free';
    case 'evisa':   return 'an e-visa is required';
    case 'embassy': return 'a visa is required';
    default:        return 'please advise — this route needs manual review';
  }
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { caseId, internal_secret } = await body();

  // Was hardcoded admin-session-only. respondToDoctorPortalCase (Task 2) calls
  // this with no forwardable user session, so it must also accept a trusted
  // internal caller — same gate/contract as requestPartnerQuotas.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!caseId) return err('Case ID required');

  // BUG-R7-01 FIX (preserved): asServiceRole — patient CaseRecords and
  // TravelAgency records are not owned by the calling admin/internal caller;
  // user-scoped entities returns 404/empty for cross-user data.
  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  if (!CONFIRMED_STATUSES.has(caseRecord.doctor_confirmation_status)) {
    return err(`Doctor has not confirmed yet (status: ${caseRecord.doctor_confirmation_status || 'unknown'})`, 400);
  }

  if (!caseRecord.consultation_id) {
    // Defensive addition: every real portal-link reader (getPortalData) keys
    // off consultation_id, not the CaseRecord id — a case with none would
    // mint a link that can never resolve. Route to admin review the same way
    // the "no agencies available" branch below does, rather than emailing a
    // real partner a dead link.
    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      status: 'Admin-Review',
      admin_notes: 'Cannot assign travel agency: case has no linked consultation_id',
    });
    return ok({ status: 'MISSING_CONSULTATION_ID', message: 'Case has no linked consultation. Admin review required.' });
  }

  const travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

  if (travelAgencies.length === 0) {
    // This branch used to just flip CaseRecord.status with no admin email,
    // no failure log, and nothing to the patient. Widened + made loud to
    // match every other partner type's give-up path (Portia's confirmed
    // "M-Care never gives up" design).
    const destCountry = caseRecord?.procedure_country || caseRecord?.destination_country || null;
    const widened = await widenPartnerSearch(base44, {
      partnerType: 'travel_agency',
      country: destCountry || undefined,
      need: 'a travel agency to arrange flights, hotel, and transfers for a medical travel patient',
      location: destCountry || '',
      case_id: caseId,
    }).catch(() => null);

    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      status: 'Admin-Review',
      admin_notes: 'No travel agencies available for booking'
    });

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: adminEmail,
        subject: `🚨 CRITICAL: no travel agency available — ${e(caseRecord.client_name || 'patient')}`,
        body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
          <h2 style="margin:0;">No travel agency available</h2></div>
          <div style="padding:20px;border:1px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
          <p>No active travel agency was found for this case. Manual assignment or onboarding a new partner is needed now.</p>
          <p><strong>Patient:</strong> ${e(caseRecord.client_name || 'Unknown')}<br/>
          <strong>Case ID:</strong> ${e(caseId)}<br/>
          <strong>Destination:</strong> ${e(destCountry || 'Unknown')}</p>
          ${widened?.adminHtml || ''}
          </div>`,
      }).catch(() => {});
    }

    try {
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: caseId,
        partner_type: 'travel_agency',
        failure_reason: `No active travel agency available for booking.${widened?.failureReasonSuffix ? ' ' + widened.failureReasonSuffix : ''}`,
        created_at: new Date().toISOString(),
        fallback_action: 'admin_critical_alert_sent',
        ai_recommendation: widened?.aiRecommendation || '',
      });
    } catch (_) {}

    if (caseRecord.client_email) {
      await logJourneyEvent(base44, {
        case_id: caseId,
        client_email: caseRecord.client_email,
        event_type: 'partner_search_widened',
        source: 'assignTravelAgency',
        message_text: widened?.journeyMessage || "I'm actively searching for another verified travel agency for you right now — I'll update you the moment this is resolved.",
        priority: widened?.journeyPriority || 'critical',
        action_taken: 'No active travel agency was available for booking — escalated to admin',
        tool_result: { outcome: widened?.outcome || 'no_agency_available' },
        escalation_occurred: true,
      });
    }

    return ok({ status: 'NO_TRAVEL_AGENCIES', message: 'No travel agencies available. Admin review required.' });
  }

  // Prefer agencies that service the case destination country
  const destinationCountry = caseRecord?.procedure_country || caseRecord?.destination_country || null;

  let selectedAgency = travelAgencies[0]; // default: first active
  if (destinationCountry) {
    const matchedAgency = travelAgencies.find((a: any) =>
      Array.isArray(a.service_regions) && a.service_regions.includes(destinationCountry)
    );
    if (matchedAgency) {
      selectedAgency = matchedAgency;
      console.log(`[assignTravelAgency] Matched agency ${selectedAgency.id} for destination ${destinationCountry}`);
    } else {
      console.warn(`[assignTravelAgency] No agency found for ${destinationCountry} — using default`);
    }
  }

  // ── ENRICHMENT: real, already-captured travel-readiness fields ─────────────
  // No passport-number field exists anywhere in this app as structured data
  // (a prior OCR-extraction feature for this was deliberately removed after a
  // security review) — never reference or request one below.
  const consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null);
  const nationality        = consultation?.nationality || null;
  const passportExpiryDate = consultation?.passport_expiry_date || null;
  const visaStatus         = consultation?.visa_required_status || 'unknown';
  const numberOfCompanions = consultation?.number_of_companions || 0;

  await base44.asServiceRole.entities.CaseRecord.update(caseId, {
    travel_vendor_id: selectedAgency.id,
    status: 'Vendor-Pending'
  });

  // ── Canonical, HMAC-signed portal token ─────────────────────────────────────
  // FIX: previously minted an unsigned "travel_<caseId>_<hex>" string built
  // from CaseRecord.id — verifyPortalToken rejects anything without a
  // '.'-separated HMAC signature outright, and getPortalData keys every
  // lookup off consultation_id, not the CaseRecord id — so this portal link
  // was dead on arrival for every real case. Now uses the one canonical
  // signer every real reader already verifies against.
  const portalToken = await signPortalToken(caseRecord.consultation_id, selectedAgency.id, 'travel');
  // encodeURIComponent: the token's base64 half can contain '+' characters,
  // which an un-encoded query string silently turns into spaces, corrupting
  // the token before verifyPortalToken ever sees it.
  const portalUrl = `${APP_URL}/portal/travel?token=${encodeURIComponent(portalToken)}`;

  const travelerCount   = 1 + numberOfCompanions;
  const proceduresText  = (Array.isArray(caseRecord.procedures) && caseRecord.procedures.length)
    ? caseRecord.procedures.join(', ')
    : 'their upcoming procedure';
  const datesText       = caseRecord.procedure_date
    ? new Date(caseRecord.procedure_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : "still being finalized, I'll follow up the moment it's locked in";
  const recoveryDaysText = caseRecord.recovery_days || 'TBD';
  const passportExpiryText = passportExpiryDate
    ? new Date(passportExpiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'not yet on file';
  const visaPhraseText  = visaPhrase(visaStatus);
  // nationality has no dedicated placeholder in the requested template, but
  // it's the one enrichment field with no other natural home — folded into
  // the travel-readiness line, the only place a travel agency would actually
  // use it (matching passport to traveler, and reading the visa line correctly).
  const readinessLine = nationality
    ? `traveling on a ${nationality} passport, valid through ${passportExpiryText}`
    : `passport valid through ${passportExpiryText}`;

  const agencyName = selectedAgency.agency_name || 'Travel Partner';
  const origin      = caseRecord.client_country || 'their home country';
  const destination = caseRecord.procedure_country || 'their destination';

  const emailBody = `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${e(BRAND)}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">Travel Quote Request</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">Hi ${e(agencyName)},</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    I'm reaching out on behalf of a client of ours traveling to ${e(destination)} for ${e(proceduresText)} care, and I'd love your help getting them squared away.
  </p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    <strong>Trip details:</strong> ${e(travelerCount)} traveler(s) total, flying ${e(origin)} to ${e(destination)}. Dates: ${e(datesText)}. Recovery window: ${e(recoveryDaysText)} days.
  </p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#40514a;">
    <strong>Travel readiness:</strong> ${e(readinessLine)}; visa status for this route: ${e(visaPhraseText)}.
  </p>
  <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#40514a;"><strong>What we need quoted:</strong> round-trip flights, hotel for the full recovery window, and airport transfers both ways.</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;"><strong>Not included</strong> (separately arranged if needed): in-flight meals, travel insurance, and companion services beyond transport.</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">Just click below to open your portal and submit your quote whenever you're ready — usually within 24 hours is a huge help.</p>
  <a href="${e(portalUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">Submit My Quote →</a>
  <p style="margin:28px 0 0;font-size:14px;color:#40514a;line-height:1.7;">Thank you so much, really appreciate you working with us on this one.</p>
  <p style="margin:14px 0 0;font-size:14px;color:#13221d;font-weight:700;">Warmly,<br/>The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND,
    to: selectedAgency.email,
    subject: 'A quick travel quote for an upcoming patient trip',
    body: emailBody,
  });
  await logProviderContactAttempt(base44, {
    case_id: caseId,
    partner_type: 'travel_agency',
    partner_id: selectedAgency.id,
    partner_name: agencyName,
    channel: 'email',
    purpose: 'quote_request',
    recipient: selectedAgency.email,
    initiated_by: 'assignTravelAgency',
    result: 'sent',
  });

  // ── WhatsApp — non-fatal bonus channel; must never affect the email send above ──
  try {
    const whatsappNumber = selectedAgency.whatsapp_number || selectedAgency.phone;
    if (whatsappNumber) {
      const whatsappMessage = [
        `Hi ${agencyName}, a quick travel quote request from ${BRAND}:`,
        `${travelerCount} traveler(s) to ${destination} (${proceduresText}). Dates: ${datesText}.`,
        `${readinessLine}; visa: ${visaPhraseText}.`,
        `Need: round-trip flights, hotel (full recovery window), and airport transfers both ways.`,
        `Submit your quote: ${portalUrl}`,
      ].join(' ');
      await sendWhatsApp(whatsappNumber, whatsappMessage);
      await logProviderContactAttempt(base44, {
        case_id: caseId,
        partner_type: 'travel_agency',
        partner_id: selectedAgency.id,
        partner_name: agencyName,
        channel: 'whatsapp',
        purpose: 'quote_request',
        recipient: whatsappNumber,
        initiated_by: 'assignTravelAgency',
        result: 'sent',
      });
    }
  } catch (whatsappError: any) {
    console.error('[assignTravelAgency] WhatsApp send failed (non-fatal):', whatsappError);
    await logProviderContactAttempt(base44, {
      case_id: caseId,
      partner_type: 'travel_agency',
      partner_id: selectedAgency.id,
      partner_name: agencyName,
      channel: 'whatsapp',
      purpose: 'quote_request',
      recipient: selectedAgency.whatsapp_number || selectedAgency.phone || '',
      initiated_by: 'assignTravelAgency',
      result: 'failed',
      error_detail: whatsappError?.message || 'WhatsApp send failed',
    });
  }

  return ok({
    status: 'TRAVEL_ASSIGNED',
    agency_email: selectedAgency.email,
    agency_name: selectedAgency.agency_name,
    portal_url: portalUrl,
    message: 'Travel agency assigned and notified successfully'
  });
}, { name: 'assignTravelAgency', requireAuth: false, allowedRoles: [] }));
