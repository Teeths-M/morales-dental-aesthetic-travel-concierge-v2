import { createHandler, ok, err } from '../../shared/createHandler.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL         = 'claude-haiku-4-5-20251001';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { poi, current_time } = await body<{
    poi?: { name?: string; category?: string; dist?: number; lat?: number; lng?: number };
    current_time?: string;
  }>();

  if (!poi?.category || !poi?.name) return err('poi.name and poi.category are required');

  // ── Fetch patient context ──────────────────────────────────────────────────
  const cases = await base44.asServiceRole.entities.CaseRecord.filter(
    { client_email: user!.email }, '-updated_date', 10
  );

  const activeCase = cases.find((c: Record<string, unknown>) =>
    !['Cancelled', 'Completed'].includes(c.status as string)
  ) ?? cases[0] ?? null;

  let recoveryDay: number | null = null;
  let medSchedule: string | null = null;

  if (activeCase) {
    // Recovery day
    try {
      const sessions = await base44.asServiceRole.entities.RecoverySession.filter({
        case_id: activeCase.id, status: 'active',
      });
      if (sessions[0]?.start_date) {
        const started = new Date(sessions[0].start_date).getTime();
        recoveryDay = Math.floor((Date.now() - started) / 86400000) + 1;
      }
    } catch (_) {}

    // Medication schedule (first 3 meds for brevity)
    if (Array.isArray(activeCase.medication_schedule) && activeCase.medication_schedule.length) {
      medSchedule = (activeCase.medication_schedule as Array<{ name?: string; frequency?: string }>)
        .slice(0, 3)
        .map(m => `${m.name || 'medication'} (${m.frequency || 'as directed'})`)
        .join(', ');
    }
  }

  // ── Build reasoning prompt ─────────────────────────────────────────────────
  const firstName = user!.full_name?.split(' ')[0] || 'the patient';
  const timeStr   = current_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const context = [
    `Patient: ${firstName}`,
    activeCase ? `Procedure: ${activeCase.procedure_type || activeCase.treatment_plan || 'medical procedure'}` : null,
    activeCase ? `Status: ${activeCase.status}` : null,
    recoveryDay  ? `Recovery day: ${recoveryDay}` : null,
    medSchedule  ? `Current medications: ${medSchedule}` : null,
    activeCase?.post_op_instructions_category
      ? `Care category: ${activeCase.post_op_instructions_category}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are M, a medical travel safety concierge AI.
A patient just walked past a nearby place. Decide if this is worth a personalized alert.

Patient context:
${context}

They just passed:
- ${poi.name} (${poi.category}, ${poi.dist}m away)
- Local time: ${timeStr}

Rules:
- Only relevant if the place directly relates to their current medical needs
- If relevant: write exactly ONE warm sentence (max 18 words). Address them by first name. Be specific about why it matters NOW.
- If not relevant: output {"relevant":false}

Output ONLY valid JSON: {"relevant":true,"message":"..."} or {"relevant":false}`;

  // ── Call Claude Haiku ──────────────────────────────────────────────────────
  if (!ANTHROPIC_KEY) {
    return ok({ relevant: true, message: null });
  }

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!aiRes.ok) return ok({ relevant: true, message: null });

  const aiData = await aiRes.json();
  const text   = (aiData.content?.[0]?.text ?? '').trim();

  let parsed: { relevant: boolean; message?: string } = { relevant: true };
  try {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (_) {}

  return ok(parsed);
}, { name: 'analyzeProximityContext', requireAuth: true }));
