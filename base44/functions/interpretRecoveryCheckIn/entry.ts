import { createHandler, ok } from '../../shared/createHandler.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

Deno.serve(createHandler(async ({ body }) => {
  const { rating, pain_level, concerns, note } = await body<{
    rating?: number; pain_level?: number; concerns?: string[]; note?: string;
  }>();

  if (!ANTHROPIC_KEY) return ok({ patient_message: null });

  const concernsStr = Array.isArray(concerns) && concerns.length
    ? concerns.join(', ')
    : 'none';
  const painDesc = (pain_level ?? 0) >= 7 ? 'high pain' : (pain_level ?? 0) >= 4 ? 'moderate pain' : 'low pain';

  const prompt = `Morales Medical Travel concierge. Patient just submitted their recovery check-in: overall rating ${rating ?? '?'}/5, pain level ${pain_level ?? '?'}/10 (${painDesc}), concerns: ${concernsStr}, patient note: "${note || 'none'}".

Write ONE warm, personalized 2-sentence care response (as Morales concierge, not a doctor). If they have concerns or high pain, be reassuring and specific. If they're doing well, celebrate it warmly. Address their exact situation. Plain text only.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 100, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return ok({ patient_message: null });
    const d = await r.json();
    return ok({ patient_message: d.content?.[0]?.text?.trim() || null });
  } catch { return ok({ patient_message: null }); }
// SECURITY: real Anthropic API call, no cap beyond the generic 60/min
// default. A real patient submits one check-in at a time — tighter budget
// closes the cost-DoS vector without needing a session check.
}, { name: 'interpretRecoveryCheckIn', requireAuth: false, rateLimit: { max: 8, windowSeconds: 300 } }));
