import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Verifies a 6-digit OTP for either channel:
//   { phone, code } — phone-channel session (existing login flow)
//   { email, code } — email-channel session (onboarding email verification)
// Codes are single-use and expire 10 minutes after issue (see sendOtp).
export default createHandler(async ({ base44, body }) => {
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
}, { name: 'verifyOtp', requireAuth: false });
