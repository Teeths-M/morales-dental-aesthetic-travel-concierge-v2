import { describe, it, expect } from 'vitest';
import {
  analyseCompatibility,
  getViolations,
} from '@/lib/procedureCompatibility';
import { fuzzyScore, fuzzyMatches } from '@/lib/fuzzyMatch';
import { isMinorAge } from '@/lib/intakeFlow/questionGraph';
import { buildConsultationPayload } from '@/lib/intakeFlow/fieldMap';

const asItems = (...names) => names.map((name) => ({ name, title: name }));

// ─────────────────────────────────────────────────────────────────────────────
// The RED hard block — THE M Principle. If this ever silently regresses, a
// clinically dangerous combination gets approved. These are the tests that must
// never go yellow.
// ─────────────────────────────────────────────────────────────────────────────
describe('getViolations — the unbypassable safety gate', () => {
  it('BLOCKS a known clinically dangerous pair', () => {
    const { isBlocked, violations } = getViolations(asItems('Full Mouth Implants', 'Facelift'));
    expect(isBlocked).toBe(true);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('BLOCKS an anesthesia-overload pair (implants + abdominoplasty)', () => {
    const { isBlocked } = getViolations(asItems('Full Mouth Implants', 'Tummy Tuck'));
    expect(isBlocked).toBe(true);
  });

  it('does NOT block a single procedure', () => {
    expect(getViolations(asItems('Teeth Whitening')).isBlocked).toBe(false);
  });

  it('does NOT block a genuinely safe small combination', () => {
    expect(getViolations(asItems('Dental Cleaning', 'Teeth Whitening')).isBlocked).toBe(false);
  });

  it('reads either name or title on the item', () => {
    const byName = getViolations([{ name: 'Full Mouth Implants' }, { name: 'Facelift' }]);
    expect(byName.isBlocked).toBe(true);
  });
});

describe('analyseCompatibility — GREEN / YELLOW / RED classification', () => {
  it('classifies a single procedure as GREEN', () => {
    expect(analyseCompatibility(asItems('Teeth Whitening')).level).toBe('GREEN');
  });

  it('classifies a known dangerous pair as RED', () => {
    expect(analyseCompatibility(asItems('Full Mouth Implants', 'Tummy Tuck')).level).toBe('RED');
  });

  it('flags extreme total anesthesia (>8 hrs) as RED even without a named pair', () => {
    // Full Mouth Implants (7h) + All-on-6 Implants (6h) = 13h total
    const r = analyseCompatibility(asItems('Full Mouth Implants', 'All-on-6 Implants'));
    expect(r.level).toBe('RED');
    expect(r.totalAnesthesiaHrs).toBeGreaterThan(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Under-18 guardian gate — must never route an adult into the minor flow, and
// must never let a real minor slip through as an adult.
// ─────────────────────────────────────────────────────────────────────────────
describe('isMinorAge — the guardian gate', () => {
  it('is true for a clear minor', () => {
    expect(isMinorAge(16)).toBe(true);
    expect(isMinorAge('17')).toBe(true);
  });

  it('is false at 18 and above', () => {
    expect(isMinorAge(18)).toBe(false);
    expect(isMinorAge('45')).toBe(false);
  });

  it('is false for unparseable ages — an adult with a typo must not be misrouted', () => {
    expect(isMinorAge('forty-five')).toBe(false);
    expect(isMinorAge('')).toBe(false);
    expect(isMinorAge(null)).toBe(false);
    expect(isMinorAge(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Field mapping — the minor→guardian escalation and medical history must reach
// the Consultation record intact.
// ─────────────────────────────────────────────────────────────────────────────
describe('buildConsultationPayload — minor escalation + medical history', () => {
  it('escalates an under-18 to guardian_required + Admin-Review', () => {
    const p = buildConsultationPayload({
      age: '16', guardian_name: 'Maria Mother', guardian_contact: 'maria@example.com',
      patient_name: 'Kid Patient', email: 'kid@example.com',
    });
    expect(p.guardian_required).toBe(true);
    expect(p.status).toBe('Admin-Review');
    expect(p.risk_level).toBe('high');
    expect(p.emergency_contact_name).toBe('Maria Mother');
  });

  it('does NOT escalate an adult', () => {
    const p = buildConsultationPayload({ age: '30', patient_name: 'Adult', email: 'a@example.com' });
    expect(p.guardian_required).toBeUndefined();
    expect(p.status).toBeUndefined();
  });

  it('carries the safety-critical medical history fields', () => {
    const p = buildConsultationPayload({
      age: '40',
      takes_medications: true, medication_types: ['Blood Thinners'],
      anesthesia_complications: true, anesthesia_complication_types: ['Allergic reactions'],
      had_surgery: true, previous_procedures: 'Gallbladder',
    });
    expect(p.takes_medications).toBe(true);
    expect(p.medication_types).toEqual(['Blood Thinners']);
    expect(p.anesthesia_complications).toBe(true);
    expect(p.had_surgery).toBe(true);
  });

  it('records data-processing consent (with timestamp + version) when the client agreed', () => {
    const p = buildConsultationPayload({
      age: '30', patient_name: 'A', email: 'a@example.com',
      data_processing_consent: true,
      data_processing_consent_at: '2026-07-11T00:00:00.000Z',
    });
    expect(p.data_processing_consent).toBe(true);
    expect(p.data_processing_consent_at).toBe('2026-07-11T00:00:00.000Z');
    expect(typeof p.data_processing_consent_version).toBe('string');
    expect(p.data_processing_consent_version.length).toBeGreaterThan(0);
  });

  it('never fabricates consent that was not given', () => {
    const p = buildConsultationPayload({ age: '30', patient_name: 'A', email: 'a@example.com' });
    expect(p.data_processing_consent).toBe(false);
    expect(p.data_processing_consent_at).toBeUndefined();
    expect(p.data_processing_consent_version).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy matching — "can't spell my name but I can book on M". Typos must still
// surface the right option.
// ─────────────────────────────────────────────────────────────────────────────
describe('fuzzyMatch — typo tolerance', () => {
  it('scores an exact match highest', () => {
    expect(fuzzyScore('rhinoplasty', 'Rhinoplasty')).toBe(100);
  });

  it('matches a substring strongly', () => {
    expect(fuzzyScore('veneers', 'Porcelain Veneers')).toBeGreaterThanOrEqual(90);
  });

  it('tolerates a typo above the default threshold', () => {
    expect(fuzzyMatches('rhinoplsty', 'Rhinoplasty')).toBe(true);
  });

  it('rejects an unrelated term', () => {
    expect(fuzzyMatches('xylophone', 'Rhinoplasty')).toBe(false);
  });
});
