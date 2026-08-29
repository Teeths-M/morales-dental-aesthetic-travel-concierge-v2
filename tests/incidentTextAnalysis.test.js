import { describe, it, expect } from 'vitest';
import {
  computeContentHash,
  truncateToWords,
  deriveIncidentType,
  fallbackAnalyze,
} from '../base44/shared/incidentTextAnalysis.ts';

describe('computeContentHash', () => {
  it('is deterministic for identical input', async () => {
    const a = await computeContentHash('A patient died after surgery', 'A short summary.');
    const b = await computeContentHash('A patient died after surgery', 'A short summary.');
    expect(a).toBe(b);
  });

  it('produces different hashes for different content', async () => {
    const a = await computeContentHash('A patient died after surgery', 'A short summary.');
    const b = await computeContentHash('A totally different headline', 'Different text.');
    expect(a).not.toBe(b);
  });

  it('normalizes case and whitespace before hashing', async () => {
    const a = await computeContentHash('A Patient  Died', 'Some Summary');
    const b = await computeContentHash('a patient died', 'some summary');
    expect(a).toBe(b);
  });

  it('returns a hex string', async () => {
    const hash = await computeContentHash('title', 'snippet');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('truncateToWords', () => {
  it('leaves short text unchanged', () => {
    expect(truncateToWords('a short quote', 25)).toBe('a short quote');
  });

  it('truncates text over the word limit and marks it truncated', () => {
    const longText = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const result = truncateToWords(longText, 25);
    expect(result.split(' ').length).toBeLessThanOrEqual(26); // 25 words + ellipsis token
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles an exact-boundary word count without truncating', () => {
    const exact = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    expect(truncateToWords(exact, 25)).toBe(exact);
  });

  it('handles empty input', () => {
    expect(truncateToWords('', 25)).toBe('');
  });
});

describe('deriveIncidentType', () => {
  it('detects death-shaped language', () => {
    expect(deriveIncidentType('The patient died during the procedure.')).toBe('death');
  });

  it('detects complication-shaped language', () => {
    expect(deriveIncidentType('She was hospitalized with a severe infection.')).toBe('complication');
  });

  it('detects legal-action-shaped language', () => {
    expect(deriveIncidentType('The family filed a lawsuit against the clinic.')).toBe('legal_action');
  });

  it('returns unknown for neutral text', () => {
    expect(deriveIncidentType('A new clinic opened downtown this week.')).toBe('unknown');
  });
});

describe('fallbackAnalyze', () => {
  it('always marks analysis_method as fallback', () => {
    const result = fallbackAnalyze('Patient died after surgery in Mexico', 'A short summary.');
    expect(result.analysis_method).toBe('fallback');
  });

  it('never infers a clinic/provider name — always unknown', () => {
    const result = fallbackAnalyze('Dr. Smith Clinic accused after patient death', 'A short summary.');
    expect(result.provider_or_clinic_mentioned).toBe('unknown');
  });

  it('extracts a known country keyword when present', () => {
    const result = fallbackAnalyze('Patient dies after cosmetic surgery in Mexico', '');
    expect(result.destination_country).toBe('Mexico');
  });

  it('extracts a known procedure keyword when present', () => {
    const result = fallbackAnalyze('Woman hospitalized after liposuction procedure', '');
    expect(result.procedure_type).toBe('Liposuction');
  });

  it('returns unknown for country/procedure when no keyword matches', () => {
    const result = fallbackAnalyze('Something happened somewhere', '');
    expect(result.destination_country).toBe('unknown');
    expect(result.procedure_type).toBe('unknown');
  });

  it('caps analysis_confidence at a low value, never above 30', () => {
    const result = fallbackAnalyze('Patient died after surgery in Mexico', 'A short summary.');
    expect(result.analysis_confidence).toBeLessThanOrEqual(30);
  });

  it('marks is_allegation true by default', () => {
    const result = fallbackAnalyze('Patient died after surgery', '');
    expect(result.is_allegation).toBe(true);
  });

  it('flags missing_information for unresolved fields', () => {
    const result = fallbackAnalyze('Something happened somewhere', '');
    expect(result.missing_information).toContain('procedure_type');
    expect(result.missing_information).toContain('destination_country');
    expect(result.missing_information).toContain('provider_or_clinic_mentioned');
  });
});
