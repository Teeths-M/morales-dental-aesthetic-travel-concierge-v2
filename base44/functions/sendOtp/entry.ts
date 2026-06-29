import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Generates a 6-digit OTP, stores it with a 10-minute expiry, and sends via Twilio SMS.
// In mock mode (no TWILIO_ACCOUNT_SID configured), returns the code directly for demo use.
export default createHandler(async ({ base44, body }) => {
  const { phone } = await body();
  if (!phone) return err('Phone number is required');

  // Sanitize: digits, +, spaces, hyphens only
  const clean = String(phone).replace(/[^\d+\s\-()]/g, '').trim();
  if (clean.length < 7) return err('Invalid phone number');

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Store OTP — overwrite any existing pending OTP for this phone
  const existing = await base44.asServiceRole.entities.OtpSession.filter({ phone: clean }).catch(() => []);
  if (existing[0]) {
    await base44.asServiceRole.entities.OtpSession.update(existing[0].id, { code, expires_at: expiresAt, verified: false });
  } else {
    await base44.asServiceRole.entities.OtpSession.create({ phone: clean, code, expires_at: expiresAt, verified: false });
  }

  // Try real Twilio — fall back to mock mode if not configured
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  const mockMode   = !accountSid || !authToken || !fromNumber;

  if (!mockMode) {
    const body = new URLSearchParams({
      From: fromNumber!,
      To:   clean,
      Body: `Your Morales verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error('[sendOtp] Twilio error:', detail);
      return err('Failed to send verification code. Please try again.');
    }
    return ok({ sent: true, mock: false });
  }

  // Mock mode — return code so demo/judges can sign in without real SMS
  return ok({ sent: true, mock: true, demo_code: code });
}, { name: 'sendOtp', requireAuth: false });
