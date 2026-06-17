/**
 * Dynamic Pricing Engine
 * Calculates procedure costs based on multiple factors
 */

export class PricingEngine {
  constructor(procedures, countryPricing, doctorPricing, bundles, complexityModifiers, rules) {
    this.procedures = procedures || [];
    this.countryPricing = countryPricing || [];
    this.doctorPricing = doctorPricing || [];
    this.bundles = bundles || [];
    this.complexityModifiers = complexityModifiers || [];
    this.rules = rules || [];
  }

  /**
   * Get base price for a procedure
   */
  getBasePrice(procedureName) {
    const proc = this.procedures.find(p => p.procedure_name === procedureName);
    return proc ? proc.base_price_usd : 0;
  }

  /**
   * Get country-specific price
   */
  getCountryPrice(procedureName, country) {
    const countryPrice = this.countryPricing.find(
      cp => cp.procedure_name === procedureName && cp.country === country && cp.is_available
    );
    return countryPrice ? countryPrice.country_price_usd : this.getBasePrice(procedureName);
  }

  /**
   * Get doctor-specific price
   */
  getDoctorPrice(doctorId, procedureName) {
    const docPrice = this.doctorPricing.find(
      dp => dp.doctor_id === doctorId && dp.procedure_name === procedureName && dp.approved_by_admin
    );
    return docPrice ? docPrice.doctor_price_usd : this.getBasePrice(procedureName);
  }

  /**
   * Apply complexity modifier
   */
  applyComplexityModifier(basePrice, procedureName, complexityLevel) {
    const modifier = this.complexityModifiers.find(m => m.procedure_name === procedureName);
    if (!modifier) return basePrice;

    const factors = {
      simple: modifier.simple_factor || 0.9,
      moderate: modifier.moderate_factor || 1.0,
      complex: modifier.complex_factor || 1.25,
      advanced: modifier.advanced_factor || 1.5,
    };

    const factor = factors[complexityLevel] || factors.moderate;
    return basePrice * factor;
  }

  /**
   * Apply material cost modifier
   */
  applyMaterialCost(basePrice, procedureName, materialChoice) {
    const proc = this.procedures.find(p => p.procedure_name === procedureName);
    if (!proc || !proc.material_options) return basePrice;

    const material = proc.material_options.find(m => m.name === materialChoice);
    if (!material) return basePrice;

    return basePrice * material.cost_modifier;
  }

  /**
   * Apply quantity discount
   */
  applyQuantityDiscount(lineTotal, quantity) {
    const quantityRule = this.rules.find(r => r.rule_type === 'quantity' && r.is_active);
    if (!quantityRule) return { discountAmount: 0, discountPct: 0 };

    const minQty = quantityRule.conditions.min_quantity || 3;
    if (quantity < minQty) return { discountAmount: 0, discountPct: 0 };

    const discountAmount = lineTotal * (quantityRule.discount_pct / 100);
    return { discountAmount, discountPct: quantityRule.discount_pct };
  }

  /**
   * Check if procedures qualify for bundle
   */
  getApplicableBundle(procedureNames) {
    for (const bundle of this.bundles) {
      if (bundle.is_active && this.arrayEquals(bundle.procedures_included, procedureNames)) {
        return bundle;
      }
    }
    return null;
  }

  /**
   * Calculate single procedure line item
   */
  calculateLineItem(procedureName, quantity = 1, options = {}) {
    const {
      complexity = 'moderate',
      material = null,
      doctorId = null,
      country = null,
    } = options;

    let unitPrice = country
      ? this.getCountryPrice(procedureName, country)
      : doctorId
        ? this.getDoctorPrice(doctorId, procedureName)
        : this.getBasePrice(procedureName);

    // Apply complexity modifier
    unitPrice = this.applyComplexityModifier(unitPrice, procedureName, complexity);

    // Apply material cost
    if (material) {
      unitPrice = this.applyMaterialCost(unitPrice, procedureName, material);
    }

    const lineTotal = unitPrice * quantity;
    const { discountAmount: qtyDiscount } = this.applyQuantityDiscount(lineTotal, quantity);

    return {
      procedureName,
      quantity,
      unitPrice: Math.round(unitPrice),
      lineTotal: Math.round(lineTotal),
      complexity,
      material: material || null,
      quantityDiscount: Math.round(qtyDiscount),
      finalPrice: Math.round(lineTotal - qtyDiscount),
    };
  }

  /**
   * Calculate full quote with all discounts
   */
  calculateFullQuote(selectedProcedures, options = {}) {
    const { country = null, doctorId = null } = options;

    const lineItems = selectedProcedures.map(item =>
      this.calculateLineItem(item.procedure_name, item.quantity || 1, {
        complexity: item.complexity || 'moderate',
        material: item.material || null,
        doctorId,
        country,
      })
    );

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const quantityDiscountTotal = lineItems.reduce((sum, item) => sum + item.quantityDiscount, 0);

    // Check for bundle discount
    const procedureNames = lineItems.map(item => item.procedureName);
    let bundleDiscount = 0;
    let applicableBundle = null;

    if (procedureNames.length > 1) {
      applicableBundle = this.getApplicableBundle(procedureNames);
      if (applicableBundle) {
        const bundleTotal = lineItems.reduce((sum, item) => sum + item.finalPrice, 0);
        bundleDiscount = bundleTotal - applicableBundle.bundle_price_usd;
      }
    }

    // Apply promotional rules
    let promotionalDiscount = 0;
    const activePromos = this.rules.filter(r => r.rule_type === 'promotion' && r.is_active);
    for (const promo of activePromos) {
      const afterQtyDiscount = subtotal - quantityDiscountTotal;
      promotionalDiscount += afterQtyDiscount * (promo.discount_pct / 100);
    }

    const totalDiscount = quantityDiscountTotal + bundleDiscount + promotionalDiscount;
    const estimatedTotalLow = Math.round(subtotal - totalDiscount);
    const estimatedTotalHigh = Math.round(estimatedTotalLow * 1.15); // 15% seasonal variance

    return {
      lineItems,
      subtotal: Math.round(subtotal),
      quantityDiscount: Math.round(quantityDiscountTotal),
      bundleDiscount: Math.round(bundleDiscount),
      promotionalDiscount: Math.round(promotionalDiscount),
      totalDiscount: Math.round(totalDiscount),
      estimatedTotalLow,
      estimatedTotalHigh,
      applicableBundle,
      disclaimer:
        'Prices shown are estimated and may vary depending on doctor assessment, medical complexity, materials, diagnostics, and final treatment plan.',
    };
  }

  /**
   * Get recommended add-ons for procedures
   */
  getRecommendedAddOns(procedureNames) {
    const addOns = new Set();
    for (const procName of procedureNames) {
      const proc = this.procedures.find(p => p.procedure_name === procName);
      if (proc && proc.recommended_add_ons) {
        proc.recommended_add_ons.forEach(addon => addOns.add(addon));
      }
    }
    return Array.from(addOns);
  }

  /**
   * Get price range for procedure
   */
  getPriceRange(procedureName, country = null) {
    const proc = this.procedures.find(p => p.procedure_name === procedureName);
    if (!proc) return null;

    const baseMin = country ? this.getCountryPrice(procedureName, country) : proc.min_price_usd;
    const baseMax = country ? this.getCountryPrice(procedureName, country) : proc.max_price_usd;

    return {
      procedureName,
      minPrice: Math.round(baseMin),
      maxPrice: Math.round(baseMax),
      basePrice: Math.round(proc.base_price_usd),
      complexityFactors: {
        simple: Math.round(baseMin * 0.9),
        moderate: Math.round(baseMin),
        complex: Math.round(baseMin * 1.25),
        advanced: Math.round(baseMin * 1.5),
      },
    };
  }

  /**
   * Compare prices across countries
   */
  compareCountryPrices(procedureName) {
    const proc = this.procedures.find(p => p.procedure_name === procedureName);
    if (!proc) return [];

    const countryPrices = this.countryPricing
      .filter(cp => cp.procedure_name === procedureName && cp.is_available)
      .map(cp => ({
        country: cp.country,
        price: cp.country_price_usd,
        adjustment: cp.price_adjustment_pct,
        savings: (proc.base_price_usd - cp.country_price_usd).toFixed(2),
      }))
      .sort((a, b) => a.price - b.price);

    return countryPrices;
  }

  /**
   * Compare doctor pricing
   */
  compareDoctorPrices(procedureName) {
    return this.doctorPricing
      .filter(dp => dp.procedure_name === procedureName && dp.approved_by_admin)
      .map(dp => ({
        doctorId: dp.doctor_id,
        doctorName: dp.doctor_name,
        price: dp.doctor_price_usd,
        expertise: dp.specialty_expertise_level,
        promotion: dp.promotional_discount_pct || 0,
        priceAfterPromo: Math.round(dp.doctor_price_usd * (1 - (dp.promotional_discount_pct || 0) / 100)),
      }))
      .sort((a, b) => a.price - b.price);
  }

  // Helper
  arrayEquals(a, b) {
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return JSON.stringify(sortedA) === JSON.stringify(sortedB);
  }
}

/**
 * Create pricing engine from Base44 SDK entities
 * Bounded queries prevent OOM on production-scale datasets
 */
/**
 * Create pricing engine from Base44 SDK entities
 * Bounded queries prevent OOM on production-scale datasets
 * 
 * @param {object} base44 - Base44 SDK client
 * @returns {Promise<PricingEngine>}
 */
export async function initializePricingEngine(base44) {
  try {
    // CRITICAL: All queries bounded to prevent memory exhaustion at scale
    // Limits based on expected max records per entity in production
    const [procedures, countryPricing, doctorPricing, bundles, complexityModifiers, rules] =
      await Promise.all([
        base44.entities.ProcedurePricing.list('-created_date', 500),     // ~200 procedures expected
        base44.entities.CountryPricing.list('-created_date', 1000),      // ~500 country-procedure combos
        base44.entities.DoctorPricing.list('-created_date', 500),        // ~200 doctor-procedure combos
        base44.entities.ProcedureBundle.list('-created_date', 100),      // ~50 bundles
        base44.entities.ComplexityModifier.list('-created_date', 100),   // ~100 modifiers
        base44.entities.PricingRule.list('-created_date', 100),          // ~50 rules
      ]);

    return new PricingEngine(procedures, countryPricing, doctorPricing, bundles, complexityModifiers, rules);
  } catch (error) {
    console.error('[PricingEngine] Initialization failed:', error);
    // Graceful degradation — return empty engine rather than crashing
    return new PricingEngine([], [], [], [], [], []);
  }
}