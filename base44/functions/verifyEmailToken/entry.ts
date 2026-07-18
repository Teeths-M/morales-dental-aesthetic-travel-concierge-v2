import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Passive email verification: the patient clicks "Confirm your email" in the
// consultation-received message. Token is HMAC-signed by
// sendConsultationReceivedEmail; confirming is idempotent and public
// (the signature is the authorization).
async function verifySignature(data: string, sigHex: string) {
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
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === sigHex;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { token } = await body();
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return err('Invalid confirmation link.');
  }

  const [dataB64, sigHex] = token.split('.');
  let payload: { consultation_id?: string; email?: string; exp?: number };
  let data: string;
  try {
    data = atob(dataB64);
    payload = JSON.parse(data);
  } catch (_) {
    return err('Invalid confirmation link.');
  }

  if (!(await verifySignature(data, sigHex))) return err('Invalid confirmation link.');
  if (!payload.exp || Date.now() > payload.exp) {
    return err('This confirmation link has expired. Your coordinator will verify your email with you directly.');
  }
  if (!payload.consultation_id || !payload.email) return err('Invalid confirmation link.');

  const consultation = await base44.asServiceRole.entities.Consultation.get(payload.consultation_id);
  if (!consultation || consultation.email !== payload.email) {
    return err('Invalid confirmation link.');
  }

  if (!consultation.email_verified) {
    await base44.asServiceRole.entities.Consultation.update(consultation.id, { email_verified: true });
  }

  return ok({
    verified: true,
    first_name: String(consultation.patient_name || '').split(' ')[0] || '',
  });
}, { name: 'verifyEmailToken', requireAuth: false }));
