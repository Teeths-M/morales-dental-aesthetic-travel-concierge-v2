import { logJourneyEvent } from './logJourneyEvent.ts';

// sendPostOpCheckInNotification — the one real sender for every Day 3/7/14/30
// PostOpCheckIn record. Extracted from schedulePostOpCheckIns/entry.ts, which
// used to run this inline, hardcoded to day 3, and — the real bug — fired it
// synchronously at record-creation time (Handshake 9 / home drop-off) rather
// than at the record's own scheduled_at. That meant the "Day 3" email
// ("You've been home for 3 days...") went out on day 0, and Day 7/14/30 never
// sent at all, since nothing else ever called this block for them.
//
// Now the single sender both schedulePostOpCheckIns (day 3 no longer sends
// inline) and sendDuePostOpCheckIns (the real cron sweep, entry.ts in this
// same functions directory) share — called only once a record's own
// scheduled_at has actually arrived.

export const CHECK_IN_DAYS = [3, 7, 14, 30] as const;

export interface PostOpCheckInDayInfo {
  subject: string;
  question: string;
  // Short, human elapsed-time label for the email heading — "Day 3 — How are
  // you doing?" reads fine, but "Day 7"/"Day 14"/"Day 30" as a heading reads
  // worse than the natural phrasing the existing subject lines already use.
  label: string;
}

export const QUESTIONS: Record<number, PostOpCheckInDayInfo> = {
  3:  { subject: '🌿 Day 3 Recovery Check-In — How are you doing?',          question: "You're 3 days home. How is your recovery going so far?", label: 'Day 3' },
  7:  { subject: '💛 One Week Post-Procedure — Quick Check-In',              question: "It's been one week since your procedure. How are you feeling?", label: 'One Week In' },
  14: { subject: "✨ Two-Week Recovery Milestone — Tell Us How You're Doing", question: 'Two weeks in — are you starting to see and feel the results?', label: 'Two Weeks In' },
  30: { subject: '🏆 One Month Post-Procedure — Your Morales Journey Continues', question: 'One month on — how has your life changed since your procedure?', label: 'One Month In' },
};

export async function sendPostOpCheckInNotification(base44: any, params: {
  record_id: string;
  case_id: string;
  patient_email: string;
  patient_name: string;
  procedure: string;
  day: number;
  response_token: string;
  source: string;
}): Promise<void> {
  const { record_id, case_id, patient_email, patient_name, procedure, day, response_token, source } = params;
  if (!patient_email) return;

  const q = QUESTIONS[day];
  if (!q) return; // defensive — CHECK_IN_DAYS is the only real source of `day` values

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const link = `${appUrl}/recovery-check-in/${response_token}`;
  const GOLD = '#D4AF37';

  const html = `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="background:#0C1A1D;padding:24px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Medical Travel Safety</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Post-Procedure Recovery</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">
    ${q.label} — How are you doing, ${patient_name.split(' ')[0] || 'there'}?
  </h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.6);">
    You've been home for ${day} days since your <strong style="color:#fff;">${procedure}</strong>. Your care doesn't stop at the Golden M — we're with you through every step of recovery.
  </p>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.5);">
    Take 60 seconds to let us know how you're feeling. Your doctor can see your response and will follow up if needed.
  </p>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:700;">
      Share My Recovery Status →
    </a>
  </div>
  <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
    This link is personal to you and expires after submission.<br/>
    No login required. Takes under 60 seconds.
  </p>
</td></tr>
</table></td></tr></table></body></html>`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: 'Morales — Recovery Care',
    to:        patient_email,
    subject:   q.subject,
    body:      html,
  }).catch(() => {});

  // M-Care super-agent Phase 4C: this check-in previously only ever emailed —
  // a real gap, since a patient who doesn't check email promptly had no other
  // signal M-Care was following up. A push alongside the email, M-Care-iconed,
  // closes that without replacing the email (the tokenized link still needs
  // somewhere durable to live).
  base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
    user_email: patient_email,
    title:      '🌿 M-Care checking in',
    body:       q.question,
    url:        `/recovery-check-in/${response_token}`,
    tag:        `recovery-${day}-${case_id}`,
    icon:       '/mcare-logo.png',
    internal_secret: Deno.env.get('CRON_SECRET'),
  }).catch(() => {});

  await base44.asServiceRole.entities.PostOpCheckIn.update(record_id, {
    notification_sent_at: new Date().toISOString(),
  }).catch(() => {});

  // Proactive chat bubble, polled by the frontend (useJourneyEvents). Also
  // fires its own separate push (see logJourneyEvent.ts) — a second,
  // intentional push distinct from the one above, matching this check-in's
  // existing shipped Day-3 behavior unchanged.
  await logJourneyEvent(base44, {
    case_id,
    client_email: patient_email,
    event_type: `recovery_checkin_day${day}`,
    source,
    message_text: `You're ${day} days into recovery — I've sent you a quick check-in so your doctor can see how you're doing. Reply whenever you're ready.`,
    priority: 'medium',
    action_taken: `Sent Day ${day} recovery check-in email and push notification`,
    tool_result: { day },
    user_action_required: true,
  });
}
