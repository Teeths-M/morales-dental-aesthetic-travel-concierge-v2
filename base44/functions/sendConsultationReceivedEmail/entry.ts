import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { renderEmail } from '../_shared/emailTemplate.ts';

// Signed email-confirmation token (same HMAC pattern as portal tokens).
// Clicking "Confirm your email" in this message is the passive verification —
// proof the promised email actually arrived, with zero extra in-flow friction.
async function signEmailConfirmToken(payload: Record<string, unknown>) {
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
  const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return btoa(data) + '.' + sigHex;
}

// Sent within seconds of "Send to My Care Team" — the highest-anxiety moment
// in the whole journey. The patient has just handed over medical history and
// closed the tab; this email is what they re-read at 2am. It must contain:
// what they told us, a named human, and an explicit time promise.
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { consultation_id } = await body();
  if (!consultation_id) return err('consultation_id is required');

  const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
  if (!consultation) return err('Consultation not found', 404);

  // Only the patient who owns the consultation may trigger their own
  // confirmation (matches the submission context this is invoked from).
  if (consultation.email !== user!.email && consultation.created_by !== user!.email) {
    return err('Consultation not found', 404);
  }

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  // Duty coordinator until a real assignment rule exists — a named human,
  // never "our team".
  const coordinatorName = Deno.env.get('DUTY_COORDINATOR_NAME') || 'Maria';

  const firstName = String(consultation.patient_name || '').split(' ')[0] || 'there';
  const procedureLabel = String(consultation.procedure_interest || 'your procedure')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const rows: Array<[string, string | number]> = [
    ['Procedure', procedureLabel],
  ];
  if (consultation.destination_country) rows.push(['Destination', consultation.destination_country]);
  if (consultation.preferred_doctor_name) rows.push(['Preferred doctor', `Dr. ${consultation.preferred_doctor_name}`]);
  if (consultation.preferred_date) rows.push(['Preferred timing', consultation.preferred_date]);
  rows.push(['Reference', String(consultation.id).slice(-8).toUpperCase()]);

  const confirmToken = await signEmailConfirmToken({
    consultation_id: consultation.id,
    email: consultation.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: consultation.email,
      subject: `We have your consultation, ${firstName} — ${coordinatorName} is reviewing it now`,
      body: renderEmail({
        appUrl,
        preheader: `${coordinatorName} from your care team will contact you within 24 hours.`,
        eyebrow: 'Consultation Received',
        title: `${firstName}, your care team has it.`,
        intro: `Your consultation arrived safely and is already in front of ${coordinatorName}, your coordinator. Here is what you told us:`,
        rows,
        note: `You will hear from ${coordinatorName} personally within 24 hours. Nothing moves forward without your approval, and you can reply directly to this email at any time.`,
        ctaText: 'Confirm your email',
        ctaUrl: `${appUrl}/confirm-email?token=${encodeURIComponent(confirmToken)}`,
      }),
    });
  } catch (e) {
    console.error('[sendConsultationReceivedEmail] SendEmail failed:', e);
    return err('Could not send the confirmation email.');
  }

  return ok({ sent: true });
}, { name: 'sendConsultationReceivedEmail' }));
