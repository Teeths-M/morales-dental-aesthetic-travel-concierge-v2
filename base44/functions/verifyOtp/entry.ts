import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { checkRateLimit } from '../../shared/rateLimit.ts';
import { z, strictObject } from '../../shared/validate.ts';

// Verifies a 6-digit OTP for either channel:
//   { phone, code } — phone-channel session (existing login flow)
//   { email, code } — email-channel session (onboarding email verification)
// Codes are single-use and expire 10 minutes after issue (see sendOtp).
// The exactly-one-of-phone-or-email rule stays a manual check below —
// zod's cross-field validation is more ceremony than this needs.
const VerifyOtpSchema = strictObject({
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().max(254).optional(),
  code: z.string().trim().min(1).max(10),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { phone, email, code } = await body();
  if ((!phone && !email) || !code) return err('Phone or email, plus code, are required');
  if (phone && email) return err('Provide either phone or email, not both');

  const cleanCode = String(code).trim();
  let filter: Record<string, string>;
  let identifier: string;
  if (phone) {
    identifier = String(phone).replace(/[^\d+\s\-()]/g, '').trim();
    filter = { phone: identifier };
  } else {
    identifier = String(email).trim().toLowerCase();
    filter = { email: identifier };
  }

  // SECURITY: a 6-digit code is only 1M combinations, and this endpoint had
  // no lockout beyond createHandler's generic per-IP default (60/min) —
  // trivially bypassable with a few IPs. Locks per-identifier (phone/email),
  // not per-IP, so it can't be routed around: 5 wrong guesses within the
  // code's own 10-minute validity window and this identifier is locked out.
  const attemptsOk = await checkRateLimit(base44, `verifyOtp:${identifier}`, 600, 5);
  if (!attemptsOk) {
    return err('Too many incorrect attempts. Please request a new code.', 429);
  }

  const sessions = await base44.asServiceRole.entities.OtpSession.filter(filter).catch(() => []);
  const session = sessions[0];

  if (!session) return err(phone
    ? 'No verification code found for this number. Please request a new code.'
    : 'No verification code found for this email. Please request a new code.');
  if (session.verified) return err('This code has already been used. Please request a new one.');
  if (new Date(session.expires_at) < new Date()) return err('Code expired. Please request a new one.');
  if (session.code !== cleanCode) return err('Incorrect code. Please check and try again.');

  // Mark as verified
  await base44.asServiceRole.entities.OtpSession.update(session.id, { verified: true });

  if (email) {
    // Email channel: the verified identifier IS the email — no profile lookup needed.
    return ok({ verified: true, email: identifier, user_email: identifier });
  }

  // Phone channel: look up user by phone number to return their email (for downstream auth)
  const users = await base44.asServiceRole.entities.UserProfile?.filter({ phone: identifier }).catch(() => []);
  const userEmail = users?.[0]?.email ?? null;

  return ok({ verified: true, phone: identifier, user_email: userEmail });
}, { name: 'verifyOtp', requireAuth: false, bodySchema: VerifyOtpSchema }));