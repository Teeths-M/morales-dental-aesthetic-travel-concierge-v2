import React from 'react';
import { motion } from 'framer-motion';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import JourneyBeginsStep from './JourneyBeginsStep';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const REVIEW_FIELDS = [
  ['patient_name', 'Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['procedure_interest', 'Procedure'],
  ['destination_country', 'Destination'],
  ['age', 'Age'],
  ['nationality', 'Home country'],
  ['medical_conditions_other', 'Medical conditions'],
  ['allergy_details', 'Allergies'],
  ['has_companion', 'Travelling with someone'],
  ['preferred_date', 'Preferred travel date'],
  ['duration_of_stay', 'Length of stay'],
];

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '—';
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
    return (
      <JourneyBeginsStep
        patientFirstName={answers.patient_name?.split(' ')[0]}
        safetyStatus={safetyStatus}
        doctorSearch={doctorSearch}
        partnerPreview={partnerPreview}
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
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#fff' }}>
        This is the journey we've built together
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: GOLD, opacity: 0.85 }}>
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
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
              {formatValue(answers[field])}
            </span>
          </div>
        ))}
      </div>

      {submitError && (
        <p style={{ margin: '16px 0 0', fontSize: 13, color: '#fca5a5', textAlign: 'center' }}>{submitError}</p>
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
          background: submitting ? 'rgba(212,175,55,0.5)' : GOLD,
          border: 'none',
          color: '#060B16',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {submitting ? 'Sending...' : 'Send to My Care Team'}
      </button>
    </motion.div>
  );
}
