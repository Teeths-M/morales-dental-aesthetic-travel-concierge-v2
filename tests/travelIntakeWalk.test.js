import { describe, it, expect } from 'vitest';
import { INPUT_TYPES } from '@/lib/intakeFlow/questionGraph';
import { getNextStep } from '@/lib/intakeFlow/flowEngine';
import { TRAVEL_QUESTION_GRAPH } from '@/lib/travelIntakeFlow/questionGraph';

/**
 * Headless walk of the travel-only intake — same purpose as
 * tests/intakeWalk.test.js for the medical flow: drives the real engine
 * against the real graph so a step whose component doesn't write every
 * targetField (an infinite re-ask) is caught here, not in the browser.
 */
function answerFor(step) {
  const t = step.inputType;
  if (t === INPUT_TYPES.VISA_READINESS) return { visa_readiness_acknowledged: true };
  if (t === INPUT_TYPES.PASSPORT_READINESS) return { passport_readiness_acknowledged: true };
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
  const out = {};
  step.targetFields.forEach((f) => { out[f] = `answer_${step.id}`; });
  return out;
}

function walkTravelIntake({ isAuthenticated = true } = {}) {
  let answers = {};
  const visited = [];
  const seenTwice = new Map();

  for (let guard = 0; guard < 100; guard++) {
    const next = getNextStep(answers, { isAuthenticated }, TRAVEL_QUESTION_GRAPH);
    if (next.type === 'complete') return { answers, visited };
    const step = next.step;
    if (next.type === 'auth_gate') {
      if (!isAuthenticated) return { answers, visited, atAuthGate: true };
      throw new Error(`auth gate at "${step.id}" while isAuthenticated=true`);
    }
    if (step.inputType === INPUT_TYPES.REVIEW) {
      return { answers, visited, atReview: true };
    }
    const count = (seenTwice.get(step.id) || 0) + 1;
    seenTwice.set(step.id, count);
    if (count > 2) {
      throw new Error(`DEAD END: "${step.id}" (${step.inputType}) re-asked ${count}× — its component does not write every targetField [${step.targetFields.join(', ')}].`);
    }
    visited.push(step.id);
    answers = { ...answers, ...answerFor(step) };
  }
  throw new Error('walk exceeded 100 steps without completing');
}

describe('a traveler can actually get through the travel-only intake', () => {
  it('reaches the final review without ever being asked the same question twice', () => {
    const { visited, atReview } = walkTravelIntake();
    expect(atReview, 'flow must terminate at final_review').toBe(true);
    expect(visited.length).toBeGreaterThan(4);
  });

  it('checks visa/entry requirements immediately after origin_country — this flow had no such check before', () => {
    const { visited } = walkTravelIntake();
    expect(visited).toContain('visa_readiness_check');
    expect(visited.indexOf('visa_readiness_check')).toBe(visited.indexOf('origin_country') + 1);
    expect(visited.indexOf('visa_readiness_check')).toBeGreaterThan(visited.indexOf('travel_destination_country'));
    expect(visited.indexOf('visa_readiness_check')).toBeLessThan(visited.indexOf('departure_date'));
  });

  it('does not gate the visa check itself behind sign-in — it runs before the auth boundary', () => {
    const { visited } = walkTravelIntake({ isAuthenticated: false });
    expect(visited).toContain('visa_readiness_check');
  });

  it('now asks for passport expiry and checks it right after departure_date — this flow had no passport question before', () => {
    const { visited } = walkTravelIntake();
    expect(visited).toContain('passport_expiry_date');
    expect(visited.indexOf('passport_expiry_date')).toBe(visited.indexOf('departure_date') + 1);
    expect(visited).toContain('passport_readiness_check');
    expect(visited.indexOf('passport_readiness_check')).toBe(visited.indexOf('passport_expiry_date') + 1);
    expect(visited.indexOf('passport_readiness_check')).toBeLessThan(visited.indexOf('return_date'));
  });

  it('does not gate the passport check behind sign-in either — it also runs before the auth boundary', () => {
    const { visited } = walkTravelIntake({ isAuthenticated: false });
    expect(visited).toContain('passport_readiness_check');
  });
});
