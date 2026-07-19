import { describe, it, expect } from 'vitest';
import {
  analyseCompatibility,
  getViolations,
  PROCEDURE_PROFILES,
  suggestFirstStage,
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

// ─────────────────────────────────────────────────────────────────────────────
// M does not merely block. It recommends.
//
// "M dont just block, we help and recommend based on the user consultation
// medical conditions." — that is the product, not a nicety, and it is enforced
// here because it is easy to lose: ProcedureStackingBlocker gates its entire
// "What M recommends instead" panel — including the line "M is not here to take
// your dream away. We are here to make sure you are alive to enjoy it." — on
// `violations.some(v => v.recommended)`. A violation shipped without a
// recommendation silently turns M into a wall.
//
// All 16 named RED pairs carry hand-written recommendations. The two catch-all
// violations (3+ major surgeries, >8hrs anesthesia) did not, which left 2,748
// three-procedure combinations blocked with no alternative offered.
// ─────────────────────────────────────────────────────────────────────────────
describe('M recommends whenever it blocks', () => {
  it('every named RED pair offers an alternative', () => {
    const missing = [];
    const names = Object.keys(PROCEDURE_PROFILES);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const { violations } = getViolations(asItems(names[i], names[j]));
        for (const v of violations) {
          if (!v.recommended) missing.push(`${names[i]} + ${names[j]} (${v.code})`);
        }
      }
    }
    expect(missing, `blocked with no alternative:\n${missing.join('\n')}`).toEqual([]);
  });

  it('the catch-all violations offer an alternative too', () => {
    // A cart that trips the combined-anesthesia ceiling rather than a named pair.
    const { violations, isBlocked } = getViolations(
      asItems('Dental Cleaning', 'Root Canal Treatment', 'Full Mouth Implants'),
    );
    expect(isBlocked).toBe(true);
    const catchAll = violations.find(v => /Combined Anesthesia|Major Surgeries/.test(v.pairLabel));
    expect(catchAll, 'this cart must hit a catch-all violation').toBeTruthy();
    expect(catchAll.recommended, 'a catch-all block must still recommend').toBeTruthy();
    expect(catchAll.recommendedReason).toMatch(/follow/i);
  });

  it('keeps the procedure the patient travelled for, and defers the minor work', () => {
    // Regression guard. The first implementation walked the cart in selection
    // order and told this patient to have the cleaning and the root canal and
    // to defer the implants — safe, and useless. The heaviest procedure is
    // almost always the reason the trip exists.
    const stage = suggestFirstStage(['Dental Cleaning', 'Root Canal Treatment', 'Full Mouth Implants']);
    expect(stage).toContain('Full Mouth Implants');
    expect(stage).not.toContain('Root Canal Treatment');
  });

  it('never proposes a first stage its own rules would block', () => {
    // The recommendation must be verifiable by the engine that produced it —
    // M cannot suggest a combination it would itself refuse.
    const names = Object.keys(PROCEDURE_PROFILES);
    const unsafe = [];
    for (let i = 0; i < names.length; i += 3) {
      for (let j = i + 1; j < names.length; j += 5) {
        for (let k = j + 1; k < names.length; k += 7) {
          const cart = [names[i], names[j], names[k]];
          const stage = suggestFirstStage(cart);
          if (stage.length < 2) continue;
          const { isBlocked } = getViolations(asItems(...stage));
          if (isBlocked) unsafe.push(`${cart.join(' + ')} → suggested ${stage.join(' + ')}`);
        }
      }
    }
    expect(unsafe, `M suggested a stage it would block:\n${unsafe.join('\n')}`).toEqual([]);
  });
});
