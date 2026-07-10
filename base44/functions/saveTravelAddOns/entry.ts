import { createHandler } from '../_shared/createHandler.ts';

const ADDON_CATALOG = {
  'origin_transfer': { label: 'Origin Airport Pickup', category: 'transport', price_usd: 75 },
  'destination_transfer': { label: 'Destination Airport Transfer', category: 'transport', price_usd: 60 },
  'round_trip_transfer': { label: 'Round-Trip Airport Transfers', category: 'transport', price_usd: 120 },
  'hotel_3star': { label: 'Hotel — 3-Star (per night)', category: 'accommodation', price_usd: 80 },
  'hotel_4star': { label: 'Hotel — 4-Star (per night)', category: 'accommodation', price_usd: 140 },
  'hotel_5star': { label: 'Hotel — 5-Star Luxury (per night)', category: 'accommodation', price_usd: 280 },
  'companion_basic': { label: 'Companion — Basic Support', category: 'companion', price_usd: 120 },
  'companion_medical': { label: 'Companion — Medical-Trained', category: 'companion', price_usd: 250 },
  'nutrition_standard': { label: 'Nutritional Meal Delivery — Standard', category: 'nutrition', price_usd: 35 },
  'nutrition_medical': { label: 'Nutritional Meal Delivery — Medical Diet', category: 'nutrition', price_usd: 60 },
  'chauffeur_hourly': { label: 'Personal Exploration Chauffeur (per hour)', category: 'transport', price_usd: 45 },
  'interpreter': { label: 'In-Person Interpreter (per day)', category: 'services', price_usd: 95 },
  'sim_card': { label: 'Local SIM Card & Data Plan', category: 'services', price_usd: 25 },
  'travel_insurance': { label: 'Travel Insurance (per trip)', category: 'insurance', price_usd: 85 },
};

const PEACE_OF_MIND_PRICE = 100;

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { case_id, selected_addon_ids, peace_of_mind_bundle, transport_scope, notes_map } = await body();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    const selectedAddons = (selected_addon_ids || []).map(id => ({
      addon_id: id,
      label: ADDON_CATALOG[id]?.label || id,
      category: ADDON_CATALOG[id]?.category || 'other',
      price_usd: ADDON_CATALOG[id]?.price_usd || 0,
      quantity: 1,
      notes: notes_map?.[id] || ''
    }));

    const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price_usd, 0);
    const totalUsd = addonTotal + (peace_of_mind_bundle ? PEACE_OF_MIND_PRICE : 0);

    // Upsert
    const existing = await base44.asServiceRole.entities.TravelAddOn.filter({ case_id });
    let record;
    if (existing.length > 0) {
      record = await base44.asServiceRole.entities.TravelAddOn.update(existing[0].id, {
        selected_addons: selectedAddons,
        peace_of_mind_bundle: !!peace_of_mind_bundle,
        transport_scope: transport_scope || 'none',
        total_addons_usd: totalUsd,
        safe_t_baseline_injected: true,
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      });
    } else {
      record = await base44.asServiceRole.entities.TravelAddOn.create({
        case_id,
        patient_email: user.email,
        patient_name: user.full_name,
        selected_addons: selectedAddons,
        peace_of_mind_bundle: !!peace_of_mind_bundle,
        transport_scope: transport_scope || 'none',
        total_addons_usd: totalUsd,
        safe_t_baseline_injected: true,
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      });
    }

    return Response.json({ record, total_usd: totalUsd, addon_count: selectedAddons.length });
}, { name: 'saveTravelAddOns' }));
