import { createHandler, ok, err } from '../_shared/createHandler.ts';

export default createHandler(async ({ base44, body }) => {
  const { phone, code } = await body();
  if (!phone || !code) return err('Phone and code are required');

  const clean = String(phone).replace(/[^\d+\s\-()]/g, '').trim();
  const cleanCode = String(code).trim();

  const sessions = await base44.asServiceRole.entities.OtpSession.filter({ phone: clean }).catch(() => []);
  const session = sessions[0];

  if (!session) return err('No verification code found for this number. Please request a new code.');
  if (session.verified) return err('This code has already been used. Please request a new one.');
  if (new Date(session.expires_at) < new Date()) return err('Code expired. Please request a new one.');
  if (session.code !== cleanCode) return err('Incorrect code. Please check and try again.');

  // Mark as verified
  await base44.asServiceRole.entities.OtpSession.update(session.id, { verified: true });

  // Look up user by phone number to return their email (for downstream auth)
  const users = await base44.asServiceRole.entities.UserProfile?.filter({ phone: clean }).catch(() => []);
  const userEmail = users?.[0]?.email ?? null;

  return ok({ verified: true, phone: clean, user_email: userEmail });
}, { name: 'verifyOtp', requireAuth: false });
