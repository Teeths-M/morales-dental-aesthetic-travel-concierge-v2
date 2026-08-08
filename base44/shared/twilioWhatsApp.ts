// Shared Twilio WhatsApp helpers used by sendWhatsAppCaseUpdate and
// sendMilestoneWhatsAppCheckIns. Plain module — no Deno.serve. Lives in
// base44/shared/ (the working shared location this repo already imports
// from, e.g. cronAuth.ts) so both functions import it via ../../shared/.

export const SPANISH_NATIONALITIES = [
  'venezuela', 'colombia', 'mexico', 'argentina', 'chile', 'peru', 'ecuador',
  'bolivia', 'paraguay', 'uruguay', 'cuba', 'dominican republic', 'puerto rico',
  'panama', 'costa rica', 'honduras', 'guatemala', 'el salvador', 'nicaragua',
  'spain', 'españa', 'venezolano', 'colombiano', 'mexicano',
];

export function isSpanish(caseData: any): boolean {
  const nat = (caseData?.client_country || caseData?.nationality || '').toLowerCase();
  return SPANISH_NATIONALITIES.some(n => nat.includes(n));
}

export function toE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (phone.trim().startsWith('+')) return '+' + digits;
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }
  const form = new URLSearchParams();
  form.append('To', `whatsapp:${to}`);
  form.append('From', `whatsapp:${fromNumber}`);
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