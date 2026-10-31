/**
 * procedureSafetyNameMap — server copy of src/lib/intakeFlow/procedureSafetyNameMap.js.
 *
 * Maps a Consultation's procedure_interest / selected_procedures value to the
 * exact display name the safety engine (procedureCompatibility.ts) recognizes,
 * so the server can re-run the RED check from a stored Consultation instead of
 * trusting a result computed in the patient's browser.
 *
 * The two copies must stay identical. tests/procedureSafetyNameMap.test.js
 * imports both and fails if they drift.
 */
export const PROCEDURE_SAFETY_NAMES: Record<string, string> = {
  dental_implants: 'Multiple Dental Implants',
  all_on_4: 'All-on-4 Implants',
  porcelain_veneers: 'Porcelain Veneers',
  smile_makeover: 'Smile Makeover',
  rhinoplasty: 'Rhinoplasty',
  breast_surgery: 'Breast Augmentation',
  liposuction: 'Liposuction',
  tummy_tuck: 'Tummy Tuck',
  facelift: 'Facelift',
};

export function toSafetyEngineName(procedureInterestValue: string): string | null {
  return PROCEDURE_SAFETY_NAMES[procedureInterestValue] || null;
}
