import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';
import { createHandler } from '../../shared/createHandler.ts';
import { z, strictObject, validate, Fields } from '../../shared/validate.ts';

const DEPOSIT_AMOUNT = 60;

const DepositLinkSchema = strictObject({
  case_id: Fields.shortText(100),
  original_amount: z.coerce.number().optional(),
  proposal_token: Fields.shortText(200).optional(),
});

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    // FIX: same issue as generateStripePaymentLink — this hard-required a login before
    // ever checking the token below, defeating the token path entirely for anonymous
    // visitors on the public /portal/proposal/:token page. auth.me() is now optional;
    // the tokenMatch check further down is what actually authorizes anonymous callers.
    const user = await base44.auth.me().catch(() => null);

    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(DepositLinkSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const { case_id, original_amount, proposal_token } = validated.data;

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    // Fetch case first — required for ownership check
    let caseRecord;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { /* not found */ }

    // SECURITY: Return identical 404 for both not-found and unauthorized to prevent enumeration
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const isAdmin = !!user && ['admin', 'platform_admin', 'coordinator'].includes(user.role);
    const isOwner = !!user && caseRecord.client_email === user.email;
    const tokenMatch = !!proposal_token && !!caseRecord.proposal_token &&
                       proposal_token === caseRecord.proposal_token;

    if (!isAdmin && !isOwner && !tokenMatch) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Derive client_email from the case record — never trust caller-supplied value
    const client_email = caseRecord.client_email;

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
          // PRIVACY: patient name intentionally omitted — never written to Stripe
          // metadata (no health-data BAA). client_email is retained only because the
          // webhook uses it to reconcile the payment; Stripe already holds it as the
          // first-class customer_email either way.
          case_id: case_id || '',
          client_email: client_email,
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

    // Log a pending PaymentTransaction — status set by webhook only
    if (case_id) {
      try {
        await base44.asServiceRole.entities.PaymentTransaction.create({
          case_id,
          client_email: client_email,
          stripe_session_id: session.id,
          event_type: 'consultation_deposit.session_created',
          status: 'session_created',
          raw_amount: DEPOSIT_AMOUNT,
          currency: 'usd',
          metadata: { deposit_type: 'consultation_deposit_60', original_amount_attempted: original_amount || 0 },
          created_at: new Date().toISOString(),
        });
      } catch (_) { /* non-fatal — webhook will still confirm */ }
    }

    return Response.json({
      success: true,
      payment_url: session.url,
      session_id: session.id,
      amount: DEPOSIT_AMOUNT,
    });

  } catch (error) {
    console.error('Consultation deposit link error:', error.message);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'generateConsultationDepositLink', requireAuth: false }));
