import { describe, it, expect } from 'vitest';
import {
  PROCEDURE_SAFETY_NAMES as CLIENT_NAMES,
  toSafetyEngineName as clientToName,
} from '@/lib/intakeFlow/procedureSafetyNameMap';
import {
  PROCEDURE_SAFETY_NAMES as SERVER_NAMES,
  toSafetyEngineName as serverToName,
} from '../base44/shared/procedureSafetyNameMap.ts';

// The server re-runs the RED check from a stored Consultation
// (updateMyCaseRecord's place_high_risk_hold). If its name map drifts from the
// browser's, the two would disagree about whether a combination is blocked.
describe('procedureSafetyNameMap: browser and server copies', () => {
  it('map exactly the same keys to exactly the same safety-engine names', () => {
    expect(SERVER_NAMES).toEqual(CLIENT_NAMES);
  });

  it('agree on every known key and on an unknown one', () => {
    for (const key of [...Object.keys(CLIENT_NAMES), 'not_a_procedure', '']) {
      expect(serverToName(key)).toBe(clientToName(key));
    }
  });

  it('return null for an unknown key rather than guessing', () => {
    expect(serverToName('not_a_procedure')).toBeNull();
  });
});
