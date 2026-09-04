// Shared plain-SMS helper, same shape as twilioWhatsApp.ts's sendWhatsApp —
// used by assignTravelAgency/assignChauffeurServices to give a partner a
// reply-by-text option alongside their existing email/WhatsApp quote request.
//
// fromNumberEnvVar lets a caller send from a SEPARATE, dedicated Twilio
// number (TWILIO_PARTNER_PHONE_NUMBER) rather than the default
// TWILIO_PHONE_NUMBER already used for patient safety check-ins — a Twilio
// number has exactly one configured "a message comes in" webhook, so
// keeping partner-reply traffic on its own number means twilioPartnerReplyWebhook
// can never collide with twilioSafetySmsWebhook/twilioSmsHandshakeWebhook's
// existing, safety-critical routing.

export async function sendSms(
  to: string,
  message: string,
  fromNumberEnvVar: string = 'TWILIO_PHONE_NUMBER',
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get(fromNumberEnvVar);
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: `Twilio credentials not configured (missing ${fromNumberEnvVar} or account credentials)` };
  }
  const form = new URLSearchParams();
  form.append('To', to);
  form.append('From', fromNumber);
  form.append('Body', message);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Twilio ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json = await res.json();
    return { ok: true, sid: json.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Twilio request failed' };
  }
}
