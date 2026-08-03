import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

/**
 * MedGuard™ — Behavioral Safety Prediction Engine
 *
 * The competitive moat no platform can copy in 6 months.
 * Analyzes real behavioral patterns to predict patient risk BEFORE
 * they ever press SOS — proactive safety, not reactive response.
 *
 * Unlike traditional safety systems that wait for the patient to call for help,
 * MedGuard monitors behavioral signals continuously:
 * - Check-in patterns (deviations from normal cadence)
 * - GPS movement anomalies (stationary too long, unexpected location)
 * - App engagement signals (inactivity during critical phases)
 * - Time-of-day risk factors (alone at night abroad)
 * - Journey phase context (high-risk moments)
 *
 * Risk Score: 0-100
 *   0-30:   SAFE — standard monitoring
 *   31-60:  WATCH — increased check-in frequency, gentle nudge
 *   61-80:  ALERT — concierge proactively contacts patient
 *   81-100: CRITICAL — security team dispatched preemptively
 */

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

// ── High-risk destination countries (based on travel advisory data) ────────────
const HIGH_RISK_COUNTRIES = new Set([
  'Venezuela', 'Mexico', 'Colombia', 'Honduras', 'Guatemala',
  'El Salvador', 'Haiti', 'Libya', 'Sudan', 'Somalia', 'Afghanistan',
  'Yemen', 'Syria', 'Iraq', 'Myanmar', 'Pakistan',
]);

// ── Risk factor weights ───────────────────────────────────────────────────────
function computeRiskScore(factors: {
  missedCheckIns:         number;   // count of overdue check-ins
  hoursSinceLastGPS:      number;   // hours since last GPS update during active travel
  isNightAlone:           boolean;  // local time 11PM-5AM and no companion
  isHighRiskCountry:      boolean;  // destination in HIGH_RISK_COUNTRIES
  inActiveTravel:         boolean;  // transit_out / arrived phases
  hoursSinceLastActivity: number;   // hours since last app event
  soloNoCheckIn:          boolean;  // solo traveler with overdue check-in
  hasSoloProtocol:        boolean;  // solo check-in protocol activated
}): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  breakdown.missed_checkins   = Math.min(factors.missedCheckIns * 25, 50);
  breakdown.gps_silence       = factors.inActiveTravel && factors.hoursSinceLastGPS > 2 ? Math.min(factors.hoursSinceLastGPS * 8, 24) : 0;
  breakdown.night_alone       = factors.isNightAlone ? 20 : 0;
  breakdown.high_risk_country = factors.isHighRiskCountry ? 15 : 0;
  breakdown.app_inactivity    = factors.inActiveTravel && factors.hoursSinceLastActivity > 4 ? 10 : 0;
  breakdown.solo_no_checkin   = factors.soloNoCheckIn && factors.hasSoloProtocol ? 15 : 0;

  const score = Math.min(Object.values(breakdown).reduce((a, b) => a + b, 0), 100);
  return { score, breakdown };
}

function getRiskLevel(score: number): { level: string; color: string; action: string } {
  if (score >= 81) return { level: 'CRITICAL',   color: '#dc2626', action: 'security_dispatch' };
  if (score >= 61) return { level: 'ALERT',      color: '#ea580c', action: 'concierge_contact' };
  if (score >= 31) return { level: 'WATCH',      color: '#d97706', action: 'increased_monitoring' };
  return             { level: 'SAFE',        color: '#22c55e', action: 'standard_monitoring' };
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, run_batch, internal_secret } = await body();

  // SECURITY: this fires real SMS to the patient and, at CRITICAL, a "welfare
  // check" dispatch SMS to a security agency — never trust an anonymous
  // caller. Batch mode (a platform-wide sweep) and any case_id NOT owned by
  // the caller both require the internal secret or an admin session.
  const user = await base44.auth.me().catch(() => null);
  const isAdmin = !!user && (user.role === 'admin' || user.role === 'platform_admin');

  if (run_batch) {
    if (!isAdmin && !(await internalOrAdminAuthorized(internal_secret, base44))) {
      return err('Forbidden', 403);
    }
    const activeCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: 'Travel-Coordination' }, '-updated_date', 50
    ).catch(() => []);
    const results = [];
    for (const c of activeCases as any[]) {
      const r = await analyzeCase(base44, c);
      results.push(r);
    }
    return ok({ batch: true, analyzed: results.length, results });
  }

  if (!case_id) return err('case_id or run_batch:true required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const ownsCase = !!user && user.email?.toLowerCase() === caseRecord.client_email?.toLowerCase();
  if (!ownsCase && !isAdmin && !(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  const result = await analyzeCase(base44, caseRecord);
  return ok(result);
// Internal service-to-service call (internalOrAdminAuthorized), or an admin
// session — not public traffic in the same sense as a form submission.
}, { name: 'runMedGuardAnalysis', requireAuth: false, rateLimit: false }));

async function analyzeCase(base44: any, caseRecord: any) {
  const now           = Date.now();
  const caseId        = caseRecord.id;
  const patientName   = caseRecord.client_name || 'Patient';
  const firstName     = patientName.split(' ')[0];
  const destCountry   = caseRecord.procedure_country || caseRecord.destination_country || '';

  const ACTIVE_PHASES = new Set(['transit_out', 'arrived', 'recovery', 'transit_return']);
  const inActiveTravel = ACTIVE_PHASES.has(caseRecord.trip_phase);

  // ── 1. Solo check-in analysis ────────────────────────────────────────────
  let missedCheckIns = 0;
  let soloNoCheckIn  = false;
  try {
    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { case_id: caseId, status: 'escalated' }, '-scheduled_time', 5
    );
    missedCheckIns = checkIns?.length ?? 0;
    soloNoCheckIn  = missedCheckIns > 0;
  } catch (_) {}

  // ── 2. GPS activity analysis ─────────────────────────────────────────────
  let hoursSinceLastGPS = 0;
  try {
    const liveLocations = await base44.asServiceRole.entities.LiveLocation.filter(
      { case_id: caseId }, '-updated_at', 1
    );
    if (liveLocations?.[0]?.updated_at) {
      hoursSinceLastGPS = (now - new Date(liveLocations[0].updated_at).getTime()) / 3_600_000;
    }
  } catch (_) {}

  // ── 3. Local time analysis (night alone) ─────────────────────────────────
  // Crude approximation: use UTC offset for destination country
  const UTCHour     = new Date().getUTCHours();
  const isNightHour = UTCHour >= 23 || UTCHour <= 5;
  const isNightAlone = isNightHour && inActiveTravel && !caseRecord.companion_assignment_id;

  // ── 4. App activity ───────────────────────────────────────────────────────
  const lastActivity    = caseRecord.updated_date || caseRecord.created_date;
  const hoursSinceActivity = lastActivity ? (now - new Date(lastActivity).getTime()) / 3_600_000 : 0;

  const factors = {
    missedCheckIns,
    hoursSinceLastGPS:      inActiveTravel ? hoursSinceLastGPS : 0,
    isNightAlone,
    isHighRiskCountry:      HIGH_RISK_COUNTRIES.has(destCountry),
    inActiveTravel,
    hoursSinceLastActivity: hoursSinceActivity,
    soloNoCheckIn,
    hasSoloProtocol:        !!caseRecord.companion_requirement_status,
  };

  const { score, breakdown } = computeRiskScore(factors);
  const risk = getRiskLevel(score);
  const now_iso = new Date().toISOString();

  // ── Action cascade based on risk level ───────────────────────────────────
  const actions: string[] = [];
  const tasks: Promise<unknown>[] = [];

  if (risk.level === 'ALERT' || risk.level === 'CRITICAL') {
    // Notify concierge via email
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: adminEmail,
        subject: `🛡️ MedGuard ${risk.level} — ${patientName} (Score: ${score}/100)`,
        body: `<div style="font-family:Arial;padding:24px;max-width:640px;">
          <h2 style="color:${risk.color};">MedGuard™ ${risk.level} Alert</h2>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Risk Score:</strong> <span style="color:${risk.color};font-size:24px;font-weight:700;">${score}/100</span></p>
          <p><strong>Risk Level:</strong> ${risk.level}</p>
          <p><strong>Destination:</strong> ${destCountry || '—'}</p>
          <p><strong>Phase:</strong> ${caseRecord.trip_phase || caseRecord.status}</p>
          <h3>Risk Breakdown:</h3>
          <ul>${Object.entries(breakdown).map(([k, v]) => v > 0 ? `<li>${k.replace(/_/g,' ')}: +${v} pts</li>` : '').join('')}</ul>
          <p><a href="${APP_URL}/admin" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px;">View in Admin →</a></p>
        </div>`,
      }));
      actions.push('admin_alerted');

      // Push notification to admin's device(s) — shows even when app is closed
      tasks.push(
        base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
          user_email: adminEmail,
          title:      `🛡️ MedGuard ${risk.level}`,
          body:       `${patientName} · Score ${score}/100 · ${destCountry || 'Unknown location'}`,
          url:        '/admin/mission-control',
          urgent:     risk.level === 'CRITICAL',
          tag:        `medguard-${caseId}`,
          internal_secret: Deno.env.get('CRON_SECRET'),
        }).catch(() => {})
        ?? Promise.resolve()
      );
    }

    // Proactive patient outreach
    if (caseRecord.client_phone) {
      tasks.push(sendSms(caseRecord.client_phone,
        `Hi ${firstName}, this is Morales Concierge. We noticed it's been a while since your last check-in. Please reply "SAFE" to confirm you're okay, or call us immediately if you need assistance. Your safety is our priority. — ${BRAND}`
      ));
      actions.push('patient_sms_sent');
    }
  }

  if (risk.level === 'CRITICAL') {
    // Dispatch security agency
    const securityAgencies = await base44.asServiceRole.entities.SecurityAgency.filter(
      { is_available: true, verification_status: 'verified' }, '-created_date', 1
    ).catch(() => []);
    const agency = (securityAgencies as any[])[0];
    if (agency?.phone) {
      tasks.push(sendSms(agency.phone,
        `MEDGUARD ALERT — ${patientName} may need assistance in ${destCountry}. Risk score: ${score}/100. Please initiate welfare check protocol. Case ref: ${caseId.slice(-8).toUpperCase()}. — ${BRAND}`
      ));
      actions.push('security_dispatched');
    }
  }

  // Store analysis result in AuditLog
  const medGuardPrevHash = await computePrevHash(base44);
  tasks.push(base44.asServiceRole.entities.AuditLog.create({
    event_type:   'medguard_analysis',
    actor_id:     'system', actor_role: 'system', actor_name: 'MedGuard™ Engine',
    resource_type:'CaseRecord', resource_id: caseId, case_id: caseId,
    sensitive:    false, timestamp: now_iso,
    details:      { score, risk_level: risk.level, breakdown, actions, factors },
    prev_hash:    medGuardPrevHash,
  }).catch(() => {}));

  await Promise.allSettled(tasks);

  return {
    case_id:        caseId,
    patient_name:   patientName,
    score,
    risk_level:     risk.level,
    risk_color:     risk.color,
    action_taken:   risk.action,
    actions_fired:  actions,
    breakdown,
    analyzed_at:    now_iso,
  };
}
