/**
 * procedureSafetyNameMap — maps a questionGraph procedure_interest value to
 * the exact display name `src/lib/procedureCompatibility.js` (the safety
 * engine) recognizes, so pushing it into the shared cart via
 * `useCart().addItem()` actually participates in RED/YELLOW evaluation.
 *
 * A few questionGraph options are intentionally broader than a single safety
 * profile (e.g. "Breast Augmentation / Reduction / Lift" spans three distinct
 * profiles with different risk stats). Each maps to a single representative
 * profile below — a reasonable Phase 1 default, not a precise match. A later
 * phase asking a disambiguating follow-up ("which type of breast procedure?")
 * would remove this approximation; flagged here rather than left silent.
 */
export const PROCEDURE_SAFETY_NAMES = {
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

export function toSafetyEngineName(procedureInterestValue) {
  return PROCEDURE_SAFETY_NAMES[procedureInterestValue] || null;
}
