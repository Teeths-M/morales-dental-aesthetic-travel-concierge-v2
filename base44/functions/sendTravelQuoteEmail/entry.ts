import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously an
// unsigned plain btoa(JSON) token with no signature suffix, which fails that
// verification and makes the chauffeur portal link silently non-functional.
async function encodePortalToken(payload: Record<string, unknown>) {
  const data = JSON.stringify(payload);
  const secret = Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { consultation_id, flight_cost_usd, hotel_cost_usd, flight_itinerary_summary, hotel_selection, taxi_service_id } = body;

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
    const token = await encodePortalToken({ ...payload, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const chauffeurPortalUrl = `${appUrl}/portal/transfer?token=${token}`;

    // Fetch taxi service email if ID provided
    let driverEmail = null;
    if (taxi_service_id) {
      const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ id: taxi_service_id });
      if (taxiServices[0]?.email) {
        driverEmail = taxiServices[0].email;
      }
    }

    // Notify the chauffeur
    if (driverEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driverEmail,
        subject: `Transfer Request — ${consultation.patient_name} | Morales Medical Travel Safety`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Transit Logistics Request',
          title: 'Patient ready for transport coordination',
          intro: 'A patient travel schedule has been logged. Please provide flat-rate pricing for your assigned regional transit legs.',
          rows: [
            ['Patient Name', consultation.patient_name],
            ['Flight Details', flight_itinerary_summary || 'TBD'],
            ['Hotel', hotel_selection || 'TBD'],
          ],
          ctaText: 'Open Transfer Portal',
          ctaUrl: chauffeurPortalUrl,
          footer: 'This link is valid for 7 days. Please do not share it.',
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

    return Response.json({
      success: true,
      message: 'Travel quote saved. Automation gate notified. Pipeline will advance when all 4 quotes confirmed.',
      chauffeur_portal_url: chauffeurPortalUrl,
    });
  } catch (error) {
    console.error('sendTravelQuoteEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});