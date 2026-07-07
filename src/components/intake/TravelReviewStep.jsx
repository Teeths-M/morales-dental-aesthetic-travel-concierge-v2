import React from 'react';
import { motion } from 'framer-motion';
import {
  TRAVEL_CLASS_OPTIONS,
  HOTEL_STAR_OPTIONS,
  HOTEL_ROOM_OPTIONS,
  TRANSFER_TYPE_OPTIONS,
  COMPANION_TYPE_OPTIONS,
  TRAVELERS_COUNT_OPTIONS,
} from '@/lib/travelIntakeFlow/questionGraph';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import JourneyBeginsStep from './JourneyBeginsStep';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

function labelFor(options, value) {
  return options.find((o) => o.value === String(value))?.label || String(value ?? '—');
}

/** "I'm not sure — recommend one for me" reads back as a real label, not the raw sentinel. */
function displayValue(value) {
  return value === UNSPECIFIED ? 'Recommend one for me' : value;
}

function buildReviewFields(answers) {
  const fields = [
    ['destination_country', 'Destination country', displayValue(answers.destination_country)],
    ['destination_city', 'Destination city', displayValue(answers.destination_city)],
    ['origin_city', 'Traveling from', answers.origin_city],
    ['departure_date', 'Departure', answers.departure_date],
    ['return_date', 'Return', answers.return_date],
    ['travelers_count', 'Travelers', labelFor(TRAVELERS_COUNT_OPTIONS, answers.travelers_count)],
    ['travel_class', 'Travel class', labelFor(TRAVEL_CLASS_OPTIONS, answers.travel_class)],
  ];
  if (answers.hotel_required !== false) {
    fields.push(['hotel_star_rating', 'Hotel standard', labelFor(HOTEL_STAR_OPTIONS, answers.hotel_star_rating)]);
    fields.push(['hotel_room_type', 'Room type', labelFor(HOTEL_ROOM_OPTIONS, answers.hotel_room_type)]);
  }
  if (answers.transfer_required !== false) {
    fields.push(['transfer_type', 'Transfer vehicle', labelFor(TRANSFER_TYPE_OPTIONS, answers.transfer_type)]);
  }
  if (answers.companion_required) {
    fields.push(['companion_type', 'Companion', labelFor(COMPANION_TYPE_OPTIONS, answers.companion_type)]);
    fields.push(['companion_days', 'Companion days', answers.companion_days]);
  }
  return fields;
}

/**
 * Travel-only sibling of ReviewStep.jsx. Same shape (review fields ->
 * submit -> JourneyBeginsStep), calling createTravelRequest instead of
 * Consultation.create(). No safety-engine step here — a travel-only booking
 * has no procedure-compatibility concern.
 */
export default function TravelReviewStep({ answers, onSubmit, submitting, submitted, submitError, submitResult }) {
  if (submitted) {
    const items = [
      { label: 'Travel Request Confirmed', state: 'done' },
      submitResult?.request_token && { label: `Reference: ${submitResult.request_token}`, state: 'done' },
      submitResult?.total_package_price != null && {
        label: `Estimated Package: $${Number(submitResult.total_package_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        state: 'done',
      },
      { label: 'Matching You With a Verified Local Partner', state: 'pending' },
      { label: 'Secure Deposit — Coming Soon', state: 'pending' },
    ].filter(Boolean);

    return (
      <JourneyBeginsStep
        intro="From this moment forward, you're never alone. We're matching you with a verified local travel partner now, and your coordinator will reach out with your complete itinerary — you won't need to repeat anything."
        items={items}
      />
    );
  }

  const reviewFields = buildReviewFields(answers);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '32px 28px' }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#fff' }}>
        This is the trip we've planned together
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: GOLD, opacity: 0.85 }}>
        Take a look, then I'll find your travel partner
      </p>

      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        {reviewFields.map(([field, label, value]) => (
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
              {value === undefined || value === null || value === '' ? '—' : String(value)}
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
        {submitting ? 'Sending...' : 'Book My Travel Package'}
      </button>
    </motion.div>
  );
}
