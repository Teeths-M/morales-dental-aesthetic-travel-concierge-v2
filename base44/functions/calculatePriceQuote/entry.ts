import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Checks if two procedure name arrays contain the same values (order-independent)
function sameSet(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

Deno.serve(createHandler(async ({ req, base44, user, body }) => {
  if (req.method !== 'POST') return err('Method not allowed', 405);

  const { procedures = [], country = null, doctorId = null } = await body<{
    procedures: Array<{ name: string; quantity?: number; complexity?: string; material?: string }>;
    country?: string;
    doctorId?: string;
  }>();

  if (!procedures.length) return err('No procedures selected');

  // Fetch all pricing data in parallel
  const [procedurePricing, countryPricing, doctorPricing, bundles, complexityModifiers, rules] =
    await Promise.all([
      base44.asServiceRole.entities.ProcedurePricing.list(),
      base44.asServiceRole.entities.CountryPricing.list(),
      base44.asServiceRole.entities.DoctorPricing.list(),
      base44.asServiceRole.entities.ProcedureBundle.list(),
      base44.asServiceRole.entities.ComplexityModifier.list(),
      base44.asServiceRole.entities.PricingRule.list(),
    ]);

  // Calculate line items — throws user-safe error if procedure not found
  const lineItems = procedures.map(proc => {
    const pricing = procedurePricing.find((p: { procedure_name: string }) => p.procedure_name === proc.name);
    if (!pricing) throw Object.assign(new Error(`Procedure "${proc.name}" not found in pricing catalog`), { userFacing: true });

    let unitPrice = pricing.base_price_usd;

    if (country) {
      const cp = countryPricing.find(
        (c: { procedure_name: string; country: string; is_available: boolean }) =>
          c.procedure_name === proc.name && c.country === country && c.is_available
      );
      if (cp) unitPrice = cp.country_price_usd;
    }

    if (doctorId) {
      const dp = doctorPricing.find(
        (d: { doctor_id: string; procedure_name: string; approved_by_admin: boolean }) =>
          d.doctor_id === doctorId && d.procedure_name === proc.name && d.approved_by_admin
      );
      if (dp) unitPrice = dp.doctor_price_usd;
    }

    if (proc.complexity) {
      const mod = complexityModifiers.find((m: { procedure_name: string }) => m.procedure_name === proc.name);
      if (mod) {
        const factors: Record<string, number> = {
          simple: mod.simple_factor ?? 0.9,
          moderate: mod.moderate_factor ?? 1.0,
          complex: mod.complex_factor ?? 1.25,
          advanced: mod.advanced_factor ?? 1.5,
        };
        unitPrice *= factors[proc.complexity] ?? 1.0;
      }
    }

    if (proc.material && pricing.material_options) {
      const mat = pricing.material_options.find((m: { name: string; cost_modifier: number }) => m.name === proc.material);
      if (mat) unitPrice *= mat.cost_modifier;
    }

    const quantity = proc.quantity ?? 1;
    const lineTotal = unitPrice * quantity;

    const qtyRule = rules.find((r: { rule_type: string; is_active: boolean }) => r.rule_type === 'quantity' && r.is_active);
    const quantityDiscount = (qtyRule && quantity >= (qtyRule.conditions?.min_quantity ?? 3))
      ? lineTotal * (qtyRule.discount_pct / 100)
      : 0;

    return {
      procedureName: proc.name,
      quantity,
      unitPrice: Math.round(unitPrice),
      lineTotal: Math.round(lineTotal),
      complexity: proc.complexity ?? 'moderate',
      material: proc.material ?? null,
      quantityDiscount: Math.round(quantityDiscount),
      finalPrice: Math.round(lineTotal - quantityDiscount),
    };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const quantityDiscountTotal = lineItems.reduce((s, i) => s + i.quantityDiscount, 0);

  // Bundle discount
  let bundleDiscount = 0;
  let applicableBundle = null;
  const procNames = lineItems.map(i => i.procedureName);
  if (procNames.length > 1) {
    applicableBundle = bundles.find(
      (b: { is_active: boolean; procedures_included: string[]; bundle_price_usd: number }) =>
        b.is_active && sameSet(b.procedures_included, procNames)
    ) ?? null;
    if (applicableBundle) {
      const afterQty = lineItems.reduce((s, i) => s + i.finalPrice, 0);
      bundleDiscount = afterQty - applicableBundle.bundle_price_usd;
    }
  }

  // Promotional discounts
  const promotionalDiscount = rules
    .filter((r: { rule_type: string; is_active: boolean }) => r.rule_type === 'promotion' && r.is_active)
    .reduce((sum: number, promo: { discount_pct: number }) =>
      sum + Math.round((subtotal - quantityDiscountTotal) * (promo.discount_pct / 100)), 0);

  const totalDiscount = quantityDiscountTotal + bundleDiscount + promotionalDiscount;
  const estimatedTotalLow = Math.round(subtotal - totalDiscount);
  const estimatedTotalHigh = Math.round(estimatedTotalLow * 1.15);

  const quote = await base44.asServiceRole.entities.PriceQuote.create({
    user_email: user!.email,
    selected_procedures: lineItems,
    subtotal_usd: subtotal,
    bundle_discount_usd: bundleDiscount,
    quantity_discount_usd: quantityDiscountTotal,
    promotion_discount_usd: promotionalDiscount,
    estimated_total_low_usd: estimatedTotalLow,
    estimated_total_high_usd: estimatedTotalHigh,
    quote_status: 'draft',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  return ok({
    success: true,
    quoteId: quote.id,
    lineItems,
    subtotal,
    quantityDiscount: quantityDiscountTotal,
    bundleDiscount,
    promotionalDiscount,
    totalDiscount,
    estimatedTotalLow,
    estimatedTotalHigh,
    applicableBundle,
    disclaimer: 'Prices shown are estimated and may vary depending on doctor assessment, medical complexity, materials, diagnostics, and final treatment plan.',
  });
}, { name: 'calculatePriceQuote', requireAuth: true }));
