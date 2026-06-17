import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Backend function to calculate dynamic price quotes
 * POST /api/functions/calculatePriceQuote
 * Payload: {
 *   procedures: [{ name: string, quantity: number, complexity: string, material?: string }],
 *   country?: string,
 *   doctorId?: string
 * }
 */

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { procedures = [], country = null, doctorId = null } = payload;

    if (!procedures || procedures.length === 0) {
      return Response.json({ error: 'No procedures selected' }, { status: 400 });
    }

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

    // Calculate line items
    const lineItems = procedures.map(proc => {
      const pricing = procedurePricing.find(p => p.procedure_name === proc.name);
      if (!pricing) throw new Error(`Procedure ${proc.name} not found`);

      // Get base price
      let unitPrice = pricing.base_price_usd;

      // Apply country adjustment
      if (country) {
        const countryPrice = countryPricing.find(
          cp => cp.procedure_name === proc.name && cp.country === country && cp.is_available
        );
        if (countryPrice) {
          unitPrice = countryPrice.country_price_usd;
        }
      }

      // Apply doctor adjustment
      if (doctorId) {
        const docPrice = doctorPricing.find(
          dp => dp.doctor_id === doctorId && dp.procedure_name === proc.name && dp.approved_by_admin
        );
        if (docPrice) {
          unitPrice = docPrice.doctor_price_usd;
        }
      }

      // Apply complexity modifier
      if (proc.complexity) {
        const modifier = complexityModifiers.find(m => m.procedure_name === proc.name);
        if (modifier) {
          const factors = {
            simple: modifier.simple_factor || 0.9,
            moderate: modifier.moderate_factor || 1.0,
            complex: modifier.complex_factor || 1.25,
            advanced: modifier.advanced_factor || 1.5,
          };
          const factor = factors[proc.complexity] || 1.0;
          unitPrice *= factor;
        }
      }

      // Apply material cost
      if (proc.material && pricing.material_options) {
        const material = pricing.material_options.find(m => m.name === proc.material);
        if (material) {
          unitPrice *= material.cost_modifier;
        }
      }

      const quantity = proc.quantity || 1;
      const lineTotal = unitPrice * quantity;

      // Apply quantity discount
      let quantityDiscount = 0;
      const qtyRule = rules.find(r => r.rule_type === 'quantity' && r.is_active);
      if (qtyRule && quantity >= (qtyRule.conditions?.min_quantity || 3)) {
        quantityDiscount = lineTotal * (qtyRule.discount_pct / 100);
      }

      return {
        procedureName: proc.name,
        quantity,
        unitPrice: Math.round(unitPrice),
        lineTotal: Math.round(lineTotal),
        complexity: proc.complexity || 'moderate',
        material: proc.material || null,
        quantityDiscount: Math.round(quantityDiscount),
        finalPrice: Math.round(lineTotal - quantityDiscount),
      };
    });

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const quantityDiscountTotal = lineItems.reduce((sum, item) => sum + item.quantityDiscount, 0);

    // Check for bundle discount
    let bundleDiscount = 0;
    let applicableBundle = null;
    const procNames = lineItems.map(item => item.procedureName);

    if (procNames.length > 1) {
      applicableBundle = bundles.find(
        b => b.is_active && arrayEquals(b.procedures_included, procNames)
      );
      if (applicableBundle) {
        const bundleTotal = lineItems.reduce((sum, item) => sum + item.finalPrice, 0);
        bundleDiscount = bundleTotal - applicableBundle.bundle_price_usd;
      }
    }

    // Apply promotional rules
    let promotionalDiscount = 0;
    const activePromos = rules.filter(r => r.rule_type === 'promotion' && r.is_active);
    for (const promo of activePromos) {
      const afterQtyDiscount = subtotal - quantityDiscountTotal;
      promotionalDiscount += Math.round(afterQtyDiscount * (promo.discount_pct / 100));
    }

    const totalDiscount = quantityDiscountTotal + bundleDiscount + promotionalDiscount;
    const estimatedTotalLow = Math.round(subtotal - totalDiscount);
    const estimatedTotalHigh = Math.round(estimatedTotalLow * 1.15);

    // Save quote to database
    const quote = await base44.asServiceRole.entities.PriceQuote.create({
      user_email: user.email,
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

    return Response.json({
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
  } catch (error) {
    // BUG-R11-02 FIX: SEC-10 — do not expose internal error message (includes procedure names, entity paths)
    console.error('[calculatePriceQuote]', error);
    // Distinguish user-facing "procedure not found" from true 500s
    if (error.message?.startsWith('Procedure ') && error.message?.includes('not found')) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});

function arrayEquals(a, b) {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}