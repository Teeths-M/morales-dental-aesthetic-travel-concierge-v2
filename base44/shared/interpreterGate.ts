/**
 * interpreterGate — pure, deterministic detection of whether a virtual
 * consultation needs a real human interpreter. No LLM, no network call.
 *
 * Grounded in the real HHS Section 1557 language-access standard (verified
 * live via WebSearch, not memory): machine/AI translation is an accepted
 * path only for lower-stakes communication, carrying a visible "may contain
 * errors" disclosure; for anything affecting a patient's rights, benefits,
 * or meaningful access — consent, diagnosis, treatment decisions — a real,
 * quality-standard interpreter is required, and a self-identified bilingual
 * staff member or informal translation explicitly does not meet that bar.
 *
 * This module only detects a language mismatch and snapshots it — it never
 * itself decides that AI translation is "good enough." That decision is made
 * by the UI copy in InterpreterManager.jsx, which always shows the human-
 * interpreter-required notice whenever this returns languages_differ:true.
 */

export type InterpreterAssessment = {
  languages_differ: boolean;
  patient_language: string;
  doctor_language: string;
  recommendation: 'human_interpreter_recommended' | 'same_language';
};

export function assessInterpreterNeed(
  patientLanguage: string | null | undefined,
  doctorLanguage: string | null | undefined,
  needsTranslatorFlag?: boolean | null,
): InterpreterAssessment {
  const patient = (patientLanguage || '').trim().toLowerCase();
  const doctor = (doctorLanguage || '').trim().toLowerCase();

  // If either language is unknown, don't claim certainty either way — but an
  // explicit needs_translator flag (Consultation.needs_translator, or its
  // real translation_contexts_needed 'doctor_consultation' context) is a
  // real, already-captured signal this app anticipated, so it wins when the
  // raw language comparison alone can't decide.
  const differ = patient && doctor
    ? patient !== doctor
    : !!needsTranslatorFlag;

  return {
    languages_differ: differ,
    patient_language: patientLanguage || '',
    doctor_language: doctorLanguage || '',
    recommendation: differ ? 'human_interpreter_recommended' : 'same_language',
  };
}
