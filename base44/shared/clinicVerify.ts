// ── Agentic clinic operating-status check ─────────────────────────────────────
// Verifies whether a clinic is currently operating from official/business/web
// signals, forced to "unknown" when there is no clear evidence. Fail-safe: the
// agent never asserts "operating" on a weak signal — absence of evidence maps to
// 'unknown' (which the booking gate treats as blocked), never to 'operating'.
//
// Same source policy the platform already uses for visa + doctor internet checks
// (LLM with internet context). Costs integration credits per call, so callers
// batch-cap their runs.

export type ClinicVerifyResult = {
  operating: 'operating' | 'closed' | 'unknown';
  confidence: number; // 0-100
  source?: string;
  summary: string;
};

const MIN_CONFIDENCE = 75; // below this we do not assert operating OR closed

export async function verifyClinicOperating(base44: any, clinic: any): Promise<ClinicVerifyResult> {
  const where = [clinic.city, clinic.country].filter(Boolean).join(', ');
  const prompt = `Is the medical/dental clinic "${clinic.name}"${where ? ` in ${where}` : ''} currently open and operating for patients?
Use official registries, the clinic's own website, business/maps listings, and recent signals. If you cannot find clear current evidence that it is operating, answer "unknown" — do NOT guess.
Return JSON:
- operating: exactly one of operating, closed, unknown
- confidence: 0-100 integer
- source: the most authoritative source URL you relied on, or omit
- summary: one plain sentence`;

  try {
    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      add_context_from_internet: true,
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          operating: { type: 'string', enum: ['operating', 'closed', 'unknown'] },
          confidence: { type: 'number' },
          source: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['operating', 'confidence', 'summary'],
      },
    });

    if (!r || typeof r.operating !== 'string') {
      return { operating: 'unknown', confidence: 0, summary: 'Could not verify operating status automatically.' };
    }
    const confidence = Math.max(0, Math.min(100, Number(r.confidence) || 0));
    // Only a confident signal is allowed to assert operating/closed. Everything
    // else degrades to 'unknown' → the gate blocks, a human is asked. Fail-safe.
    if (r.operating !== 'unknown' && confidence < MIN_CONFIDENCE) {
      return { operating: 'unknown', confidence, source: r.source, summary: r.summary || 'Signal too weak to confirm.' };
    }
    return {
      operating: r.operating as ClinicVerifyResult['operating'],
      confidence,
      source: r.source,
      summary: r.summary || '',
    };
  } catch {
    return { operating: 'unknown', confidence: 0, summary: 'Could not verify operating status automatically.' };
  }
}
