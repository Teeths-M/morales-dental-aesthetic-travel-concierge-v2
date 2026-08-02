import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { verifyPortalToken } from '../../shared/portalToken.ts';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously an
// unsigned plain btoa(JSON) token with no signature suffix, which fails that
// verification and makes the chauffeur portal link silently non-functional.
async function encodePortalToken(payload: Record<string, unknown>) {
  const data = JSON.stringify(payload);
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
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, flight_cost_usd, hotel_cost_usd, flight_itinerary_summary, hotel_selection, taxi_service_id } = body;

    // SECURITY: consultation_id is derived only from a verified portal token —
    // this endpoint previously accepted a bare consultation_id from the body
    // with no proof the caller held the travel agency's portal link for that
    // case, so anyone who knew/guessed one could inject fake quote figures
    // straight into Consultation.update() below (a pricing-fraud vector, since
    // this total flows into calculatePackagePrice).
    const verified = await verifyPortalToken(token);
    if (!verified || verified.portal_type !== 'travel') {
      return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });
    }
    const consultation_id = verified.consultation_id;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // Update consultation with travel quote + status cycle
    await base44.asServiceRole.entities.Consultation.update(consultation_id, {
      flight_cost_usd: Number(flight_cost_usd) || 0,
      hotel_cost_usd: Number(hotel_cost_usd) || 0,
      flight_itinerary_summary: flight_itinerary_summary || '',
      hotel_selection: hotel_selection || '',
      taxi_service_id: taxi_service_id || '',
      status: 'Transfer-Pending',
    });

    // Fetch the updated consultation and taxi service for email
    const consultations = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
    const consultation = consultations[0];

    if (!consultation) {
      return Response.json({ error: 'Consultation not found after update' }, { status: 404 });
    }

    // Generate tokenized portal link for chauffeur
    const payload = { consultation_id, partner_id: taxi_service_id || '', portal_type: 'transfer' };
    const chauffeurToken = await encodePortalToken({ ...payload, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const chauffeurPortalUrl = `${appUrl}/portal/transfer?token=${chauffeurToken}`;

    // Fetch taxi service email if ID provided
    let driverEmail = null;
    if (taxi_service_id) {
      const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ id: taxi_service_id });
      if (taxiServices[0]?.email) {
        driverEmail = taxiServices[0].email;
      }
    }

    // Notify the chauffeur — patient name/itinerary/hotel stay in the portal
    // the token opens, per the link-only comms policy.
    if (driverEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driverEmail,
        subject: 'Transfer Request — Morales Medical Travel Safety',
        body: linkOnlyEmail({
          title: 'A patient is ready for transport coordination',
          line: 'Please open your transfer portal to provide flat-rate pricing for your assigned regional transit legs. This link is valid for 7 days — please do not share it.',
          ctaUrl: chauffeurPortalUrl,
          ctaLabel: 'Open Transfer Portal',
          from: 'sendTravelQuoteEmail',
        }),
      });
    }

    // ── Automation Gate: update CaseRecord + check if all 4 quotes are in ──
    // Non-blocking — travel quote saved regardless of whether this call succeeds.
    const travelTotal = (Number(flight_cost_usd) || 0) + (Number(hotel_cost_usd) || 0);
    base44.functions.invoke('submitPartnerQuote', {
      consultation_id,
      partner_type: 'travel',
      amount: travelTotal,
    }).catch(e => console.warn('[sendTravelQuoteEmail] submitPartnerQuote failed:', e.message));

    // SECURITY: previously echoed chauffeur_portal_url back in this response —
    // a live, valid signed portal token for a DIFFERENT partner's (the
    // chauffeur's) portal, handed to whoever called this endpoint on the
    // travel agency's behalf. The chauffeur already gets their own link by
    // email above; the caller here doesn't use this field (confirmed against
    // its only frontend caller, PortalTravelAgency.jsx).
    return Response.json({
      success: true,
      message: 'Travel quote saved. Automation gate notified. Pipeline will advance when all 4 quotes confirmed.',
    });
  } catch (error) {
    console.error('sendTravelQuoteEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'sendTravelQuoteEmail', requireAuth: false }));