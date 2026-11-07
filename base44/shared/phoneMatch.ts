/**
 * phoneMatch — does a number Twilio reports (always +<country><number>, e.g.
 * +18685550142) belong to a number a person typed into the app
 * ("868-555-0142", "+1 (868) 555-0142", "0868 555 0142")?
 *
 * Stricter than phonesMatch in verifyTwilioSignature.ts, which compares only
 * the last 10 digits. That's fine for a partner's quote reply, but here a
 * match can mark a traveler's missed check-in as answered (a SAFE text), so
 * two different numbers in different countries that happen to share their
 * last 10 digits must never match. A stored number that includes its country
 * code has to match all its digits. Only a stored number with no country
 * code is compared by its ending.
 */

export function digitsOnly(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

export function sameStoredPhone(stored?: string | null, sender?: string | null): boolean {
  const raw = String(stored || '').trim();
  const s = digitsOnly(raw);
  const f = digitsOnly(sender);
  if (s.length < 7 || f.length < 7) return false;

  // Written with its country code: "+1 868 ...", or "00 1 868 ..." (the
  // international prefix used outside North America).
  if (raw.startsWith('+')) return s === f;
  if (s.startsWith('00')) return s.slice(2) === f;

  // No country code. A single leading 0 is the national trunk prefix in many
  // countries ("07700 900123" in the UK is +44 7700 900123), so drop it.
  const national = s.startsWith('0') ? s.slice(1) : s;
  if (s === f) return true; // typed with the country code but no "+"
  return national.length >= 7 && national.length <= 10 && f.endsWith(national);
}
