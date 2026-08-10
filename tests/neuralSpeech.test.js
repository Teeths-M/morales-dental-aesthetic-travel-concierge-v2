import { describe, it, expect } from 'vitest';
import { resumeFromInterruption } from '../src/lib/talkMode.js';

// resumeFromInterruption is re-exported through neuralSpeech.js's public
// surface conceptually (it's what runFallback uses), but it actually lives
// in talkMode.js so it can be unit-tested with no base44Client/network
// import chain — importing anything from neuralSpeech.js itself pulls in
// window.location access at module-load time that jsdom's test environment
// doesn't satisfy the same way a real browser does.
describe('neuralSpeech fallback resume (resumeFromInterruption, via talkMode.js)', () => {
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  it('resumes from the full text when nothing was heard yet (no playback started)', () => {
    const result = resumeFromInterruption(words, 0, 0, NaN);
    expect(result.skip).toBe(0);
    expect(result.remainder).toEqual(words);
  });

  it('estimates the skip from elapsed playback time when duration is known', () => {
    // 5s of a 10s clip -> roughly half the words already heard.
    const result = resumeFromInterruption(words, 0, 5, 10);
    expect(result.skip).toBe(5);
    expect(result.remainder).toEqual(['six', 'seven', 'eight', 'nine', 'ten']);
  });

  it('never rolls backward past the word-reveal count actually reached', () => {
    // Reveal timer says 7 words shown, but elapsed-time estimate only implies 5 —
    // trust the higher, more concrete signal.
    const result = resumeFromInterruption(words, 7, 5, 10);
    expect(result.skip).toBe(7);
    expect(result.remainder).toEqual(['eight', 'nine', 'ten']);
  });

  it('treats an unknown/zero duration as no elapsed-time signal, falling back to the reveal count', () => {
    expect(resumeFromInterruption(words, 3, 5, 0).skip).toBe(3);
    expect(resumeFromInterruption(words, 3, 5, NaN).skip).toBe(3);
    expect(resumeFromInterruption(words, 3, 5, -1).skip).toBe(3);
  });

  it('clamps skip to the total word count when playback appears fully heard', () => {
    const result = resumeFromInterruption(words, 0, 10, 10);
    expect(result.skip).toBe(10);
    expect(result.remainder).toEqual([]);
  });

  it('never returns a negative skip for a negative elapsed time', () => {
    const result = resumeFromInterruption(words, 0, -3, 10);
    expect(result.skip).toBe(0);
    expect(result.remainder).toEqual(words);
  });

  it('handles an empty word list without throwing', () => {
    const result = resumeFromInterruption([], 0, 5, 10);
    expect(result.skip).toBe(0);
    expect(result.remainder).toEqual([]);
  });
});
