// ── The traveler's check-in code and duress code ──────────────────────────────
// Phone Lock, part 1 (post-buildathon Day 6). A missed check-in could be marked "I'm safe" three ways: texting SAFE
// from the traveler's own phone, the one-time link in their email, or the in-app button. None of them asked who was
// holding the phone, so a thief could switch the alarm off. Once a traveler sets a 4-digit code, all three need it:
//   - the real code marks them safe, as before;
//   - the duress code looks exactly the same to whoever is watching ("you're marked safe"), but silently raises an
//     alarm: an SOS record, the care team, and the traveler's emergency contact;
//   - no code, a wrong code, or a locked code counts as no answer, so the check-in alarm carries on.
// Fails safe: a traveler who never set a code keeps today's behaviour, so nobody's check-in breaks overnight.
// Codes are stored only as PBKDF2 hashes (CheckInCode, admin-only). Five wrong codes lock it for 30 minutes.

import { MAX_PBKDF2_ITERATIONS } from './pinHashing.ts';
import { emergencyDispatch } from './notify.ts';
import { computePrevHash } from './auditHashChain.ts';
import { reportIncident, generateIncidentCode } from './incidentReporting.ts';
import { sendSms } from './twilioSms.ts';

export const CODE_PATTERN = /^\d{4}$/;
export const MAX_WRONG_TRIES = 5;
export const LOCK_MINUTES = 30;

export type CodeCheck = 'none_set' | 'missing' | 'valid' | 'duress' | 'invalid' | 'locked';

export const isCheckInCode = (v: unknown): v is string => typeof v === 'string' && CODE_PATTERN.test(v);

/** "SAFE 4821", "safe4821", "CHECKIN 4821" -> "4821". Anything else -> null. */
export function codeFromSms(body: string): string | null {
  const m = String(body || '').trim().toUpperCase().match(/^(?:SAFE|CHECKIN)\W*(\d{4})(?!\d)/);
  return m ? m[1] : null;
}

/** True while five wrong codes in a row keep the code locked. */
export function codeLocked(record: any, now: Date = new Date()): boolean {
  return !!record?.locked_until && new Date(record.locked_until).getTime() > now.getTime();
}

const toB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashCheckInCode(code: string, saltB64: string, iterations: number = MAX_PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`mcare-checkin:${code}`), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations }, key, 256);
  return toB64(new Uint8Array(bits));
}

function sameHash(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function findCheckInCode(base44: any, email: string | null | undefined): Promise<any | null> {
  if (!email) return null;
  const rows = await base44.asServiceRole.entities.CheckInCode
    .filter({ user_email: String(email).trim().toLowerCase() }, '-set_at', 1)
    .catch(() => []);
  return rows?.[0] || null;
}

/** Checks a code for a traveler, counting wrong tries. The result decides what the check-in path does. */
export async function checkCheckInCode(base44: any, email: string | null | undefined, code: unknown, now: Date = new Date()): Promise<CodeCheck> {
  const rec = await findCheckInCode(base44, email);
  if (!rec) return 'none_set';
  if (codeLocked(rec, now)) return 'locked';
  if (!isCheckInCode(code)) return 'missing';

  const iterations = Number(rec.iterations) || MAX_PBKDF2_ITERATIONS;
  const [real, duress] = await Promise.all([
    hashCheckInCode(code, rec.code_salt, iterations),
    hashCheckInCode(code, rec.duress_salt, iterations),
  ]);
  const result: CodeCheck = sameHash(real, rec.code_hash) ? 'valid' : sameHash(duress, rec.duress_hash) ? 'duress' : 'invalid';

  if (result === 'invalid') {
    const tries = (Number(rec.failed_attempts) || 0) + 1;
    await base44.asServiceRole.entities.CheckInCode.update(rec.id, {
      failed_attempts: tries,
      locked_until: tries >= MAX_WRONG_TRIES ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : null,
    }).catch(() => {});
  } else if (Number(rec.failed_attempts) > 0 || rec.locked_until) {
    await base44.asServiceRole.entities.CheckInCode.update(rec.id, { failed_attempts: 0, locked_until: null }).catch(() => {});
  }
  return result;
}

/**
 * The duress code was used: raise a real alarm that nobody holding the traveler's phone can see. An SOS record (care
 * team and the family's guardian page, never the traveler's own screens), an email to the care team, a text to the
 * traveler's emergency contact, a critical incident, and an audit entry. No JourneyEvent: that would appear in
 * M-Care's chat on the phone. Never throws; a failure in one channel doesn't stop the others.
 */
export async function raiseDuressAlarm(base44: any, o: { checkIn: any; channel: 'sms' | 'email_link' | 'in_app'; now?: string }): Promise<void> {
  const now = o.now || new Date().toISOString();
  const checkIn = o.checkIn || {};
  const caseRec = checkIn.case_id
    ? await base44.asServiceRole.entities.CaseRecord.get(checkIn.case_id).catch(() => null)
    : null;
  const name = checkIn.user_name || caseRec?.client_name || checkIn.user_email || 'A traveler';
  const firstName = String(name).trim().split(/\s+/)[0] || 'Your traveler';
  const email = checkIn.user_email || caseRec?.client_email || '';

  await base44.asServiceRole.entities.SOSEvent.create({
    case_id: checkIn.case_id || '',
    patient_email: email,
    patient_name: name,
    trigger_type: 'checkin_duress',
    status: 'dispatching',
    escalation_level: 3,
    is_silent: true,
    triggered_at: now,
  }).catch((e: any) => console.error('[checkInCode] duress SOSEvent failed:', e?.message));

  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'M-Care Safety — DURESS',
      to: adminEmail,
      subject: `URGENT: duress code used by ${name}`,
      body: `<p><strong>${name} entered their duress code to answer a safety check-in (${o.channel.replace('_', ' ')}).</strong></p>`
        + `<p>Whoever is holding their phone was told they are marked safe. They may be with someone forcing them to answer. `
        + `Do not contact them through their phone in a way that reveals the alarm.</p>`
        + `<p>Email: ${email || 'unknown'}<br/>Case: ${checkIn.case_id || 'unknown'}<br/>Check-in: ${checkIn.id || 'unknown'}<br/>Time: ${now}</p>`,
    }).catch((e: any) => console.error('[checkInCode] duress admin email failed:', e?.message));
  }

  const contactPhone = caseRec?.emergency_contact_number || '';
  if (contactPhone) {
    await sendSms(contactPhone, emergencyDispatch({
      reason: 'sos_triggered',
      from: 'checkInCode/duress',
      body: `URGENT from M-Care: ${firstName} may be in danger. They signalled for help during a safety check-in. `
        + `Please don't call or text their phone; it may not be safe for them. Our safety team is responding.`,
    })).catch(() => {});
  }

  await Promise.race([
    reportIncident({
      base44,
      incidentCode: generateIncidentCode(),
      severity: 'critical',
      source: 'api',
      feature: 'checkInDuress',
      userEmail: email || null,
      errorMessage: `Duress code used during a safety check-in (${o.channel}); case ${checkIn.case_id || 'unknown'}. Treat as an active emergency.`,
    }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]).catch(() => {});

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'checkin_duress_code_used',
    actor_id: checkIn.user_id || email || 'unknown',
    actor_role: 'traveler',
    actor_name: name,
    actor_email: email,
    resource_type: 'SoloCheckIn',
    resource_id: checkIn.id || '',
    case_id: checkIn.case_id || '',
    details: { channel: o.channel },
    sensitive: true,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch((e: any) => console.error('[checkInCode] duress audit failed:', e?.message));
}
