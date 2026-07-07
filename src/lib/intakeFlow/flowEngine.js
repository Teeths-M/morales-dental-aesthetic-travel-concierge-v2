/**
 * flowEngine — pure functions that decide question order, skip logic, and
 * confidence thresholds for any conversational intake built on this pattern.
 * Zero network calls, zero safety decisions. Safety gating (where the flow
 * has any — the medical intake does, via procedureCompatibility.js /
 * validateProcedureSafety; the travel-only intake has none) always lives
 * outside this file.
 *
 * Graph-agnostic by design: every function takes the question graph as an
 * explicit argument rather than importing one fixed graph, so the same
 * engine drives both `src/lib/intakeFlow/questionGraph.js` (Medical Patient)
 * and `src/lib/travelIntakeFlow/questionGraph.js` (travel-only booking).
 */

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
 * Walks the given question graph in order and returns the next step to
 * show, or `{ type: 'complete' }` once every step is answered. Skips steps
 * whose fields are already known, whose `skipIf(answers)` returns true, or
 * that require auth when the caller isn't authenticated yet (returned
 * instead as the auth-gate marker so the UI can render the sign-in prompt
 * at exactly the right beat).
 *
 * @param {object} answers
 * @param {{ isAuthenticated: boolean }} sessionState
 * @param {Array<object>} questionGraph
 * @returns {{ type: 'question', step: object } | { type: 'auth_gate', step: object } | { type: 'complete' }}
 */
export function getNextStep(answers, sessionState, questionGraph) {
  const isAuthenticated = !!sessionState?.isAuthenticated;

  for (const step of questionGraph) {
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
export function getTotalQuestionCount(questionGraph) {
  return questionGraph.filter((s) => s.targetFields.length > 0).length;
}

/** How many question-type steps are already answered — for progress display. */
export function getAnsweredQuestionCount(answers, questionGraph) {
  return questionGraph.filter(
    (s) => s.targetFields.length > 0 && isStepAlreadyAnswered(s, answers)
  ).length;
}
