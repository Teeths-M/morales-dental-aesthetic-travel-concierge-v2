/**
 * translateStep — display-time localization for intake question steps.
 *
 * The question graph keeps its English strings as the source of truth (they
 * also feed the LLM turn context and the stored question_shown, which stay
 * English for backend consistency). Locale files override what the USER sees
 * via keys `intake.steps.<id>.q` / `intake.steps.<id>.why`; any language
 * without a professional translation falls back to English automatically
 * (the i18n engine's en-fallback).
 *
 * IMPORTANT: intake copy includes medical and consent language — machine
 * translation is not acceptable here. Locale files other than `en` must be
 * filled by professional medical translators before those languages ship.
 */
export function translateStep(step, t) {
  if (!step || typeof t !== 'function') {
    return { question: step?.question || '', reason: step?.deterministicReason || '' };
  }
  const qKey = `intake.steps.${step.id}.q`;
  const whyKey = `intake.steps.${step.id}.why`;
  const q = t(qKey);
  const why = t(whyKey);
  return {
    question: q === qKey ? step.question : q,
    reason: why === whyKey ? (step.deterministicReason || '') : why,
  };
}
