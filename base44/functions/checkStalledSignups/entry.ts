import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';

/**
 * checkStalledSignups — one-shot recovery nudge for someone who started
 * signup (patient or partner), gave us a phone or email, then stopped.
 *
 * Same shape as checkAbandonedBookings: deterministic staleness trigger,
 * one-shot flag, link-only body (generic line + a resume link — never the
 * flow name, step, or anything else specific in the message itself; that
 * detail only appears once they're back in the app). No AI: this is
 * intentionally simpler than sendOnboardingNudges' AI-personalized email —
 * that function predates the link-only rule and isn't migrated yet
 * (COMMS redteam invariant only covers the functions already migrated).
 * A brand-new function has no excuse to add a fresh link-only violation,
 * so this one is link-only and fully deterministic from day one — which
 * also means it needs zero AI credits to run.
 *
 * Run every 30 min (Base44 dashboard schedule, same as its siblings —
 * see DEPLOY_CHECKLIST.md's cron section).
 */

const STALE_MS = 30 * 60 * 1000; // 30 minutes since last activity
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const FLOW_RESUME_PATH: Record<string, string> = {
  patient: '/client-signup',
  doctor: '/doctor-signup',
  travel_agency: '/partner-signup/travel-agency',
  taxi_service: '/partner-signup/taxi-service',
  companion: '/companion-signup',
  security_agency: '/security-signup',
};

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

export default createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) {
    return err('Forbidden', 403);
  }

  const now = Date.now();
  const stalled = await base44.asServiceRole.entities.SignupProgress.filter(
    {}, '-last_seen_at', 200,
  ).catch(() => []);

  const nudged: string[] = [];

  for (const p of stalled as any[]) {
    if (p.nudge_sent_at || p.completed_at) continue;
    const lastSeen = p.last_seen_at || p.first_seen_at;
    if (!lastSeen) continue;
    if (now - new Date(lastSeen).getTime() < STALE_MS) continue;

    const resumePath = FLOW_RESUME_PATH[p.flow] || '/partner-signup';
    const resumeUrl = `${APP_URL}${resumePath}`;
    const tasks: Promise<unknown>[] = [];

    if (p.email) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Travel Safety',
        to: p.email,
        subject: 'Pick up where you left off',
        body: linkOnlyEmail({
          title: 'You started something with Morales',
          line: 'You began setting things up but didn’t finish. It only takes a couple of minutes to pick back up right where you stopped.',
          ctaUrl: resumeUrl,
          ctaLabel: 'Continue',
          from: 'checkStalledSignups',
        }),
      }));
    }
    if (p.phone) {
      tasks.push(sendSms(p.phone, linkOnlySms({
        line: 'You started something with Morales but didn’t finish. Pick up right where you left off:',
        url: resumeUrl,
        from: 'checkStalledSignups',
      })));
    }
    tasks.push(base44.asServiceRole.entities.SignupProgress.update(p.id, { nudge_sent_at: new Date().toISOString() }));

    await Promise.allSettled(tasks);
    nudged.push(p.id);
  }

  return ok({ nudged: nudged.length });
}, { name: 'checkStalledSignups', requireAuth: false });
