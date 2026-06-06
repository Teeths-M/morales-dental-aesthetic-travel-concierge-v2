/**
 * chargeConsultationFee
 *
 * Creates a Stripe Checkout session for the $49 consultation retainer.
 * Does NOT mark the fee as paid — payment confirmation happens in stripePaymentWebhook.
 * Returns a checkout_url for the client to complete payment on Stripe's hosted page.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({
        error: 'Payment system not configured. Contact support.',
        code: 'MISSING_STRIPE_KEY'
      }, { status: 503 });
    }

    const { consultation_id, email, procedure, destination } = await req.json();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

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
      procedure: procedure || 'Consultation',
      destination: destination || 'TBD',
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
    console.error('[chargeConsultationFee] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});