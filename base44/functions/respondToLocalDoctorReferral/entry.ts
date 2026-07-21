import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Public, anonymous write — the local doctor accepting/declining has no login
// session, so this cannot go through base44.entities (RLS assumes an
// authenticated user) or base44.asServiceRole (throws in the browser; this
// used to be attempted client-side via plain base44.entities directly, which
// is not an authenticated-doctor session either and is the wrong trust model
// for an anonymous link regardless of whether it happened to pass RLS).
Deno.serve(createHandler(async ({ base44, body }) => {
  const { token, decision, notes } = await body();
  if (!token || !decision) return err('token and decision are required');
  if (decision !== 'accepted' && decision !== 'declined') return err('decision must be accepted or declined');

  const referrals = await base44.asServiceRole.entities.LocalDoctorReferral.filter({ portal_token: token }, '-created_date', 1);
  const referral = referrals[0];
  if (!referral) return err('Referral not found or already processed.', 404);
  if (referral.status !== 'pending') return err('This referral has already been responded to.', 409);

  await base44.asServiceRole.entities.LocalDoctorReferral.update(referral.id, {
    status: decision,
    doctor_notes: notes || null,
    responded_at: new Date().toISOString(),
  });

  return ok({ success: true, status: decision });
}, { name: 'respondToLocalDoctorReferral', requireAuth: false }));
