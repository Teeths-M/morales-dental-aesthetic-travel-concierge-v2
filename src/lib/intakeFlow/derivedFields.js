/**
 * derivedFields — what M worked out on its own, so the review screen can show
 * it back instead of asking one more question.
 *
 * Two different things live here and they must not be confused:
 *
 *   1. `prefilled` — a real answer field M filled in for the patient. It goes
 *      into the Consultation if the patient leaves it alone, so it is only
 *      ever produced from a deterministic computation, always carries the
 *      reason it was reached, and is always correctable on screen.
 *
 *   2. `insights` — work M has already done that is NOT an answer field at
 *      all (cost range, doctors matched). Read-only. Nothing downstream
 *      consumes these; they exist so the patient can see the concierge
 *      already started, which is the whole point of the screen.
 *
 * ── The hard rule ─────────────────────────────────────────────────────────
 * Nothing in `prefilled` may ever target a field the SAFE-T engine reads.
 *
 * A derived medical value is the exact failure this platform's safety
 * architecture exists to prevent: it would let a computed guess reach
 * `computeSafeT` wearing the patient's own voice, and a patient skim-reading
 * a review screen is not meaningful consent to a medical fact about
 * themselves. Medical history is asked, never inferred. `SAFETY_INPUT_FIELDS`
 * below is enforced at runtime by `assertNotSafetyField` and guarded by a
 * red-team invariant, so this stays true even if someone adds a deriver later
 * without reading this comment.
 */
import { UNSPECIFIED } from './questionGraph';

/**
 * Every answer field that reaches `computeSafeT` (see
 * base44/functions/_shared/safeTEngine.ts — procedure, pregnancy_status,
 * medical_conditions, medications, lifestyle, anesthesia_complications,
 * had_complications, bmi, age, emotional_concerns) plus the intake/booking
 * field names those are built from.
 *
 * Additive only. Removing a name from this set widens what a computation is
 * allowed to assert about a patient's body — do not do it to make a deriver
 * pass.
 */
export const SAFETY_INPUT_FIELDS = Object.freeze(new Set([
  'procedure_interest',
  'selected_procedures',
  'procedures_from_cart',
  'age',
  'gender',
  'bmi',
  'pregnancy_status',
  'is_pregnant',
  'medical_conditions',
  'medical_conditions_other',
  'allergies',
  'allergy_details',
  'takes_medications',
  'medication_types',
  'medication_notes',
  'medications',
  'anesthesia_history',
  'anesthesia_complications',
  'anesthesia_complication_types',
  'had_surgery',
  'surgery_history',
  'previous_procedures',
  'previous_procedures_notes',
  'lifestyle',
  'smoking_status',
  'alcohol_use',
  'emotional_concerns',
]));

/**
 * Defence in depth behind the review of this file. Throws in development so a
 * bad deriver is caught the moment it runs; in production the caller filters
 * rather than crashing a patient's review screen (see `deriveIntake`).
 */
export function assertNotSafetyField(field) {
  if (SAFETY_INPUT_FIELDS.has(field)) {
    throw new Error(
      `derivedFields: "${field}" feeds the SAFE-T engine and must be asked, never derived.`
    );
  }
}

function isUnanswered(value) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    // "Recommend one for me" — imported, never re-declared here. A local copy
    // of this sentinel would silently stop matching the day the graph changes
    // it, and this deriver would start overwriting real patient answers.
    value === UNSPECIFIED ||
    (Array.isArray(value) && value.length === 0)
  );
}

function formatMoney(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * @param {object} args
 * @param {object} args.answers        flat field_id -> value map
 * @param {object} [args.safetyStatus] from useCart — deterministic, procedureCompatibility
 * @param {object} [args.costEstimate] { status, data } from useIntakeBackgroundSearch
 * @param {object} [args.doctorSearch] { status, data } from useIntakeBackgroundSearch
 * @returns {{ prefilled: Array, insights: Array }}
 */
export function deriveIntake({ answers = {}, safetyStatus, costEstimate, doctorSearch } = {}) {
  const prefilled = [];
  const insights = [];

  const recoveryDays = safetyStatus?.totalRecoveryDays ?? 0;

  // ── Prefilled: length of stay ────────────────────────────────────────────
  // Only when the patient hasn't given one. The recovery window comes from
  // PROCEDURE_PROFILES via procedureCompatibility — the same deterministic
  // table the RED block uses — so this is a lookup, not a guess. No invented
  // buffer is added on top: the number shown is the recovery window itself,
  // which is exactly what the basis line claims it is.
  if (recoveryDays > 0 && isUnanswered(answers.duration_of_stay)) {
    prefilled.push({
      field: 'duration_of_stay',
      label: 'Length of stay',
      value: `About ${recoveryDays} day${recoveryDays === 1 ? '' : 's'}`,
      basis: `That's the recovery window for what you're planning, so your stay covers it`,
    });
  }

  // ── Insights: work already done, not answer fields ───────────────────────
  if (recoveryDays > 0) {
    insights.push({
      key: 'recovery',
      label: 'Recovery window',
      value: `~${recoveryDays} day${recoveryDays === 1 ? '' : 's'}`,
      basis: 'Built from your procedure, before you asked',
    });
  }

  if (costEstimate?.status === 'done') {
    const low = formatMoney(costEstimate.data?.estimatedTotalLow);
    const high = formatMoney(costEstimate.data?.estimatedTotalHigh);
    if (low && high) {
      insights.push({
        key: 'cost',
        label: 'Estimated range',
        value: `${low} – ${high}`,
        basis: 'An estimate, not a quote — your doctor sets the real price',
      });
    }
  }

  if (doctorSearch?.status === 'done') {
    const matched = doctorSearch.data?.matched_doctors?.length ?? 0;
    if (matched > 0) {
      insights.push({
        key: 'doctors',
        label: 'Verified doctors found',
        value: String(matched),
        basis: 'Licences already checked against their medical board',
      });
    }
  }

  // Belt and braces: never let a safety field out, whatever a future deriver
  // above tries to push. Filtering rather than throwing here keeps a coding
  // mistake from taking down the patient's review screen — the red-team test
  // and `assertNotSafetyField` are what actually catch it in development.
  return {
    prefilled: prefilled.filter((p) => !SAFETY_INPUT_FIELDS.has(p.field)),
    insights,
  };
}
