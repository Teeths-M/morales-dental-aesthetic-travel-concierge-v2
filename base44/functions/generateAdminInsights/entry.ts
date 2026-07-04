import { createHandler, ok, err } from '../_shared/createHandler.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

Deno.serve(createHandler(async ({ body }) => {
  const { context, metrics } = await body<{ context?: string; metrics?: Record<string, unknown> }>();

  if (!ANTHROPIC_KEY) return ok({ brief: null });
  if (!metrics) return err('metrics required');

  const metricsStr = Object.entries(metrics)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const prompt = `Morales Medical Travel platform admin analyst. Context: ${context || 'platform dashboard'}. Key metrics: ${metricsStr}.

Write a 2-sentence actionable insight brief for the platform admin. Be specific about what the numbers reveal and name one concrete action to take right now. Plain text only, no bullet points.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 110, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return ok({ brief: null });
    const d = await r.json();
    return ok({ brief: d.content?.[0]?.text?.trim() || null });
  } catch { return ok({ brief: null }); }
}, { name: 'generateAdminInsights', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
