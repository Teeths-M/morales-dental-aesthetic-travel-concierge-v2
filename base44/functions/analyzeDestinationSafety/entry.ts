import { createHandler, ok } from '../../shared/createHandler.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

Deno.serve(createHandler(async ({ body }) => {
  const { country, procedure, risk_score } = await body<{
    country?: string; procedure?: string; risk_score?: number;
  }>();

  if (!ANTHROPIC_KEY || !country) return ok({ note: null, time_note: null });

  const proc = procedure || 'medical procedure';
  const riskLevel = (risk_score ?? 35) < 28 ? 'Low' : (risk_score ?? 35) < 52 ? 'Moderate' : (risk_score ?? 35) < 72 ? 'Elevated' : 'High';

  const prompt = `Medical travel safety analyst. Patient is in ${country} (overall risk: ${riskLevel}) for ${proc}.

Generate two procedure-specific safety notes as JSON:
{"note":"2 sentences: what the medical zone is like AND one specific post-${proc} consideration for this country","time_note":"1 sentence: timing/movement advice specific to someone recovering from ${proc}"}

Be specific to ${proc} — not generic travel advice. Focus on real practical concerns for a recovering patient. JSON only.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 160, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return ok({ note: null, time_note: null });
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').trim().match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    return ok({ note: parsed?.note || null, time_note: parsed?.time_note || null });
  } catch { return ok({ note: null, time_note: null }); }
}, { name: 'analyzeDestinationSafety', requireAuth: false }));
