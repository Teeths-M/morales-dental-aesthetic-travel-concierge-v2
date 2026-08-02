import { createHandler, ok, err } from '../../shared/createHandler.ts';

/**
 * calculatePackagePrice
 *
 * Calculates the patient-facing package price from confirmed partner quotes.
 *
 * Formula (as defined in workflow):
 *   base_cost = treatment + flight + hotel + driver + companion + clinic (sum of all partner quotes)
 *   package_price_full  = (base_cost - 49) * 1.25   [25% markup — full payment]
 *   package_price_terms = (base_cost - 49) * 1.30   [30% markup — instalment plan]
 *   first_installment   = package_price_terms * 0.50
 *
 * The $49 consultation fee is credited back (deducted from base) since the patient
 * already paid it at consultation — they shouldn't be charged twice.
 *
 * Called by executeCaseWorkflow when all_quotas_confirmed = true.
 * After calculating, fires sendPayNowEmail automatically.
 */

const FULL_MARKUP  = 0.25;
const TERMS_MARKUP = 0.30;
const CONSULT_FEE  = 49;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id } = await body();
  if (!case_id) return err('case_id is required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  // Verify all 4 quotas are confirmed before proceeding
  const quotasReady = (
    c.itinerary_status   === 'CONFIRMED' &&
    c.transfer_status    === 'CONFIRMED' &&
    c.companion_quote_status === 'CONFIRMED' &&
    c.clinic_quote_status    === 'CONFIRMED'
  );
  if (!quotasReady && !c.all_quotas_confirmed) {
    return err('Not all partner quotas are confirmed yet', 409);
  }

  // Sum all confirmed partner costs
  const treatment = Number(c.treatment_cost || 0) + Number(c.clinic_cost || 0);
  const flights   = Number(c.flight_cost || 0);
  const hotel     = Number(c.hotel_cost || 0);
  const driver    = Number(c.pickup_cost || 0) + Number(c.dropoff_cost || 0) + Number(c.local_transfer_cost || 0);
  const companion = Number(c.companion_cost || 0);

  const baseCost = treatment + flights + hotel + driver + companion;

  // Apply consultation fee credit — patient already paid $49
  const adjustedBase = Math.max(baseCost - CONSULT_FEE, 0);

  const packagePriceFull        = parseFloat((adjustedBase * (1 + FULL_MARKUP)).toFixed(2));
  const packagePriceTerms       = parseFloat((adjustedBase * (1 + TERMS_MARKUP)).toFixed(2));
  const packagePriceFirstInstall = parseFloat((packagePriceTerms * 0.50).toFixed(2));

  const now = new Date().toISOString();

  // Store calculated prices on CaseRecord
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    base_cost:                    baseCost,
    all_quotas_confirmed:         true,
    package_price_full:           packagePriceFull,
    package_price_terms:          packagePriceTerms,
    package_price_first_installment: packagePriceFirstInstall,
    status:                       'Proposal-Sent',
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'package_price_calculated', actor_id: 'system', actor_role: 'system',
    actor_name: 'Morales Pricing Engine', resource_type: 'CaseRecord', resource_id: case_id,
    case_id, sensitive: false, timestamp: now,
    details: {
      base_cost: baseCost, adjusted_base: adjustedBase, consult_credit: CONSULT_FEE,
      package_price_full: packagePriceFull, package_price_terms: packagePriceTerms,
      first_installment: packagePriceFirstInstall,
    },
  });

  // Auto-fire Pay Now email
  await base44.asServiceRole.functions?.invoke?.('sendPayNowEmail', { case_id }).catch(() => {});

  return ok({
    case_id,
    base_cost:         baseCost,
    consult_credit:    CONSULT_FEE,
    adjusted_base:     adjustedBase,
    package_price_full:    packagePriceFull,
    package_price_terms:   packagePriceTerms,
    first_installment:     packagePriceFirstInstall,
    breakdown: { treatment, flights, hotel, driver, companion },
  });
}, { name: 'calculatePackagePrice', requireAuth: false }));
