import { describe, it, expect } from 'vitest';
import { reconcileMedication } from '../base44/shared/medicationReconciliation.ts';

const baseMed = (overrides = {}) => ({
  normalized_name: 'Metformin',
  generic_name: '',
  brand_name: '',
  dosage: '500mg',
  frequency: 'twice daily',
  confidence: 90,
  ...overrides,
});

describe('reconcileMedication', () => {
  it('returns no flags for a clean, complete, confident report with no conflicts', () => {
    const { flags } = reconcileMedication(baseMed(), [], 'None');
    expect(flags).toEqual([]);
  });

  it('flags a duplicate against an existing active medication with the same name (case-insensitive)', () => {
    const { flags } = reconcileMedication(
      baseMed({ normalized_name: 'metformin' }),
      [{ normalized_name: 'Metformin', status: 'active' }],
      'None',
    );
    expect(flags).toContain('duplicate_active_medication');
  });

  it('does not flag a duplicate against a discontinued medication', () => {
    const { flags } = reconcileMedication(
      baseMed(),
      [{ normalized_name: 'Metformin', status: 'discontinued' }],
      'None',
    );
    expect(flags).not.toContain('duplicate_active_medication');
  });

  it('flags a naive allergy-name substring match', () => {
    const { flags } = reconcileMedication(
      baseMed({ normalized_name: 'Penicillin' }),
      [],
      'Allergic to penicillin and shellfish',
    );
    expect(flags).toContain('possible_allergy_conflict');
  });

  it('does not flag when the allergy text is empty or "None"', () => {
    const { flags } = reconcileMedication(baseMed({ normalized_name: 'Penicillin' }), [], 'None');
    expect(flags).not.toContain('possible_allergy_conflict');
    const { flags: flags2 } = reconcileMedication(baseMed({ normalized_name: 'Penicillin' }), [], '');
    expect(flags2).not.toContain('possible_allergy_conflict');
  });

  it('flags missing dosage and missing frequency independently', () => {
    const { flags: noDose } = reconcileMedication(baseMed({ dosage: '' }), [], 'None');
    expect(noDose).toContain('missing_dosage_details');
    expect(noDose).not.toContain('missing_frequency');

    const { flags: noFreq } = reconcileMedication(baseMed({ frequency: '' }), [], 'None');
    expect(noFreq).toContain('missing_frequency');
    expect(noFreq).not.toContain('missing_dosage_details');
  });

  it('flags ambiguous extraction below the confidence floor, never at or above it', () => {
    const { flags: low } = reconcileMedication(baseMed({ confidence: 49 }), [], 'None');
    expect(low).toContain('ambiguous_extraction');

    const { flags: atFloor } = reconcileMedication(baseMed({ confidence: 50 }), [], 'None');
    expect(atFloor).not.toContain('ambiguous_extraction');
  });

  it('can return multiple flags at once', () => {
    const { flags } = reconcileMedication(
      baseMed({ normalized_name: 'Penicillin', dosage: '', frequency: '', confidence: 10 }),
      [{ normalized_name: 'Penicillin', status: 'active' }],
      'Allergic to penicillin',
    );
    expect(flags).toEqual(expect.arrayContaining([
      'duplicate_active_medication', 'possible_allergy_conflict', 'missing_dosage_details',
      'missing_frequency', 'ambiguous_extraction',
    ]));
  });

  it('never throws on missing/empty inputs', () => {
    expect(() => reconcileMedication({}, [], null)).not.toThrow();
    expect(() => reconcileMedication({}, [], undefined)).not.toThrow();
    expect(reconcileMedication({}, [], null).flags).toContain('missing_dosage_details');
  });

  it('never mutates the medications/allergy inputs it was given', () => {
    const existing = [{ normalized_name: 'Metformin', status: 'active' }];
    const existingCopy = JSON.parse(JSON.stringify(existing));
    const newMed = baseMed();
    const newMedCopy = JSON.parse(JSON.stringify(newMed));
    reconcileMedication(newMed, existing, 'Allergic to penicillin');
    expect(existing).toEqual(existingCopy);
    expect(newMed).toEqual(newMedCopy);
  });
});
