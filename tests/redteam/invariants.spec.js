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

test('HANDSHAKE: HS4/HS5 confirmed with no GPS still pages admin', () => {
  // completeHandshake only ever checks that GPS is PRESENT on the two
  // high-risk checkpoints (hotel check-in, clinic arrival) — it has never
  // verified the coordinates are actually correct (real proximity checking
  // needs an expected-location data source that doesn't exist yet, and stays
  // deferred). This pins the one guarantee that does exist today: a missing
  // GPS fix on a high-risk step is not silently accepted — an admin alert
  // fires so a human can verify presence another way.
  const src = read('base44/functions/completeHandshake/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  expect(code, 'HIGH_RISK_STEPS must still be HS4 (hotel) and HS5 (clinic)')
    .toMatch(/HIGH_RISK_STEPS\s*=\s*new Set\(\[\s*4,\s*5\s*\]\)/);

  const highRiskBlockStart = code.indexOf('HIGH_RISK_STEPS.has(n)');
  expect(highRiskBlockStart, 'high-risk checkpoint block must exist').toBeGreaterThan(-1);
  const highRiskBlock = code.slice(highRiskBlockStart);

  expect(highRiskBlock, 'must check for a missing GPS fix')
    .toMatch(/!gps_location\?\.lat\s*\|\|\s*!gps_location\?\.lng/);
  // The admin email send must appear AFTER the missing-GPS check, i.e. inside
  // that guard — not just present anywhere in the high-risk block (which
  // would also match the destination-phone-missing alert above it).
  const missingGpsIdx = highRiskBlock.search(/!gps_location\?\.lat\s*\|\|\s*!gps_location\?\.lng/);
  const afterGpsCheck = highRiskBlock.slice(missingGpsIdx);
  expect(afterGpsCheck, 'missing-GPS branch must still alert admin').toMatch(/SendEmail/);
  expect(afterGpsCheck, 'the alert must name the risk plainly').toMatch(/confirmed HS\$\{n\} .*no GPS/);
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
  expect(src, 'must still be able to say SAMPLE when it is sample').toContain('SAMPLE INTELLIGENCE FEED');
  expect(src, 'LIVE may only be claimed for the audit-chain read').toContain('LIVE INTELLIGENCE FEED · AUDIT CHAIN');
  expect(src, 'the feed must read the audit chain').toContain('AuditLog');
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

test('LOCATION: the beacon runs on consent, never on trip shape', () => {
  const hook = read('src/hooks/useLiveLocationBeacon.js');
  // Tracking used to be derived from `isSolo` in Dashboard, so an accompanied
  // patient got none and a solo one got it without being asked.
  expect(hook, 'consent must be a precondition inside the hook').toContain('hasLocationConsent');
  expect(hook, 'shouldRun must require consent').toMatch(/shouldRun\s*=\s*enabled\s*&&\s*consented/);

  const dash = read('src/pages/Dashboard.jsx');
  const code = dash.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  expect(code, 'trip shape must no longer gate tracking').not.toContain('isSolo');
  expect(code, 'the patient needs a visible on/off control').toContain('LocationSharingCard');

  // Revocation must be obeyed even if a stale local yes exists.
  const consent = read('src/lib/locationConsent.js');
  expect(consent, 'server revocation must win').toContain('location_tracking_revoked_at');
  expect(consent, 'revoking must work offline').toContain('revokeLocationConsentLocally');
});

test('SITUATION ROOM: live dots are real positions, and never carry identity', () => {
  const src = read('src/pages/SituationRoom.jsx');
  expect(src, 'must read real positions').toContain('LiveLocation');
  // Stale positions must not be presented as current — checkStaleLiveLocations
  // escalates at 15 minutes.
  expect(src, 'must filter stale fixes').toContain('LIVE_FRESH_MS');
  // This board goes on a wall: the feed renders event types, not patient names.
  const feedStyle = src.slice(src.indexOf('FEED_EVENT_STYLE'), src.indexOf('const FEED_ITEMS'));
  for (const leak of ['client_name', 'patient_name', 'user_email', 'actor_name']) {
    expect(feedStyle, `wall display must not render ${leak}`).not.toContain(leak);
  }
});

test('ONBOARDING: the first question is who we protect, and both answers are real', () => {
  const src = read('src/components/onboarding/FirstTimeOnboarding.jsx');

  // Every flow used to assume a trip existed — the wizard asked which surgery
  // you wanted before establishing that surgery was involved at all.
  expect(src, 'the protection-type step must exist').toContain('StepProtectionType');
  expect(src, 'the shield is the promise shown above both choices').toContain('<Shield');
  // Order matters: protection type is asked before anything journey-specific.
  expect(
    src.indexOf("'protection'"),
    'protection type must be asked before the procedure question',
  ).toBeLessThan(src.indexOf("'procedure'"));
  expect(src, 'a non-traveler must not be asked which procedure they want')
    .toMatch(/protectionType\s*!==\s*PROTECTION_TYPES\.NON_TRAVELER.*steps\.push\('procedure'\)/s);

  // The onboarding PIN step used to collect 4 digits, throw them away, and set
  // a flag — while telling the patient the PIN "unlocks emergency features
  // when you're offline or in a crisis". The real PIN is 6 digits at 600k
  // PBKDF2 and lives in EmergencyPINSetup.
  // Anchor on code, not raw text: the comment above the step names the removed
  // key on purpose, and a raw substring match would trip on the explanation.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(code, 'onboarding must not fake a PIN it never stores')
    .not.toContain('morales_onboarding_pin_set');
  expect(src, 'the PIN step must hand off to the flow that really sets one')
    .toContain("navigate('/emergency')");

  // Neither answer may promise a capability that is journey-gated in code.
  const lib = read('src/lib/protectionType.js');
  const nonTraveler = lib.slice(lib.indexOf('NON_TRAVELER,\n    title'));
  for (const journeyOnly of ['handshake', 'Handshake', 'itinerary', 'Live location']) {
    expect(nonTraveler, `non-traveler copy must not promise ${journeyOnly}`)
      .not.toContain(journeyOnly);
  }
});

test('MOBILE: iOS and Android ship the same safety guarantees as the web', () => {
  // A fixed element is laid out against the viewport, so it ignores the
  // safe-area padding on <body>. The nav sat under the iPhone status bar.
  const header = read('src/components/layout/Header.jsx');
  expect(header, 'the fixed nav must inset itself past the notch')
    .toContain('env(safe-area-inset-top');

  const css = read('src/index.css');
  // iOS sizes vh against the large viewport, hiding the bottom of full-height
  // screens behind the URL bar — including primary buttons.
  expect(css, 'full-height screens must use dvh where supported').toContain('100dvh');
  // 16px floor is what prevents iOS zoom-on-focus, which is what lets us keep
  // pinch-zoom enabled rather than locking scale.
  expect(css, 'touch inputs need a 16px floor').toMatch(/pointer:\s*coarse/);
  // Read the tag's own content attribute — the surrounding comment explains why
  // maximum-scale was dropped, so a whole-file substring match is not the test.
  const html = read('index.html');
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)?.[1];
  expect(viewport, 'index.html must declare a viewport').toBeTruthy();
  expect(viewport, 'locking zoom fails WCAG 1.4.4 and disables pinch in the packaged apps')
    .not.toContain('maximum-scale');
  expect(viewport, 'safe-area insets require viewport-fit=cover').toContain('viewport-fit=cover');

  // Web Crypto is unavailable outside a secure context, and the vault + PIN
  // hashing both depend on crypto.subtle.
  const cap = read('capacitor.config.ts');
  expect(cap, 'both platforms must serve over https, not file://').toContain('iosScheme');
  expect(cap, 'both platforms must serve over https, not file://').toContain("androidScheme: 'https'");

  const manifest = read('android/app/src/main/AndroidManifest.xml');
  // navigator.geolocation inside a WebView reports "denied" without these —
  // silently, so live tracking and SOS coordinates would just never arrive.
  expect(manifest, 'geolocation needs the native permission').toContain('ACCESS_FINE_LOCATION');
  expect(manifest, 'Android 12+ may grant approximate only').toContain('ACCESS_COARSE_LOCATION');
  // localStorage holds the encrypted vault, PIN material and passport data.
  // Auto-backup would copy all of it to the user's Google Drive.
  expect(manifest, 'app data must never leave the device via platform backup')
    .toContain('android:allowBackup="false"');
  expect(manifest, 'the referenced extraction rules must exist')
    .toContain('@xml/data_extraction_rules');
});

test('COMMS: email/SMS/WhatsApp are notification-only — nothing private leaves M', () => {
  // Policy (Portia, 2026-07-18): these channels may say that something needs
  // attention and link to it. They may not carry PHI, identity, procedure
  // detail or money, and they may never invite a reply.
  const notify = read('base44/functions/_shared/notify.ts');
  expect(notify, 'the guard must exist').toContain('assertLinkOnly');
  expect(notify, 'SMS/WhatsApp need the same chokepoint as email').toContain('linkOnlySms');
  // Fail closed: a leaking body must not silently send with the leak stripped.
  expect(notify, 'the guard must throw, not sanitise').toContain('throw new LinkOnlyViolation');
  // The guard has to actually run inside the renderers, not merely be exported.
  const emailFn = notify.slice(notify.indexOf('export function linkOnlyEmail'));
  expect(emailFn.slice(0, 400), 'linkOnlyEmail must call the guard').toContain('assertLinkOnly');
  const smsFn = notify.slice(notify.indexOf('export function linkOnlySms'));
  expect(smsFn.slice(0, 300), 'linkOnlySms must call the guard').toContain('assertLinkOnly');

  // The emergency carve-out is narrow and enumerated. It exists because a
  // responder who must log in to learn who they are looking for arrives late.
  // It must not grow a catch-all reason.
  expect(notify, 'the carve-out must be an explicit reason list').toContain('EMERGENCY_REASONS');
  for (const forbidden of ['routine', 'general', 'any', 'other', 'safety_checkin']) {
    expect(
      notify.slice(notify.indexOf('EMERGENCY_REASONS'), notify.indexOf('EmergencyReason')),
      `'${forbidden}' would widen the emergency exemption into routine messaging`,
    ).not.toContain(`'${forbidden}'`);
  }
});

test('COMMS: migrated senders do not re-leak identity into a body', () => {
  const dir = join(ROOT, 'base44/functions');

  // Senders already migrated to link-only. Each must stay clean: this is the
  // ratchet that stops a future edit reintroducing a name or a procedure into
  // an outbound body. Add to this list as each remaining sender is migrated.
  const MIGRATED = [
    'sendTravelCountdownReminders',
    'requestPartnerQuotas',
    'checkPartnerSLABreaches',
    'sendQuoteReminders',
    'iq200Pipeline',
    'processPaymentCascade',
    'releaseEscrowPayment',
    'generateItineraryCalendar',
    'sendAIPartnerBriefs',
    'sendCompanionMealBrief',
    'sendHandshakeAlert',
    'sendChauffeurQuoteAlert',
    'sendTravelQuoteEmail',
    'processInformedConsentAndEmail',
    'schedulePostOpMedReminders',
    'sendPostOpInstructions',
    'safeT4LifeScan',
    'activateMotherTouch',
    'checkAbandonedBookings',
    'pipelineOnConsultationFeePaid',
    'pipelineOnDoctorConfirmed',
    'checkMissedRecoveryCheckins',
    'portalHubWorkflow',
    'submitRecoveryCheckin',
    'autoReassignDoctorOnDecline',
    'onDoctorConfirmed',
    'runSilentSafetyEscalation',
    'stripePaymentWebhook',
  ];

  // The identifier may sit anywhere inside the interpolation, not just at its
  // end. `${(caseRecord.procedures || ['x']).join(' + ')}` is a leak, and an
  // earlier `procedures\w*\}` anchor let exactly that through twice.
  const LEAKY = /\$\{[^}]*\b(patientName|clientName|client_name|patient_name|procedures|procedureDate|procedure_date|client_phone|patient_phone)\b[^}]*\}/;

  // Scan EVERY line, not only lines that look like `body:` / `title:`.
  //
  // The first version of this ratchet keyed on those field names and therefore
  // missed iq200Pipeline, which interpolated the patient's procedure list into
  // an HTML <div> inside a multi-line template literal — a real leak sitting in
  // a file this test was reporting as clean. A ratchet that only checks the
  // obvious shape gives false assurance, which is worse than no ratchet.
  //
  // In-platform writes are the only exemption: AuditLog rows, entity fields and
  // calendar/PDF artefacts the patient downloads are not outbound notifications
  // and legitimately carry full detail.
  const IN_PLATFORM = /AuditLog|entities\.|\bdetails\s*:|prev_hash|resource_|actor_/;

  const offenders = [];
  for (const name of MIGRATED) {
    const p = join(dir, name, 'entry.ts');
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');

    // A couple of migrated senders legitimately reference patient fields
    // OUTSIDE any outbound body: building an LLM prompt (the prompt itself is
    // never emailed — only the AI's own linkOnlyEmail "your brief is ready"
    // notification is sent), or a push-notification body (a different
    // channel this policy doesn't cover — comms-audit.mjs itself only scans
    // SendEmail/SMS/Twilio/WhatsApp). Marked ranges are exempted explicitly,
    // by name, rather than loosening the scan for every file.
    const rawLines = raw.split('\n');
    const ignoreRanges = [];
    let ignoreStart = -1;
    rawLines.forEach((line, i) => {
      if (line.includes('LEAK-SCAN-IGNORE-START')) ignoreStart = i;
      if (line.includes('LEAK-SCAN-IGNORE-END') && ignoreStart !== -1) {
        ignoreRanges.push([ignoreStart, i]);
        ignoreStart = -1;
      }
    });
    const isIgnored = (i) => ignoreRanges.some(([s, e]) => i >= s && i <= e);

    // Block comments must keep their newlines when stripped (replace matched
    // non-newline characters only) — collapsing a multi-line /** doc */ block
    // to '' shifts every later line index, breaking alignment with the
    // ignoreRanges computed above against the unstripped source.
    //
    // Line-comment strip must anchor leading whitespace to [ \t]*, not \s* —
    // \s matches \n, so a blank line directly followed by a `//` comment lets
    // the match's `^` start on the blank line and its `\s*` swallow that blank
    // line's own newline into the same match, deleting one line net per
    // occurrence. A 773-line file with ~30 blank-line-then-comment pairs
    // (routine section-header style) silently lost 31 lines this way, which
    // shifted every ignoreRange after the first occurrence and produced
    // phantom offenders out of correctly-exempted emergencyDispatch() bodies.
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
      .replace(/^[ \t]*\/\/.*$/gm, '');
    src.split('\n').forEach((line, i) => {
      if (isIgnored(i)) return;
      if (IN_PLATFORM.test(line)) return;
      if (LEAKY.test(line)) offenders.push(`${name}: ${line.trim().slice(0, 90)}`);
    });
  }
  expect(offenders, `outbound bodies carrying private data:\n${offenders.join('\n')}`).toEqual([]);
});

test('COVERT SOS: the documented trigger works on every page, and outranks the blocker', () => {
  // SoloCheckInSettings promises "type MORALESHELP in any search/text field".
  // The detector existed but was mounted only in Dashboard, so on the emergency
  // hub, the booking flow or the nearby-help map it did nothing — those being
  // the screens someone in trouble is most likely to be looking at.
  const layout = read('src/components/layout/AppLayout.jsx');
  expect(layout, 'the detector must be mounted at the layout, not one page')
    .toContain('useCovertSOS');

  const hook = read('src/hooks/useCovertSOS.js');
  // Two live instances both listen on `document`; a ref-local cooldown would
  // let one gesture dispatch two SOS calls.
  expect(hook, 'the cooldown must be shared across instances').toContain('recentlyFired');
  // ...but it must fail toward firing. A duplicate SOS is an annoyance; a
  // suppressed one is a person nobody comes for.
  const fallback = hook.slice(hook.indexOf('function recentlyFired'), hook.indexOf('function markFired'));
  expect(fallback, 'a storage failure must not suppress the dispatch').toContain('return false');

  // The blocker must never swallow the duress keyword: it is checked before
  // every other rule, and a message containing it is returned untouched even
  // when it also trips contact-sharing.
  const engine = read('base44/functions/_shared/violationEngine.ts');
  const covertIdx = engine.indexOf('COVERT_SOS.test');
  const offPlatformIdx = engine.indexOf('OFF_PLATFORM)');
  expect(covertIdx, 'covert SOS check must exist').toBeGreaterThan(-1);
  expect(covertIdx, 'covert SOS must be evaluated before any blocking rule')
    .toBeLessThan(offPlatformIdx);

  // Safety scopes are never blocked — losing a check-in is a safety event.
  expect(engine, 'safety scope must short-circuit to allow').toMatch(/scope === 'safety'/);
});

test('BLOCKER: a flag never closes a safety path', () => {
  // Decision (Portia, 2026-07-18): lockout covers commercial features only.
  // Handshakes are the 9-point safety spine and checkStaleLiveLocations
  // escalates on silence — restricting a flagged patient's check-ins would
  // manufacture a "patient in trouble" signal from someone who is fine, and
  // leave someone who IS in trouble unable to confirm anything.
  const src = read('base44/functions/_shared/blocker.ts');

  for (const feature of ['checkin', 'handshake', 'sos', 'covert_sos', 'emergency_contacts', 'location_sharing']) {
    expect(src, `${feature} must be permanently open`).toContain(`'${feature}'`);
  }

  // No safety feature may appear in the restrictable list.
  const restrictable = src.slice(
    src.indexOf('RESTRICTABLE_FEATURES'),
    src.indexOf('export type Feature'),
  );
  for (const safety of ['checkin', 'handshake', 'sos', 'emergency', 'location_sharing', 'guardian', 'vault']) {
    expect(restrictable, `${safety} must never be restrictable`).not.toContain(safety);
  }

  // The safety check must short-circuit BEFORE the flag is read, so a failing
  // lookup or a network error can never close a safety path.
  const fn = src.slice(src.indexOf('export async function featureAllowed'), src.indexOf('async function getFlag'));
  expect(fn.indexOf('ALWAYS_OPEN.has'), 'safety check must exist').toBeGreaterThan(-1);
  expect(
    fn.indexOf('ALWAYS_OPEN.has'),
    'safety features must be cleared before any flag lookup',
  ).toBeLessThan(fn.indexOf('getFlag(base44'));

  // The guarantee is recorded as data, not just enforced in code.
  expect(src, 'every flag write must record safety_paths_open').toContain('safety_paths_open: true');
  const entity = read('base44/entities/AccountFlag.jsonc');
  expect(entity, 'the entity must carry the invariant').toContain('safety_paths_open');

  // Covert SOS must never be blocked or escalated by the middleware.
  const guard = src.slice(src.indexOf('export async function guardText'));
  const covertIdx = guard.indexOf('result.covertSos');
  const blockIdx = guard.indexOf("result.severity === 'allow'");
  expect(covertIdx, 'covert SOS must be handled first').toBeLessThan(blockIdx);

  // A block must not throw — a throw on a safety-adjacent path loses a check-in.
  expect(guard, 'guardText must return a decision, not throw').not.toMatch(/throw new/);
});

test('BLOCKER: the message path is guarded, and the safety SMS line keeps its lifeline', () => {
  const msg = read('base44/functions/postCaseMessage/entry.ts');
  expect(msg, 'partner threads must run through the blocker').toContain('guardText');
  // A blocked message must be refused, not quietly stored.
  expect(msg, 'a block must refuse the action').toMatch(/guard\.blocked[\s\S]{0,160}return err/);
  // The stage distinction must survive: pre-selection strict, post-selection
  // operational contact allowed but evasion still blocked.
  expect(msg, 'stage must be passed to the engine').toContain("'message_selected'");
  // Only the guarded text may be persisted.
  expect(msg, 'the persisted body must come from the guard').toContain('guard.cleanText');

  const sms = read('base44/functions/twilioSafetySmsWebhook/entry.ts');
  // The safety number is the documented fallback for a patient with no data
  // plan. Replying "log in to the app" to someone who cannot reach the app is
  // not a privacy win, it is an abandoned patient.
  expect(sms, 'SAFE must stay available by reply').toMatch(/Reply SAFE/);
  expect(sms, 'SOS must stay available by reply').toMatch(/SOS for emergency help/);
  // ...but a check-in confirmation must not name the patient on a lock screen.
  expect(sms, 'the safe confirmation must not carry the name')
    .not.toContain('Thank you, ${checkIn.user_name');
});

test('BLOCKER: there is a human route back, and it cannot close a safety path', () => {
  // The blocker's notification email points at /admin/flags, and "only a human
  // can clear it" is hollow without somewhere for the human to do it.
  const routes = read('src/routes/adminRoutes.jsx');
  expect(routes, 'the review console must be routed').toContain('/admin/flags');

  const fn = read('base44/functions/reviewAccountFlag/entry.ts');
  expect(fn, 'clearing must be admin-only').toContain("allowedRoles: ['admin', 'platform_admin']");
  // A human overriding the blocker is exactly what must be reconstructable.
  expect(fn, 'the decision must join the hash chain').toContain('prev_hash');
  // Locking must not become a way to close someone's route to emergency help.
  const lockBranch = fn.slice(fn.indexOf("tier: 'locked'"));
  expect(lockBranch, 'locking must restate the safety guarantee').toContain('safety_paths_open: true');

  // Whoever works the queue must be told, before deciding, that a locked
  // account can still call for help — so nobody "locks harder" believing they
  // are closing a safety hole.
  const page = read('src/pages/AdminFlags.jsx');
  expect(page, 'the console must state the safety guarantee').toMatch(/never affects safety/i);
  expect(page, 'the guarantee must name the paths').toMatch(/SOS/);
});

test('EMERGENCY: the comms exemption is explicit at the call site', () => {
  // The carve-out must be greppable per dispatch, not implied by a function
  // name — otherwise it quietly widens.
  const covert = read('base44/functions/triggerCovertSOS/entry.ts');
  expect(covert, 'the guardian alert must be a marked exemption').toContain('emergencyDispatch(');
  expect(covert, 'it must carry an enumerated reason').toMatch(/reason: '(sos_triggered|patient_missing|medical_emergency|authority_dispatch)'/);

  // The patient-facing confirmation stays generic: it is not a responder
  // dispatch, so it gets no exemption.
  expect(covert, 'the patient confirmation must not name them')
    .not.toMatch(/Body:[^`]*`[^`]*\$\{patientName\}[^`]*Help is on the way/);
});

test('PORTAL TOKENS: no published default signing key, anywhere', () => {
  // A portal token is a bearer credential: it grants an unauthenticated visitor
  // read access to a patient's case. Eighteen functions used to inline
  // `Deno.env.get('PORTAL_TOKEN_SECRET') || 'change-me-in-production'` — and
  // this repository is the source of that fallback, so anyone who could read it
  // could mint a token for any case. The fallback did not weaken the signature,
  // it removed it while leaving code that looks signed.
  const dir = join(ROOT, 'base44/functions');
  const offenders = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'entry.ts');
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    // The only permitted mentions are the fail-closed rejection and comments.
    for (const line of src.split('\n')) {
      if (!line.includes('change-me-in-production')) continue;
      const isRejection = /s\s*===\s*'change-me-in-production'/.test(line);
      const isComment = /^\s*(\/\/|\*)/.test(line);
      if (!isRejection && !isComment) offenders.push(`${name}: ${line.trim().slice(0, 80)}`);
    }
  }
  expect(offenders, `functions accepting a published default key:\n${offenders.join('\n')}`).toEqual([]);

  // The verifier must refuse, never accept, when no secret is configured.
  const shared = read('base44/functions/_shared/portalToken.ts');
  expect(shared, 'signing must fail closed').toContain('PortalTokenNotConfigured');
  const verify = shared.slice(shared.indexOf('export async function verifyPortalToken'));
  expect(verify, 'an unverifiable token must be rejected, not trusted').toContain('return null');
  // Signature comparison must not exit early on the first differing character.
  expect(verify, 'signature compare must be constant-width').toMatch(/diff \|=/);

  // getPortalData must not turn a thrown verifier into granted access.
  const gpd = read('base44/functions/getPortalData/entry.ts');
  const gate = gpd.slice(gpd.indexOf('const verified = await verifyPortalToken'), gpd.indexOf('Extract identity'));
  expect(gate, 'a falsy verification must refuse').toMatch(/if \(!verified\)[\s\S]{0,120}403/);
});

test('OFFLINE SOS: the SMS channel does not depend on a build-time flag', () => {
  // buildSmsDeepLink used to read only import.meta.env.VITE_TWILIO_PHONE_NUMBER
  // — a variable Vite inlines at BUILD time. Setting TWILIO_PHONE_NUMBER in the
  // Base44 function environment does nothing for it. Unset, the link fell back
  // to `sms:?body=...`: the composer opens with the emergency text ready and NO
  // RECIPIENT, expecting someone in a wilderness emergency to already know the
  // number.
  const pkt = read('src/offline/sos/offlineSosPacket.js');
  expect(pkt, 'the number must be cacheable on the device').toContain('morales_safety_sms_number');
  expect(pkt, 'there must be a way to fetch it while online').toContain('refreshSafetyNumber');

  // Cache first, build-time flag second — never the other way round.
  const getter = pkt.slice(pkt.indexOf('export function getTwilioNumber'), pkt.indexOf('export async function refreshSafetyNumber'));
  expect(
    getter.indexOf('localStorage.getItem'),
    'the cached value must be preferred over the build-time flag',
  ).toBeLessThan(getter.indexOf('import.meta.env'));

  // A failed refresh must keep whatever is already cached — a stale number is
  // worth far more than none.
  const refresh = pkt.slice(pkt.indexOf('export async function refreshSafetyNumber'));
  expect(refresh, 'a failed refresh must not clear the cache').toContain('return getTwilioNumber()');

  // It has to actually be fetched somewhere, while online.
  const layout = read('src/components/layout/AppLayout.jsx');
  expect(layout, 'the number must be cached before it is needed').toContain('refreshSafetyNumber');

  // The panel must not snapshot availability at mount, or it will show
  // "no emergency number configured" after the number has arrived.
  const hook = read('src/offline/sos/useOfflineSOS.js');
  expect(hook, 'availability must be read live, not snapshotted')
    .not.toMatch(/useState\(!!getTwilioNumber\(\)\)/);
});

test('CLAIMS: the front door does not invent stories, guarantees or savings', () => {
  // The homepage rotated three named customer stories presented as fact —
  // "Rosa flew to Cancún alone…", "James had 12 hours to save his sight…",
  // "Elena's family slept peacefully…". None happened; James is a demo persona
  // with a /demo/james route. A fabricated testimonial on the first screen a
  // patient reads is the one failure that makes everything else worthless.
  const hero = read('src/components/home/LuxuryHero.jsx');
  const heroCode = hero.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const invented of ['Rosa flew', 'James had 12', "Elena's family"]) {
    expect(heroCode, `"${invented}" is not a real customer story`).not.toContain(invented);
  }

  // No absolute guarantee. One bad outcome turns it from a tagline into a
  // liability, and no platform can promise it.
  for (const absolute of ['No One Is Ever Lost', 'Never Lost', '100% Safe', 'Guaranteed Safe']) {
    expect(heroCode, `"${absolute}" is a promise we cannot keep`).not.toContain(absolute);
  }

  // Savings figures on the procedure picker were string literals — not derived
  // from pricing data, not true of any patient, and they framed Morales as a
  // discount marketplace on the screen where someone decides whether to trust
  // us with surgery abroad. Real prices come from doctor quotes, later.
  const gate = read('src/components/booking/ProcedureSelectionGate.jsx');
  const gateCode = gate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(gateCode, 'no hardcoded savings claim').not.toMatch(/Save up to \$/);
  expect(gateCode, 'no hardcoded price claim').not.toMatch(/\$\d+K\b/);
});

test('BOOKING: age stays visible — a collapsed field cannot disable the guardian gate', () => {
  // Booking step 1 collapses optional details behind a disclosure to cut the
  // screen from 26 fields to 6. Age must NOT go in there.
  //
  // isMinorAge() returns false for a blank value (guardianGate.js: the Number()
  // must be finite and > 0), so a minor who never opened a collapsed age field
  // would walk straight past the guardian requirement. A convenience feature
  // must not be able to switch off a safety block.
  const src = read('src/components/booking/Section1PersonalInfo.jsx');

  const ageIdx = src.indexOf("update('age'");
  const disclosureIdx = src.indexOf('setShowOptional(o => !o)');
  expect(ageIdx, 'the age field must exist').toBeGreaterThan(-1);
  expect(disclosureIdx, 'the optional disclosure must exist').toBeGreaterThan(-1);
  expect(ageIdx, 'age must render ABOVE the optional disclosure').toBeLessThan(disclosureIdx);

  // And it must not be wrapped in the collapse condition.
  const ageBlock = src.slice(Math.max(0, ageIdx - 400), ageIdx);
  expect(ageBlock, 'age must never be gated on showOptional').not.toContain('showOptional &&');

  // The guardian gate itself must still be a hard block in canNext().
  const booking = read('src/pages/Booking.jsx');
  expect(booking, 'minors must still require a guardian').toMatch(/isMinorAge\(form\.age\)/);
});

test('UX: no raw browser alert()/confirm() anywhere in src', () => {
  // 35 raw alert()/confirm() calls were replaced with toasts and ConfirmDialog.
  // A browser dialog is unstyled, unbranded, blocks the whole tab, and on iOS
  // reads as "this site says…" — it breaks the premium illusion instantly and
  // tells the patient the software is unfinished. There is a component for
  // every case these covered, so a new one is always a mistake.
  //
  // Comments are stripped first: several of the files that were fixed explain
  // in a comment WHY the alert() was removed, and a naive scan would flag its
  // own fix. (This bit me before.)
  const walk = (dir, out = []) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.(js|jsx)$/.test(e.name)) out.push(rel);
    }
    return out;
  };

  const offenders = [];
  for (const rel of walk('src')) {
    const code = read(rel)
      .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
      .replace(/^\s*\/\/.*$/gm, '')          // line comments
      .replace(/^\s*\*.*$/gm, '');           // jsdoc continuation lines

    // Matches alert(/confirm( as a CALL: not .alert(, not a property, and not
    // `function confirm()`. window.alert( and window.confirm( are caught too.
    const re = /(?:^|[^.\w$])(?:window\.)?(alert|confirm)\s*\(/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const before = code.slice(Math.max(0, m.index - 30), m.index);
      if (/\b(function|const|let|var)\s*$/.test(before)) continue; // local declaration
      offenders.push(`${rel} → ${m[1]}()`);
    }
  }

  expect(offenders, `use toast()/ConfirmDialog instead:\n${offenders.join('\n')}`).toEqual([]);
});

test('UX: the guide orb never nags — no unbounded tip carousel, quiet on data-entry routes', () => {
  // The orb used to setInterval a new tip every 6 seconds, forever, on every
  // route, until the user found the dismiss control. On /booking that means
  // animated motion in the corner of the eye while someone types their surgical
  // history. Our own interface must not compete for attention with the form.
  const src = read('src/components/guide/PlatformGuideOrb.jsx');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // No setInterval driving the tip bubble — rotation must be bounded.
  expect(code, 'tip rotation must not be an unbounded setInterval')
    .not.toMatch(/setInterval\([\s\S]{0,200}setShowBubble/);

  // A hard cap must exist and be small.
  const cap = code.match(/MAX_TIP_ROTATIONS\s*=\s*(\d+)/);
  expect(cap, 'a MAX_TIP_ROTATIONS cap must exist').not.toBeNull();
  expect(Number(cap[1]), 'the cap must stay small').toBeLessThanOrEqual(5);

  // And the data-entry routes must be excluded from the unprompted bubble.
  for (const route of ['/booking', '/intake', '/checkout', '/emergency']) {
    expect(code, `${route} must be a quiet route for the orb`).toContain(`'${route}'`);
  }
  expect(code, 'the quiet-route check must gate the auto-open effect')
    .toMatch(/if \(!pastHero \|\| isQuietRoute\) return;/);
});

test('SAFETY MONITORING: the escalation engine is schedulable and guarded', () => {
  // The app promises "24/7 support watching". The escalation cascade (2h nudge
  // → 3h guardian → 5h security → 9h emergency) existed and worked, but nothing
  // scheduled it, and escalateSoloCheckIn required an ADMIN SESSION — so a
  // scheduled call got 403 and it only ever ran when a human pressed a button.
  //
  // Two properties must hold together, or the promise is hollow again:
  //   1. every safety job accepts cron auth (a scheduler can drive it)
  //   2. a scheduler actually exists and calls them
  const SAFETY_JOBS = [
    'escalateSoloCheckIn',
    'predictiveEscalation',
    'checkStaleLiveLocations',
    'escalateMissedDriverHandshake',
    'checkMissedRecoveryCheckins',
    'runSafetyMonitor',
  ];

  for (const fn of SAFETY_JOBS) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must accept cron auth or no scheduler can run it`)
      .toMatch(/cronAuthorized\(req, base44\)/);

    // The fail-OPEN pattern that was here: `if (user && !isAdmin) return 403`
    // lets an unauthenticated caller straight through, because `user` is null.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, `${fn} must not treat "no session" as "must be the scheduler"`)
      .not.toMatch(/if \(user && !\[?['"]admin['"]/);
  }

  const wf = read('.github/workflows/safety-cron.yml');
  expect(wf, 'the safety scheduler must run on a schedule').toMatch(/^\s*schedule:/m);
  for (const fn of ['escalateSoloCheckIn', 'predictiveEscalation', 'checkStaleLiveLocations']) {
    expect(wf, `${fn} must be called by the safety scheduler`).toContain(`call ${fn}`);
  }
});

test('PROVIDERS: the directory cannot list a doctor it calls verified', () => {
  // The page is titled "Our Verified Specialists" and states "Every provider is
  // rigorously vetted". It listed Doctor.filter({}) — every row, verified or
  // not. The headline said "every"; the list didn't.
  const src = read('src/pages/Providers.jsx');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  expect(code, 'the listing must be gated on verification')
    .toMatch(/doctors\.filter\(isDoctorVerified\)/);
  expect(code, 'the search must run over the VERIFIED set, not the raw one')
    .toMatch(/verifiedDoctors\.filter\(/);

  // And the gate must be the shared one — a hand-copied state list already
  // drifted once (guessed 'manually_verified', wrongly included 'auto_verified').
  // The gate moved to @/lib/doctorVerification so it could be tested without
  // importing React; DoctorVerifiedBadge re-exports it, so either path is the
  // same single definition and both are accepted here.
  expect(code, 'must import the shared gate, not re-implement it')
    .toMatch(/import \{ isDoctorVerified \} from ['"]@\/(lib\/doctorVerification|components\/doctor\/DoctorVerifiedBadge)['"]/);
  expect(code, 'must not hand-roll its own verified-state list')
    .not.toMatch(/new Set\(\[['"]verified['"]/);
});

test('CLAIMS: the booking gate cannot advertise a free consultation while one is charged', () => {
  // The entry gate read "No commitment required · Change anytime · Free
  // consultation" while ConsultationFeeModal charges $49. It is fully credited
  // against the package — a genuinely good deal — but it is not free, and this
  // was the first screen a patient read before deciding to trust us with
  // surgery abroad. Meeting an unexpected $49 three steps later is how trust
  // gets spent.
  const gate = read('src/components/booking/ProcedureSelectionGate.jsx');
  const code = gate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  expect(code, 'the gate must not claim a free consultation').not.toMatch(/free consultation/i);

  // Only meaningful while a fee is actually charged — if the product ever goes
  // genuinely free, this test should be deleted along with the fee, not muted.
  const feeModal = read('src/components/booking/ConsultationFeeModal.jsx');
  const feeCharged = /\$49/.test(feeModal);
  expect(feeCharged, 'consultation fee still exists — keep this invariant honest').toBe(true);

  // And the real number should be stated up front rather than hidden.
  expect(code, 'the gate should state the actual fee').toMatch(/\$49/);
});

test('PERF: heavy admin-only vendors are never forced into the eager bundle', () => {
  // recharts (404 KB) sat in the object form of manualChunks. That hoists it
  // into the entry's static graph, so Vite emitted a <link rel="modulepreload">
  // for it in index.html — every visitor downloaded 404 KB of charting library
  // for two admin pages they will never open. Both pages are lazy routes; the
  // chunking config was overriding that.
  //
  // Removing it took the eager payload from 1280 KB to 876 KB. recharts still
  // ships, as a lazy chunk, when an admin actually opens Analytics.
  const cfg = read('vite.config.js');
  const code = cfg.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const manual = code.slice(code.indexOf('manualChunks'), code.indexOf('manualChunks') + 500);
  for (const heavy of ['recharts', 'leaflet']) {
    // leaflet is listed but not currently preloaded; recharts must stay out
    // entirely. Guard the one that actually regressed.
    if (heavy === 'recharts') {
      expect(manual, 'recharts must not be pinned into a manual vendor chunk — it forces an eager preload')
        .not.toContain("'recharts'");
    }
  }

  // And the pages using it must stay lazy, or the chunk becomes eager again.
  const routes = read('src/routes/adminRoutes.jsx');
  for (const page of ['AdminAnalytics', 'RiskOptimizationDashboard']) {
    expect(routes, `${page} must stay lazy-loaded, or recharts becomes eager again`)
      .toContain(`lazy(() => import('@/pages/${page}'))`);
  }
});

test('PERF: images are lazy, except above-the-fold and emergency-critical ones', () => {
  // 70 <img> tags, 0 with loading="lazy". But blanket-lazying is wrong: a lazy
  // above-the-fold image DELAYS Largest Contentful Paint, because the browser
  // must finish layout before it will start the request. Lazy helps what is
  // off-screen and hurts what isn't.
  const walk = (dir, out = []) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.jsx$/.test(e.name)) out.push(rel);
    }
    return out;
  };

  let lazied = 0;
  const wrongfullyLazy = [];

  for (const rel of walk('src')) {
    const src = read(rel);
    let i = 0;
    while (true) {
      const idx = src.indexOf('<img', i);
      if (idx === -1) break;
      let end = idx, depth = 0;
      while (end < src.length) {
        const ch = src[end];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '>' && depth === 0) break;
        end++;
      }
      const tag = src.slice(idx, end + 1);
      const isLazy = /loading="lazy"/.test(tag);
      if (isLazy) lazied++;

      // The brand mark is above the fold; the SOS QR is the point of an
      // emergency screen. Neither may be deferred.
      if (isLazy && /(morales-m-mark|qrDataUrl)/.test(tag)) wrongfullyLazy.push(rel);
      i = end + 1;
    }
  }

  expect(wrongfullyLazy, `these must load eagerly:\n${wrongfullyLazy.join('\n')}`).toEqual([]);
  expect(lazied, 'the lazy-loading pass must not be silently reverted').toBeGreaterThanOrEqual(30);
});

test('CLAIMS: no invented usage numbers, and the checkpoint count matches the engine', () => {
  // The audit caught three fabrications in LuxuryHero. The same defect existed
  // in two places it did not look, which is the lesson worth encoding: fix the
  // class, not the instances.
  //
  //   HowItWorksModal  "Over 1,200 journeys completed. Yours is next."
  //   LuxuryStatsBar   "8 Confirmed Checkpoints" (the journey is NINE)
  //   LuxuryStatsBar   "missed check-ins escalate automatically" (not running)
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // ── No usage/track-record counts anywhere on the public front door ──
  // Protocol facts ("9 checkpoints", "AES-256") are fine — those are things
  // the product DOES. A count of journeys/patients/families served is a claim
  // about history, and we have no counter behind one.
  const publicFiles = [
    'src/components/home/LuxuryHero.jsx',
    'src/components/home/LuxuryStatsBar.jsx',
    'src/components/home/HowItWorksModal.jsx',
  ];
  const USAGE_CLAIM = /\b[0-9][0-9,]{2,}\+?\s*(journeys|patients|clients|families|lives|procedures)\b/i;
  for (const f of publicFiles) {
    const code = strip(read(f));
    const hit = code.match(USAGE_CLAIM);
    expect(hit && hit[0], `${f} states a usage count with no data behind it: ${hit && hit[0]}`).toBeFalsy();
  }

  // ── The advertised checkpoint count must equal the real one ──
  // Source of truth is HandshakeButton: the labels array and the completion
  // threshold. If a checkpoint is ever added or removed, the marketing number
  // must move with it rather than drifting silently.
  const hs = read('src/components/journey/HandshakeButton.jsx');
  const threshold = hs.match(/currentStep >= (\d+)/);
  expect(threshold, 'handshake completion threshold must exist').not.toBeNull();
  const realCount = Number(threshold[1]);

  const stats = strip(read('src/components/home/LuxuryStatsBar.jsx'));
  const checkpointStat = stats.match(/display:\s*'(\d+)'\s*,\s*label:\s*'Confirmed Checkpoints/);
  expect(checkpointStat, 'the checkpoint stat must exist').not.toBeNull();
  expect(Number(checkpointStat[1]),
    `stats bar advertises ${checkpointStat[1]} checkpoints but the engine completes at ${realCount}`)
    .toBe(realCount);

  // ── No "automatic escalation" claim while the schedulers are unproven ──
  // Kept deliberately narrow: this guards the specific wording that outran the
  // deployment, not the word "escalation" generally.
  expect(stats, 'do not claim automatic escalation until the safety jobs are deployed and scheduled')
    .not.toMatch(/escalate[s]? automatically/i);
});

test('INTAKE: M never derives a medical fact about a patient', () => {
  // The review screen prefills fields the patient didn't answer. That is a
  // real convenience and a real hazard: a derived value is submitted as the
  // patient's own answer, and anything the SAFE-T engine reads must come from
  // the patient, not from a computation wearing their voice.
  //
  // tests/derivedFields.test.js proves the behaviour. This guards the two
  // structural properties that behaviour depends on, because a future edit
  // could satisfy every unit test simply by shrinking the forbidden list.
  //
  // Comments are stripped first — this file's own header discusses the field
  // names it forbids, so an unstripped scan would pass on the prose alone
  // even if the Set were emptied.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = strip(read('src/lib/intakeFlow/derivedFields.js'));

  // 1. The forbidden set still names every category computeSafeT reads.
  //    Deliberately checked as literals: this list is allowed to grow, never
  //    to quietly lose a member to make some new deriver pass.
  for (const field of [
    'procedure_interest', 'age', 'gender', 'medical_conditions', 'allergies',
    'takes_medications', 'medication_types', 'anesthesia_complications',
    'had_surgery', 'previous_procedures', 'pregnancy_status', 'bmi',
    'lifestyle', 'emotional_concerns',
  ]) {
    expect(src, `SAFETY_INPUT_FIELDS must still forbid deriving "${field}"`)
      .toContain(`'${field}'`);
  }

  // 2. The runtime filter is still the last thing that happens to `prefilled`,
  //    so a deriver added above it cannot leak a safety field even if someone
  //    forgets to call assertNotSafetyField.
  expect(src, 'deriveIntake must filter SAFETY_INPUT_FIELDS out of its return')
    .toMatch(/prefilled:\s*prefilled\.filter\(\s*\(\w+\)\s*=>\s*!SAFETY_INPUT_FIELDS\.has\(/);
});

test('VAULT: no passport image is uploaded before it is encrypted', () => {
  // A passport carries number, date of birth, full name and nationality. The
  // "scan your passport" convenience sent the raw image to Core.UploadFile —
  // the GENERAL bucket, not UploadPrivateFile — handed the URL to an OCR
  // function, and never deleted it, all under a banner promising the document
  // was encrypted. It was fixed once in VaultUploader and left in
  // PassportVaultSection, so this guards BOTH and any future sibling.
  //
  // Comments are stripped first: both files now explain the removal in prose
  // that names the very APIs being banned, and an unstripped scan would either
  // fail on the explanation or pass on it.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const file of [
    'src/components/vault/VaultUploader.jsx',
    'src/components/booking/PassportVaultSection.jsx',
  ]) {
    const code = strip(read(file));

    expect(code, `${file}: Core.UploadFile puts the document in general storage — use UploadPrivateFile, and only after encryption`)
      .not.toMatch(/Core\.UploadFile\b/);

    expect(code, `${file}: extractPassportData takes a URL to an unencrypted image; OCR may only return behind encrypt-first + explicit consent + delete-after`)
      .not.toMatch(/extractPassportData/);
  }
});

test('INTAKE: answers survive navigating away mid-conversation', () => {
  // The reset bug. Signed-in patients used to persist ONLY through a 1-second
  // debounced server save. That timer is cleared by the next answer and by
  // unmount, so anyone answering faster than once per second banked nothing,
  // and navigating away (e.g. "Browse all procedures") threw it all out. They
  // returned to "First, what's your name?" having already answered it.
  //
  // localStorage.setItem is synchronous and survives navigation; the server
  // save cannot be relied on alone.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const code = strip(read('src/hooks/useIntakeSession.js'));

  // 1. The draft write must not sit behind a guests-only guard. Assert the
  //    write happens BEFORE the isAuthenticated early return.
  const writeIdx = code.indexOf('localStorage.setItem(GUEST_DRAFT_KEY');
  const authReturnIdx = code.indexOf('if (!isAuthenticated) return;');
  expect(writeIdx, 'the local draft must still be written').toBeGreaterThan(-1);
  expect(authReturnIdx, 'the authenticated-only early return must still exist').toBeGreaterThan(-1);
  expect(writeIdx, 'the draft must be written for signed-in patients too, not only guests')
    .toBeLessThan(authReturnIdx);

  // 2. The draft must NOT be retired inside the save path. It is cleared once,
  //    on successful submission, in ConciergeIntake.
  expect(code, 'the draft must not be removed on a server save — later answers would be left unprotected')
    .not.toMatch(/removeItem\(GUEST_DRAFT_KEY/);
});

test('INTAKE: an unreachable safety validator BLOCKS submission — and says so honestly', () => {
  // The SDK throws on 4xx/5xx, so if validateProcedureSafety is undeployed or
  // down, control lands in a catch. Two properties must hold forever:
  //
  //   1. FAIL CLOSED — no code path reaches Consultation.create when the
  //      safety check did not resolve. The check is asked before the create,
  //      and its failure handler returns out of the submit.
  //   2. HONEST — the failure message tells the patient nothing was submitted
  //      and the safety check is never skipped, instead of a generic "try
  //      again" that implies retrying might work while the service is down.
  //
  // Weakening #1 (e.g. proceeding with a default "not blocked" verdict when
  // the validator is unreachable) is the exact regression the M Principle
  // forbids: a dangerous combination submitted because the checker was off.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const code = strip(read('src/pages/ConciergeIntake.jsx'));

  // The safety check must still be asked, and asked BEFORE the create.
  const safetyIdx = code.indexOf("invoke('validateProcedureSafety'");
  const createIdx = code.indexOf('Consultation.create');
  expect(safetyIdx, 'the server-side safety re-check must exist').toBeGreaterThan(-1);
  expect(createIdx, 'the consultation create must exist').toBeGreaterThan(-1);
  expect(safetyIdx, 'the safety check must run before anything is created').toBeLessThan(createIdx);

  // Its failure handler must return (block), never fall through to the create.
  const failHandler = code.slice(code.indexOf('catch (safetyErr)'), code.indexOf('catch (safetyErr)') + 600);
  expect(failHandler, 'the safety-failure handler must exist').toContain('setSubmitError');
  expect(failHandler, 'the safety-failure handler must stop the submission').toContain('return;');
  expect(failHandler, 'the safety-failure handler must never create the consultation')
    .not.toContain('Consultation.create');

  // And the message must be the honest one — nothing submitted, check never skipped.
  expect(code, 'the failure copy must say the check is never skipped').toContain('we never skip it');

  // A blocked verdict must never be defaulted away: the isBlocked branch survives.
  expect(code, 'the isBlocked hard stop must survive').toMatch(/if\s*\(safetyPayload\.isBlocked\)/);
});

test('CART: a RED-locked procedure combination cannot reach /intake', () => {
  // A red "Safety Review" banner next to a working "Continue to Consultation"
  // button is a decoration, not a block. The M Principle requires the
  // opposite: no path to /intake may exist while analyseCompatibility says RED.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');

  // The shared CTA (rendered on both the mobile summary and the desktop
  // sidebar) must branch on the cart's `locked` state, not render an
  // unconditional <Link to="/intake">.
  const cartList = strip(read('src/components/procedures/MyProceduresList.jsx'));
  expect(cartList, 'MyProceduresList must read the cart lock state').toContain('useCart');
  expect(cartList, 'the CTA must branch on locked before linking to /intake')
    .toMatch(/locked\s*\?[\s\S]{0,600}Link to="\/intake"/);

  // The catalog page's own "Book a Consultation" button must branch the
  // same way.
  const proceduresPage = strip(read('src/pages/Procedures.jsx'));
  expect(proceduresPage, 'the catalog page CTA must branch on locked before linking to /intake')
    .toMatch(/locked\s*\?[\s\S]{0,600}Link to="\/intake"/);

  // The one-click "add procedure from modal, then go straight to /intake"
  // shortcut adds a NEW item whose effect on cart safety isn't reflected in
  // React state until the next render — it must re-check compatibility on
  // the PROSPECTIVE cart (existing items + the one just added), not skip
  // straight to navigate() trusting the stale pre-add lock status.
  const bookFromModalIdx = proceduresPage.indexOf('const bookFromModal');
  expect(bookFromModalIdx, 'bookFromModal must exist').toBeGreaterThan(-1);
  const bookFromModalBody = proceduresPage.slice(bookFromModalIdx, bookFromModalIdx + 900);
  const redCheckIdx = bookFromModalBody.indexOf("level === 'RED'");
  const navigateIdx = bookFromModalBody.indexOf("navigate('/intake')");
  expect(redCheckIdx, 'bookFromModal must re-check compatibility on the prospective cart').toBeGreaterThan(-1);
  expect(navigateIdx, 'bookFromModal must still navigate on the safe path').toBeGreaterThan(-1);
  expect(redCheckIdx, 'the RED check must run before navigating to /intake').toBeLessThan(navigateIdx);
});

test('SAFETY: a high-risk condition escalates an already-selected procedure combo to RED', () => {
  // A patient can select procedures on /procedures BEFORE ever disclosing a
  // medical condition (procedure_interest is asked before medical_conditions
  // in questionGraph.js), so the RED-lock at selection time is condition-blind
  // by construction. If disclosing e.g. diabetes afterward doesn't re-run the
  // safety check, a combination the demo /demo/siobhan dramatizes as blocked
  // is, for real patients, silently allowed through at YELLOW forever.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');

  // The engine itself must be condition-aware, not just procedure-aware.
  const engine = strip(read('src/lib/procedureCompatibility.js'));
  expect(engine, 'the engine must import the shared high-risk condition list')
    .toContain('HIGH_RISK_CONDITIONS');
  expect(engine, 'analyseCompatibility must accept a conditions parameter')
    .toMatch(/function analyseCompatibility\(items,\s*conditions/);
  expect(engine, 'getViolations must accept a conditions parameter')
    .toMatch(/function getViolations\(items,\s*conditions/);
  expect(engine, 'a disclosed high-risk condition must be able to force RED on its own')
    .toMatch(/conditionRedFlag[\s\S]{0,80}=[\s\S]{0,40}totalAnesthesiaHrs\s*>=\s*5/);

  // CartContext — the single reactive source SafetyWatcher/SafetyPivotOverlay
  // and the /procedures CTAs all read from — must factor conditions into the
  // SAME safetyStatus computation as cart items, not track them separately.
  const cartContext = strip(read('src/context/CartContext.jsx'));
  expect(cartContext, 'CartContext must track disclosed medical conditions')
    .toContain('medicalConditions');
  expect(cartContext, 'safetyStatus must be computed from items AND medicalConditions')
    .toMatch(/analyseCompatibility\(items,\s*medicalConditions\)/);
  expect(cartContext, 'getViolations must also receive medicalConditions')
    .toMatch(/getViolations\(items,\s*medicalConditions\)/);

  // /intake (the primary flow): whenever the medical_conditions answer
  // changes, it must be pushed into the shared cart context so the existing
  // global SafetyWatcher can react — this is the literal "pass procedures
  // first, conditions arrive later" sequence.
  const intake = strip(read('src/pages/ConciergeIntake.jsx'));
  expect(intake, 'ConciergeIntake must read setMedicalConditions from the cart context')
    .toContain('setMedicalConditions');
  expect(intake, 'a change to answers.medical_conditions must push into the cart context')
    .toMatch(/setMedicalConditions\(answers\.medical_conditions/);

  // /booking (classic form): medical history (step 2) always precedes
  // procedures (step 8), so conditions must be passed into the existing
  // step-8 stacking check rather than silently ignored.
  const booking = strip(read('src/pages/Booking.jsx'));
  expect(booking, 'the step-8 stacking check must pass form.medical_conditions into getViolations')
    .toMatch(/getViolations\(items,\s*form\.medical_conditions/);
});

test('SAFETY: MedicalIntakeForm re-checks an already-selected procedure combo and only ever pauses on RED (never auto-refunds/re-quotes)', () => {
  // MedicalIntakeForm.jsx runs AFTER procedures were already selected and
  // possibly already paid for (Booking/ConciergeIntake/the /procedures cart).
  // It is the first point some entry paths collect the FULL medical history,
  // so a disclosed HIGH_RISK_CONDITIONS entry here can retroactively turn an
  // already-cleared combination into a genuine RED. Portia's explicit call:
  // the system may only PAUSE an already-committed case — resolution (refund,
  // re-quote, or proceed) is always a human decision, never automated here.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');
  const form = strip(read('src/pages/MedicalIntakeForm.jsx'));

  expect(form, 'must import the safety engine to re-run the check')
    .toContain('getViolations');
  expect(form, 'must reconstruct safety-engine procedure names from the enum keys already on the consultation')
    .toContain('toSafetyEngineName');
  expect(form, 'must fall back from selected_procedures to procedure_interest, same as ConciergeIntake')
    .toMatch(/selected_procedures\?\.\s*length[\s\S]{0,80}procedure_interest/);
  expect(form, 'must re-run getViolations with the freshly submitted conditions')
    .toMatch(/getViolations\(items,\s*form\.medical_conditions/);

  // On RED: flag + pause, reusing the exact fields Booking.jsx already sets so
  // iq200Pipeline's create-time gate holds a not-yet-created CaseRecord too.
  expect(form, 'a RED result must set high_risk_medical_review on the consultation')
    .toContain('high_risk_medical_review = true');
  expect(form, 'an already-existing CaseRecord must be paused to Admin-Review')
    .toMatch(/CaseRecord\.update\([\s\S]{0,60}status:\s*'Admin-Review'/);
  expect(form, 'a human must be alerted — notifySlackHighRisk must be invoked')
    .toContain("notifySlackHighRisk");

  // Never automate the resolution — no payment/refund/re-quote action anywhere
  // in this file. A future edit that "helpfully" wires one up must fail here.
  expect(form, 'MedicalIntakeForm must never touch payment/refund state')
    .not.toMatch(/payment_status|refund|requestDoctorQuotes/i);
});

test('PIPELINE: a real payment reliably creates a CaseRecord — the doctor marketplace is no longer dead on arrival', () => {
  // Found while wiring the signed-consent-to-doctor feature: iq200Pipeline's
  // `create` action (the only place a CaseRecord is built) required an admin
  // session; the one client-side caller (ConsultationFeeModal's
  // handlePaymentSuccess) ran as the paying PATIENT and always 403'd, silently
  // falling back to a dashboard redirect; stripePaymentWebhook's payment
  // handler never called it either. Net effect: no CaseRecord — and therefore
  // no doctor ever assigned — was created for any real paying patient.
  // pipelineOnConsultationFeePaid already fires reliably (cron-authorized
  // entity-trigger on ConsultationFee.fee_paid) and is now the guaranteed
  // trigger, calling the SAME logic in-process via a shared module rather than
  // an HTTP round-trip (base44.functions.invoke does not forward the
  // X-Cron-Secret header a service-to-service call would need).
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');

  const shared = strip(read('base44/functions/_shared/createCaseFromConsultation.ts'));
  expect(shared, 'the shared function must create the CaseRecord').toContain('CaseRecord.create(');
  expect(shared, 'the shared function must be idempotent (never double-create for the same consultation)')
    .toContain('already_exists');

  const pipeline = strip(read('base44/functions/iq200Pipeline/entry.ts'));
  expect(pipeline, "iq200Pipeline's create action must delegate to the shared function")
    .toMatch(/action === 'create'[\s\S]{0,120}createCaseFromConsultation\(/);

  const trigger = strip(read('base44/functions/pipelineOnConsultationFeePaid/entry.ts'));
  expect(trigger, 'the fee-paid trigger must import the shared case-creation function')
    .toContain("import { createCaseFromConsultation }");
  expect(trigger, 'it must call createCaseFromConsultation when no CaseRecord exists yet')
    .toMatch(/if\s*\(!caseRecord\)[\s\S]{0,200}createCaseFromConsultation\(/);
});

test('CONSENT: the signed liability/arbitration disclosure is archived onto the CaseRecord and reaches the doctor', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');

  // The archive must be built from data already durable on the Consultation
  // (captured at Booking.jsx submission, well before any payment call) — not
  // from anything a fragile client payment call would need to carry forward.
  const shared = strip(read('base44/functions/_shared/createCaseFromConsultation.ts'));
  expect(shared, 'signature/arbitration fields must be copied from the consultation onto the new CaseRecord')
    .toMatch(/signature_data:\s*consultation\.signature_data/);
  expect(shared, 'the archive must be built from the shared informedConsentArchive helper')
    .toContain('buildInformedConsentHtml(');
  expect(shared, 'the archive must be persisted onto the CaseRecord, not just emailed')
    .toContain('informed_consent_email_html');

  // ConsultationFeeModal must not ALSO fire the legacy consent email now that
  // the server-side path is reliable — that would double-send it to the client.
  const modal = strip(read('src/components/booking/ConsultationFeeModal.jsx'));
  expect(modal, 'ConsultationFeeModal must not call processInformedConsentAndEmail directly anymore')
    .not.toContain('processInformedConsentAndEmail');

  // The doctor must actually be able to see it — not just the client.
  const panel = strip(read('src/components/doctor-dashboard/SignedConsentPanel.jsx'));
  expect(panel, 'the doctor-facing consent view must never inject server-built HTML')
    .not.toContain('dangerouslySetInnerHTML');
  expect(panel, 'it must render the actual signature image the patient drew')
    .toContain('caseRecord.signature_data');

  const doctorDashboard = strip(read('src/pages/DoctorDashboard.jsx'));
  expect(doctorDashboard, 'DoctorDashboard must mount the signed-consent view for a doctor\'s cases')
    .toContain('<SignedConsentPanel');

  const portalDoctor = strip(read('src/pages/PortalDoctor.jsx'));
  expect(portalDoctor, 'the token-gated doctor portal must also mount it')
    .toContain('<SignedConsentPanel');
});

test('ONBOARDING: a guest completing partner signup is sent to sign in before their role is silently lost forever', () => {
  // Every partner signup route (/doctor-signup, /partner-signup/taxi-service,
  // /partner-signup/travel-agency) is fully public — reachable and completable
  // with zero authentication. Each Step3 submit created the partner ENTITY
  // (Doctor/TaxiService/TravelAgency) as a guest just fine, then called
  // saveUserOnboardingProfile → syncTenantRole to grant the account the
  // role its dashboard route requires (DOCTOR_PORTAL_ROLES etc. via
  // ProtectedRoute). That sync calls base44.auth.me() internally and throws
  // for a guest — silently swallowed by each caller's own try/catch — so the
  // entity existed but the account's role was never set. The person would
  // then sign in, land on their dashboard's ProtectedRoute gate, and see
  // "Access not available" — permanently, with no self-service recovery,
  // since re-running the sync itself requires being signed in as the
  // now-orphaned account with no UI path back to it.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');

  const files = [
    { path: 'src/components/doctor-signup/DoctorSignupStep3.jsx', create: 'Doctor.create(' },
    { path: 'src/components/partner-signup/TaxiServiceSignupStep3.jsx', create: 'TaxiService.create(' },
    { path: 'src/components/partner-signup/TravelAgencySignupStep3.jsx', create: 'TravelAgency.create(' },
    { path: 'src/pages/SecurityAgencySignup.jsx', create: 'SecurityAgency.create(' },
  ];

  for (const { path, create } of files) {
    const src = strip(read(path));
    expect(src, `${path} must import the shared signup auth gate`)
      .toContain("from '@/components/auth/SignupAuthGate'");
    expect(src, `${path} must check auth.me() before creating the partner entity`)
      .toMatch(/base44\.auth\.me\(\)\.catch/);

    const authCheckIdx = src.search(/base44\.auth\.me\(\)\.catch/);
    const createIdx = src.indexOf(create);
    expect(authCheckIdx, `${path} must have an auth check`).toBeGreaterThan(-1);
    expect(createIdx, `${path} must create the ${create.split('.')[0]} entity`).toBeGreaterThan(-1);
    expect(authCheckIdx, `${path} must check auth BEFORE creating the entity, not after`).toBeLessThan(createIdx);

    expect(src, `${path} must actually show the gate when unauthenticated, not just check`)
      .toMatch(/if\s*\(!currentUser\)[\s\S]{0,60}setShowAuthGate\(true\)/);
    expect(src, `${path} must mount <SignupAuthGate`).toContain('<SignupAuthGate');
  }

  // Companion signup splits the check (CompanionSignup.jsx) from the entity
  // creation + role sync (companionService.js) across two files — same
  // invariant, different shape, so it's asserted separately rather than
  // forced into the single-file loop above.
  const companionPage = strip(read('src/pages/CompanionSignup.jsx'));
  expect(companionPage, 'CompanionSignup.jsx must import the shared signup auth gate')
    .toContain("from '@/components/auth/SignupAuthGate'");
  expect(companionPage, 'CompanionSignup.jsx must check auth.me() before calling submitForm')
    .toMatch(/base44\.auth\.me\(\)\.catch[\s\S]{0,150}if\s*\(!currentUser\)[\s\S]{0,60}setShowAuthGate\(true\)[\s\S]{0,80}submitForm\(\)/);
  expect(companionPage, 'CompanionSignup.jsx must mount <SignupAuthGate').toContain('<SignupAuthGate');

  const companionService = strip(read('src/lib/companion/companionService.js'));
  expect(companionService, 'companionService.js must sync the companion role — this call was missing entirely before')
    .toMatch(/saveUserOnboardingProfile\(\{[\s\S]{0,40}role:\s*'companion'/);
});

test('ONBOARDING: the doctor welcome email links to a route that actually exists', () => {
  // sendPartnerWelcomeEmail built '/portal/doctor?token=...' (query string) for
  // a brand-new doctor, but the only route matching '/portal/doctor' is
  // '/portal/doctor/:token' (a PATH param) — the link 404'd. It was also the
  // wrong destination regardless: that page is a specific case review screen,
  // and a brand-new doctor has zero assigned cases. Must send them to the
  // real, login-gated /doctor-dashboard instead — same pattern already used
  // for the companion/security_agency welcome emails in this same file.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');
  const src = strip(read('base44/functions/sendPartnerWelcomeEmail/entry.ts'));
  const doctorBlockStart = src.indexOf("partner_type === 'doctor'");
  const doctorBlockEnd = src.indexOf("partner_type === 'travel_agency'");
  expect(doctorBlockStart, "the doctor branch must exist").toBeGreaterThan(-1);
  const doctorBlock = src.slice(doctorBlockStart, doctorBlockEnd);
  expect(doctorBlock, 'the doctor welcome link must point at the real dashboard route')
    .toContain("portalPath = `/doctor-dashboard`");
  expect(doctorBlock, 'it must not build a token for a case-scoped portal a brand-new doctor cannot use')
    .toMatch(/portalType\s*=\s*null/);
});

test('ONBOARDING: a guest completing client signup never gets stuck on a hung Saving button', () => {
  // saveUserOnboardingProfile requires an authenticated session; /client-signup
  // is a public route. An unhandled rejection here used to leave isSaving
  // stuck true forever for any guest who filled out the form logged out —
  // this is lower-severity than the partner flows (CLIENT_PORTAL_ROLES
  // already includes the default 'user' role) but still a real stuck-UI bug.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '');
  const src = strip(read('src/pages/ClientSignup.jsx'));
  expect(src, 'saveUserOnboardingProfile must be wrapped so a guest rejection cannot hang the submit button')
    .toMatch(/try\s*\{[\s\S]{0,40}await saveUserOnboardingProfile/);
});

test('FRONTEND: base44.asServiceRole never spreads — it throws in every browser', () => {
  // Service role only exists inside Base44-hosted backend functions. In the
  // browser the SDK's asServiceRole getter THROWS (no serviceToken), and even
  // optional chaining can't save a caller — the getter itself runs. Every
  // frontend touch is therefore a broken feature wearing a plausible screen:
  // empty admin boards, "no dietary profile" over real allergies, blank
  // first-responder manifests. 10 admin files were swapped to the user-scoped
  // client on 2026-07-19; the files below still contain real call sites and
  // are scheduled for backend endpoints (deployment-gated).
  //
  // This is a RATCHET:
  //   - a file NOT on the list may never reference asServiceRole in code
  //   - a file ON the list that no longer references it must be REMOVED
  // So the list only shrinks, and the class of bug cannot come back.
  //
  // 2026-07-20: the list is now empty — every W-A/W-B/W-C file identified in
  // the 2026-07-19 audit has been migrated to a user-scoped client call or a
  // backend function. Kept as an empty Set (not deleted) so the walk below
  // still runs and a stale re-add is caught immediately.
  const ALLOWED = new Set([]);

  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const offenders = [];
  const stale = [];

  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { walk(rel); continue; }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue;
      const hasRef = strip(read(rel)).includes('asServiceRole');
      if (ALLOWED.has(rel)) {
        if (!hasRef) stale.push(rel);
      } else if (hasRef) {
        offenders.push(rel);
      }
    }
  };
  walk('src');

  expect(offenders, `these frontend files touch asServiceRole (throws in the browser — use the user-scoped client or a backend function): ${offenders.join(', ')}`)
    .toEqual([]);
  expect(stale, `these files were fixed — remove them from the ratchet allowlist so it keeps shrinking: ${stale.join(', ')}`)
    .toEqual([]);
});

test('PARTNERS: nothing automated may mark a background check passed', () => {
  // A background check is about a person's criminal record. The only automated
  // signal this platform has is an AI scan of uploaded documents for tampering
  // and forgery — which says nothing about the holder. initiatePartnerVerification
  // used to write background_check_status:'passed' off that scan, and
  // activateVerifiedDoctor then read it as one of three clearances required to
  // make someone bookable by a patient.
  //
  // Only verifyDoctorBackground may set it, where a human decides and the
  // decision is recorded with their identity and audit-chained.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const auto = strip(read('base44/functions/initiatePartnerVerification/entry.ts'));
  expect(auto, 'an automated scan must never mark a background check passed')
    .not.toMatch(/background_check_status:\s*['"]passed['"]/);

  // And the gate must still refuse anything that is not positively cleared —
  // 'pending' is the default, so treating it as acceptable would open the door
  // for every partner who has simply never been checked.
  const gate = strip(read('base44/functions/activatePartner/entry.ts'));
  expect(gate, 'activatePartner must gate on background_check_status')
    .toMatch(/background_check_status/);
  expect(gate, "only 'passed' and 'manual_override' may count as cleared")
    .toMatch(/PASSED\s*=\s*new Set\(\[\s*['"]passed['"],\s*['"]manual_override['"]\s*\]\)/);
});

test('CLAIMS: the app does not advertise checks it does not perform', () => {
  // Nothing examines criminal history, and hotels have no verification path at
  // all. These three lines said otherwise on the two highest-traffic surfaces.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  expect(strip(read('src/components/home/HowItWorksModal.jsx')),
    'do not claim background-checked physicians until a background check exists')
    .not.toMatch(/background.?checked/i);

  expect(strip(read('src/components/home/LuxuryHero.jsx')),
    'do not claim vetted hotels — there is no hotel verification path')
    .not.toMatch(/vetted hotels/i);

  expect(strip(read('src/components/dashboard/PreDepartureBriefing.jsx')),
    'do not claim vetted transport until drivers gate on a cleared background check')
    .not.toMatch(/vetted transport/i);
});

test('RECOVERY GUIDANCE: the deterministic decision is written BEFORE the AI is invoked', () => {
  const src = read('base44/functions/draftRecoveryGuidance/entry.ts');
  const decisionIdx = src.indexOf("phase: 'decision'");
  const llmIdx = src.indexOf('InvokeLLM');
  expect(decisionIdx, 'decision record write must exist').toBeGreaterThan(-1);
  expect(llmIdx, 'AI drafting call must exist').toBeGreaterThan(-1);
  expect(decisionIdx, 'decision must be recorded before the AI runs').toBeLessThan(llmIdx);
});

test('RECOVERY GUIDANCE: the eligibility engine is deterministic and fails closed', () => {
  const src = read('base44/functions/_shared/recoveryGuidanceRules.ts');
  expect(src, 'must not call an LLM/AI').not.toMatch(/InvokeLLM|integrations\.Core/);
  expect(src).toContain('insufficient_information');
  expect(src).toContain('unknown_procedure');
  expect(src).toContain('no_active_recovery_session');
  expect(src).toContain('injection_detected');
});

test('RECOVERY GUIDANCE: the AI draft schema has no risk/approval field and never names a specific supplement', () => {
  const src = read('base44/functions/draftRecoveryGuidance/entry.ts');
  const schemaIdx = src.indexOf('response_json_schema');
  const schemaBlock = src.slice(schemaIdx, schemaIdx + 400);
  expect(schemaIdx, 'response_json_schema must exist').toBeGreaterThan(-1);
  expect(schemaBlock, 'the schema must not let the model return a risk/approval decision')
    .not.toMatch(/risk_level|approval|approved|dosage|dose/i);
  expect(src, 'the prompt must forbid naming a specific supplement/product/dose')
    .toMatch(/MUST NOT name any specific supplement/);
});

test('RECOVERY GUIDANCE: approval is refused server-side without an explicit interaction attestation', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = strip(read('base44/functions/reviewRecoveryGuidance/entry.ts'));
  const gateIdx = src.indexOf('interaction_attestation !== true');
  expect(gateIdx, 'a hard server-side attestation gate must exist').toBeGreaterThan(-1);
  const approveIdx = src.indexOf("recovery_guidance_text: text");
  expect(approveIdx, 'the CaseRecord write must exist').toBeGreaterThan(-1);
  expect(gateIdx, 'the attestation check must precede the CaseRecord write').toBeLessThan(approveIdx);
});

test('RECOVERY GUIDANCE: only reviewRecoveryGuidance\'s approve branch may write the patient-visible CaseRecord fields', () => {
  const draftSrc = read('base44/functions/draftRecoveryGuidance/entry.ts');
  expect(draftSrc, 'the drafting function must never write patient-visible guidance fields')
    .not.toMatch(/recovery_guidance_text:/);

  const guardSrc = read('src/components/patient/RecoveryGuidancePanel.jsx');
  expect(guardSrc, 'the patient panel must guard on the approved field before rendering anything')
    .toMatch(/if\s*\(\s*!caseRecord\?\.recovery_guidance_text\s*\)\s*return null/);
  const guardCode = guardSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(guardCode, 'must not inject raw HTML').not.toMatch(/dangerouslySetInnerHTML/);
});

test('RECOVERY GUIDANCE: no patient/generic-user role can read the reviewer-only draft or approval entities', () => {
  for (const entity of ['RecoveryGuidanceDraft', 'RecoveryGuidanceApproval']) {
    const src = read(`base44/entities/${entity}.jsonc`);
    const readIdx = src.indexOf('"read"');
    const createIdx = src.indexOf('"create"');
    expect(readIdx, `${entity} must define a read RLS block`).toBeGreaterThan(-1);
    const readBlock = src.slice(readIdx, createIdx > readIdx ? createIdx : readIdx + 300);
    expect(readBlock, `${entity} read RLS must be role-gated`).toMatch(/clinical_reviewer|admin|platform_admin/);
    expect(readBlock, `${entity} must not grant a blanket client/user email-match read path`)
      .not.toMatch(/data\.client_email|data\.email/);
  }
});

test('RECOVERY GUIDANCE: both edge functions gate on the clinical_reviewer role via createHandler', () => {
  for (const fn of ['draftRecoveryGuidance', 'reviewRecoveryGuidance']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src).toContain('createHandler');
    const optsIdx = src.lastIndexOf('allowedRoles');
    const opts = src.slice(optsIdx, optsIdx + 100);
    expect(opts, `${fn} must include clinical_reviewer in allowedRoles`).toContain('clinical_reviewer');
  }
});

test('PERFORMANCE: checkClinicStatus stays live-only — never wired into the memo cache', () => {
  // checkClinicStatus is the safety gate that must never proceed on cached
  // "open" status (see its own doc comment). A deliberate exclusion from the
  // memoCache pattern used elsewhere — this pins that exclusion so a future
  // "let's cache this too" edit doesn't silently regress the fail-safe read.
  const src = read('base44/functions/checkClinicStatus/entry.ts');
  expect(src).not.toMatch(/memoCache/);
  expect(src).toContain("we never proceed on cached \"open\" status");
});

test('PERFORMANCE: the shared in-memory cache helper is used by the intended read-heavy functions', () => {
  const helper = read('base44/functions/_shared/memoCache.ts');
  expect(helper).toContain('export function createMemoCache');
  expect(helper).toContain('export function createKeyedMemoCache');

  for (const fn of ['calculatePriceQuote', 'getGeolocationAndCurrency', 'matchDoctorsForProcedure', 'intakePartnerAvailabilityPreview']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} should import the shared memo cache`).toMatch(/from ['"]\.\.\/_shared\/memoCache\.ts['"]/);
  }
});

test('PERFORMANCE: getVisaRequirement only ever caches a confirmed-fresh snapshot, never a stale/missing one', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = strip(read('base44/functions/getVisaRequirement/entry.ts'));
  const freshCheckIdx = src.indexOf('isFresh(cached.last_confirmed_at');
  const cacheSetIdx = src.indexOf('freshSnapshotCache.set(');
  expect(freshCheckIdx, 'freshness check must exist').toBeGreaterThan(-1);
  expect(cacheSetIdx, 'the memo cache write must exist').toBeGreaterThan(-1);
  // The set() call must be textually inside the `if (cached && isFresh(...))`
  // block, i.e. appear after the freshness check and before the function's
  // stale/missing fallback path begins.
  expect(freshCheckIdx, 'the memo cache must only be populated after the freshness check').toBeLessThan(cacheSetIdx);
  const stalePathIdx = src.indexOf('fetchVisaRequirement(base44, nat, dest)');
  expect(stalePathIdx, 'the live re-check call must exist').toBeGreaterThan(-1);
  expect(cacheSetIdx, 'the cache write must happen before the stale/missing refresh path').toBeLessThan(stalePathIdx);
});

test('PERFORMANCE: EmergencyHub and EmergencyMedCard share one active-case cache entry, not two independent fetches', () => {
  const hub = read('src/pages/EmergencyHub.jsx');
  const card = read('src/pages/EmergencyMedCard.jsx');
  expect(hub, 'EmergencyHub must use the shared active-case fetcher').toMatch(/from ['"]@\/hooks\/useActiveCaseRecord['"]/);
  expect(card, 'EmergencyMedCard must use the shared active-case fetcher').toMatch(/from ['"]@\/hooks\/useActiveCaseRecord['"]/);
  expect(hub).toContain('activeCaseQueryKey');
  expect(card).toContain('useActiveCaseRecord');
});

test('PERFORMANCE: AdminImports invalidates the query cache after a successful bulk import', () => {
  const src = read('src/pages/AdminImports.jsx');
  const successIdx = src.indexOf('onSuccess:');
  const invalidateIdx = src.indexOf('invalidateQueries');
  expect(successIdx, 'onSuccess handler must exist').toBeGreaterThan(-1);
  expect(invalidateIdx, 'invalidateQueries call must exist').toBeGreaterThan(-1);
  expect(successIdx).toBeLessThan(invalidateIdx);
});
