import { createHandler, ok, err } from '../../shared/createHandler.ts';
import Stripe from 'npm:stripe@17.0.0';
import { syncVerificationStateToProvider } from '../../shared/providerVerificationSync.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';

// startDoctorIdentityVerification
//
// This app already had a complete Stripe Identity RECEIVING pipeline
// (stripeIdentityWebhook, activateVerifiedDoctor's 3-check gate, the admin
// review dashboard) — but nothing anywhere actually created a Stripe
// Identity verification session. This is that missing trigger: self-serve
// only, a doctor verifies themselves. provider_id is always derived from
// the caller's own session, never a client-supplied field.
//
// Two actions, mirroring runDoctorVerification's own established
// action-dispatch shape (the sibling license-check flow):
//   get_status — the doctor's own current identity_verification_status,
//     plus whether a still-open session already exists.
//   start — creates a real Stripe Identity session (or reuses an existing
//     open one), records it, and returns the hosted verification URL for
//     the frontend to redirect to. The actual pass/fail result only ever
//     arrives later, out of band, via stripeIdentityWebhook — this
//     function's job ends at handing the doctor a real link.
//
// NOTE: the exact Identity Verification Sessions request/response shape
// below (options.document.require_matching_selfie, session.status values,
// session.url, return_url) is written from Stripe's documented API, not
// verified against a live call from this environment — worth a real test
// once STRIPE_SECRET_KEY / STRIPE_IDENTITY_WEBHOOK_SECRET are actually
// configured, before trusting it in front of a real doctor.

const PASSED = new Set(['passed', 'manual_override']);

const BodySchema = strictObject({
  action: z.enum(['get_status', 'start']),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { action } = await body();

  const doctors = await base44.asServiceRole.entities.Doctor.filter({ email: user!.email });
  const doctor = doctors[0];
  if (!doctor) return err('No doctor profile found for this account.', 404);

  if (action === 'get_status') {
    const openSessions = await base44.asServiceRole.entities.ProviderVerification.filter({
      provider_id: doctor.id,
      provider_type: 'doctor',
      verification_type: 'identity',
      status: 'initiated',
    });
    return ok({
      identity_verification_status: doctor.identity_verification_status || 'pending',
      has_pending_session: openSessions.length > 0,
    });
  }

  // action === 'start'
  if (PASSED.has(doctor.identity_verification_status)) {
    return err('Identity is already verified — no action needed.');
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return err('Identity verification is not configured yet. Please try again later.', 503);

  const stripe = new Stripe(stripeKey);

  // Idempotency: reuse an existing session still awaiting the doctor's own
  // input, rather than creating (and paying for) a duplicate every time
  // they revisit their dashboard mid-flow.
  const existing = await base44.asServiceRole.entities.ProviderVerification.filter({
    provider_id: doctor.id,
    provider_type: 'doctor',
    verification_type: 'identity',
    status: 'initiated',
  });

  if (existing.length > 0) {
    try {
      const session = await stripe.identity.verificationSessions.retrieve(existing[0].external_verification_id);
      if (session.status === 'requires_input') {
        return ok({ url: session.url, reused: true });
      }
    } catch (_) { /* session no longer retrievable — fall through and create a new one */ }
  }

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    metadata: {
      provider_id: doctor.id,
      provider_type: 'doctor',
      provider_email: doctor.email,
      provider_name: doctor.full_name || '',
    },
    return_url: `${appUrl}/DoctorDashboard?identity_verification=return`,
  });

  await base44.asServiceRole.entities.ProviderVerification.create({
    provider_id: doctor.id,
    provider_type: 'doctor',
    provider_email: doctor.email,
    provider_name: doctor.full_name || '',
    verification_type: 'identity',
    status: 'initiated',
    external_verification_id: session.id,
    initiated_at: new Date().toISOString(),
  });

  // Reflect "in progress" onto the doctor record right away, rather than
  // leaving it at its prior value until the webhook eventually fires.
  await syncVerificationStateToProvider(base44, doctor.id, 'doctor');

  return ok({ url: session.url, reused: false });
}, {
  name: 'startDoctorIdentityVerification',
  requireAuth: true,
  bodySchema: BodySchema,
  rateLimit: { max: 5, windowSeconds: 3600 },
}));
