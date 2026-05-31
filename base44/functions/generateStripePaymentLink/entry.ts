import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { case_id, deposit_option } = await req.json();
    
    if (!case_id) {
      return Response.json({ error: 'case_id required' }, { status: 400 });
    }

    // Fetch CaseRecord
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Calculate amount based on deposit option
    const finalPrice = caseRecord.final_package_price || 0;
    let amountDue = 0;
    let planType = '';

    if (deposit_option === 'Full') {
      amountDue = finalPrice * 0.95; // 5% discount
      planType = 'full_payment';
    } else if (deposit_option === '50%') {
      amountDue = finalPrice * 0.50;
      planType = 'deposit_50';
    } else if (deposit_option === '25%') {
      amountDue = finalPrice * 0.25;
      planType = 'deposit_25';
    } else {
      return Response.json({ error: 'Invalid deposit_option. Use: Full, 50%, or 25%' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          case_id: caseRecord.id,
          client_email: caseRecord.client_email,
          client_name: caseRecord.client_name,
          plan_type: planType,
          procedure: caseRecord.procedures?.[0] || 'Unknown'
        }
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${caseRecord.client_name} - Medical Travel Package`,
              description: `${planType === 'full_payment' ? 'Full Payment (5% discount applied)' : planType === 'deposit_50' ? '50% Deposit' : '25% Deposit'} - ${caseRecord.procedures?.[0] || 'Procedure'}`,
            },
            unit_amount: Math.round(amountDue * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('APP_URL')}/portal/proposal/${caseRecord.proposal_token}?payment=success`,
      cancel_url: `${Deno.env.get('APP_URL')}/portal/proposal/${caseRecord.proposal_token}?payment=cancelled`,
      customer_email: caseRecord.client_email,
      metadata: {
        case_id: caseRecord.id,
        plan_type: planType,
        client_email: caseRecord.client_email
      }
    });

    return Response.json({ 
      success: true,
      payment_url: session.url,
      case_id: caseRecord.id,
      amount_due: amountDue,
      plan_type: planType
    });

  } catch (error) {
    console.error('generateStripePaymentLink error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});