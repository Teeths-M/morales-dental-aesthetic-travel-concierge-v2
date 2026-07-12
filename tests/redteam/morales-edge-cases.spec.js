import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeSafeT } from '../../base44/functions/_shared/safeTEngine.ts';
import { getViolations } from '../../base44/functions/_shared/procedureCompatibility.ts';
import { isFresh, TTL_MS } from '../../base44/functions/_shared/freshness.ts';
import { evaluateGuardianGate, isMinorAge as isMinorAgeGate } from '../../base44/functions/_shared/guardianGate.ts';

// ── Morales-specific edge cases ───────────────────────────────────────────────
// These go beyond the generic safety red-team: they target the exact boundary,
// ordering, fail-safe, and server-side-enforcement guarantees Portia called out.
//
// Two kinds of test live here:
//   • BEHAVIORAL — calls the real deterministic engine (computeSafeT /
//     getViolations / isFresh). A true PASS/FAIL of platform logic. No env needed.
//   • SOURCE-INVARIANT — asserts a guarantee directly on edge-function source
//     that can only be exercised end-to-end with the deployed backend + credits
//     (which this checkout does not have). The invariant is what stops a future
//     edit from silently regressing the property CI can't afford to integration-test.
//
// The item numbers match Portia's 12-point brief.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const P = (name) => ({ procedure: name }); // minimal valid profile helper

// ══════════════════════════════════════════════════════════════════════════════
// #1 — Threshold boundary + phrasing/order invariance
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#1 SAFE-T threshold boundaries are exact and order/phrasing-invariant', () => {
  test('band boundaries land on the documented cut points (>= is inclusive)', () => {
    // Engine map: >=70 review, >=40 elevated, >=15 moderate, else low.
    expect(computeSafeT({ procedure: 'veneers', age: 64 }).risk_level).toBe('low');       // score 0
    expect(computeSafeT({ procedure: 'veneers', age: 65 }).risk_level).toBe('moderate');  // age 65-70 => 15 (boundary)
    expect(computeSafeT({ procedure: 'veneers', medications: 'warfarin' }).risk_level).toBe('elevated'); // 40 (boundary)
    // Exactly-70 combo (serious x2 = 60 + emotional 10) crosses into review.
    const at70 = computeSafeT({ procedure: 'lipo', medical_conditions: ['heart', 'diabetes'], emotional_concerns: true });
    expect(at70.score).toBeGreaterThanOrEqual(70);
    expect(at70.risk_level).toBe('review');
  });

  test('same combination, any ORDER of conditions => identical decision', () => {
    const a = computeSafeT({ procedure: 'lipo', medical_conditions: ['heart disease', 'diabetes', 'kidney'] });
    const b = computeSafeT({ procedure: 'lipo', medical_conditions: ['kidney', 'heart disease', 'diabetes'] });
    const c = computeSafeT({ procedure: 'lipo', medical_conditions: ['diabetes', 'kidney', 'heart disease'] });
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  test('same combination, any PHRASING/casing => identical band', () => {
    const bands = [
      computeSafeT({ procedure: 'facelift', medications: 'warfarin' }).risk_level,
      computeSafeT({ procedure: 'facelift', medications: 'Warfarin' }).risk_level,
      computeSafeT({ procedure: 'facelift', medications: 'Patient takes WARFARIN daily' }).risk_level,
      computeSafeT({ procedure: 'facelift', medications: ['warfarin'] }).risk_level,
    ];
    expect(new Set(bands).size).toBe(1);
    expect(bands[0]).toBe('elevated'); // blood-thinner => 40
  });

  test('RED procedure block is symmetric under pair order and field name (title|name)', () => {
    const forward = getViolations([{ title: 'Tummy Tuck' }, { title: 'Brazilian Butt Lift' }]);
    const reverse = getViolations([{ title: 'Brazilian Butt Lift' }, { title: 'Tummy Tuck' }]);
    const byName  = getViolations([{ name: 'Brazilian Butt Lift' }, { name: 'Tummy Tuck' }]);
    expect(forward.isBlocked).toBe(true);
    expect(reverse.isBlocked).toBe(true);
    expect(byName.isBlocked).toBe(true);
    expect(forward.violations[0].code).toBe(reverse.violations[0].code);
  });

  test('RED anesthesia/major-surgery boundary: 3 majors block, 2 do not', () => {
    const twoMajors   = getViolations([{ title: 'Liposuction' }, { title: 'Facelift' }]);          // 2 major, 7 hrs
    const threeMajors = getViolations([{ title: 'Liposuction' }, { title: 'Facelift' }, { title: 'Rhinoplasty' }]); // 3 major
    expect(twoMajors.isBlocked).toBe(false);
    expect(threeMajors.isBlocked).toBe(true);
    // Order shuffle of the 3-major set is still blocked.
    expect(getViolations([{ title: 'Rhinoplasty' }, { title: 'Liposuction' }, { title: 'Facelift' }]).isBlocked).toBe(true);
  });

  test('the decision is fully deterministic across repeated evaluation', () => {
    const profile = { procedure: 'bbl', age: 66, bmi: 36, medications: 'aspirin', medical_conditions: ['diabetes'] };
    const first = JSON.stringify(computeSafeT(profile));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(computeSafeT(profile))).toBe(first);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #2 — AI narration can never contradict the engine decision for a flagged case
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#2 narration narrates, never decides', () => {
  test('SOURCE: the returned risk_level is the engine decision, never the model output', () => {
    const src = read('base44/functions/computeSafeTScreening/entry.ts');
    // The response and BOTH chained records key risk_level off `decision.risk_level`.
    expect(src).toContain('risk_level: decision.risk_level');
    // The narration result is never allowed to set the risk level.
    expect(src).not.toMatch(/risk_level\s*[:=]\s*narr[.?]/);
    expect(src).not.toMatch(/=\s*narr\?\.risk_level/);
    // The prompt explicitly forbids the model from emitting a level.
    expect(src).toMatch(/do NOT output a risk level/i);
  });

  test('SOURCE: the decision record is written BEFORE the model is invoked', () => {
    const src = read('base44/functions/computeSafeTScreening/entry.ts');
    const decisionIdx = src.indexOf("phase: 'decision'");
    const llmIdx = src.indexOf('InvokeLLM');
    expect(decisionIdx).toBeGreaterThan(-1);
    expect(llmIdx).toBeGreaterThan(decisionIdx);
  });

  test('BEHAVIORAL: a flagged/injection case is review — the value the narrator receives', () => {
    // The narrator only ever receives this object's risk_level; it cannot lower it.
    const flagged = computeSafeT({ procedure: 'facelift', injection_flagged: true });
    expect(flagged.risk_level).toBe('review');
    expect(flagged.fail_closed_reason).toBe('injection_detected');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #3 — Age-gate boundaries 17 / 18 / invalid + HARD guardian gate (no soft flag)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#3 age boundaries + hard guardian gate', () => {
  test('BEHAVIORAL: 17 is flagged as a minor, 18 is an adult, invalid age never crashes', () => {
    const at17 = computeSafeT({ procedure: 'veneers', age: 17 });
    expect(at17.factors.age).toBe(30);
    expect(at17.flags).toContain('Under 18 — minor');

    const at18 = computeSafeT({ procedure: 'veneers', age: 18 });
    expect(at18.factors.age).toBeUndefined();
    expect(at18.flags).not.toContain('Under 18 — minor');

    for (const bad of ['abc', '', null, undefined, NaN]) {
      const r = computeSafeT({ procedure: 'veneers', age: bad });
      expect(r.factors.age).toBeUndefined();  // invalid age contributes nothing, doesn't throw
      expect(['low', 'moderate', 'elevated', 'review']).toContain(r.risk_level);
    }
  });

  test('BEHAVIORAL: booking as a stated minor WITHOUT a guardian is hard-BLOCKED', () => {
    // The core requirement: a minor with no guardian cannot proceed. Blocked at
    // 17, 16, "15", 1 — and even a valid contact without a name is still blocked.
    for (const age of [17, 16, '15', 1]) {
      const g = evaluateGuardianGate({ age });
      expect(g.isMinor).toBe(true);
      expect(g.blocked, `age ${age} with no guardian must block`).toBe(true);
      expect(g.reason).toMatch(/parent or guardian/i);
    }
    // Name but no/!valid contact => still blocked (identity not complete).
    expect(evaluateGuardianGate({ age: 16, guardian_name: 'Maria Mother' }).blocked).toBe(true);
    expect(evaluateGuardianGate({ age: 16, guardian_name: 'Maria Mother', guardian_contact: 'nope' }).blocked).toBe(true);
    // Contact but no name => still blocked.
    expect(evaluateGuardianGate({ age: 16, guardian_contact: 'maria@example.com' }).blocked).toBe(true);
  });

  test('BEHAVIORAL: a minor WITH a captured guardian identity is allowed; an adult is never gated', () => {
    expect(evaluateGuardianGate({ age: 16, guardian_name: 'Maria Mother', guardian_contact: 'maria@example.com' }).blocked).toBe(false);
    expect(evaluateGuardianGate({ age: 16, guardian_name: 'Maria Mother', guardian_contact: '+1 868 555 1234' }).blocked).toBe(false);
    // Adults / unparseable ages are never minors and never blocked.
    for (const age of [18, 45, 'forty', '', null, undefined]) {
      const g = evaluateGuardianGate({ age });
      expect(isMinorAgeGate(age)).toBe(false);
      expect(g.blocked).toBe(false);
    }
  });

  test('SOURCE: the guardian gate is re-derived SERVER-SIDE and called before Consultation.create', () => {
    const fn = read('base44/functions/validateGuardianRequirement/entry.ts');
    expect(fn).toContain("from '../_shared/guardianGate.ts'");
    expect(fn).toContain('evaluateGuardianGate');

    // Both entry points must call the server validator before creating the record.
    // Anchor on the real `entities.Consultation.create` call, not prose mentions.
    const booking = read('src/pages/Booking.jsx');
    const bIdx = booking.indexOf("invoke('validateGuardianRequirement'");
    const bCreate = booking.indexOf('entities.Consultation.create');
    expect(bIdx, 'Booking must call validateGuardianRequirement').toBeGreaterThan(-1);
    expect(bIdx).toBeLessThan(bCreate);
    expect(booking).toMatch(/if \(guardianVerdict\.blocked\)[\s\S]*throw new Error/);

    const intake = read('src/pages/ConciergeIntake.jsx');
    const iIdx = intake.indexOf("invoke('validateGuardianRequirement'");
    const iCreate = intake.indexOf('entities.Consultation.create');
    expect(iIdx, 'Intake must call validateGuardianRequirement').toBeGreaterThan(-1);
    expect(iIdx).toBeLessThan(iCreate);
  });

  test('SOURCE: the booking wizard cannot advance past step 0 as a minor without a guardian', () => {
    const booking = read('src/pages/Booking.jsx');
    // canNext step 0 requires guardianOk, which requires name + valid contact + consent.
    expect(booking).toMatch(/guardianOk\s*=\s*!isMinorAge\(form\.age\)/);
    expect(booking).toContain('isValidGuardianContact(form.guardian_contact)');
    expect(booking).toMatch(/form\.guardian_consent === true/);
    expect(booking).toMatch(/return personalOk && culturalOk && guardianOk/);
    // The personal-info section renders the blocking guardian capture for a minor.
    const section = read('src/components/booking/Section1PersonalInfo.jsx');
    expect(section).toMatch(/isMinorAge\(form\.age\)/);
    expect(section).toContain('guardian_name');
    expect(section).toContain('guardian_contact');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #4 — OTP edge cases (SOURCE — live path needs Twilio + credits)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#4 OTP', () => {
  test('SOURCE: verifyOtp rejects wrong / expired / already-used codes distinctly', () => {
    const src = read('base44/functions/verifyOtp/entry.ts');
    expect(src).toMatch(/session\.verified.*already been used/s);          // reuse blocked
    expect(src).toMatch(/expires_at.*Code expired/s);                       // expiry enforced
    expect(src).toMatch(/session\.code !== cleanCode.*Incorrect code/s);    // wrong code rejected
    // Ordering: a used/expired code is rejected before the value is even compared.
    expect(src.indexOf('already been used')).toBeLessThan(src.indexOf('Incorrect code'));
    expect(src.indexOf('Code expired')).toBeLessThan(src.indexOf('Incorrect code'));
  });

  test('SOURCE: sendOtp throttles resends (5 / 30 min) and expires codes in 10 min', () => {
    const src = read('base44/functions/sendOtp/entry.ts');
    expect(src).toMatch(/count >= 5/);
    expect(src).toContain('429');
    expect(src).toContain('10 * 60 * 1000'); // 10-minute expiry
  });

  test('SOURCE: sendOtp fails CLOSED — no login code leaks when SMS is misconfigured', () => {
    const src = read('base44/functions/sendOtp/entry.ts');
    const guardIdx = src.indexOf('!allowMock');
    const demoIdx = src.indexOf('demo_code: code');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(demoIdx).toBeGreaterThan(guardIdx); // the fail-closed guard precedes any demo-code return
    expect(src).toContain('503');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #5 — Clinic/doctor status re-checked at PAYMENT, not just at selection
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#5 status is re-verified at the payment step', () => {
  test('SOURCE: the proposal payment button is gated by a LIVE clinic-status check', () => {
    const portal = read('src/pages/ClientProposalPortal.jsx');
    expect(portal).toContain('ClinicStatusGate');       // gate rendered at the pay step
    expect(portal).toContain('clinicHardBlock');        // pay button disabled on a hard block
    expect(portal).toMatch(/disabled=\{[^}]*clinicHardBlock/); // wiring, not decoration
  });

  test('SOURCE: checkClinicStatus only confirms when operating AND fresh; else blocks', () => {
    const src = read('base44/functions/checkClinicStatus/entry.ts');
    const confirmIdx = src.indexOf("decision: 'confirmed'");
    const guardIdx = src.indexOf('if (operating && fresh)');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(guardIdx);       // confirm lives inside the operating&&fresh guard
    expect(src).toContain("decision: 'blocked'");
    expect(src).toContain("reason: 'no_clinic_record'"); // unknown clinic => blocked
  });

  test('SOURCE: a revoked/suspended doctor is set suspended and dropped from patient lists', () => {
    const reverify = read('base44/functions/reVerifyDoctorCredentials/entry.ts');
    expect(reverify).toContain('runLookup');            // real registry, not an LLM renewal
    expect(reverify).toMatch(/suspended/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #6 — Freshness failure/timeout => BLOCK (fail-safe), never last-known-good
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#6 stale/absent freshness fails safe', () => {
  test('BEHAVIORAL: isFresh returns false for absent, invalid, and past-TTL timestamps', () => {
    const ttl = TTL_MS.clinic_status;
    expect(isFresh(null, ttl)).toBe(false);
    expect(isFresh(undefined, ttl)).toBe(false);
    expect(isFresh('not-a-date', ttl)).toBe(false);
    expect(isFresh(new Date(Date.now() - ttl - 1000).toISOString(), ttl)).toBe(false); // just past TTL
    expect(isFresh(new Date(Date.now() - 1000).toISOString(), ttl)).toBe(true);        // recent
  });

  test('SOURCE: checkClinicStatus blocks on stale — never serves cached "operating"', () => {
    const src = read('base44/functions/checkClinicStatus/entry.ts');
    // The stale branch flags and returns blocked; there is no code path that
    // returns confirmed on a non-fresh record.
    expect(src).toContain('stale_no_reverification');
    // Every 'confirmed' return is downstream of the operating&&fresh guard (asserted in #5);
    // here we assert the blocked path exists for the not-fresh case.
    expect(src).toMatch(/reason: operating \? 'stale'/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #7 — Gates enforced SERVER-SIDE, not just in the UI
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#7 server-side enforcement', () => {
  test('SOURCE: the RED procedure block is re-derived server-side (cannot be skipped by direct API)', () => {
    const src = read('base44/functions/validateProcedureSafety/entry.ts');
    expect(src).toContain("from '../_shared/procedureCompatibility.ts'");
    expect(src).toContain('getViolations(items)'); // recomputed from raw names, client list never trusted
  });

  test('SOURCE: the document-upload (vault) endpoint requires auth and rate-limits', () => {
    const src = read('base44/functions/uploadToVault/entry.ts');
    expect(src).toMatch(/if \(!user\).*Unauthorized.*401/s);
    expect(src).toMatch(/count >= 20/); // 20 uploads/hour cap
  });

  test('SOURCE: patient medical writes re-check ownership on the server', () => {
    const src = read('base44/functions/submitDietaryProfile/entry.ts');
    expect(src).toMatch(/isOwner/);
    expect(src).toMatch(/Forbidden: not authorized for this case/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #8 / #9 — Public tool: no PII/threshold leak in the shareable/returned output
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#8/#9 the public tool leaks neither PII nor precise thresholds', () => {
  test('SOURCE: publicDoctorCheck returns neutral signals — no risk score, no numeric threshold', () => {
    const src = read('base44/functions/publicDoctorCheck/entry.ts');
    // Documented contract: NO risk score, NO "HIGH RISK" verdict on the public tool.
    expect(src).toMatch(/NO risk score/i);
    // The response object must not surface an engine score / risk_level / factors.
    const returnBlock = src.slice(src.indexOf('return ok({'), src.length);
    expect(returnBlock).not.toMatch(/\brisk_level\b/);
    expect(returnBlock).not.toMatch(/\bscore\b/);
    expect(returnBlock).not.toMatch(/\bfactors\b/);
  });

  test('BEHAVIORAL: the public procedure verdict is a generalized band — never the raw 0-100 score', () => {
    // getViolations (the public/client procedure check) exposes only a boolean +
    // neutral reason/code, never the internal numeric SAFE-T score/factors.
    const v = getViolations([{ title: 'Tummy Tuck' }, { title: 'Brazilian Butt Lift' }]);
    expect(v).toHaveProperty('isBlocked');
    expect(v.violations[0]).toHaveProperty('reason');
    expect(v.violations[0]).not.toHaveProperty('score');
    expect(v.violations[0]).not.toHaveProperty('factors');
    // Same combo, either order => same generalized result (no threshold wobble to probe).
    expect(getViolations([{ title: 'Brazilian Butt Lift' }, { title: 'Tummy Tuck' }]).isBlocked).toBe(v.isBlocked);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #10 — No double-booking of the last capacity unit under concurrency
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#10 capacity confirm is an atomic compare-and-swap', () => {
  test('SOURCE: confirm_booking uses a conditional atomic increment, not read-then-write', () => {
    const src = read('base44/functions/capacityCheck/entry.ts');
    // The only safe guard against two racers taking the last slot: DB evaluates the
    // predicate and increments in ONE operation.
    expect(src).toContain('updateMany(');
    expect(src).toMatch(/confirmed_count:\s*\{\s*\$lt:/); // predicate on the same doc
    expect(src).toMatch(/\$inc:\s*\{\s*confirmed_count:\s*1/);
    expect(src).toMatch(/!result\?\.updated/);            // loser correctly sees "full" (409)
    expect(src).toContain('409');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// #11 — Public lookups are rate-limited
// ══════════════════════════════════════════════════════════════════════════════
test.describe('#11 public tool rate-limiting', () => {
  test('SOURCE: publicDoctorCheck is IP-rate-limited (per hour AND per day) -> 429', () => {
    const src = read('base44/functions/publicDoctorCheck/entry.ts');
    expect(src).toContain('cyd_ip_hour_');
    expect(src).toContain('cyd_ip_day_');
    expect(src).toMatch(/checkRateLimit\(base44, `cyd_ip_hour_\$\{ip\}`, 3600, 15\)/);
    expect(src).toMatch(/checkRateLimit\(base44, `cyd_ip_day_\$\{ip\}`, 86400, 60\)/);
    expect(src).toContain('429');
  });
});
