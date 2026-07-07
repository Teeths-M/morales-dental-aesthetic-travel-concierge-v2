import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INPUT_TYPES, UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import HumanHandoffCard from './HumanHandoffCard';
import MultiProcedureStep from './MultiProcedureStep';
import DoctorPickStep from './DoctorPickStep';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const inputBaseStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${BORDER}`,
  color: '#fff',
  fontSize: 15,
  outline: 'none',
};

const RECOMMEND_FOR_ME = { value: UNSPECIFIED, label: "I'm not sure yet — recommend one for me" };
const RECOMMENDED_COUNT = 5;

/**
 * Renders exactly one question at a time — never a scrolling transcript.
 * The "why" line is always visible so the user understands what's being
 * asked and, per the M Ease Manifesto, never has to guess or think hard.
 *
 * `dynamicOptions` / `dynamicOptionsLoading` back any SELECT step whose
 * choices are fetched live (e.g. destination countries derived from real
 * doctors) rather than known statically at authoring time. Dynamic options
 * arrive pre-ranked by real coverage count — the top N render as AI-led
 * recommendation cards, the rest behind "Show More," free-text search behind
 * that (typing is the last resort, never the first interaction).
 */
export default function QuestionCard({ step, onAnswer, onFreeTextAnswer, dynamicOptions, dynamicOptionsLoading, doctorSearch = null, destinationCountry = '', priceEstimates = null, onBack = null }) {
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [clarification, setClarification] = useState(null);
  const [escalationNotice, setEscalationNotice] = useState(false);

  const commit = (rawText, extracted) => {
    onAnswer({ stepId: step.id, question: step.question, rawText, extracted });
    setValue('');
  };

  // A step can target more than one Consultation field for the same answer
  // (e.g. destination_country + procedure_country) — every target field must
  // be filled or flowEngine's isStepAlreadyAnswered() never considers the
  // step answered and keeps re-showing it.
  const commitValue = (rawText, singleValue) => {
    const extracted = {};
    step.targetFields.forEach((field) => {
      extracted[field] = singleValue;
    });
    commit(rawText, extracted);
  };

  const renderInput = () => {
    switch (step.inputType) {
      case INPUT_TYPES.MULTI_SELECT:
        return (
          <MultiProcedureStep
            options={step.options}
            onContinue={({ rawText, extracted }) => commit(rawText, extracted)}
          />
        );

      case INPUT_TYPES.DOCTOR_PICK:
        return (
          <DoctorPickStep
            doctorSearch={doctorSearch}
            destinationCountry={destinationCountry}
            onContinue={({ rawText, extracted }) => commit(rawText, extracted)}
          />
        );

      case INPUT_TYPES.SELECT: {
        const isDynamic = !!step.optionsSource;
        const isLoading = isDynamic && dynamicOptionsLoading?.[step.optionsSource];

        if (isLoading) {
          return (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
              Checking our verified destinations...
            </p>
          );
        }

        // Static SELECT (hotel/transfer/travel-class/etc.) — small closed
        // choice, always tap-first already, unchanged.
        if (!isDynamic) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {step.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => commitValue(opt.label, opt.value)}
                  style={{
                    textAlign: 'left',
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${BORDER}`,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          );
        }

        // Dynamic SELECT (destination_country) — AI-led recommendations
        // first, typing last. `dynamicOptions` arrives already ranked by real
        // coverage count (useDestinationCountries/useTravelPartnerCountries).
        const ranked = dynamicOptions?.[step.optionsSource] || [];
        const recommended = ranked.slice(0, RECOMMENDED_COUNT);
        const rest = ranked.slice(RECOMMENDED_COUNT);
        const searchResults = search.trim()
          ? ranked.filter((opt) => opt.label.toLowerCase().includes(search.trim().toLowerCase()))
          : rest;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommended.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => commitValue(opt.label, opt.value)}
                style={{
                  textAlign: 'left',
                  padding: '13px 16px',
                  borderRadius: 14,
                  background: 'rgba(212,175,55,0.06)',
                  border: `1px solid ${i === 0 ? GOLD + '80' : BORDER}`,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                {i === 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>
                    Most Coverage
                  </span>
                )}
                <span>{opt.label}</span>
                {opt.count != null && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
                    {opt.count} {step.recommendationUnit || 'options'}
                  </span>
                )}
                {priceEstimates?.[opt.value]?.status === 'loading' && (
                  <span style={{ fontSize: 12, color: 'rgba(212,175,55,0.55)', fontWeight: 400 }}>
                    Estimating cost...
                  </span>
                )}
                {priceEstimates?.[opt.value]?.status === 'done' && (
                  <span style={{ fontSize: 12, color: 'rgba(212,175,55,0.75)', fontWeight: 400 }}>
                    Estimated from ${priceEstimates[opt.value].low.toLocaleString()}
                  </span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => commitValue(RECOMMEND_FOR_ME.label, RECOMMEND_FOR_ME.value)}
              style={{
                textAlign: 'center',
                padding: '12px 16px',
                borderRadius: 14,
                background: 'transparent',
                border: `1px dashed ${BORDER}`,
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {RECOMMEND_FOR_ME.label}
            </button>

            {!showAll && rest.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                style={{
                  textAlign: 'center',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  color: GOLD,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Show More ({rest.length} more)
              </button>
            )}

            {showAll && (
              <>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search all destinations..."
                  style={{ ...inputBaseStyle, marginTop: 4 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {searchResults.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => commitValue(opt.label, opt.value)}
                      style={{
                        textAlign: 'left',
                        padding: '11px 14px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${BORDER}`,
                        color: '#fff',
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{opt.label}</span>
                      {opt.count != null && (
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{opt.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }

      case INPUT_TYPES.BOOLEAN:
        return (
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Yes', v: true },
              { label: 'No', v: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => commitValue(opt.label, opt.v)}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER}`,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case INPUT_TYPES.DATE:
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value) commitValue(value, value);
            }}
          >
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={inputBaseStyle}
              autoFocus
            />
            <SubmitButton disabled={!value} />
          </form>
        );

      default: {
        const type = step.inputType === INPUT_TYPES.EMAIL ? 'email' : step.inputType === INPUT_TYPES.PHONE ? 'tel' : 'text';

        const handleSubmit = async (e) => {
          e.preventDefault();
          const rawText = value.trim();
          if (!rawText || isThinking) return;

          if (!onFreeTextAnswer) {
            commitValue(rawText, rawText);
            return;
          }

          setIsThinking(true);
          setClarification(null);
          const result = await onFreeTextAnswer({
            stepId: step.id,
            question: step.question,
            deterministicReason: step.deterministicReason,
            targetFields: step.targetFields,
            rawText,
          });
          setIsThinking(false);

          if (result.accepted) {
            setValue('');
          } else if (result.shouldEscalate) {
            setEscalationNotice(true);
          } else {
            setClarification(result.narration || "I want to make sure I understood correctly — could you say that a different way?");
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            {clarification && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                {clarification}
              </p>
            )}
            <input
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type your answer..."
              style={inputBaseStyle}
              autoFocus
              disabled={isThinking}
            />
            <SubmitButton disabled={!value.trim() || isThinking} thinking={isThinking} />
            {step.allowUnspecified && (
              <button
                type="button"
                onClick={() => commitValue(RECOMMEND_FOR_ME.label, UNSPECIFIED)}
                style={{
                  marginTop: 10,
                  width: '100%',
                  textAlign: 'center',
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'transparent',
                  border: `1px dashed ${BORDER}`,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {RECOMMEND_FOR_ME.label}
              </button>
            )}
          </form>
        );
      }
    }
  };

  if (escalationNotice) {
    return <HumanHandoffCard />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 24,
          padding: '32px 28px',
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 14,
              padding: 0,
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 20,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.4,
          }}
        >
          {step.question}
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13,
            color: GOLD,
            opacity: 0.85,
          }}
        >
          {step.deterministicReason}
        </p>
        {renderInput()}
      </motion.div>
    </AnimatePresence>
  );
}

function SubmitButton({ disabled, thinking = false }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        marginTop: 14,
        width: '100%',
        padding: '13px 20px',
        borderRadius: 999,
        cursor: disabled ? 'default' : 'pointer',
        background: disabled ? 'rgba(212,175,55,0.3)' : '#D4AF37',
        border: 'none',
        color: '#060B16',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {thinking ? 'One moment...' : 'Continue'}
    </button>
  );
}
