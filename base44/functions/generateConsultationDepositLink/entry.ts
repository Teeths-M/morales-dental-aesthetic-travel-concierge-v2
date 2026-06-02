import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

const DEPOSIT_AMOUNT = 60;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { case_id, client_email, client_name, original_amount } = await req.json();

    if (!client_email) {
      return Response.json({ error: 'client_email required' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

    // Build success/cancel URLs
    const successUrl = case_id
      ? `${appUrl}/portal/proposal/${case_id}?deposit=success&type=consultation_deposit`
      : `${appUrl}/consultation-success?deposit=success`;
    const cancelUrl = case_id
      ? `${appUrl}/portal/hub/checkout/${case_id}?deposit=cancelled`
      : `${appUrl}/booking`;

    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          case_id: case_id || '',
          client_email: client_email,
          client_name: client_name || '',
          deposit_type: 'consultation_deposit_60',
          original_amount_attempted: String(original_amount || 0),
          primary_auth_failed: 'true',
        }
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Consultation Deposit — Slot & Itinerary Hold',
              description: 'Secures your consultation slot and logistics itinerary. Remaining balance to be cleared with your bank separately.',
            },
            unit_amount: DEPOSIT_AMOUNT * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: client_email,
      metadata: {
        case_id: case_id || '',
        deposit_type: 'consultation_deposit_60',
        original_amount_attempted: String(original_amount || 0),
        primary_auth_failed: 'true',
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    // If we have a case_id, update the CaseRecord status and log the event
    if (case_id) {
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        status: 'Deposit-Paid',
        payment_status: '25% Paid',
        admin_notes: `[CONSULTATION DEPOSIT] Patient authorized $60 consultation deposit after primary high-tier charge was declined by bank. Original attempted amount: $${original_amount || 'unknown'}. Coordinator action required: assist client with bank whitelist for remaining balance. Deposit secured at ${new Date().toISOString()}.`,
      });
    }

    return Response.json({
      success: true,
      payment_url: session.url,
      session_id: session.id,
      amount: DEPOSIT_AMOUNT,
    });

  } catch (error) {
    console.error('Consultation deposit link error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});