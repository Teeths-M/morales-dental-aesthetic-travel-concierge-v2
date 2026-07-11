// ── Shared visa/entry-requirement lookup ──────────────────────────────────────
// Pulls the CURRENT entry requirement for a nationality → destination pair from
// official sources (LLM with internet context, forced to "unknown" when not
// confident). Shared so the on-selection check (getVisaRequirement) and the
// weekly re-check (recheckVisaRequirements) produce identical, in-sync results.
//
// Advisory only — visa data changes and is never used to gate a booking. The
// model must say 'unknown' rather than guess an outdated rule.

export type VisaPolicy = {
  visa_status: 'visa_free' | 'evisa' | 'on_arrival' | 'embassy_required' | 'unknown';
  summary: string;
  medical_notes?: string;
  source_url?: string;
  confidence: number; // 0-100
};

const UNKNOWN: VisaPolicy = {
  visa_status: 'unknown',
  summary: 'We could not confirm the current entry rules automatically. Your coordinator will verify the requirements with you directly.',
  confidence: 0,
};

export async function fetchVisaRequirement(
  base44: any,
  nationality: string,
  destination: string,
): Promise<VisaPolicy> {
  const prompt = `A patient holding a ${nationality} passport is travelling to ${destination} for a medical procedure. Using OFFICIAL government immigration sources only, state the CURRENT entry requirement.

Return JSON:
- visa_status: exactly one of visa_free, evisa, on_arrival, embassy_required, unknown. If you are not certain of the CURRENT rule, use "unknown" — never guess an outdated rule.
- summary: 1-2 plain sentences describing the requirement.
- medical_notes: anything specific to entering with medical purpose (medication import, doctor letters), or omit.
- source_url: the official government source URL you relied on, only if you are confident of its domain, else omit.
- confidence: 0-100 integer reflecting how current and certain this is.

Be conservative. No invented fees, processing times, or URLs.`;

  try {
    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      add_context_from_internet: true,
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          visa_status: { type: 'string', enum: ['visa_free', 'evisa', 'on_arrival', 'embassy_required', 'unknown'] },
          summary: { type: 'string' },
          medical_notes: { type: 'string' },
          source_url: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['visa_status', 'summary', 'confidence'],
      },
    });
    if (!r || typeof r.visa_status !== 'string') return UNKNOWN;
    const confidence = Math.max(0, Math.min(100, Number(r.confidence) || 0));
    // Low confidence is presented as 'unknown' — never a confident-looking guess.
    if (confidence < 60) {
      return { ...UNKNOWN, medical_notes: r.medical_notes, source_url: r.source_url };
    }
    return {
      visa_status: r.visa_status as VisaPolicy['visa_status'],
      summary: r.summary || UNKNOWN.summary,
      medical_notes: r.medical_notes,
      source_url: r.source_url,
      confidence,
    };
  } catch {
    return UNKNOWN;
  }
}
