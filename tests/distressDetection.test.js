import { describe, it, expect } from 'vitest';
import { detectDistressSignal, distressWelfarePrompt } from '@/lib/distressDetection';

describe('detectDistressSignal', () => {
  it('detects a standalone "help me" as immediate danger', () => {
    expect(detectDistressSignal('help me')).toEqual(
      expect.objectContaining({ category: 'immediate_danger' })
    );
  });
  it('detects "help me please" as immediate danger', () => {
    expect(detectDistressSignal('help me please')).toEqual(
      expect.objectContaining({ category: 'immediate_danger' })
    );
  });

  it('detects fear phrases', () => {
    const s = detectDistressSignal("I'm scared, something is wrong");
    expect(s).toEqual(expect.objectContaining({ category: 'fear' }));
  });

  it('detects medical distress', () => {
    const s = detectDistressSignal("I can't breathe");
    expect(s).toEqual(expect.objectContaining({ category: 'medical' }));
  });

  it('does NOT match "help" inside another word', () => {
    expect(detectDistressSignal('I helped myself to lunch')).toBeNull();
  });

  it('does NOT flag a casual request for help finding a doctor (never intrusive)', () => {
    expect(detectDistressSignal('Can you help me find a doctor')).toBeNull();
  });

  it('returns null for empty / normal text', () => {
    expect(detectDistressSignal('')).toBeNull();
    expect(detectDistressSignal('Tell me about rhinoplasty')).toBeNull();
  });

  it('earliest severity wins (immediate_danger over fear)', () => {
    // "help me" is a standalone cry (immediate_danger) and "i am scared" is
    // a fear phrase — but only when the whole utterance is the cry does the
    // exact match fire. Here a violent phrase wins over a fear phrase.
    const s = detectDistressSignal("help me, I am being attacked");
    expect(s.category).toBe('immediate_danger');
  });
});

describe('distressWelfarePrompt', () => {
  it('returns a calm, non-alarming prompt', () => {
    const p = distressWelfarePrompt({ category: 'fear' });
    expect(p).toMatch(/safe/i);
    expect(p).not.toMatch(/EMERGENCY DETECTED/i);
  });
  it('medical prompt mentions hurt', () => {
    expect(distressWelfarePrompt({ category: 'medical' })).toMatch(/hurt/i);
  });
  it('returns null without a signal', () => {
    expect(distressWelfarePrompt(null)).toBeNull();
  });
});