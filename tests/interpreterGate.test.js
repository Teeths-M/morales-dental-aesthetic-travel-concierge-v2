import { describe, it, expect } from 'vitest';
import { assessInterpreterNeed } from '../base44/shared/interpreterGate.ts';

describe('assessInterpreterNeed', () => {
  it('reports same_language when patient and doctor languages match', () => {
    const result = assessInterpreterNeed('en', 'en');
    expect(result.languages_differ).toBe(false);
    expect(result.recommendation).toBe('same_language');
  });

  it('is case-insensitive when comparing languages', () => {
    const result = assessInterpreterNeed('EN', 'en');
    expect(result.languages_differ).toBe(false);
  });

  it('flags a real mismatch and recommends a human interpreter', () => {
    const result = assessInterpreterNeed('es', 'en');
    expect(result.languages_differ).toBe(true);
    expect(result.recommendation).toBe('human_interpreter_recommended');
    expect(result.patient_language).toBe('es');
    expect(result.doctor_language).toBe('en');
  });

  it('falls back to the needs_translator flag when a language is unknown', () => {
    const withFlag = assessInterpreterNeed(null, null, true);
    expect(withFlag.languages_differ).toBe(true);

    const withoutFlag = assessInterpreterNeed(null, null, false);
    expect(withoutFlag.languages_differ).toBe(false);
  });

  it('prefers the real language comparison over the flag when both languages are known', () => {
    // Even if needs_translator was left true from an earlier intake step,
    // two identical known languages should not be treated as a mismatch.
    const result = assessInterpreterNeed('en', 'en', true);
    expect(result.languages_differ).toBe(false);
  });

  it('handles empty-string languages the same as missing ones', () => {
    const result = assessInterpreterNeed('', '', true);
    expect(result.languages_differ).toBe(true);
    expect(result.recommendation).toBe('human_interpreter_recommended');
  });
});
