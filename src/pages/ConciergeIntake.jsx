import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useIntakeSession } from '@/hooks/useIntakeSession';
import { useDestinationCountries } from '@/hooks/useDestinationCountries';
import { useDestinationPriceEstimates } from '@/hooks/useDestinationPriceEstimates';
import { useIntakeBackgroundSearch } from '@/hooks/useIntakeBackgroundSearch';
import { useCart } from '@/context/CartContext';
import { UNSPECIFIED, INPUT_TYPES, QUESTION_GRAPH } from '@/lib/intakeFlow/questionGraph';
import { getAnsweredQuestionCount, getTotalQuestionCount, getProgressLabel } from '@/lib/intakeFlow/flowEngine';
import { toSafetyEngineName } from '@/lib/intakeFlow/procedureSafetyNameMap';
import { buildConsultationPayload } from '@/lib/intakeFlow/fieldMap';
import QuestionCard from '@/components/intake/QuestionCard';
import AuthGateStep from '@/components/intake/AuthGateStep';
import ReviewStep from '@/components/intake/ReviewStep';
import IntakeProgressChecklist from '@/components/intake/IntakeProgressChecklist';
import NarrationTicker from '@/components/intake/NarrationTicker';
import NeedHumanButton from '@/components/intake/NeedHumanButton';
import ProcedureEvaluationStep from '@/components/intake/ProcedureEvaluationStep';
import SafeTReadout from '@/components/intake/SafeTReadout';
import ContactVerificationStep from '@/components/intake/ContactVerificationStep';
import DataProcessingConsent from '@/components/consent/DataProcessingConsent';

// CALM decision-screen palette (Product Principle #5): light page + surface,
// TEAL for the "proceed" action, GOLD reserved for trust markers only.
const GOLD = '#D4AF37';        // trust markers only
const TEAL = '#0E8A7D';        // the only "proceed" action color
const PAGE = '#F1F5F4';        // calm page background
const CARD = '#FFFFFF';        // surface
const BORDER = '#E2E9E6';
const TEXT = '#17302C';
const TEXT_SOFT = '#566B66';

const PHASE_LABELS = ['Getting to know you', 'Building your Safe-T Profile', 'Almost there', 'Finishing up'];

/**
 * ConciergeIntake — the AI-first conversational intake for Medical Patients
 * (Phase 1, complete: LLM parse/narrate, proactive background search,
 * multi-procedure safety-engine integration, human handoff, real final
 * submission). One question at a time, never a chat log. /booking (the
 * 12-step wizard) is untouched and remains the default entry point — this
 * route becomes the default only after a deliberate, separate cutover
 * decision. Payment/fee collection is not wired; the closing screen says so
 * plainly rather than implying it ran.
 */
export default function ConciergeIntake() {
  const [started, setStarted] = useState(false);
  // Data-processing consent (compliance): required before any medical/identity
  // info is shared. Read once from localStorage so a returning client who
  // already agreed isn't asked again; the affirmative Begin persists it and
  // records it on the Consultation via the payload.
  const [consented, setConsented] = useState(() => {
    try { return localStorage.getItem('morales_data_consent_v1') === 'true'; }
    catch { return false; }
  });
  const alreadyConsented = useRef(consented).current;
  const {
    answers,
    turnHistory,
    isAuthenticated,
    isLoading,
    submitAnswer,
    submitFreeTextAnswer,
    seedAnswers,
    goBack,
    canGoBack,
    nextStepResult,
    sessionId,
  } = useIntakeSession();
  const { countries: destinationCountries, isLoading: destinationsLoading } = useDestinationCountries();
  const priceEstimates = useDestinationPriceEstimates({
    countries: destinationCountries,
    procedureInterest: answers.procedure_interest,
    isAuthenticated,
  });
  const { doctorSearch, costEstimate, partnerPreview } = useIntakeBackgroundSearch({ answers, isAuthenticated });
  const { items: cartItems, addItem, pivotViolations, safetyStatus, clearCart } = useCart();

  const [safetyReadoutAcknowledged, setSafetyReadoutAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Contact verification (OTP at submit — guest-first): null = not yet run,
  // 'active' = the email/phone code steps are on screen, object = finished
  // (with per-channel verified flags carried onto the Consultation).
  const [verification, setVerification] = useState(null);

  const answeredCount = getAnsweredQuestionCount(answers, QUESTION_GRAPH);
  const totalCount = getTotalQuestionCount(QUESTION_GRAPH, answers);
  const progressLabel = getProgressLabel(answeredCount, totalCount, PHASE_LABELS);
  const progressRatio = totalCount > 0 ? answeredCount / totalCount : 0;
  const checklistItems = buildChecklistItems({ answers, doctorSearch, costEstimate, partnerPreview });

  // Procedure-first entry: when the user arrives with procedures already in
  // the cart (picked on /procedures), the conversation starts from what they
  // chose instead of re-asking — the procedure question auto-skips because
  // its target field becomes known. Seeds never overwrite real answers, and
  // an in-progress session that already answered procedures is left alone.
  const cartSeededRef = useRef(false);
  useEffect(() => {
    if (isLoading || cartSeededRef.current) return;
    if (cartItems.length === 0) return;
    if (answers.procedure_interest || answers.selected_procedures?.length) return;
    cartSeededRef.current = true;
    seedAnswers({
      procedure_interest: cartItems[0].procedure_enum || 'other',
      selected_procedures: [],
      procedures_from_cart: true,
    });
  }, [isLoading, cartItems, answers.procedure_interest, answers.selected_procedures, seedAnswers]);

  // The moment procedures are answered, every one of them joins the same
  // shared cart every other part of the app uses — SafetyWatcher (mounted
  // globally in App.jsx) reacts automatically to any resulting GREEN→RED
  // transition with zero new wiring here. This effect only adds each
  // selected procedure to the cart; it makes no safety decision itself.
  // When the cart itself was the source (procedures_from_cart), it is already
  // the truth — syncing back would duplicate items under the safety-engine
  // naming and corrupt the compatibility analysis.
  useEffect(() => {
    if (answers.procedures_from_cart) return;
    const selected = answers.selected_procedures?.length
      ? answers.selected_procedures
      : answers.procedure_interest
        ? [answers.procedure_interest]
        : [];
    selected.forEach((value) => {
      const safetyName = toSafetyEngineName(value);
      if (!safetyName) return;
      if (cartItems.some((i) => i.name === safetyName)) return;
      addItem({ name: safetyName, title: safetyName });
    });
  }, [answers.procedures_from_cart, answers.procedure_interest, answers.selected_procedures, cartItems, addItem]);

  // Shows the "let me evaluate this" narration once per new violation event —
  // resets the moment pivotViolations goes from empty back to non-empty
  // (e.g. after the user resolves one conflict and a new one appears).
  const [narrationDismissed, setNarrationDismissed] = useState(true);
  const prevViolationCountRef = useRef(0);
  useEffect(() => {
    if (pivotViolations.length > 0 && prevViolationCountRef.current === 0) {
      setNarrationDismissed(false);
    }
    prevViolationCountRef.current = pivotViolations.length;
  }, [pivotViolations]);

  const showEvaluation = pivotViolations.length > 0 && !narrationDismissed;

  // Final hand-off: server-side safety re-check (unbypassable, M Principle) →
  // real Consultation.create() → onboarding profile completed → existing
  // iq200Pipeline (auto-triggers safeT4LifeScan, doctor assignment, etc.) →
  // ConversationSession marked completed. Payment/fee collection is a
  // deliberate follow-up, not wired in this phase — see plan notes.
  const handleFinalSubmit = async (verifiedChannels) => {
    // First press: run contact verification (email OTP → phone OTP) before
    // anything is created. The verified flags ride along on the second pass.
    if (!verifiedChannels) {
      setVerification('active');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const safetyCheck = await base44.functions.invoke('validateProcedureSafety', {
        items: cartItems.map((i) => ({ name: i.name, title: i.name })),
      });
      const safetyPayload = safetyCheck?.data ?? safetyCheck ?? {};
      if (safetyPayload.isBlocked) {
        setSubmitError('A safety review flagged this combination. Please go back and adjust your selection.');
        setSubmitting(false);
        return;
      }

      const consultation = await base44.entities.Consultation.create(buildConsultationPayload(answers, verifiedChannels));

      const { saveUserOnboardingProfile } = await import('@/lib/onboardingProfile');
      await saveUserOnboardingProfile({
        role: 'client',
        status: 'completed',
        linkedEntityName: 'Consultation',
        linkedEntityId: consultation.id,
        profileData: { started_from: 'intake' },
      }).catch(() => {});

      // Confirmation email within seconds of submission — what they told us,
      // a named coordinator, and the 24-hour promise. Non-blocking: a mail
      // hiccup must never make the submission look failed.
      base44.functions.invoke('sendConsultationReceivedEmail', { consultation_id: consultation.id }).catch(() => {});

      await base44.functions.invoke('iq200Pipeline', { action: 'create', consultation_id: consultation.id }).catch(() => {});

      if (sessionId && sessionId !== 'pending') {
        await base44.entities.ConversationSession.update(sessionId, {
          status: 'completed',
          consultation_id: consultation.id,
          completed_at: new Date().toISOString(),
        }).catch(() => {});
      }

      clearCart();
      setSubmitted(true);
    } catch (_) {
      setSubmitError('Something went wrong sending your consultation. Please try again, or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  // Affirmative consent action — persist it, stamp the moment, and seed it onto
  // the answers so buildConsultationPayload records it on the Consultation.
  const handleBegin = () => {
    const consentAt = new Date().toISOString();
    try {
      localStorage.setItem('morales_data_consent_v1', 'true');
      localStorage.setItem('morales_data_consent_at', consentAt);
    } catch { /* private mode — consent still rides on the Consultation payload */ }
    seedAnswers({ data_processing_consent: true, data_processing_consent_at: consentAt });
    setStarted(true);
  };

  const atReviewStep = nextStepResult.type === 'question' && nextStepResult.step.inputType === INPUT_TYPES.REVIEW;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE,
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
          <WelcomeCard
            onBegin={handleBegin}
            resuming={answeredCount > 0}
            requireConsent={!alreadyConsented}
            consented={consented}
            onConsentChange={setConsented}
          />
        ) : (
          <>
            <IntakeProgressChecklist items={checklistItems} progressLabel={progressLabel} progressRatio={progressRatio} />
            {nextStepResult.type === 'auth_gate' && <AuthGateStep answers={answers} />}
            {atReviewStep && !safetyReadoutAcknowledged && (
              <SafeTReadout safetyStatus={safetyStatus} onContinue={() => setSafetyReadoutAcknowledged(true)} />
            )}
            {atReviewStep && safetyReadoutAcknowledged && verification === 'active' && !submitted && (
              <ContactVerificationStep
                phone={answers.phone}
                onComplete={(result) => {
                  setVerification(result);
                  handleFinalSubmit(result);
                }}
              />
            )}
            {atReviewStep && safetyReadoutAcknowledged && verification !== 'active' && (
              <ReviewStep
                answers={answers}
                onSubmit={() => handleFinalSubmit(
                  verification && typeof verification === 'object' ? verification : null
                )}
                submitting={submitting}
                submitted={submitted}
                submitError={submitError}
                safetyStatus={safetyStatus}
                doctorSearch={doctorSearch}
                partnerPreview={partnerPreview}
              />
            )}
            {nextStepResult.type === 'question' && !atReviewStep && (
              <QuestionCard
                step={nextStepResult.step}
                onAnswer={submitAnswer}
                onFreeTextAnswer={submitFreeTextAnswer}
                dynamicOptions={{ destinationCountries }}
                dynamicOptionsLoading={{ destinationCountries: destinationsLoading }}
                doctorSearch={doctorSearch}
                destinationCountry={answers.destination_country}
                priceEstimates={priceEstimates}
                onBack={canGoBack ? goBack : null}
              />
            )}
            <NarrationTicker text={turnHistory[turnHistory.length - 1]?.narration_shown} />
            <NeedHumanButton answers={answers} sessionId={sessionId} />
          </>
        )}
      </div>

      {showEvaluation && (
        <ProcedureEvaluationStep
          procedureCount={cartItems.length}
          procedureNames={cartItems.map((i) => i.name)}
          onDone={() => setNarrationDismissed(true)}
        />
      )}
    </div>
  );
}

/**
 * Turns the three background searches into the live checklist — narrating
 * real counts once they're back, never a generic spinner. Question progress
 * itself is shown separately as a phase label (see PHASE_LABELS/getProgressLabel),
 * not as a checklist item.
 */
function buildChecklistItems({ answers, doctorSearch, costEstimate, partnerPreview }) {
  const items = [];

  const hasDestination = !!answers.destination_country && answers.destination_country !== UNSPECIFIED;

  if (answers.procedure_interest) {
    const pickedDoctorName = answers.preferred_doctor_name && answers.preferred_doctor_name !== UNSPECIFIED
      ? answers.preferred_doctor_name
      : null;

    if (pickedDoctorName) {
      // The user already picked during the doctor_selection step — reflect
      // their own choice back, not the generic top-match narration below.
      items.push({ label: `Dr. ${pickedDoctorName} selected as your preferred surgeon`, state: 'done' });
    } else if (doctorSearch.status === 'done') {
      const matched = doctorSearch.data?.matched_doctors ?? [];
      const count = matched.length;
      items.push({
        label: count > 0 ? `${count} verified surgeon${count === 1 ? '' : 's'} found` : 'Expanding our network for your procedure',
        state: 'done',
      });
      // Explainability — only real, returned fields; never a fabricated stat.
      const top = matched[0];
      if (top) {
        const why = [
          top.years_experience ? `${top.years_experience}+ years experience` : null,
          top.rating ? `${top.rating}★ rating` : null,
          top.clinic_city || top.clinic_country ? `licensed in ${[top.clinic_city, top.clinic_country].filter(Boolean).join(', ')}` : null,
        ].filter(Boolean).join(' · ');
        if (why) {
          items.push({ label: `→ ${top.name || 'Top match'}: ${why}`, state: 'done' });
        }
      }
    } else if (doctorSearch.status === 'loading') {
      items.push({ label: 'Finding verified surgeons...', state: 'pending' });
    }

    if (costEstimate.status === 'done') {
      const low = costEstimate.data?.estimatedTotalLow;
      const high = costEstimate.data?.estimatedTotalHigh;
      items.push({
        label: low != null ? `Estimated investment: $${low.toLocaleString()}–$${high.toLocaleString()}` : 'Cost estimate ready',
        state: 'done',
      });
    } else if (costEstimate.status === 'loading') {
      items.push({ label: 'Estimating your investment...', state: 'pending' });
    }
  }

  if (hasDestination) {
    if (partnerPreview.status === 'done') {
      const travel = partnerPreview.data?.travel_agency_count ?? 0;
      const taxi = partnerPreview.data?.taxi_service_count ?? 0;
      items.push({ label: `${travel} travel & ${taxi} transfer partners ready`, state: 'done' });
    } else if (partnerPreview.status === 'loading') {
      items.push({ label: 'Checking destination partners...', state: 'pending' });
    }
  }

  return items;
}

function LoadingShell() {
  return (
    <div style={{ textAlign: 'center', color: TEXT_SOFT, fontSize: 14 }}>
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: 36, height: 36, margin: '0 auto 16px', display: 'block', opacity: 0.6 }}
      />
      Preparing your consultation...
    </div>
  );
}

function WelcomeCard({ onBegin, resuming, requireConsent, consented, onConsentChange }) {
  const blocked = requireConsent && !consented;
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
          color: TEAL,
        }}
      >
        Your Concierge
      </p>

      <h1
        style={{
          margin: '0 0 14px',
          fontSize: 26,
          fontWeight: 600,
          color: TEXT,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        {resuming ? 'Welcome back' : "Let's understand what you need"}
      </h1>

      <p
        style={{
          margin: '0 0 32px',
          fontSize: 15,
          lineHeight: 1.65,
          color: TEXT_SOFT,
        }}
      >
        {resuming
          ? "You're right where you left off. Nothing you've already told me needs repeating."
          : "I'll ask a few questions, one at a time, and start finding your doctors, destinations, and costs as soon as I know enough to look. Nothing you share here is asked twice."}
      </p>

      {requireConsent && (
        <div style={{ marginBottom: 20 }}>
          <DataProcessingConsent checked={consented} onChange={onConsentChange} theme="light" />
        </div>
      )}

      <button
        type="button"
        onClick={onBegin}
        disabled={blocked}
        style={{
          width: '100%',
          padding: '15px 20px',
          borderRadius: 999,
          cursor: blocked ? 'not-allowed' : 'pointer',
          background: TEAL,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.02em',
          opacity: blocked ? 0.5 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {resuming ? 'Continue' : 'Begin'}
      </button>

      {/* Escape hatch to the classic wizard — same journey, form-style */}
      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: TEXT_SOFT }}>
        Prefer a classic form?{' '}
        <a href="/booking" style={{ color: TEAL, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Use the detailed form instead
        </a>
      </p>
    </motion.div>
  );
}
