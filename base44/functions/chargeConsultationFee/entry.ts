/**
 * chargeConsultationFee
 *
 * Creates a Stripe Checkout session for the $49 consultation retainer.
 * Does NOT mark the fee as paid — payment confirmation happens in stripePaymentWebhook.
 * Returns a checkout_url for the client to complete payment on Stripe's hosted page.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

// Sanitize text fields — strip HTML tags to prevent stored XSS
function sanitizeText(input: unknown, maxLen = 2000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS protocol
    .trim()
    .slice(0, maxLen);
}

// Validate email format
function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function checkRateLimit(base44, key, windowSeconds, maxRequests) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key });
  const bucket = buckets[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() });
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RATE LIMIT: 5 Stripe session attempts per user per hour
    const allowed = await checkRateLimit(base44, `${user.id}:chargeConsultationFee`, 3600, 5);
    if (!allowed) return Response.json({ error: 'Too many payment attempts. Please wait before trying again.' }, { status: 429 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({
        error: 'Payment system not configured. Contact support.',
        code: 'MISSING_STRIPE_KEY'
      }, { status: 503 });
    }

    const { consultation_id, email, procedure, destination } = await req.json();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });
    if (!isValidEmail(email)) return Response.json({ error: 'Invalid email address' }, { status: 400 });
    const sanitizedProcedure = sanitizeText(procedure, 200);
    const sanitizedDestination = sanitizeText(destination, 200);

    // Idempotency: already paid?
    if (consultation_id) {
      const existing = await base44.asServiceRole.entities.ConsultationFee.filter({
        consultation_id, fee_paid: true,
      });
      if (existing.length > 0) {
        return Response.json({
          success: true,
          already_paid: true,
          consultation_fee_id: existing[0].id,
          amount: existing[0].consultation_fee_amount,
        });
      }
    }
    const existingByUser = await base44.asServiceRole.entities.ConsultationFee.filter({
      user_id: user.id, fee_paid: true,
    });
    if (existingByUser.length > 0) {
      return Response.json({
        success: true,
        already_paid: true,
        consultation_fee_id: existingByUser[0].id,
        amount: existingByUser[0].consultation_fee_amount,
      });
    }

    // Re-use open Stripe session if one already exists
    const pendingTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
      user_id: user.id,
      event_type: 'consultation_fee.session_created',
      status: 'session_created',
    });
    if (pendingTxns.length > 0) {
      const stripe = new Stripe(stripeKey);
      try {
        const session = await stripe.checkout.sessions.retrieve(pendingTxns[0].stripe_session_id);
        if (session.status === 'open') {
          return Response.json({ success: true, checkout_url: session.url, idempotent: true });
        }
      } catch (_) { /* session expired — fall through to create new */ }
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          consultation_id: consultation_id || '',
          user_id: user.id,
          client_email: email,
          fee_type: 'consultation_fee_49',
        }
      },
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Consultation Retainer — Medical Travel Concierge',
            description: 'Refundable $49 retainer. Applied as credit toward your full care package.',
          },
          unit_amount: 4900,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/consultation-success?fee=pending`,
      cancel_url: `${appUrl}/booking?fee=cancelled`,
      customer_email: email,
      metadata: {
        consultation_id: consultation_id || '',
        user_id: user.id,
        client_email: email,
        fee_type: 'consultation_fee_49',
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    // Create pending ConsultationFee record — fee_paid: false until webhook confirms
    const feeRecord = await base44.asServiceRole.entities.ConsultationFee.create({
      user_id: user.id,
      email,
      procedure: sanitizedProcedure || 'Consultation',
      destination: sanitizedDestination || 'TBD',
      consultation_fee_amount: 49,
      fee_paid: false,
      stripe_charge_id: session.id,
      status: 'pending',
    });

    // Log PaymentTransaction for idempotency
    await base44.asServiceRole.entities.PaymentTransaction.create({
      case_id: consultation_id || null,
      client_email: email,
      user_id: user.id,
      stripe_session_id: session.id,
      event_type: 'consultation_fee.session_created',
      status: 'session_created',
      raw_amount: 49,
      currency: 'usd',
      metadata: { fee_record_id: feeRecord.id, fee_type: 'consultation_fee_49' },
      created_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      consultation_fee_id: feeRecord.id,
      amount: 49,
    });

  } catch (error) {
    console.error('[chargeConsultationFee]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});