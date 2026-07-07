// @ts-nocheck — pre-existing type gap: base44 entity .filter()/.create() args, matches Booking.jsx
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getNextStep, isConfidenceAcceptable, shouldEscalateToHuman } from '@/lib/intakeFlow/flowEngine';
import { TRAVEL_QUESTION_GRAPH } from '@/lib/travelIntakeFlow/questionGraph';

const GUEST_DRAFT_KEY = 'morales_travel_intake_guest_draft';

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
 * Travel-only sibling of useIntakeSession.js — same ConversationSession
 * pattern, same intakeConversationTurn/flagIntakeHandoff edge functions
 * (both fully generic), but flow_type: 'travel_intake' so the two never
 * cross-resume each other, and "never ask twice" pulls from the user's most
 * recent TravelRequest instead of a Consultation.
 */
export function useTravelIntakeSession() {
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

        try {
          const guestDraft = localStorage.getItem(GUEST_DRAFT_KEY);
          if (guestDraft) {
            hydrated = { ...hydrated, ...JSON.parse(guestDraft) };
            localStorage.removeItem(GUEST_DRAFT_KEY);
          }
        } catch (_) {}

        try {
          const existing = await base44.entities.ConversationSession.filter({ user_email: user.email, flow_type: 'travel_intake' });
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

        // Never ask twice: reuse the origin city from the user's most recent
        // travel request, if any (destination changes trip to trip; origin
        // usually doesn't).
        try {
          const priorRequests = await base44.entities.TravelRequest.filter(
            { user_email: user.email },
            '-created_date',
            1
          );
          const prior = priorRequests?.[0];
          if (prior?.origin_city) {
            dispatch({
              type: 'HYDRATE',
              payload: {
                answers: {
                  origin_city: prior.origin_city,
                  origin_country: prior.origin_country,
                  ...hydrated,
                },
              },
            });
          }
        } catch (_) {}

        try {
          const { saveUserOnboardingProfile } = await import('@/lib/onboardingProfile');
          await saveUserOnboardingProfile({
            role: 'client',
            status: 'started',
            profileData: { selected_role: 'client', started_from: 'travel_intake' },
          });
        } catch (_) {}
      } else {
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

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
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
        flow_type: 'travel_intake',
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
          sessionIdRef.current = 'pending';
          const existing = await base44.entities.ConversationSession.filter({ user_email: currentUser.email, flow_type: 'travel_intake' });
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
        sessionIdRef.current = null;
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
          .catch(() => {});
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

  const nextStepResult = getNextStep(answers, { isAuthenticated }, TRAVEL_QUESTION_GRAPH);

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
