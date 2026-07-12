import { describe, it, expect } from 'vitest';
import { QUESTION_GRAPH } from '@/lib/intakeFlow/questionGraph';
import { getAnsweredQuestionCount, getTotalQuestionCount } from '@/lib/intakeFlow/flowEngine';

// Regression for the ReferenceError that crashed /intake:
// questionGraph.js re-exported isMinorAge with `export { x } from 'y'`, which
// forwards to importers but creates NO local binding — so the skipIf closures that
// call isMinorAge(...) inside the module threw "isMinorAge is not defined" at
// runtime. Source-invariant tests missed it because it only fires when a skipIf is
// actually executed. These run the flow engine's skipIf filters for real.
describe('intake flow — skipIf hooks execute (isMinorAge local binding)', () => {
  it('getAnsweredQuestionCount runs every skipIf without throwing', () => {
    expect(() => getAnsweredQuestionCount({}, QUESTION_GRAPH)).not.toThrow();
    expect(() => getAnsweredQuestionCount({ age: '16' }, QUESTION_GRAPH)).not.toThrow();
    expect(() => getAnsweredQuestionCount({ age: '30' }, QUESTION_GRAPH)).not.toThrow();
    expect(typeof getTotalQuestionCount(QUESTION_GRAPH)).toBe('number');
  });

  it('the guardian question is asked for a minor and skipped for an adult', () => {
    const guardian = QUESTION_GRAPH.find((s) => s.id === 'guardian_name');
    expect(guardian, 'guardian_name step must exist').toBeTruthy();
    expect(guardian.skipIf({ age: '16' })).toBe(false); // minor → asked
    expect(guardian.skipIf({ age: '30' })).toBe(true);  // adult → skipped
    expect(guardian.skipIf({ age: '' })).toBe(true);    // unknown age → not routed to guardian flow
  });
});
