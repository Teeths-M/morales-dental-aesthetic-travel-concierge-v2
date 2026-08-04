/**
 * calculateDoctorTrustScore
 *
 * Hidden proprietary doctor ranking. Doctors never see this score.
 * Admin uses it for case routing priority. Called:
 *   - By the daily freshness cron (freshness-cron.yml)
 *   - Manually from admin dashboard (pass doctor_id to score just one)
 *
 * Score (0–100):
 *   Confirmation Speed    25 pts   — avg hours to confirm cases (< 4h = 25, each extra hour = -1.5, min 0)
 *   Safety Record         25 pts   — 25 - (sos_events * 8), floor 0
 *   Handshake Rate        25 pts   — % of HS5 (clinic check-in) completed on time × 0.25
 *   Patient Satisfaction  25 pts   — avg RecoverySession.feedback_rating (case-linked) × 5
 *
 * Stored on Doctor entity as trust_score (0–100) + trust_components.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const { doctor_id } = await body();

  async function scoreDoctor(doctorId: string) {
    // Fetch all cases this doctor worked on
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { doctor_selected: doctorId }, '-created_date', 100
    ).catch(() => []);

    if (!cases.length) {
      return { score: 70, components: { note: 'No cases yet — baseline score' }, case_count: 0 };
    }

    // 1. Confirmation speed — from doctor_confirmed_at vs case created_date
    let totalConfirmHours = 0;
    let confirmedCount    = 0;
    for (const c of cases) {
      if (c.doctor_confirmed_at && c.created_date) {
        const hrs = (new Date(c.doctor_confirmed_at).getTime() - new Date(c.created_date).getTime()) / 3_600_000;
        if (hrs > 0 && hrs < 240) { // ignore outliers > 10 days
          totalConfirmHours += hrs;
          confirmedCount++;
        }
      }
    }
    const avgConfirmHours = confirmedCount > 0 ? totalConfirmHours / confirmedCount : 24;
    const speedScore      = Math.max(0, Math.min(25, 25 - Math.max(0, avgConfirmHours - 4) * 1.5));

    // 2. Safety record — count SOS events linked to this doctor's cases
    const caseIds = cases.map(c => c.id);
    let sosCount  = 0;
    try {
      const sosEvents = await base44.asServiceRole.entities.SOSEvent.filter({});
      sosCount = sosEvents.filter((e: any) => caseIds.includes(e.case_id)).length;
    } catch (_) {}
    const safetyScore = Math.max(0, 25 - sosCount * 8);

    // 3. HS5 completion rate — cases where HS5 (clinic arrival) was completed
    const hs5Completed = cases.filter((c: any) => c.handshake_status?.['5'] === true).length;
    const hs5Rate      = cases.length > 0 ? hs5Completed / cases.length : 0;
    const hs5Score     = Math.round(hs5Rate * 25);

    // 4. Patient satisfaction — from RecoverySession.feedback_rating, joined by case_id.
    // No PostSurgeryFeedback entity exists in this schema (the real feedback flow,
    // submitPostSurgeryFeedback, writes feedback_rating/feedback_comment directly onto
    // RecoverySession). feedback_rating is one overall trip rating, not split
    // doctor-vs-companion — an honest proxy, not a precise attribution.
    let feedbackAvg   = 4.2; // default only when literally no rated sessions exist yet
    let feedbackCount = 0;
    try {
      const sessions = await base44.asServiceRole.entities.RecoverySession.filter(
        { case_id: { $in: caseIds } }
      );
      const rated = sessions.filter((s: any) => typeof s.feedback_rating === 'number');
      if (rated.length > 0) {
        feedbackAvg   = rated.reduce((s: number, r: any) => s + r.feedback_rating, 0) / rated.length;
        feedbackCount = rated.length;
      }
    } catch (_) {}
    const satisfactionScore = Math.round(Math.min(5, feedbackAvg) * 5);

    const total = Math.round(speedScore + safetyScore + hs5Score + satisfactionScore);

    return {
      score: Math.min(100, Math.max(0, total)),
      components: {
        confirmation_speed_pts:  Math.round(speedScore),
        safety_record_pts:       safetyScore,
        hs5_completion_pts:      hs5Score,
        patient_satisfaction_pts: satisfactionScore,
        avg_confirm_hours:       Math.round(avgConfirmHours),
        sos_events:              sosCount,
        hs5_rate_pct:            Math.round(hs5Rate * 100),
        feedback_avg:            Math.round(feedbackAvg * 10) / 10,
        feedback_count:          feedbackCount,
      },
      case_count: cases.length,
    };
  }

  // No specific doctor_id → score everyone. This is what a bodyless cron POST
  // (`-d '{}'`) hits, so "score all" is the default, not an opt-in flag.
  if (!doctor_id) {
    const doctors = await base44.asServiceRole.entities.Doctor.filter({}).catch(() => []);
    const updated: string[] = [];
    for (const doctor of doctors) {
      try {
        const result = await scoreDoctor(doctor.id);
        await base44.asServiceRole.entities.Doctor.update(doctor.id, {
          trust_score:            result.score,
          trust_components:       result.components,
          trust_case_count:       result.case_count,
          trust_last_calculated:  new Date().toISOString(),
        });
        updated.push(doctor.id);
      } catch (_) {}
    }
    return ok({ success: true, doctors_updated: updated.length });
  }

  const result = await scoreDoctor(doctor_id);
  await base44.asServiceRole.entities.Doctor.update(doctor_id, {
    trust_score:           result.score,
    trust_components:      result.components,
    trust_case_count:      result.case_count,
    trust_last_calculated: new Date().toISOString(),
  }).catch(() => {});

  return ok({ success: true, doctor_id, ...result });
}, { name: 'calculateDoctorTrustScore', requireAuth: false }));
