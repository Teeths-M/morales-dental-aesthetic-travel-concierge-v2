import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useTravelIntakeSession } from '@/hooks/useTravelIntakeSession';
import { useTravelPartnerCountries } from '@/hooks/useTravelPartnerCountries';
import { useIpGeolocation } from '@/hooks/useIpGeolocation';
import { fuzzyFilterOptions } from '@/lib/fuzzyMatch';
import { INPUT_TYPES } from '@/lib/intakeFlow/questionGraph';
import { getAnsweredQuestionCount, getTotalQuestionCount, getProgressLabel } from '@/lib/intakeFlow/flowEngine';
import { TRAVEL_QUESTION_GRAPH } from '@/lib/travelIntakeFlow/questionGraph';
import { buildTravelRequestPayload } from '@/lib/travelIntakeFlow/fieldMap';
import { ALL_COUNTRIES } from '@/lib/countries';
import { SERVED_COUNTRY_OPTIONS } from '@/lib/countryCity';
import { ROUTES } from '@/lib/constants';
import { friendlyError } from '@/lib/friendlyError';
import QuestionCard from '@/components/intake/QuestionCard';
import AuthGateStep from '@/components/intake/AuthGateStep';
import TravelReviewStep from '@/components/intake/TravelReviewStep';
import IntakeProgressChecklist from '@/components/intake/IntakeProgressChecklist';
import NarrationTicker from '@/components/intake/NarrationTicker';
import NeedHumanButton from '@/components/intake/NeedHumanButton';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const TRAVEL_GUEST_DRAFT_KEY = 'morales_travel_intake_guest_draft';

/**
 * The countries we can offer travel coordination for, as a searchable list.
 * We prefer live verified travel-partner countries; when there are none yet we
 * fall back to the markets M coordinates in, so the destination step ALWAYS
 * presents a real list to pick from — never an empty list or a free-text box.
 * Sorted A–Z for predictable scanning.
 *
 * Comes from the explicit SERVED_COUNTRIES list, not from cityData's keys:
 * cityData now holds cities for all 195 countries so travellers can name any
 * origin, and deriving the DESTINATION list from it would offer M's services
 * in every country on earth.
 */
const SERVED_COUNTRY_LIST = SERVED_COUNTRY_OPTIONS;

const PHASE_LABELS = ['Getting to know you', 'Planning your journey', 'Almost there', 'Finishing up'];

/**
 * TravelIntake — conversational booking for travelers who want Morales's
 * travel/transfer coordination without a medical procedure. Same engine as
 * ConciergeIntake.jsx (questionGraph/flowEngine/QuestionCard), a different
 * question graph and a different terminal entity (TravelRequest instead of
 * Consultation). No safety-engine/cart integration — a travel-only booking
 * has no procedure-compatibility concern to evaluate.
 */
export default function TravelIntake() {
  const [started, setStarted] = useState(false);
  const {
    answers,
    turnHistory,
    isLoading,
    submitAnswer,
    submitFreeTextAnswer,
    goBack,
    canGoBack,
    nextStepResult,
    sessionId,
  } = useTravelIntakeSession();
  const { countries: travelPartnerCountries } = useTravelPartnerCountries();
  // Real verified-partner countries when we have them; otherwise the full served
  // list — either way the destination step gets a real, non-empty list.
  const countryOptions = (travelPartnerCountries && travelPartnerCountries.length > 0)
    ? travelPartnerCountries
    : SERVED_COUNTRY_LIST;

  // "Where are you traveling FROM" can be answered by IP — the traveler is
  // presumably asking from home. Floated to the top of that step's picker as
  // a one-tap "Detected" suggestion (QuestionCard), never auto-committed:
  // IP geolocation is a guess (VPN/roaming), this field drives real flight
  // and pickup planning, and the travel review screen has no per-field edit
  // — so a wrong silent fill would have no easy way back.
  const { country: ipCountry } = useIpGeolocation();
  const detectedOriginCountry = ipCountry
    ? (fuzzyFilterOptions(ALL_COUNTRIES, ipCountry, 70)[0] || null)
    : null;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  const answeredCount = getAnsweredQuestionCount(answers, TRAVEL_QUESTION_GRAPH);
  const totalCount = getTotalQuestionCount(TRAVEL_QUESTION_GRAPH);
  const progressLabel = getProgressLabel(answeredCount, totalCount, PHASE_LABELS);
  const progressRatio = totalCount > 0 ? answeredCount / totalCount : 0;

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await base44.functions.invoke('createTravelRequest', buildTravelRequestPayload(answers));
      const payload = res?.data ?? res ?? {};
      if (payload.error) {
        setSubmitError(payload.error);
        setSubmitting(false);
        return;
      }

      if (sessionId && sessionId !== 'pending') {
        await base44.entities.ConversationSession.update(sessionId, {
          status: 'completed',
          travel_request_id: payload.travel_request_id,
          completed_at: new Date().toISOString(),
        }).catch(() => {});
      }

      setSubmitResult(payload);
      setSubmitted(true);
    } catch (error) {
      // FIX: this used to swallow the real error entirely — a 401 (session
      // not actually signed in), a 400 (validation reject) and a 500 (real
      // crash) all showed the identical sentence, making a live failure
      // undiagnosable without server logs. friendlyError() logs the raw
      // error to console and maps known statuses (401 → "sign in again") to
      // a specific, safe message.
      setSubmitError(friendlyError(
        error,
        'Something went wrong sending your travel request. Please try again, or contact us directly.',
        'TravelIntake',
      ));
    } finally {
      setSubmitting(false);
    }
  };

  const atReviewStep = nextStepResult.type === 'question' && nextStepResult.step.inputType === INPUT_TYPES.REVIEW;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: DARK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: '"SF Pro Display", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 440, width: '100%' }}>
        {isLoading ? (
          <LoadingShell />
        ) : !started ? (
          <WelcomeCard onBegin={() => setStarted(true)} resuming={answeredCount > 0} />
        ) : (
          <>
            <IntakeProgressChecklist progressLabel={progressLabel} progressRatio={progressRatio} />
            {nextStepResult.type === 'auth_gate' && (
              <AuthGateStep
                answers={answers}
                reason="From here I'll save your preferences to your account so a coordinator can prepare your quote. Nothing you've shared so far will be lost."
                redirectPath={ROUTES.TRAVEL_INTAKE}
                guestDraftKey={TRAVEL_GUEST_DRAFT_KEY}
              />
            )}
            {atReviewStep && (
              <TravelReviewStep
                answers={answers}
                onSubmit={handleFinalSubmit}
                submitting={submitting}
                submitted={submitted}
                submitError={submitError}
                submitResult={submitResult}
              />
            )}
            {nextStepResult.type === 'question' && !atReviewStep && (
              <QuestionCard
                step={nextStepResult.step}
                onAnswer={submitAnswer}
                onFreeTextAnswer={submitFreeTextAnswer}
                dynamicOptions={{ travelPartnerCountries: countryOptions, allCountries: ALL_COUNTRIES }}
                dynamicOptionsLoading={{ travelPartnerCountries: false, allCountries: false }}
                onBack={canGoBack ? goBack : null}
                answers={answers}
                detectedOption={nextStepResult.step.id === 'origin_country' ? detectedOriginCountry : null}
              />
            )}
            <NarrationTicker text={turnHistory[turnHistory.length - 1]?.narration_shown} />
            <NeedHumanButton answers={answers} sessionId={sessionId} />
          </>
        )}
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: 36, height: 36, margin: '0 auto 16px', display: 'block', opacity: 0.6 }}
      />
      Preparing your travel request...
    </div>
  );
}

function WelcomeCard({ onBegin, resuming }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: 44, height: 44, margin: '0 auto 20px', display: 'block' }}
      />

      <p
        style={{
          margin: '0 0 14px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: GOLD,
        }}
      >
        Your Travel Concierge
      </p>

      <h1
        style={{
          margin: '0 0 14px',
          fontSize: 26,
          fontWeight: 600,
          color: '#fff',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        {resuming ? 'Welcome back' : "Let's plan your trip"}
      </h1>

      <p
        style={{
          margin: '0 0 32px',
          fontSize: 15,
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {resuming
          ? "You're right where you left off. Nothing you've already told me needs repeating."
          : "I'll ask a few questions, one at a time, and match you with a verified local travel and transfer partner. No medical procedure needed — just your journey."}
      </p>

      <button
        type="button"
        onClick={onBegin}
        style={{
          width: '100%',
          padding: '15px 20px',
          borderRadius: 999,
          cursor: 'pointer',
          background: GOLD,
          border: 'none',
          color: DARK,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {resuming ? 'Continue' : 'Begin'}
      </button>
    </motion.div>
  );
}
