/**
 * Stage 7: Cultural Calibration Engine
 * Generates a Post-Operative Cultural Care Package payload based on
 * patient origin country and procedure type, then persists it to CaseRecord.
 * AI layer: generates individualized care for any nationality (not just Caribbean binary).
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

async function aiCarePackage(caseRecord: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  if (!ANTHROPIC_KEY) return null;
  const origin = String(caseRecord.client_country || 'unknown');
  const procs = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.join(', ') : String(caseRecord.procedures || 'unspecified');
  const dietary = [caseRecord.dietary_restrictions, caseRecord.allergy_types, caseRecord.allergy_free_text].filter(Boolean).join(', ');
  const prompt = `You are the cultural care coordinator for Morales Medical Travel concierge.
Patient origin: ${origin}. Procedures: ${procs}. Dietary/allergies: ${dietary || 'none noted'}. Recovery phase: Post-op days 1–3 (liquid/soft only).

Generate a culturally authentic care package as JSON:
{"language_primary":"...","language_secondary":"... or null","companion_type":"...","cultural_liaison_required":true/false,"routing_instructions":"2-3 sentences on communication style and cultural considerations","diet_phase1":[{"time":"Morning","item":"...","kcal":0,"notes":"..."},{"time":"Noon","item":"...","kcal":0,"notes":"..."},{"time":"Evening","item":"...","kcal":0,"notes":"..."}],"avoid":["..."],"cultural_notes":"1-2 sentences for care team","logistics_notes":"1 sentence"}
Use culturally authentic foods from the patient's origin. Respect religious/cultural dietary laws. JSON only.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const text = (d.content?.[0]?.text || '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

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

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body();

  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
  if (!caseRecord) return err('CaseRecord not found', 404);

  const originCountry = caseRecord.client_country || '';
  const procedureCategory = getProcedureCategory(caseRecord.procedures);

  // AI-first: generates individualized care for any nationality worldwide.
  // Fallback to static Caribbean-focused logic if ANTHROPIC_API_KEY is not set.
  const aiPkg = await aiCarePackage(caseRecord);

  let translationRouting, dietOrder, logisticsNotes;
  if (aiPkg) {
    translationRouting = {
      language_primary: aiPkg.language_primary,
      language_secondary: aiPkg.language_secondary,
      companion_type: aiPkg.companion_type,
      cultural_liaison_required: aiPkg.cultural_liaison_required,
      routing_instructions: aiPkg.routing_instructions,
    };
    dietOrder = {
      phase: 'Phase 1 — Liquid/Soft (Days 1–3 Post-Op)',
      caloric_target_kcal: (aiPkg.diet_phase1 || []).reduce((s: number, m: Record<string, number>) => s + (m.kcal || 0), 0),
      meals: aiPkg.diet_phase1,
      avoid: aiPkg.avoid,
      cultural_notes: aiPkg.cultural_notes,
    };
    logisticsNotes = aiPkg.logistics_notes;
  } else {
    translationRouting = buildTranslationRouting(originCountry, procedureCategory);
    dietOrder = buildDietOrder(originCountry, procedureCategory);
    logisticsNotes = translationRouting.cultural_liaison_required
      ? `CULTURAL LIAISON REQUIRED. Assign Caribbean-familiar companion. Brief hotel kitchen on Caribbean diet substitutions at least 24h before discharge.`
      : `Standard logistics companion. Provide written post-op instructions in patient's language.`;
  }

  const culturalCarePackage = {
    generated_at: new Date().toISOString(),
    origin_country: originCountry,
    procedure_category: procedureCategory,
    translation_routing: translationRouting,
    diet_order: dietOrder,
    logistics_notes: logisticsNotes,
    ai_generated: !!aiPkg,
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

  return ok({
    success: true,
    cultural_care_package: culturalCarePackage,
    message: `Stage 7 complete. Cultural Care Package generated for ${originCountry || 'patient'}.`
  });
}, { name: 'generateCulturalCarePackage', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));