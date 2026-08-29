import { describe, it, expect } from 'vitest';
import { detectWakePhrase, WAKE_PHRASE_EXAMPLES } from '@/lib/wakePhrase';

describe('detectWakePhrase', () => {
  it('matches every real phrase variant exactly', () => {
    for (const phrase of WAKE_PHRASE_EXAMPLES) {
      expect(detectWakePhrase(phrase)).toBe(true);
    }
  });

  it('matches case-insensitively', () => {
    expect(detectWakePhrase('Hey M-Care')).toBe(true);
    expect(detectWakePhrase('HEY MCARE')).toBe(true);
  });

  it('matches with trailing punctuation stripped', () => {
    expect(detectWakePhrase('Hey M-Care!')).toBe(true);
    expect(detectWakePhrase('hey mcare.')).toBe(true);
  });

  it('matches as an anchored prefix, with real content after it', () => {
    expect(detectWakePhrase("Hey M-Care, what's my flight status")).toBe(true);
    expect(detectWakePhrase('ok m-care show me my hotel')).toBe(true);
  });

  it('does not match a sentence that only mentions "hey" or "care" separately', () => {
    expect(detectWakePhrase('hey, do you have a minute')).toBe(false);
    expect(detectWakePhrase('I need to take care of my passport')).toBe(false);
    expect(detectWakePhrase('take care')).toBe(false);
  });

  it('does not match the phrase appearing mid-sentence, not at the start', () => {
    expect(detectWakePhrase("I was talking to hey m-care earlier")).toBe(false);
  });

  it('does not match a real question about M-Care itself', () => {
    expect(detectWakePhrase('what can M-Care do for me')).toBe(false);
  });

  it('handles empty/whitespace input', () => {
    expect(detectWakePhrase('')).toBe(false);
    expect(detectWakePhrase('   ')).toBe(false);
    expect(detectWakePhrase(undefined)).toBe(false);
    expect(detectWakePhrase(null)).toBe(false);
  });
});
