import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: prog.user_email,
        subject: `🎓 Complete your pre-journey training — ${remaining.length} module(s) remaining`,
        body: `Hi there,\n\nYou have ${remaining.length} education module(s) left to complete before your journey:\n${remaining.map(m => `• ${m.replace(/_/g, ' ')}`).join('\n')}\n\nComplete them here: ${appUrl}/onboarding\n\nThis takes less than 10 minutes and ensures you're fully prepared for your medical journey.\n\nBest regards,\nMorales Medical Team`
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