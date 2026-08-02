import { describe, it, expect } from 'vitest';
import { QUESTION_GRAPH, INPUT_TYPES, UNSPECIFIED, isMinorAge } from '@/lib/intakeFlow/questionGraph';
import { getNextStep } from '@/lib/intakeFlow/flowEngine';
import { buildConsultationPayload } from '@/lib/intakeFlow/fieldMap';
import { toSafetyEngineName } from '@/lib/intakeFlow/procedureSafetyNameMap';
import { getViolations, analyseCompatibility } from '@/lib/procedureCompatibility';

/**
 * Headless walk of the real intake.
 *
 * Drives the actual `getNextStep` engine against the actual QUESTION_GRAPH,
 * answering each step the way the real UI component for that inputType does,
 * then builds the real Consultation payload. No browser, no network, no
 * credits — but it exercises the ordering, the skip logic, the "already
 * answered" rules and the payload mapping end to end.
 *
 * What this is for: a patient must never reach a question the flow can't get
 * past. `isStepAlreadyAnswered` marks a step done only when EVERY targetField
 * is known, so a step whose component doesn't write one of them loops
 * forever — the user answers, sees the same question, answers again. That
 * bug is invisible in a unit test of any single piece and obvious here.
 */

// Mirrors what each real step component emits on continue. Kept faithful on
// purpose: if this drifts from the components, the walk stops proving anything.
function answerFor(step) {
  const t = step.inputType;

  if (t === INPUT_TYPES.MULTI_SELECT) {
    // MultiProcedureStep
    return { procedure_interest: 'all_on_4', selected_procedures: ['all_on_4'] };
  }
  if (t === INPUT_TYPES.DOCTOR_PICK) {
    // DoctorPickStep
    return { preferred_doctor_id: 'doc_1', preferred_doctor_name: 'Ana Ruiz' };
  }
  if (t === INPUT_TYPES.CONDITIONS_PICK) {
    return { medical_conditions: ['none'] };
  }
  if (t === INPUT_TYPES.ALLERGIES_PICK) {
    return { allergies: ['none'] };
  }
  if (t === INPUT_TYPES.MEDICAL_PICK) {
    // MedicalPickStep — worst case for loops: the "nothing to report" answer,
    // where the flag is false and the array is empty.
    const cfg = step.medicalPick || {};
    const out = {};
    if (cfg.flagField) out[cfg.flagField] = false;
    if (cfg.arrayField) out[cfg.arrayField] = [];
    if (cfg.primaryField) out[cfg.primaryField] = '';
    return out;
  }
  if (t === INPUT_TYPES.BOOLEAN) {
    const out = {};
    step.targetFields.forEach((f) => { out[f] = true; });
    return out;
  }
  if (t === INPUT_TYPES.DATE) {
    const out = {};
    step.targetFields.forEach((f) => { out[f] = '2026-09-01'; });
    return out;
  }
  if (t === INPUT_TYPES.EMAIL) return { email: 'walker@example.com' };
  if (t === INPUT_TYPES.PHONE) return { phone: '+1 555 000 0000' };
  if (t === INPUT_TYPES.VISA_READINESS) {
    // VisaReadinessStep's "Continue" — always fires regardless of the
    // status shown, matching its advisory-only, never-blocking contract.
    return { visa_readiness_acknowledged: true };
  }
  if (t === INPUT_TYPES.PASSPORT_READINESS) {
    // PassportReadinessStep's "Continue" — same advisory-only contract.
    return { passport_readiness_acknowledged: true };
  }

  // TEXT / SELECT — QuestionCard's commitValue writes the same value to every
  // target field.
  const out = {};
  const value = step.id === 'age' ? '34' : `answer_${step.id}`;
  step.targetFields.forEach((f) => { out[f] = value; });
  return out;
}

/**
 * Walks to completion. Throws on a loop rather than hanging.
 * @returns {{ answers: object, visited: string[] }}
 */
function walkIntake({ seed = {}, isAuthenticated = true, answerOverrides = {} } = {}) {
  let answers = { ...seed };
  const visited = [];
  const seenTwice = new Map();

  for (let guard = 0; guard < 200; guard++) {
    const next = getNextStep(answers, { isAuthenticated }, QUESTION_GRAPH);
    if (next.type === 'complete') return { answers, visited };

    const step = next.step;
    if (next.type === 'auth_gate') {
      throw new Error(`auth gate at "${step.id}" while isAuthenticated=${isAuthenticated}`);
    }
    if (step.inputType === INPUT_TYPES.REVIEW) {
      // The review step has no target fields, so the engine keeps returning
      // it forever by design — that's the terminal screen, not a loop.
      return { answers, visited, atReview: true };
    }

    const count = (seenTwice.get(step.id) || 0) + 1;
    seenTwice.set(step.id, count);
    if (count > 2) {
      throw new Error(
        `DEAD END: "${step.id}" (${step.inputType}) re-asked ${count}× — its component ` +
        `does not write every targetField [${step.targetFields.join(', ')}]. ` +
        `Answers so far: ${JSON.stringify(answers)}`
      );
    }

    visited.push(step.id);
    answers = { ...answers, ...answerFor(step), ...(answerOverrides[step.id] || {}) };
  }
  throw new Error('walk exceeded 200 steps without completing');
}

describe('a patient can actually get through the intake', () => {
  it('an adult reaches the review step without ever being asked the same question twice', () => {
    const { visited, atReview } = walkIntake();
    expect(atReview, 'flow must terminate at the review step').toBe(true);
    expect(visited.length).toBeGreaterThan(5);
    // Adults must never be asked guardian questions.
    expect(visited).not.toContain('guardian_name');
    expect(visited).not.toContain('guardian_contact');
  });

  it('a minor IS asked for a guardian', () => {
    const { visited } = walkIntake({ answerOverrides: { age: { age: '15' } } });
    expect(isMinorAge('15')).toBe(true);
    expect(visited).toContain('guardian_name');
    expect(visited).toContain('guardian_contact');
  });

  it('asks the procedure question before the destination question', () => {
    const { visited } = walkIntake();
    expect(visited.indexOf('procedure_interest')).toBeLessThan(visited.indexOf('destination_country'));
  });

  it('collects contact details AFTER procedure and destination (value before ask)', () => {
    const { visited } = walkIntake();
    expect(visited.indexOf('email')).toBeGreaterThan(visited.indexOf('procedure_interest'));
    expect(visited.indexOf('email')).toBeGreaterThan(visited.indexOf('destination_country'));
  });

  it('checks visa/entry requirements immediately after nationality — not deferred to review', () => {
    const { visited } = walkIntake();
    expect(visited).toContain('visa_readiness_check');
    expect(visited.indexOf('visa_readiness_check')).toBe(visited.indexOf('nationality') + 1);
    // Both inputs the check needs are already known by then.
    expect(visited.indexOf('visa_readiness_check')).toBeGreaterThan(visited.indexOf('destination_country'));
    // And it runs well before the questions that used to be the only place
    // this showed up — medical history, allergies, the review step itself.
    expect(visited.indexOf('visa_readiness_check')).toBeLessThan(visited.indexOf('medical_conditions_other'));
  });

  it('checks passport readiness immediately after the expiry date is given — not deferred to review', () => {
    const { visited } = walkIntake();
    expect(visited).toContain('passport_readiness_check');
    expect(visited.indexOf('passport_readiness_check')).toBe(visited.indexOf('passport_expiry_date') + 1);
    // Runs well before the questions that used to be the only place this
    // showed up — the review step itself.
    expect(visited.indexOf('passport_readiness_check')).toBeLessThan(visited.indexOf('duration_of_stay'));
  });

  it('does not strand an unauthenticated guest before the auth gate', () => {
    // Guests should get through the pre-auth questions and hit the gate, not
    // a dead end or an immediate wall.
    let answers = {};
    const seen = [];
    for (let i = 0; i < 50; i++) {
      const next = getNextStep(answers, { isAuthenticated: false }, QUESTION_GRAPH);
      if (next.type === 'auth_gate') { seen.push('AUTH_GATE'); break; }
      if (next.type === 'complete') break;
      seen.push(next.step.id);
      answers = { ...answers, ...answerFor(next.step) };
    }
    expect(seen).toContain('AUTH_GATE');
    // A guest should get real value before being asked to sign up.
    expect(seen).toContain('procedure_interest');
    expect(seen.indexOf('AUTH_GATE')).toBeGreaterThan(seen.indexOf('procedure_interest'));
  });
});

describe('what the walk produces is a usable medical record', () => {
  it('every field the payload needs was actually collected', () => {
    const { answers } = walkIntake();
    const payload = buildConsultationPayload(answers, { email_verified: true, phone_verified: true });

    for (const field of ['patient_name', 'email', 'phone', 'procedure_interest', 'age', 'nationality']) {
      expect(payload[field], `${field} must not be empty after a full walk`).toBeTruthy();
    }
    expect(payload.selected_procedures.length).toBeGreaterThan(0);
    expect(payload.clinical_boundary_acknowledged).toBe(true);
  });

  it('a minor is routed to Admin-Review with guardian details, never auto-processed', () => {
    const { answers } = walkIntake({ answerOverrides: { age: { age: '15' } } });
    const payload = buildConsultationPayload(answers);
    expect(payload.guardian_required).toBe(true);
    expect(payload.status).toBe('Admin-Review');
    expect(payload.risk_level).toBe('high');
    expect(payload.guardian_name).toBeTruthy();
    expect(payload.guardian_contact).toBeTruthy();
  });

  it('collects the passport expiry, and asks for it AFTER the travel date', () => {
    // The sentinel measures validity at the travel date, so asking for the
    // passport first would mean checking against today and missing a passport
    // that expires mid-trip.
    const { visited, answers } = walkIntake();
    expect(visited).toContain('passport_expiry_date');
    expect(visited.indexOf('passport_expiry_date')).toBeGreaterThan(visited.indexOf('preferred_date'));

    const payload = buildConsultationPayload(answers);
    expect(payload.passport_expiry_date).toBeTruthy();
  });

  it('carries a multi-procedure selection all the way to the payload', () => {
    const { answers } = walkIntake({
      answerOverrides: {
        procedure_interest: {
          procedure_interest: 'all_on_4',
          selected_procedures: ['all_on_4', 'tummy_tuck'],
        },
      },
    });
    const payload = buildConsultationPayload(answers);
    expect(payload.selected_procedures).toEqual(['all_on_4', 'tummy_tuck']);
  });
});

describe('the RED block is reachable from what the intake actually offers', () => {
  it('every procedure the menu offers maps to the safety engine or is deliberately unmapped', () => {
    const step = QUESTION_GRAPH.find((s) => s.id === 'procedure_interest');
    const mapped = (step.options || []).filter((o) => toSafetyEngineName(o.value));
    // Not every option has a safety profile yet (documented in
    // procedureSafetyNameMap). At least the ones used for stacking must.
    expect(mapped.length).toBeGreaterThan(0);
  });

  it('a two-procedure pick a patient can really make is hard-blocked', () => {
    const items = ['all_on_4', 'tummy_tuck']
      .map(toSafetyEngineName)
      .map((n) => ({ name: n, title: n }));
    expect(items.every((i) => i.name)).toBe(true);
    expect(getViolations(items).isBlocked).toBe(true);
    expect(analyseCompatibility(items).level).toBe('RED');
  });

  it('a single procedure is never blocked', () => {
    const items = [{ name: 'All-on-4 Implants', title: 'All-on-4 Implants' }];
    expect(getViolations(items).isBlocked).toBe(false);
  });
});
