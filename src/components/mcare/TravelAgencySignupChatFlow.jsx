// @ts-nocheck — pre-existing arithmetic/symbol type gaps, matches sibling intake components
/**
 * TravelAgencySignupChatFlow — signing up as a travel agency inside M-Care's
 * own chat panel. Second partner-signup-by-chat flow (after
 * DoctorSignupChatFlow.jsx), same discipline: deterministic decides, M-Care
 * narrates. This component only walks
 * src/lib/mcareFlow/travelAgencySignupGraph.js via the shared, graph-agnostic
 * flowEngine.getNextStep and, at the end, calls submitTravelAgencySignup() —
 * the exact function TravelAgencySignupStep3.jsx calls too. It never writes
 * a TravelAgency record itself and never decides what to ask next.
 *
 * Free-text answers are parsed/narrated by intakeConversationTurn (persona:
 * 'travel_agency_signup') purely for tone — a failed or empty extraction
 * always falls back to committing the raw text verbatim, never blocking the
 * conversation. MULTI_SELECT/BOOLEAN steps never call the LLM at all — same
 * as SELECT in the doctor flow, a tap commits directly.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getNextStep } from '@/lib/intakeFlow/flowEngine';
import { TRAVEL_AGENCY_SIGNUP_GRAPH, TRAVEL_AGENCY_INPUT_TYPES, SKIPPED } from '@/lib/mcareFlow/travelAgencySignupGraph';
import { saveSignupDraft, loadSignupDraft, clearSignupDraft, trackSignupProgress } from '@/lib/signupDraft';
import { submitTravelAgencySignup } from '@/lib/partnerSignup/submitTravelAgencySignup';
import { validateFile } from '@/lib/validateFile';
import { UPLOAD_PRESETS } from '@/lib/constants';
import SignupAuthGate from '@/components/auth/SignupAuthGate';

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

export default function TravelAgencySignupChatFlow({ isAuthenticated, language = 'en', onExit }) {
  const [answers, setAnswers] = useState(() => loadSignupDraft('travel_agency')?.data || {});
  const [turns, setTurns] = useState([]); // { questionText, answerDisplay, narration }
  const [inputValue, setInputValue] = useState('');
  const [multiPicked, setMultiPicked] = useState([]); // in-progress MULTI_SELECT taps for the current step
  const [thinking, setThinking] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [mustBeTrueWarning, setMustBeTrueWarning] = useState(null);
  const bottomRef = useRef(null);

  const nextStepResult = getNextStep(answers, { isAuthenticated }, TRAVEL_AGENCY_SIGNUP_GRAPH);
  const currentStep = nextStepResult.type !== 'complete' ? nextStepResult.step : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, nextStepResult.type]);

  // A fresh step always starts with a clean multi-select basket.
  useEffect(() => { setMultiPicked([]); setMustBeTrueWarning(null); }, [currentStep?.id]);

  const persistAnswers = useCallback((nextAnswers, stepId) => {
    saveSignupDraft('travel_agency', nextAnswers, { step: stepId });
    trackSignupProgress('travel_agency', nextAnswers, stepId);
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
        persona: 'travel_agency_signup',
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
    commit(currentStep, { [currentStep.targetFields[0]]: opt.value }, opt.label);
  };

  const toggleMultiOption = (opt) => {
    setMultiPicked((prev) => prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]);
  };

  const confirmMultiSelect = () => {
    if (multiPicked.length === 0) return;
    const labels = currentStep.options.filter((o) => multiPicked.includes(o.value)).map((o) => o.label);
    commit(currentStep, { [currentStep.targetFields[0]]: multiPicked }, labels.join(', '));
  };

  // A "no" on a mustBeTrue step (e.g. the legal confirmation) must never
  // silently count as answered — flowEngine treats any non-empty value,
  // `false` included, as "known." Re-prompt instead of committing, same as
  // the classic form leaving its submit button disabled until checked.
  const handleBooleanPick = (value) => {
    if (value === false && currentStep.mustBeTrue) {
      setMustBeTrueWarning("This one needs to be a yes to continue — it's a required confirmation, same as on the standard signup form.");
      return;
    }
    commit(currentStep, { [currentStep.targetFields[0]]: value }, value ? 'Yes' : 'No');
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
      commit(currentStep, { business_license_url: uploadRes.file_url }, file.name);
    } catch (_) {
      setUploadError('Upload failed — you can try again or skip for now.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkipUpload = () => {
    commit(currentStep, { business_license_url: SKIPPED }, 'Skip for now');
  };

  // Submission — runs once the graph is complete (auth already guaranteed,
  // since business_license is the only requiresAuth step and it's last).
  useEffect(() => {
    if (nextStepResult.type !== 'complete' || done) return;
    let cancelled = false;
    (async () => {
      try {
        await submitTravelAgencySignup(answers, language);
        if (cancelled) return;
        clearSignupDraft('travel_agency');
        setDone(true);
      } catch (error) {
        if (cancelled) return;
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
          Let's get your travel agency set up as a partner. I'll ask a few quick things — nothing you can't answer in a sentence or a tap.
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

            {currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.SELECT && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentStep.options.map((opt) => (
                  <button key={opt.value} onClick={() => handleSelectPick(opt)} style={chipStyle}>{opt.label}</button>
                ))}
              </div>
            )}

            {currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.MULTI_SELECT && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentStep.options.map((opt) => {
                    const picked = multiPicked.includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => toggleMultiOption(opt)}
                        style={{
                          background: picked ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${picked ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.09)'}`,
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: picked ? 700 : 400,
                          color: picked ? GOLD : 'rgba(255,255,255,0.85)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >{opt.label}</button>
                    );
                  })}
                </div>
                <button onClick={confirmMultiSelect} disabled={multiPicked.length === 0}
                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: multiPicked.length ? GOLD : 'rgba(255,255,255,0.06)', color: multiPicked.length ? DARK : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: multiPicked.length ? 'pointer' : 'default' }}
                >Continue{multiPicked.length ? ` (${multiPicked.length} selected)` : ''}</button>
              </div>
            )}

            {currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.BOOLEAN && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mustBeTrueWarning && (
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: '#f87171' }}>{mustBeTrueWarning}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleBooleanPick(true)} style={{ ...chipStyle, flex: 1, textAlign: 'center' }}>Yes</button>
                  <button onClick={() => handleBooleanPick(false)} style={{ ...chipStyle, flex: 1, textAlign: 'center' }}>No</button>
                </div>
              </div>
            )}

            {(currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.TEXT
              || currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.EMAIL
              || currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.PHONE) && (
              <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={thinking}
                  type={currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.EMAIL ? 'email' : currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.PHONE ? 'tel' : 'text'}
                  placeholder="Type your answer..."
                  style={inputStyle}
                />
                <button type="submit" disabled={!inputValue.trim() || thinking}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: inputValue.trim() && !thinking ? GOLD : 'rgba(255,255,255,0.06)', color: inputValue.trim() && !thinking ? DARK : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, cursor: inputValue.trim() && !thinking ? 'pointer' : 'default' }}
                >{thinking ? '...' : 'Send'}</button>
              </form>
            )}

            {currentStep.inputType === TRAVEL_AGENCY_INPUT_TYPES.FILE_UPLOAD && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ ...chipStyle, textAlign: 'center', cursor: uploading ? 'default' : 'pointer' }}>
                  {uploading ? 'Uploading...' : '📄 Upload business license'}
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
            <AssistantBubble>
              You're in — your travel agency profile is created and I've started your verification. That usually takes a bit, and I'll let you know the moment you're cleared to receive quote requests. You can check progress anytime from your dashboard.
            </AssistantBubble>
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
        message="Sign in to finish creating your travel agency account. Everything you've told me is saved — you'll be right back here."
        onCancel={onExit}
      />
    </div>
  );
}
