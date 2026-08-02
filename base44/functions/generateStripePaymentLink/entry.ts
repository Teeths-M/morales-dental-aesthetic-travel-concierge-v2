/**
 * generateStripePaymentLink
 *
 * Creates a Stripe Checkout session for a case package payment.
 * Does NOT update payment status — only stripePaymentWebhook does that.
 *
 * Authorization: caller must be the case owner, present a valid proposal_token,
 * or be admin/platform_admin.
 *
 * Idempotency: checks PaymentTransaction DB for existing open sessions before creating new.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';
import { getViolations } from '../../shared/procedureCompatibility.ts';
import { createHandler } from '../../shared/createHandler.ts';
import { z, strictObject, validate, Fields } from '../../shared/validate.ts';

const PaymentLinkSchema = strictObject({
  case_id: Fields.shortText(100),
  deposit_option: z.enum(['Full', '50%', '25%']),
  proposal_token: z.string().trim().max(200).optional(),
  amount: z.coerce.number().optional(),
});

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

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    // FIX: this doc comment above has always said "caller must be the case owner,
    // present a valid proposal_token, OR be admin" — three alternative paths — but the
    // code required a logged-in session before ever checking the token, so a genuinely
    // anonymous visitor on the public /portal/proposal/:token page (the whole point of
    // that page being token-gated, not login-gated) got a hard 401 on the payment step
    // specifically, even with a perfectly valid token. auth.me() is now optional; the
    // token path below is what actually lets anonymous-but-token-holding callers through.
    const user = await base44.auth.me().catch(() => null);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Payment system not configured' }, { status: 503 });

    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(PaymentLinkSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const { case_id, deposit_option, proposal_token, amount: clientAmountRaw } = validated.data;

    // Fetch case
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Authorization check — return identical 404 for both not-found AND forbidden
    // to prevent case existence enumeration by unauthorized callers.
    const isAdmin = !!user && ['admin', 'platform_admin'].includes(user.role);
    const isOwner = !!user && caseRecord.client_email === user.email;
    const tokenMatch = !!proposal_token && !!caseRecord.proposal_token &&
                       proposal_token === caseRecord.proposal_token;
    if (!isAdmin && !isOwner && !tokenMatch) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // M PRINCIPLE — RED is a hard block, always. A payment link must never be
    // created for a clinically blocked procedure combination. Two layers:
    // the stored SAFE-T verdict, and a live re-derivation from the case's
    // procedure list (catches verdicts that went stale after a rule update,
    // and cases created outside the gated booking flows). The booking flows
    // already refuse blocked combos, so this never fires for legitimate cases.
    if (caseRecord.safe_t_result === 'BLOCKED') {
      return Response.json({
        error: 'This case is blocked pending medical safety review. Payment cannot proceed.',
      }, { status: 403 });
    }
    const procedureItems = (caseRecord.procedures || []).map((name) => ({ name, title: name }));
    if (procedureItems.length >= 2) {
      const { isBlocked } = getViolations(procedureItems);
      if (isBlocked) {
        return Response.json({
          error: 'This procedure combination requires medical safety review. Payment cannot proceed.',
        }, { status: 403 });
      }
    }

    // RATE LIMIT: 10 payment link requests per hour, keyed by user when logged in,
    // otherwise by the case itself (an anonymous token-holder has no user.id to key on).
    const rateLimitKey = user ? `${user.id}:generateStripePaymentLink` : `${case_id}:generateStripePaymentLink`;
    const allowed = await checkRateLimit(base44, rateLimitKey, 3600, 10);
    if (!allowed) return Response.json({ error: 'Too many payment link requests. Please wait before trying again.' }, { status: 429 });

    // DB idempotency: re-use open session for this case+option
    const existingTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
      case_id,
      deposit_option,
      status: 'session_created',
    });
    if (existingTxns.length > 0) {
      const stripe = new Stripe(stripeKey);
      try {
        const session = await stripe.checkout.sessions.retrieve(existingTxns[0].stripe_session_id);
        if (session.status === 'open') {
          return Response.json({
            success: true,
            payment_url: session.url,
            case_id,
            session_id: session.id,
            amount_due: existingTxns[0].raw_amount,
            idempotent: true,
          });
        }
      } catch (_) { /* session expired — create new one */ }
    }

    // SECURITY: Always calculate amount from server-side data, never trust client
    const finalPrice = caseRecord.final_package_price || 0;
    if (finalPrice <= 0) return Response.json({ error: 'Invalid package price' }, { status: 400 });

    let amountDue, planType;
    if (deposit_option === 'Full') { amountDue = finalPrice * 0.95; planType = 'full_payment'; }
    else if (deposit_option === '50%') { amountDue = finalPrice * 0.50; planType = 'deposit_50'; }
    else { amountDue = finalPrice * 0.25; planType = 'deposit_25'; }

    // If client sent an amount, validate it matches the server-calculated value (fraud detection).
    const clientAmount = typeof clientAmountRaw === 'number' ? Math.round(clientAmountRaw * 100) : null;
    const serverAmount = Math.round(amountDue * 100);
    if (clientAmount !== null && Math.abs(clientAmount - serverAmount) > 1) {
      console.error(`[generateStripePaymentLink] Amount mismatch! Client sent ${clientAmount} cents, server expects ${serverAmount} cents for case ${case_id}`);
      return Response.json({ error: 'Payment amount mismatch — please refresh and try again' }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey);
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          case_id: caseRecord.id,
          client_email: caseRecord.client_email,
          plan_type: planType,
          deposit_option,
        }
      },
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            // PRIVACY: no patient name in the Stripe product label — Stripe has no
            // health-data BAA. A non-identifying case reference is enough for the
            // customer's receipt; their identity is carried only by customer_email.
            name: `Medical Travel Package — Case ${String(caseRecord.id).slice(-8)}`,
            description: planType === 'full_payment'
              ? 'Full Payment (5% discount applied)'
              : planType === 'deposit_50' ? '50% Deposit' : '25% Deposit',
          },
          unit_amount: Math.round(amountDue * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/portal/proposal/${caseRecord.proposal_token}?payment=success`,
      cancel_url: `${appUrl}/portal/proposal/${caseRecord.proposal_token}?payment=cancelled`,
      customer_email: caseRecord.client_email,
      metadata: {
        case_id: caseRecord.id,
        plan_type: planType,
        deposit_option,
        client_email: caseRecord.client_email,
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    // Persist session in DB — do NOT update case payment status
    await base44.asServiceRole.entities.PaymentTransaction.create({
      case_id: caseRecord.id,
      client_email: caseRecord.client_email,
      user_id: user?.id || null,
      stripe_session_id: session.id,
      event_type: 'checkout.session.created',
      status: 'session_created',
      deposit_option,
      raw_amount: amountDue,
      currency: 'usd',
      metadata: { plan_type: planType },
      created_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      payment_url: session.url,
      case_id: caseRecord.id,
      amount_due: amountDue,
      plan_type: planType,
      session_id: session.id,
    });

  } catch (error) {
    console.error('[generateStripePaymentLink]', error.message);
    return Response.json({ error: 'Payment link generation failed.' }, { status: 500 });
  }
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'generateStripePaymentLink', requireAuth: false, rateLimit: false }));
