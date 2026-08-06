// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling intake components
/**
 * DoctorSignupChatFlow — the doctor-signup conversation rendered inside
 * M-Care's own chat panel. Phase 1 of the "M-Care as super-agent" work:
 * proves a partner can sign up by talking instead of filling out a form,
 * while ending at the exact same place the classic form does.
 *
 * Deterministic decides, M-Care narrates — same rule as everywhere else in
 * this app. This component only walks src/lib/mcareFlow/doctorSignupGraph.js
 * via the shared, graph-agnostic flowEngine.getNextStep and, at the end,
 * calls submitDoctorSignup() — the exact function DoctorSignupStep3.jsx
 * calls too. It never writes a Doctor record itself, never sets a
 * verification/trust field, and never decides what to ask next.
 *
 * Free-text answers are parsed/narrated by intakeConversationTurn (persona:
 * 'doctor_signup') purely for tone — a failed or empty extraction always
 * falls back to committing the raw text verbatim, never blocking the
 * conversation.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getNextStep } from '@/lib/intakeFlow/flowEngine';
import { DOCTOR_SIGNUP_GRAPH, DOCTOR_SIGNUP_INPUT_TYPES, SPECIALTY_OPTIONS, SKIPPED } from '@/lib/mcareFlow/doctorSignupGraph';
import { saveSignupDraft, loadSignupDraft, clearSignupDraft, trackSignupProgress } from '@/lib/signupDraft';
import { submitDoctorSignup } from '@/lib/partnerSignup/submitDoctorSignup';
import { validateFile } from '@/lib/validateFile';
import { UPLOAD_PRESETS } from '@/lib/constants';
import SignupAuthGate from '@/components/auth/SignupAuthGate';
import OrbMoment from './OrbMoment';

const GOLD = '#D4AF37';
const DARK = '#060B16';

function AssistantBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, lineHeight: 1.65, color: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', background: `linear-gradient(135deg, ${GOLD}cc, #b8960fcc)`, fontSize: 12, lineHeight: 1.65, color: DARK, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
        {children}
      </div>
    </div>
  );
}

const chipStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  textAlign: 'left',
};

const inputStyle = {
  flex: 1,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  padding: '8px 12px',
  fontSize: 12,
  color: '#fff',
  outline: 'none',
};

export default function DoctorSignupChatFlow({ isAuthenticated, language = 'en', onExit }) {
  const [answers, setAnswers] = useState(() => loadSignupDraft('doctor')?.data || {});
  const [turns, setTurns] = useState([]); // { questionText, answerDisplay, narration }
  const [inputValue, setInputValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const bottomRef = useRef(null);

  const nextStepResult = getNextStep(answers, { isAuthenticated }, DOCTOR_SIGNUP_GRAPH);
  const currentStep = nextStepResult.type !== 'complete' ? nextStepResult.step : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, nextStepResult.type]);

  const persistAnswers = useCallback((nextAnswers, stepId) => {
    saveSignupDraft('doctor', nextAnswers, { step: stepId });
    trackSignupProgress('doctor', nextAnswers, stepId);
  }, []);

  const commit = useCallback((step, extracted, answerDisplay, narration = '') => {
    const nextAnswers = { ...answers, ...extracted };
    setAnswers(nextAnswers);
    persistAnswers(nextAnswers, step.id);
    setTurns((t) => [...t, { questionText: step.question, answerDisplay, narration }]);
    setInputValue('');
  }, [answers, persistAnswers]);

  const submitFreeText = useCallback(async (step, rawText) => {
    setThinking(true);
    let extracted = null;
    let narration = '';
    try {
      const res = await base44.functions.invoke('intakeConversationTurn', {
        step_id: step.id,
        question_shown: step.question,
        deterministic_reason: step.deterministicReason,
        target_fields: step.targetFields,
        user_raw_text: rawText,
        known_answers_snapshot: answers,
        persona: 'doctor_signup',
      });
      const payload = res?.data ?? res ?? {};
      if (payload.extracted && typeof payload.extracted === 'object' && Object.keys(payload.extracted).length > 0) {
        extracted = payload.extracted;
        narration = payload.narration || '';
      }
    } catch (_) { /* fall through to raw-text fallback below */ }

    if (!extracted) {
      extracted = {};
      (step.targetFields || []).forEach((f) => { extracted[f] = rawText; });
    }

    setThinking(false);
    commit(step, extracted, rawText, narration);
  }, [answers, commit]);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    const raw = inputValue.trim();
    if (!raw || thinking) return;
    submitFreeText(currentStep, raw);
  };

  const handleSelectPick = (opt) => {
    commit(currentStep, { specialties: [opt.value] }, opt.label);
  };

  const handleLicenseUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const check = validateFile(file, UPLOAD_PRESETS.DOCUMENT_UPLOAD);
    if (!check.valid) { setUploadError(check.error); return; }

    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      commit(currentStep, { license_url: uploadRes.file_url }, file.name);
    } catch (_) {
      setUploadError('Upload failed — you can try again or skip for now.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkipUpload = () => {
    commit(currentStep, { license_url: SKIPPED }, 'Skip for now');
  };

  // Submission — runs once the graph is complete (auth already guaranteed,
  // since license_document is the only requiresAuth step and it's last).
  useEffect(() => {
    if (nextStepResult.type !== 'complete' || done) return;
    let cancelled = false;
    (async () => {
      try {
        await submitDoctorSignup(answers, language);
        if (cancelled) return;
        clearSignupDraft('doctor');
        setDone(true);
      } catch (error) {
        if (cancelled) return;
        // AUTH_REQUIRED shouldn't happen here (the graph's own auth gate
        // already ran), but fail safe rather than silently losing the
        // doctor's answers if it somehow does.
        setSubmitError(error?.message === 'AUTH_REQUIRED'
          ? "I need you signed in to finish this — let's go back one step."
          : "Something went wrong submitting your details. Your answers are saved — you can try again.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextStepResult.type, done]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AssistantBubble>
          Let's get you set up as a partner doctor. I'll ask a few quick things — nothing you can't answer in a sentence.
        </AssistantBubble>

        {turns.map((turn, i) => (
          <React.Fragment key={i}>
            <AssistantBubble>{turn.questionText}</AssistantBubble>
            <UserBubble>{turn.answerDisplay}</UserBubble>
            {turn.narration && <AssistantBubble>{turn.narration}</AssistantBubble>}
          </React.Fragment>
        ))}

        {nextStepResult.type === 'question' && currentStep && (
          <>
            <AssistantBubble>{currentStep.question}</AssistantBubble>

            {currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.SELECT && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(currentStep.options || SPECIALTY_OPTIONS).map((opt) => (
                  <button key={opt.value} onClick={() => handleSelectPick(opt)} style={chipStyle}>{opt.label}</button>
                ))}
              </div>
            )}

            {(currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.TEXT
              || currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.EMAIL
              || currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.PHONE) && (
              <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={thinking}
                  type={currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.EMAIL ? 'email' : currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.PHONE ? 'tel' : 'text'}
                  placeholder="Type your answer..."
                  style={inputStyle}
                />
                <button type="submit" disabled={!inputValue.trim() || thinking}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: inputValue.trim() && !thinking ? GOLD : 'rgba(255,255,255,0.06)', color: inputValue.trim() && !thinking ? DARK : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: inputValue.trim() && !thinking ? 'pointer' : 'default' }}
                >{thinking ? '...' : 'Send'}</button>
              </form>
            )}

            {currentStep.inputType === DOCTOR_SIGNUP_INPUT_TYPES.FILE_UPLOAD && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ ...chipStyle, textAlign: 'center', cursor: uploading ? 'default' : 'pointer' }}>
                  {uploading ? 'Uploading...' : '📄 Upload license document'}
                  <input type="file" accept="image/*,.pdf" onChange={handleLicenseUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
                {uploadError && <p style={{ margin: 0, fontSize: 11, color: '#f87171' }}>{uploadError}</p>}
                <button onClick={handleSkipUpload} style={{ ...chipStyle, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Skip for now</button>
              </div>
            )}
          </>
        )}

        {nextStepResult.type === 'auth_gate' && (
          <AssistantBubble>Just need you signed in to finish this up — one moment.</AssistantBubble>
        )}

        {nextStepResult.type === 'complete' && !done && !submitError && (
          <AssistantBubble>One moment — setting up your account...</AssistantBubble>
        )}

        {submitError && (
          <>
            <AssistantBubble>{submitError}</AssistantBubble>
            <button onClick={onExit} style={{ ...chipStyle, textAlign: 'center' }}>Close</button>
          </>
        )}

        {done && (
          <>
            <OrbMoment
              headline="Application submitted."
              caption="Your doctor profile is created and I've started your verification (a fraud/license check runs automatically) — I'll let you know the moment you're cleared to see patients. You can check progress anytime from your dashboard."
              status={{ label: 'Verification in progress', note: 'Usually takes a bit' }}
            />
            <button onClick={onExit} style={{ ...chipStyle, textAlign: 'center', color: GOLD, borderColor: 'rgba(212,175,55,0.3)' }}>Done</button>
          </>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', padding: 0 }}>← Back to M-Care</button>
      </div>

      <SignupAuthGate
        isOpen={nextStepResult.type === 'auth_gate'}
        redirectPath={typeof window !== 'undefined' ? window.location.pathname : '/'}
        title="One step left — sign in"
        message="Sign in to finish creating your doctor account. Everything you've told me is saved — you'll be right back here."
        onCancel={onExit}
      />
    </div>
  );
}
