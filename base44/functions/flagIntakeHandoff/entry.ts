import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { renderEmail } from '../_shared/emailTemplate.ts';

// ── flagIntakeHandoff ─────────────────────────────────────────────────────
// Fires when the conversational intake (/intake) can't confidently continue
// after repeated low-confidence answers on the same question. Modeled on
// flagProcedureStackingRisk: audit log entry + best-effort review-queue
// record, both non-blocking. Unlike that function, the RELIABLE notification
// path here is the care-team email — it carries the full turn_history and
// answers so a human coordinator can pick up the conversation without the
// client ever repeating anything they've already said.

interface HandoffBody {
  session_id?: string;
  user_email?: string;
  user_name?: string;
  reason?: string;
  turn_history?: Array<{ step_id: string; question_shown: string; user_raw_text: string; timestamp: string }>;
  answers?: Record<string, unknown>;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { session_id, user_email, user_name, reason, turn_history = [], answers = {} } = await body<HandoffBody>();

  if (!user_email) return err('user_email is required');

  const now = new Date().toISOString();

  // ── 1. Mark the session so a returning client resumes into "awaiting human" ──
  if (session_id) {
    await base44.asServiceRole.entities.ConversationSession.update(session_id, {
      status: 'awaiting_human',
      handoff_requested: true,
      handoff_reason: reason || 'Repeated low-confidence answers',
      handoff_requested_at: now,
    }).catch(() => {});
  }

  // ── 2. Audit trail — best-effort, must never block the handoff ───────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'intake_human_escalation',
    actor_role: 'patient',
    actor_email: user_email,
    actor_name: user_name || 'Prospective Patient',
    resource_type: 'ConversationSession',
    resource_id: session_id || 'unknown',
    case_id: '',
    details: { reason, answers, turn_count: turn_history.length },
    sensitive: true,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  // ── 3. Best-effort review-queue record — entity may not exist everywhere ──
  await base44.asServiceRole.entities.DoctorReviewTask.create({
    task_type: 'intake_handoff_review',
    priority: 'high',
    status: 'pending',
    patient_email: user_email,
    patient_name: user_name || null,
    reason_summary: reason || 'Conversational intake needs a human follow-up',
    created_at: now,
    due_by: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).catch(() => {});

  // ── 4. The reliable path — full-context email so nothing is re-asked ─────
  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const answerRows: Array<[string, string]> = Object.entries(answers)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)]);

  const transcriptHtml = turn_history.length
    ? `<div style="margin:22px 0;font-size:13px;color:rgba(238,242,247,0.6);line-height:1.9;">${turn_history
        .map((t) => `<strong style="color:#EEF2F7;">${t.question_shown}</strong><br/>${t.user_raw_text}`)
        .join('<br/><br/>')}</div>`
    : '';

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: Deno.env.get('CARE_TEAM_EMAIL') || 'concierge@morales-dental.com',
    subject: `Intake needs a human follow-up — ${user_name || user_email}`,
    body: renderEmail({
      appUrl,
      eyebrow: 'Conversational Intake — Handoff',
      title: `${user_name || 'A prospective patient'} needs a personal follow-up`,
      intro: reason || 'The concierge assistant was repeatedly unsure it understood an answer correctly and is handing this off rather than guessing.',
      rows: [['Email', user_email], ['Name', user_name || '—'], ...answerRows],
      bodyHtml: transcriptHtml,
      note: 'Please reach out directly — the client should never need to repeat anything already captured above.',
    }),
  }).catch(() => {});

  return ok({ success: true, handed_off_at: now });
}, { name: 'flagIntakeHandoff', requireAuth: false }));
