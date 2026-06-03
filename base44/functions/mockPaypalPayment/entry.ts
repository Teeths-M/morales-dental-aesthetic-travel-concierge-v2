import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id, deposit_option, amount } = await req.json();

    // Mock: simulate PayPal by immediately marking as paid and redirecting to success
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const successUrl = `${appUrl}/portal-hub/checkout/${case_id}?payment_success=paypal&deposit_option=${encodeURIComponent(deposit_option)}`;

    // Update the CaseRecord payment status
    if (case_id && case_id !== 'mock_dr_rossanna_60') {
      const paymentStatus = deposit_option === 'Full' ? 'Paid In Full' :
                            deposit_option === '50%' ? '50% Paid' : '25% Paid';
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        payment_status: paymentStatus,
        amount_paid: amount,
        deposit_option: deposit_option,
        stripe_payment_id: `paypal_mock_${Date.now()}`
      });
    }

    return Response.json({
      success: true,
      provider: 'paypal_mock',
      payment_url: successUrl
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});