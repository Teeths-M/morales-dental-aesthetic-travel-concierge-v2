import { describe, it, expect } from 'vitest';
import { scoreProcedureMatch, findBestMatches, tokenize } from '../base44/shared/procedureKnowledgeMatch.ts';

const BBL = { procedure_name: 'Brazilian Butt Lift (BBL)', aliases: ['butt lift', 'gluteal augmentation'], category: 'Cosmetic' };
const IMPLANTS = { procedure_name: 'Dental Implants', aliases: ['tooth implants'], category: 'Dental' };
const RHINO = { procedure_name: 'Rhinoplasty', aliases: ['nose job'], category: 'Cosmetic' };

describe('scoreProcedureMatch', () => {
  it('scores an exact name match at 1', () => {
    expect(scoreProcedureMatch('Brazilian Butt Lift (BBL)', BBL)).toBe(1);
  });

  it('scores a substring match against the procedure name at 0.85', () => {
    // "butt lift" is also a substring of "Brazilian Butt Lift (BBL)" itself,
    // so the name-substring branch wins over the alias-exact branch here —
    // both are confident matches, this just documents which one fires.
    expect(scoreProcedureMatch('butt lift', BBL)).toBe(0.85);
  });

  it('scores an exact alias match at 0.9 when it is not also a name substring', () => {
    expect(scoreProcedureMatch('tooth implants', IMPLANTS)).toBe(0.9);
  });

  it('scores a casual alias phrase confidently', () => {
    expect(scoreProcedureMatch('gluteal augmentation', BBL)).toBeGreaterThanOrEqual(0.9);
  });

  it('scores an unrelated procedure at 0', () => {
    expect(scoreProcedureMatch('rhinoplasty', IMPLANTS)).toBe(0);
  });

  it('gives partial credit for token overlap without an exact/alias hit', () => {
    const score = scoreProcedureMatch('dental implant surgery cost', IMPLANTS);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.85);
  });

  it('is case-insensitive', () => {
    expect(scoreProcedureMatch('RHINOPLASTY', RHINO)).toBe(1);
  });
});

describe('tokenize', () => {
  it('drops stopwords and short tokens', () => {
    // "want" and "I"/"a" are stopwords too — "job" is the only 3-letter
    // survivor because it isn't in the stopword list.
    expect(tokenize('I want a nose job')).toEqual(['nose', 'job']);
  });

  it('handles empty/undefined input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });
});

describe('findBestMatches', () => {
  const records = [BBL, IMPLANTS, RHINO];

  it('returns the single best match sorted first', () => {
    const results = findBestMatches('nose job', records, { limit: 3 });
    expect(results[0].procedure_name).toBe('Rhinoplasty');
  });

  it('excludes matches at or below the threshold', () => {
    const results = findBestMatches('completely unrelated query xyz', records, { threshold: 0.2 });
    expect(results).toEqual([]);
  });

  it('respects the limit', () => {
    const results = findBestMatches('cosmetic procedure', records, { threshold: 0, limit: 1 });
    expect(results.length).toBe(1);
  });

  it('carries the original record fields alongside score', () => {
    const [best] = findBestMatches('butt lift', records, { limit: 1 });
    expect(best.category).toBe('Cosmetic');
    expect(typeof best.score).toBe('number');
  });
});
