import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { renderEmail } from '../../shared/emailTemplate.ts';

// Generates a 6-digit OTP, stores it with a 10-minute expiry, and delivers it
// over the requested channel:
//   { phone } → Twilio SMS (mock mode returns the code when Twilio isn't configured)
//   { email } → branded email via the built-in SendEmail integration
// Public endpoint (login flow), so resends are throttled per identifier:
// 5 sends per 30-minute window, mirroring the verifyVaultPIN lockout pattern.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { phone, email } = await body();
  if (!phone && !email) return err('Phone number or email is required');
  if (phone && email) return err('Provide either phone or email, not both');

  // ── Resolve channel + sanitized identifier ────────────────────────────────
  let channel: 'phone' | 'email';
  let identifier: string;
  if (phone) {
    channel = 'phone';
    identifier = String(phone).replace(/[^\d+\s\-()]/g, '').trim();
    if (identifier.length < 7) return err('Invalid phone number');
  } else {
    channel = 'email';
    identifier = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(identifier)) return err('Invalid email address');
  }

  // ── Resend throttle: 5 per 30 min per identifier ──────────────────────────
  const windowKey = `otp_send_${channel}_${identifier}_${Math.floor(Date.now() / (30 * 60 * 1000))}`;
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter(
    { bucket_key: windowKey }, '-created_date', 1
  ).catch(() => []);
  const bucket = buckets?.[0];
  if (bucket && bucket.count >= 5) {
    return err('Too many verification codes requested. Please wait a while before trying again.', 429);
  }
  await base44.asServiceRole.entities.RateLimitBucket.create({
    bucket_key: windowKey,
    count: (bucket?.count || 0) + 1,
    window_start: new Date().toISOString(),
  }).catch(() => {});

  // ── Generate + store (overwrite any pending OTP for this identifier) ──────
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const filter = channel === 'phone' ? { phone: identifier } : { email: identifier };
  const existing = await base44.asServiceRole.entities.OtpSession.filter(filter).catch(() => []);
  const record = { ...filter, channel, code, expires_at: expiresAt, verified: false };
  if (existing[0]) {
    await base44.asServiceRole.entities.OtpSession.update(existing[0].id, record);
  } else {
    await base44.asServiceRole.entities.OtpSession.create(record);
  }

  // ── Email channel ──────────────────────────────────────────────────────────
  if (channel === 'email') {
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: identifier,
        subject: `${code} is your Morales verification code`,
        body: renderEmail({
          appUrl,
          preheader: 'Your verification code — valid for 10 minutes.',
          eyebrow: 'Email Verification',
          title: 'Your verification code',
          intro: 'Enter this code to verify your email address. It is valid for 10 minutes. Never share it with anyone — Morales staff will never ask for it.',
          bodyHtml: `<p style="font-size:32px;letter-spacing:0.35em;font-weight:600;text-align:center;margin:24px 0;color:#0C1A1D;">${code}</p>`,
        }),
      });
    } catch (e) {
      console.error('[sendOtp] SendEmail failed:', e);
      return err('Failed to send the verification email. Please check the address and try again.');
    }
    return ok({ sent: true, channel: 'email', mock: false });
  }

  // ── Phone channel (unchanged behavior) ────────────────────────────────────
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  const twilioConfigured = !!(accountSid && authToken && fromNumber);
  // Mock delivery (returning the code to the caller) is a DEV/DEMO-only affordance
  // and must be EXPLICITLY enabled. In production OTP_ALLOW_MOCK is unset, so if
  // Twilio is ever misconfigured we FAIL CLOSED instead of leaking a login code —
  // this is what prevents a "log in as anyone" bypass.
  const allowMock = Deno.env.get('OTP_ALLOW_MOCK') === 'true';

  if (twilioConfigured) {
    const smsBody = new URLSearchParams({
      From: fromNumber!,
      To:   identifier,
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
    return ok({ sent: true, channel: 'phone', mock: false });
  }

  // No Twilio configured. Only reveal a demo code when mock is EXPLICITLY allowed
  // (dev/demo). Otherwise fail closed — never return a login code to the caller.
  if (!allowMock) {
    console.error('[sendOtp] SMS not configured and OTP_ALLOW_MOCK disabled — refusing to issue an SMS code (fail closed).');
    return err('We could not send a code by SMS right now. Please use email verification instead, or contact support.', 503);
  }
  return ok({ sent: true, channel: 'phone', mock: true, demo_code: code });
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'sendOtp', requireAuth: false, rateLimit: false }));