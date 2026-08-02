import { describe, it, expect } from 'vitest';
import { getVisaMatrixMatch, checkVisaRequirement } from '@/lib/visaMatrix';

describe('getVisaMatrixMatch — explicit vs. guessed matches', () => {
  it('marks a cited EXPLICIT_ROUTES entry as explicit (Trinidad and Tobago is CARICOM, exempt for Venezuela)', () => {
    expect(getVisaMatrixMatch('Trinidad and Tobago', 'Venezuela')).toEqual({ status: 'exempt', isExplicit: true });
  });

  it('carves out the one documented CARICOM exception (Saint Lucia needs an embassy visa for Venezuela)', () => {
    expect(getVisaMatrixMatch('Saint Lucian', 'Venezuela')).toEqual({ status: 'embassy', isExplicit: true });
  });

  it('marks the same-country shortcut as explicit', () => {
    expect(getVisaMatrixMatch('Venezuelan', 'Venezuela')).toEqual({ status: 'exempt', isExplicit: true });
  });

  it('marks a broad regional fallback (no cited route for this pair) as a guess, not explicit', () => {
    // Belize's EXPLICIT_ROUTES cover EU/Western, CARICOM, and a LATAM+extras
    // eVisa list — Kenyan isn't in any of them, so this falls through to the
    // uncited "embassy" catch-all at the bottom of checkVisaRequirement.
    expect(getVisaMatrixMatch('Kenyan', 'Belize')).toEqual({ status: 'embassy', isExplicit: false });
  });

  it('returns unknown/not-explicit for missing input', () => {
    expect(getVisaMatrixMatch('', 'Venezuela')).toEqual({ status: 'unknown', isExplicit: false });
    expect(getVisaMatrixMatch('Trinidad and Tobago', '')).toEqual({ status: 'unknown', isExplicit: false });
  });
});

describe('checkVisaRequirement — unchanged public shape (status string only)', () => {
  it('still returns a bare status string for existing callers', () => {
    expect(checkVisaRequirement('Trinidad and Tobago', 'Venezuela')).toBe('exempt');
  });
});
