import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../../shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';

// HMAC-signed to match verifyPortalToken() in getPortalData — previously an
// unsigned plain btoa(JSON) token with no signature suffix, which fails that
// verification and makes the resent chauffeur portal link silently non-functional.
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
  }).catch(e => console.warn('[resendChauffeurPortalEmail] SMS failed:', e.message));
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

    // Fetch active taxi services (chauffeur partners)
    const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' });

    if (taxiServices.length === 0) {
      return Response.json({ error: 'No active taxi services found' }, { status: 404 });
    }

    const sent = [];
    for (const cab of taxiServices) {
      const driverName = cab.driver_name || cab.company_name || 'Partner';
      const token = await encodePortalToken({
        consultation_id,
        partner_id: cab.id,
        portal_type: 'transfer',
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      const portalLink = `${appUrl}/portal/transfer?token=${token}`;

      // Blackout guard
      const blackoutRes = await base44.functions.invoke('checkNotificationBlackout', {
        case_id: consultation_id,
        notification_type: 'email',
        recipient_role: 'vendor',
        recipient_identifier: cab.email,
        event_trigger: 'resendChauffeurPortalEmail',
        payload: body
      }).catch(() => ({ data: { suppressed: false } }));

      if (blackoutRes.data?.suppressed) {
        console.log(`Notification to ${cab.email} suppressed — blackout active`);
        continue;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: cab.email,
        subject: `Transfer request — ${consultation.patient_name} | ${BRAND}`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Transfer request',
          title: 'Patient transfer quote needed',
          intro: `Hello ${driverName}, this confirmed patient will need reliable local transportation support.`,
          rows: [
            ['Patient', consultation.patient_name],
            ['Requested service', 'Airport, clinic, and hotel transfers'],
            ['Preferred date', consultation.preferred_date || 'Flexible'],
            ['Companion', consultation.has_companion ? 'Yes' : 'No'],
            ['Special instructions', consultation.transfer_notes || 'None'],
          ],
          ctaText: 'Open Chauffeur Portal & Submit Pricing →',
          ctaUrl: portalLink,
          footer: 'Click the button above to access your secure portal and submit your per-leg transfer pricing.',
        }),
      });

      // SMS — send alongside email if phone on file
      const phone = cab.whatsapp_number || cab.phone;
      if (phone) {
        await sendSms(phone, `Hi ${driverName}! Transfer request for ${consultation.patient_name}. Access your Morales chauffeur portal: ${portalLink}`);
      }

      sent.push({ name: driverName, email: cab.email, portal_link: portalLink, sms_sent: !!phone });
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('resendChauffeurPortalEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});