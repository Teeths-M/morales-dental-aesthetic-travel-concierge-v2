import { createHandler, ok, err, Base44Client } from '../_shared/createHandler.ts';

// ── Domain types ──────────────────────────────────────────────────────────────
interface ProcedurePricing {
  procedure_name: string;
  base_price_usd: number;
  material_options?: Array<{ name: string; cost_modifier: number }>;
}
interface CountryPricing {
  procedure_name: string;
  country: string;
  is_available: boolean;
  country_price_usd: number;
}
interface DoctorPricing {
  doctor_id: string;
  procedure_name: string;
  approved_by_admin: boolean;
  doctor_price_usd: number;
}
interface ComplexityModifier {
  procedure_name: string;
  simple_factor?: number;
  moderate_factor?: number;
  complex_factor?: number;
  advanced_factor?: number;
}
interface Bundle { is_active: boolean; procedures_included: string[]; bundle_price_usd: number }
interface PricingRule {
  rule_type: string;
  is_active: boolean;
  discount_pct: number;
  conditions?: { min_quantity: number };
}

interface PricingIndex {
  byName: Map<string, ProcedurePricing>;
  countryKey: Map<string, CountryPricing>;    // `${proc}::${country}` → row
  doctorKey: Map<string, DoctorPricing>;      // `${doctorId}::${proc}` → row
  modifiers: Map<string, ComplexityModifier>;
  bundleIndex: Map<string, Bundle>;           // sorted-joined proc names → bundle
  qtyRule: PricingRule | null;
  promoRules: PricingRule[];
}

// ── Module-level cache ────────────────────────────────────────────────────────
// Pricing tables change at most daily. A 5-min TTL eliminates ~99% of DB reads
// under load. All concurrent requests on the same isolate share one in-flight fetch.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { index: PricingIndex; expiresAt: number } | null = null;
let inFlight: Promise<PricingIndex> | null = null;

function bundleKey(procs: string[]): string {
  return [...procs].sort().join('|');
}

async function buildIndex(base44: Base44Client): Promise<PricingIndex> {
  const [procedurePricing, countryPricing, doctorPricing, bundles, complexityModifiers, rules] =
    await Promise.all([
      base44.asServiceRole.entities.ProcedurePricing.list(),
      base44.asServiceRole.entities.CountryPricing.list(),
      base44.asServiceRole.entities.DoctorPricing.list(),
      base44.asServiceRole.entities.ProcedureBundle.list(),
      base44.asServiceRole.entities.ComplexityModifier.list(),
      base44.asServiceRole.entities.PricingRule.list(),
    ]);

  const byName = new Map<string, ProcedurePricing>(
    (procedurePricing as ProcedurePricing[]).map(p => [p.procedure_name, p])
  );

  const countryKey = new Map<string, CountryPricing>();
  for (const c of countryPricing as CountryPricing[]) {
    if (c.is_available) countryKey.set(`${c.procedure_name}::${c.country}`, c);
  }

  const doctorKey = new Map<string, DoctorPricing>();
  for (const d of doctorPricing as DoctorPricing[]) {
    if (d.approved_by_admin) doctorKey.set(`${d.doctor_id}::${d.procedure_name}`, d);
  }

  const modifiers = new Map<string, ComplexityModifier>(
    (complexityModifiers as ComplexityModifier[]).map(m => [m.procedure_name, m])
  );

  const activeBundles = (bundles as Bundle[]).filter(b => b.is_active);
  const bundleIndex = new Map<string, Bundle>(
    activeBundles.map(b => [bundleKey(b.procedures_included), b])
  );

  const activeRules = (rules as PricingRule[]).filter(r => r.is_active);
  const qtyRule = activeRules.find(r => r.rule_type === 'quantity') ?? null;
  const promoRules = activeRules.filter(r => r.rule_type === 'promotion');

  return { byName, countryKey, doctorKey, modifiers, bundleIndex, qtyRule, promoRules };
}

async function getPricingIndex(base44: Base44Client): Promise<PricingIndex> {
  const now = Date.now();
  if (cached && now < cached.expiresAt) return cached.index;
  if (inFlight) return inFlight;
  inFlight = buildIndex(base44).then(index => {
    cached = { index, expiresAt: Date.now() + CACHE_TTL_MS };
    inFlight = null;
    return index;
  });
  inFlight.catch(() => { inFlight = null; cached = null; });
  return inFlight;
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ req, base44, user, body }) => {
  if (req.method !== 'POST') return err('Method not allowed', 405);

  const { procedures = [], country = null, doctorId = null } = await body();

  if (!procedures.length) return err('No procedures selected');

  const index = await getPricingIndex(base44);

  // Build line items — O(1) Map lookups replace O(n) find() for every row
  const lineItems = [];
  for (const proc of procedures) {
    const pricing = index.byName.get(proc.name);
    if (!pricing) return err(`Procedure "${proc.name}" not found in pricing catalog`, 404);

    let unitPrice = pricing.base_price_usd;

    if (country) {
      const cp = index.countryKey.get(`${proc.name}::${country}`);
      if (cp) unitPrice = cp.country_price_usd;
    }

    if (doctorId) {
      const dp = index.doctorKey.get(`${doctorId}::${proc.name}`);
      if (dp) unitPrice = dp.doctor_price_usd;
    }

    if (proc.complexity) {
      const mod = index.modifiers.get(proc.name);
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
      const mat = pricing.material_options.find(m => m.name === proc.material);
      if (mat) unitPrice *= mat.cost_modifier;
    }

    const quantity = proc.quantity ?? 1;
    const lineTotal = unitPrice * quantity;
    const { qtyRule } = index;
    const quantityDiscount = (qtyRule && quantity >= (qtyRule.conditions?.min_quantity ?? 3))
      ? lineTotal * (qtyRule.discount_pct / 100)
      : 0;

    lineItems.push({
      procedureName: proc.name,
      quantity,
      unitPrice: Math.round(unitPrice),
      lineTotal: Math.round(lineTotal),
      complexity: proc.complexity ?? 'moderate',
      material: proc.material ?? null,
      quantityDiscount: Math.round(quantityDiscount),
      finalPrice: Math.round(lineTotal - quantityDiscount),
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const quantityDiscountTotal = lineItems.reduce((s, i) => s + i.quantityDiscount, 0);

  // Bundle discount — O(1) key lookup replaces O(n × m log m) scan
  const procNames = lineItems.map(i => i.procedureName);
  const applicableBundle = procNames.length > 1
    ? (index.bundleIndex.get(bundleKey(procNames)) ?? null)
    : null;
  const bundleDiscount = applicableBundle
    ? Math.max(0, lineItems.reduce((s, i) => s + i.finalPrice, 0) - applicableBundle.bundle_price_usd)
    : 0;

  const afterQtySubtotal = subtotal - quantityDiscountTotal;
  const promotionalDiscount = index.promoRules.reduce(
    (sum, promo) => sum + Math.round(afterQtySubtotal * (promo.discount_pct / 100)), 0
  );

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
