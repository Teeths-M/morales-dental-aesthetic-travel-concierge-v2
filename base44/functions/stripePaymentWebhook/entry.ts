/**
 * stripePaymentWebhook
 *
 * Handles Stripe payment webhook events. All payment state transitions
 * (paid, failed, refunded) happen HERE ONLY — never from the frontend.
 *
 * SETUP REQUIRED:
 * 1. Add STRIPE_WEBHOOK_SECRET to Base44 App Secrets
 *    (Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret)
 * 2. Register this function's URL as a Stripe webhook endpoint
 *    (Stripe Dashboard → Developers → Webhooks → Add endpoint)
 *    Events to subscribe: checkout.session.completed, payment_intent.succeeded,
 *                         payment_intent.payment_failed, charge.refunded
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!webhookSecret) {
    console.error('[stripePaymentWebhook] STRIPE_WEBHOOK_SECRET not configured.');
    return Response.json({
      error: 'Webhook secret not configured.',
      setup_instructions: [
        '1. Go to Stripe Dashboard → Developers → Webhooks',
        '2. Add or select your webhook endpoint URL',
        '3. Copy the "Signing secret" (starts with whsec_)',
        '4. Add it as STRIPE_WEBHOOK_SECRET in Base44 App Secrets',
      ],
    }, { status: 503 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return Response.json({ error: 'STRIPE_SECRET_KEY not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Read raw body — must NOT parse as JSON before signature verification
  const body = await req.text();
  const stripe = new Stripe(stripeKey);

  let event;
  try {
    // constructEventAsync is required in Deno (uses SubtleCrypto which is async)
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripePaymentWebhook] Signature verification failed:', err.message);
    return Response.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Idempotency: skip if this event was already processed
  const existingTxn = await base44.asServiceRole.entities.PaymentTransaction.filter({ event_id: event.id });
  if (existingTxn.length > 0) {
    console.log(`[stripePaymentWebhook] Event ${event.id} already processed — skipping.`);
    return Response.json({ received: true, idempotent: true });
  }

  const obj = event.data.object;

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = obj;
        if (session.payment_status !== 'paid') {
          // Session open but payment not yet captured — wait for payment_intent.succeeded
          return Response.json({ received: true, skipped: 'payment_status_not_paid' });
        }
        const caseId = session.metadata?.case_id;
        const depositOption = session.metadata?.deposit_option;
        const planType = session.metadata?.plan_type;
        const feeType = session.metadata?.fee_type;

        if (feeType === 'consultation_fee_49') {
          // Handle consultation fee payment
          await handleConsultationFeePaid(base44, {
            event_id: event.id,
            event_type: event.type,
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            consultation_id: session.metadata?.consultation_id,
            client_email: session.customer_email || session.metadata?.client_email,
            user_id: session.metadata?.user_id,
            amount_total: session.amount_total / 100,
            fee_record_id: session.metadata?.fee_record_id,
          });
        } else if (caseId) {
          await handlePackagePaymentSuccess(base44, {
            event_id: event.id,
            event_type: event.type,
            case_id: caseId,
            client_email: session.customer_email || session.metadata?.client_email,
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            amount_total: session.amount_total / 100,
            currency: session.currency,
            plan_type: planType,
            deposit_option: depositOption,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = obj;
        const caseId = pi.metadata?.case_id;
        if (!caseId) break; // not a package payment
        await handlePackagePaymentSuccess(base44, {
          event_id: event.id,
          event_type: event.type,
          case_id: caseId,
          client_email: pi.metadata?.client_email,
          stripe_session_id: null,
          stripe_payment_intent_id: pi.id,
          amount_total: pi.amount_received / 100,
          currency: pi.currency,
          plan_type: pi.metadata?.plan_type,
          deposit_option: pi.metadata?.deposit_option,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = obj;
        const caseId = pi.metadata?.case_id;
        await base44.asServiceRole.entities.PaymentTransaction.create({
          case_id: caseId || null,
          client_email: pi.metadata?.client_email || '',
          stripe_payment_intent_id: pi.id,
          event_id: event.id,
          event_type: event.type,
          status: 'failed',
          raw_amount: pi.amount / 100,
          currency: pi.currency,
          metadata: { failure_message: pi.last_payment_error?.message || 'Unknown failure' },
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        break;
      }

      case 'charge.refunded': {
        const charge = obj;
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
        if (!piId) break;

        // Look up prior transaction to find case_id
        const priorTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
          stripe_payment_intent_id: piId, status: 'succeeded'
        });
        const refundedCaseId = priorTxns[0]?.case_id;
        if (refundedCaseId) {
          await base44.asServiceRole.entities.CaseRecord.update(refundedCaseId, {
            payment_status: 'Refunded',
          });
        }
        await base44.asServiceRole.entities.PaymentTransaction.create({
          case_id: refundedCaseId || null,
          client_email: priorTxns[0]?.client_email || '',
          stripe_payment_intent_id: piId,
          event_id: event.id,
          event_type: event.type,
          status: 'refunded',
          raw_amount: charge.amount_refunded / 100,
          currency: charge.currency,
          metadata: {},
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        break;
      }

      default:
        console.log(`[stripePaymentWebhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripePaymentWebhook] Error processing ${event.type}:`, err.message);
    return Response.json({ error: 'Handler error', message: err.message }, { status: 500 });
  }

  return Response.json({ received: true, event_type: event.type });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handlePackagePaymentSuccess(base44, {
  event_id, event_type, case_id, client_email,
  stripe_session_id, stripe_payment_intent_id,
  amount_total, currency, plan_type, deposit_option
}) {
  // Secondary idempotency guard: both checkout.session.completed and payment_intent.succeeded
  // can reference the same payment_intent_id. Check PI before processing to prevent double-update.
  if (stripe_payment_intent_id) {
    const existingPI = await base44.asServiceRole.entities.PaymentTransaction.filter({
      stripe_payment_intent_id,
      status: 'succeeded',
    });
    if (existingPI.length > 0) {
      console.log(`[handlePackagePaymentSuccess] PI ${stripe_payment_intent_id} already succeeded — skipping duplicate event.`);
      return;
    }
  }

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
  if (!caseRecord) {
    console.warn(`[handlePackagePaymentSuccess] Case ${case_id} not found`);
    return;
  }

  let paymentStatus, newCaseStatus;
  if (deposit_option === 'Full' || plan_type === 'full_payment') {
    paymentStatus = 'Paid In Full';
    newCaseStatus = 'Travel-Coordination';
  } else if (deposit_option === '50%' || plan_type === 'deposit_50') {
    paymentStatus = '50% Paid';
    newCaseStatus = 'Deposit-Paid';
  } else {
    paymentStatus = '25% Paid';
    newCaseStatus = 'PMP-25';
  }

  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    payment_status: paymentStatus,
    amount_paid: amount_total,
    amount_remaining: Math.max(0, (caseRecord.final_package_price || 0) - amount_total),
    stripe_payment_id: stripe_payment_intent_id || stripe_session_id,
    status: newCaseStatus,
    deposit_option: deposit_option || (plan_type === 'full_payment' ? 'Full' : plan_type === 'deposit_50' ? '50%' : '25%'),
    timeline_log: [
      ...(caseRecord.timeline_log || []),
      {
        timestamp: new Date().toISOString(),
        action: 'payment_confirmed_by_stripe_webhook',
        details: `Webhook confirmed: ${paymentStatus} — $${amount_total} (${event_type})`,
      }
    ]
  });

  // Record in PaymentTransaction (idempotency + audit)
  await base44.asServiceRole.entities.PaymentTransaction.create({
    case_id,
    client_email: client_email || caseRecord.client_email,
    stripe_session_id,
    stripe_payment_intent_id,
    event_id,
    event_type,
    status: 'succeeded',
    deposit_option,
    raw_amount: amount_total,
    currency,
    metadata: { plan_type },
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  // Mark any pending session_created record for this case as succeeded
  if (stripe_session_id) {
    const pendingTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
      stripe_session_id, status: 'session_created'
    });
    for (const t of pendingTxns) {
      await base44.asServiceRole.entities.PaymentTransaction.update(t.id, {
        status: 'succeeded', processed_at: new Date().toISOString()
      });
    }
  }
}

async function handleConsultationFeePaid(base44, {
  event_id, event_type, stripe_session_id, stripe_payment_intent_id,
  consultation_id, client_email, user_id, amount_total, fee_record_id
}) {
  // Update ConsultationFee record — ONLY on confirmed webhook
  const fees = fee_record_id
    ? await base44.asServiceRole.entities.ConsultationFee.filter({ id: fee_record_id })
    : await base44.asServiceRole.entities.ConsultationFee.filter({ user_id, fee_paid: false });

  if (fees.length > 0) {
    await base44.asServiceRole.entities.ConsultationFee.update(fees[0].id, {
      fee_paid: true,
      fee_paid_at: new Date().toISOString(),
      stripe_charge_id: stripe_payment_intent_id || stripe_session_id,
      status: 'paid',
    });
  }

  await base44.asServiceRole.entities.PaymentTransaction.create({
    case_id: consultation_id || null,
    client_email: client_email || '',
    user_id: user_id || '',
    stripe_session_id,
    stripe_payment_intent_id,
    event_id,
    event_type,
    status: 'succeeded',
    raw_amount: amount_total,
    currency: 'usd',
    metadata: { fee_type: 'consultation_fee_49' },
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}