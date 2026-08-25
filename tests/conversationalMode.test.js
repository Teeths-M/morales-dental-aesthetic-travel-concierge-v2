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
  createNetworkErrorTracker,
  matchSpokenChoice,
  detectResumeIntent,
  resumeTaskFromLabel,
  TASK_STATUS,
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

describe('conversationalMode.createNetworkErrorTracker', () => {
  it('retries while consecutive network errors stay under the cap', () => {
    const tracker = createNetworkErrorTracker(3);
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(true);
  });

  it('stops retrying once the cap is exceeded', () => {
    const tracker = createNetworkErrorTracker(3);
    tracker.onError('network');
    tracker.onError('network');
    tracker.onError('network');
    expect(tracker.onError('network')).toBe(false); // 4th consecutive — budget spent
  });

  it('a real recognized result resets the streak, restoring the full retry budget', () => {
    const tracker = createNetworkErrorTracker(2);
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(true);
    tracker.onSuccess(); // proves the connection actually recovered
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(false);
  });

  it('a non-network error code always returns true (retryable) and resets the streak', () => {
    const tracker = createNetworkErrorTracker(1);
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('no-speech')).toBe(true);
    // Streak reset by the non-network error above — back to a fresh budget.
    expect(tracker.onError('network')).toBe(true);
    expect(tracker.onError('network')).toBe(false);
  });

  it('defaults to NETWORK_ERROR_MAX_RETRIES when called with no argument', () => {
    const tracker = createNetworkErrorTracker();
    expect(tracker.onError('network')).toBe(true);
  });
});

describe('conversationalMode.matchSpokenChoice', () => {
  it('matches a direct fuzzy hit against a real label', () => {
    expect(matchSpokenChoice('pay in full', ['Pay in Full', '25% Deposit', '50% Deposit'])).toBe('Pay in Full');
  });

  it('matches a bare "yes" only against a real yes-labeled option', () => {
    expect(matchSpokenChoice('yes', ['Yes — send help now', "No, I'm okay"])).toBe('Yes — send help now');
    expect(matchSpokenChoice('yeah', ['Yes, use my exact location', "No, that's fine"])).toBe('Yes, use my exact location');
  });

  it('matches a bare "no" only against a real no-labeled option', () => {
    expect(matchSpokenChoice('no', ['Yes — send help now', "No, I'm okay"])).toBe("No, I'm okay");
    expect(matchSpokenChoice('cancel', ['Yes, watch my surroundings', 'No thanks'])).toBe('No thanks');
  });

  it('does NOT guess a bare "yes"/"no" onto an unrelated 2-option pair with no yes/no label', () => {
    expect(matchSpokenChoice('yes', ['Send my current location', 'Share my live location'])).toBe(null);
  });

  it('returns null when nothing matches', () => {
    expect(matchSpokenChoice('what time is it', ['Pay in Full', '25% Deposit'])).toBe(null);
  });

  it('returns null for empty input or an empty choice list', () => {
    expect(matchSpokenChoice('', ['Yes', 'No'])).toBe(null);
    expect(matchSpokenChoice('yes', [])).toBe(null);
    expect(matchSpokenChoice('yes', null)).toBe(null);
  });
});

describe('conversationalMode.detectResumeIntent', () => {
  it('detects a generic "last task" resume phrase', () => {
    expect(detectResumeIntent('continue the last task')).toEqual({ type: 'last' });
    expect(detectResumeIntent('what was I working on')).toEqual({ type: 'last' });
    expect(detectResumeIntent('where were we')).toEqual({ type: 'last' });
    expect(detectResumeIntent('pick up where I left off')).toEqual({ type: 'last' });
  });

  it('detects a named resume phrase and extracts the target', () => {
    expect(detectResumeIntent('go back to the flight thing')).toEqual({ type: 'named', target: 'flight' });
    expect(detectResumeIntent('return to the hotel booking')).toEqual({ type: 'named', target: 'hotel booking' });
  });

  it('returns null for an ordinary message that is not a resume request', () => {
    expect(detectResumeIntent('find me a dentist in Cancun')).toBe(null);
    expect(detectResumeIntent('')).toBe(null);
    expect(detectResumeIntent(undefined)).toBe(null);
  });
});

describe('conversationalMode.resumeTaskFromLabel', () => {
  const tasks = [
    { id: 'a', fullText: 'let me look into flight options for you', status: TASK_STATUS.PAUSED },
    { id: 'b', fullText: 'checking hotel availability near the clinic', status: TASK_STATUS.PAUSED },
    { id: 'c', fullText: 'a task that already finished', status: TASK_STATUS.COMPLETED },
  ];

  it('resolves a "last" resume intent to the most recently paused task', () => {
    expect(resumeTaskFromLabel(tasks, { type: 'last' })?.id).toBe('b');
  });

  it('resolves a "named" resume intent via fuzzy match against real paused labels', () => {
    expect(resumeTaskFromLabel(tasks, { type: 'named', target: 'flight' })?.id).toBe('a');
    expect(resumeTaskFromLabel(tasks, { type: 'named', target: 'hotel' })?.id).toBe('b');
  });

  it('never matches a completed or active task, only paused ones', () => {
    expect(resumeTaskFromLabel(tasks, { type: 'named', target: 'already finished' })).toBe(null);
  });

  it('returns null when there are no paused tasks, or no resume intent', () => {
    expect(resumeTaskFromLabel([], { type: 'last' })).toBe(null);
    expect(resumeTaskFromLabel(tasks, null)).toBe(null);
  });

  it('returns null for a named target with no plausible match', () => {
    expect(resumeTaskFromLabel(tasks, { type: 'named', target: 'zzz nothing like this exists' })).toBe(null);
  });
});
