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
    const smsBody = new URLSearchParams({
      From: fromNumber!,
      To:   clean,
      Body: `Your Morales verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
    });

    const sendOnce = () => fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: smsBody.toString(),
        signal: AbortSignal.timeout(8000),
      }
    );

    let res: Response;
    try {
      res = await sendOnce();
    } catch (e) {
      console.error('[sendOtp] Twilio request failed:', e);
      // Treat network failure/timeout as retryable below.
      res = new Response(null, { status: 503 });
    }

    // A login burst (many users requesting a code at once) is exactly when Twilio is
    // most likely to throttle (429) or briefly error (5xx). One short-backoff retry
    // absorbs transient blips without adding much latency to the common case.
    if (!res.ok && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 750));
      try {
        res = await sendOnce();
      } catch (e) {
        console.error('[sendOtp] Twilio retry failed:', e);
        res = new Response(null, { status: 503 });
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[sendOtp] Twilio error:', res.status, detail);
      // Honest, actionable message distinct from a generic failure — this is the
      // primary login path, so users need to know retrying shortly is worth it.
      return err(
        res.status === 429 || res.status >= 500
          ? "We're experiencing high demand right now. Please wait a moment and try again."
          : 'Failed to send verification code. Please check your phone number and try again.'
      );
    }
    return ok({ sent: true, mock: false });
  }

  // Mock mode — return code so demo/judges can sign in without real SMS
  return ok({ sent: true, mock: true, demo_code: code });
}, { name: 'sendOtp', requireAuth: false });
