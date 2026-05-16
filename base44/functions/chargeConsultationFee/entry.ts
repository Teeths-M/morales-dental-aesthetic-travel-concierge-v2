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

    // DEMO MODE: Generate mock charge ID without hitting payment APIs
    charge_id = `${method}_demo_${Date.now()}`;
    payment_method_used = method;

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