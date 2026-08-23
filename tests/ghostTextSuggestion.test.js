import { describe, it, expect } from 'vitest';
import { shouldQueryGhostSuggestion, buildAcceptedText } from '../src/lib/ghostTextSuggestion';

describe('shouldQueryGhostSuggestion', () => {
  it('returns false when disabled', () => {
    expect(shouldQueryGhostSuggestion({ text: 'hello there', caretAtEnd: true, disabled: true })).toBe(false);
  });

  it('returns false when the caret is not at the end of the text', () => {
    expect(shouldQueryGhostSuggestion({ text: 'hello there', caretAtEnd: false, disabled: false })).toBe(false);
  });

  it('returns false for text shorter than the minimum length', () => {
    expect(shouldQueryGhostSuggestion({ text: 'hi', caretAtEnd: true, disabled: false })).toBe(false);
  });

  it('returns true for a plausible in-progress message', () => {
    expect(shouldQueryGhostSuggestion({ text: 'i need help with', caretAtEnd: true, disabled: false })).toBe(true);
  });

  it('returns false when the text already ends in terminal punctuation', () => {
    expect(shouldQueryGhostSuggestion({ text: 'Is this safe?', caretAtEnd: true, disabled: false })).toBe(false);
    expect(shouldQueryGhostSuggestion({ text: 'Thanks so much.', caretAtEnd: true, disabled: false })).toBe(false);
    expect(shouldQueryGhostSuggestion({ text: 'Wait, really!', caretAtEnd: true, disabled: false })).toBe(false);
  });

  it('returns false for a very long message', () => {
    const long = 'a'.repeat(150);
    expect(shouldQueryGhostSuggestion({ text: long, caretAtEnd: true, disabled: false })).toBe(false);
  });

  it('trims whitespace before checking length', () => {
    expect(shouldQueryGhostSuggestion({ text: '   hi   ', caretAtEnd: true, disabled: false })).toBe(false);
  });

  it('handles a missing/undefined text safely', () => {
    expect(shouldQueryGhostSuggestion({ text: undefined, caretAtEnd: true, disabled: false })).toBe(false);
  });
});

describe('buildAcceptedText', () => {
  it('appends the suggestion after a single space', () => {
    expect(buildAcceptedText('i need help with', 'booking my flight')).toBe('i need help with booking my flight');
  });

  it('does not double a trailing space already present', () => {
    expect(buildAcceptedText('i need help with ', 'booking my flight')).toBe('i need help with booking my flight');
  });

  it('does not add a leading space when the current text is empty', () => {
    expect(buildAcceptedText('', 'how do I book a flight?')).toBe('how do I book a flight?');
  });

  it('returns the current text unchanged when there is no suggestion', () => {
    expect(buildAcceptedText('i need help with', '')).toBe('i need help with');
    expect(buildAcceptedText('i need help with', null)).toBe('i need help with');
  });

  it('handles a missing current text safely', () => {
    expect(buildAcceptedText(undefined, 'hello')).toBe('hello');
  });
});
