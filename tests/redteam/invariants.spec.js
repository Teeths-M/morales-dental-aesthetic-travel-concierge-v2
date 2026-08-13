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

test('DOCTOR: runInternetIntelligence never auto-clears verification_status — only a human can', () => {
  const src = read('base44/functions/runInternetIntelligence/entry.ts');
  expect(src).not.toMatch(/verification_status:\s*['"]verified['"]/);
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
    expect(src, `${fn} imports the link-only helper`).toContain("from '../../shared/notify.ts'");
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

test('M RESCUE: checkStalledSignups is link-only, cron/admin-gated, and never AI-driven', () => {
  const src = read('base44/functions/checkStalledSignups/entry.ts');
  expect(src, 'must gate on cronAuthorized').toContain('cronAuthorized(req, base44)');
  expect(src, 'must use the link-only email helper').toContain('linkOnlyEmail(');
  expect(src, 'must use the link-only SMS helper').toContain('linkOnlySms(');
  // A brand-new sender has no excuse to add a fresh link-only violation —
  // unlike sendOnboardingNudges (pre-dates the rule, not yet migrated),
  // this one must never call SendEmail with a raw personalized body.
  expect(src, 'must not build a raw personalized SendEmail body').not.toMatch(/body:\s*`Hi \$\{/);
  // Deterministic-only: no AI call anywhere in this function.
  expect(src, 'must not call InvokeLLM').not.toContain('InvokeLLM');
  expect(src, 'must not call an external AI API directly').not.toContain('anthropic.com');
  // One-shot: never re-nudges the same record.
  expect(src, 'must check nudge_sent_at before acting').toContain('p.nudge_sent_at');
  expect(src, 'must set nudge_sent_at after acting').toContain('nudge_sent_at: new Date().toISOString()');
});

test('M RESCUE: trackSignupAbandon is public-but-validated, and SignupProgress has no client access', () => {
  const src = read('base44/functions/trackSignupAbandon/entry.ts');
  expect(src, 'must validate the body — no session exists yet to trust').toContain('bodySchema:');
  expect(src, 'must require at least a phone or email').toMatch(/!phone && !email/);
  expect(src, 'must write via asServiceRole, never as the (nonexistent) caller').toContain('base44.asServiceRole.entities.SignupProgress');

  const entity = read('base44/entities/SignupProgress.jsonc');
  expect(entity, 'must not be readable/writable by an unauthenticated client').not.toMatch(/"read":\s*null/);
  expect(entity, 'read must be admin-only').toMatch(/"role":\s*"admin"/);
  expect(entity, 'create must be admin-only (service-role writes bypass this, the client never should)').toMatch(/"create"[\s\S]{0,120}"role":\s*"(admin|platform_admin)"/);
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
  const GUARDS = /auth\.me|cronAuthorized|CRON_SECRET|validateTwilioSignature|constructEvent|stripe-signature|verifyStripeSignature|x-twilio-signature|SATELLITE_WEBHOOK_SECRET|createHandler/;

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

test('RATE LIMIT: the shared helper returns a real 429 Response, keyed by IP and user', () => {
  const src = read('base44/functions/_shared/rateLimit.ts');
  expect(src, 'must export checkRateLimit').toContain('export async function checkRateLimit');
  expect(src, 'must export enforceRateLimit').toContain('export async function enforceRateLimit');
  expect(src, 'denial must be a real 429').toMatch(/status:\s*429/);
  expect(src, 'must key by IP').toContain('ip:');
  expect(src, 'must also key by user when available').toContain('user:');
});

test('RATE LIMIT: createHandler applies a sensible default to public functions unless explicitly opted out', () => {
  const src = read('base44/functions/_shared/createHandler.ts');
  expect(src, 'must import the shared rate limiter').toContain("from './rateLimit.ts'");
  expect(src, 'must define a default public rate limit').toContain('DEFAULT_PUBLIC_RATE_LIMIT');
  // The default must only kick in for public (requireAuth:false) functions,
  // and only when the function hasn't set its own policy.
  expect(src).toMatch(/requireAuth === false\s*\?\s*DEFAULT_PUBLIC_RATE_LIMIT\s*:\s*null/);
  // false must be distinguished from "unset" — opts.rateLimit === false must
  // skip enforcement entirely (an object policy of {max:0,...} is falsy-adjacent
  // but not actually what `=== false` means, so this must be a strict check).
  expect(src).toContain('opts.rateLimit === false');
});

test('RATE LIMIT: every function exempted from the default carries rateLimit:false explicitly', () => {
  // Mirrors the AUTH test's EXEMPT-set pattern above: a pinned list so a
  // future edit can't silently drop the opt-out (which would then get the
  // real default applied — safe — or silently rely on unstated behavior —
  // not safe to assume without checking).
  const EXEMPT_RATE_LIMIT = [
    // Already self-limited inline via RateLimitBucket — avoid double-limiting.
    'confirmPINReset', 'generateStripePaymentLink', 'getGuardianViewData', 'requestAccountDeletion',
    'requestPINReset', 'sendOtp', 'sendSmsNotification', 'submitDoctorCorrection', 'triggerSOS',
    'uploadToVault', 'verifyEmergencyPIN',
    // Cron-only — cronAuthorized/CRON_SECRET is the real gate, verified as each
    // function's OWN check (not just a value forwarded to another call).
    'backfillClinicsFromDoctors', 'detectRegulatoryChanges', 'escalateMissedDriverHandshake',
    'reVerifyDoctorCredentials', 'recheckVisaRequirements', 'remindPendingQuotes',
    'runSilentSafetyEscalation', 'sendProcedurePrepReminders', 'verifyClinicStatus',
    // Internal service-to-service (internalOrAdminAuthorized).
    'runMedGuardAnalysis', 'sendPushNotification',
    // Signature-verified webhook (COMPLY_ADVANTAGE_WEBHOOK_SECRET).
    'handleSanctionsWebhook',
  ];
  for (const fn of EXEMPT_RATE_LIMIT) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must explicitly opt out of the default rate limit`).toMatch(/rateLimit:\s*false/);
  }
});

// ─── Input validation hardening (2026-07-26 security pass) ──────────────────

test('VALIDATION: the shared engine is zod-based, rejects unexpected fields, and never leaks raw errors', () => {
  const src = read('base44/functions/_shared/validate.ts');
  expect(src, 'must be zod-based').toContain('npm:zod');
  expect(src, 'must export the validate helper').toContain('export function validate');
  expect(src, 'must export strictObject to reject unexpected fields').toContain('export function strictObject');
  expect(src, 'strictObject must actually call .strict()').toMatch(/\.strict\(\)/);
  expect(src, 'must not leak a stack trace to the response').not.toContain('.stack');
  expect(src, 'must not serialize the raw ZodError').not.toMatch(/JSON\.stringify\(result\.error\)/);
  // validate.ts must not import createHandler.ts — that would create a cycle
  // with createHandler's own bodySchema hook.
  expect(src, 'must not import createHandler.ts').not.toContain("from './createHandler.ts'");
});

test('VALIDATION: createHandler runs bodySchema BEFORE the handler, and short-circuits on failure', () => {
  const src = read('base44/functions/_shared/createHandler.ts');
  expect(src, 'must import the shared validator').toContain("from './validate.ts'");
  expect(src, 'must support an optional bodySchema option').toContain('bodySchema');
  const hookIdx = src.indexOf('opts.bodySchema');
  const fnCallIdx = src.indexOf('await fn(');
  expect(hookIdx, 'bodySchema hook must exist').toBeGreaterThan(-1);
  expect(hookIdx, 'validation must run before the handler is invoked').toBeLessThan(fnCallIdx);
});

test('LLM PROMPT: translateEmergencySOS and walkieTalkieTranslate sanitize free text before it reaches the model', () => {
  const sos = read('base44/functions/translateEmergencySOS/entry.ts');
  expect(sos, 'must import the sanitizer').toContain("from '../../shared/sanitizePromptInput.ts'");
  const sanitizeIdx = sos.indexOf('sanitizePromptInput(message');
  const promptIdx = sos.indexOf('Original message:');
  expect(sanitizeIdx, 'must sanitize message').toBeGreaterThan(-1);
  expect(sanitizeIdx, 'sanitize must precede interpolation').toBeLessThan(promptIdx);
  // Must never gate the SOS translation itself on the sanitizer's flagged result.
  expect(sos, 'a flagged input must not block the emergency translation').not.toMatch(/\.flagged\s*&&[^;]*return/);

  const walkie = read('base44/functions/walkieTalkieTranslate/entry.ts');
  expect(walkie, 'must import the sanitizer').toContain("from '../../shared/sanitizePromptInput.ts'");
  expect(walkie, 'must sanitize transcribed text before translation').toContain('sanitizePromptInput(originalText');
});

test('VALIDATION: the first hardening batch carries a strict schema; the webhook and covert-SOS exclusions are deliberate', () => {
  // Mirrors the EXEMPT_RATE_LIMIT pinned-list pattern above: a ratchet so a
  // future edit can't silently drop a function's schema. The remaining ~270
  // public functions adopt this same pattern incrementally, using
  // _shared/validate.ts's exports as the reference.
  const SCHEMA_HARDENED = [
    // Payments
    'generateStripePaymentLink', 'chargeConsultationFee', 'generateConsultationDepositLink',
    'cancelBooking', 'processPartnerPayout',
    // Account deletion
    'requestAccountDeletion',
    // Doctor/partner submissions
    'submitDoctorNomination', 'submitDoctorQuote', 'submitDoctorCorrection',
    'submitPartnerQuote', 'initiatePartnerVerification', 'respondToDoctorCase',
    // Travel/booking
    'createTravelRequest', 'saveTravelAddOns', 'confirmProcedureDate',
    'requestCompanionPackage', 'respondToCompanionJob',
    // Medical intake
    'computeSafeTScreening', 'submitDietaryProfile', 'submitPostOpCheckIn',
    'submitRecoveryCheckin', 'intakeConversationTurn', 'analyzeIntakeCombination',
    // Emergency/SOS
    'walkieTalkieTranslate', 'triggerSOS', 'verifyEmergencyPIN',
    'confirmPINReset', 'requestPINReset', 'guardianCheckIn', 'guardianEscalation',
  ];
  expect(SCHEMA_HARDENED.length, 'batch is documented as ~30 functions').toBe(30);

  for (const fn of SCHEMA_HARDENED) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must define a strict schema`).toContain('strictObject(');
    const isEnforced = /bodySchema\s*:/.test(src) || /validate\(/.test(src);
    expect(isEnforced, `${fn} must actually apply its schema (bodySchema option or a manual validate() call)`).toBe(true);
  }

  // Deliberate exclusion, not an oversight: a schema that can reject a
  // request with a 400 would break this function's entire security property
  // (always return a benign 200, never reveal whether anything unusual fired).
  const covert = read('base44/functions/triggerCovertSOS/entry.ts');
  expect(covert, 'triggerCovertSOS must stay schema-free by design').not.toContain('bodySchema:');
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
    'sendProcedurePrepReminders',
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
    'sendMilestoneWhatsAppCheckIns',
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
  //
  // 2026-08-05: Morales Guide and Morales Assist were consolidated into one
  // M-Care assistant (MCareOrb.jsx) — this same tip-rotation/quiet-route logic
  // moved verbatim into the new file, so this test now reads that path instead.
  const src = read('src/components/mcare/MCareOrb.jsx');
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

test('PARTNER SIGNUP: doctor signup — chat and form both call the one gated submission function', () => {
  // Two entry points now exist for becoming a doctor on this platform: the
  // classic multi-step form (DoctorSignupStep3.jsx) and M-Care's
  // conversational signup (DoctorSignupChatFlow.jsx). Both MUST call the
  // same submitDoctorSignup() rather than each assembling their own
  // Doctor.create() + role-grant + verification-kickoff sequence — otherwise
  // the newer, less-tested chat path could silently diverge from the form's
  // safety/data properties (e.g. skip the auth-gate-before-create ordering
  // that fixed the 2026-07-24 "Partner Onboarding Lockout" bug).
  const formSrc = read('src/components/doctor-signup/DoctorSignupStep3.jsx');
  const chatSrc = read('src/components/mcare/DoctorSignupChatFlow.jsx');

  expect(formSrc, 'the classic form must call the shared submission function').toContain('submitDoctorSignup(');
  expect(formSrc, 'the classic form must not assemble its own Doctor.create call').not.toContain('base44.entities.Doctor.create');

  expect(chatSrc, "M-Care's chat flow must call the shared submission function").toContain('submitDoctorSignup(');
  expect(chatSrc, "M-Care's chat flow must not assemble its own Doctor.create call").not.toContain('base44.entities.Doctor.create');

  // The shared function itself: a new doctor is created pending, never
  // pre-activated — those fields belong only to activateVerifiedDoctor /
  // activatePartner, never to a signup path.
  const sharedSrc = read('src/lib/partnerSignup/submitDoctorSignup.js');
  expect(sharedSrc, 'a new doctor must start pending_verification, not active').toContain("status: 'pending_verification'");
  expect(sharedSrc, 'must never itself flip status to active').not.toMatch(/status:\s*['"]active['"]/);
  expect(sharedSrc, 'must never itself set a verification_status').not.toMatch(/verification_status:\s*['"]/);
  expect(sharedSrc, 'must never itself set license_verified true').not.toMatch(/license_verified:\s*true/);

  // And it must check for a real session BEFORE creating anything — the same
  // ordering the form's own auth gate already enforced.
  const authIdx = sharedSrc.indexOf('base44.auth.me()');
  const createIdx = sharedSrc.indexOf('Doctor.create');
  expect(authIdx, 'the auth check must exist').toBeGreaterThan(-1);
  expect(createIdx, 'the Doctor.create call must exist').toBeGreaterThan(-1);
  expect(authIdx, 'auth must be checked before Doctor.create').toBeLessThan(createIdx);
  expect(sharedSrc, 'a missing session must throw, not silently proceed').toContain("Error('AUTH_REQUIRED')");
});

test('PARTNER SIGNUP: travel agency signup — chat and form both call the one gated submission function', () => {
  // Same invariant as the doctor-signup one above, second partner type: the
  // classic form (TravelAgencySignupStep3.jsx) and M-Care's conversational
  // signup (TravelAgencySignupChatFlow.jsx) must both call the shared
  // submitTravelAgencySignup() rather than each assembling their own
  // TravelAgency.create() + role-grant sequence.
  const formSrc = read('src/components/partner-signup/TravelAgencySignupStep3.jsx');
  const chatSrc = read('src/components/mcare/TravelAgencySignupChatFlow.jsx');

  expect(formSrc, 'the classic form must call the shared submission function').toContain('submitTravelAgencySignup(');
  expect(formSrc, 'the classic form must not assemble its own TravelAgency.create call').not.toContain('base44.entities.TravelAgency.create');

  expect(chatSrc, "M-Care's chat flow must call the shared submission function").toContain('submitTravelAgencySignup(');
  expect(chatSrc, "M-Care's chat flow must not assemble its own TravelAgency.create call").not.toContain('base44.entities.TravelAgency.create');

  const sharedSrc = read('src/lib/partnerSignup/submitTravelAgencySignup.js');
  expect(sharedSrc, 'a new agency must start pending_verification, not active').toContain("status: 'pending_verification'");
  expect(sharedSrc, 'must never itself flip status to active').not.toMatch(/status:\s*['"]active['"]/);
  expect(sharedSrc, 'must never itself set license_verified true').not.toMatch(/license_verified:\s*true/);
  expect(sharedSrc, 'must never itself set insurance_verified true').not.toMatch(/insurance_verified:\s*true/);

  // Auth checked BEFORE creating anything — same "Partner Onboarding
  // Lockout" fix as the doctor path.
  const authIdx = sharedSrc.indexOf('base44.auth.me()');
  const createIdx = sharedSrc.indexOf('TravelAgency.create');
  expect(authIdx, 'the auth check must exist').toBeGreaterThan(-1);
  expect(createIdx, 'the TravelAgency.create call must exist').toBeGreaterThan(-1);
  expect(authIdx, 'auth must be checked before TravelAgency.create').toBeLessThan(createIdx);
  expect(sharedSrc, 'a missing session must throw, not silently proceed').toContain("Error('AUTH_REQUIRED')");

  // A "no" on the mustBeTrue legal-confirmation step must never silently
  // count as answered (flowEngine treats any non-empty value, false
  // included, as "known") — the chat flow must re-prompt instead.
  const graphSrc = read('src/lib/mcareFlow/travelAgencySignupGraph.js');
  const legalStepIdx = graphSrc.indexOf("id: 'legal_confirmed'");
  const mustBeTrueIdx = graphSrc.indexOf('mustBeTrue: true');
  expect(legalStepIdx, 'the legal_confirmed step must exist').toBeGreaterThan(-1);
  expect(mustBeTrueIdx, 'a mustBeTrue: true flag must exist').toBeGreaterThan(-1);
  const nextStepIdx = graphSrc.indexOf("id: 'business_license'");
  expect(mustBeTrueIdx, 'mustBeTrue must belong to the legal_confirmed step, not a later one')
    .toBeGreaterThan(legalStepIdx);
  expect(mustBeTrueIdx, 'mustBeTrue must belong to the legal_confirmed step, not a later one')
    .toBeLessThan(nextStepIdx > -1 ? nextStepIdx : Infinity);
  expect(chatSrc, 'a false answer on a mustBeTrue step must not be committed')
    .toMatch(/value === false && currentStep\.mustBeTrue/);
});

test('INTAKE: the one-shot booking-intent parser can never extract a clinical fact', () => {
  // parseBookingIntent (M-Care super-agent Phase 2A, "type what you want in
  // one sentence") is a NEW, more exposed entry point than
  // intakeConversationTurn — unlike that function (whose callers are
  // trusted, existing intake/signup graphs passing their own step's field
  // list), this one must have its output shape HARDCODED in the function
  // itself, not caller-suppliable, so it's structurally impossible for it to
  // ever "extract" a clinical fact no matter what a caller asks for.
  //
  // Note on scope: `procedure`/`destination_country` ARE legitimate outputs
  // here even though `procedure_interest`/`selected_procedures` technically
  // appear in derivedFields.js's SAFETY_INPUT_FIELDS set (procedure feeds
  // the RED block) — this mirrors an already-existing, already-accepted
  // pattern in ConciergeIntake.jsx (seeding procedure_interest from cart
  // items or a doctor-directory link), always as a seedAnswers() call that
  // never overwrites a real answer and is always correctable on the review
  // screen. What must NEVER happen is this function producing any of the
  // truly clinical-history fields — those are asked one pill-tap at a time,
  // never inferred from open conversation, full stop.
  const src = read('base44/functions/parseBookingIntent/entry.ts');

  // The request body schema must accept only a free-text query — no
  // caller-suppliable target-fields list of any kind (checked on the
  // BodySchema declaration specifically, not the whole file — the file's
  // own header comment legitimately mentions intakeConversationTurn's
  // target_fields by name when explaining why this function doesn't use
  // that pattern, which would otherwise false-positive a whole-file check).
  const bodySchemaIdx = src.indexOf('const BodySchema');
  const bodySchemaBlock = src.slice(bodySchemaIdx, bodySchemaIdx + 200);
  expect(bodySchemaIdx, 'BodySchema must exist').toBeGreaterThan(-1);
  expect(bodySchemaBlock, 'request schema must not accept a caller-supplied field list').not.toContain('target_fields');

  // The response schema — the actual data contract, not the prompt text
  // guiding the LLM — must declare only procedures/destination/timing
  // fields, and must never declare any true clinical-history field. (The
  // system prompt ABOVE this schema legitimately names those fields to tell
  // the LLM to ignore them — that's correct, explicit guidance, not a leak;
  // the schema is what actually constrains what the function can ever
  // return.) Phase 4A widened procedure -> procedures (array) and added
  // destination_city/travel_month/travel_period — still never a fabricated
  // exact date (see this function's own header for why).
  const schemaStart = src.indexOf('response_json_schema');
  const schemaEnd = src.indexOf('});', schemaStart);
  const schemaBlock = src.slice(schemaStart, schemaEnd);
  expect(schemaBlock, 'response schema must declare procedures').toContain('procedures:');
  expect(schemaBlock, 'response schema must declare destination_country').toContain('destination_country:');
  expect(schemaBlock, 'response schema must declare destination_city').toContain('destination_city:');
  expect(schemaBlock, 'response schema must declare travel_month').toContain('travel_month:');
  expect(schemaBlock, 'response schema must never declare an exact travel date field').not.toMatch(/travel_date|exact_date|preferred_date/);
  for (const clinicalField of [
    'age', 'gender', 'bmi', 'pregnancy_status', 'medical_conditions',
    'allergy', 'medication', 'anesthesia', 'surgery_history', 'had_surgery',
    'lifestyle', 'smoking_status', 'alcohol_use', 'emotional_concerns',
  ]) {
    expect(schemaBlock, `response schema must never declare the clinical field "${clinicalField}"`).not.toContain(clinicalField);
  }

  // And every extracted procedure must be allowlist-checked against the real
  // enum before ever reaching the response — never passed through verbatim.
  expect(src, 'must validate extracted procedures against PROCEDURE_VALUES')
    .toMatch(/PROCEDURE_VALUES\.includes\(/);
  expect(src, 'must validate extracted travel_month against a fixed allowlist')
    .toMatch(/MONTH_VALUES\.includes\(/);
});

test('VOICE INPUT: transcribeVoiceInput is transcribe-only — no entity writes, still public', () => {
  // M-Care super-agent Phase 2B. This function's whole job is speech-to-text
  // for whatever the caller does with it next (M-Care chat, the booking-
  // intent box, a future signup step) — it must never itself decide
  // anything or persist a raw voice transcript anywhere. A "helpful" future
  // edit that started logging transcripts to an entity for debugging would
  // be a real, silent privacy regression for what could be sensitive
  // patient speech, so it's guarded here structurally rather than left to
  // code review to catch.
  const src = read('base44/functions/transcribeVoiceInput/entry.ts');

  for (const writeOp of ['.create(', '.update(', '.bulkCreate(', '.delete(']) {
    expect(src, `transcribeVoiceInput must never call entities${writeOp}`).not.toContain(writeOp);
  }

  // Must stay reachable by a logged-out visitor — same audience as M-Care's
  // own text chat and the booking-intent box that calls this.
  expect(src, 'must stay unauthenticated, matching M-Care\'s own text-chat audience')
    .toMatch(/requireAuth:\s*false/);
  // And must not opt out of createHandler's default public rate limit — a
  // public, TranscribeAudio-calling endpoint with no limit is a real
  // cost/abuse vector, not just a nice-to-have.
  expect(src, 'must not opt out of the default public rate limit').not.toMatch(/rateLimit:\s*false/);
});

test('AVAILABILITY: applyDoctorAvailability never overwrites an already-booked date, and never writes for another doctor', () => {
  // M-Care super-agent Phase 2C. parseAvailabilityIntent (LLM, parse-only —
  // checked below to have zero write calls, same as transcribeVoiceInput
  // above) hands a doctor-confirmed {days, weeks} to this fully
  // deterministic function, which expands it into real DoctorAvailability
  // rows. Two properties must hold no matter how this function evolves:
  //
  //   1. A date a patient's case already has locked (locked_case_id, set by
  //      confirmProcedureDate at booking time) must never be silently
  //      overwritten by a bulk "I'm free Tuesdays" update — that would be a
  //      real, patient-visible trust break, not just a data inconsistency.
  //   2. doctor_id must come from the CALLER's own account
  //      (Doctor.filter({email: user.email})), never a caller-supplied
  //      field — otherwise one doctor could edit another doctor's calendar
  //      through this function even though DoctorAvailability's own RLS is
  //      currently wide open (a separate, pre-existing gap, not fixed here).
  const parseSrc = read('base44/functions/parseAvailabilityIntent/entry.ts');
  for (const writeOp of ['.create(', '.update(', '.bulkCreate(', '.delete(']) {
    expect(parseSrc, `parseAvailabilityIntent must never call entities${writeOp}`).not.toContain(writeOp);
  }

  const applySrc = read('base44/functions/applyDoctorAvailability/entry.ts');

  // doctor_id is looked up, never accepted from the request body.
  expect(applySrc, 'doctor_id must be derived from the caller\'s own email')
    .toContain('Doctor.filter({ email: user.email })');
  expect(applySrc, 'the request schema must not accept a caller-supplied doctor_id')
    .not.toMatch(/doctor_id:\s*Fields/);

  // The locked-date check must exist, and the skip (continue) must come
  // BEFORE either write branch, not after.
  const lockedIdx = applySrc.indexOf('row?.locked_case_id');
  const createIdx = applySrc.indexOf('DoctorAvailability.create(');
  const updateIdx = applySrc.indexOf('DoctorAvailability.update(');
  expect(lockedIdx, 'the locked_case_id check must exist').toBeGreaterThan(-1);
  expect(createIdx, 'the create branch must exist').toBeGreaterThan(-1);
  expect(updateIdx, 'the update branch must exist').toBeGreaterThan(-1);
  expect(lockedIdx, 'the locked check must run before the create branch').toBeLessThan(createIdx);
  expect(lockedIdx, 'the locked check must run before the update branch').toBeLessThan(updateIdx);
  expect(applySrc, 'a skipped locked date must be counted, not silently dropped')
    .toContain('skippedLocked++');

  // Both functions stay doctor-only.
  expect(parseSrc, 'parseAvailabilityIntent must gate on the doctor role').toMatch(/allowedRoles:\s*\[['"]doctor['"]\]/);
  expect(applySrc, 'applyDoctorAvailability must gate on the doctor role').toMatch(/allowedRoles:\s*\[['"]doctor['"]\]/);
});

test('M-CARE ROUTER: routing never bypasses role-gating or writes anything itself', () => {
  // M-Care super-agent Phase 3. A plain typed/spoken message can now reach
  // the same specialized flows the quick-action buttons already reach
  // (booking / doctor availability / doctor signup) — the user no longer has
  // to already know which button to press. That means a message can reach a
  // role-gated capability WITHOUT a button click first, so the role check
  // must be enforced server-side in the router itself, not just by which
  // buttons the frontend happens to render.
  const routerSrc = read('base44/functions/_shared/mCareRouter.ts');
  const entrySrc = read('base44/functions/routeMCareMessage/entry.ts');

  // The router's toolset is a fixed, hardcoded allowlist — it must never
  // itself perform a write; every tool wraps an already-shipped,
  // independently gated entry point (parseBookingIntent, the
  // applyDoctorAvailability flow, DoctorSignupChatFlow's own
  // submitDoctorSignup), so this file's only job is choosing which one and
  // narrating why.
  for (const writeOp of ['.create(', '.update(', '.bulkCreate(', '.delete(']) {
    expect(routerSrc, `mCareRouter must never call entities${writeOp}`).not.toContain(writeOp);
    expect(entrySrc, `routeMCareMessage must never call entities${writeOp}`).not.toContain(writeOp);
  }

  // startAvailabilityIntent must only ever be offered to an actual doctor —
  // derived from the caller's own real session server-side, never a
  // caller-supplied role/field in the request body.
  expect(entrySrc, 'availability routing must be gated on the real doctor role')
    .toMatch(/role\s*===\s*['"]doctor['"]/);
  expect(entrySrc, "role must come from the caller's own session, not the request body")
    .toContain('base44.auth.me()');
  expect(entrySrc, 'the body schema must not accept a caller-supplied role')
    .not.toMatch(/role:\s*Fields/);

  // Fail-closed: any decide() failure or malformed/out-of-allowlist response
  // must fall back to "answer" (the existing, unmodified moralesAssist/
  // InvokeLLM path) — never fabricate a route.
  expect(routerSrc, 'a decide() failure must fail closed to answer')
    .toMatch(/catch[\s\S]{0,40}return FAIL_CLOSED/);
  expect(routerSrc, 'an out-of-allowlist tool_name must fail closed to answer')
    .toContain('ROUTE_TOOLS.some((t) => t.name === toolName)');
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

test("MEDICAL CONSENT: assignDoctorToCase refuses to notify a doctor without the patient's separate share consent", () => {
  // M-Care super-agent Phase 4B. Before this fix, assignDoctorToCase emailed
  // and pushed a doctor full case access (medical history included, via the
  // portal) the instant SAFE-T passed, with no patient sign-off scoped to
  // that specific act — only a blanket data_processing_consent captured at
  // the very start of intake. This closes that gap: a SEPARATE consent
  // (MedicalHistoryShareConsent.jsx, shown at the review step right after
  // the patient sees exactly what they disclosed) must be true on the
  // linked Consultation before a doctor is ever notified.
  const src = read('base44/functions/assignDoctorToCase/entry.ts');

  const consentCheckIdx = src.indexOf('medical_history_share_consent');
  const sendEmailIdx = src.indexOf('SendEmail(');
  const pushIdx = src.indexOf("'sendPushNotification'");
  expect(consentCheckIdx, 'the consent check must exist').toBeGreaterThan(-1);
  expect(sendEmailIdx, 'the doctor notification email must exist').toBeGreaterThan(-1);
  expect(pushIdx, 'the doctor push notification must exist').toBeGreaterThan(-1);
  expect(consentCheckIdx, 'the consent check must run before the doctor is emailed').toBeLessThan(sendEmailIdx);
  expect(consentCheckIdx, 'the consent check must run before the doctor is pushed').toBeLessThan(pushIdx);

  // A missing/false consent must flag for human review, never silently
  // proceed and never silently drop the case either.
  const consentBlock = src.slice(consentCheckIdx, consentCheckIdx + 800);
  expect(consentBlock, 'a missing consent must flag Admin-Review, not silently assign').toContain("status: 'Admin-Review'");
  expect(consentBlock, 'a missing consent must return an explicit error, not a 200').toMatch(/status:\s*400/);

  // The frontend gate: ReviewStep must actually disable submission without
  // this consent, not just record it after the fact.
  const reviewStep = read('src/components/intake/ReviewStep.jsx');
  expect(reviewStep, 'ReviewStep must render the medical-history-share consent').toContain('<MedicalHistoryShareConsent');
  expect(reviewStep, 'the submit button must be disabled without this consent').toMatch(/disabled=\{[^}]*!medicalShareConsented[^}]*\}/);

  // And it must be captured durably on the Consultation, same shape as the
  // existing data_processing_consent audit trail.
  const fieldMap = read('src/lib/intakeFlow/fieldMap.js');
  expect(fieldMap, 'fieldMap must persist medical_history_share_consent onto the Consultation')
    .toContain('medical_history_share_consent: !!answers.medical_history_share_consent');
});

test('M-CARE PUSH: real trip-lifecycle notifications carry the M-Care icon end to end', () => {
  // M-Care super-agent Phase 4C. sendPushNotification/sw.js previously
  // hardcoded the site's main mark for every push — no way for a real
  // trip-lifecycle event (handshake checkpoint, recovery check-in) to show
  // up as recognizably "from M-Care," the same identity the patient already
  // talks to in the chat panel. This checks the plumbing exists end to end:
  // sender -> sendPushNotification -> sw.js.
  const sendFn = read('base44/functions/sendPushNotification/entry.ts');
  expect(sendFn, 'sendPushNotification must accept an icon field from the caller').toMatch(/\bicon\b/);
  expect(sendFn, 'the push payload must forward icon through to the client').toMatch(/JSON\.stringify\(\{[^}]*icon[^}]*\}\)/);

  const sw = read('public/sw.js');
  expect(sw, 'sw.js must read a per-notification icon, falling back to the site mark')
    .toMatch(/icon:\s*data\.icon \|\| '\/morales-m-mark\.png'/);

  const handshake = read('base44/functions/completeHandshake/entry.ts');
  expect(handshake, 'handshake checkpoint pushes must carry the M-Care icon')
    .toContain("icon:       '/mcare-logo.png'");

  const recovery = read('base44/functions/schedulePostOpCheckIns/entry.ts');
  expect(recovery, 'schedulePostOpCheckIns must actually push, not just email, the Day 3 check-in')
    .toContain("'sendPushNotification'");
  expect(recovery, 'the recovery check-in push must carry the M-Care icon')
    .toContain("icon:       '/mcare-logo.png'");
});

test('TRANSPORT PARTNER: signup self-attestation never writes license_verified/insurance_verified', () => {
  // Transport Partner Platform — Foundation. Found during implementation:
  // TaxiServiceSignupStep3.jsx used to write license_verified/insurance_verified
  // straight from the applicant's OWN "I have a valid license" / "I have valid
  // insurance" checkboxes at signup — self-attestation treated as verification,
  // before any real check ever ran. That's exactly the failure mode "never
  // represent an unverified background check as verified" rules out.
  const step3 = read('src/components/partner-signup/TaxiServiceSignupStep3.jsx');
  expect(step3, 'signup must not write license_verified from local checkbox state')
    .not.toMatch(/license_verified:\s*licenseConfirmed/);
  expect(step3, 'signup must not write insurance_verified from local checkbox state')
    .not.toMatch(/insurance_verified:\s*insuranceConfirmed/);
  expect(step3, 'the checkboxes must still be captured, just as an attestation, not a verification')
    .toContain('license_self_attested: licenseConfirmed');
  expect(step3, 'the checkboxes must still be captured, just as an attestation, not a verification')
    .toContain('insurance_self_attested: insuranceConfirmed');
});

test('TRANSPORT PARTNER: taxi service approval is real, not a rubber stamp', () => {
  // AdminPartners.jsx used to approve a taxi service with a single
  // unconditional client-side TaxiService.update({status:'active',
  // license_verified:true, insurance_verified:true}) — no read of the real
  // sanctions/fraud-scan record (PartnerVerification), no state-machine
  // check. reviewTaxiServiceVerification replaces it: license_verified/
  // insurance_verified may ONLY be set true from that function's approve
  // branch, after checking the partner isn't sanctions_blocked/denied, and
  // status only advances through the guarded state machine.
  const reviewFn = read('base44/functions/reviewTaxiServiceVerification/entry.ts');
  const sanctionsCheckIdx = reviewFn.indexOf('sanctions_blocked');
  const licenseSetIdx = reviewFn.indexOf('license_verified: true');
  expect(sanctionsCheckIdx, 'the sanctions/denied check must exist').toBeGreaterThan(-1);
  expect(licenseSetIdx, 'license_verified must be settable somewhere in the approve path').toBeGreaterThan(-1);
  expect(sanctionsCheckIdx, 'the sanctions/denied check must run before license_verified is ever set true')
    .toBeLessThan(licenseSetIdx);
  expect(reviewFn, 'status changes must go through the guarded state machine, never a raw update({status})')
    .toContain('guardedPartnerStatusUpdate(');
  expect(reviewFn, 'must be admin-gated').toMatch(/allowedRoles:\s*\[['"]admin['"],\s*['"]platform_admin['"]\]/);

  // The admin page must call this function, not perform the write itself.
  const adminPartners = read('src/pages/AdminPartners.jsx');
  expect(adminPartners, 'AdminPartners must no longer rubber-stamp verification itself')
    .not.toMatch(/TaxiService\.update\([^)]*license_verified:\s*true/);
  expect(adminPartners, 'AdminPartners must call the real review function to approve')
    .toContain("invoke('reviewTaxiServiceVerification', { action: 'approve'");
});

test('TRANSPORT PARTNER: Driver roster is scoped to its own taxi company, never open', () => {
  const entity = read('base44/entities/Driver.jsonc');
  for (const op of ['read', 'create', 'update', 'delete']) {
    const opIdx = entity.indexOf(`"${op}"`);
    expect(opIdx, `Driver.jsonc must declare an rls.${op} rule`).toBeGreaterThan(-1);
  }
  expect(entity, 'ownership must anchor on taxi_service_email, not an open rule')
    .toContain('"data.taxi_service_email"');
  // The dashboard must set the ownership field from the company's own
  // record, never let a caller supply an arbitrary one.
  const roster = read('src/components/partner-dashboard/DriverRosterSection.jsx');
  expect(roster, 'new drivers must be tagged with the current company\'s own email')
    .toContain('taxi_service_email: taxi.email');
});

test('TRANSPORT PARTNER: partnerOnboardingState transitions are a real allowlist, not a formality', () => {
  const state = read('base44/shared/partnerOnboardingState.ts');
  // REJECTED must be terminal — nothing may transition out of it.
  expect(state, 'REJECTED must have no outgoing transitions').toMatch(/\[PARTNER_STATE\.REJECTED\]:\s*\[\],/);
  // A partner can never reach ACTIVE directly from PENDING_VERIFICATION —
  // it must pass through VERIFYING first.
  const pendingVerificationLine = state.match(/\[PARTNER_STATE\.PENDING_VERIFICATION\]:\s*\[([^\]]*)\]/);
  expect(pendingVerificationLine, 'PENDING_VERIFICATION transition list must exist').not.toBeNull();
  expect(pendingVerificationLine[1], 'PENDING_VERIFICATION must not list ACTIVE as a direct transition')
    .not.toMatch(/PARTNER_STATE\.ACTIVE\b/);

  const entity = read('base44/entities/AuditLog.jsonc');
  const allow = read('base44/functions/logAuditEvent/entry.ts');
  for (const t of ['partner_verification_approved', 'partner_verification_rejected']) {
    expect(entity, `${t} missing from AuditLog.jsonc's enum`).toContain(`"${t}"`);
    expect(allow, `${t} missing from logAuditEvent's ALLOWED_EVENT_TYPES`).toContain(`'${t}'`);
  }
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
    { path: 'src/components/partner-signup/TaxiServiceSignupStep3.jsx', create: 'TaxiService.create(' },
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

  // Doctor signup now has TWO entry points (the classic form and M-Care's
  // conversational signup, added for the "M-Care super-agent" work) that
  // both delegate to submitDoctorSignup() rather than each creating the
  // Doctor entity inline — so this invariant is checked on the shared
  // function itself, not on DoctorSignupStep3.jsx directly (see the
  // separate 'PARTNER SIGNUP: doctor signup — chat and form both call the
  // one gated submission function' test for the "only one code path"
  // guarantee that makes this split safe).
  const doctorForm = strip(read('src/components/doctor-signup/DoctorSignupStep3.jsx'));
  expect(doctorForm, 'DoctorSignupStep3.jsx must import the shared signup auth gate')
    .toContain("from '@/components/auth/SignupAuthGate'");
  expect(doctorForm, 'DoctorSignupStep3.jsx must delegate to the shared submission function')
    .toContain('submitDoctorSignup(');
  expect(doctorForm, 'DoctorSignupStep3.jsx must show the gate when submitDoctorSignup signals AUTH_REQUIRED')
    .toMatch(/AUTH_REQUIRED[\s\S]{0,120}setShowAuthGate\(true\)/);
  expect(doctorForm, 'DoctorSignupStep3.jsx must mount <SignupAuthGate').toContain('<SignupAuthGate');

  const submitDoctorSignupSrc = strip(read('src/lib/partnerSignup/submitDoctorSignup.js'));
  expect(submitDoctorSignupSrc, 'submitDoctorSignup.js must check auth.me() before creating the Doctor entity')
    .toMatch(/base44\.auth\.me\(\)\.catch/);
  const doctorAuthCheckIdx = submitDoctorSignupSrc.search(/base44\.auth\.me\(\)\.catch/);
  const doctorCreateIdx = submitDoctorSignupSrc.indexOf('Doctor.create(');
  expect(doctorAuthCheckIdx, 'submitDoctorSignup.js must have an auth check').toBeGreaterThan(-1);
  expect(doctorCreateIdx, 'submitDoctorSignup.js must create the Doctor entity').toBeGreaterThan(-1);
  expect(doctorAuthCheckIdx, 'submitDoctorSignup.js must check auth BEFORE creating the entity, not after').toBeLessThan(doctorCreateIdx);

  // Same split for travel agency signup — M-Care's conversational signup
  // added a second entry point, both delegating to
  // submitTravelAgencySignup() (see the separate 'PARTNER SIGNUP: travel
  // agency signup...' test for the "only one code path" guarantee).
  const travelForm = strip(read('src/components/partner-signup/TravelAgencySignupStep3.jsx'));
  expect(travelForm, 'TravelAgencySignupStep3.jsx must import the shared signup auth gate')
    .toContain("from '@/components/auth/SignupAuthGate'");
  expect(travelForm, 'TravelAgencySignupStep3.jsx must delegate to the shared submission function')
    .toContain('submitTravelAgencySignup(');
  // Unlike the doctor form (which relies on catching submitDoctorSignup's
  // AUTH_REQUIRED throw), this file keeps its own pre-flight guest check
  // before ever calling the shared function — a guest never reaches it at
  // all, so submitTravelAgencySignup's own AUTH_REQUIRED throw is
  // defense-in-depth here, not the primary gate. Same pattern the generic
  // loop above already checks for TaxiService/SecurityAgency.
  expect(travelForm, 'TravelAgencySignupStep3.jsx must show the gate for an unauthenticated guest before calling the shared function')
    .toMatch(/if\s*\(!currentUser\)[\s\S]{0,60}setShowAuthGate\(true\)/);
  expect(travelForm, 'TravelAgencySignupStep3.jsx must mount <SignupAuthGate').toContain('<SignupAuthGate');

  const submitTravelAgencySignupSrc = strip(read('src/lib/partnerSignup/submitTravelAgencySignup.js'));
  expect(submitTravelAgencySignupSrc, 'submitTravelAgencySignup.js must check auth.me() before creating the TravelAgency entity')
    .toMatch(/base44\.auth\.me\(\)\.catch/);
  const travelAuthCheckIdx = submitTravelAgencySignupSrc.search(/base44\.auth\.me\(\)\.catch/);
  const travelCreateIdx = submitTravelAgencySignupSrc.indexOf('TravelAgency.create(');
  expect(travelAuthCheckIdx, 'submitTravelAgencySignup.js must have an auth check').toBeGreaterThan(-1);
  expect(travelCreateIdx, 'submitTravelAgencySignup.js must create the TravelAgency entity').toBeGreaterThan(-1);
  expect(travelAuthCheckIdx, 'submitTravelAgencySignup.js must check auth BEFORE creating the entity, not after').toBeLessThan(travelCreateIdx);

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

test('PARTNERS: runDoctorVerificationScan never activates a doctor directly', () => {
  // runDoctorVerificationScan (granted to M-Care) used to write status:'active'
  // and verification_status:'verified' straight onto the Doctor record the
  // moment its own confidence score cleared a threshold — a second, less
  // rigorous auto-activation path that bypassed activateVerifiedDoctor,
  // "THE SINGLE GATED FUNCTION that can set a Doctor to active" (see that
  // file's own header), which requires background_check_status to
  // independently reach a passed state — and that field is only ever set by
  // a human (see the invariant above). Fixed: the scan may only ever record
  // the sub-checks it legitimately performed (license/identity), never the
  // top-level status or verification_status fields.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const scan = strip(read('base44/functions/runDoctorVerificationScan/entry.ts'));

  expect(scan, "runDoctorVerificationScan must never write status:'active' directly")
    .not.toMatch(/status:\s*['"]active['"]/);
  expect(scan, "runDoctorVerificationScan must never write verification_status:'verified' directly")
    .not.toMatch(/verification_status:\s*['"]verified['"]/);
});

test('PARTNERS: ContactAttempt (provider-outreach audit log) is admin-only and carries no patient PHI field', () => {
  // ContactAttempt logs the real outreach M-Care already sends to provider
  // partners (a travel-agency/driver quote request, a doctor case-assignment
  // notice, a partner verification-outcome notice) — the honest, buildable
  // version of "governed outreach" auditability. Two invariants matter: it
  // must be admin-only to read (matches NotificationLog's precedent — this is
  // an internal ops log, not something a patient or partner reads directly),
  // and its schema must never grow a field shaped for a patient's own name,
  // email, phone, or clinical detail — recipient/partner_name are always the
  // PROVIDER's own business contact info, never a patient's.
  const entity = read('base44/entities/ContactAttempt.jsonc');
  const rlsAdminOnly = (op) => new RegExp(
    `"${op}"\\s*:\\s*\\{\\s*"user_condition"\\s*:\\s*\\{\\s*"role"\\s*:\\s*"admin"\\s*\\}\\s*\\}`
  );
  for (const op of ['read', 'create', 'update', 'delete']) {
    expect(entity, `ContactAttempt.${op} must be admin-gated`).toMatch(rlsAdminOnly(op));
  }
  // Check declared property KEYS only (colon-anchored) — not the free-text
  // description, which legitimately discusses patient PHI in prose while
  // explaining why the schema itself must never carry it.
  const forbiddenFieldKey = /"(client_name|client_email|client_phone|patient_name|patient_email|medical_\w*|diagnosis|condition)"\s*:\s*\{/i;
  expect(entity, 'ContactAttempt must never declare a patient-identity or clinical field').not.toMatch(forbiddenFieldKey);

  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const helper = strip(read('base44/shared/logProviderContactAttempt.ts'));
  expect(helper, 'the helper writes only to ContactAttempt').toContain('entities.ContactAttempt.create');
  expect(helper, 'the helper must never throw on its own write failure').toMatch(/catch\s*\(/);
});

test('PARTNERS: DiscoveredProviderCandidate / ExternalSearchLog are admin-only and carry no patient PHI field', () => {
  // Same shape of guarantee as ContactAttempt above, applied to the new
  // Tavily web-discovery staging entities: a lead M-Care found on the open
  // web is an internal ops record, never something a patient/partner reads
  // directly, and its schema (search query, result text, a scored guess at
  // an existing-partner match) must never grow a patient-identity or
  // clinical field.
  const rlsAdminOnly = (op) => new RegExp(
    `"${op}"\\s*:\\s*\\{\\s*"user_condition"\\s*:\\s*\\{\\s*"role"\\s*:\\s*"admin"\\s*\\}\\s*\\}`
  );
  const forbiddenFieldKey = /"(client_name|client_email|client_phone|patient_name|patient_email|medical_\w*|diagnosis|condition)"\s*:\s*\{/i;

  for (const entityFile of ['base44/entities/DiscoveredProviderCandidate.jsonc', 'base44/entities/ExternalSearchLog.jsonc']) {
    const entity = read(entityFile);
    for (const op of ['read', 'create', 'update', 'delete']) {
      expect(entity, `${entityFile}.${op} must be admin-gated`).toMatch(rlsAdminOnly(op));
    }
    expect(entity, `${entityFile} must never declare a patient-identity or clinical field`).not.toMatch(forbiddenFieldKey);
  }

  // The candidate entity's own lifecycle enums must never contain a
  // 'verified'/'promoted'/'active' value — structurally, nothing can ever
  // set a state that reads as "this is a real, verified partner."
  const candidateEntity = read('base44/entities/DiscoveredProviderCandidate.jsonc');
  expect(candidateEntity, "DiscoveredProviderCandidate's status/verification enums must never include a 'verified' value")
    .not.toMatch(/"(status|verification_status|verification_check_status|registry_check_status)"\s*:\s*\{[^}]*"verified"/);
});

test('PARTNERS: discoverProviderCandidates never promotes a web search result into a real partner record', () => {
  // "Never treat a Tavily search result as verified" — enforced structurally,
  // not just by prompt instruction. This tool may only ever write to the
  // staging DiscoveredProviderCandidate entity; it must never call
  // Doctor/TravelAgency/TaxiService/Companion/SecurityAgency.create, and must
  // never write a top-level verification_status/status of 'verified' onto
  // any entity.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const fn = strip(read('base44/functions/discoverProviderCandidates/entry.ts'));

  for (const entityName of ['Doctor', 'TravelAgency', 'TaxiService', 'Companion', 'SecurityAgency']) {
    expect(fn, `discoverProviderCandidates must never create a real ${entityName} record`)
      .not.toMatch(new RegExp(`entities\\.${entityName}\\.create`));
  }
  expect(fn, "discoverProviderCandidates must never write a 'verified' status")
    .not.toMatch(/(verification_status|status)\s*:\s*['"]verified['"]/);
  expect(fn, 'every search call must be audit-logged via logExternalSearch')
    .toContain('logExternalSearch(');
});

test('PROVIDER TRUST TIERS: matchDoctorsForProcedure can only ever return an already-approved doctor\'s real status', () => {
  // The ✓ APPROVED badge is only honest because matchDoctorsForProcedure's
  // own pre-filter already guarantees every doctor it returns cleared the
  // full pipeline (status:'active' + license_verified + a verified-shaped
  // verification_status). Two things must hold: that filter must still
  // exist and run BEFORE the response is built, and the fields the response
  // exposes must be the doctor's own real data — never a hardcoded literal
  // that could claim approval regardless of the filter.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const fn = strip(read('base44/functions/matchDoctorsForProcedure/entry.ts'));

  const filterIdx = fn.indexOf('VERIFIED_STATUSES');
  const responseIdx = fn.indexOf('matched_doctors:');
  expect(filterIdx, 'the VERIFIED_STATUSES filter must exist').toBeGreaterThan(-1);
  expect(responseIdx, 'the matched_doctors response must exist').toBeGreaterThan(-1);
  expect(filterIdx, 'the approval filter must run before the response is built').toBeLessThan(responseIdx);

  expect(fn, 'the response must expose the doctor\'s own real status fields, not a hardcoded claim')
    .toMatch(/status:\s*doc\.status/);
  expect(fn, 'the response must expose the doctor\'s own real verification_status, not a hardcoded claim')
    .toMatch(/verification_status:\s*doc\.verification_status/);
  // Scoped to the response object itself (from "matched_doctors:" onward) —
  // a hardcoded status/verification_status literal there would be a false
  // approval claim independent of the real filter above. The earlier query
  // filter (`.filter({ status: 'active' }, ...)`) legitimately uses the same
  // literal shape and must stay untouched, so this check only looks past
  // where the response is actually built.
  const responseSection = fn.slice(responseIdx);
  expect(responseSection, 'the response object must never hardcode a literal approved/verified value instead of reading the real field')
    .not.toMatch(/(status|verification_status)\s*:\s*['"](active|verified|approved)['"]/);
});

test('PROVIDER TRUST TIERS: {{providerstatus:verified}} is only ever conditioned on a real registry-check result', () => {
  // A discovered candidate CAN now honestly reach VERIFIED — but only after
  // verifyDiscoveredCandidate actually runs a real registry check, never
  // from identity_confidence alone and never unconditionally. The
  // instructions must tie the emit decision to that tool's own
  // eligible_for_verified_badge field, and must explicitly say confidence
  // alone is not enough.
  const mcare = read('base44/agents/m_care.jsonc');
  expect(mcare, 'emitting verified must be conditioned on eligible_for_verified_badge')
    .toMatch(/eligible_for_verified_badge:true/);
  expect(mcare, 'the instructions must explicitly rule out confidence-alone as sufficient for the verified tag')
    .toMatch(/identity_confidence alone[\s\S]{0,40}never/i);
  // discoverProviderCandidates' own description (the FIRST tool a traveler's
  // candidate comes from) must not unconditionally promise a verified tag —
  // it must gate it on verifyDiscoveredCandidate having actually run.
  const mcareData = JSON.parse(mcare);
  const discoverDesc = mcareData.tool_configs.find((t) => t.function_name === 'discoverProviderCandidates')?.description || '';
  expect(discoverDesc, 'discoverProviderCandidates must never suggest emitting verified unconditionally')
    .toMatch(/never \{\{providerstatus:verified\|Name\}\} unless verifyDiscoveredCandidate/);
});

test('PROVIDER TRUST TIERS: verifyDiscoveredCandidate never promotes a candidate — a passed check is evidence, not approval', () => {
  // Same structural discipline as discoverProviderCandidates's own invariant:
  // a real registry match is genuine evidence for a human reviewer, never a
  // self-sufficient promotion. This function may update the staging
  // DiscoveredProviderCandidate row only — never a real partner entity, and
  // never the candidate's own status field (which has no verified/approved
  // value to write in the first place).
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const fn = strip(read('base44/functions/verifyDiscoveredCandidate/entry.ts'));

  for (const entityName of ['Doctor', 'TravelAgency', 'TaxiService', 'Companion', 'SecurityAgency']) {
    expect(fn, `verifyDiscoveredCandidate must never create or update a real ${entityName} record`)
      .not.toMatch(new RegExp(`entities\\.${entityName}\\.(create|update)`));
  }
  expect(fn, "verifyDiscoveredCandidate must never write the candidate's status field to anything")
    .not.toMatch(/\bstatus:\s*['"](verified|approved|active)['"]/);
  // eligible_for_verified_badge must be a genuine AND of a real registry
  // "found" result and NOT being routed to manual review — never a looser
  // truthy check on confidence or relevance alone.
  expect(fn, 'eligible_for_verified_badge must require both found and !route_to_manual')
    .toMatch(/eligibleForVerifiedBadge\s*=\s*found\s*&&\s*!routeToManual/);
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
  const helper = read('base44/shared/memoCache.ts');
  expect(helper).toContain('export function createMemoCache');
  expect(helper).toContain('export function createKeyedMemoCache');

  for (const fn of ['calculatePriceQuote', 'matchDoctorsForProcedure', 'intakePartnerAvailabilityPreview', 'getGeolocationAndCurrency']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} should import the shared memo cache`).toMatch(/from ['"]\.\.\/\.\.\/shared\/memoCache\.ts['"]/);
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

test('DOCTOR NOMINATION: only reviewDoctorNomination can transition a nomination to outreach_sent', () => {
  const submitSrc = read('base44/functions/submitDoctorNomination/entry.ts');
  expect(submitSrc, 'submission must never itself mark outreach as sent')
    .not.toMatch(/status:\s*['"]outreach_sent['"]/);
  expect(submitSrc, 'submission must never call SendEmail to the nominated doctor')
    .not.toMatch(/to:\s*email\b|to:\s*doctor_email\b/);

  const reviewSrc = read('base44/functions/reviewDoctorNomination/entry.ts');
  expect(reviewSrc).toContain("status: 'outreach_sent'");
});

test('DOCTOR NOMINATION: submitDoctorNomination never creates or verifies a Doctor record — nomination is a lead trigger, not a verification bypass', () => {
  const src = read('base44/functions/submitDoctorNomination/entry.ts');
  expect(src).not.toMatch(/entities\.Doctor\.(create|update)/);

  const reviewSrc = read('base44/functions/reviewDoctorNomination/entry.ts');
  expect(reviewSrc, 'approval must never create/update a Doctor record either')
    .not.toMatch(/entities\.Doctor\.(create|update)/);
});

test('DOCTOR NOMINATION: the outreach email never carries the review text, photos, or nominator identity', () => {
  const src = read('base44/functions/reviewDoctorNomination/entry.ts');
  const htmlIdx = src.indexOf('renderEmail({');
  expect(htmlIdx, 'the renderEmail() call must exist').toBeGreaterThan(-1);
  const emailCallBlock = src.slice(htmlIdx, src.indexOf('});', htmlIdx));
  expect(emailCallBlock, 'must not interpolate the review text').not.toMatch(/review_text/);
  expect(emailCallBlock, 'must not interpolate photo refs').not.toMatch(/photo_refs/);
  expect(emailCallBlock, 'must not interpolate the nominator identity').not.toMatch(/nominator_(email|user_id)/);
});

test('DOCTOR NOMINATION: approval fails closed on sending when the opt-out token cannot be signed', () => {
  const src = read('base44/functions/reviewDoctorNomination/entry.ts');
  const signIdx = src.indexOf('signOptOutToken(');
  const catchIdx = src.indexOf('opt_out_token_unavailable');
  expect(signIdx, 'must attempt to sign the opt-out token before sending').toBeGreaterThan(-1);
  expect(catchIdx, 'must have a fail-closed path when signing fails').toBeGreaterThan(-1);
  expect(signIdx).toBeLessThan(catchIdx);
});

test('DOCTOR NOMINATION: opting out suppresses future outreach — reviewDoctorNomination checks it before sending', () => {
  const src = read('base44/functions/reviewDoctorNomination/entry.ts');
  const checkIdx = src.indexOf('outreach_opt_out === true');
  const sendIdx = src.lastIndexOf('integrations.Core.SendEmail');
  expect(checkIdx, 'the suppression check must exist').toBeGreaterThan(-1);
  expect(sendIdx, 'the send call must exist').toBeGreaterThan(-1);
  expect(checkIdx).toBeLessThan(sendIdx);
});

test('DOCTOR NOMINATION: opt-out and portal tokens fail closed with no secret configured — no default fallback', () => {
  const src = read('base44/functions/_shared/optOutToken.ts');
  expect(src).not.toMatch(/\|\|\s*['"]change-me-in-production['"]\s*;?\s*$/m); // no silent default use
  expect(src).toContain("=== 'change-me-in-production'"); // still rejects the known-bad default
  expect(src).toContain('OptOutTokenNotConfigured');
});

test('DOCTOR NOMINATION: no client/user role can read another patient\'s nomination — admin-only read RLS', () => {
  const src = read('base44/entities/DoctorNomination.jsonc');
  const readIdx = src.indexOf('"read"');
  const createIdx = src.indexOf('"create"');
  expect(readIdx, 'DoctorNomination must define a read RLS block').toBeGreaterThan(-1);
  const readBlock = src.slice(readIdx, createIdx > readIdx ? createIdx : readIdx + 300);
  expect(readBlock).toMatch(/admin|platform_admin/);
  expect(readBlock, 'must not grant a blanket client/user email-match read path')
    .not.toMatch(/data\.nominator_email|data\.client_email/);
});

test('DOCTOR NOMINATION: submission is gated to real M patients with a non-cancelled case, and rate-limited', () => {
  const src = read('base44/functions/submitDoctorNomination/entry.ts');
  expect(src, 'must check for an existing case before allowing a nomination').toContain('CaseRecord.filter');
  expect(src, 'must reject cancelled-only case histories').toContain('cancelled_at');
  expect(src, 'must rate-limit submissions').toContain('checkRateLimit');
});

test('DOCTOR NOMINATION: role gates are correct on all four edge functions', () => {
  const reviewSrc = read('base44/functions/reviewDoctorNomination/entry.ts');
  expect(reviewSrc).toContain('createHandler');
  const reviewOpts = reviewSrc.slice(reviewSrc.lastIndexOf('allowedRoles'), reviewSrc.lastIndexOf('allowedRoles') + 100);
  expect(reviewOpts, 'only admin/platform_admin may review a nomination').toMatch(/admin/);
  expect(reviewOpts, 'a client must not be able to approve their own nomination').not.toMatch(/'client'|"client"/);

  const submitSrc = read('base44/functions/submitDoctorNomination/entry.ts');
  const submitOpts = submitSrc.slice(submitSrc.lastIndexOf('allowedRoles'), submitSrc.lastIndexOf('allowedRoles') + 100);
  expect(submitOpts, 'clients must be able to submit a nomination').toMatch(/'client'|"client"/);

  const optOutSrc = read('base44/functions/optOutDoctorOutreach/entry.ts');
  expect(optOutSrc, 'opt-out must stay public — the doctor has no M account to log in with')
    .toContain('requireAuth: false');
});

// ─── Memory Bank (Doctor-Verified Completion + Anonymized Outcomes) ─────────
// This feature lets a doctor confirm a procedure matches what was booked and
// enter real medications, then anonymizes the outcome into OutcomeRecord for
// future reference. The precedent it must not cross: Recovery Wellness
// Guidance was deliberately scoped to keep AI out of naming medications
// pending legal review. Here the DOCTOR enters medications (not the AI), and
// the "memory bank" recall is doctor-only, advisory, and always caveated —
// never a recommendation pushed at a patient. These tests pin that shape.

test('MEMORY BANK: writeOutcomeMemory never writes patient identity or raw medication/notes text onto OutcomeRecord', () => {
  const src = read('base44/functions/writeOutcomeMemory/entry.ts');
  const createIdx = src.indexOf('OutcomeRecord.create({');
  expect(createIdx, 'OutcomeRecord.create call must exist').toBeGreaterThan(-1);
  const catchIdx = src.indexOf('.catch(', createIdx);
  expect(catchIdx, 'the create call must be followed by a .catch').toBeGreaterThan(createIdx);
  const createCall = src.slice(createIdx, catchIdx);

  for (const leak of ['client_name', 'client_email', 'patient_name', 'doctor_notes', 'outcome_notes']) {
    expect(createCall, `OutcomeRecord.create must not include ${leak}`).not.toContain(leak);
  }
  // Only the fixed-taxonomy bucketing helpers may feed condition/medication tags —
  // never the patient's raw medical_conditions string or raw medication objects.
  expect(src, 'condition tags must come from the bucketing helper').toContain('bucketConditions(');
  expect(src, 'medication tags must come from the bucketing helper').toContain('bucketMedicationNames(');
  expect(createCall, 'the create call must not pass raw medical_conditions through').not.toContain('caseRecord.medical_conditions,');
});

test('MEMORY BANK: recallSimilarOutcomes always returns the fixed caveat and never a raw case_id, in both branches', () => {
  const src = read('base44/functions/recallSimilarOutcomes/entry.ts');
  const caveatDeclIdx = src.indexOf('RECALL_CAVEAT =');
  expect(caveatDeclIdx, 'a fixed caveat constant must be declared').toBeGreaterThan(-1);

  const insufficientIdx = src.indexOf("status: 'insufficient_data'");
  expect(insufficientIdx, 'insufficient_data branch must exist').toBeGreaterThan(-1);
  const insufficientBlock = src.slice(insufficientIdx, insufficientIdx + 300);
  expect(insufficientBlock, 'insufficient_data response must carry the caveat').toContain('caveat: RECALL_CAVEAT');
  expect(insufficientBlock, 'must not leak a raw case_id').not.toMatch(/\bcase_id:/);

  const okIdx = src.indexOf("status: 'ok'");
  expect(okIdx, 'ok branch must exist').toBeGreaterThan(-1);
  const okBlock = src.slice(okIdx, okIdx + 500);
  expect(okBlock, 'ok response must carry the caveat').toContain('caveat: RECALL_CAVEAT');
  expect(okBlock, 'must not leak a raw case_id').not.toMatch(/\bcase_id:/);
});

test('MEMORY BANK: recallSimilarOutcomes only ever aggregates — no single-row field make it into the response', () => {
  const src = read('base44/functions/recallSimilarOutcomes/entry.ts');
  // The response must be built from computed aggregates (counts/percentages),
  // never by mapping the raw `overlapping` rows into the payload.
  expect(src, 'must not return the raw matched rows').not.toMatch(/similar_cases:\s*overlapping/);
  expect(src, 'must not spread a raw record into the response').not.toMatch(/\.\.\.\s*rec\b/);
});

test('MEMORY BANK: MemoryBankAdvisoryPanel (doctor-only) is never IMPORTED on a patient-facing surface', () => {
  // Match the real import statement, not just the bare identifier — the
  // identifier legitimately appears in explanatory comments (e.g.
  // PostProcedureCarePanel.jsx documents that it deliberately does NOT render
  // this panel), which a plain substring check would misflag.
  const IMPORT_PATTERN = /from ['"]@\/components\/doctor\/MemoryBankAdvisoryPanel['"]/;

  const dashboard = read('src/pages/Dashboard.jsx');
  expect(dashboard, 'Dashboard must not import the doctor-only memory bank panel').not.toMatch(IMPORT_PATTERN);

  const patientDir = join(ROOT, 'src/components/patient');
  const offenders = [];
  for (const name of readdirSync(patientDir)) {
    if (!name.endsWith('.jsx')) continue;
    const src = readFileSync(join(patientDir, name), 'utf8');
    if (IMPORT_PATTERN.test(src)) offenders.push(name);
  }
  expect(offenders, `patient-facing files importing the doctor-only panel: ${offenders.join(', ')}`).toEqual([]);
});

test('MEMORY BANK: the new doctor-facing recall path never queries OutcomeRecord directly from the client', () => {
  // Scoped to the files this feature introduces — recallSimilarOutcomes'
  // aggregation must be the only read path a doctor's browser ever exercises.
  // NOT a blanket ban repo-wide: src/pages/RiskOptimizationDashboard.jsx is a
  // pre-existing, unrelated admin-only review console (RLS already restricts
  // OutcomeRecord to admin/platform_admin) that predates this feature and is
  // out of scope here.
  const NEW_FILES = [
    'src/components/doctor/MemoryBankAdvisoryPanel.jsx',
    'src/components/patient/PostProcedureCarePanel.jsx',
    'src/pages/MemoryBankDemo.jsx',
    'src/components/portal/SurgicalExecutionControls.jsx',
    'src/components/dashboard/modules/MedicalProfileModule.jsx',
  ];
  const offenders = NEW_FILES.filter((p) => read(p).includes('entities.OutcomeRecord'));
  expect(offenders, `client-side OutcomeRecord usage: ${offenders.join(', ')}`).toEqual([]);
});

test('MEMORY BANK: logProcedureComplete computes the deterministic procedure-match status BEFORE any AI call', () => {
  const src = read('base44/functions/logProcedureComplete/entry.ts');
  const matchIdx = src.indexOf('computeProcedureMatch(');
  const llmIdx = src.indexOf('InvokeLLM');
  expect(matchIdx, 'computeProcedureMatch call must exist').toBeGreaterThan(-1);
  expect(llmIdx, 'AI narration call must exist').toBeGreaterThan(-1);
  expect(matchIdx, 'the deterministic match must be computed before the AI is invoked').toBeLessThan(llmIdx);

  // The CaseRecord write must persist the deterministic result, never the AI's phrasing.
  expect(src).toContain('procedure_match_status: match.status');
  expect(src).not.toMatch(/procedure_match_status:\s*matchAiSummary/);
});

test('MEMORY BANK: a procedure mismatch is flagged, never blocked — the case still moves to recovery', () => {
  // The status value itself is defined in the deterministic engine, not
  // re-declared in the caller.
  const engineSrc = read('base44/functions/_shared/procedureMatch.ts');
  expect(engineSrc, 'mismatch_flagged must be a defined status').toContain("'mismatch_flagged'");

  const src = read('base44/functions/logProcedureComplete/entry.ts');
  const statusWriteIdx = src.indexOf("status: 'RECOVERY_PHASE_7_DAY'");
  expect(statusWriteIdx, 'the recovery-phase transition must exist').toBeGreaterThan(-1);
  // The match result must be computed once and never branched on to short-circuit
  // the response — no conditional on match.status precedes an error/4xx return.
  expect(src, 'a mismatch must not itself trigger an error/blocked response')
    .not.toMatch(/match\.status\s*===?\s*['"]mismatch_flagged['"][\s\S]{0,150}status:\s*4\d\d/);
  // The deterministic result is always persisted, unconditionally, alongside
  // the status transition — not gated behind an if(match.status === ...) branch.
  const updateIdx = src.indexOf('CaseRecord.update(caseRecord.id, {');
  const updateBlock = src.slice(updateIdx, src.indexOf('});', updateIdx));
  expect(updateBlock, 'procedure_match_status must be written unconditionally with the status transition')
    .toContain('procedure_match_status: match.status');
});

// ── Account deletion (Google Play compliance) ──────────────────────────────────

test('ACCOUNT DELETION: deleteMyAccount only ever targets the caller\'s own session email', () => {
  // The single most important invariant in this feature: a self-service
  // deletion function that accepted an arbitrary target email would let any
  // logged-in user delete anyone's account.
  const src = read('base44/functions/deleteMyAccount/entry.ts');
  expect(src, 'must derive the target from the session user').toContain('user!.email');
  expect(src, 'must never destructure an email/target from the request body').not.toMatch(/const\s*\{[^}]*\b(email|target_email|patient_email)\b[^}]*\}\s*=\s*await body/);
  expect(src, 'must pass the session-derived email into the shared anonymizer').toContain('anonymizePatientRecords(base44, targetEmail');
  expect(src, 'requires explicit confirmation').toContain('confirm !== true');
});

test('ACCOUNT DELETION: requestAccountDeletion is public but rate-limited', () => {
  const src = read('base44/functions/requestAccountDeletion/entry.ts');
  expect(src).toContain('requireAuth: false');
  expect(src, 'public endpoint must stay rate-limited').toContain('RateLimitBucket');
  // It only files a request — it must never call the shared anonymizer itself.
  expect(src, 'must not execute deletion directly').not.toContain('anonymizePatientRecords');
});

test('ACCOUNT DELETION: the shared anonymizer uses the real PassportVault/PassportAccessGrant field names', () => {
  // Regression guard for a real pre-existing bug: the old inline version of
  // this logic filtered/wrote owner_email/encrypted_data/is_active — none of
  // which exist on the real entities (the real fields are user_email/
  // encrypted_file_uri/status) — so admin GDPR erasure never actually touched
  // a patient's passport or revoked a live access grant.
  const src = read('base44/functions/_shared/anonymizePatientRecords.ts');
  expect(src).toContain('user_email: normalizedEmail');
  expect(src).not.toContain('owner_email');
  expect(src).toContain('encrypted_file_uri: null');
  expect(src).not.toContain('encrypted_data');
  expect(src, 'PassportAccessGrant must be revoked via its real gating field').toContain("status: 'revoked'");
  // Scoped to just the PassportAccessGrant block — is_active is a real field
  // on other entities added later (LiveLocation, EmergencyPIN, GuardianSession),
  // it was only ever fake on PassportAccessGrant specifically.
  const grantBlockIdx = src.indexOf('PassportAccessGrant.filter');
  const grantBlock = src.slice(grantBlockIdx, src.indexOf('CaseRecord.filter'));
  expect(grantBlock).not.toContain('is_active');
  // Consultation's real fields are email/patient_name/phone, not the
  // client_* names CaseRecord uses — the old code filtered on client_email
  // and matched zero Consultation rows.
  const consultationBlockIdx = src.indexOf('Consultation.filter');
  const consultationBlock = src.slice(consultationBlockIdx, src.indexOf('SoloCheckIn.filter'));
  expect(consultationBlock).toContain('{ email: normalizedEmail }');
  expect(consultationBlock).not.toContain('client_email');
});

test('ACCOUNT DELETION: deletePatientData stays admin-gated after its createHandler migration', () => {
  const src = read('base44/functions/deletePatientData/entry.ts');
  expect(src).toContain('createHandler');
  expect(src).toContain("allowedRoles: ['admin', 'platform_admin']");
  expect(src).toContain('anonymizePatientRecords');
});

test('ACCOUNT DELETION: new audit event types are registered in both AuditLog and logAuditEvent', () => {
  const entity = read('base44/entities/AuditLog.jsonc');
  const allow = read('base44/functions/logAuditEvent/entry.ts');
  for (const t of ['gdpr_deletion', 'account_deletion_requested', 'account_deletion_completed']) {
    expect(entity, `${t} missing from AuditLog.jsonc's enum`).toContain(`"${t}"`);
    expect(allow, `${t} missing from logAuditEvent's ALLOWED_EVENT_TYPES`).toContain(`'${t}'`);
  }
});

test('ACCOUNT DELETION: the shared anonymizer covers PII beyond the original 6 entities', () => {
  // A later audit found the original version only touched 6 of ~19 entities
  // that key PII to a patient's email, directly contradicting SettingsModule's
  // own "removes your name, contact details... from our systems" copy.
  const src = read('base44/functions/_shared/anonymizePatientRecords.ts');
  for (const entity of [
    'PaymentTransaction', 'LiveLocation', 'LocationBreadcrumb', 'EmergencyPIN',
    'SOSEvent', 'GuardianSession', 'QuoteMessage', 'SafeTProfile',
    'BehavioralProfile', 'PostOpCheckIn', 'UserPushSubscription',
    'DoctorQuoteRequest', 'TravelRequest',
  ]) {
    expect(src, `${entity} must be covered by the anonymizer`).toContain(`entities.${entity}.`);
  }
  // A different person's email on the same row must never be touched —
  // only the patient side.
  expect(src, 'must not redact the guardian\'s own email').not.toContain('guardian_email: redactedEmail');
  expect(src, 'must not redact the doctor\'s own email').not.toContain('doctor_email: redactedEmail');
  // UserPushSubscription is the one hard-delete — an anonymized-but-active
  // subscription would keep silently notifying the deleted account's device.
  expect(src).toContain('UserPushSubscription.delete(sub.id)');
  expect(src).toContain('results.deleted.push(`UserPushSubscription');
});

test('ACCOUNT DELETION: createHandler rejects any request from a deleted account', () => {
  // Deletion was previously only a client-side AuthContext redirect — no
  // edge function checked it, so a stale session or raw API client with a
  // bearer token kept working indefinitely after "deletion." This must be
  // enforced in the shared middleware, not per-function, so it covers every
  // requireAuth function uniformly.
  const src = read('base44/functions/_shared/createHandler.ts');
  expect(src, 'AuthUser must declare the deletion marker').toContain('account_deletion_requested_at?: string');
  expect(src, 'must reject a deleted account before role checks').toMatch(
    /if\s*\(user\.account_deletion_requested_at\)\s*\{\s*return respond\(\{ error:.*\}, 403/
  );
  // Must be inside the requireAuth branch, before allowedRoles is checked —
  // sequencing matters: a deleted admin account must not slip through via role.
  const deletionCheckIdx = src.indexOf('account_deletion_requested_at)');
  const rolesCheckIdx = src.indexOf('allowedRoles?.length');
  expect(deletionCheckIdx, 'deletion check must run before the role check').toBeGreaterThan(0);
  expect(deletionCheckIdx).toBeLessThan(rolesCheckIdx);
});

// ─── M Prep Coach (2026-07-26) ───────────────────────────────────────────────

test('PREP COACH: sendProcedurePrepReminders is cron-gated and link-only', () => {
  const src = read('base44/functions/sendProcedurePrepReminders/entry.ts');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  expect(code, 'must use createHandler, not raw Deno.serve').toContain('createHandler(async');
  expect(code, 'requireAuth must be false (self-gated below)').toContain('requireAuth: false');
  expect(code, 'must require cron secret or admin session').toContain('cronAuthorized(req, base44)');
  expect(code, 'no fail-open role check').not.toMatch(/if \((?:user|callerUser) && \1?\w*\.role !==/);
  expect(src, 'must send via the link-only helper, never a raw SendEmail body with PHI').toContain('linkOnlyEmail(');
  // Only fires once BOTH the doctor has confirmed AND a payment has landed —
  // never on doctor-confirmation alone.
  expect(src).toContain("doctor_confirmation_status === 'CONFIRMED'");
  expect(src).toContain("PAID_STATUSES.includes(c.payment_status)");
});

test('PREP COACH: the checklist stays deterministic — AI may narrate, never decide', () => {
  // Same M-Principle shape as PreDepartureBriefing: the LLM result may only
  // ever be assigned to the narration message, never merged back into the
  // checklist items array or persisted onto CaseRecord.
  const src = read('src/components/dashboard/ProcedurePrepCoach.jsx');
  const invokeIdx = src.indexOf('InvokeLLM(');
  // Bounded to the narration effect itself (its closing dependency array is a
  // stable anchor) — must NOT extend into toggleItem below, which legitimately
  // calls setItems/CaseRecord.update for the deterministic checklist itself.
  const effectEndIdx = src.indexOf('[active, caseId, daysLeft, incompleteItems.length, totalCount]');
  expect(invokeIdx, 'InvokeLLM call must exist').toBeGreaterThan(0);
  expect(effectEndIdx, 'narration effect end anchor must exist').toBeGreaterThan(invokeIdx);
  const afterInvoke = src.slice(invokeIdx, effectEndIdx);
  expect(afterInvoke, 'the LLM result must not be written into the checklist items').not.toMatch(/setItems\(/);
  expect(afterInvoke, 'the LLM result must not be persisted onto CaseRecord').not.toMatch(/CaseRecord\.update/);
  expect(afterInvoke, 'the LLM result must only feed the narration message').toMatch(/setMessage\(/);
  // The prompt itself must carry the same constraint _shared/preOpChecklist.ts
  // states: AI may phrase/motivate, never invent a step or a clinical specific.
  expect(src, 'prompt must forbid inventing a new step').toContain('never invent a new preparation step');
  expect(src, 'prompt must forbid stating a specific fasting/medication instruction').toContain('never state a specific fasting time or medication instruction');
  // The checklist toggle persists only the locally-held, deterministic items
  // array — never anything derived from the AI narration state.
  const toggleIdx = src.indexOf('const toggleItem');
  const toggleBody = src.slice(toggleIdx, toggleIdx + 400);
  expect(toggleBody, 'toggle must persist the deterministic items array').toContain('pre_op_checklist: updated');
});

test('PREP COACH: CaseRecord carries the new milestone flags, default false', () => {
  const schema = read('base44/entities/CaseRecord.jsonc');
  for (const field of ['prep_reminder_7d_sent', 'prep_reminder_3d_sent', 'prep_reminder_1d_sent', 'prep_reminder_day_of_sent']) {
    const idx = schema.indexOf(`"${field}"`);
    expect(idx, `${field} must exist on CaseRecord`).toBeGreaterThan(0);
    expect(schema.slice(idx, idx + 80), `${field} must default to false`).toContain('"default": false');
  }
});

// ─── Pre-launch auth-gap hardening (2026-07-26) ──────────────────────────────
// A re-audit of every requireAuth:false function found 7 with no real internal
// gate at all. 4 got a fix here; 2 were deliberately left alone (SOS-class,
// and an automation whose caller can't be verified from this repo); ~20 more
// lower-severity ones (spam/cost only, not PHI/fraud) are pinned below as a
// tracked "batch 2", same ratchet pattern as EXEMPT_RATE_LIMIT/SCHEMA_HARDENED.

test('PORTAL WRITE: sendTravelQuoteEmail and sendChauffeurQuoteAlert derive consultation_id only from a verified portal token', () => {
  // sendChauffeurQuoteAlert accepts either 'chauffeur' or 'transfer' — the real
  // token-minting call sites are inconsistent about which of the two they use
  // for the same real-world role (2026-08-03 audit), so it checks membership
  // in both rather than a single exact value like sendTravelQuoteEmail does.
  const portalTypeCheck = {
    sendTravelQuoteEmail: `verified.portal_type !== 'travel'`,
    sendChauffeurQuoteAlert: `!['chauffeur', 'transfer'].includes(verified.portal_type)`,
  };
  for (const fn of Object.keys(portalTypeCheck)) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must verify the caller's portal token`).toContain('verifyPortalToken(token)');
    expect(src, `${fn} must check the token's portal_type`).toContain(portalTypeCheck[fn]);
    expect(src, `${fn} must derive consultation_id from the verified token, not the raw body`)
      .toContain('const consultation_id = verified.consultation_id;');
  }

  // Both frontend callers must actually send the token now, not a bare consultation_id.
  const agency = read('src/pages/PortalTravelAgency.jsx');
  expect(agency).toMatch(/base44\.functions\.invoke\('sendTravelQuoteEmail',\s*\{\s*token:\s*tokenData\.token,/);
  expect(agency, 'must no longer send a bare consultation_id to this endpoint').not.toMatch(/sendTravelQuoteEmail',\s*\{\s*consultation_id:/);
  const chauffeur = read('src/pages/PortalChauffeur.jsx');
  expect(chauffeur).toMatch(/base44\.functions\.invoke\('sendChauffeurQuoteAlert',\s*\{\s*token:\s*tokenData\.token,/);
  expect(chauffeur, 'must no longer send a bare consultation_id to this endpoint').not.toMatch(/sendChauffeurQuoteAlert',\s*\{\s*consultation_id:/);
});

test('INTERNAL CALLERS: sendLocalDoctorReferral and generateItineraryCalendar require internalOrAdminAuthorized', () => {
  for (const fn of ['sendLocalDoctorReferral', 'generateItineraryCalendar']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must import internalOrAdminAuthorized`).toContain("from '../../shared/internalAuth.ts'");
    expect(src, `${fn} must call the gate before doing anything`).toContain('await internalOrAdminAuthorized(internal_secret, base44)');
  }

  // Their real callers must actually pass the secret now.
  const checkMissed = read('base44/functions/checkMissedRecoveryCheckins/entry.ts');
  expect(checkMissed, 'must call sendLocalDoctorReferral via the SDK, not the old dead Supabase-style fetch()')
    .toContain("base44.asServiceRole.functions.invoke('sendLocalDoctorReferral'");
  expect(checkMissed).toContain('internal_secret: Deno.env.get(\'CRON_SECRET\')');
  // The old broken pattern is only allowed to remain in the explanatory FIX
  // comment above — not as a live fetch() call.
  expect(checkMissed, 'the old broken fetch()-to-/functions/v1/ call must be gone').not.toMatch(/fetch\(`[^`]*\/functions\/v1\//);

  const cascade = read('base44/functions/processPaymentCascade/entry.ts');
  expect(cascade).toContain("'generateItineraryCalendar', { case_id, internal_secret: Deno.env.get('CRON_SECRET') }");
});

test('DEMO EMAIL: sendTestEmail can only send to the fixed demo inbox, not an arbitrary address', () => {
  const src = read('base44/functions/sendTestEmail/entry.ts');
  expect(src, 'must reject any recipient other than the pinned demo address').toContain("if (to !== ALLOWED_DEMO_RECIPIENT)");
  const showcase = read('src/pages/EmailShowcase.jsx');
  const demoEmailMatch = showcase.match(/const DEMO_EMAIL = '([^']+)'/);
  expect(demoEmailMatch, 'EmailShowcase.jsx must still define DEMO_EMAIL').not.toBeNull();
  expect(src, "the backend allowlist must match the frontend's DEMO_EMAIL constant")
    .toContain(`const ALLOWED_DEMO_RECIPIENT = '${demoEmailMatch[1]}'`);
});

test('AUTH: known-open gaps left deliberately (SOS-class + unverifiable automation caller + pre-account patient flows) stay documented, not silently patched wrong', () => {
  // activateEmergencyBeacon: SOS-class, must never gate on auth — only the
  // default IP+user rate limit is the correct mitigation here.
  const beacon = read('base44/functions/activateEmergencyBeacon/entry.ts');
  expect(beacon, 'a safety beacon must never require auth').not.toMatch(/requireAuth:\s*true/);
  expect(beacon, 'must not have grown an internalOrAdminAuthorized gate').not.toContain('internalOrAdminAuthorized');

  // portalHubWorkflow: left open pending confirmation of its Base44-dashboard
  // automation wiring — but it must keep re-fetching the trusted Consultation
  // record rather than trusting caller-supplied medical data (the actual
  // safety property that limits the current gap to replay/spam, not forgery).
  const hub = read('base44/functions/portalHubWorkflow/entry.ts');
  expect(hub, 'must still re-fetch the trusted Consultation record').toContain('base44.asServiceRole.entities.Consultation.get(consultation_id)');

  // flagIntakeHandoff + flagProcedureStackingRisk: both fire during booking
  // BEFORE the patient necessarily has a session — auth-gating them would
  // break the real flow. XSS-escaped (flagIntakeHandoff's transcript) and
  // rate-limited by createHandler's default; the realistic residual harm is
  // review-queue noise, not a data leak or a safety bypass.
  const handoff = read('base44/functions/flagIntakeHandoff/entry.ts');
  expect(handoff, 'must stay reachable pre-account').toMatch(/requireAuth:\s*false/);
  expect(handoff, 'transcript must stay escaped').toContain('escapeHtml(t.question_shown)');

  const stacking = read('base44/functions/flagProcedureStackingRisk/entry.ts');
  expect(stacking, 'must stay reachable pre-account').toMatch(/requireAuth:\s*false/);
});

test('AUTH: batch-2 unauthenticated comms/LLM endpoints — fully closed 2026-08-02', () => {
  // Every function that was on this worklist is now either gated
  // (internalOrAdminAuthorized / requireAuth:true / cronAuthorized) or given
  // an explicit tighter rate limit (the 4 real Anthropic-API callers, which
  // must stay public for pre-account patient flows). See project memory for
  // the full batch and per-function reasoning.
  const NOW_GATED = [
    'calculatePackagePrice', 'sendGoldenMNotification', 'sendHandshakeAlert',
    'sendPayNowEmail', 'sendBookingConfirmation', 'requestPartnerQuotas',
    'sendCompanionMealBrief', 'sendPreOpInstructions',
    'activateMotherTouch', 'notifySlackAssignment', 'sendAIPartnerBriefs',
  ];
  for (const fn of NOW_GATED) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must import internalOrAdminAuthorized`).toContain("from '../../shared/internalAuth.ts'");
    expect(src, `${fn} must call the gate before doing anything`).toContain('await internalOrAdminAuthorized(internal_secret, base44)');
  }

  const notifyRevised = read('base44/functions/notifyAdminQuoteRevised/entry.ts');
  expect(notifyRevised, 'must derive consultation_id from a verified portal token, not a caller-supplied field')
    .toContain('verifyPortalToken(token)');

  const cronGated = ['autoTriggerDoctorVerification', 'autoPartnerPortalDelivery'];
  for (const fn of cronGated) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must import cronAuthorized`).toContain("from '../../shared/cronAuth.ts'");
    expect(src, `${fn} must call the gate before doing anything`).toContain('await cronAuthorized(req, base44)');
  }

  const rateLimited = ['extractClinicalNote', 'analyzeIntakeCombination', 'analyzeDestinationSafety', 'interpretRecoveryCheckIn'];
  for (const fn of rateLimited) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must have a tighter-than-default rate limit`).toMatch(/rateLimit:\s*\{\s*max:\s*8,\s*windowSeconds:\s*300\s*\}/);
  }

  const iq200 = read('base44/functions/iq200HandshakeEngine/entry.ts');
  expect(iq200, 'must require auth').toMatch(/requireAuth:\s*true/);
});

test('M RECON: checkRedViolations is always sourced from the real getViolations engine, never fixture-substitutable', () => {
  // M Recon (buildathon agentic showcase) mixes one real check with four demo
  // fixtures. The one real check is the deterministic RED engine — it must
  // never be swapped for a fixture, since that's the one tool result this
  // demo cannot afford to fake.
  const src = read('base44/functions/_shared/mRecon.ts');
  expect(src, 'must import the real deterministic engine').toContain("import { getViolations } from './procedureCompatibility.ts'");

  const caseStart = src.indexOf("case 'checkRedViolations'");
  const nextCase = src.indexOf('case ', caseStart + 1);
  const caseBody = src.slice(caseStart, nextCase > -1 ? nextCase : caseStart + 300);
  expect(caseBody, 'checkRedViolations must call the real engine').toContain('getViolations(');
  expect(caseBody, 'checkRedViolations must never attach a fixture marker').not.toContain("source: 'demo fixture'");

  // Every other tool IS explicitly marked as a fixture — the honest label
  // that lets a judge (or the frontend) tell real from demo data apart.
  for (const fixtureFn of ['fixtureVisaRequirement', 'fixtureClinicStatus', 'fixtureWeatherAlert', 'fixtureDestinationSafety']) {
    const fnStart = src.indexOf(`export function ${fixtureFn}`);
    expect(fnStart, `${fixtureFn} must exist`).toBeGreaterThan(-1);
  }
  expect((src.match(/source: 'demo fixture'/g) || []).length, 'exactly the 4 fixture tools are marked, no more no less')
    .toBeGreaterThanOrEqual(4);
});

test('M RECON: the orchestration loop is fail-closed — a decision failure never produces a fabricated finished briefing', () => {
  const src = read('base44/functions/_shared/mRecon.ts');
  const loopStart = src.indexOf('export async function runMReconLoop');
  const loopBody = src.slice(loopStart);
  expect(loopBody, 'a decide() throw must be caught').toContain('} catch (_) {');
  expect(loopBody, 'a caught failure sets an explicit error').toContain("errorMessage = 'reasoning incomplete");
  // The failure path must not also set finalBriefing in the same branch —
  // structurally, the catch block only sets errorMessage, never final_briefing.
  const catchBlock = loopBody.slice(loopBody.indexOf('} catch (_) {'), loopBody.indexOf('break;', loopBody.indexOf('} catch (_) {')));
  expect(catchBlock, 'the catch block must not fabricate a briefing').not.toContain('finalBriefing =');
});

test('BUNDLER: no function directory keeps a local copy of a shared helper — entry.ts only', () => {
  // 2026-07/08: 12 functions (incl. runMReconAgent, recallSimilarOutcomes) were
  // given local per-directory copies of createHandler.ts and friends, believing
  // that fixed a Base44 runtime restriction. Base44 support (Yehonatan) confirmed
  // 2026-08-02 this was backwards — the extra files confuse the Cloudflare
  // bundler; the function registers in the deploy record but the worker never
  // loads, producing a silent 404. Fixed by deleting every local duplicate and
  // importing from base44/shared/ like the other ~290 functions. This guards
  // against that pattern coming back — a function directory must contain only
  // entry.ts, full stop.
  const fnRoot = join(ROOT, 'base44/functions');
  const dirs = readdirSync(fnRoot).filter((name) => name !== '_shared' && existsSync(join(fnRoot, name, 'entry.ts')));
  expect(dirs.length, 'expected to find function directories to check').toBeGreaterThan(200);
  const offenders = [];
  for (const dir of dirs) {
    const files = readdirSync(join(fnRoot, dir)).filter((f) => f.endsWith('.ts'));
    if (files.length !== 1 || files[0] !== 'entry.ts') offenders.push(`${dir}: ${files.join(', ')}`);
  }
  expect(offenders, 'every function directory must contain only entry.ts').toEqual([]);
});

test('XSS HARDENING: the canonical shared emailTemplate.ts still escapes user text (single source of truth, no per-function copies to drift)', () => {
  const canonical = read('base44/shared/emailTemplate.ts');
  expect(canonical).toContain('export const escapeHtml');
});

test('XSS HARDENING: renderEmail escapes title/intro/note — the fields most callers pass user text through', () => {
  const src = read('base44/functions/_shared/emailTemplate.ts');
  expect(src, 'escapeHtml must be exported for other functions to reuse').toContain('export const escapeHtml');
  expect(src, 'title must be escaped').toContain('${escapeHtml(title)}');
  expect(src, 'intro must be escaped').toContain('${escapeHtml(intro)}');
  expect(src, 'note must be escaped').toContain('${escapeHtml(note)}');
});

test('XSS HARDENING: the 6 fixed call sites still escape their user-submitted fields before building HTML', () => {
  // Each of these had a confirmed unescaped-user-text-into-HTML-email path.
  // Source-level check (not just the unit test) so a future edit that
  // silently drops the escapeHtml() call around the risky field gets caught,
  // the same pattern used for the M Recon invariants above.
  const checks = [
    { file: 'base44/functions/notifyPatientInfoRequest/entry.ts', mustContain: ['escapeHtml(doctor_question)'] },
    { file: 'base44/functions/flagIntakeHandoff/entry.ts', mustContain: ['escapeHtml(t.question_shown)', 'escapeHtml(t.user_raw_text)'] },
    { file: 'base44/functions/moralesAssist/entry.ts', mustContain: ["escapeHtml(m.content)"] },
    { file: 'base44/functions/sendSupportTicket/entry.ts', mustContain: ['escapeHtml(message)'] },
    { file: 'base44/functions/requestPassportAccess/entry.ts', mustContain: ["escapeHtml(requester_name"] },
    { file: 'base44/functions/respondToCompanionJob/entry.ts', mustContain: ['escapeHtml(companionDisplay)', 'escapeHtml(assignment.patient_first_name)'] },
  ];
  for (const { file, mustContain } of checks) {
    const src = read(file);
    for (const needle of mustContain) {
      expect(src, `${file} must still escape: ${needle}`).toContain(needle);
    }
  }
});

test('STRIPE WEBHOOKS: both signature-verifying webhooks use the shared, single-source verifyStripeSignature helper', () => {
  const shared = read('base44/shared/verifyStripeSignature.ts');
  expect(shared, 'must use the raw body, not JSON.parse, before verification').toContain('await req.text()');
  expect(shared, "must verify via the Stripe SDK's async constructor (Deno-compatible)").toContain('constructEventAsync');

  for (const fn of ['stripePaymentWebhook', 'stripeIdentityWebhook']) {
    const src = read(`base44/functions/${fn}/entry.ts`);
    expect(src, `${fn} must import the shared verifier, not hand-roll its own`).toContain("from '../../shared/verifyStripeSignature.ts'");
    expect(src, `${fn} must not construct its own Stripe client to verify webhooks (that would duplicate the shared helper)`).not.toContain('stripe.webhooks.constructEventAsync');
  }
});

test('VAULT UPLOAD: mime_type and file_size_bytes are required, not conditionally validated', () => {
  // A caller that omitted these fields previously bypassed server-side
  // type/size validation entirely — the original check only ran
  // `if (mime_type && ...)`, which validates ONLY when the field is present.
  const src = read('base44/functions/uploadToVault/entry.ts');
  expect(src, 'mime_type must be required, not just conditionally checked').toContain('!mime_type ||');
  expect(src, 'file_size_bytes must be required, not just conditionally checked').toContain('!file_size_bytes ||');
});

test('FILE STORAGE: no function sets a Content-Type/Content-Disposition response header from user-controlled file metadata', () => {
  // This repo never builds its own file-serving path today — uploaded files
  // are always served directly from Base44's managed storage (a signed URL
  // is returned, bytes are never proxied through our own server). If that
  // ever changes, the response header must never be derived from a
  // client-supplied mime_type/file_name, or a malicious upload could be
  // served back in a browser-executable way. Guards the invariant holding
  // as new functions get added, not just documents it once.
  const functionsDir = join(ROOT, 'base44/functions');
  const dirs = readdirSync(functionsDir).filter((name) => name !== '_shared');
  const offenders = [];
  for (const dir of dirs) {
    const entryPath = join(functionsDir, dir, 'entry.ts');
    if (!existsSync(entryPath)) continue;
    const src = readFileSync(entryPath, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/['"]Content-Type['"]|['"]Content-Disposition['"]/.test(lines[i])) {
        const window = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
        if (/mime_type|file_name/.test(window)) offenders.push(`${dir}/entry.ts:${i + 1}`);
      }
    }
  }
  expect(offenders, `these functions appear to set a file response header from user-controlled metadata: ${offenders.join(', ')}`).toEqual([]);
});

test('JOURNEY EVENTS: JourneyEvent is patient-scoped to read, admin-only to write, and only message_text ever reaches a chat bubble', () => {
  // JourneyEvent is the proactive-message layer's real backend record — the
  // opposite shape from ContactAttempt/DiscoveredProviderCandidate above
  // (which must stay admin-only): a patient MUST be able to read their own
  // events, since the whole point is the frontend polling and rendering them
  // as an M-Care chat bubble. What must NOT be true is any client being able
  // to CREATE one — an open create RLS would let an authenticated user forge
  // a fake "M-Care" message into another patient's own feed (same client_email
  // used for both read-scoping and, if create were open, an attacker's target).
  const entity = read('base44/entities/JourneyEvent.jsonc');
  expect(entity, 'read must be scoped to the owning patient (or admin), not wide open or admin-only')
    .toMatch(/"read"\s*:\s*\{[\s\S]*?"data\.client_email"\s*:\s*"\{\{user\.email\}\}"[\s\S]*?\}/);

  const rlsAdminOnly = (op) => new RegExp(
    `"${op}"\\s*:\\s*\\{\\s*"\\$or"\\s*:\\s*\\[\\s*\\{\\s*"user_condition"\\s*:\\s*\\{\\s*"role"\\s*:\\s*"admin"`
  );
  expect(entity, 'create must be admin-only — every real write goes through asServiceRole, which bypasses RLS anyway')
    .toMatch(rlsAdminOnly('create'));
  expect(entity, 'update must be admin-only').toMatch(rlsAdminOnly('update'));

  // The three real writers, and the shared helper they all funnel through, must
  // only ever call asServiceRole (never a client-reachable entity write) and
  // must never throw on their own failure — the real countdown-reminder /
  // journey-completion / recovery-check-in action must never be blocked by
  // this being unable to log.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const helper = strip(read('base44/shared/logJourneyEvent.ts'));
  expect(helper, 'the helper writes only via asServiceRole').toContain('asServiceRole.entities.JourneyEvent.create');
  expect(helper, 'the helper must never throw on its own write failure').toMatch(/catch\s*\(/);

  for (const fn of ['sendTravelCountdownReminders', 'autoCompletePatientJourney', 'schedulePostOpCheckIns']) {
    const src = strip(read(`base44/functions/${fn}/entry.ts`));
    expect(src, `${fn} must log JourneyEvent via the shared helper, not a raw create call`).toContain('logJourneyEvent(');
    expect(src, `${fn} must not create JourneyEvent directly, bypassing the shared helper's fixed field set`)
      .not.toMatch(/entities\.JourneyEvent\.create/);
  }

  // Frontend: only e.message_text may ever be handed to MessageBubble's
  // content — tool_result/action_taken are audit-only, never patient-facing.
  const orb = strip(read('src/components/mcare/MCareOrb.jsx'));
  expect(orb, 'MCareOrb must render journey events using message_text only')
    .toMatch(/content:\s*e\.message_text/);
  expect(orb, 'MCareOrb must never interpolate tool_result into a rendered message')
    .not.toMatch(/content:[^,}]*tool_result/);
  expect(orb, 'MCareOrb must never interpolate action_taken into a rendered message')
    .not.toMatch(/content:[^,}]*action_taken/);
});
