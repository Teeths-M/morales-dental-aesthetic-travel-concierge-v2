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
