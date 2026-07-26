import { describe, it, expect } from 'vitest';
import { computeProcedureMatch } from '../base44/functions/_shared/procedureMatch.ts';

describe('computeProcedureMatch', () => {
  it('returns not_checked when the doctor has confirmed nothing yet', () => {
    const r = computeProcedureMatch(['Dental Cleaning'], []);
    expect(r.status).toBe('not_checked');
    expect(r.extra).toEqual([]);
    expect(r.missing).toEqual([]);
  });

  it('returns not_checked when confirmed is null/undefined', () => {
    expect(computeProcedureMatch(['Dental Cleaning'], null).status).toBe('not_checked');
    expect(computeProcedureMatch(['Dental Cleaning'], undefined).status).toBe('not_checked');
  });

  it('matches when booked and confirmed are identical', () => {
    const r = computeProcedureMatch(['Rhinoplasty', 'Liposuction'], ['Rhinoplasty', 'Liposuction']);
    expect(r.status).toBe('matched');
    expect(r.extra).toEqual([]);
    expect(r.missing).toEqual([]);
  });

  it('matches case-insensitively and ignores order', () => {
    const r = computeProcedureMatch(['Rhinoplasty', 'Liposuction'], ['liposuction', 'RHINOPLASTY']);
    expect(r.status).toBe('matched');
  });

  it('is a partial_match when the doctor confirms fewer procedures than booked', () => {
    const r = computeProcedureMatch(['Rhinoplasty', 'Liposuction'], ['Rhinoplasty']);
    expect(r.status).toBe('partial_match');
    expect(r.missing).toEqual(['Liposuction']);
    expect(r.extra).toEqual([]);
  });

  it('is mismatch_flagged when the doctor confirms something not booked', () => {
    const r = computeProcedureMatch(['Rhinoplasty'], ['Rhinoplasty', 'Facelift']);
    expect(r.status).toBe('mismatch_flagged');
    expect(r.extra).toEqual(['Facelift']);
  });

  it('is mismatch_flagged (not partial_match) even when some booked items are also missing', () => {
    const r = computeProcedureMatch(['Rhinoplasty', 'Liposuction'], ['Facelift']);
    expect(r.status).toBe('mismatch_flagged');
    expect(r.extra).toEqual(['Facelift']);
    expect(r.missing).toEqual(['Rhinoplasty', 'Liposuction']);
  });

  it('always returns a non-empty explanation string', () => {
    for (const [booked, confirmed] of [
      [['A'], []],
      [['A'], ['A']],
      [['A', 'B'], ['A']],
      [['A'], ['A', 'B']],
    ]) {
      expect(typeof computeProcedureMatch(booked, confirmed).explanation).toBe('string');
      expect(computeProcedureMatch(booked, confirmed).explanation.length).toBeGreaterThan(0);
    }
  });
});
