import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useIntakeSession, INTAKE_DRAFT_KEY } from '@/hooks/useIntakeSession';
import { useDestinationCountries } from '@/hooks/useDestinationCountries';
import { useDestinationPriceEstimates } from '@/hooks/useDestinationPriceEstimates';
import { useIntakeBackgroundSearch } from '@/hooks/useIntakeBackgroundSearch';
import { useCart } from '@/context/CartContext';
import { UNSPECIFIED, INPUT_TYPES, QUESTION_GRAPH } from '@/lib/intakeFlow/questionGraph';
import { isMinorAge } from '@/lib/guardianGate';
import { getAnsweredQuestionCount, getTotalQuestionCount, getProgressLabel } from '@/lib/intakeFlow/flowEngine';
import { toSafetyEngineName } from '@/lib/intakeFlow/procedureSafetyNameMap';
import { buildConsultationPayload } from '@/lib/intakeFlow/fieldMap';
import QuestionCard from '@/components/intake/QuestionCard';
import AuthGateStep from '@/components/intake/AuthGateStep';
import VisaReadinessStep from '@/components/intake/VisaReadinessStep';
import PassportReadinessStep from '@/components/intake/PassportReadinessStep';
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
const _GOLD = '#D4AF37';        // trust markers only
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
  const { items: cartItems, addItem, pivotViolations, safetyStatus, clearCart, setMedicalConditions } = useCart();

  const [safetyReadoutAcknowledged, setSafetyReadoutAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Non-medical fields M worked out on the review screen, as the patient
  // last saw them (M's value, or their correction of it).
  const [derivedAnswers, setDerivedAnswers] = useState({});
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
    // Carry EVERY procedure in the cart, not just the first. This used to seed
    // `cartItems[0]` and then explicitly blank `selected_procedures`, so a
    // patient who built a three-procedure cart on /procedures and walked into
    // the conversation had two of them silently dropped from their answers.
    // The cart itself still held all three — which is why the safety engine
    // and the RED block kept working — but the record they submitted did not,
    // and that is the one a doctor reads.
    const enums = cartItems.map((i) => i.procedure_enum).filter(Boolean);
    seedAnswers({
      procedure_interest: enums[0] || 'other',
      selected_procedures: enums,
      procedures_from_cart: true,
    });
  }, [isLoading, cartItems, answers.procedure_interest, answers.selected_procedures, seedAnswers]);

  // Doctor-directory hand-off: when a patient arrives from a "Book Dr. X" link
  // (/intake?doctor_id=&doctor=&country=), seed those answers so the doctor and
  // destination questions auto-skip AND the chosen doctor is actually persisted
  // on the Consultation — the old /consultation flow only showed a banner and
  // never saved the doctor. Seeds never overwrite a real answer the user gave.
  const urlSeededRef = useRef(false);
  useEffect(() => {
    if (isLoading || urlSeededRef.current) return;
    const p = new URLSearchParams(window.location.search);
    const docId = p.get('doctor_id');
    const docName = p.get('doctor');
    const country = p.get('country');
    if (!docId && !docName && !country) return;
    urlSeededRef.current = true;
    const seed = {};
    if (docName && !answers.preferred_doctor_name) {
      seed.preferred_doctor_name = docName;
      // Both id + name are needed for the doctor step to auto-skip. Without a real
      // id (older links) the step is simply shown so they can pick — never a bogus id.
      if (docId) seed.preferred_doctor_id = docId;
    }
    if (country && !answers.destination_country) {
      seed.destination_country = country;
      seed.procedure_country = country;
    }
    if (Object.keys(seed).length) seedAnswers(seed);
  }, [isLoading, answers.preferred_doctor_name, answers.destination_country, seedAnswers]);

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

  // The medical-conditions question is answered AFTER procedures in this
  // conversation (questionGraph.js asks procedure_interest before
  // medical_conditions_other) — a patient who arrived with procedures already
  // in the cart from /procedures has already passed the RED-lock gate before
  // disclosing a condition here. Feeding it into the same shared cart context
  // lets SafetyWatcher (already globally mounted, already reacting to any
  // GREEN/YELLOW→RED transition) re-evaluate and open SafetyPivotOverlay the
  // moment a high-risk condition turns an already-selected combination
  // dangerous — no new UI, this is the same machinery the CTAs use.
  useEffect(() => {
    setMedicalConditions(answers.medical_conditions || []);
  }, [answers.medical_conditions, setMedicalConditions]);

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
      // The server-side safety re-check is UNBYPASSABLE (M Principle). The SDK
      // throws on 4xx/5xx, so an unreachable/undeployed validator lands in this
      // catch — and the submission stays blocked. That behaviour is correct and
      // must never be softened; what earned its own catch is the MESSAGE. The
      // generic "something went wrong, try again" was a lie by omission: trying
      // again cannot help while the safety service is down, and the patient
      // deserves to know nothing was submitted and nothing was lost (the draft
      // survives locally until the consultation actually exists — see
      // INTAKE_DRAFT_KEY below).
      let safetyCheck;
      try {
        safetyCheck = await base44.functions.invoke('validateProcedureSafety', {
          items: cartItems.map((i) => ({ name: i.name, title: i.name })),
          conditions: answers.medical_conditions || [],
        });
      } catch (safetyErr) {
        console.error('[intake] validateProcedureSafety unreachable — submission blocked (fail closed):', safetyErr?.status, safetyErr?.message);
        setSubmitError("We couldn't run the final safety check just now, so nothing was submitted — we never skip it. Your answers are saved on this device; please try again shortly, or contact us directly.");
        setSubmitting(false);
        return;
      }
      const safetyPayload = safetyCheck?.data ?? safetyCheck ?? {};
      if (safetyPayload.isBlocked) {
        setSubmitError('A safety review flagged this combination. Please go back and adjust your selection.');
        setSubmitting(false);
        return;
      }

      // M PRINCIPLE — under-18 hard gate, re-derived server-side. A minor cannot
      // submit without a captured guardian identity (name + valid contact). This
      // turns the previous soft flag (guardian_required with empty fields) into a
      // real block that a direct submit cannot slip past.
      if (isMinorAge(answers.age)) {
        // Same fail-closed honesty as the safety check above: if the guardian
        // validator is unreachable, a minor's submission stays blocked and the
        // message says so — it does not pretend a retry might work right now.
        let guardianCheck;
        try {
          guardianCheck = await base44.functions.invoke('validateGuardianRequirement', {
            age: answers.age,
            guardian_name: answers.guardian_name,
            guardian_contact: answers.guardian_contact,
          });
        } catch (guardianErr) {
          console.error('[intake] validateGuardianRequirement unreachable — minor submission blocked (fail closed):', guardianErr?.status, guardianErr?.message);
          setSubmitError("We couldn't verify the guardian details just now, so nothing was submitted — for anyone under 18 that check is never skipped. Your answers are saved on this device; please try again shortly.");
          setSubmitting(false);
          return;
        }
        const guardianVerdict = guardianCheck?.data ?? guardianCheck ?? {};
        if (guardianVerdict.blocked) {
          setSubmitError(guardianVerdict.reason || 'A parent or guardian’s name and a valid phone or email are required before we can proceed for a patient under 18.');
          setSubmitting(false);
          return;
        }
      }

      // Derived answers are layered UNDER the patient's own, never over them:
      // deriveIntake only produces a field the patient left blank, but if a
      // later question ever backfills one, what they actually said wins.
      // Nothing here can touch a medical field — see SAFETY_INPUT_FIELDS in
      // lib/intakeFlow/derivedFields.js.
      const mergedAnswers = { ...derivedAnswers, ...answers };
      for (const [field, value] of Object.entries(derivedAnswers)) {
        if (!answers[field] || answers[field] === UNSPECIFIED) mergedAnswers[field] = value;
      }

      const consultation = await base44.entities.Consultation.create(buildConsultationPayload(mergedAnswers, verifiedChannels));

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
      // The consultation is submitted, so the "you're mid-consultation, nothing
      // is lost" state on /procedures is no longer true. Cleared here rather
      // than in MultiProcedureStep because a patient who picked their
      // procedures on /procedures never re-mounts that step — the question
      // auto-skips — and would have left the flag set behind them.
      try {
        localStorage.removeItem('morales_intake_browsing');
        localStorage.removeItem('morales_intake_pending_procedures');
        // The consultation exists on the server now, so the local mirror is
        // finally safe to drop. This is the ONLY place it is cleared — it was
        // previously retired after the first session save, which left every
        // later answer unprotected against a cancelled save.
        localStorage.removeItem(INTAKE_DRAFT_KEY);
      } catch { /* non-essential */ }
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
  const atVisaReadinessStep = nextStepResult.type === 'question' && nextStepResult.step.inputType === INPUT_TYPES.VISA_READINESS;
  const atPassportReadinessStep = nextStepResult.type === 'question' && nextStepResult.step.inputType === INPUT_TYPES.PASSPORT_READINESS;

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
            {atVisaReadinessStep && (
              <VisaReadinessStep
                nationality={answers.nationality}
                destination={answers.destination_country}
                onContinue={() => submitAnswer({
                  stepId: nextStepResult.step.id,
                  question: nextStepResult.step.question,
                  rawText: 'Continue',
                  extracted: { visa_readiness_acknowledged: true },
                  confidence: 100,
                  narration: '',
                })}
              />
            )}
            {atPassportReadinessStep && (
              <PassportReadinessStep
                passportExpiry={answers.passport_expiry_date}
                travelDate={answers.preferred_date}
                nationality={answers.nationality}
                onContinue={() => submitAnswer({
                  stepId: nextStepResult.step.id,
                  question: nextStepResult.step.question,
                  rawText: 'Continue',
                  extracted: { passport_readiness_acknowledged: true },
                  confidence: 100,
                  narration: '',
                })}
              />
            )}
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
                costEstimate={costEstimate}
                onDerivedChange={setDerivedAnswers}
              />
            )}
            {nextStepResult.type === 'question' && !atReviewStep && !atVisaReadinessStep && !atPassportReadinessStep && (
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
                answers={answers}
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
      // A green tick means "I did this for you". Finding nobody is not that.
      // The copy stays — expanding the network for this procedure is true and
      // worth saying — but it sits as ongoing work, not as a completed win.
      items.push({
        label: count > 0 ? `${count} verified surgeon${count === 1 ? '' : 's'} found` : 'Expanding our network for your procedure',
        state: count > 0 ? 'done' : 'pending',
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
      // "Cost estimate ready" with no numbers behind it was the worst of the
      // three: it claimed a finished piece of work and then had nothing to
      // show. If there is no range, there is no item.
      if (low != null) {
        items.push({
          label: `Estimated investment: $${low.toLocaleString()}–$${high.toLocaleString()}`,
          state: 'done',
        });
      }
    } else if (costEstimate.status === 'loading') {
      items.push({ label: 'Estimating your investment...', state: 'pending' });
    }
  }

  if (hasDestination) {
    if (partnerPreview.status === 'done') {
      const travel = partnerPreview.data?.travel_agency_count ?? 0;
      const taxi = partnerPreview.data?.taxi_service_count ?? 0;
      // "0 travel & 0 transfer partners ready ✓" was a green tick celebrating
      // an empty result. Nothing replaces it when the counts are zero: the
      // checklist is a record of what M has actually done for this patient,
      // and inventing a reassurance here ("your coordinator will arrange it")
      // would be promising something no code behind this screen guarantees.
      if (travel + taxi > 0) {
        items.push({ label: `${travel} travel & ${taxi} transfer partners ready`, state: 'done' });
      }
    } else if (partnerPreview.status === 'loading') {
      items.push({ label: 'Checking destination partners...', state: 'pending' });
    }
  }

  return items;
}

function LoadingShell() {
  return (
    <div style={{ textAlign: 'center', color: TEXT_SOFT, fontSize: 'clamp(1rem, 2vw, 1.1rem)' }}>
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
  const [nudge, setNudge] = React.useState(false);

  /* "Begin" used to be rendered disabled until the consent box was ticked, with
     no explanation anywhere on the card. Someone who didn't notice the checkbox
     tapped a dead button and nothing happened — no message, no movement, no way
     to find out why. That is the trap the M Ease Manifesto exists to prevent.

     The gate itself is non-negotiable (consent is a compliance control, and it
     is re-checked server-side), so the button still cannot proceed without it.
     What changed is that it now ANSWERS: tap it and the consent box is pointed
     at and the reason is stated. A blocked action must always say what unblocks
     it. */
  const handleClick = () => {
    if (blocked) { setNudge(true); return; }
    onBegin();
  };

  React.useEffect(() => { if (consented) setNudge(false); }, [consented]);

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
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
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
          fontSize: 'clamp(1rem, 2vw, 1.1rem)',
          lineHeight: 1.65,
          color: TEXT_SOFT,
        }}
      >
        {resuming
          ? "You're right where you left off. Nothing you've already told me needs repeating."
          : "I'll ask a few questions, one at a time, and start finding your doctors, destinations, and costs as soon as I know enough to look. Nothing you share here is asked twice."}
      </p>

      {requireConsent && (
        <motion.div
          style={{
            marginBottom: 20,
            borderRadius: 16,
            outline: nudge ? '2px solid #047857' : '2px solid transparent',
            outlineOffset: 2,
            transition: 'outline-color 0.25s ease',
          }}
          animate={nudge ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DataProcessingConsent checked={consented} onChange={onConsentChange} theme="light" />
        </motion.div>
      )}

      {nudge && (
        <p role="alert" style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5, color: '#047857', textAlign: 'left', fontWeight: 600 }}>
          Please tick the box above so we can begin — it&rsquo;s how you tell us it&rsquo;s alright to
          handle your information.
        </p>
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-disabled={blocked}
        style={{
          width: '100%',
          padding: '15px 20px',
          borderRadius: 999,
          cursor: 'pointer',
          background: TEAL,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.02em',
          opacity: blocked ? 0.55 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {resuming ? 'Continue' : 'Begin'}
      </button>

      {/* Escape hatch to the classic wizard — same journey, form-style.
          Deliberately quiet. Offering "conversation or form?" as a headline
          choice makes someone decide HOW to tell us before they decide WHAT to
          tell us, at the moment they are most anxious. M should lead; the
          alternative stays available for anyone who wants it. */}
      <p style={{ margin: '22px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
        <a href="/booking" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Use the detailed form instead
        </a>
      </p>
    </motion.div>
  );
}