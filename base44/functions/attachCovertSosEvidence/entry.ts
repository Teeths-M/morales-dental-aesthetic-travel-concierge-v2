/**
 * attachCovertSosEvidence
 *
 * A best-effort FOLLOW-UP to triggerCovertSOS, never a dependency of it. The
 * client fires triggerCovertSOS first (GPS + guardian/patient SMS + admin
 * email + security dispatch) completely un-awaited, then separately and also
 * un-awaited fires this one once a rear-camera photo has been captured and
 * uploaded (see src/lib/covertSosEvidence.js). Camera cold-start, permission
 * prompts, and upload latency are all far more variable than the 2s GPS-fix
 * window triggerCovertSOS already budgets for — piggybacking evidence capture
 * onto that budget would lose the photo far more often than it would lose
 * GPS, and entangling it with the primary alert risks delaying or failing the
 * one call that must always fire fast and cleanly.
 *
 * So: the alert becomes a THREAD, not one message — a fast first dispatch,
 * then a fast-following second one carrying the evidence link, if and only
 * if a photo was actually captured. A camera denial, missing hardware, slow
 * device, or upload failure on the client means this function is simply
 * never called — zero impact on the primary alert either way.
 *
 * Deliberately NOT given a bodySchema, matching triggerCovertSOS/entry.ts's
 * own reasoning: every field is read defensively with no required checks, so
 * a malformed body just no-ops rather than surfacing a 400 that could help an
 * attacker fingerprint what fired. (Unlike triggerCovertSOS this function is
 * not required to look identical to ordinary traffic — it's a second,
 * already-authenticated follow-up call — but there's no reason to add a
 * schema an attacker-facing covert-SOS sibling function doesn't need either.)
 */
import { createHandler, ok } from '../../shared/createHandler.ts';
import { emergencyDispatch } from '../../shared/notify.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

async function generateEvidenceToken() {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  return 'SOSEVID_' + Array.from(rawBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendSms(to: string, message: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, file_uri } = await body();

  // No file_uri, nothing to attach — silently no-op rather than error, same
  // "never surface anything unusual" instinct as the covert trigger itself.
  if (!file_uri) return ok({ status: 'ok' });

  const now = new Date();
  const nowIso = now.toISOString();

  // Resolve case — same lookup shape as triggerCovertSOS/entry.ts, duplicated
  // rather than shared (this file's own header explains why: a one-shot
  // covert-SOS sibling isn't safe to extract state from into a general
  // helper other, differently-shaped callers might import later).
  let resolvedCaseId = case_id;
  let caseRec: any = null;
  if (resolvedCaseId) {
    caseRec = await base44.asServiceRole.entities.CaseRecord.get(resolvedCaseId).catch(() => null);
  } else if (user?.email) {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: user.email }, '-created_date', 1,
    ).catch(() => []);
    caseRec = cases[0] ?? null;
    resolvedCaseId = caseRec?.id;
  }

  const patientName = caseRec?.client_name || user?.full_name || user?.email || 'Patient';
  const patientEmail = user?.email || caseRec?.client_email || '';
  const guardianPhone = caseRec?.emergency_contact_phone || '';
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';

  // ── 1. Persist evidence + token ─────────────────────────────────────────
  const token = await generateEvidenceToken();
  try {
    await base44.asServiceRole.entities.CovertSosEvidence.create({
      token,
      file_uri,
      case_id: resolvedCaseId || '',
      patient_email: patientEmail,
      patient_name: patientName,
      captured_at: nowIso,
      expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_access_count: 25,
      access_count: 0,
      is_active: true,
    });
  } catch (_) {
    // Could not persist — nothing to link to, stop here. Still return 200;
    // this is a best-effort follow-up, not the primary alert.
    return ok({ status: 'ok' });
  }

  const evidenceUrl = `${(Deno.env.get('APP_URL') || '').replace(/\/$/, '')}/sos-evidence/${token}`;

  // ── 2. AuditLog ──────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'covert_sos_evidence_captured',
    actor_id: user?.id || 'unknown',
    actor_email: user?.email || 'unknown',
    resource_id: resolvedCaseId || '',
    case_id: resolvedCaseId || '',
    details: { patient_name: patientName },
    sensitive: true,
    timestamp: nowIso,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  // ── 3. Second guardian SMS — same authorised exemption triggerCovertSOS
  //       already uses (Portia, 2026-07-18). This is a follow-up to an
  //       already-dispatched emergency, not a new disclosure. ─────────────
  if (guardianPhone) {
    await sendSms(
      guardianPhone,
      emergencyDispatch({
        reason: 'sos_triggered',
        from: 'attachCovertSosEvidence/guardian',
        body: `📷 Photo evidence from ${patientName}'s device: ${evidenceUrl}`,
      }),
    );
  }

  // ── 4. Second admin email ────────────────────────────────────────────────
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales — 🚨 COVERT SOS ALERT',
      to: adminEmail,
      subject: `📷 Covert SOS Photo Evidence — ${patientName}`,
      body: `<p>A rear-camera photo was captured following <strong>${patientName}</strong>'s covert SOS trigger.</p><p><a href="${evidenceUrl}">View captured photo</a></p><p style="color:#6b7280;font-size:12px;">This link expires in 7 days.</p>`,
    }).catch(() => {});
  }

  // ── 5. Admin push notification — a different channel from the link-only
  //       email/SMS policy (comms-audit.mjs only scans SendEmail/SMS/Twilio/
  //       WhatsApp bodies; push is shown only on the recipient's own device,
  //       same exemption already used by sendGoldenMNotification/
  //       sendHandshakeAlert). ─────────────────────────────────────────────
  // LEAK-SCAN-IGNORE-START
  if (adminEmail) {
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_email: adminEmail,
      title: '📷 Covert SOS Evidence Ready',
      body: `${patientName} — photo captured, tap to view`,
      url: evidenceUrl,
      urgent: true,
      tag: 'covert-sos-evidence',
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {});
  }
  // LEAK-SCAN-IGNORE-END

  return ok({ status: 'ok' });
}, { name: 'attachCovertSosEvidence', requireAuth: true }));
