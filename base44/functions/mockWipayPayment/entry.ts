/**
 * mockWipayPayment — DEVELOPMENT/TEST ONLY
 *
 * Gated behind MOCK_PAYMENTS_ENABLED=true env var.
 * Returns 403 in production. Never updates real payment status in production.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const mockEnabled = Deno.env.get('MOCK_PAYMENTS_ENABLED') === 'true';
  if (!mockEnabled) {
    return Response.json({
      error: 'Mock payments are disabled in production.',
      message: 'Set MOCK_PAYMENTS_ENABLED=true in App Secrets to enable mock payments in development/test only.',
    }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id, deposit_option, amount } = await req.json();

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const successUrl = `${appUrl}/portal-hub/checkout/${case_id}?payment_success=wipay&deposit_option=${encodeURIComponent(deposit_option)}`;

    // Only updates real data in mock/dev mode (already gated above)
    if (case_id && case_id !== 'mock_dr_rossanna_60') {
      const paymentStatus = deposit_option === 'Full' ? 'Paid In Full' :
                            deposit_option === '50%' ? '50% Paid' : '25% Paid';
      const mockPaymentId = `wipay_mock_${Date.now()}`;
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        payment_status: paymentStatus,
        amount_paid: amount,
        deposit_option,
        stripe_payment_id: mockPaymentId,
      });
      // Audit trail: log mock payment as a PaymentTransaction so it's distinguishable from real Stripe events
      await base44.asServiceRole.entities.PaymentTransaction.create({
        case_id,
        stripe_payment_intent_id: mockPaymentId,
        event_type: 'mock.wipay.payment',
        status: 'succeeded',
        deposit_option,
        raw_amount: amount || 0,
        currency: 'usd',
        metadata: { is_demo: true, exclude_from_revenue_reporting: true, provider: 'wipay_mock', mock_mode: true },
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, provider: 'wipay_mock', payment_url: successUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});