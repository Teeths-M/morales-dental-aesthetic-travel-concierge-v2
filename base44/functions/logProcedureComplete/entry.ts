/**
 * Stage 11 End: Procedure Complete / Move to 7-Day Recovery
 * Called by Doctor Portal. Lifts the notification blackout and
 * transitions the case to RECOVERY_PHASE_7_DAY.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { resolveCaseIdentity } from '../../shared/resolveCaseIdentity.ts';
import { computeProcedureMatch } from '../../shared/procedureMatch.ts';
import { sanitizeFields } from '../../shared/sanitizePromptInput.ts';

const MATCH_NARRATION_MODEL = 'gpt_5_mini';

async function sendSms(to: string, body: string): Promise<void> {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !sid.startsWith('AC')) return;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(e => console.warn('[logProcedureComplete] SMS failed:', e.message));
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const { case_id, token, outcome_notes, procedures_confirmed_by_doctor, doctor_recommended_medications } = body;

    const identity = await resolveCaseIdentity(base44, user, { case_id, token });
    if (!identity.ok) {
      return Response.json({ error: identity.error }, { status: identity.status });
    }
    const { caseRecord, resolvedEmail } = identity;

    if (caseRecord.status !== 'SURGICAL_EXECUTION_WINDOW') {
      return Response.json({
        error: `Case is not in SURGICAL_EXECUTION_WINDOW (current: ${caseRecord.status}). Cannot log procedure complete from this state.`
      }, { status: 409 });
    }

    // ── Deterministic procedure-match verification (decided BEFORE any AI call) ─
    const confirmedProcedures = Array.isArray(procedures_confirmed_by_doctor)
      ? procedures_confirmed_by_doctor.filter((p: unknown) => typeof p === 'string' && p.trim())
      : [];
    const match = computeProcedureMatch(caseRecord.procedures, confirmedProcedures);

    const cleanMeds = Array.isArray(doctor_recommended_medications)
      ? doctor_recommended_medications
          .filter((m: any) => m && typeof m.name === 'string' && m.name.trim())
          .map((m: any) => ({
            name: String(m.name).trim().slice(0, 200),
            dose: String(m.dose || '').trim().slice(0, 100),
            frequency: String(m.frequency || '').trim().slice(0, 100),
            duration: String(m.duration || '').trim().slice(0, 100),
            notes: String(m.notes || '').trim().slice(0, 500),
          }))
      : [];

    // Optional, advisory-only LLM narration of the already-decided match status.
    // Never asked to change or re-derive the status — only to phrase it calmly.
    let matchAiSummary = '';
    try {
      const { clean } = sanitizeFields({
        booked: (caseRecord.procedures || []).join(', '),
        confirmed: confirmedProcedures.join(', '),
      }, 500);
      const narr = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: MATCH_NARRATION_MODEL,
        prompt: `A doctor has confirmed a procedure as complete. A deterministic rules engine has already decided the match status below — you are not deciding anything, only writing one calm, plain-English sentence a coordinator can read at a glance.

Booked procedures: ${clean.booked || '(none recorded)'}
Doctor-confirmed procedures: ${clean.confirmed || '(none recorded)'}
Already-decided status: ${match.status}

Write ONE short sentence narrating this status for a care coordinator. Do not suggest a different status. Do not offer clinical advice.

Return JSON only: { "summary": "one short sentence" }`,
        response_json_schema: {
          type: 'object',
          properties: { summary: { type: 'string' } },
          required: ['summary'],
        },
      });
      matchAiSummary = String(narr?.summary || '');
    } catch (_) { /* narration is optional — the deterministic explanation always stands */ }

    const now = new Date().toISOString();
    const updatedTimeline = [
      ...(caseRecord.timeline_log || []),
      {
        timestamp: now,
        action: 'stage_11_procedure_complete',
        details: `Procedure marked complete by Dr. ${resolvedEmail}. Case transitioning to RECOVERY_PHASE_7_DAY (7-Day Recovery Window). Notification blackout LIFTED.${outcome_notes ? ` Notes: ${outcome_notes}` : ''}`,
        performed_by: resolvedEmail,
        non_repudiable: true,
        outcome_notes: outcome_notes || null
      },
      {
        timestamp: now,
        action: 'stage_11_blackout_lifted',
        details: 'Notification blackout lifted. Automated notifications to Patient, Admin, and Doctor roles will resume. Suppressed notifications in audit log are available for review.',
        performed_by: 'system',
        non_repudiable: true
      }
    ];

    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      status: 'RECOVERY_PHASE_7_DAY',
      notification_blackout_active: false,
      notification_blackout_lifted_at: now,
      procedure_complete_logged_at: now,
      timeline_log: updatedTimeline,
      procedures_confirmed_by_doctor: confirmedProcedures,
      procedure_match_status: match.status,
      procedure_match_explanation: match.explanation,
      procedure_match_ai_summary: matchAiSummary,
      procedure_match_checked_at: now,
      ...(cleanMeds.length > 0 ? {
        doctor_recommended_medications: cleanMeds,
        doctor_recommended_medications_entered_at: now,
      } : {}),
    });

    // Count how many notifications were suppressed during blackout
    const suppressedLogs = await base44.asServiceRole.entities.NotificationLog.filter({
      case_id: caseRecord.id,
      suppression_reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
      replay_status: 'pending'
    });

    // ── Auto-trigger Recovery Mode ────────────────────────────────────────────
    // Programmatically fires the second the clinic checkout handshake completes.
    // Complexity is inferred from case_record or defaults to 'moderate'.
    try {
      const complexity = caseRecord.procedures?.length >= 3 ? 'major'
        : caseRecord.procedures?.length === 2 ? 'moderate' : 'minor';

      const CHECKIN_INTERVALS = { minor: 12, moderate: 8, major: 4 };
      const RECOVERY_DURATION = { minor: 24, moderate: 48, major: 72 };
      const intervalHours = CHECKIN_INTERVALS[complexity];
      const durationHours = RECOVERY_DURATION[complexity];
      const recoveryEnd = new Date(new Date(now).getTime() + durationHours * 3600000);

      const checkins = [];
      let t = new Date(new Date(now).getTime() + intervalHours * 3600000);
      while (t <= recoveryEnd) {
        checkins.push({ scheduled_at: t.toISOString(), completed_at: null, status: 'pending', pain_level: null, notes: null, escalated: false });
        t = new Date(t.getTime() + intervalHours * 3600000);
      }

      await base44.asServiceRole.entities.RecoverySession.create({
        case_id: caseRecord.id,
        patient_email: caseRecord.client_email,
        patient_name: caseRecord.client_name,
        surgery_type: caseRecord.procedures?.[0] || 'Procedure',
        surgery_complexity: complexity,
        recovery_start_at: now,
        recovery_end_at: recoveryEnd.toISOString(),
        is_active: true,
        notification_silencing_active: true,
        checkin_interval_hours: intervalHours,
        checkins,
        total_checkins_scheduled: checkins.length,
        total_checkins_completed: 0,
        escalations: 0,
        family_contacts: [],
      });

      // Re-engage notification blackout for recovery phase
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        notification_blackout_active: true,
        notification_blackout_started_at: now,
      });

      // Notify patient that recovery mode is live
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: caseRecord.client_email,
        subject: '🌿 Recovery Mode Activated — Your Post-Surgery Care Has Begun',
        body: `Dear ${caseRecord.client_name},\n\nYour procedure is complete and Recovery Mode has been automatically activated.\n\n✅ Non-critical notifications have been silenced\n✅ Gentle check-ins scheduled every ${intervalHours} hours\n✅ Emergency SOS remains available at all times\n\nRecovery monitoring ends: ${recoveryEnd.toLocaleDateString()}\n\nRest well. Your care team is watching over you.\n\n— Morales Medical Recovery Team`
      });
    } catch (recoveryErr) {
      console.error('[logProcedureComplete] Recovery auto-trigger failed (non-fatal):', recoveryErr.message);
    }

    // Guardian SMS — procedure confirmed by doctor
    const guardianPhone = caseRecord?.emergency_contact?.phone || caseRecord?.guardian_phone || null;
    if (guardianPhone) {
      sendSms(
        guardianPhone,
        `${caseRecord.client_name}'s procedure is complete. The doctor has confirmed. They are now in recovery and being cared for. — Morales Concierge`
      ).catch(() => {});
    }

    // Auto-send post-op instructions, medication schedule, and the anonymized
    // memory-bank write (non-fatal — none of these can undo the transition above).
    await Promise.allSettled([
      base44.functions.invoke('sendPostOpInstructions', {
        case_id: caseRecord.id,
        outcome_notes: outcome_notes || null,
      }),
      base44.functions.invoke('schedulePostOpMedReminders', {
        case_id: caseRecord.id,
      }),
      base44.functions.invoke('writeOutcomeMemory', {
        case_id: caseRecord.id,
      }),
    ]);

    return Response.json({
      success: true,
      new_status: 'RECOVERY_PHASE_7_DAY',
      blackout_active: false,
      blackout_lifted_at: now,
      procedure_complete_logged_at: now,
      recovery_mode_auto_triggered: true,
      suppressed_notifications_pending: suppressedLogs?.length || 0,
      procedure_match_status: match.status,
      procedure_match_explanation: match.explanation,
      procedure_match_ai_summary: matchAiSummary || null,
      message: `Stage 11 complete. Procedure logged by ${resolvedEmail}. Case moved to 7-Day Recovery. Recovery Mode auto-triggered. ${suppressedLogs?.length || 0} suppressed notifications are in audit log.`
    });

  } catch (error) {
    console.error('[logProcedureComplete]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'logProcedureComplete', requireAuth: false }));
