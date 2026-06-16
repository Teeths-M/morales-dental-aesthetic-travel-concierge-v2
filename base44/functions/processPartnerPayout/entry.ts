/**
 * processPartnerPayout
 *
 * Escrow release + Stripe Connect payout pipeline.
 * Blocks release until all iQ200 milestone handshakes are complete.
 * Calculates platform take-rate (20-35% commission + 2.5% escrow fee),
 * then transfers the net partner amount via Stripe Connect.
 *
 * Actions:
 *   check_escrow  — verify milestone completion, return payout breakdown
 *   release_payout — execute Stripe Connect transfer to partner
 *   manual_override — admin-only force release with audit trail
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.0.0';

// Commission tiers by partner type (platform take-rate)
const COMMISSION_RULES = {
  doctor:         { default: 0.25, min: 0.20, max: 0.35 },
  travel_agency:  { default: 0.22, min: 0.20, max: 0.30 },
  taxi_service:   { default: 0.15, min: 0.15, max: 0.20 },
  companion:      { default: 0.10, min: 0.10, max: 0.15 },
};
const ESCROW_RATE = 0.025;

// iQ200 milestones that MUST be completed before any payout
const REQUIRED_MILESTONES = [
  'intake_handshake',
  'doctor_confirmed',
  'travel_confirmed',
  'client_arrived',
  'procedure_complete',
];

async function checkMilestones(base44, caseId) {
  const tl = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
  const cr = tl[0];
  if (!cr) return { complete: false, reason: 'Case not found', missing: [] };

  const completedActions = (cr.timeline_log || []).map(e => e.action);
  const MILESTONE_MAP = {
    intake_handshake:  ['stage_2_intake_handshake', 'intake_handshake_logged'],
    doctor_confirmed:  ['stage_5_doctor_confirmed', 'doctor_confirmed'],
    travel_confirmed:  ['stage_7_travel_confirmed', 'travel_confirmed'],
    client_arrived:    ['stage_9_client_arrived', 'physical_intake_handshake'],
    procedure_complete:['stage_11_procedure_complete', 'procedure_complete'],
  };

  const missing = [];
  for (const [milestone, variants] of Object.entries(MILESTONE_MAP)) {
    const found = variants.some(v => completedActions.some(a => a.includes(v)));
    if (!found) missing.push(milestone);
  }

  return {
    complete: missing.length === 0,
    missing,
    timeline_log: cr.timeline_log,
    case_status: cr.status,
    amount_paid: cr.amount_paid || 0,
    final_package_price: cr.final_package_price || 0,
    payment_status: cr.payment_status,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action, case_id, partner_id, partner_type, stripe_connect_account_id, manual_override_reason } = body;

    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    // ── CHECK ESCROW ──────────────────────────────────────────────────────────
    if (action === 'check_escrow') {
      const milestone = await checkMilestones(base44, case_id);
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id });
      const cr = cases[0];
      if (!cr) return Response.json({ error: 'Case not found' }, { status: 404 });

      const packagePrice = cr.amount_paid || cr.final_package_price || 0;
      const rules = COMMISSION_RULES[partner_type] || COMMISSION_RULES.doctor;

      let commissionRate = rules.default;
      if (partner_id) {
        const plans = await base44.asServiceRole.entities.MonetizationPlan.filter({ partner_id });
        if (plans[0]?.commission_rate) commissionRate = plans[0].commission_rate;
      }

      const commissionAmt = parseFloat((packagePrice * commissionRate).toFixed(2));
      const escrowFee = parseFloat((packagePrice * ESCROW_RATE).toFixed(2));
      const partnerPayout = parseFloat((packagePrice - commissionAmt - escrowFee).toFixed(2));

      return Response.json({
        escrow_cleared: milestone.complete,
        missing_milestones: milestone.missing,
        case_status: milestone.case_status,
        payment_status: milestone.payment_status,
        breakdown: {
          package_price: packagePrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmt,
          escrow_fee: escrowFee,
          platform_total: parseFloat((commissionAmt + escrowFee).toFixed(2)),
          partner_payout: partnerPayout,
        },
        can_release: milestone.complete && packagePrice > 0,
        requires_stripe_connect: !!stripe_connect_account_id,
      });
    }

    // ── RELEASE PAYOUT ────────────────────────────────────────────────────────
    if (action === 'release_payout' || action === 'manual_override') {
      if (!partner_type) return Response.json({ error: 'partner_type required' }, { status: 400 });

      const milestone = await checkMilestones(base44, case_id);

      // Block if milestones incomplete (unless manual override)
      if (!milestone.complete && action !== 'manual_override') {
        return Response.json({
          error: 'ESCROW_HOLD — milestone handshakes incomplete',
          missing_milestones: milestone.missing,
          message: 'Partner payout is blocked. The following iQ200 milestones have not been completed: ' + milestone.missing.join(', '),
        }, { status: 402 });
      }

      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id });
      const cr = cases[0];
      if (!cr) return Response.json({ error: 'Case not found' }, { status: 404 });

      const packagePrice = cr.amount_paid || cr.final_package_price || 0;
      if (packagePrice <= 0) return Response.json({ error: 'No payment amount on record' }, { status: 400 });

      const rules = COMMISSION_RULES[partner_type] || COMMISSION_RULES.doctor;
      let commissionRate = rules.default;
      if (partner_id) {
        const plans = await base44.asServiceRole.entities.MonetizationPlan.filter({ partner_id });
        if (plans[0]?.commission_rate) commissionRate = plans[0].commission_rate;
      }

      const commissionAmt = parseFloat((packagePrice * commissionRate).toFixed(2));
      const escrowFee = parseFloat((packagePrice * ESCROW_RATE).toFixed(2));
      const partnerPayoutAmt = parseFloat((packagePrice - commissionAmt - escrowFee).toFixed(2));
      const now = new Date().toISOString();

      let stripeTransferId = null;
      let stripeError = null;

      // Attempt Stripe Connect transfer if account ID provided
      if (stripe_connect_account_id) {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeKey) {
          const stripe = new Stripe(stripeKey);
          const transferAmountCents = Math.round(partnerPayoutAmt * 100);
          const transfer = await stripe.transfers.create({
            amount: transferAmountCents,
            currency: 'usd',
            destination: stripe_connect_account_id,
            metadata: {
              case_id,
              partner_id: partner_id || 'unknown',
              partner_type,
              commission_rate: String(commissionRate),
              platform_fee: String(commissionAmt + escrowFee),
              released_by: user.email,
              ...(action === 'manual_override' ? { override_reason: manual_override_reason || 'Admin override' } : {}),
            },
          });
          stripeTransferId = transfer.id;
        }
      }

      // Update MonetizationPlan revenue
      if (partner_id) {
        const plans = await base44.asServiceRole.entities.MonetizationPlan.filter({ partner_id });
        if (plans[0]) {
          await base44.asServiceRole.entities.MonetizationPlan.update(plans[0].id, {
            total_revenue_generated_usd: (plans[0].total_revenue_generated_usd || 0) + commissionAmt,
          });
        }
      }

      // Audit log
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        timeline_log: [
          ...(cr.timeline_log || []),
          {
            timestamp: now,
            action: action === 'manual_override' ? 'payout_manual_override' : 'payout_released',
            details: `Partner payout of $${partnerPayoutAmt} released. Platform retained $${(commissionAmt + escrowFee).toFixed(2)} (${(commissionRate * 100).toFixed(0)}% commission + 2.5% escrow). Stripe transfer: ${stripeTransferId || 'mock/pending'}. Released by: ${user.email}.${action === 'manual_override' ? ` Override reason: ${manual_override_reason}` : ''}`,
            performed_by: user.email,
            non_repudiable: true,
          }
        ]
      });

      return Response.json({
        success: true,
        action,
        payout_released: partnerPayoutAmt,
        stripe_transfer_id: stripeTransferId,
        stripe_error: stripeError,
        breakdown: {
          package_price: packagePrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmt,
          escrow_fee: escrowFee,
          platform_total: parseFloat((commissionAmt + escrowFee).toFixed(2)),
          partner_payout: partnerPayoutAmt,
        },
        released_by: user.email,
        released_at: now,
        was_override: action === 'manual_override',
        override_reason: manual_override_reason || null,
      });
    }

    return Response.json({ error: 'Unknown action. Use: check_escrow | release_payout | manual_override' }, { status: 400 });

  } catch (error) {
    console.error('processPartnerPayout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});