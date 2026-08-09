import { describe, it, expect } from 'vitest';
import {
  isRecognitionSupported,
  isConversationalModeSupported,
  classifyInterruptionUtterance,
  pushInterruptedIntent,
  replaceLastInterruptedIntent,
  clearInterruptedIntents,
  shortTopicLabel,
  createBargeInDetector,
  MAX_INTERRUPTED_INTENTS,
} from '../src/lib/conversationalMode.js';

describe('conversationalMode.isRecognitionSupported / isConversationalModeSupported', () => {
  it('reflects whether SpeechRecognition is present in this environment', () => {
    // jsdom (vitest's default test environment) does not implement
    // SpeechRecognition, so this should be false here — proving the guard
    // actually checks, not just returns true unconditionally.
    expect(typeof isRecognitionSupported()).toBe('boolean');
    expect(isRecognitionSupported()).toBe(false);
  });

  it('requires both recognition AND synthesis support', () => {
    expect(isConversationalModeSupported()).toBe(false);
  });
});

describe('conversationalMode.classifyInterruptionUtterance', () => {
  it('classifies exact never-mind phrases, case-insensitively', () => {
    expect(classifyInterruptionUtterance('never mind')).toBe('never_mind');
    expect(classifyInterruptionUtterance('Never Mind')).toBe('never_mind');
    expect(classifyInterruptionUtterance('forget it')).toBe('never_mind');
    expect(classifyInterruptionUtterance('cancel that')).toBe('never_mind');
  });

  it('classifies utterances anchored on a leading correction marker', () => {
    expect(classifyInterruptionUtterance('no wait I meant book a hotel')).toBe('correction');
    expect(classifyInterruptionUtterance('actually I meant veneers')).toBe('correction');
    expect(classifyInterruptionUtterance('I meant find me a specialist')).toBe('correction');
  });

  it('does NOT classify "I mean" mid-sentence filler as a correction', () => {
    expect(classifyInterruptionUtterance('I mean, is that safe?')).toBe('new_topic');
    expect(classifyInterruptionUtterance('what did you mean by that')).toBe('new_topic');
  });

  it('treats anything else as a new topic, including empty input', () => {
    expect(classifyInterruptionUtterance('find me a dentist in Cancun')).toBe('new_topic');
    expect(classifyInterruptionUtterance('')).toBe('new_topic');
    expect(classifyInterruptionUtterance(undefined)).toBe('new_topic');
  });
});

describe('conversationalMode.interrupted intent stack', () => {
  const makeIntent = (id) => ({ id, fullText: `topic ${id}` });

  it('pushes and caps at MAX_INTERRUPTED_INTENTS, evicting oldest first', () => {
    let stack = [];
    for (let i = 1; i <= MAX_INTERRUPTED_INTENTS + 2; i += 1) {
      stack = pushInterruptedIntent(stack, makeIntent(i));
    }
    expect(stack).toHaveLength(MAX_INTERRUPTED_INTENTS);
    expect(stack.map(s => s.id)).toEqual([3, 4, 5]);
  });

  it('replaceLastInterruptedIntent replaces only the most recent entry', () => {
    const stack = [makeIntent(1), makeIntent(2)];
    const next = replaceLastInterruptedIntent(stack, makeIntent('replacement'));
    expect(next.map(s => s.id)).toEqual([1, 'replacement']);
  });

  it('replaceLastInterruptedIntent on an empty stack just adds the entry', () => {
    expect(replaceLastInterruptedIntent([], makeIntent(1)).map(s => s.id)).toEqual([1]);
  });

  it('clearInterruptedIntents returns an empty array', () => {
    expect(clearInterruptedIntents()).toEqual([]);
  });
});

describe('conversationalMode.shortTopicLabel', () => {
  it('returns short text unchanged', () => {
    expect(shortTopicLabel('what does Morales do')).toBe('what does Morales do');
  });

  it('truncates long text to maxWords with an ellipsis', () => {
    const long = 'one two three four five six seven eight nine ten';
    expect(shortTopicLabel(long, 4)).toBe('one two three four…');
  });

  it('returns empty string for empty input', () => {
    expect(shortTopicLabel('')).toBe('');
    expect(shortTopicLabel(undefined)).toBe('');
  });
});

describe('conversationalMode.createBargeInDetector', () => {
  it('does not confirm on a single short blip', () => {
    const detector = createBargeInDetector();
    expect(detector.observe('um')).toBe(false);
  });

  it('confirms after minEvents consecutive, non-shrinking results', () => {
    const detector = createBargeInDetector({ minEvents: 2, minChars: 4 });
    expect(detector.observe('find')).toBe(false);
    expect(detector.observe('find me')).toBe(true);
  });

  it('restarts the count when the recognized text shrinks (a fresh, different pickup)', () => {
    const detector = createBargeInDetector({ minEvents: 3, minChars: 4 });
    expect(detector.observe('find me a')).toBe(false);
    expect(detector.observe('hm')).toBe(false); // shrinks below minChars — resets
    expect(detector.observe('find')).toBe(false); // event 1 again
    expect(detector.observe('find me')).toBe(false); // event 2
    expect(detector.observe('find me a')).toBe(true); // event 3 — confirmed
  });

  it('stays confirmed once observe() has returned true, until reset()', () => {
    const detector = createBargeInDetector({ minEvents: 2, minChars: 1 });
    expect(detector.observe('g')).toBe(false);
    expect(detector.observe('go')).toBe(true);
    expect(detector.observe('x')).toBe(true); // still confirmed regardless of new input
    detector.reset();
    expect(detector.observe('x')).toBe(false); // fresh single event, not yet at minEvents
  });
});
