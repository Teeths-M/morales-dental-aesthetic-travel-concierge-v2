import React from 'react';
import { motion } from 'framer-motion';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import JourneyBeginsStep from './JourneyBeginsStep';
import { CALM } from '@/lib/brandTokens';

const TEAL = CALM.action;
const CARD = CALM.surface;
const BORDER = CALM.border;

const REVIEW_FIELDS = [
  ['patient_name', 'Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['procedure_interest', 'Procedure'],
  ['destination_country', 'Destination'],
  ['age', 'Age'],
  ['nationality', 'Home country'],
  ['medical_conditions', 'Medical conditions'],
  ['allergies', 'Allergies'],
  ['has_companion', 'Travelling with someone'],
  ['preferred_date', 'Preferred travel date'],
  ['duration_of_stay', 'Length of stay'],
];

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (value === UNSPECIFIED) return 'Recommend one for me';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * The final beat before hand-off: creates the real Consultation (same
 * downstream shape Booking.jsx produces), re-verifies safety server-side
 * (unbypassable, per the M Principle), and triggers the existing pipeline.
 * Payment/fee collection (ConsultationFeeModal/GuestAuthGate) is not wired
 * in this phase — this ends at a confirmed Consultation + CaseRecord, with a
 * clear "what happens next" message rather than pretending payment ran.
 */
export default function ReviewStep({ answers, onSubmit, submitting, submitted, submitError, safetyStatus, doctorSearch, partnerPreview }) {
  if (submitted) {
    const doctorCount = doctorSearch?.data?.matched_doctors?.length ?? 0;
    const recoveryDays = safetyStatus?.totalRecoveryDays ?? 0;
    const partnerCount = (partnerPreview?.data?.travel_agency_count ?? 0) + (partnerPreview?.data?.taxi_service_count ?? 0);

    const items = [
      { label: 'Safety Profile Created', state: 'done' },
      doctorCount > 0
        ? { label: `${doctorCount} Verified Doctor${doctorCount === 1 ? '' : 's'} Found`, state: 'done' }
        : { label: 'Expanding Our Network for Your Procedure', state: 'done' },
      recoveryDays > 0 && { label: `Recovery Timeline Built (~${recoveryDays} days)`, state: 'done' },
      partnerCount > 0 && { label: `${partnerCount} Travel & Transfer Partners Ready`, state: 'done' },
      // Deliberate care-process framing, never software-status: the deposit
      // step is a promise about the journey, not an announcement about code.
      { label: 'Deposit requested only after your doctor confirms your plan', state: 'pending' },
    ].filter(Boolean);

    return (
      <JourneyBeginsStep
        firstName={answers.patient_name?.split(' ')[0]}
        intro="From this moment forward, you're never alone. A specialist is already being matched to your case, and your coordinator will reach out personally — you won't need to repeat anything."
        items={items}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px' }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: CALM.text }}>
        This is the journey we've built together
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: CALM.textSoft }}>
        Take a look, then I'll bring your care team in
      </p>

      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        {REVIEW_FIELDS.map(([field, label]) => (
          <div
            key={field}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: `1px solid ${BORDER}`,
              fontSize: 13,
            }}
          >
            <span style={{ color: CALM.textFaint }}>{label}</span>
            <span style={{ color: CALM.text, fontWeight: 600, textAlign: 'right' }}>
              {formatValue(answers[field])}
            </span>
          </div>
        ))}
      </div>

      {submitError && (
        <p style={{ margin: '16px 0 0', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>{submitError}</p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '14px 20px',
          borderRadius: 999,
          cursor: submitting ? 'default' : 'pointer',
          background: submitting ? 'rgba(14,138,125,0.5)' : TEAL,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {submitting ? 'Sending...' : 'Send to My Care Team'}
      </button>
    </motion.div>
  );
}
