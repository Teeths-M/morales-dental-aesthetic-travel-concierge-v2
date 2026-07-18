import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Safety/security source invariants ─────────────────────────────────────────
// These guard the properties that CAN'T be cheaply integration-tested (they'd
// need the deployed functions + credits): the ordering and "never writes X"
// guarantees behind the safety-decision and auth fixes. They assert the property
// directly on the source, so a future edit that silently regresses one fails CI.
// Runs with no browser / network / credits, on every change to base44/functions.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('SAFE-T: the deterministic decision is written BEFORE the AI is invoked', () => {
  const src = read('base44/functions/computeSafeTScreening/entry.ts');
  const decisionIdx = src.indexOf("phase: 'decision'");
  const llmIdx = src.indexOf('InvokeLLM');
  expect(decisionIdx, 'decision record write must exist').toBeGreaterThan(-1);
  expect(llmIdx, 'AI narration call must exist').toBeGreaterThan(-1);
  expect(decisionIdx, 'decision must be recorded before the AI runs').toBeLessThan(llmIdx);
});

test('SAFE-T: the client scan fails CLOSED to review, never low', () => {
  const src = read('src/components/booking/SafeTScan.jsx');
  // The error fallback object must route to review, and must not default to low.
  const failClosed = src.slice(src.indexOf('failClosed'), src.indexOf('failClosed') + 200);
  expect(failClosed).toContain("risk_level: 'review'");
  expect(src).not.toContain("risk_level: 'low'"); // no low-risk fallback anywhere
});

test('DOCTOR: analyzeDoctorLicense can never write an AI-verified/cleared status', () => {
  const src = read('base44/functions/analyzeDoctorLicense/entry.ts');
  expect(src).not.toMatch(/verification_status:\s*['"]ai_verified['"]/);
  expect(src).not.toMatch(/license_verified:\s*true/);
});

test('DOCTOR: re-verification uses the real registry adapters (no silent LLM renewal)', () => {
  const src = read('base44/functions/reVerifyDoctorCredentials/entry.ts');
  expect(src).toContain('runLookup');
});

test('AUTH: sendOtp only reveals a demo code behind the OTP_ALLOW_MOCK gate', () => {
  const src = read('base44/functions/sendOtp/entry.ts');
  expect(src).toContain('OTP_ALLOW_MOCK');
  const guardIdx = src.indexOf('!allowMock');
  const demoIdx = src.indexOf('demo_code: code');
  expect(guardIdx, 'fail-closed guard must exist').toBeGreaterThan(-1);
  expect(demoIdx, 'demo code return must exist').toBeGreaterThan(-1);
  expect(guardIdx, 'the guard must precede the demo-code return').toBeLessThan(demoIdx);
});

test('CLINIC: an unknown clinic fails safe to a blocked decision', () => {
  const src = read('base44/functions/checkClinicStatus/entry.ts');
  const idx = src.indexOf('no_clinic_record');
  expect(idx).toBeGreaterThan(-1);
  const around = src.slice(Math.max(0, idx - 400), idx + 100);
  expect(around).toContain("decision: 'blocked'");
});

test('CLINIC: the agent proposes operating for human confirm — it never auto-clears', () => {
  const src = read('base44/functions/verifyClinicStatus/entry.ts');
  expect(src).toContain('agent_proposed_operating');
  // The operating branch must NOT write operating_status: 'operating'.
  expect(src).not.toMatch(/operating_status:\s*['"]operating['"]/);
});

test('PHI: the concierge assistants scrub PHI before the LLM', () => {
  for (const fn of ['moralesAssist', 'safeTAssist']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must scrub PHI`).toContain('scrubPHI');
  }
});

test('VERSIONING: medical overwrites route through reviseAndUpdate', () => {
  for (const fn of ['submitDietaryProfile', 'generateSafeTProfile']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must version its overwrite`).toContain('reviseAndUpdate');
  }
});

// ── Marketplace (competitive doctor quotes) invariants ────────────────────────

test('MARKETPLACE: requestDoctorQuotes fails CLOSED — no doctor contacted unless Safe-T PASSED', () => {
  const src = read('base44/functions/requestDoctorQuotes/entry.ts');
  const gateIdx = src.indexOf("safe_t_result !== 'PASSED'");
  const createIdx = src.indexOf('DoctorQuote.create');
  const emailIdx = src.indexOf('SendEmail');
  expect(gateIdx, 'the PASSED gate must exist').toBeGreaterThan(-1);
  expect(createIdx, 'quote creation must exist').toBeGreaterThan(-1);
  expect(emailIdx, 'an outbound invite must exist').toBeGreaterThan(-1);
  // The gate must precede any quote creation AND any outbound email.
  expect(gateIdx, 'gate must precede quote creation').toBeLessThan(createIdx);
  expect(gateIdx, 'gate must precede outreach').toBeLessThan(emailIdx);
});

test('MARKETPLACE: the doctor invite is LINK-ONLY — no patient identity/procedure/price in the email', () => {
  const src = read('base44/functions/requestDoctorQuotes/entry.ts');
  // The outbound body must be the generic template, keyed only on the portal URL.
  expect(src).toContain('body: inviteEmail(portalUrl)');
  // The template must not interpolate any patient/case data.
  const start = src.indexOf('function inviteEmail');
  const body = src.slice(start, src.indexOf('Deno.serve'));
  for (const leak of ['client_name', 'patient_first_name', 'deidentified_summary', 'procedures', 'total_usd', 'caseRecord']) {
    expect(body, `invite template must not leak ${leak}`).not.toContain(leak);
  }
});

test('MARKETPLACE: submitDoctorQuote requires ownership AND a reviewed-consultation attestation', () => {
  const src = read('base44/functions/submitDoctorQuote/entry.ts');
  expect(src, 'must gate on reviewed_consultation').toContain('reviewed_consultation !== true');
  expect(src, 'must check the caller owns the quote').toContain('quote.doctor_email');
});

test('MARKETPLACE: selectDoctorQuote declines the others and notifies LINK-ONLY', () => {
  const src = read('base44/functions/selectDoctorQuote/entry.ts');
  expect(src).toContain("status: 'chosen'");
  expect(src).toContain("status: 'not_chosen'");
  // Full identity is granted only by assigning the chosen doctor to the case.
  expect(src).toContain('doctor_email: chosen.doctor_email');
  // Notifications use the link-only template.
  expect(src).toContain('linkEmail(');
});

test('MARKETPLACE: remindPendingQuotes is cron/admin guarded and LINK-ONLY', () => {
  const src = read('base44/functions/remindPendingQuotes/entry.ts');
  expect(src, 'the outreach endpoint must be guarded').toContain('cronAuthorized');
  const start = src.indexOf('function reminderEmail');
  const body = src.slice(start, src.indexOf('Deno.serve'));
  for (const leak of ['client_name', 'patient_first_name', 'procedures', 'total_usd', 'deidentified']) {
    expect(body, `reminder must not leak ${leak}`).not.toContain(leak);
  }
});

test('MESSAGING: quote-stage messages are contact-scrubbed; info-requests pause the SLA; Safe-T re-gates', () => {
  const src = read('base44/functions/postCaseMessage/entry.ts');
  expect(src, 'must scrub contact pre-selection').toContain('scrubContact');
  expect(src, 'info_request must pause the SLA').toContain("status: 'needs_more_info'");
  // A patient answer flagged with new medical info re-runs the deterministic Safe-T scan.
  expect(src, 'must re-gate on new medical info').toContain("base44.functions.invoke('safeT4LifeScan'");
  // Outbound is link-only (nudge keyed on the portal URL).
  expect(src, 'outbound must be link-only').toContain('nudgeEmail(portalUrl)');
});

test('PRE-OP: the checklist is conservative — never instructs stopping a medication, always defers', () => {
  const src = read('base44/functions/_shared/preOpChecklist.ts');
  expect(src.toLowerCase(), 'must not instruct discontinuation').not.toMatch(/stop taking|discontinue your/);
  expect(src, 'must explicitly warn against stopping meds unprompted').toContain('Do not stop any medication on your own');
  expect(src, 'medication/fasting items must defer to the doctor').toContain('confirm_with_doctor: true');
});

test('PRE-OP: sendPreOpInstructions is deterministic and LINK-ONLY (clinical content stays in-portal)', () => {
  const src = read('base44/functions/sendPreOpInstructions/entry.ts');
  expect(src, 'must use the deterministic builder').toContain('buildPreOpChecklist');
  expect(src, 'outbound must be link-only').toContain('nudgeEmail(portalUrl)');
  expect(src, 'the checklist is stored in-portal').toContain('pre_op_checklist');
});

test('CANCELLATION: cancelBooking refunds only HELD escrow, never claws back released funds; owner/admin gated', () => {
  const src = read('base44/functions/cancelBooking/entry.ts');
  expect(src, 'refunds held escrow').toContain("h.status === 'held'");
  expect(src, 'marks held as refunded').toContain("status: 'refunded'");
  expect(src, 'released funds are treated as non-refundable, not reversed').toContain("h.status === 'released'");
  // Owner-or-admin gate + guarded cancel transition.
  expect(src, 'owner check').toContain('c.client_email');
  expect(src, 'guarded transition').toContain('guardedStatusUpdate');
  expect(src).toContain('BOOKING.CANCELLED');
});

test('SLOT LOCK: confirmProcedureDate locks the slot, rejects a taken date, owner-gated', () => {
  const src = read('base44/functions/confirmProcedureDate/entry.ts');
  expect(src, 'owner-or-admin gate').toContain('c.doctor_email');
  expect(src, 'rejects a slot locked to another case').toContain('locked_case_id !== case_id');
  expect(src).toMatch(/no longer available|just taken/);
  expect(src, 'locks the slot to this case').toContain('locked_case_id: case_id');
});

test('ITINERARY: the clinic event uses the doctor-confirmed procedure_date when set', () => {
  const src = read('base44/functions/generateItineraryCalendar/entry.ts');
  expect(src).toContain('c.procedure_date');
});

test('COMMS: migrated legacy senders are link-only — nothing private leaves M', () => {
  for (const fn of ['releaseEscrowPayment', 'generateItineraryCalendar', 'processPaymentCascade', 'sendQuoteReminders', 'iq200Pipeline']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} imports the link-only helper`).toContain("from '../_shared/notify.ts'");
    expect(src, `${fn} uses linkOnlyEmail`).toContain('linkOnlyEmail(');
  }
  // The partner-cascade activation email is now link-only (renders no patient name).
  const cascade = read('base44/functions/processPaymentCascade/entry.ts');
  const helper = cascade.slice(cascade.indexOf('function activationEmail'), cascade.indexOf('Deno.serve'));
  expect(helper, 'activation email is link-only').toContain('linkOnlyEmail(');
  expect(helper, 'activation email renders no patient name').not.toContain('e(patientName)');
  // iq200Pipeline's paid-journey emails no longer render the package price or a name.
  const iq = read('base44/functions/iq200Pipeline/entry.ts');
  expect(iq, 'no renderEmail body in iq200Pipeline').not.toContain('body: renderEmail');
});

test('COMMS: the link-only helper enforces the on-platform promise', () => {
  expect(read('base44/functions/_shared/notify.ts')).toContain('nothing private is sent by email');
});

test('STATE MACHINE: a safety hold can never be routine-transitioned out', () => {
  const src = read('base44/functions/_shared/bookingState.ts');
  // Routine path refuses to leave the hold...
  expect(src).toContain('if (from === HOLD_STATE) return false;');
  // ...and ADMIN_REVIEW has no routine outgoing edges (only clearHold may move it).
  expect(src).toMatch(/\[BOOKING\.ADMIN_REVIEW\]:\s*\[\]/);
});

test('SATELLITE: an unverified message may raise alarm but never clear one', () => {
  const src = read('base44/functions/receiveSatelliteWebhook/entry.ts');
  // The webhook must be able to tell a real Rock Seven callback from anyone else.
  expect(src, 'verifies a shared secret').toContain('SATELLITE_WEBHOOK_SECRET');
  expect(src, 'unset secret verifies nothing — never everything').toContain('if (!secret) return false;');
  // De-escalation requires proof; SOS dispatch must NOT be gated on it, because
  // dropping a real SOS is the worse failure.
  expect(src, 'stand-down is gated on verification').toContain('if (verified && caseId)');
  const sosBlock = src.slice(src.indexOf('if (isSOS)'));
  expect(sosBlock, 'SOS dispatch is never gated on verification').not.toContain('if (verified)');
  // A spoofed fix must not become the location a rescue is sent to.
  expect(src, 'authoritative position write is verified-only').toContain('if (verified && caseId && iridium_latitude');
  // Forged stand-down attempts stay provable on the hash chain.
  expect(src, 'verification state is audited').toMatch(/verified,/);
});

test('SATELLITE: check-in status vocabulary matches the SoloCheckIn enum', () => {
  const src = read('base44/functions/receiveSatelliteWebhook/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // 'escalating' / 'safe_confirmed' are not in the enum — using them silently
  // matched nothing, so a real patient's SAFE never halted their escalation.
  // Scoped to `status:` writes — `reason: 'safe_confirmed'` on the satellite
  // MT reply is a different namespace and is fine.
  expect(code, 'no invented filter status').not.toMatch(/status:\s*'escalating'/);
  expect(code, 'no invented write status').not.toMatch(/status:\s*'safe_confirmed'/);
  expect(code, 'writes the canonical acknowledged status').toContain("status:          'acknowledged'");
  const schema = read('base44/entities/SoloCheckIn.jsonc');
  expect(schema, 'satellite is a valid response_method').toContain('"satellite"');
});

test('CRON AUTH: scheduled sweeps are never callable by an anonymous request', () => {
  for (const fn of ['alertStagnantCases', 'autoCompletePatientJourney', 'checkStaleLiveLocations',
                    'detectFallbackCrisis', 'removeDoctorFromProcedures']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code, `${fn} requires cron secret or admin session`).toContain('cronAuthorized(req, base44)');
    // The fail-open shape: a null user skips the check entirely.
    expect(code, `${fn} has no fail-open role check`).not.toMatch(/if \((?:user|callerUser) && \1?\w*\.role !==/);
  }
});

// ─── Go-live P0 guards (2026-07-18 launch audit) ────────────────────────────
// Each of these encodes a defect that was live in the product. They are not
// style rules: every one of them was a claim the UI made that the code did not
// keep, or a safety path that failed silently.

test('VAULT: no plaintext document ever leaves the device', () => {
  const src = read('src/components/vault/VaultUploader.jsx');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  // The OCR path uploaded the raw passport image with Core.UploadFile (public
  // storage) BEFORE encryption, directly under a "never leaves your browser"
  // banner. Only the encrypted UploadPrivateFile path may remain.
  expect(code, 'public UploadFile in the vault uploader').not.toMatch(/Core\.UploadFile\s*\(/);
  expect(code, 'passport OCR extraction re-introduced').not.toContain('extractPassportData');
  expect(code, 'encrypted upload path still present').toContain('UploadPrivateFile');
});

test('VAULT: virus scan status is never asserted without a scanner', () => {
  for (const fn of ['uploadEncryptedPassport', 'uploadToVault']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} claims a scan that never ran`).not.toMatch(/virus_scan_status:\s*'passed'/);
  }
});

test('PIN: no unsalted single-round hash is written or accepted', () => {
  const src = read('src/components/emergency/EmergencyPINSetup.jsx');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // A bare SHA-256 of `pin + ':' + email` over a 6-digit keyspace, always
  // written and accepted as a fallback, made the 600k PBKDF2 decorative.
  expect(code, 'legacy unsalted PIN hash').not.toMatch(/digest\(\s*'SHA-256'\s*,\s*data\s*\)/);
  expect(code, 'PIN hashing goes through the PBKDF2 helper').toContain('generatePINHash');
  // Server must be consulted first whenever we can reach it, or the local
  // hash is an unthrottled offline brute-force oracle on a stolen device.
  // Anchored on the call expressions rather than a comment, so the comment
  // filter above cannot hide the thing being asserted.
  const serverCall = code.indexOf("invoke('verifyEmergencyPIN'");
  const localCall = code.indexOf('await verifyVaultPIN(');
  expect(serverCall, 'server verification call must exist').toBeGreaterThan(-1);
  expect(localCall, 'offline fallback call must exist').toBeGreaterThan(-1);
  expect(serverCall, 'server check must precede the local check').toBeLessThan(localCall);
});

test('PIN: emergency PIN hashing is 600k on the server, both sides', () => {
  for (const fn of ['verifyEmergencyPIN', 'confirmPINReset']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} still hashes at 200k`).not.toContain('iterations: 200000');
    expect(src, `${fn} missing 600k`).toContain('iterations: 600000');
  }
});

test('PIN RESET: the HMAC key is never hardcoded', () => {
  const src = read('base44/functions/requestPINReset/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // A committed fallback key lets anyone forge a reset for any email and take
  // over the emergency vault + SOS console.
  expect(code, 'hardcoded reset secret').not.toMatch(/PIN_RESET_SECRET'\)\s*\|\|/);
  expect(code, 'must fail closed when unset').toContain('if (!RESET_SECRET)');
  expect(code, 'unauthenticated endpoint needs a rate limit').toContain('RateLimitBucket');
});

test('SMS: inbound Twilio signature is built from the form payload', () => {
  const src = read('base44/functions/processSmsShortcode/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // Rebuilding params from the message BODY made the HMAC unmatchable, so
  // every inbound command (HS1-9, CHECKIN, SOS) was rejected 403.
  expect(code, 'signature rebuilt from message text').not.toMatch(/new URLSearchParams\(rawText\)/);
  expect(code, 'signature uses the captured form params').toContain('signatureParams');
});

test('SMS: the documented covert keyword has an inbound handler', () => {
  const src = read('base44/functions/twilioSafetySmsWebhook/entry.ts');
  expect(src, 'MORALESHELP has no server-side handler').toContain('MORALESHELP');
  // Reply must not announce the SOS — the sender may be under observation.
  expect(src).toContain('isCovertKeyword');
});

test('HANDSHAKE: offline confirmations flush on reconnect', () => {
  const layout = read('src/components/layout/AppLayout.jsx');
  expect(layout, 'handshake queue not registered with the sync controller')
    .toMatch(/registerSyncQueue\(\s*'handshake'/);
  const queue = read('src/offline/handshake/offlineHandshakeQueue.js');
  expect(queue, 'no shared flush implementation').toContain('export async function flushHandshakeQueue');
});

test('ESCROW: release is never scheduled with an in-request timer', () => {
  const src = read('base44/functions/completeHandshake/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // A Deno edge isolate does not survive 24h, so setTimeout meant partners
  // were silently never paid.
  expect(code, 'setTimeout used to schedule escrow release').not.toMatch(/setTimeout\([^)]*\n?[^)]*24 \* 60 \* 60/);
  expect(code, 'release still dispatched').toContain('releaseEscrowPayment');
});

test('SOS: the patient confirmation SMS does not go through the admin composer', () => {
  const src = read('base44/functions/triggerSOS/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // sendSmsNotification requires {to,type} AND an admin session; an SOS has
  // neither, so the send 400'd into a bare catch and the patient heard nothing.
  expect(code, 'SOS routed through the admin-only composer').not.toContain("invoke('sendSmsNotification'");
  expect(code, 'failures must be recorded, never silent').toContain('patient_sms_failed');
});

test('CLAIMS: Arabic is not offered until RTL exists', () => {
  const src = read('src/i18n.js');
  const listStart = src.indexOf('SUPPORTED_LANGUAGES = [');
  const list = src.slice(listStart, src.indexOf('];', listStart));
  // ~578 physical-direction utilities and zero logical properties: selecting
  // Arabic sets dir=rtl while every offset stays LTR.
  expect(list, 'Arabic offered without an RTL implementation').not.toContain("code: 'ar'");
  expect(src, 'language selection must be gated on what we offer').toContain('isOffered');
});

test('CLAIMS: the Situation Room does not present sample data as live', () => {
  const src = read('src/pages/SituationRoom.jsx');
  // The feed is a hardcoded array in every mode and map pins are country
  // centroids, not tracked positions.
  expect(src, 'sample feed still labelled LIVE').not.toContain('LIVE INTELLIGENCE FEED');
  expect(src).toContain('SAMPLE INTELLIGENCE FEED');
  expect(src, 'pins must not read as a tracked position').toContain('not a tracked position');
});

test('AUTH: no edge function is reachable without SOME guard', () => {
  // Every deployed function is world-reachable over HTTP. A function with no
  // auth gate, no cron secret and no webhook signature can be driven by anyone
  // — which for the reminder senders meant real emails/SMS to real patients
  // and uncapped Twilio/Anthropic spend.
  //
  // Deliberate exceptions, both public by design AND IP rate-limited:
  //   publicDoctorCheck — the homepage "check your doctor" tool
  //   safeTAssist       — the assistant a patient may reach before signing in
  const EXEMPT = new Set(['publicDoctorCheck', 'safeTAssist']);
  const GUARDS = /auth\.me|cronAuthorized|CRON_SECRET|validateTwilioSignature|constructEvent|stripe-signature|x-twilio-signature|SATELLITE_WEBHOOK_SECRET|createHandler/;

  const dir = join(ROOT, 'base44/functions');
  const unguarded = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const p = join(dir, name, 'entry.ts');
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    if (!GUARDS.test(src) && !EXEMPT.has(name)) unguarded.push(name);
  }
  expect(unguarded, `unguarded edge functions: ${unguarded.join(', ')}`).toEqual([]);

  // The two exemptions must keep their rate limiters.
  for (const fn of EXEMPT) {
    const src = readFileSync(join(dir, fn, 'entry.ts'), 'utf8');
    expect(src, `${fn} is public and must stay rate-limited`).toContain('RateLimitBucket');
  }
});

test('GOLDEN M: the certificate number is stable, not random per render', () => {
  const src = read('src/components/journey/GoldenMCertificate.jsx');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  // Math.random() meant two prints of the same journey produced two different
  // certificate numbers, and nothing was ever persisted.
  expect(code, 'certificate number must not be random').not.toContain('Math.random()');
  expect(code, 'must derive from the journey').toContain('deriveCertNumber');
  const cel = read('src/components/journey/GoldenMCelebration.jsx');
  expect(cel, 'a stable journey id must be passed in').toContain('journeyId=');
});
