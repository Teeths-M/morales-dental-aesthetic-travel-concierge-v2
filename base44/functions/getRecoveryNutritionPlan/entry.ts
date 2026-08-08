// @ts-nocheck
// M-Care's Recovery Nutrition Engine. Given a case_id (preferred — pulls the
// procedure, procedure date, allergies, dietary restrictions, and culture from
// the case + consultation) OR explicit parameters, returns the matching
// ProcedureDietaryProtocol for the patient's CURRENT recovery phase, with the
// recommended foods FILTERED to remove anything that clashes with the patient's
// allergies and dietary restrictions, plus a derived shopping list. M-Care
// presents it as a caring, allergy-safe, culturally-adaptive nutritionist would.

import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Maps Consultation.procedure_interest enum values to the canonical protocol
// category keys used in the ProcedureDietaryProtocol seed data.
const PROC_CATEGORY_MAP: Record<string, string> = {
  dental_implants: 'DENTAL_IMPLANT', all_on_4: 'DENTAL_IMPLANT', porcelain_veneers: 'DENTAL_IMPLANT',
  smile_makeover: 'DENTAL_IMPLANT', bone_regeneration: 'DENTAL_IMPLANT', teeth_whitening: 'DENTAL_IMPLANT',
  rhinoplasty: 'RHINOPLASTY', facelift: 'RHINOPLASTY', brow_lift: 'RHINOPLASTY',
  blepharoplasty: 'RHINOPLASTY', otoplasty: 'RHINOPLASTY',
  breast_surgery: 'BREAST_SURGERY',
  liposuction: 'LIPOSUCTION', tummy_tuck: 'LIPOSUCTION', thigh_arm_lift: 'LIPOSUCTION',
  laser_resurfacing: 'LIPOSUCTION', mole_removal: 'LIPOSUCTION', lipoma_removal: 'LIPOSUCTION',
  gastric_sleeve: 'BARIATRIC_SURGERY', gastric_bypass: 'BARIATRIC_SURGERY', gastric_band_revision: 'BARIATRIC_SURGERY',
  joint_replacement: 'JOINT_REPLACEMENT', spine_surgery: 'JOINT_REPLACEMENT',
  sports_arthroscopy: 'JOINT_REPLACEMENT', fracture_surgery: 'JOINT_REPLACEMENT',
  ivf: 'FERTILITY', egg_freezing: 'FERTILITY',
  oncology_surgery: 'ONCOLOGY', tumor_testing: 'ONCOLOGY',
  gynecological_exams: 'GYNECOLOGICAL',
};

function computePhase(procedureDateISO?: string): string {
  if (!procedureDateISO) return 'DAYS_1_3';
  const start = new Date(procedureDateISO).getTime();
  if (isNaN(start)) return 'DAYS_1_3';
  const days = (Date.now() - start) / (1000 * 60 * 60 * 24);
  if (days < 1) return 'IMMEDIATE_24H';
  if (days < 4) return 'DAYS_1_3';
  if (days < 8) return 'DAYS_4_7';
  if (days < 29) return 'WEEKS_2_4';
  return 'MONTHS_2_3';
}

// Returns the allergen/restriction a food clashes with, or null if it's safe.
function foodClashes(food: any, allergies: string[], restrictions: string[]): string | null {
  const name = String(food?.food_name || '').toLowerCase();
  if (!name) return null;
  const al = (allergies || []).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
  for (const a of al) {
    if (a.includes('nut') && /nut|almond|walnut|cashew|pecan|peanut|hazelnut|pistachio|macadamia|praline/.test(name)) return a;
    if ((a.includes('dairy') || a.includes('lactose') || a.includes('milk')) && /yogurt|yoghurt|milk|cheese|cream|whey|custard/.test(name)) return a;
    if (a.includes('egg') && /egg/.test(name)) return a;
    if (a.includes('soy') && /soy|tofu|edamame|tempeh/.test(name)) return a;
    if ((a.includes('gluten') || a.includes('celiac')) && /wheat|barley|rye|oat|bread|pasta|flour|noodle|couscous/.test(name)) return a;
    if (a.includes('fish') && /fish|salmon|tuna|sardine|tilapia|cod/.test(name)) return a;
    if (a.includes('shell') && /shrimp|prawn|crab|lobster|shellfish|mussel|clam|oyster/.test(name)) return a;
    if (a.includes('sesame') && /sesame|tahini/.test(name)) return a;
  }
  const r = (restrictions || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean);
  for (const x of r) {
    if ((x === 'vegetarian' || x === 'vegan') && /chicken|beef|pork|meat|bacon|ham|fish|salmon|tuna|broth|gelatin|collagen/.test(name)) return x;
    if (x === 'vegan' && /yogurt|yoghurt|egg|milk|cheese|cream|honey|butter|whey/.test(name)) return x;
    if (x === 'halal' && /pork|bacon|ham|alcohol|wine|beer|rum|gelatin/.test(name)) return x;
    if (x === 'kosher' && /pork|bacon|ham|shellfish|shrimp|crab|lobster/.test(name)) return x;
  }
  return null;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    case_id, procedure_category, procedure_sub_type, recovery_phase,
    allergies, dietary_restrictions, culture,
  } = await body();

  let procCat = procedure_category;
  const procSub = procedure_sub_type;
  let phase = recovery_phase;
  let al: string[] = Array.isArray(allergies) ? allergies : [];
  let dr: string[] = Array.isArray(dietary_restrictions) ? dietary_restrictions : [];
  let cult = culture || null;
  let procedureDate: string | null = null;
  let caseRef: any = null;
  let procedureName: string | null = null;

  if (case_id) {
    let caseRecord: any = null;
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id); } catch (_) { caseRecord = null; }
    if (!caseRecord) return err('Case not found', 404);

    const isOwner = caseRecord.client_email && user.email && caseRecord.client_email.toLowerCase() === user.email.toLowerCase();
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    if (!isOwner && !isAdmin) return err('You can only view a nutrition plan for your own case.', 403);

    caseRef = { id: caseRecord.id, status: caseRecord.status };
    procedureName = (caseRecord.procedures || [])[0] || null;
    procedureDate = caseRecord.procedure_date || null;

    try {
      const consults = await base44.asServiceRole.entities.Consultation.filter(
        { email: caseRecord.client_email }, '-created_date', 3
      );
      const con = consults?.[0];
      if (con) {
        if (!procCat) procCat = PROC_CATEGORY_MAP[con.procedure_interest] || con.procedure_interest || procedureName;
        if (!procedureName) procedureName = con.procedure_interest || null;
        if (al.length === 0) {
          al = [
            ...(Array.isArray(con.allergies) ? con.allergies : []),
            ...(con.has_food_allergies && con.food_allergies_details ? [con.food_allergies_details] : []),
          ];
        }
        if (dr.length === 0 && con.dietary_restrictions && con.dietary_restrictions !== 'none') dr = [con.dietary_restrictions];
        if (!cult) cult = con.nationality || null;
      }
    } catch (_) {}
  }

  if (!procCat) return err('procedure_category (or a case_id with a procedure) is required.', 400);
  if (!phase) phase = computePhase(procedureDate);

  // Exact-match lookup against the canonical category key.
  let protocol: any = null;
  try {
    const query: any = { procedure_category: procCat, recovery_phase: phase, is_active: true };
    if (procSub) query.procedure_sub_type = procSub;
    let rows = await base44.asServiceRole.entities.ProcedureDietaryProtocol.filter(query, 'created_date', 5);
    if (!rows || rows.length === 0) {
      // fall back to category + phase ignoring sub-type
      rows = await base44.asServiceRole.entities.ProcedureDietaryProtocol.filter(
        { procedure_category: procCat, recovery_phase: phase, is_active: true }, 'created_date', 5
      );
    }
    protocol = rows?.[0] || null;
  } catch (_) { protocol = null; }

  if (!protocol) {
    return ok({
      found: false,
      procedure_category: procCat,
      recovery_phase: phase,
      message:
        "No specific dietary protocol is on file for this procedure and recovery phase yet. I'll give general guidance: prioritize hydration (2-3 liters daily), high-quality protein at every meal to support tissue repair, and soft, easy-to-digest textures. Avoid alcohol and anything that clashes with your allergies. Your clinician should specify the detailed plan.",
      disclaimer:
        "M-Care is not a dietitian. Always confirm any recovery diet with the patient's clinician before changing what they eat.",
    });
  }

  // Adapt recommended foods to the patient's allergies + dietary restrictions.
  const removed: any[] = [];
  const adapted = (protocol.recommended_foods || [])
    .map((f: any) => {
      const clash = foodClashes(f, al, dr);
      if (clash) { removed.push({ food_name: f.food_name, reason: `clashes with ${clash}` }); return null; }
      return f;
    })
    .filter(Boolean);

  // Cultural adaptations — prefer the patient's culture, fall back to all.
  let cultural = protocol.cultural_adaptations || [];
  if (cult && Array.isArray(cultural) && cultural.length > 0) {
    const key = String(cult).toLowerCase().slice(0, 4);
    const matched = cultural.filter((c: any) => String(c.culture || c.region || '').toLowerCase().includes(key));
    if (matched.length > 0) cultural = matched;
  }

  const shopping = adapted.map((f: any) => ({
    food_name: f.food_name,
    frequency: f.frequency || 'as tolerated',
    note: f.preparation_notes || '',
  }));

  return ok({
    found: true,
    case: caseRef,
    procedure: procedureName,
    procedure_category: protocol.procedure_category,
    procedure_sub_type: protocol.procedure_sub_type || null,
    recovery_phase: protocol.recovery_phase,
    dietary_texture: protocol.dietary_texture,
    recommended_foods: adapted,
    foods_removed_for_safety: removed,
    foods_to_avoid: protocol.foods_to_avoid || [],
    hydration_protocol: protocol.hydration_protocol || null,
    supplement_recommendations: protocol.supplement_recommendations || null,
    cultural_adaptations: cultural,
    shopping_list: shopping,
    allergies_considered: al,
    dietary_restrictions_considered: dr,
    culture_considered: cult,
    disclaimer:
      "M-Care is not a dietitian. Always confirm any recovery diet with the patient's clinician before changing what they eat.",
  });
}, { name: 'getRecoveryNutritionPlan' }));