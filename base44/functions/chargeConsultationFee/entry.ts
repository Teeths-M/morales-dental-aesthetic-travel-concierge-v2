import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guard all required env vars BEFORE touching any data
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({
        error: 'Payment system not configured. Contact support.',
        code: 'MISSING_STRIPE_KEY'
      }, { status: 503 });
    }

    const { consultation_id, email, procedure, destination, method = 'stripe', payment_token } = await req.json();

    if (!email || !method) {
      return Response.json({ error: 'email and method are required' }, { status: 400 });
    }

    // IDEMPOTENCY CHECK: return existing paid record if already charged
    if (consultation_id) {
      const existing = await base44.asServiceRole.entities.ConsultationFee.filter({
        consultation_id,
        fee_paid: true,
      });
      if (existing.length > 0) {
        return Response.json({
          success: true,
          charge_id: existing[0].stripe_charge_id,
          consultation_fee_id: existing[0].id,
          amount: existing[0].consultation_fee_amount,
          method: existing[0].payment_method || method,
          already_paid: true,
        });
      }
    }

    // Fallback: check by user_id if no consultation_id provided
    const existingByUser = await base44.asServiceRole.entities.ConsultationFee.filter({
      user_id: user.id,
      fee_paid: true,
    });
    if (existingByUser.length > 0) {
      return Response.json({
        success: true,
        charge_id: existingByUser[0].stripe_charge_id,
        consultation_fee_id: existingByUser[0].id,
        amount: existingByUser[0].consultation_fee_amount,
        already_paid: true,
      });
    }

    // Only reach here if genuinely not yet paid — proceed with charge
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