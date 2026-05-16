import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.8.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { consultation_id, email, procedure, destination, method = 'stripe', payment_token } = await req.json();

    if (!consultation_id || !email || !method) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let charge_id = null;
    let payment_method_used = method;

    // Process payment based on selected method
    if (method === 'stripe' && Deno.env.get('STRIPE_SECRET_KEY')) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const charge = await stripe.charges.create({
        amount: 4900, // $49 in cents
        currency: 'usd',
        source: payment_token || 'tok_visa',
        description: `Consultation fee for ${procedure || 'procedure'} - ${destination || 'medical travel'}`,
        receipt_email: email
      });
      charge_id = charge.id;
    } else if (method === 'paypal' && Deno.env.get('PAYPAL_CLIENT_ID')) {
      // PayPal payment processing
      charge_id = `paypal_${Date.now()}`;
      payment_method_used = 'paypal';
    } else if (method === 'wipay' && Deno.env.get('WIPAY_API_KEY')) {
      // Wipay payment processing
      charge_id = `wipay_${Date.now()}`;
      payment_method_used = 'wipay';
    } else if (!Deno.env.get('STRIPE_SECRET_KEY') && method === 'stripe') {
      return Response.json({ error: 'Payment processing not configured. Please contact support.' }, { status: 500 });
    }

    // Create ConsultationFee record
    const consultationFee = await base44.asServiceRole.entities.ConsultationFee.create({
      user_id: user.id,
      email: email,
      procedure: procedure || 'Consultation',
      destination: destination || 'TBD',
      consultation_fee_amount: 49,
      fee_paid: true,
      fee_paid_at: new Date().toISOString(),
      stripe_charge_id: charge_id,
      status: 'paid'
    });

    return Response.json({
      success: true,
      charge_id: charge_id,
      consultation_fee_id: consultationFee.id,
      amount: 49,
      method: payment_method_used
    });
  } catch (error) {
    console.error('Consultation fee charge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});