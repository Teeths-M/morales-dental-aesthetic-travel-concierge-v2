import { describe, it, expect } from 'vitest';
import {
  deriveIntake,
  assertNotSafetyField,
  SAFETY_INPUT_FIELDS,
} from '@/lib/intakeFlow/derivedFields';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';

const RECOVERY = { totalRecoveryDays: 14, level: 'GREEN' };

describe('M never derives a medical fact about a patient', () => {
  // The load-bearing test. Everything else here is behaviour; this is the
  // M Principle: a computed guess must not reach computeSafeT wearing the
  // patient's voice.
  it('produces no prefilled field that the SAFE-T engine reads', () => {
    const { prefilled } = deriveIntake({
      answers: {},
      safetyStatus: RECOVERY,
      costEstimate: { status: 'done', data: { estimatedTotalLow: 1000, estimatedTotalHigh: 2000 } },
      doctorSearch: { status: 'done', data: { matched_doctors: [{}, {}] } },
    });
    for (const item of prefilled) {
      expect(SAFETY_INPUT_FIELDS.has(item.field)).toBe(false);
    }
  });

  it('refuses medical fields explicitly', () => {
    for (const field of ['medical_conditions', 'age', 'allergies', 'takes_medications', 'procedure_interest']) {
      expect(() => assertNotSafetyField(field)).toThrow(/must be asked, never derived/);
    }
  });

  it('allows a logistics field', () => {
    expect(() => assertNotSafetyField('duration_of_stay')).not.toThrow();
  });
});

describe('deriveIntake fills only what the patient left blank', () => {
  it('derives length of stay from the deterministic recovery window', () => {
    const { prefilled } = deriveIntake({ answers: {}, safetyStatus: RECOVERY });
    const stay = prefilled.find((p) => p.field === 'duration_of_stay');
    expect(stay).toBeTruthy();
    expect(stay.value).toBe('About 14 days');
    expect(stay.basis).toBeTruthy();
  });

  it('does NOT overwrite a stay the patient gave', () => {
    const { prefilled } = deriveIntake({
      answers: { duration_of_stay: '3 weeks' },
      safetyStatus: RECOVERY,
    });
    expect(prefilled.find((p) => p.field === 'duration_of_stay')).toBeUndefined();
  });

  it('treats "recommend one for me" as unanswered', () => {
    const { prefilled } = deriveIntake({
      answers: { duration_of_stay: UNSPECIFIED },
      safetyStatus: RECOVERY,
    });
    expect(prefilled.find((p) => p.field === 'duration_of_stay')).toBeTruthy();
  });

  it('derives nothing when the procedure needs no recovery', () => {
    const { prefilled } = deriveIntake({
      answers: {},
      safetyStatus: { totalRecoveryDays: 0 },
    });
    expect(prefilled).toEqual([]);
  });

  it('singularises a one-day window', () => {
    const { prefilled } = deriveIntake({ answers: {}, safetyStatus: { totalRecoveryDays: 1 } });
    expect(prefilled[0].value).toBe('About 1 day');
  });

  it('survives being called with nothing', () => {
    expect(deriveIntake()).toEqual({ prefilled: [], insights: [] });
  });
});

describe('insights are shown only when the lookup actually returned', () => {
  it('omits cost while it is still loading', () => {
    const { insights } = deriveIntake({
      answers: {},
      safetyStatus: RECOVERY,
      costEstimate: { status: 'loading', data: null },
    });
    expect(insights.find((i) => i.key === 'cost')).toBeUndefined();
  });

  it('omits cost when the backend cleanly declined', () => {
    const { insights } = deriveIntake({
      answers: {},
      costEstimate: { status: 'unavailable', data: null },
    });
    expect(insights.find((i) => i.key === 'cost')).toBeUndefined();
  });

  it('shows a cost range as an estimate, never as a quote', () => {
    const { insights } = deriveIntake({
      answers: {},
      costEstimate: { status: 'done', data: { estimatedTotalLow: 4200, estimatedTotalHigh: 7800 } },
    });
    const cost = insights.find((i) => i.key === 'cost');
    expect(cost.value).toBe('$4,200 – $7,800');
    expect(cost.basis).toMatch(/estimate, not a quote/i);
  });

  it('omits the doctor count when none matched', () => {
    const { insights } = deriveIntake({
      answers: {},
      doctorSearch: { status: 'done', data: { matched_doctors: [] } },
    });
    expect(insights.find((i) => i.key === 'doctors')).toBeUndefined();
  });
});
