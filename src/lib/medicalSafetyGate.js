/**
 * Medical Safety Gate
 *
 * Defines which conditions trigger mandatory Senior Medical Team review.
 * These patients still pay the consultation fee and proceed — their case
 * is routed to Admin-Review instead of Doctor-Pending so only committed,
 * fee-paid patients enter the clinical queue.
 */

export const HIGH_RISK_CONDITIONS = [
  'Heart Disease',
  'Blood Disorders',
  'Diabetes',
  'Hypertension',
  'Epilepsy',
  'Autoimmune Disorders',
];

/**
 * Checks whether the patient's selected conditions require mandatory review.
 * @param {string[]} conditions - Array of selected condition strings from Section4MedicalHistory
 * @returns {{ isHighRisk: boolean, flaggedCondition: string | null }}
 */
export function checkMedicalRisk(conditions = []) {
  const flagged = conditions.find(c => HIGH_RISK_CONDITIONS.includes(c));
  return {
    isHighRisk: !!flagged,
    flaggedCondition: flagged || null,
  };
}