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
export function getTotalQuestionCount(questionGraph, answers = {}) {
  // Conditional steps (skipIf true — e.g. guardian questions for adults)
  // don't count toward the total, so progress can genuinely reach 100%.
  return questionGraph.filter(
    (s) => s.targetFields.length > 0 && !(typeof s.skipIf === 'function' && s.skipIf(answers))
  ).length;
}

/** How many question-type steps are already answered — for progress display. */
export function getAnsweredQuestionCount(answers, questionGraph) {
  return questionGraph.filter(
    (s) => s.targetFields.length > 0
      && !(typeof s.skipIf === 'function' && s.skipIf(answers))
      && isStepAlreadyAnswered(s, answers)
  ).length;
}

/**
 * Finds the step immediately before `currentStepId` that the user could
 * meaningfully go back to — skipping any step whose `skipIf(answers)` is
 * true, since that step was never actually shown. Returns `null` if there
 * is no earlier step (already at the first question). Purely a lookup —
 * callers are responsible for actually clearing that step's answers.
 */
export function getPreviousStepId(currentStepId, answers, questionGraph) {
  const currentIndex = questionGraph.findIndex((s) => s.id === currentStepId);
  if (currentIndex <= 0) return null;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const step = questionGraph[i];
    if (typeof step.skipIf === 'function' && step.skipIf(answers)) continue;
    return step.id;
  }
  return null;
}

/**
 * Maps answered/total progress to one of 4 phase bands and returns the
 * matching label — a "Building your Safe-T Profile"-style phase instead of
 * an exact "X of 15 questions answered" count, which reads like a long form.
 * The exact ratio is still tracked internally (needed elsewhere); this is
 * only what gets shown.
 *
 * @param {number} answeredCount
 * @param {number} totalCount
 * @param {string[]} phaseLabels - 4 labels for the 0%, ~40%, ~75%, 100% bands
 */
export function getProgressLabel(answeredCount, totalCount, phaseLabels) {
  const ratio = totalCount > 0 ? answeredCount / totalCount : 0;
  if (ratio >= 1) return phaseLabels[3];
  if (ratio >= 0.75) return phaseLabels[2];
  if (ratio >= 0.4) return phaseLabels[1];
  return phaseLabels[0];
}
