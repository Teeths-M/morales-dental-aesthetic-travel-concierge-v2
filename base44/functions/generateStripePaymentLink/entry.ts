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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Payment system not configured' }, { status: 503 });

    const { case_id, deposit_option, proposal_token } = await req.json();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    const validOptions = ['Full', '50%', '25%'];
    if (!validOptions.includes(deposit_option)) {
      return Response.json({ error: 'Invalid deposit_option. Use: Full, 50%, or 25%' }, { status: 400 });
    }

    // Fetch case
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Authorization check
    const isAdmin = ['admin', 'platform_admin'].includes(user.role);
    const isOwner = caseRecord.client_email === user.email;
    const tokenMatch = proposal_token && caseRecord.proposal_token &&
                       proposal_token === caseRecord.proposal_token;
    if (!isAdmin && !isOwner && !tokenMatch) {
      return Response.json({ error: 'Forbidden: not authorized for this case' }, { status: 403 });
    }

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

    // Calculate amount
    const finalPrice = caseRecord.final_package_price || 0;
    if (finalPrice <= 0) return Response.json({ error: 'Invalid package price' }, { status: 400 });

    let amountDue, planType;
    if (deposit_option === 'Full') { amountDue = finalPrice * 0.95; planType = 'full_payment'; }
    else if (deposit_option === '50%') { amountDue = finalPrice * 0.50; planType = 'deposit_50'; }
    else { amountDue = finalPrice * 0.25; planType = 'deposit_25'; }

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
            name: `${caseRecord.client_name} — Medical Travel Package`,
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
      user_id: user.id,
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
    return Response.json({ error: 'Payment link generation failed', message: error.message }, { status: 500 });
  }
});