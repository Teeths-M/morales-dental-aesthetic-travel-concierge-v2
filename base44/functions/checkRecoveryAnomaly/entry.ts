import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// ── checkRecoveryAnomaly ──────────────────────────────────────────────────────
// Creates a RecoveryLog + runs rule-based anomaly detection.
// Called by useRecoveryCheckIn after each check-in submission.
// Also called by processTwilioRecovery for SMS-submitted check-ins.
//
// V1 RULES (no LLM — deterministic):
//  ESCALATE:  pain_level >= 7
//  ESCALATE:  wound_status === 'bad'
//  ESCALATE:  mobility <= 2 AND pain_level >= 5
//  WARNING:   wound_status === 'concerning'
//  WARNING:   mobility <= 2
//  WARNING:   appetite <= 2
//  TREND:     pain rising for 2 consecutive days → WARNING (3 days → ESCALATE)
//  TREND:     mobility declining for 2 consecutive days → WARNING
//
// Severity ladder: escalate > warning > none (highest wins)
//
// Notifications:
//  warning  → email doctor
//  escalate → email + SMS doctor, email + SMS patient
//  escalate AND (consecutive_anomaly_days >= 2) → email + SMS emergency contact
//                                                 + suggest hospital visit

// Inline Twilio SMS (same pattern as Tasks 1 & 2)
async function sendSms(to, body) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from) return { ok: false, error: 'twilio_not_configured' };
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const r = await resp.json().catch(() => ({}));
  return resp.ok ? { ok: true, sid: r.sid } : { ok: false, error: r.message };
}

function shortId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// AI layer — reads free-text notes that rule thresholds cannot parse
async function aiInterpretCheckin(params: {
  notes: string; firstName: string; procedure: string;
  recoveryDay: number | null; pain: number; severity: string;
}): Promise<{ patient_msg: string | null; doctor_note: string | null }> {
  if (!ANTHROPIC_KEY || !params.notes?.trim()) return { patient_msg: null, doctor_note: null };
  const prompt = `Medical concierge AI. Patient "${params.firstName}" (${params.procedure || 'procedure'}, recovery day ${params.recoveryDay ?? '?'}) submitted a check-in with pain ${params.pain}/10. Rule engine severity: ${params.severity}.
Patient's free-text note: "${params.notes.slice(0, 400)}"
Output JSON only: {"patient_msg":"<one warm 15-word sentence for patient, or null>","doctor_note":"<one 20-word clinical observation from free text for doctor, or null>"}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 110, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return { patient_msg: null, doctor_note: null };
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').match(/\{[\s\S]*?\}/);
    return m ? JSON.parse(m[0]) : { patient_msg: null, doctor_note: null };
  } catch { return { patient_msg: null, doctor_note: null }; }
}

// ── Rule engine ───────────────────────────────────────────────────────────────
function runRules(current, prevLogs) {
  const { pain_level, mobility, appetite, wound_status } = current;
  const reasons = [];
  let severity = 'none';
  const escalate = (r) => { reasons.push(r); severity = 'escalate'; };
  const warn     = (r) => { reasons.push(r); if (severity !== 'escalate') severity = 'warning'; };

  // Threshold rules
  if (pain_level >= 7)                              escalate(`Pain level ${pain_level}/10 — severe (≥7 threshold)`);
  if (wound_status === 'bad')                       escalate('Wound/incision status reported as BAD');
  if (mobility <= 2 && pain_level >= 5)             escalate(`Low mobility (${mobility}/5) combined with significant pain (${pain_level}/10)`);
  if (wound_status === 'concerning')                warn('Wound/incision status reported as CONCERNING');
  if (mobility <= 2 && severity === 'none')         warn(`Low mobility score: ${mobility}/5`);
  if (appetite <= 2)                                warn(`Low appetite score: ${appetite}/5`);

  // Trend analysis over previous 2 logs
  if (prevLogs.length >= 2) {
    const [p1, p2] = prevLogs; // p1 = most recent before today, p2 = day before that
    // Pain trend (rising)
    if (pain_level > p1.pain_level && p1.pain_level > p2.pain_level) {
      const msg = `Pain rising 3 consecutive days (${p2.pain_level}→${p1.pain_level}→${pain_level})`;
      pain_level >= 6 ? escalate(msg) : warn(msg);
    } else if (pain_level > p1.pain_level) {
      warn(`Pain higher than yesterday (${p1.pain_level}→${pain_level})`);
    }
    // Mobility trend (declining)
    if (mobility < p1.mobility && p1.mobility < p2.mobility) {
      warn(`Mobility declining 3 consecutive days (${p2.mobility}→${p1.mobility}→${mobility})`);
    }
  } else if (prevLogs.length === 1) {
    const [p1] = prevLogs;
    if (pain_level > p1.pain_level)
      warn(`Pain higher than yesterday (${p1.pain_level}→${pain_level})`);
  }

  return { severity, reasons };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Allow patient self-submission or scheduler/admin
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      session_id, trip_id, case_id,
      pain_level, mobility, appetite, wound_status, notes,
      submitted_via = 'app', offline_packet_id,
    } = await req.json();

    if (!session_id || pain_level == null) {
      return Response.json({ error: 'session_id and pain_level required' }, { status: 400 });
    }

    const session = await base44.asServiceRole.entities.RecoverySession.get(session_id);
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

    const logDate  = today();
    const logId    = `RLG_${shortId()}`;
    const nowIso   = new Date().toISOString();

    // Idempotency: one log per patient per date
    const existingToday = await base44.asServiceRole.entities.RecoveryLog.filter({
      session_id, date: logDate,
    }).catch(() => []);
    if (existingToday.length > 0) {
      return Response.json({
        success: false,
        error: 'A check-in for today has already been submitted.',
        existing_log_id: existingToday[0].log_id,
      }, { status: 409 });
    }

    // Load previous 2 logs for trend analysis
    const allLogs = await base44.asServiceRole.entities.RecoveryLog.filter({
      session_id,
    }, '-date', 3).catch(() => []);
    const prevLogs = allLogs.filter(l => l.date < logDate).slice(0, 2);

    // Run anomaly rules
    const { severity, reasons } = runRules(
      { pain_level, mobility: mobility ?? 3, appetite: appetite ?? 3, wound_status: wound_status || 'good' },
      prevLogs
    );

    // Create the RecoveryLog
    const log = await base44.asServiceRole.entities.RecoveryLog.create({
      log_id: logId,
      session_id,
      trip_id:         trip_id || session.case_id || '',
      case_id:         case_id || session.case_id || '',
      patient_id:      user.id,
      patient_email:   user.email || session.patient_email,
      date:            logDate,
      pain_level,
      mobility:        mobility ?? null,
      appetite:        appetite ?? null,
      wound_status:    wound_status || 'good',
      notes:           notes || '',
      submitted_via,
      offline_packet_id: offline_packet_id || null,
      anomaly_checked: true,
      anomaly_severity: severity,
      anomaly_reasons:  reasons,
    });

    // Compute consecutive anomaly days
    const prevAnomalyDay  = session.last_log_date && session.anomaly_status !== 'none';
    const newConsecutive  = prevAnomalyDay && session.consecutive_anomaly_days > 0
      ? session.consecutive_anomaly_days + (severity !== 'none' ? 1 : 0)
      : (severity !== 'none' ? 1 : 0);

    // Update session
    await base44.asServiceRole.entities.RecoverySession.update(session_id, {
      anomaly_status:           severity,
      consecutive_anomaly_days: newConsecutive,
      last_log_date:            logDate,
      ...(severity !== 'none' ? { last_anomaly_at: nowIso } : {}),
    });

    // AI agentic layer — reads free-text notes, personalizes patient and doctor messages
    const recoveryDay = session.start_date
      ? Math.floor((Date.now() - new Date(session.start_date).getTime()) / 86400000) + 1 : null;
    const caseForProc = session.case_id
      ? await base44.asServiceRole.entities.CaseRecord.get(session.case_id).catch(() => null) : null;
    const ai = await aiInterpretCheckin({
      notes: notes || '',
      firstName: (session.patient_name || user.email).split(' ')[0],
      procedure: String((caseForProc as Record<string, unknown>)?.procedure_type || (caseForProc as Record<string, unknown>)?.treatment_plan || ''),
      recoveryDay,
      pain: pain_level,
      severity,
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const docEmail   = session.doctor_email   || adminEmail;
    const docPhone   = session.doctor_phone   || '';
    const pName      = session.patient_name   || user.email;
    const pEmail     = session.patient_email  || user.email;
    const pPhone     = user.phone             || '';
    const ecName     = session.emergency_contact_name  || 'Emergency Contact';
    const ecPhone    = session.emergency_contact_phone || '';
    const ecEmail    = session.emergency_contact_email || '';

    // Pause guard: suppress all notifications while the patient's trip is paused.
    // Log is still created and rules run so data stays complete for recalculation.
    const activeTripsPaused = await (async () => {
      try {
        const trips = await base44.asServiceRole.entities.TravelRequest.filter({
          user_email: pEmail, package_status: 'confirmed',
        });
        return (trips || []).some(t => t.paused === true);
      } catch (_) { return false; }
    })();

    if ((severity === 'warning' || severity === 'escalate') && !activeTripsPaused) {
      const reasonSummary = reasons.join('; ');
      const subject = severity === 'escalate'
        ? `🚨 Recovery Alert — ${pName} (ESCALATE)`
        : `⚠️ Recovery Warning — ${pName}`;
      const docBody = `Recovery anomaly detected for patient: ${pName} (${pEmail})\n\nDate: ${logDate}\nPain: ${pain_level}/10  Mobility: ${mobility ?? '?'}/5  Appetite: ${appetite ?? '?'}/5  Wound: ${wound_status || '?'}\nNotes: ${notes || 'None'}\n\nAnomaly reasons:\n${reasons.map(r => `• ${r}`).join('\n')}\n\nSeverity: ${severity.toUpperCase()}\nConsecutive anomaly days: ${newConsecutive}\n\nCase ID: ${session.case_id}${ai?.doctor_note ? `\n\nM AI Insight: ${ai.doctor_note}` : ''}`;

      // Email doctor
      if (docEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Recovery Monitor',
          to: docEmail,
          subject,
          body: `<pre style="font-family:monospace">${docBody}</pre>`,
        }).catch(() => {});
      }

      if (severity === 'escalate') {
        // SMS doctor
        if (docPhone) {
          await sendSms(docPhone, `Morales ESCALATION: ${pName} — ${reasonSummary.slice(0, 120)}. Check dashboard.`).catch(() => {});
        }

        // Email + SMS patient
        if (pEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Recovery Team',
            to: pEmail,
            subject: '⚠️ Your Recovery Check-In — Action Recommended',
            body: `<p>Dear ${pName},</p><p>${ai?.patient_msg || 'Your care team has been notified about your recovery check-in and will contact you shortly.'}</p><p>If you are experiencing a medical emergency, please call your local emergency number immediately or use the SOS button in the Morales app.</p><p>— Morales Recovery Team</p>`,
          }).catch(() => {});
        }
        if (pPhone) {
          await sendSms(pPhone, `Morales: Your care team has been alerted about your recovery check-in. They will contact you shortly. If urgent, call local emergency services.`).catch(() => {});
        }

        // Emergency contact — if 2+ consecutive anomaly days or explicit escalation
        if (newConsecutive >= 2 && (ecPhone || ecEmail)) {
          const ecMsg = `Morales medical alert: ${pName}'s recovery requires attention (${newConsecutive} consecutive concern days). Please check in with them. If urgent, contact local emergency services.`;
          if (ecPhone) await sendSms(ecPhone, ecMsg).catch(() => {});
          if (ecEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Recovery Monitor',
              to: ecEmail,
              subject: `Medical Alert — ${pName}`,
              body: `<p>${ecMsg}</p><p>A hospital visit may be recommended. Their care team is aware and is following up.</p>`,
            }).catch(() => {});
          }
        }
      }

      // AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: `recovery_anomaly_${severity}`,
        resource_type: 'recovery_log',
        resource_id: log.id,
        actor_id: user.id,
        actor_name: pName,
        case_id: session.case_id || '',
        details: { log_date: logDate, severity, reasons, pain_level, mobility, appetite, wound_status },
        sensitive: true,
        timestamp: nowIso,
        prev_hash: await computePrevHash(base44),
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      log_id: logId,
      record_id: log.id,
      date: logDate,
      anomaly_severity: severity,
      anomaly_reasons: reasons,
      consecutive_anomaly_days: newConsecutive,
    });

  } catch (err) {
    console.error('[checkRecoveryAnomaly]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
