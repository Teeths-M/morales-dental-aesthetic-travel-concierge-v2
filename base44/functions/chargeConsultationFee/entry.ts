import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.8.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { consultation_id, email, procedure, destination } = await req.json();

    if (!consultation_id || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Stripe charge for $49
    const charge = await stripe.charges.create({
      amount: 4900, // $49 in cents
      currency: 'usd',
      source: 'tok_visa', // In production, this comes from frontend token
      description: `Consultation fee for ${procedure || 'procedure'} - ${destination || 'medical travel'}`,
      receipt_email: email
    });

    // Create ConsultationFee record
    const consultationFee = await base44.asServiceRole.entities.ConsultationFee.create({
      user_id: user.id,
      email: email,
      procedure: procedure || 'Consultation',
      destination: destination || 'TBD',
      consultation_fee_amount: 49,
      fee_paid: true,
      fee_paid_at: new Date().toISOString(),
      stripe_charge_id: charge.id,
      status: 'paid'
    });

    return Response.json({
      success: true,
      charge_id: charge.id,
      consultation_fee_id: consultationFee.id,
      amount: 49
    });
  } catch (error) {
    console.error('Consultation fee charge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});