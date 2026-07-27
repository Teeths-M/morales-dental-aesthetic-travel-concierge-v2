import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';
import { INPUT_TYPES, UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';
import HumanHandoffCard from './HumanHandoffCard';
import MultiProcedureStep from './MultiProcedureStep';
import DoctorPickStep from './DoctorPickStep';
import ConditionsPickStep from './ConditionsPickStep';
import AllergiesPickStep from './AllergiesPickStep';
import MedicalPickStep from './MedicalPickStep';
import { fuzzyFilterOptions } from '@/lib/fuzzyMatch';
import { useTranslation } from '@/i18n';
import { translateStep } from '@/lib/intakeFlow/translateStep';

// CALM decision-screen palette (Product Principle #5): light surface, TEAL for
// the only "proceed" action, GOLD reserved for trust/recommendation markers.
const GOLD = '#D4AF37';        // trust markers only
const TEAL = '#0E8A7D';        // the only "proceed" action color
const CARD = '#FFFFFF';        // calm surface
const BORDER = '#E2E9E6';
const TEXT = '#17302C';        // primary text
const TEXT_SOFT = '#566B66';   // secondary / explanatory
const TEXT_FAINT = '#8A9B96';  // hints, counts

const inputBaseStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 14,
  background: '#EEF3F1',
  border: `1px solid ${BORDER}`,
  color: TEXT,
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
export default function QuestionCard({ step, onAnswer, onFreeTextAnswer, dynamicOptions, dynamicOptionsLoading, doctorSearch = null, destinationCountry = '', priceEstimates = null, onBack = null, searchFirstOptions = [], answers = {} }) {
  const { t } = useTranslation();
  // Display-time localization; the graph's English stays canonical for the
  // LLM context and stored question_shown (backend consistency).
  const { question: displayQuestion, reason: displayReason } = translateStep(step, t);
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

      case INPUT_TYPES.CONDITIONS_PICK:
        return <ConditionsPickStep onContinue={({ rawText, extracted }) => commit(rawText, extracted)} />;

      case INPUT_TYPES.ALLERGIES_PICK:
        return <AllergiesPickStep onContinue={({ rawText, extracted }) => commit(rawText, extracted)} />;

      case INPUT_TYPES.MEDICAL_PICK:
        return <MedicalPickStep config={step.medicalPick} onContinue={({ rawText, extracted }) => commit(rawText, extracted)} />;

      case INPUT_TYPES.SELECT: {
        const isDynamic = !!step.optionsSource;
        const isLoading = isDynamic && dynamicOptionsLoading?.[step.optionsSource];

        if (isLoading) {
          return (
            <p style={{ fontSize: 13, color: TEXT_FAINT, textAlign: 'center', padding: '20px 0' }}>
              Checking our verified destinations...
            </p>
          );
        }

        // Search-first flat list (nationality, and any other large enumerable
        // set with no real ranking signal) — search box always visible, no
        // ranked cards, no "recommend for me" (there's nothing to recommend
        // when the answer is just a fact about the user, like their own
        // nationality). Works for static or dynamic option sources.
        if (step.searchFirst) {
          const allOptions = isDynamic ? (dynamicOptions?.[step.optionsSource] || []) : (step.options || []);
          const filtered = search.trim() ? fuzzyFilterOptions(allOptions, search) : allOptions;
          const visible = filtered.slice(0, 8);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Start typing..."
                style={inputBaseStyle}
                autoFocus
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {visible.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => commitValue(opt.label, opt.value)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: '#EEF3F1',
                      border: `1px solid ${BORDER}`,
                      color: TEXT,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                {visible.length === 0 && (
                  <p style={{ fontSize: 12.5, color: TEXT_FAINT, textAlign: 'center', padding: '8px 0' }}>
                    No matches — try a different spelling
                  </p>
                )}
              </div>
              {filtered.length > visible.length && (
                <p style={{ fontSize: 11.5, color: TEXT_FAINT, textAlign: 'center', margin: 0 }}>
                  {filtered.length - visible.length} more — keep typing to narrow it down
                </p>
              )}
            </div>
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
                    background: '#EEF3F1',
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
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
                  color: TEXT,
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
                  <span style={{ fontSize: 12, color: TEXT_SOFT, fontWeight: 400 }}>
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
                color: TEXT_SOFT,
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
                  color: TEAL,
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
                        background: '#EEF3F1',
                        border: `1px solid ${BORDER}`,
                        color: TEXT,
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{opt.label}</span>
                      {opt.count != null && (
                        <span style={{ color: TEXT_FAINT, fontWeight: 400 }}>{opt.count}</span>
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
                  background: '#EEF3F1',
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
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

      case INPUT_TYPES.DATE: {
        // A friendly label for the conversation narration ("Aug 9, 2026")
        // instead of the raw stored ISO string — every other case already
        // passes a human label as rawText (opt.label, 'Yes'/'No', etc.).
        const displayDate = (iso) => {
          const d = iso ? parseISO(iso) : null;
          return d && isValid(d) ? format(d, 'MMM d, yyyy') : iso;
        };
        // Declarative per-step constraint (see questionGraph.js) — e.g. the
        // return_date step sets minDateField: 'departure_date' so this field
        // can't select a return before the already-picked departure. Native
        // <input type="date"> takes the ISO string directly as `min`.
        const minDateIso = step.minDateField ? answers?.[step.minDateField] : undefined;

        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value) commitValue(displayDate(value), value);
            }}
          >
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={minDateIso}
              style={inputBaseStyle}
              autoFocus
            />
            <SubmitButton disabled={!value} />
          </form>
        );
      }

      default: {
        const type = step.inputType === INPUT_TYPES.EMAIL ? 'email' : step.inputType === INPUT_TYPES.PHONE ? 'tel' : 'text';
        // Concrete, type-specific placeholder so the field self-explains what
        // it wants — a warm question ("Where should I send this?") must not
        // leave the user guessing that an email goes here.
        const placeholder =
          step.inputType === INPUT_TYPES.EMAIL ? 'you@email.com'
          : step.inputType === INPUT_TYPES.PHONE ? '+1 555 000 0000'
          : 'Type your answer...';
        // Real curated suggestions (e.g. real cities for the chosen country)
        // layered on top of free text, never replacing it — prefer picking a
        // known-good value, but never block on one that isn't in the list.
        const suggestions = step.searchFirst && searchFirstOptions.length > 0 && value.trim()
          ? fuzzyFilterOptions(searchFirstOptions, value).slice(0, 5)
          : [];

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
              <p style={{ margin: '0 0 10px', fontSize: 13, color: TEXT_SOFT, lineHeight: 1.5 }}>
                {clarification}
              </p>
            )}
            <input
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              style={inputBaseStyle}
              autoFocus
              disabled={isThinking}
            />
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {suggestions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => commitValue(opt.label, opt.value)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'rgba(212,175,55,0.06)',
                      border: `1px solid ${GOLD}40`,
                      color: TEXT,
                      fontSize: 13.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
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
                  color: TEXT_SOFT,
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
              color: TEXT_FAINT,
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
            color: TEXT,
            lineHeight: 1.4,
          }}
        >
          {displayQuestion}
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13,
            color: TEXT_SOFT,
          }}
        >
          {displayReason}
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
        background: disabled ? 'rgba(14,138,125,0.35)' : TEAL,
        border: 'none',
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {thinking ? 'One moment...' : 'Continue'}
    </button>
  );
}
