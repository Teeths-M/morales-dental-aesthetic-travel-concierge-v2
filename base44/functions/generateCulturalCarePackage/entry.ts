/**
 * Stage 7: Cultural Calibration Engine
 * Generates a Post-Operative Cultural Care Package payload based on
 * patient origin country and procedure type, then persists it to CaseRecord.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Caribbean origin countries that trigger cultural calibration
const CARIBBEAN_ORIGINS = [
  'trinidad and tobago', 'trinidad', 'tobago', 'barbados', 'jamaica',
  'guyana', 'suriname', 'grenada', 'saint lucia', 'st lucia',
  'antigua and barbuda', 'dominica', 'saint vincent', 'st vincent',
  'belize', 'bahamas', 'haiti', 'cuba', 'dominican republic',
  'puerto rico', 'martinique', 'guadeloupe', 'aruba', 'curacao'
];

// Map procedure types to cultural diet categories
function getProcedureCategory(procedures) {
  const flat = (procedures || []).join(' ').toLowerCase();
  if (flat.includes('jaw') || flat.includes('oral') || flat.includes('maxillofacial') || flat.includes('dental')) {
    return 'oral_maxillofacial';
  }
  if (flat.includes('gastric') || flat.includes('bariatric') || flat.includes('tummy') || flat.includes('abdomen')) {
    return 'abdominal';
  }
  if (flat.includes('rhinoplasty') || flat.includes('facelift') || flat.includes('brow')) {
    return 'facial_cosmetic';
  }
  return 'general_surgical';
}

function buildTranslationRouting(originCountry, procedureCategory) {
  const origin = (originCountry || '').toLowerCase();
  const isCaribbean = CARIBBEAN_ORIGINS.some(c => origin.includes(c));
  const isTrinidad = origin.includes('trinidad') || origin.includes('tobago');

  return {
    language_primary: 'English',
    language_secondary: isTrinidad ? 'Trinidadian Creole (Trinidad English)' : isCaribbean ? 'Caribbean Creole English' : null,
    companion_type: isCaribbean ? 'Caribbean Cultural Liaison' : 'Standard Translation Companion',
    cultural_liaison_required: isCaribbean,
    routing_instructions: isCaribbean
      ? `Patient is from ${originCountry}. Assign a cultural liaison familiar with Caribbean English and social norms. ` +
        `Ensure companion can explain post-op instructions in plain Caribbean English, not formal medical jargon. ` +
        `Family communication style is typically group-oriented — include family spokesperson in care briefings where possible. ` +
        `Avoid overly clinical language; use warm, conversational tone.`
      : `Standard translation companion sufficient. Provide written post-op instructions in patient's preferred language.`
  };
}

function buildDietOrder(originCountry, procedureCategory) {
  const origin = (originCountry || '').toLowerCase();
  const isCaribbean = CARIBBEAN_ORIGINS.some(c => origin.includes(c));

  const baseMeals = {
    oral_maxillofacial: [
      { time: 'Morning', item: 'Warm coconut water (fresh, not cold)', kcal: 45, notes: 'Natural electrolytes, gentle on jaw' },
      { time: 'Mid-Morning', item: 'Blended dasheen (taro) porridge with condensed milk', kcal: 210, notes: 'Caribbean staple — high caloric density, smooth texture' },
      { time: 'Noon', item: 'Strained pumpkin and split pea soup (no chunks)', kcal: 180, notes: 'Traditional Caribbean soup base; fortifying and familiar' },
      { time: 'Afternoon', item: 'Soursop (guanábana) blended drink with honey', kcal: 120, notes: 'Anti-inflammatory, culturally preferred over apple juice' },
      { time: 'Evening', item: 'Blended callaloo with coconut milk (strained)', kcal: 160, notes: 'Iron-rich Caribbean green; replace with spinach only if unavailable' },
      { time: 'Night', item: 'Warm golden milk (turmeric, coconut milk, honey)', kcal: 130, notes: 'Anti-inflammatory nightcap; avoid dairy if lactose intolerant' }
    ],
    abdominal: [
      { time: 'Morning', item: 'Coconut water (room temperature)', kcal: 45, notes: 'Rehydration; easier on abdomen than citrus' },
      { time: 'Mid-Morning', item: 'Thin green fig (banana) porridge', kcal: 190, notes: 'Resistant starch; gentle on gut; Caribbean comfort food' },
      { time: 'Noon', item: 'Clear fish broth (seasoned with shadow beni, not chili)', kcal: 80, notes: 'Protein-forward; avoid spicy seasoning initially' },
      { time: 'Evening', item: 'Blended breadfruit puree (thin consistency)', kcal: 170, notes: 'High in complex carbs; cultural staple for recovery strength' }
    ],
    general_surgical: [
      { time: 'Morning', item: 'Warm coconut water', kcal: 45, notes: 'Hydration priority' },
      { time: 'Noon', item: 'Blended pumpkin soup with coconut milk', kcal: 175, notes: 'Caloric density with Caribbean flavor profile' },
      { time: 'Evening', item: 'Soursop or mango blended drink', kcal: 140, notes: 'Vitamin C boost; familiar and comforting' }
    ]
  };

  const meals = isCaribbean
    ? (baseMeals[procedureCategory] || baseMeals.general_surgical)
    : [
        { time: 'Morning', item: 'Clear broth or water', kcal: 20, notes: 'Standard post-op protocol' },
        { time: 'Noon', item: 'Pureed vegetables or yogurt', kcal: 120, notes: 'Standard soft diet' },
        { time: 'Evening', item: 'Protein shake or blended soup', kcal: 160, notes: 'Standard recovery nutrition' }
      ];

  const caloricTarget = meals.reduce((sum, m) => sum + (m.kcal || 0), 0);

  return {
    phase: 'Phase 1 — Liquid/Soft (Days 1–3 Post-Op)',
    caloric_target_kcal: caloricTarget,
    meals,
    avoid: procedureCategory === 'oral_maxillofacial'
      ? ['Cold drinks (causes jaw spasm)', 'Straws (suction pressure)', 'Spicy food', 'Hard or crunchy textures', 'Citrus (acidic irritation on stitches)', 'Hospital-issue powdered broth (low palatability, poor compliance)']
      : ['Spicy food', 'High-fiber raw vegetables', 'Carbonated drinks', 'Alcohol'],
    cultural_notes: isCaribbean
      ? `This diet replaces default hospital broth orders with culturally familiar Caribbean foods. ` +
        `Research shows Caribbean patients have significantly higher dietary compliance when familiar flavors are available. ` +
        `Coordinate with hotel kitchen or designated food liaison to source: dasheen, callaloo, breadfruit, soursop, shadow beni, green fig (unripe banana). ` +
        `All items should be procured fresh where possible. Pre-packaged hospital alternatives are a last resort only.`
      : 'Standard post-operative dietary protocol applied.'
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { case_id } = body;

    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    if (!caseRecord) {
      return Response.json({ error: 'CaseRecord not found' }, { status: 404 });
    }

    const originCountry = caseRecord.client_country || '';
    const procedureCategory = getProcedureCategory(caseRecord.procedures);
    const translationRouting = buildTranslationRouting(originCountry, procedureCategory);
    const dietOrder = buildDietOrder(originCountry, procedureCategory);

    const culturalCarePackage = {
      generated_at: new Date().toISOString(),
      origin_country: originCountry,
      procedure_category: procedureCategory,
      translation_routing: translationRouting,
      diet_order: dietOrder,
      logistics_notes: translationRouting.cultural_liaison_required
        ? `CULTURAL LIAISON REQUIRED. Assign Caribbean-familiar companion. ` +
          `Brief hotel kitchen on Caribbean diet substitutions at least 24h before patient discharge from clinic. ` +
          `Print diet order and translation instructions for both nursing staff and hotel concierge.`
        : `Standard logistics companion. Provide written post-op instructions in patient's language.`
    };

    // Persist to CaseRecord
    const updatedTimeline = [
      ...(caseRecord.timeline_log || []),
      {
        timestamp: new Date().toISOString(),
        action: 'stage_7_cultural_calibration',
        details: `Cultural Care Package generated for ${originCountry} patient — ${procedureCategory} procedure. Diet order: ${dietOrder.caloric_target_kcal} kcal/day target.`,
        performed_by: user.email
      }
    ];

    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      cultural_care_package: culturalCarePackage,
      timeline_log: updatedTimeline
    });

    return Response.json({
      success: true,
      cultural_care_package: culturalCarePackage,
      message: `Stage 7 complete. Cultural Care Package generated for ${originCountry || 'patient'}.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});