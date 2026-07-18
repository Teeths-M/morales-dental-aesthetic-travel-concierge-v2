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
    const src = readFileSync(p, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const line of src.split('\n')) {
      if (IN_PLATFORM.test(line)) continue;
      if (LEAKY.test(line)) offenders.push(`${name}: ${line.trim().slice(0, 90)}`);
    }
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
