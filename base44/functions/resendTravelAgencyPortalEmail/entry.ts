import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../../shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously an
// unsigned plain btoa(JSON) token with no signature suffix, which fails that
// verification and makes the resent travel agency portal link silently non-functional.
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

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(e => console.warn('[resendTravelAgencyPortalEmail] SMS failed:', e.message));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { consultation_id } = body;
    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';

    // Fetch consultation
    const consultations = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
    const consultation = consultations[0];
    if (!consultation) {
      return Response.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Fetch active travel agencies
    const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

    if (agencies.length === 0) {
      return Response.json({ error: 'No active travel agencies found' }, { status: 404 });
    }

    const sent = [];
    for (const agency of agencies) {
      const agencyName = agency.agency_name || agency.contact_person || 'Travel Partner';
      const token = await encodePortalToken({
        consultation_id,
        partner_id: agency.id,
        portal_type: 'travel',
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      const portalLink = `${appUrl}/portal/travel?token=${token}`;

      // Blackout guard
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: consultation_id,
        notification_type: 'email',
        recipient_role: 'vendor',
        recipient_identifier: agency.email,
        event_trigger: 'resendTravelAgencyPortalEmail',
        payload: body,
        internal_secret: Deno.env.get('CRON_SECRET'),
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        console.log(`Notification to ${agency.email} suppressed — blackout active`);
        continue;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: agency.email,
        subject: `Travel booking request — ${consultation.patient_name} | ${BRAND}`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Travel booking request',
          title: 'Patient flight & hotel quote needed',
          intro: `Hello ${agencyName}, a confirmed patient requires international travel coordination for their upcoming medical procedure.`,
          rows: [
            ['Client Full Name', consultation.patient_name],
            ['Procedure Destination', consultation.procedure_country || consultation.destination_country || 'To be confirmed'],
            ['Client Origin Country', consultation.client_country || consultation.nationality || 'To be confirmed'],
            ['Client Origin City', consultation.client_city || 'To be confirmed'],
            ['Passport Number', consultation.passport_number || 'Not provided'],
            ['Passport Issue Date', consultation.passport_issue_date || 'Not provided'],
            ['Passport Expiry Date', consultation.passport_expiry_date || 'Not provided'],
            ['Arrival Date', consultation.preferred_date || 'Flexible'],
            ['Return Date', consultation.return_date || 'To be confirmed'],
            ['Duration of Stay', consultation.duration_of_stay || 'To be confirmed'],
            ['Total Travellers', consultation.has_companion
              ? `${(consultation.number_of_companions || 1) + 1} (Client + ${consultation.number_of_companions || 1} companion${(consultation.number_of_companions || 1) > 1 ? 's' : ''})`
              : '1 (Client only)'],
          ],
          ctaText: 'Open Travel Agency Portal & Submit Quote →',
          ctaUrl: portalLink,
          footer: 'Click the button above to access your secure portal and submit flight and hotel pricing for this patient.',
        }),
      });

      // SMS — send alongside email if phone on file
      const phone = agency.whatsapp_number || agency.phone;
      if (phone) {
        await sendSms(phone, `Hi ${agencyName}! Travel quote needed for ${consultation.patient_name}. Access your Morales travel portal: ${portalLink}`);
      }

      sent.push({ name: agencyName, email: agency.email, portal_link: portalLink, sms_sent: !!phone });
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('resendTravelAgencyPortalEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});