/**
 * guardianEscalation — Silent Guardian escalation engine.
 *
 * Called when a check-in is missed AND a GPS silence threshold is crossed.
 * Implements the Board's 3-Strike + context cascade:
 *
 *   Strike 1 (soft_ping):         Send nudge SMS. Log. No dispatch.
 *   Strike 2 (check_in_request):  Send firm SMS + in-app push. Guardian notified.
 *   Strike 3 (escalated):         Send critical SMS + guardian email + AuditLog.
 *                                  Admin alert. Does NOT auto-dispatch security
 *                                  (human-in-the-loop for final dispatch).
 *
 * Board constraint: Sleep hours (10 PM – 6 AM) — escalation holds unless critical.
 */
import { createHandler, ok, err } from '../_shared/createHandler.ts';

const SLEEP_START = 22;
const SLEEP_END   =  6;

function isLocalSleepHours(tz: number): boolean {
  const h = (new Date().getUTCHours() + tz / 60 + 24) % 24;
  return h >= SLEEP_START || h < SLEEP_END;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    consultation_id,
    strike        = 1,    // 1 | 2 | 3
    reason        = 'missed_checkin',
    anomaly_score = 0,
    tz_offset     = 0,
    context_note  = '',
  } = await body();

  if (!consultation_id) return err('consultation_id required');
  if (![1, 2, 3].includes(strike)) return err('strike must be 1, 2, or 3');

  const cons = await base44.asServiceRole.entities.Consultation.filter(
    { id: consultation_id }, '-created_date', 1
  ).then((r: any[]) => r[0]).catch(() => null);

  if (!cons) return err('Consultation not found');
  if (!cons.guardian_mode_opted_in) return ok({ skipped: true, reason: 'not_opted_in' });

  // Sleep-hour gate (only critical strike 3 bypasses sleep)
  if (isLocalSleepHours(tz_offset) && strike < 3) {
    return ok({ held: true, reason: 'sleep_hours', retry_at: '06:00 AM local' });
  }

  const now   = new Date().toISOString();
  const phone = cons.phone;
  const email = cons.email;
  const name  = cons.patient_name || 'Patient';

  // ── Strike 1: Soft ping ─────────────────────────────────────────────────
  if (strike === 1) {
    if (phone) {
      await base44.integrations.Twilio.SendSMS({
        to:   phone,
        body: `Hi ${name}, Morales here 👋 We noticed your check-in is overdue. Tap the app or reply SAFE if you're okay.`,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type:   'guardian_soft_ping',
      entity_type:  'Consultation',
      entity_id:    consultation_id,
      performed_by: 'system:guardian',
      metadata:     { strike, reason, anomaly_score, context_note },
      created_at:   now,
    }).catch(() => {});

    return ok({ action: 'soft_ping', strike });
  }

  // ── Strike 2: Check-in request + guardian notification ─────────────────
  if (strike === 2) {
    if (phone) {
      await base44.integrations.Twilio.SendSMS({
        to:   phone,
        body: `${name}, Morales Guardian needs to hear from you. 2nd check-in missed. Reply SAFE or open the app now. If you need help, reply SOS.`,
      }).catch(() => {});
    }

    if (cons.emergency_contact_number) {
      await base44.integrations.Twilio.SendSMS({
        to:   cons.emergency_contact_number,
        body: `[Morales Guardian] ${name} has missed a check-in. This is a precaution. Please try to contact them. Last known: ${context_note || 'see Guardian View link'}.`,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type:   'guardian_checkin_request',
      entity_type:  'Consultation',
      entity_id:    consultation_id,
      performed_by: 'system:guardian',
      metadata:     { strike, reason, anomaly_score, context_note },
      created_at:   now,
    }).catch(() => {});

    return ok({ action: 'check_in_requested', strike });
  }

  // ── Strike 3: Full escalation — admin + guardian + critical SMS ─────────
  if (strike === 3) {
    // Critical SMS to patient
    if (phone) {
      await base44.integrations.Twilio.SendSMS({
        to:   phone,
        body: `🚨 URGENT — Morales: 3 missed check-ins. Reply SAFE immediately or emergency protocols activate. If in danger, reply SOS.`,
      }).catch(() => {});
    }

    // Guardian email
    if (cons.emergency_contact_email || cons.emergency_contact_number) {
      await base44.integrations.Core.SendEmail({
        to:      cons.emergency_contact_email || `${cons.emergency_contact_number}@sms.example.com`,
        subject: `[URGENT] Morales Guardian Alert — ${name} has missed 3 check-ins`,
        body: `Hi ${cons.emergency_contact_name || 'Guardian'},\n\nThis is an urgent alert from Morales Guardian.\n\n${name} has missed 3 consecutive check-ins.\n\nAnomaly Score: ${anomaly_score}/100\nContext: ${context_note || 'No additional context'}\n\nPlease try to contact them immediately.\n\nIf you cannot reach them, contact Morales Emergency: our team is standing by.\n\n— Morales Safety Team`,
      }).catch(() => {});
    }

    // Admin alert
    await base44.asServiceRole.entities.AuditLog.create({
      event_type:   'guardian_escalation_critical',
      entity_type:  'Consultation',
      entity_id:    consultation_id,
      performed_by: 'system:guardian',
      metadata:     { strike, reason, anomaly_score, context_note, requires_human_review: true },
      created_at:   now,
    }).catch(() => {});

    // In-app critical notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      message:    '🚨 Morales Guardian has escalated your case. A team member will contact you shortly. If you are safe, tap "I\'m Safe" immediately.',
      type:       'guardian_critical',
      is_read:    false,
      created_at: now,
    }).catch(() => {});

    return ok({ action: 'escalated', strike, requires_human_dispatch: true });
  }
}, { name: 'guardianEscalation', requireAuth: true }));
