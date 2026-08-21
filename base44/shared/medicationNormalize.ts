// medicationNormalize.ts — the one LLM call that turns a patient's or
// doctor's own free-text medication mention into structured fields.
//
// This is normalization of the SOURCE TEXT only — never a lookup against a
// real drug database (none exists in this app; rxcui always stays blank).
// The model is explicitly instructed to never invent a detail that wasn't
// actually said; an unclear field comes back blank, not guessed. Shared by
// reportMedication (a patient's own chat message) and the intake-seeding
// step in createCaseFromConsultation.ts (Consultation.medication_notes) so
// both sources go through the identical, single normalization path.

import { sanitizePromptInput } from './sanitizePromptInput.ts';

export interface NormalizedMedication {
  normalized_name: string;
  brand_name: string;
  generic_name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  indication: string;
  confidence: number;
}

const EMPTY: NormalizedMedication = {
  normalized_name: '', brand_name: '', generic_name: '', strength: '',
  dosage: '', route: '', frequency: '', indication: '', confidence: 0,
};

const PROMPT = `A patient (or their doctor, on their behalf) described a medication in their own words. Extract only what was actually stated — never invent a detail that wasn't said. Leave a field as an empty string if it wasn't mentioned or isn't clear.

Fields:
- normalized_name: the medication's own name as stated (cleaned of typos/casing only, never substituted for a different drug).
- brand_name / generic_name: only if clearly identifiable as one or the other from what was said; otherwise leave blank.
- strength: e.g. "500mg", only if stated.
- dosage: how much is taken per dose, if different from strength (e.g. "2 tablets").
- route: e.g. "oral", "topical", only if stated or obvious from the medication itself.
- frequency: e.g. "twice daily", "every 8 hours", only if stated.
- indication: the reason/condition mentioned, if any.
- confidence: 0-100, your own honest confidence that normalized_name is a real, correctly-identified medication name (not a typo you're guessing at, not an ambiguous partial word).

Return ONLY valid JSON, no markdown fences.`;

export async function normalizeMedicationText(base44: any, rawText: string): Promise<NormalizedMedication> {
  const safeText = sanitizePromptInput(rawText, 1000).text;
  if (!safeText.trim()) return { ...EMPTY };

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${PROMPT}\n\nText: ${safeText}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          normalized_name: { type: 'string' },
          brand_name: { type: 'string' },
          generic_name: { type: 'string' },
          strength: { type: 'string' },
          dosage: { type: 'string' },
          route: { type: 'string' },
          frequency: { type: 'string' },
          indication: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['normalized_name', 'confidence'],
      },
    });
    if (result && typeof result === 'object') {
      const r = result as Record<string, unknown>;
      return {
        normalized_name: typeof r.normalized_name === 'string' ? r.normalized_name.slice(0, 200) : '',
        brand_name: typeof r.brand_name === 'string' ? r.brand_name.slice(0, 200) : '',
        generic_name: typeof r.generic_name === 'string' ? r.generic_name.slice(0, 200) : '',
        strength: typeof r.strength === 'string' ? r.strength.slice(0, 100) : '',
        dosage: typeof r.dosage === 'string' ? r.dosage.slice(0, 200) : '',
        route: typeof r.route === 'string' ? r.route.slice(0, 100) : '',
        frequency: typeof r.frequency === 'string' ? r.frequency.slice(0, 200) : '',
        indication: typeof r.indication === 'string' ? r.indication.slice(0, 300) : '',
        confidence: Number.isFinite(Number(r.confidence)) ? Math.max(0, Math.min(100, Number(r.confidence))) : 0,
      };
    }
  } catch (_) {
    // LLM unavailable — return an honest empty extraction rather than block
    // the caller. A blank normalized_name will fail the caller's own
    // "did we actually get a name" check.
  }
  return { ...EMPTY };
}
