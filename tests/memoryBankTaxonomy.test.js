import { describe, it, expect } from 'vitest';
import { classifyProcedureCategory } from '../base44/functions/_shared/procedureCategory.ts';
import { bucketConditions } from '../base44/functions/_shared/conditionBuckets.ts';
import { bucketMedicationNames } from '../base44/functions/_shared/medicationCategories.ts';

describe('classifyProcedureCategory', () => {
  it('classifies dental procedures', () => {
    expect(classifyProcedureCategory('Multiple Dental Implants')).toBe('dental');
    expect(classifyProcedureCategory('Wisdom Tooth Removal')).toBe('dental');
    expect(classifyProcedureCategory('Dental Crowns')).toBe('dental');
  });

  it('classifies aesthetic procedures', () => {
    expect(classifyProcedureCategory('Rhinoplasty')).toBe('aesthetic');
    expect(classifyProcedureCategory('Liposuction')).toBe('aesthetic');
    expect(classifyProcedureCategory('Breast Augmentation')).toBe('aesthetic');
  });

  it('falls back to general for anything unrecognized', () => {
    expect(classifyProcedureCategory('Knee Replacement')).toBe('general');
    expect(classifyProcedureCategory('')).toBe('general');
    expect(classifyProcedureCategory(undefined)).toBe('general');
  });
});

describe('bucketConditions', () => {
  it('returns none_noted for empty input', () => {
    expect(bucketConditions('')).toEqual(['none_noted']);
    expect(bucketConditions(null)).toEqual(['none_noted']);
    expect(bucketConditions([])).toEqual(['none_noted']);
  });

  it('buckets a comma-string (CaseRecord shape)', () => {
    const tags = bucketConditions('Diabetes, High Blood Pressure');
    expect(tags).toContain('diabetes');
    expect(tags).toContain('hypertension');
  });

  it('buckets an array (Consultation shape)', () => {
    const tags = bucketConditions(['Asthma', 'Thyroid Disorder']);
    expect(tags).toContain('respiratory');
    expect(tags).toContain('thyroid');
  });

  it('never returns raw condition text as a tag', () => {
    const tags = bucketConditions('Diabetes');
    expect(tags).not.toContain('Diabetes');
    expect(tags.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it('falls back to none_noted when nothing matches a known bucket', () => {
    expect(bucketConditions('Something totally unrelated')).toEqual(['none_noted']);
  });
});

describe('bucketMedicationNames', () => {
  it('returns an empty array for no medications', () => {
    expect(bucketMedicationNames([])).toEqual([]);
    expect(bucketMedicationNames(null)).toEqual([]);
  });

  it('categorizes known medication names', () => {
    const tags = bucketMedicationNames([{ name: 'Amoxicillin 500mg' }, { name: 'Ibuprofen 400mg' }]);
    expect(tags).toContain('antibiotic');
    expect(tags).toContain('pain_relief');
  });

  it('falls back to other for an unrecognized medication name', () => {
    expect(bucketMedicationNames([{ name: 'Zzzznotarealdrugxyz' }])).toEqual(['other']);
  });

  it('never inspects dose/frequency/notes fields, only name', () => {
    // A dangerous dose string must not itself trigger a category match on its own.
    const tags = bucketMedicationNames([{ name: 'Widget', dose: 'Amoxicillin 500mg' }]);
    expect(tags).toEqual(['other']);
  });
});
