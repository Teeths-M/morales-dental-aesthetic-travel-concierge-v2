import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

async function aiNudgeBody(params: {
  name: string; procedure: string; destination: string; remaining: string[];
}): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  const modules = params.remaining.map(m => m.replace(/_/g, ' ')).join(', ');
  const prompt = `Morales Medical Travel concierge. Write a warm 3-sentence nudge email body (no greeting, no sign-off) for ${params.name}, who is preparing for ${params.procedure || 'their procedure'} in ${params.destination || 'their destination'}. They still need to complete: ${modules}. Explain briefly WHY each module matters for their specific journey. Plain text only.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';
    // BUG-R12-02 FIX: unbounded filter — limit to prevent OOM on large user bases
    const incomplete = await base44.asServiceRole.entities.OnboardingProgress.filter(
      { onboarding_completed: false },
      'last_nudge_sent_at',
      200
    );

    let nudged = 0;
    for (const prog of incomplete) {
      const prefs = prog.nudge_preferences || {};
      if (!prefs.email) continue;

      const freq = prefs.frequency || 'milestone_only';
      const lastNudge = prog.last_nudge_sent_at ? new Date(prog.last_nudge_sent_at) : null;
      const now = new Date();

      let shouldSend = false;
      if (freq === 'daily') shouldSend = !lastNudge || (now - lastNudge) > 23 * 60 * 60 * 1000;
      else if (freq === 'weekly') shouldSend = !lastNudge || (now - lastNudge) > 6 * 24 * 60 * 60 * 1000;
      else shouldSend = !lastNudge; // milestone_only — first nudge only

      if (!shouldSend) continue;

      const completed = prog.modules_completed || [];
      const remaining = ['welcome', 'emergency_crash_course', 'preflight_sim', 'nudge_setup'].filter(m => !completed.includes(m));
      if (remaining.length === 0) continue;

      // Fetch user's case to personalize the nudge with their specific procedure and destination
      const userCases = await base44.asServiceRole.entities.CaseRecord.filter(
        { client_email: prog.user_email }, '-created_date', 1
      ).catch(() => []);
      const userCase = (userCases as Record<string, unknown>[])[0] || null;
      const userName = String(prog.user_email).split('@')[0];
      const aiBody = await aiNudgeBody({
        name: userName,
        procedure: String(userCase?.procedure_type || userCase?.treatment_plan || 'your procedure'),
        destination: String(userCase?.procedure_country || userCase?.destination_city || 'your destination'),
        remaining,
      });
      const emailBody = aiBody
        ? `Hi ${userName},\n\n${aiBody}\n\nComplete them here: ${appUrl}/onboarding\n\nBest regards,\nMorales Medical Team`
        : `Hi ${userName},\n\nYou have ${remaining.length} education module(s) left to complete before your journey:\n${remaining.map(m => `• ${m.replace(/_/g, ' ')}`).join('\n')}\n\nComplete them here: ${appUrl}/onboarding\n\nBest regards,\nMorales Medical Team`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: prog.user_email,
        subject: `🎓 Complete your pre-journey training — ${remaining.length} module(s) remaining`,
        body: emailBody,
      });

      await base44.asServiceRole.entities.OnboardingProgress.update(prog.id, {
        last_nudge_sent_at: now.toISOString()
      });

      nudged++;
    }

    return Response.json({ success: true, nudged });
  } catch (error) {
    // BUG-R12-01 FIX: SEC-10
    console.error('[sendOnboardingNudges]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});