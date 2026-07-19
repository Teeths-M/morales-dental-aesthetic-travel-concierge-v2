import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Pencil, Check } from 'lucide-react';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import { deriveIntake } from '@/lib/intakeFlow/derivedFields';
import { useNavigate } from 'react-router-dom';
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
 * One thing M worked out, shown with the reason it reached it and a way to
 * change it. The reason line is not decoration — a number a patient can't
 * account for is a number they can't meaningfully correct, and an
 * uncorrectable prefill is just a wrong answer they didn't give.
 */
function DerivedRow({ item, override, onCorrect }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const corrected = override !== undefined;
  const shown = corrected ? override : item.value;

  const commit = () => {
    const next = draft.trim();
    if (next) onCorrect(item.field, next);
    setEditing(false);
  };

  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ color: CALM.textFaint }}>{item.label}</span>
        {editing ? (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              aria-label={`Correct ${item.label}`}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: '4px 8px',
                color: CALM.text,
                fontSize: 13,
                width: 140,
                textAlign: 'right',
              }}
            />
            <button
              type="button"
              onClick={commit}
              aria-label={`Save ${item.label}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEAL, display: 'flex' }}
            >
              <Check className="w-4 h-4" />
            </button>
          </span>
        ) : (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: CALM.text, fontWeight: 600, textAlign: 'right' }}>{shown}</span>
            <button
              type="button"
              onClick={() => { setDraft(String(shown).replace(/^About /, '')); setEditing(true); }}
              aria-label={`Change ${item.label}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: CALM.textFaint, display: 'flex' }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: CALM.textFaint, lineHeight: 1.5 }}>
        {corrected ? 'Your correction — thank you, I have it' : item.basis}
      </p>
    </div>
  );
}

/**
 * The final beat before hand-off: creates the real Consultation (same
 * downstream shape Booking.jsx produces), re-verifies safety server-side
 * (unbypassable, per the M Principle), and triggers the existing pipeline.
 * Payment/fee collection (ConsultationFeeModal/GuestAuthGate) is not wired
 * in this phase — this ends at a confirmed Consultation + CaseRecord, with a
 * clear "what happens next" message rather than pretending payment ran.
 *
 * Shows two kinds of row, kept visually distinct on purpose: what the patient
 * said, and what M worked out for them. Conflating the two would put words in
 * the patient's mouth — see lib/intakeFlow/derivedFields.js for why nothing
 * medical is ever in the second group.
 */
export default function ReviewStep({ answers, onSubmit, submitting, submitted, submitError, safetyStatus, doctorSearch, partnerPreview, costEstimate, onDerivedChange }) {
  const navigate = useNavigate();
  const [corrections, setCorrections] = useState({});

  const { prefilled, insights } = deriveIntake({ answers, safetyStatus, costEstimate, doctorSearch });

  const handleCorrect = (field, value) => {
    setCorrections((c) => ({ ...c, [field]: value }));
  };

  // What will actually be submitted for the derived fields: M's value unless
  // the patient changed it. Reported upward so the parent merges it into the
  // Consultation — a prefill the patient can see and edit but that never
  // reaches the record would just be theatre.
  const effectiveDerived = Object.fromEntries(
    prefilled.map((p) => [p.field, corrections[p.field] ?? p.value])
  );
  const derivedKey = JSON.stringify(effectiveDerived);
  useEffect(() => {
    onDerivedChange?.(JSON.parse(derivedKey));
    // Keyed on the serialised value: the object identity changes every render,
    // and depending on it directly would loop forever.
  }, [derivedKey, onDerivedChange]);

  // A field M filled in is shown once, in the section that says M filled it
  // in — never also in "what you told me", where it would read as the
  // patient's own words.
  const derivedFieldNames = new Set(prefilled.map((p) => p.field));
  const statedFields = REVIEW_FIELDS.filter(([field]) => !derivedFieldNames.has(field));

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
        onContinue={() => navigate('/dashboard')}
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

      {(prefilled.length > 0 || insights.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: TEAL }} aria-hidden="true" />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              What I worked out for you
            </h3>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: CALM.textSoft }}>
            {prefilled.length > 0
              ? "I filled these in so you didn't have to answer them. Change anything that isn't right."
              : 'I started on this while we talked.'}
          </p>

          {prefilled.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {prefilled.map((item) => (
                <DerivedRow
                  key={item.field}
                  item={item}
                  override={corrections[item.field]}
                  onCorrect={handleCorrect}
                />
              ))}
            </div>
          )}

          {insights.length > 0 && (
            <div style={{ marginTop: prefilled.length > 0 ? 12 : 0, borderTop: `1px solid ${BORDER}` }}>
              {insights.map((item) => (
                <div key={item.key} style={{ padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <span style={{ color: CALM.textFaint }}>{item.label}</span>
                    <span style={{ color: CALM.text, fontWeight: 600, textAlign: 'right' }}>{item.value}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: CALM.textFaint, lineHeight: 1.5 }}>
                    {item.basis}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h3 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: CALM.textFaint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        What you told me
      </h3>
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        {statedFields.map(([field, label]) => (
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
