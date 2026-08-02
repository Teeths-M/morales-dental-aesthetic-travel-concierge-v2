import { createHandler, ok } from '../../shared/createHandler.ts';
import { z, strictObject } from '../../shared/validate.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

const AnalyzeIntakeCombinationSchema = strictObject({
  conditions: z.array(z.string().max(200)).max(50).optional().default([]),
  medications: z.array(z.string().max(200)).max(50).optional().default([]),
  allergies: z.array(z.string().max(200)).max(50).optional().default([]),
});

Deno.serve(createHandler(async ({ body }) => {
  const { conditions, medications, allergies } = await body<{
    conditions?: string[]; medications?: string[]; allergies?: string[];
  }>();

  if (!ANTHROPIC_KEY) return ok({ warning: null, severity: null });

  const conds = (conditions || []).filter(c => c !== 'None' && c !== 'None of the above').join(', ') || 'none';
  const meds  = (medications  || []).filter(m => m !== 'None' && m !== 'None of the above').join(', ') || 'none';
  const allgs = (allergies    || []).filter(a => a !== 'None' && a !== 'None of the above').join(', ') || 'none';

  if (conds === 'none' && meds === 'none' && allgs === 'none') return ok({ warning: null, severity: null });

  const prompt = `Pre-surgical intake analyst for a medical tourism platform. Patient profile: conditions: ${conds}. Current medications: ${meds}. Allergies: ${allgs}.

Identify any clinically significant combination that a surgeon must know about before this patient travels for a procedure. Return JSON only: {"warning":"1 sentence about the specific risk or null if none","severity":"info|caution|important|null"}. Only flag genuinely meaningful combinations (e.g. blood thinners + surgery, diabetes + anesthesia, penicillin + sulfa cross-reactivity). Do not flag routine healthy disclosures. If nothing significant: {"warning":null,"severity":null}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return ok({ warning: null, severity: null });
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').trim().match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    return ok({ warning: parsed?.warning || null, severity: parsed?.severity || null });
  } catch { return ok({ warning: null, severity: null }); }
}, { name: 'analyzeIntakeCombination', requireAuth: false, bodySchema: AnalyzeIntakeCombinationSchema }));
