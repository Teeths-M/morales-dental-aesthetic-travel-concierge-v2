import { describe, it, expect } from 'vitest';
import {
  VOICE_STATES,
  deriveVoiceState,
  voiceStateLabel,
  shouldInterruptOnSpeech,
  createGenerationGuard,
} from '../src/lib/conversationStateMachine.js';

describe('conversationStateMachine.deriveVoiceState', () => {
  it('defaults to idle with no signals', () => {
    expect(deriveVoiceState({})).toBe(VOICE_STATES.IDLE);
    expect(deriveVoiceState()).toBe(VOICE_STATES.IDLE);
  });

  it('reflects conversationalListening as listening', () => {
    expect(deriveVoiceState({ conversationalListening: true })).toBe(VOICE_STATES.LISTENING);
  });

  it('reflects an interim transcript in flight as transcribing', () => {
    expect(deriveVoiceState({ conversationalListening: true, hasInterimPending: true })).toBe(VOICE_STATES.TRANSCRIBING);
  });

  it('reflects the brief dispatch gap as understanding', () => {
    expect(deriveVoiceState({ dispatching: true })).toBe(VOICE_STATES.UNDERSTANDING);
  });

  it('reflects an in-flight agent call as thinking', () => {
    expect(deriveVoiceState({ agentSending: true })).toBe(VOICE_STATES.THINKING);
  });

  it('reflects active TTS playback as speaking', () => {
    expect(deriveVoiceState({ speaking: true })).toBe(VOICE_STATES.SPEAKING);
  });

  it('prioritizes speaking over every other signal', () => {
    expect(deriveVoiceState({ speaking: true, agentSending: true, hasInterimPending: true, conversationalListening: true })).toBe(VOICE_STATES.SPEAKING);
  });

  it('prioritizes thinking over understanding/transcribing/listening', () => {
    expect(deriveVoiceState({ agentSending: true, dispatching: true, hasInterimPending: true, conversationalListening: true })).toBe(VOICE_STATES.THINKING);
  });

  it('prioritizes understanding over transcribing/listening', () => {
    expect(deriveVoiceState({ dispatching: true, hasInterimPending: true, conversationalListening: true })).toBe(VOICE_STATES.UNDERSTANDING);
  });

  it('prioritizes transcribing over plain listening', () => {
    expect(deriveVoiceState({ hasInterimPending: true, conversationalListening: true })).toBe(VOICE_STATES.TRANSCRIBING);
  });
});

describe('conversationStateMachine.voiceStateLabel', () => {
  it('maps each real state to the requested status word', () => {
    expect(voiceStateLabel(VOICE_STATES.SPEAKING)).toBe('Speaking');
    expect(voiceStateLabel(VOICE_STATES.THINKING)).toBe('Thinking');
    expect(voiceStateLabel(VOICE_STATES.UNDERSTANDING)).toBe('Understanding');
  });

  it('folds transcribing into "Listening"', () => {
    expect(voiceStateLabel(VOICE_STATES.TRANSCRIBING)).toBe('Listening');
    expect(voiceStateLabel(VOICE_STATES.LISTENING)).toBe('Listening');
  });

  it('shows no status text for idle', () => {
    expect(voiceStateLabel(VOICE_STATES.IDLE)).toBe(null);
    expect(voiceStateLabel('not-a-real-state')).toBe(null);
  });
});

describe('conversationStateMachine.shouldInterruptOnSpeech', () => {
  it('is true only for thinking and speaking', () => {
    expect(shouldInterruptOnSpeech(VOICE_STATES.THINKING)).toBe(true);
    expect(shouldInterruptOnSpeech(VOICE_STATES.SPEAKING)).toBe(true);
  });

  it('is false for listening, transcribing, understanding, and idle', () => {
    expect(shouldInterruptOnSpeech(VOICE_STATES.LISTENING)).toBe(false);
    expect(shouldInterruptOnSpeech(VOICE_STATES.TRANSCRIBING)).toBe(false);
    expect(shouldInterruptOnSpeech(VOICE_STATES.UNDERSTANDING)).toBe(false);
    expect(shouldInterruptOnSpeech(VOICE_STATES.IDLE)).toBe(false);
  });
});

describe('conversationStateMachine.createGenerationGuard', () => {
  it('starts at generation 0 and is never stale against its own current value', () => {
    const guard = createGenerationGuard();
    expect(guard.current()).toBe(0);
    expect(guard.isStale(0)).toBe(false);
  });

  it('bump() advances the generation and returns the new value', () => {
    const guard = createGenerationGuard();
    expect(guard.bump()).toBe(1);
    expect(guard.current()).toBe(1);
    expect(guard.bump()).toBe(2);
  });

  it('a captured generation becomes stale once the guard is bumped again', () => {
    const guard = createGenerationGuard();
    const captured = guard.current();
    expect(guard.isStale(captured)).toBe(false);
    guard.bump();
    expect(guard.isStale(captured)).toBe(true);
    expect(guard.isStale(guard.current())).toBe(false);
  });

  it('multiple independent captures at different times are judged independently', () => {
    const guard = createGenerationGuard();
    const first = guard.current();
    guard.bump();
    const second = guard.current();
    guard.bump();
    expect(guard.isStale(first)).toBe(true);
    expect(guard.isStale(second)).toBe(true);
    expect(guard.isStale(guard.current())).toBe(false);
  });
});
