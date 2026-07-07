/**
 * flowEngine — pure functions that decide question order, skip logic, and
 * confidence thresholds for the conversational intake. Zero network calls,
 * zero safety decisions. Safety gating always lives in
 * `src/lib/procedureCompatibility.js` / `validateProcedureSafety` — this
 * engine never touches that logic, only reads whether it's time to run it.
 */
import { QUESTION_GRAPH } from './questionGraph';

const LOW_CONFIDENCE_ESCALATION_THRESHOLD = 3;
const MIN_ACCEPTABLE_CONFIDENCE = 55;

/** A field counts as "known" if it has a non-empty value already in `answers`. */
function isFieldKnown(answers, field) {
  const value = answers?.[field];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/** True if every field this step would collect is already known — never ask twice. */
function isStepAlreadyAnswered(step, answers) {
  if (!step.targetFields || step.targetFields.length === 0) return false; // review-type steps always show
  return step.targetFields.every((field) => isFieldKnown(answers, field));
}

/**
 * Walks the question graph in order and returns the next step to show, or
 * `null` if the conversation is complete. Skips steps whose fields are
 * already known, whose `skipIf(answers)` returns true, or that require auth
 * when the caller isn't authenticated yet (returned instead as the auth-gate
 * marker so the UI can render the sign-in prompt at exactly the right beat).
 *
 * @param {object} answers
 * @param {{ isAuthenticated: boolean }} sessionState
 * @returns {{ type: 'question', step: object } | { type: 'auth_gate', step: object } | { type: 'complete' }}
 */
export function getNextStep(answers, sessionState) {
  const isAuthenticated = !!sessionState?.isAuthenticated;

  for (const step of QUESTION_GRAPH) {
    if (isStepAlreadyAnswered(step, answers)) continue;
    if (typeof step.skipIf === 'function' && step.skipIf(answers)) continue;

    if (step.requiresAuth && !isAuthenticated) {
      return { type: 'auth_gate', step };
    }
    return { type: 'question', step };
  }

  return { type: 'complete' };
}

/**
 * Whether a single LLM-extracted answer is trustworthy enough to commit
 * without asking the user to clarify (used by useIntakeSession's
 * submitFreeTextAnswer). Answers from fixed-choice steps — SELECT, BOOLEAN,
 * DATE, MULTI_SELECT — never go through this; only free-text turns parsed
 * by intakeConversationTurn carry a real confidence score.
 */
export function isConfidenceAcceptable(confidence, lowConfidenceStreak) {
  if (lowConfidenceStreak >= LOW_CONFIDENCE_ESCALATION_THRESHOLD) return false;
  return confidence >= MIN_ACCEPTABLE_CONFIDENCE;
}

export function shouldEscalateToHuman(lowConfidenceStreak) {
  return lowConfidenceStreak >= LOW_CONFIDENCE_ESCALATION_THRESHOLD;
}

/** Total question-type steps (excludes the review step) — for progress display. */
export function getTotalQuestionCount() {
  return QUESTION_GRAPH.filter((s) => s.targetFields.length > 0).length;
}

/** How many question-type steps are already answered — for progress display. */
export function getAnsweredQuestionCount(answers) {
  return QUESTION_GRAPH.filter(
    (s) => s.targetFields.length > 0 && isStepAlreadyAnswered(s, answers)
  ).length;
}
