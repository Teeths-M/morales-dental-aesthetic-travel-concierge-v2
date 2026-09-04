import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { createHandler } from '../../shared/createHandler.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';
import { sendSms } from '../../shared/twilioSms.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { widenPartnerSearch } from '../../shared/partnerSearchWidening.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// ── Token generation — HMAC-signed to match verifyPortalToken() in getPortalData.
// Client reads via ?token= query param, decodePortalToken() in /src/lib/portalToken.js.
// FIX: previously produced an unsigned btoa(JSON) token with no signature suffix —
// getPortalData's verifyPortalToken requires a '.'-separated HMAC-SHA256 signature
// and rejects anything without one, so every generated portal link was non-functional.
async function makePortalToken(caseId: string, partnerId: string, portalType: string) {
  const payload = {
    consultation_id: caseId,
    partner_id:      partnerId,
    portal_type:     portalType,
    expires_at:      Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
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

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function chauffeurEmail({ driverName, passengerName, serviceType, routes, caseRef, portalUrl }: {
  driverName: string; passengerName: string; serviceType: string;
  routes: string[]; caseRef: string; portalUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">
    New Transfer Request — ${e(serviceType)}
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">
    Hello ${e(driverName)},
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">
    You have a new medical transfer request from <strong>${BRAND}</strong>. Please review the patient details below and submit your pricing quote at your earliest convenience.
  </p>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Passenger</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(passengerName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Service Type</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(serviceType)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td>
        <td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
  </table>

  <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#13221d;">Transfer legs required:</p>
  <ul style="margin:0 0 24px;padding-left:20px;">
    ${routes.map(r => `<li style="font-size:14px;color:#40514a;line-height:1.8;">${e(r)}</li>`).join('')}
  </ul>

  <div style="background:#fff8ed;border-left:4px solid #e8a020;padding:14px 18px;border-radius:0 12px 12px 0;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#40514a;line-height:1.6;">
      <strong>Medical transport note:</strong> This patient is travelling for a medical procedure abroad. Please ensure your vehicle is clean, comfortable, and equipped for a medically sensitive passenger. Wheelchair-accessible vehicles are preferred where available.
    </p>
  </div>

  <a href="${e(portalUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">
    Submit My Quote →
  </a>
  <p style="margin:28px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    This link is valid for 7 days and is specific to your account. Do not share it.
    Questions? Reach us on WhatsApp or reply to this email.
  </p>
  <p style="margin:14px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseId } = await req.json();
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Was admin-only — this silently 403'd whenever M-Care's own chat agent (granted
    // this function for BOOKING/TRIP HANDOFF) tried to call it on behalf of an
    // ordinary patient, since the agent forwards the real caller's session, not an
    // admin one. Same real ownership-check pattern already used by
    // sendClientBookingProposal/entry.ts (case-insensitive email match) — a patient
    // may only dispatch their own case's transport; admin/platform_admin unchanged.
    const isOwner = caseRecord.client_email && user.email && caseRecord.client_email.toLowerCase() === user.email.toLowerCase();
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Unauthorized - you may only arrange transport for your own case' }, { status: 403 });
    }

    const [originDrivers, destDrivers] = await Promise.all([
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.client_country, status: 'active' }),
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.procedure_country, status: 'active' }),
    ]);

    if (originDrivers.length === 0 || destDrivers.length === 0) {
      // Used to be a silent status flip — no admin email, no failure log,
      // nothing to the patient. Widened + made loud to match every other
      // partner type's give-up path (Portia's confirmed "M-Care never gives
      // up" design).
      const missingCountry = originDrivers.length === 0 ? caseRecord.client_country : caseRecord.procedure_country;
      const widened = await widenPartnerSearch(base44, {
        partnerType: 'taxi_service',
        country: missingCountry || undefined,
        need: 'ground transportation for a medical travel patient',
        location: missingCountry || '',
        case_id: caseId,
      }).catch(() => null);

      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'Chauffeur service unavailable in origin or destination',
      });

      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: adminEmail,
          subject: `🚨 CRITICAL: no chauffeur service available — ${e(caseRecord.client_name || 'patient')}`,
          body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
            <h2 style="margin:0;">No chauffeur service available</h2></div>
            <div style="padding:20px;border:1px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
            <p>${originDrivers.length === 0 ? 'No active driver company in the origin country' : 'No active driver company in the destination country'} — every currently active company was tried. Manual assignment is needed now.</p>
            <p><strong>Patient:</strong> ${e(caseRecord.client_name || 'Unknown')}<br/>
            <strong>Case ID:</strong> ${e(caseId)}<br/>
            <strong>Origin:</strong> ${e(caseRecord.client_country || 'Unknown')}<br/>
            <strong>Destination:</strong> ${e(caseRecord.procedure_country || 'Unknown')}</p>
            ${widened?.adminHtml || ''}
            </div>`,
        }).catch(() => {});
      }

      try {
        await base44.asServiceRole.entities.DispatchFailureLog.create({
          case_id: caseId,
          partner_type: 'taxi',
          failure_reason: `Chauffeur service unavailable in the ${originDrivers.length === 0 ? 'origin' : 'destination'} country.${widened?.failureReasonSuffix ? ' ' + widened.failureReasonSuffix : ''}`,
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
          source: 'assignChauffeurServices',
          message_text: widened?.journeyMessage || "I'm actively searching for another verified driver for you right now — I'll update you the moment this is resolved.",
          priority: widened?.journeyPriority || 'critical',
          action_taken: 'No chauffeur service was available for the trip — escalated to admin',
          tool_result: { outcome: widened?.outcome || 'no_drivers_available' },
          escalation_occurred: true,
        });
      }

      return Response.json({ status: 'NO_DRIVERS', message: 'Chauffeur services not available. Admin review required.' });
    }

    const originDriver = originDrivers[0];
    const destDriver   = destDrivers[0];
    const caseRef      = caseId.slice(-8).toUpperCase();

    // ── Fixed: tokens are btoa-encoded JSON payloads, URL uses ?token= query param ──
    // Previous implementation used random hex strings and /portal/transfer/:token path params —
    // that caused PortalChauffeur to fail because getTokenFromUrl() reads ?token= only.
    const originToken    = await makePortalToken(caseId, originDriver.id, 'transfer');
    const destToken      = await makePortalToken(caseId, destDriver.id,   'transfer');
    const originPortalUrl = `${APP_URL}/portal/transfer?token=${originToken}`;
    const destPortalUrl   = `${APP_URL}/portal/transfer?token=${destToken}`;

    // Update case record + write audit log
    const chauffeurAuditPrevHash = await computePrevHash(base44);
    await Promise.allSettled([
      base44.asServiceRole.entities.CaseRecord.update(caseId, {
        origin_driver_id:      originDriver.id,
        destination_driver_id: destDriver.id,
        transfer_status:       'SUBMITTED',
      }),
      base44.asServiceRole.entities.AuditLog.create({
        event_type:   'chauffeur_dispatched',
        actor_id:     user.id,
        actor_role:   user.role,
        actor_name:   user.full_name || user.email,
        actor_email:  user.email,
        resource_type:'CaseRecord',
        resource_id:  caseId,
        case_id:      caseId,
        details: {
          origin_driver:      originDriver.email,
          destination_driver: destDriver.email,
          client_country:     caseRecord.client_country,
          procedure_country:  caseRecord.procedure_country,
        },
        sensitive: false,
        timestamp: new Date().toISOString(),
        prev_hash: chauffeurAuditPrevHash,
      }),
    ]);

    // ── Dispatch to Origin + Destination Chauffeur simultaneously via Promise.allSettled ──
    // allSettled ensures one email failure never blocks the other dispatch.
    const dispatchResults = await Promise.allSettled([
      // Origin Chauffeur (patient's home country)
      originDriver.email ? base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to:        originDriver.email,
        subject:   `Transfer Request — ${caseRecord.client_name} (Origin) | ${BRAND}`,
        body: chauffeurEmail({
          driverName:    originDriver.driver_name || originDriver.company_name || 'Driver',
          passengerName: caseRecord.client_name,
          serviceType:   'Origin Country Transfer',
          routes:        [
            `Home → Airport (Departure day — ${caseRecord.client_country})`,
            `Airport → Home (Return — ${caseRecord.client_country})`,
          ],
          caseRef,
          portalUrl: originPortalUrl,
        }),
      }) : Promise.resolve({ skipped: 'no email' }),

      // Destination Chauffeur (procedure country)
      destDriver.email ? base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to:        destDriver.email,
        subject:   `Transfer Request — ${caseRecord.client_name} (Destination) | ${BRAND}`,
        body: chauffeurEmail({
          driverName:    destDriver.driver_name || destDriver.company_name || 'Driver',
          passengerName: caseRecord.client_name,
          serviceType:   'Destination Country Transfer',
          routes:        [
            `Airport → Hotel (Arrival — ${caseRecord.procedure_country})`,
            `Hotel → Clinic (Procedure day)`,
            `Clinic → Hotel (Post-procedure)`,
            `Hotel → Airport (Departure — ${caseRecord.procedure_country})`,
          ],
          caseRef,
          portalUrl: destPortalUrl,
        }),
      }) : Promise.resolve({ skipped: 'no email' }),
    ]);

    const failures = dispatchResults.filter(r => r.status === 'rejected').length;
    console.log(`[assignChauffeurServices] dispatched to 2 drivers, ${failures} email failures`);

    await Promise.allSettled([
      logProviderContactAttempt(base44, {
        case_id: caseId,
        partner_type: 'taxi_service',
        partner_id: originDriver.id,
        partner_name: originDriver.driver_name || originDriver.company_name || 'Driver',
        channel: 'email',
        purpose: 'quote_request',
        recipient: originDriver.email || '',
        initiated_by: 'assignChauffeurServices',
        result: originDriver.email ? (dispatchResults[0].status === 'fulfilled' ? 'sent' : 'failed') : 'skipped',
        error_detail: dispatchResults[0].status === 'rejected' ? String((dispatchResults[0] as PromiseRejectedResult).reason) : undefined,
      }),
      logProviderContactAttempt(base44, {
        case_id: caseId,
        partner_type: 'taxi_service',
        partner_id: destDriver.id,
        partner_name: destDriver.driver_name || destDriver.company_name || 'Driver',
        channel: 'email',
        purpose: 'quote_request',
        recipient: destDriver.email || '',
        initiated_by: 'assignChauffeurServices',
        result: destDriver.email ? (dispatchResults[1].status === 'fulfilled' ? 'sent' : 'failed') : 'skipped',
        error_detail: dispatchResults[1].status === 'rejected' ? String((dispatchResults[1] as PromiseRejectedResult).reason) : undefined,
      }),
    ]);

    // ── SMS — non-fatal bonus channel; lets either driver reply with a price
    // ("$120 confirmed") instead of opening the portal, via
    // twilioPartnerReplyWebhook. Sent from the dedicated
    // TWILIO_PARTNER_PHONE_NUMBER (never the patient-safety number).
    await Promise.allSettled([
      (async () => {
        if (!originDriver.phone) return;
        const smsResult = await sendSms(
          originDriver.phone,
          `Morales Medical: transfer request (Origin, case ${caseRef}) for ${caseRecord.client_name || 'a patient'}. Reply with a total price + "confirmed" (e.g. "$120 confirmed") or use your portal: ${originPortalUrl}`,
          'TWILIO_PARTNER_PHONE_NUMBER',
        );
        await logProviderContactAttempt(base44, {
          case_id: caseId,
          partner_type: 'taxi_service',
          partner_id: originDriver.id,
          partner_name: originDriver.driver_name || originDriver.company_name || 'Driver',
          channel: 'sms',
          purpose: 'quote_request',
          recipient: originDriver.phone,
          initiated_by: 'assignChauffeurServices',
          result: smsResult.ok ? 'sent' : 'failed',
          error_detail: smsResult.ok ? undefined : smsResult.error,
        });
      })(),
      (async () => {
        if (!destDriver.phone) return;
        const smsResult = await sendSms(
          destDriver.phone,
          `Morales Medical: transfer request (Destination, case ${caseRef}) for ${caseRecord.client_name || 'a patient'}. Reply with a total price + "confirmed" (e.g. "$120 confirmed") or use your portal: ${destPortalUrl}`,
          'TWILIO_PARTNER_PHONE_NUMBER',
        );
        await logProviderContactAttempt(base44, {
          case_id: caseId,
          partner_type: 'taxi_service',
          partner_id: destDriver.id,
          partner_name: destDriver.driver_name || destDriver.company_name || 'Driver',
          channel: 'sms',
          purpose: 'quote_request',
          recipient: destDriver.phone,
          initiated_by: 'assignChauffeurServices',
          result: smsResult.ok ? 'sent' : 'failed',
          error_detail: smsResult.ok ? undefined : smsResult.error,
        });
      })(),
    ]).catch((smsError) => console.error('[assignChauffeurServices] SMS send failed (non-fatal):', smsError));

    return Response.json({
      status:             'DRIVERS_ASSIGNED',
      origin_driver:      originDriver.email,
      destination_driver: destDriver.email,
      dispatch_failures:  failures,
      message:            'Origin and destination chauffeurs dispatched with branded portal links',
    });

  } catch (error) {
    console.error('[assignChauffeurServices]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'assignChauffeurServices', requireAuth: false }));
