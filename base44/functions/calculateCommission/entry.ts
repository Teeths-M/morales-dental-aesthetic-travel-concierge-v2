import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Commission tiers by partner type
const COMMISSION_RULES = {
  doctor: { min: 0.20, max: 0.35, default: 0.25 },
  travel_agency: { min: 0.20, max: 0.30, default: 0.22 },
  taxi_service: { min: 0.15, max: 0.20, default: 0.15 },
  companion: { min: 0.10, max: 0.15, default: 0.10 }
};

const SUBSCRIPTION_TIERS = {
  starter: 50,
  professional: 100,
  enterprise: 200
};

const ESCROW_RATE = 0.025; // 2.5%

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { case_id, package_price, partner_type, partner_id } = await req.json();
    if (!package_price || !partner_type) {
      return Response.json({ error: 'package_price and partner_type required' }, { status: 400 });
    }

    const rules = COMMISSION_RULES[partner_type] || COMMISSION_RULES.doctor;

    // Check if partner has a custom MonetizationPlan
    let commissionRate = rules.default;
    if (partner_id) {
      const plans = await base44.asServiceRole.entities.MonetizationPlan.filter({ partner_id });
      const plan = plans[0];
      if (plan?.commission_rate) commissionRate = plan.commission_rate;
    }

    const commissionAmount = parseFloat((package_price * commissionRate).toFixed(2));
    const escrowFee = parseFloat((package_price * ESCROW_RATE).toFixed(2));
    const partnerPayout = parseFloat((package_price - commissionAmount - escrowFee).toFixed(2));

    // Log to MonetizationPlan if partner exists
    if (partner_id) {
      const plans = await base44.asServiceRole.entities.MonetizationPlan.filter({ partner_id });
      const plan = plans[0];
      if (plan) {
        await base44.asServiceRole.entities.MonetizationPlan.update(plan.id, {
          total_revenue_generated_usd: (plan.total_revenue_generated_usd || 0) + commissionAmount
        });
      }
    }

    return Response.json({
      success: true,
      package_price,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      escrow_fee: escrowFee,
      partner_payout: partnerPayout,
      breakdown: {
        platform_revenue: commissionAmount + escrowFee,
        partner_net: partnerPayout
      }
    });
  } catch (error) {
    console.error('calculateCommission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});