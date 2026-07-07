// @ts-nocheck — pre-existing type gap: base44 entity .filter()/.create() args, matches Booking.jsx
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getNextStep, isConfidenceAcceptable, shouldEscalateToHuman } from '@/lib/intakeFlow/flowEngine';

const GUEST_DRAFT_KEY = 'morales_intake_guest_draft';

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'RECORD_TURN': {
      const { stepId, question, rawText, extracted, confidence, narration } = action.payload;
      const turn = {
        turn_index: state.turnHistory.length,
        step_id: stepId,
        question_shown: question,
        user_raw_text: rawText,
        extracted,
        confidence: confidence ?? 100,
        narration_shown: narration ?? '',
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        answers: { ...state.answers, ...extracted },
        turnHistory: [...state.turnHistory, turn].slice(-40),
        lowConfidenceStreak: 0,
      };
    }
    case 'INCREMENT_LOW_CONFIDENCE':
      return { ...state, lowConfidenceStreak: (state.lowConfidenceStreak || 0) + 1 };
    default:
      return state;
  }
}

/**
 * Owns ConversationSession state: loads-or-creates the backend session for an
 * authenticated user, falls back to a local-only guest draft (pre-auth-gate
 * answers only — never persisted server-side, mirroring how ConsultationDraft
 * itself is guest-inaccessible in Booking.jsx), debounce-autosaves, and
 * resumes a returning user without ever re-asking a known field.
 */
export function useIntakeSession() {
  const [{ answers, turnHistory, lowConfidenceStreak }, dispatch] = useReducer(reducer, {
    answers: {},
    turnHistory: [],
    lowConfidenceStreak: 0,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sessionIdRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── Load auth state, prior session, and any known Consultation data ──────
  useEffect(() => {
    (async () => {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch (_) {
        // guest — expected, not an error
      }

      if (user?.email) {
        setCurrentUser(user);
        setIsAuthenticated(true);

        let hydrated = {};

        // Restore guest answers collected before sign-in (pre-auth-gate steps).
        try {
          const guestDraft = localStorage.getItem(GUEST_DRAFT_KEY);
          if (guestDraft) {
            hydrated = { ...hydrated, ...JSON.parse(guestDraft) };
            localStorage.removeItem(GUEST_DRAFT_KEY);
          }
        } catch (_) {}

        // Resume an existing in-progress ConversationSession.
        try {
          const existing = await base44.entities.ConversationSession.filter({ user_email: user.email });
          const session = existing.find((s) => s.status === 'in_progress') || null;
          if (session) {
            sessionIdRef.current = session.id;
            hydrated = { ...(session.answers || {}), ...hydrated };
            dispatch({
              type: 'HYDRATE',
              payload: {
                answers: hydrated,
                turnHistory: session.turn_history || [],
                lowConfidenceStreak: session.low_confidence_streak || 0,
              },
            });
          } else {
            dispatch({ type: 'HYDRATE', payload: { answers: hydrated, turnHistory: [] } });
          }
        } catch (_) {
          dispatch({ type: 'HYDRATE', payload: { answers: hydrated, turnHistory: [] } });
        }

        // Never ask twice, even across a brand-new session: pull the most
        // recent Consultation for this email and treat its fields as known.
        try {
          const priorConsultations = await base44.entities.Consultation.filter(
            { email: user.email },
            '-created_date',
            1
          );
          const prior = priorConsultations?.[0];
          if (prior) {
            dispatch({
              type: 'HYDRATE',
              payload: {
                answers: {
                  patient_name: prior.patient_name,
                  email: prior.email,
                  phone: prior.phone,
                  age: prior.age,
                  gender: prior.gender,
                  nationality: prior.nationality,
                  client_country: prior.client_country,
                  ...hydrated, // anything the user already answered this session wins
                },
              },
            });
          }
        } catch (_) {}

        // Also record the role/stage the same way Booking.jsx does, so
        // cross-feature onboarding tracking sees this flow starting.
        try {
          const { saveUserOnboardingProfile } = await import('@/lib/onboardingProfile');
          await saveUserOnboardingProfile({
            role: 'client',
            status: 'started',
            profileData: { selected_role: 'client', started_from: 'intake' },
          });
        } catch (_) {}
      } else {
        // Guest — local-only state, pre-auth-gate steps only.
        try {
          const guestDraft = localStorage.getItem(GUEST_DRAFT_KEY);
          dispatch({
            type: 'HYDRATE',
            payload: { answers: guestDraft ? JSON.parse(guestDraft) : {}, turnHistory: [] },
          });
        } catch (_) {}
      }

      setIsLoading(false);
    })();
  }, []);

  // ── Debounced persistence ─────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Guest: local-only, matches ConsultationDraft's own guest-inaccessible pattern.
      try {
        localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(answers));
      } catch (_) {}
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const payload = {
        user_email: currentUser.email,
        user_name: currentUser.full_name || '',
        role: 'client',
        status: 'in_progress',
        answers,
        turn_history: turnHistory,
        low_confidence_streak: lowConfidenceStreak,
        last_updated_at: new Date().toISOString(),
      };
      try {
        if (sessionIdRef.current && sessionIdRef.current !== 'pending') {
          await base44.entities.ConversationSession.update(sessionIdRef.current, payload);
        } else if (!sessionIdRef.current) {
          sessionIdRef.current = 'pending'; // idempotency guard against double-create
          const existing = await base44.entities.ConversationSession.filter({ user_email: currentUser.email });
          const inProgress = existing.find((s) => s.status === 'in_progress');
          if (inProgress) {
            sessionIdRef.current = inProgress.id;
            await base44.entities.ConversationSession.update(sessionIdRef.current, payload);
          } else {
            const created = await base44.entities.ConversationSession.create({
              ...payload,
              started_at: new Date().toISOString(),
            });
            sessionIdRef.current = created.id;
          }
        }
      } catch (_) {
        sessionIdRef.current = null; // allow retry on next change
      }
    }, 1000);

    return () => clearTimeout(saveTimerRef.current);
  }, [answers, turnHistory, lowConfidenceStreak, isAuthenticated, isLoading]);

  const submitAnswer = useCallback(
    ({ stepId, question, rawText, extracted, confidence, narration }) => {
      dispatch({
        type: 'RECORD_TURN',
        payload: { stepId, question, rawText, extracted, confidence, narration },
      });
    },
    []
  );

  /**
   * Free-text answers route through the LLM (parsing + narration only — see
   * intakeConversationTurn). If confidence is too low, the turn is NOT
   * committed and the caller should re-prompt for clarification instead of
   * advancing. If the call fails outright (network, LLM outage), falls back
   * to committing the raw text verbatim so the conversation never blocks.
   */
  const submitFreeTextAnswer = useCallback(
    async ({ stepId, question, deterministicReason, targetFields, rawText }) => {
      let turn = null;
      try {
        const res = await base44.functions.invoke('intakeConversationTurn', {
          step_id: stepId,
          question_shown: question,
          deterministic_reason: deterministicReason,
          target_fields: targetFields,
          user_raw_text: rawText,
          known_answers_snapshot: answers,
        });
        const payload = res?.data ?? res ?? {};
        if (payload.extracted && typeof payload.extracted === 'object') {
          turn = {
            extracted: payload.extracted,
            confidence: typeof payload.confidence === 'number' ? payload.confidence : 100,
            clarificationNeeded: !!payload.clarification_needed,
            narration: payload.narration || '',
            acknowledgement: payload.acknowledgement || '',
          };
        }
      } catch (_) {
        turn = null;
      }

      if (!turn) {
        // Network/LLM failure — commit the raw answer verbatim rather than blocking.
        const extracted = {};
        (targetFields || []).forEach((f) => { extracted[f] = rawText; });
        turn = { extracted, confidence: 100, clarificationNeeded: false, narration: '', acknowledgement: '' };
      }

      const accepted = isConfidenceAcceptable(turn.confidence, lowConfidenceStreak) && !turn.clarificationNeeded;

      if (accepted) {
        dispatch({
          type: 'RECORD_TURN',
          payload: { stepId, question, rawText, extracted: turn.extracted, confidence: turn.confidence, narration: turn.narration },
        });
      } else {
        dispatch({ type: 'INCREMENT_LOW_CONFIDENCE' });
      }

      const shouldEscalate = !accepted && shouldEscalateToHuman(lowConfidenceStreak + 1);

      if (shouldEscalate && currentUser?.email) {
        base44.functions
          .invoke('flagIntakeHandoff', {
            session_id: sessionIdRef.current !== 'pending' ? sessionIdRef.current : null,
            user_email: currentUser.email,
            user_name: currentUser.full_name || '',
            reason: `Repeated low-confidence answers on: ${question}`,
            turn_history: turnHistory,
            answers,
          })
          .catch(() => {}); // handoff failure must not block the UI's own escalation message
      }

      return {
        accepted,
        narration: turn.narration,
        acknowledgement: turn.acknowledgement,
        shouldEscalate,
      };
    },
    [answers, lowConfidenceStreak, currentUser, turnHistory]
  );

  const nextStepResult = getNextStep(answers, { isAuthenticated });

  return {
    answers,
    turnHistory,
    lowConfidenceStreak,
    currentUser,
    isAuthenticated,
    isLoading,
    submitAnswer,
    submitFreeTextAnswer,
    nextStepResult,
    sessionId: sessionIdRef.current,
  };
}
