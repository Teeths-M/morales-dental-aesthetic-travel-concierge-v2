/**
 * conversationStateMachine — pure state derivation for M-Care's voice
 * conversation loop (IDLE -> LISTENING -> TRANSCRIBING -> UNDERSTANDING ->
 * THINKING -> SPEAKING), plus a small generation guard for suppressing
 * stale in-flight work after a real barge-in.
 *
 * Deliberately additive, not a replacement: MCareOrb.jsx's existing
 * orbState priority chain (offline/alert/tool_executing/acting) already
 * works and stays untouched. This module only formalizes the
 * conversational-turn-taking portion — "is M-Care listening, thinking, or
 * speaking right now, and should incoming speech interrupt it" — into a
 * real, testable pure function instead of an inline reactive derivation,
 * and drives the Listening/Understanding/Thinking/Speaking status text.
 *
 * Pure and fully unit-testable — no React, no DOM, no timers.
 */

export const VOICE_STATES = Object.freeze({
  IDLE: 'idle',
  LISTENING: 'listening',
  TRANSCRIBING: 'transcribing',
  UNDERSTANDING: 'understanding',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
});

/**
 * @param {{ conversationalListening?: boolean, hasInterimPending?: boolean, dispatching?: boolean, agentSending?: boolean, speaking?: boolean }} [signals]
 * @returns {string} one of VOICE_STATES
 */
export function deriveVoiceState(signals) {
  const { conversationalListening, hasInterimPending, dispatching, agentSending, speaking } = signals || {};
  // Priority order matches the real, observable sequence of a voice turn:
  // an in-progress reply being spoken always wins, then a reply being
  // composed, then the brief dispatch gap between a final transcript and
  // the agent call actually starting, then live transcription, then plain
  // listening, else idle.
  if (speaking) return VOICE_STATES.SPEAKING;
  if (agentSending) return VOICE_STATES.THINKING;
  if (dispatching) return VOICE_STATES.UNDERSTANDING;
  if (hasInterimPending) return VOICE_STATES.TRANSCRIBING;
  if (conversationalListening) return VOICE_STATES.LISTENING;
  return VOICE_STATES.IDLE;
}

/**
 * The 4 status words asked for — TRANSCRIBING folds into "Listening" (it's
 * a sub-phase of listening from the traveler's point of view, not a
 * separately meaningful label), and IDLE shows no status text at all.
 * @param {string} voiceState
 * @returns {string | null}
 */
export function voiceStateLabel(voiceState) {
  switch (voiceState) {
    case VOICE_STATES.SPEAKING: return 'Speaking';
    case VOICE_STATES.THINKING: return 'Thinking';
    case VOICE_STATES.UNDERSTANDING: return 'Understanding';
    case VOICE_STATES.TRANSCRIBING:
    case VOICE_STATES.LISTENING: return 'Listening';
    default: return null;
  }
}

/**
 * True only while M-Care is THINKING or SPEAKING — the exact rule
 * requested: any real user speech during those two states should trigger
 * an immediate transition to listening (a real barge-in). Speech that
 * arrives during LISTENING/TRANSCRIBING/UNDERSTANDING/IDLE has nothing to
 * interrupt.
 * @param {string} voiceState
 * @returns {boolean}
 */
export function shouldInterruptOnSpeech(voiceState) {
  return voiceState === VOICE_STATES.THINKING || voiceState === VOICE_STATES.SPEAKING;
}

/**
 * A monotonic generation counter for suppressing stale in-flight work after
 * a barge-in or a fresh journey. This is the honest, platform-correct
 * version of "cancel stale work": Base44's agent SDK delivers whole
 * messages over a socket, not a token stream, so there is no way to abort
 * an in-flight generation server-side (see conversationalMode.js's own
 * header for the same constraint). bump() marks that anything currently in
 * flight should no longer be treated as the active turn; a caller captures
 * current() at the moment it dispatches async/timed work, and checks
 * isStale(capturedGen) before letting a delayed callback act as if it were
 * still current.
 */
export function createGenerationGuard() {
  let gen = 0;
  return {
    bump() { gen += 1; return gen; },
    current() { return gen; },
    isStale(capturedGen) { return capturedGen !== gen; },
  };
}
