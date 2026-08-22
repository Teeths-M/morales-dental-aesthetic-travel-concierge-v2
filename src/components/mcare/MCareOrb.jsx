// @ts-nocheck
/**
 * MCareOrb — M-Care, the one AI concierge for every user and partner.
 *
 * SYNCED with base44/agents/m_care.jsonc: the orb now runs the REAL stateful
 * super-agent (safety gate → consent → verified provider match → coordination
 * → monitoring), not a generic KB/LLM Q&A chatbot. The orb and the /m-care
 * page share the same agent, the same conversation, and the same tool set.
 *
 * The orb keeps its presence layer (floating button, contextual tips, living
 * orb avatar, voice input) but the chat engine is the agent SDK:
 *   base44.agents.createConversation / addMessage / subscribeToConversation
 * JourneyStageTracker reflects real case state from the agent's tool calls,
 * and MessageBubble renders the agent's tool calls inline.
 *
 * The open chat panel is styled as "M-Safe" (white + purple #6C47FF) per the
 * product design spec; the floating orb button keeps its dark-glass presence.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send, RotateCcw, Maximize2, Minimize2, X, LogIn, Stethoscope, Briefcase, Luggage, Siren, FileText, Volume2, VolumeX, Phone, PhoneCall, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import LocationPermissionGate from './LocationPermissionGate';
import LivingOrb from './LivingOrb';
import InterruptedIntentChip from './InterruptedIntentChip';
import MessageBubble, { InlineQrBlock } from '@/components/mcare-agent/MessageBubble';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import SmartInputSuggestions from '@/components/mcare-agent/SmartInputSuggestions';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import MCareVaultUpload, { DOC_LABEL } from '@/components/mcare-agent/MCareVaultUpload';
import { isSystemPaused } from '@/lib/systemPause';
import { friendlyError } from '@/lib/friendlyError';
import { handleChatPaste } from '@/lib/chatPaste';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/i18n';
import { STRUGGLE_HINT_EVENT } from '@/lib/struggleHint';
import { MCARE_OPEN_EVENT } from '@/lib/openMcareEvent';
import { extractSpeakableText, isSpeechSupported } from '@/lib/talkMode';
import { speakTextNeural, stopAllSpeech, isNeuralSpeaking } from '@/lib/neuralSpeech';
import {
  isConversationalModeSupported,
  classifyInterruptionUtterance,
  pushInterruptedIntent,
  clearInterruptedIntents,
  shortTopicLabel,
  startContinuousRecognition,
  SILENCE_NUDGE_MS,
  MAX_SILENCE_NUDGES,
  SILENCE_NUDGE_TEXT,
} from '@/lib/conversationalMode';
import { parseMcareCommand } from '@/lib/voiceCommands';
import { armSurroundingAwareness, disarmSurroundingAwareness } from '@/lib/surroundingAwareness';
import { useMcarePreferences } from '@/hooks/useMcarePreferences';
import { detectDistressSignal, distressWelfarePrompt } from '@/lib/distressDetection';
import { detectSpokenLanguage, recognitionLocaleFor } from '@/lib/spokenLanguageDetect';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import { useJourneyEvents } from '@/hooks/useJourneyEvents';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import { buildLocationContextBlock } from '@/lib/locationContext';
import { detectLocationConsentIntent } from '@/lib/locationConsentIntent';
import { detectExactMapViewIntent } from '@/lib/exactMapViewIntent';
import { findLastMapOrQrToken } from '@/lib/offlinePrep';
import { describeAccuracy } from '@/lib/mapLinks';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const PURPLE = '#6C47FF';
const AGENT_NAME = 'm_care';
const GREETING = "I'm M-Safe, your Morales Super Agent. I'll get you from \"I want a procedure\" to a safely booked, monitored trip — and I'll never rush you past safety. What procedure are you considering, and where would you like to have it?";

// Public pages where all users should see visitor-facing tips
const PUBLIC_PATHS = new Set(['/', '/discover', '/providers', '/about', '/procedures', '/how-it-works', '/partners']);

// ── Role detection (for contextual tips only — the agent serves everyone) ──
function detectRole(user, pathname) {
  if (PUBLIC_PATHS.has(pathname)) return 'visitor';
  if (!user) {
    if (pathname.startsWith('/portal/doctor'))   return 'doctor_portal';
    if (pathname.startsWith('/portal/travel'))   return 'travel_portal';
    if (pathname.startsWith('/portal/transfer')) return 'chauffeur_portal';
    return 'visitor';
  }
  if (['admin', 'platform_admin'].includes(user.role)) return 'admin';
  if (user.role === 'doctor')        return 'doctor';
  if (user.role === 'travel_agency') return 'travel_agency';
  if (user.role === 'companion')     return 'companion';
  if (user.role === 'taxi_service')  return 'chauffeur';
  return 'patient';
}

// Reference maps (translation key, not raw text) — resolved via t() inside the component.
const TIPS_KEYS = {
  visitor:          [{ e: '👋', key: 'guide.tips_visitor_welcome' }, { e: '🌍', key: 'guide.tips_visitor_planning' }, { e: '💡', key: 'guide.tips_visitor_offline' }],
  patient:          [{ e: '🗺️', key: 'guide.tips_walkthrough' }, { e: '🛡️', key: 'guide.tips_safety' }, { e: '🤝', key: 'guide.tips_handshake' }, { e: '✈️', key: 'guide.tips_patient_offline' }],
  doctor:           [{ e: '🔬', key: 'guide.tips_doctor_confirm' }, { e: '🤖', key: 'guide.tips_ai_extract' }, { e: '📍', key: 'guide.tips_clinic_loc' }],
  doctor_portal:    [{ e: '✅', key: 'guide.tips_doctor_portal_confirm' }, { e: '🤖', key: 'guide.tips_doctor_portal_ai' }, { e: '📍', key: 'guide.tips_doctor_portal_coords' }],
  travel_agency:    [{ e: '✈️', key: 'guide.tips_travel_agency_quote' }, { e: '🏨', key: 'guide.tips_travel_agency_hotel' }],
  travel_portal:    [{ e: '✈️', key: 'guide.tips_travel_portal_quote' }, { e: '🏨', key: 'guide.tips_travel_portal_hotel' }],
  companion:        [{ e: '💌', key: 'guide.tips_companion_offer' }, { e: '⭐', key: 'guide.tips_companion_score' }],
  chauffeur:        [{ e: '🚗', key: 'guide.tips_chauffeur_transfer' }, { e: '📍', key: 'guide.tips_chauffeur_code' }],
  chauffeur_portal: [{ e: '🚗', key: 'guide.tips_chauffeur_portal_code' }],
  admin:            [{ e: '🎛️', key: 'guide.tips_admin_controls' }, { e: '⏸️', key: 'guide.tips_admin_pause' }, { e: '🏆', key: 'guide.tips_admin_trust' }],
};

// ── Main component ────────────────────────────────────────────────────────────
export default function MCareOrb() {
  const { t, i18n }       = useTranslation();
  const { toast }         = useToast();
  const { user }          = useAuth();
  const { prefs, update: updatePrefs } = useMcarePreferences();
  // Proactive M-Care layer — polls JourneyEvent (real records a scheduled
  // function wrote, e.g. a departure-countdown milestone or journey
  // completion) for the patient's active case. Rendered as its own block
  // below, never merged into agentMessages state — that array is
  // wholesale-replaced by subscribeToConversation on every tick (see
  // voiceReplyAudioUrls' own comment below for the same hazard), which would
  // silently drop anything spliced into it that didn't come from the server.
  const { data: activeCaseRecord } = useActiveCaseRecord(user?.email);
  const { data: journeyEvents = [] } = useJourneyEvents(activeCaseRecord?.id);
  const [lastSeenJourneyEventsAt, setLastSeenJourneyEventsAt] = useState(0);
  const spokenJourneyEventIdsRef = useRef(new Set());

  // Persist "seen" state per case — without this, lastSeenJourneyEventsAt
  // resets to 0 on every page load/remount, so the unread dot would show
  // after almost any reload regardless of whether the patient already read
  // it. Scoped per case_id (not global) so a brand-new case's fresh events
  // are never masked by a stale timestamp from a previous, completed one.
  useEffect(() => {
    if (!activeCaseRecord?.id) return;
    try {
      const stored = localStorage.getItem(`morales_journey_events_seen_${activeCaseRecord.id}`);
      if (stored) setLastSeenJourneyEventsAt(Number(stored) || 0);
    } catch (_) { /* localStorage unavailable — falls back to in-memory only */ }
  }, [activeCaseRecord?.id]);

  const markJourneyEventsSeen = () => {
    const now = Date.now();
    setLastSeenJourneyEventsAt(now);
    if (activeCaseRecord?.id) {
      try { localStorage.setItem(`morales_journey_events_seen_${activeCaseRecord.id}`, String(now)); } catch (_) { /* non-fatal */ }
    }
  };
  const { pathname, search } = useLocation();
  const navigate          = useNavigate();
  const role              = detectRole(user, pathname);
  const tips              = (TIPS_KEYS[role] || TIPS_KEYS.visitor).map(({ e, key }) => ({ e, t: t(key) }));
  const isAuthenticated   = !!user;

  // Visitor/patient-only partner-signup shortcuts (existing partners/admins
  // have no reason to sign up again).
  const canBecomePartner = ['visitor', 'patient'].includes(role);

  const [tipIdx,     setTipIdx]     = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [open,       setOpen]       = useState(false);
  const [input,      setInput]      = useState('');
  // VoiceMessageRecorder (WhatsApp-style voice notes) has no onRecordingChange
  // equivalent to VoiceInputButton's, so nothing sets this true anymore — it
  // stays false and orbState/the mic-feedback-loop guard below fall through
  // harmlessly. Left in place rather than removed to avoid rippling into
  // orbState/effect logic that's out of scope for this swap.
  const [listening] = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [dismissed,  setDismissed]   = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [struggleHint, setStruggleHint] = useState(null);
  const [expanded,   setExpanded]   = useState(false);
  const [agentUploading, setAgentUploading] = useState(false);
  // Talk Mode — off by default, opt-in only. See the "Honest speaking pulse"
  // effect below: when off, behavior is byte-identical to before this was
  // added. { messageIndex, revealedWordCount, totalWordCount } while a
  // specific message is actively being spoken, else null.
  const [talkMode, setTalkMode] = useState(false);
  const [revealState, setRevealState] = useState(null);
  // A real, replayable audio URL for a spoken assistant reply, keyed by that
  // message's array index — set once speakTextNeural's onAudioUrl fires.
  // Deliberately NOT merged into the agentMessages array itself: that array
  // gets wholesale-replaced by subscribeToConversation on every server tick,
  // which would silently wipe out any field written directly onto a message
  // object there. This sibling map survives that. Reset per fresh journey.
  const [voiceReplyAudioUrls, setVoiceReplyAudioUrls] = useState({});
  // Conversational Mode — always-listening voice with barge-in, layered on
  // top of Talk Mode. Off by default; opt-in only. See conversationalMode.js
  // for why this is a client-side interaction layer, not a change to what
  // the agent generates. interruptedIntents is capped (see that file) — what
  // M-Care was cut off saying, surfaced as a dismissible chip, never
  // silently spliced back into the conversation.
  const [conversationalMode, setConversationalMode] = useState(false);
  const [conversationalListening, setConversationalListening] = useState(false);
  const [interruptedIntents, setInterruptedIntents] = useState([]);
  const [bargeInFlashToken, setBargeInFlashToken] = useState(0);
  // M-Care Voice & Privacy Ecosystem — user-controllable, persisted preferences
  // layered on top of the existing Talk/Conversational modes. Private Mode
  // pauses the user's solo check-in monitoring; responseLanguage drives the
  // recognition locale (and future TTS voice) so M-Care replies in the user's
  // language without a menu.
  const [privateMode, setPrivateMode] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState(null);
  const bottomRef = useRef(null);
  const vaultRef = useRef(null);
  const responseLanguageRef = useRef(null);

  // Refs mirroring frequently-changing state for use inside the continuous
  // recognition effect's callbacks, which must NOT restart the whole
  // SpeechRecognition session on every render — see the effect below.
  const speakingRef = useRef(false);
  const revealStateRef = useRef(null);
  const agentMessagesRef = useRef([]);
  const conversationalModeRef = useRef(false);
  const liveRef = useRef({});
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { revealStateRef.current = revealState; }, [revealState]);
  useEffect(() => { conversationalModeRef.current = conversationalMode; }, [conversationalMode]);

  // Auto-detected approximate location (IP-based by default, GPS only if the
  // traveler already granted it) — see src/lib/locationContext.js for why
  // this is attached once per mount rather than on every message.
  // prefs aliased to locationPrefs — `prefs` is already bound to
  // useMcarePreferences()'s object elsewhere in this file.
  const { bestLocation, gpsLocation, isLoading: locationLoading, requestGPS, gpsStatus, gpsErrorCode, prefs: locationPrefs } = useAutoLocation();
  const [showLocationGate, setShowLocationGate] = useState(false);
  // Session-lifetime only (not persisted) — a fresh page load always gets
  // one proactive ask, matching "M-Care should always know where the
  // traveler is," while a single open session never re-shows it once
  // the traveler has made a decision (Allow or Not now).
  const proactiveLocationAskShownRef = useRef(false);
  const locationContextSentRef = useRef(false);
  // sendAgentMessage's useCallback closure only sees bestLocation/locationLoading
  // as of whenever it was last recreated — these refs let the brief bounded
  // wait below (for the very first message of a session, when geolocation is
  // still in flight) see a location that resolves mid-wait, same "read the
  // latest value via a ref" pattern already used elsewhere in this file
  // (liveRef.current.sendAgentMessage and friends).
  const bestLocationRef = useRef(bestLocation);
  const locationLoadingRef = useRef(locationLoading);
  useEffect(() => { bestLocationRef.current = bestLocation; }, [bestLocation]);
  useEffect(() => { locationLoadingRef.current = locationLoading; }, [locationLoading]);
  // Raw GPS fix, unfiltered by the locationPaused preference bestLocation
  // applies — the Location-menu flow (below) reads this instead of
  // bestLocationRef so an explicit "send my current location" tap always
  // sees a just-obtained GPS fix, even when locationPaused is set (that
  // preference means "don't passively track me in the background," not
  // "hide a location I just explicitly asked you to get").
  const gpsLocationRef = useRef(gpsLocation);
  useEffect(() => { gpsLocationRef.current = gpsLocation; }, [gpsLocation]);
  // Mirrors gpsStatus for triggerGpsUpgrade's useCallback closure, which
  // only lists requestGPS in its deps — without this ref, a stale gpsStatus
  // would let the in-flight guard below miss a GPS request already running.
  const gpsStatusRef = useRef(gpsStatus);
  useEffect(() => { gpsStatusRef.current = gpsStatus; }, [gpsStatus]);
  // Holds the traveler's most recent real outgoing message text — the GPS
  // upgrade offer (see handleGpsUpgradeConfirm below) is always a direct
  // agent reply to that exact message, so this reliably identifies "the
  // question to redo" once precise GPS is granted, with no extra bookkeeping.
  const lastUserMessageRef = useRef('');
  // Set on a confirmed GPS-upgrade "Yes" tap; consumed by the gpsStatus
  // effect below once permission resolves (granted or not).
  const pendingGpsRetryQueryRef = useRef(null);
  // Set on a "Send my current location" tap when no GPS fix exists yet;
  // consumed by the same gpsStatus effect once permission resolves, sending
  // the real location pin instead of redoing a text question.
  const pendingLocationPinRef = useRef(false);
  // Set on a confirmed "show my exact location on Google Maps satellite"
  // request (detectExactMapViewIntent); consumed by the same gpsStatus
  // effect once permission resolves, sending a real satellite-map message
  // instead of redoing a text question or a plain location pin.
  const pendingExactMapViewRef = useRef(false);
  // Guards against a double-tap on either Location-menu choice ("Send my
  // current location" / "Share my live location") kicking off two
  // overlapping flows — set the instant a choice is tapped, cleared at every
  // real terminal point of whichever flow it dispatched to (sendLocationPin,
  // shareLiveLocationNow's success/catch, the denied/unavailable resolution,
  // or a superseding triggerGpsUpgrade call cancelling this flow outright).
  const locationChoiceInFlightRef = useRef(false);
  // Safety net for requestGPS() never resolving at all — the browser's own
  // { timeout: 10000 } only bounds acquisition time once permission is
  // already decided, not time spent waiting on an unanswered native
  // permission prompt (which can hang forever, e.g. behind a Permissions-
  // Policy restriction on a preview iframe). Cleared the moment the retry
  // effect below sees a real resolution.
  const gpsRequestTimeoutRef = useRef(null);

  const silenceTimerRef = useRef(null);
  const silenceNudgeCountRef = useRef(0);
  const ackedMessageIdsRef = useRef(new Set());
  const spokenAssistantIdsRef = useRef(new Set());
  const lastSeenAssistantRef = useRef({ index: -1 });
  // Guards the "Conversation mode stopped" toast so a blocked mic (common in
  // the preview iframe) can't stack a wall of identical red banners — one
  // honest notification per activation, then it stops repeating.
  const conversationalErrorShownRef = useRef(false);
  // Set true only when onUnrecoverableError below shuts Conversational Mode
  // off because of a network error (never a blocked/revoked mic) — cleared
  // by every path where the USER intentionally turns Conversational Mode
  // off, so a later reconnect only ever resumes a state the user actually
  // wanted, never overrides their own choice.
  const autoResumeConversationalRef = useRef(false);
  // Set true the moment a voice message is sent (see handleVoiceMessage
  // below) and consumed by the very next assistant reply's speak effect,
  // regardless of Talk Mode's current toggle state — a deterministic
  // "voice in -> voice out" guarantee for a hands-free/driving conversation,
  // rather than relying solely on Talk Mode having stuck on.
  const forceSpeakNextReplyRef = useRef(false);

  // A message can be claimed (spoken / acked) at most once, keyed by BOTH
  // its stable array position and its server id once assigned — id alone
  // isn't safe: an assistant message can first render with no id (a running
  // tool call) and gain a real id on a later subscription tick for that SAME
  // logical message, which would otherwise let it be processed twice under
  // what looks like a fresh key.
  const isClaimed = (ref, msgIndex, msg) =>
    ref.current.has(`idx:${msgIndex}`) || !!(msg.id && ref.current.has(msg.id));
  const claim = (ref, msgIndex, msg) => {
    ref.current.add(`idx:${msgIndex}`);
    if (msg.id) ref.current.add(msg.id);
  };

  // Any one-off spoken utterance that isn't driving a specific chat bubble's
  // word-reveal (a tool-call ack, the distress welfare prompt, a voice-mode
  // cue) must resolve whatever bubble reveal IS currently in flight the
  // instant it takes over the audio channel — speakTextNeural always calls
  // stopNeuralSpeech() first, killing that bubble's audio, but nothing else
  // ever told its MessageBubble the interruption happened. Left alone, that
  // bubble's revealUpTo stayed frozen at a partial word count (audio dead,
  // text stuck mid-sentence) until some unrelated, later revealState change
  // happened to clear it — the real mechanism behind "cuts off mid-speech,
  // rest just appears as text." This gives the interrupted bubble the same
  // graceful "reply's over, show the rest" treatment a genuine new-message
  // supersession already gets, right when the interruption happens.
  const speakAncillary = (text, opts) => {
    setRevealState(null);
    return speakTextNeural(text, { language: i18n.language, ...opts });
  };

  const clearSilenceNudge = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  };
  const clearGpsRequestTimeout = () => {
    if (gpsRequestTimeoutRef.current) { clearTimeout(gpsRequestTimeoutRef.current); gpsRequestTimeoutRef.current = null; }
  };
  const resetSilenceNudge = () => {
    clearSilenceNudge();
    silenceNudgeCountRef.current = 0;
  };
  // Re-armed after every assistant utterance finishes speaking (see the
  // speaking effects below) — fires a short spoken nudge if the mic then
  // hears nothing for SILENCE_NUDGE_MS, capped at MAX_SILENCE_NUDGES per gap
  // so it never nags indefinitely. Only ever reset by real recognized
  // speech, never by the recognition engine's own routine restarts.
  const armSilenceNudge = () => {
    clearSilenceNudge();
    if (!conversationalModeRef.current) return;
    if (silenceNudgeCountRef.current >= MAX_SILENCE_NUDGES) return;
    silenceTimerRef.current = setTimeout(() => {
      if (!conversationalModeRef.current || speakingRef.current) return;
      silenceNudgeCountRef.current += 1;
      // Appended like any other assistant turn — the existing speaking
      // effect below picks it up and speaks it (same pattern the Talk Mode
      // toggle confirmation already uses), so there's only one place that
      // ever calls speakText for a "grown" message.
      setAgentMessages(prev => [...prev, { role: 'assistant', content: SILENCE_NUDGE_TEXT }]);
    }, SILENCE_NUDGE_MS);
  };

  // Snapshot what M-Care was cut off saying into interruptedIntents, stop
  // its audio, and flash the orb — called the moment a real barge-in is
  // confirmed (see the recognition effect below), before the interrupting
  // utterance has even finished being recognized.
  const handleBargeIn = () => {
    stopAllSpeech();
    setSpeaking(false);
    const rs = revealStateRef.current;
    const msgs = agentMessagesRef.current;
    const interruptedMsg = rs ? msgs[rs.messageIndex] : null;
    if (interruptedMsg) {
      const fullText = extractSpeakableText(interruptedMsg.content);
      if (fullText) {
        setInterruptedIntents(prev => pushInterruptedIntent(prev, {
          id: `intent-${Date.now()}-${rs.messageIndex}`,
          messageIndex: rs.messageIndex,
          fullText,
          spokenWordCount: rs.revealedWordCount,
          totalWordCount: rs.totalWordCount,
        }));
      }
    }
    setRevealState(null);
    setBargeInFlashToken(t => t + 1);
  };

  // Sends the utterance that actually interrupted M-Care. "never_mind"
  // drops every pending topic; "correction" ("no wait, I meant...") drops
  // only the topic this exact barge-in just pushed — the user is
  // correcting themselves, not asking to revisit what M-Care was saying, so
  // there's nothing meaningful to hold onto (an older, unrelated pending
  // topic from an earlier interruption is untouched). "new_topic" (the
  // default) leaves the stack exactly as handleBargeIn() already left it.
  const handleInterruptionSend = (text) => {
    const classification = classifyInterruptionUtterance(text);
    if (classification === 'never_mind') {
      setInterruptedIntents(clearInterruptedIntents());
    } else if (classification === 'correction') {
      setInterruptedIntents(prev => prev.slice(0, -1));
    }
    setInput('');
    liveRef.current.sendAgentMessage?.(text);
  };

  const handleResumeIntent = (intent) => {
    setInterruptedIntents(prev => prev.filter(i => i.id !== intent.id));
    liveRef.current.sendAgentMessage?.(`Can you briefly finish explaining ${shortTopicLabel(intent.fullText)}?`);
  };
  const handleDismissIntent = (intent) => {
    setInterruptedIntents(prev => prev.filter(i => i.id !== intent.id));
  };

  // ── M-Care super-agent conversation (synced with base44/agents/m_care.jsonc) ──
  const [agentConversation, setAgentConversation] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentSending, setAgentSending] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);

  useEffect(() => { agentMessagesRef.current = agentMessages; }, [agentMessages]);
  useEffect(() => { responseLanguageRef.current = responseLanguage; }, [responseLanguage]);

  // Hydrate persisted preferences once per session so a returning user keeps
  // their Talk Mode, Private Mode, and language choices.
  const hydratedPrefsRef = useRef(false);
  useEffect(() => {
    if (hydratedPrefsRef.current) return;
    hydratedPrefsRef.current = true;
    if (prefs.talkMode) setTalkMode(true);
    setPrivateMode(!!prefs.privateMode);
    setResponseLanguage(prefs.responseLanguage || null);
    if (prefs.responseLanguage && i18n?.changeLanguage) {
      i18n.changeLanguage(prefs.responseLanguage).catch(() => {});
    }
  }, [prefs, i18n]);

  // Persist toggle changes back to the user profile (best-effort). The guard
  // stops the initial hydration from triggering a redundant write.
  useEffect(() => { if (hydratedPrefsRef.current) updatePrefs({ talkMode }); }, [talkMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (hydratedPrefsRef.current) updatePrefs({ privateMode }); }, [privateMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Private Mode pauses/resumes the user's active solo check-ins so the
  // existing runSilentSafetyEscalation engine genuinely stops watching them
  // (it already skips check-ins whose pause_until is in the future).
  const handlePrivateModeToggle = useCallback(async (paused) => {
    if (!user?.email) return;
    try {
      if (paused) {
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await base44.entities.SoloCheckIn.updateMany(
          { user_email: user.email, status: 'pending' },
          { $set: { pause_until: future } }
        );
      } else {
        await base44.entities.SoloCheckIn.updateMany(
          { user_email: user.email, status: 'pending' },
          { $unset: { pause_until: '' } }
        );
      }
    } catch { /* best-effort; the preference flag still reflects the user's intent */ }
  }, [user]);

  // Writes a voice-command action to the tamper-evident audit chain via the
  // existing logAuditEvent function. Best-effort and silent — a failed log
  // never blocks the command itself.
  const logVoiceCommand = useCallback((command) => {
    base44.functions.invoke('logAuditEvent', {
      event_type: 'mcare_stage_transition',
      resource_type: 'mcare_voice_command',
      details: { command_type: command.type, value: command.value },
    }).catch(() => {});
  }, []);

  // Silent Guardian: a heard distress signal is logged to the audit trail and
  // answered with a calm welfare check — never an automatic emergency dispatch,
  // because ambient recognition produces false positives. Debounced 30s so a
  // repeated re-recognition of the same utterance doesn't re-fire. The welfare
  // prompt itself now carries a real, deterministic confirm step (the
  // {{choices:...}} tap-button mechanism MessageBubble already renders for
  // every other closed-set question) — only an explicit "Yes" from the
  // traveler, never the LLM's own interpretation, is allowed to trigger a
  // real dispatch. See handleDistressConfirm below.
  const distressHandledAtRef = useRef(0);
  const handleDistressSignal = useCallback((signal, text) => {
    const now = Date.now();
    if (now - distressHandledAtRef.current < 30000) { resetSilenceNudge(); return; }
    distressHandledAtRef.current = now;
    const basePrompt = distressWelfarePrompt(signal);
    const prompt = `${basePrompt}\n\n{{choices:Yes — send help now|No, I'm okay}}`;
    setAgentMessages(prev => [...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: prompt, __distressConfirm: { signal, text } },
    ]);
    if (talkMode) speakAncillary(basePrompt, { rate: 0.9 });
    base44.functions.invoke('logAuditEvent', {
      event_type: 'mcare_stage_transition',
      resource_type: 'mcare_distress_signal',
      details: { category: signal.category, phrase: signal.phrase },
    }).catch(() => {});
    resetSilenceNudge();
  }, [talkMode]);
  // Keep the continuous-recognition effect able to reach the latest handler
  // without listing it as a dependency (same pattern as sendAgentMessage).
  useEffect(() => { liveRef.current.handleDistressSignal = handleDistressSignal; });

  // A confirmed "Yes" from the distress welfare-check above — the one place
  // this dispatch/alert pair is triggered from a deterministic client-side
  // confirmation rather than the agent's own judgment, same "client calls the
  // backend function directly" pattern SOSDropdown.jsx already uses for
  // triggerSOS. Fans out to both a real ride request and a real guardian
  // alert on one tap (the more protective default for someone who just
  // confirmed they need help) — never claims either succeeded beyond what
  // each call actually returned.
  const handleDistressConfirm = useCallback(async (choice, ctx) => {
    const confirmed = /^yes/i.test(choice);
    base44.functions.invoke('logAuditEvent', {
      event_type: 'mcare_stage_transition',
      resource_type: 'mcare_distress_confirm',
      details: { confirmed, category: ctx?.signal?.category },
    }).catch(() => {});

    if (!confirmed) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: "Okay — I'm here if that changes." }]);
      return;
    }

    const lat = bestLocation?.latitude ?? undefined;
    const lng = bestLocation?.longitude ?? undefined;
    const source = bestLocation?.source === 'gps' ? 'gps' : 'ip_geo';

    const [rideOutcome, guardianOutcome] = await Promise.allSettled([
      base44.functions.invoke('requestOnDemandRide', {
        case_id: activeCaseRecord?.id,
        pickup_latitude: lat,
        pickup_longitude: lng,
        pickup_location_source: source,
        notes: `Distress signal (${ctx?.signal?.category || 'unknown'}): "${ctx?.text || ''}"`,
      }),
      activeCaseRecord?.id
        ? base44.functions.invoke('notifyGuardianNow', {
            case_id: activeCaseRecord.id,
            latitude: lat,
            longitude: lng,
            is_confirmed_emergency: true,
            message_context: 'traveler confirmed a distress signal in M-Care',
          })
        : Promise.resolve(null),
    ]);

    const rideOk = rideOutcome.status === 'fulfilled' && !rideOutcome.value?.data?.error;
    const guardianOk = guardianOutcome.status === 'fulfilled' && guardianOutcome.value && !guardianOutcome.value?.data?.error;
    let reply;
    if (rideOk && guardianOk) {
      reply = "I've requested a driver for you and let your guardian know — I'll keep you updated.";
    } else if (rideOk) {
      reply = "I've requested a driver for you. I wasn't able to reach your guardian right now, but I've flagged it.";
    } else if (guardianOk) {
      reply = "I've let your guardian know. I wasn't able to line up a driver right now, but I've flagged it for the team.";
    } else {
      reply = "I'm having trouble reaching help right now. Please try again, or use the SOS option if this is urgent.";
    }
    setAgentMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    if (talkMode) speakAncillary(reply, { rate: 0.9 });
  }, [bestLocation, activeCaseRecord, talkMode]);

  // A confirmed "Yes" on the agent's own narrated surrounding-awareness
  // offer ({{choices:...}} tap, matched on the exact literal choice text in
  // the render loop below) — same discipline as handleDistressConfirm: a
  // passively-inferred trigger (the traveler just mentioning they're
  // somewhere unfamiliar) must never arm anything without an explicit human
  // tap. armSurroundingAwareness (src/lib/surroundingAwareness.js) is a
  // synchronous, instant call — it just flips the same real, already-armed
  // background engine (useSurroundingAwareness.js) the /nearby settings
  // panel's own toggle uses, so there's nothing to await here.
  const handleSurroundingAwarenessConfirm = useCallback((choice) => {
    const confirmed = /^yes/i.test(choice);
    if (!confirmed) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: "No problem — just ask any time if you change your mind." }]);
      return;
    }
    armSurroundingAwareness();
    const resultText = "Done — I'll keep an eye on your surroundings and let you know if I spot something useful nearby.";
    setAgentMessages(prev => [...prev, { role: 'assistant', content: resultText }]);
    if (talkMode) speakAncillary(resultText, { rate: 0.9 });
  }, [talkMode]);

  // Requests a real precise-location upgrade — never something the agent
  // can trigger itself, only a real client-side action reachable from
  // either a confirmed choice tap or a directly-typed request (both gated
  // by detectLocationConsentIntent, see sendAgentMessage and the onChoice
  // router below). Stashes the question to redo (retryQuery) and calls
  // requestGPS(); the gpsStatus effect below redoes that question
  // automatically once permission resolves, so the traveler never has to
  // ask twice.
  const triggerGpsUpgrade = useCallback((retryQuery) => {
     // Guard against the infinite loop: if a GPS request is already in
     // flight (gpsStatus is still 'requesting' from a prior call that
     // hasn't resolved yet), don't add another "Getting your exact
     // location now" bubble or restart the 15s safety-net timeout — both
     // of which would otherwise fire on every repeated typed message,
     // resetting the timeout so it never fires and leaving the traveler
     // stuck in a loop of identical bubbles. requestGPS() is a no-op
     // while gpsInFlight is true anyway. Just update the pending query
     // (in case the user rephrased) and return early.
     const gpsAlreadyRequesting = gpsStatusRef.current === 'requesting';
     pendingGpsRetryQueryRef.current = retryQuery || null;
     if (gpsAlreadyRequesting) {
       // Same "newest request wins" mutual exclusion as the non-early-return
       // path below — a fresh typed question is the real, current intent
       // even when it happens to arrive while an earlier GPS request (a
       // location pin, or an exact-map-view request) is still in flight.
       // Without this, the OLDER pending flow would still win when GPS
       // resolves, silently dropping what the traveler just asked for.
       pendingLocationPinRef.current = false;
       pendingExactMapViewRef.current = false;
       // If the 15s safety net already fired (gpsRequestTimeoutRef is
       // null), GPS is genuinely stuck — help the traveler move forward
       // instead of looping silently.
       if (!gpsRequestTimeoutRef.current) {
         setAgentMessages(prev => [...prev, {
           role: 'assistant',
           content: "Your browser still hasn't responded to the location request — it may be blocked in this view. Try opening the app on your phone, or tell me a nearby street or landmark and I'll pin that instead.",
         }]);
       }
       return;
     }
     // A fresh typed-question GPS request supersedes any still-pending
    // Location-menu "send my current location" flow (the newest tap is the
    // real, current intent) — without this, both a location pin AND the
    // stale retried question can fire once GPS resolves. Release the
    // in-flight guard too so a superseded flow doesn't leave the Location
    // menu's choices permanently unable to be retapped.
    pendingLocationPinRef.current = false;
    // Same mutual-exclusion reasoning against the third GPS-triggered flow
    // (a satellite-Google-Maps request) — the newest typed request wins.
    pendingExactMapViewRef.current = false;
    locationChoiceInFlightRef.current = false;
    setAgentMessages(prev => [...prev, { role: 'assistant', content: "Getting your exact location now — one moment..." }]);
    // force=true: this only ever fires from a real, explicit, freshly-given
    // request (a confirmed GPS-consent choice tap or a directly-typed
    // request) — it must never be silently vetoed by locationPaused, a flag
    // meant for passive background tracking on a completely different page
    // (Emergency Hub), not for an explicit request the traveler just made.
    requestGPS(true);
    // Safety net: requestGPS()'s own { timeout: 10000 } doesn't cover an
    // unanswered native permission prompt (that's not "acquisition" yet),
    // so gpsStatus can sit at 'requesting' forever with nothing to resolve
    // it. 15s gives the browser's own timeout room to fire first; if
    // nothing has happened by then, give up honestly instead of leaving
    // "Getting your exact location now" as the last thing anyone ever sees.
    clearGpsRequestTimeout();
    gpsRequestTimeoutRef.current = setTimeout(() => {
      gpsRequestTimeoutRef.current = null;
      if (!pendingGpsRetryQueryRef.current) return;
      pendingGpsRetryQueryRef.current = null;
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm still waiting on your browser to respond to the location request — if you see a permission prompt, tap Allow. I'll keep using your approximate area for now; just ask again anytime.",
      }]);
    }, 15000);
  }, [requestGPS]);

  // Called only when the tapped choice text itself matched
  // detectLocationConsentIntent (see the onChoice router below) — by
  // construction this is always a real "yes, use my exact location" tap,
  // never a decline. A decline ("No, that's fine") or an unrelated option
  // never matches that intent check and falls through to sendAgentMessage
  // instead, letting the agent continue the conversation naturally.
  const handleGpsUpgradeConfirm = useCallback((choice) => {
    triggerGpsUpgrade(lastUserMessageRef.current || choice);
  }, [triggerGpsUpgrade]);

  // Sends the real satellite-map message once a fresh GPS fix exists for a
  // confirmed "show my exact location on Google Maps" request. Same
  // liveRef.current.sendAgentMessage TDZ-avoidance as sendLocationPin.
  // Reads the raw GPS fix (gpsLocationRef), never bestLocationRef or IP —
  // "exact location" must always mean real device GPS, never an
  // ISP-registered approximate point. Called only from the gpsStatus
  // effect below, which already clears pendingExactMapViewRef first.
  const sendExactLocationMapMessage = useCallback(() => {
    const loc = gpsLocationRef.current;
    if (!loc || loc.source !== 'gps' || loc.latitude == null || loc.longitude == null) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: "I wasn't able to get your exact location, so I couldn't open it on the map. Feel free to try again." }]);
      return;
    }
    const label = loc.resolved_place ? `My Location (${loc.resolved_place})` : 'My Location';
    const accuracyLine = describeAccuracy(loc.accuracy_meters);
    // A real Google Maps display page needs a live network round-trip to
    // actually open — never claim it opened while offline. The paired
    // {{qr:...}} token still gives a real, offline-capable artifact
    // (buildOfflineGeoUri) either way.
    const openedLine = isOnline
      ? "I've opened it in Google Maps in satellite view."
      : "I can't open Google Maps right now since you're offline — here's a QR code that works without a connection instead.";
    liveRef.current.sendAgentMessage?.(
      `Got your device location.\n${accuracyLine}\n${openedLine}\n{{satmap:${label}|${loc.latitude},${loc.longitude}}}\n{{qr:${label}|${loc.latitude},${loc.longitude}}}`,
      []
    );
  }, [isOnline]);

  // Requests a fresh, deterministic satellite Google Maps view of the
  // traveler's exact device location — the narrower sibling of
  // triggerGpsUpgrade, gated by detectExactMapViewIntent so it only ever
  // intercepts a request that specifically names Google Maps/satellite,
  // never the broader "exact location" phrasing (see sendAgentMessage).
  // Always forces a brand-new GPS fix (maximumAge: 0) — a "map my exact
  // location right now" request must never silently reuse a fix from
  // minutes ago, unlike the other two flows' fresh-fix fast paths.
  const triggerExactMapView = useCallback(() => {
    // Same duplicate-bubble guard triggerGpsUpgrade uses: a GPS request
    // already in flight makes requestGPS() itself a no-op, so don't also
    // post a second "I'll get your..." bubble or restart the 15s timeout.
    // Known, narrow edge case: if GPS was already in flight from a
    // DIFFERENT flow (started with the default cached-fix window, not this
    // flow's own maximumAge:0), the fix this request ends up using may not
    // be a freshly-forced one — accepted rather than adding a second
    // in-flight-request-priority system on top of the existing reentrancy
    // guard for what should be a rare few-second overlap.
    const gpsAlreadyRequesting = gpsStatusRef.current === 'requesting';
    pendingExactMapViewRef.current = true;
    if (gpsAlreadyRequesting) {
      pendingGpsRetryQueryRef.current = null;
      pendingLocationPinRef.current = false;
      if (!gpsRequestTimeoutRef.current) {
        setAgentMessages(prev => [...prev, {
          role: 'assistant',
          content: "Your browser still hasn't responded to the location request — it may be blocked in this view. Try opening the app on your phone, or tell me a nearby street or landmark instead.",
        }]);
      }
      return;
    }
    // Mutual exclusion against the other two GPS-triggered flows — the
    // newest request wins, matching triggerGpsUpgrade/shareCurrentLocationNow's
    // own established pattern.
    pendingGpsRetryQueryRef.current = null;
    pendingLocationPinRef.current = false;
    locationChoiceInFlightRef.current = false;
    setAgentMessages(prev => [...prev, { role: 'assistant', content: "I'll get your current device location and open it in Google Maps." }]);
    requestGPS(true, { maximumAge: 0 });
    clearGpsRequestTimeout();
    gpsRequestTimeoutRef.current = setTimeout(() => {
      gpsRequestTimeoutRef.current = null;
      if (!pendingExactMapViewRef.current) return;
      pendingExactMapViewRef.current = false;
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm still waiting on your browser to respond to the location request — if you see a permission prompt, tap Allow, then ask me again to show your location on Google Maps.",
      }]);
    }, 15000);
  }, [requestGPS]);

  // "Location" tap in the attachment menu — offers the two real, already-built
  // location-share capabilities (a one-time pin vs. a real streaming link),
  // matching the native share-sheet pattern Portia referenced. This is a
  // locally-synthesized prompt, never routed through the real agent — same
  // discipline as handleDistressSignal's own synthetic confirm chip.
  const handleLocationMenuClick = useCallback(() => {
    setAgentMessages(prev => [...prev, {
      role: 'assistant',
      content: "Sure — what would you like to do?\n\n{{choices:Send my current location|Share my live location}}",
      __locationShareChoice: true,
    }]);
  }, []);

  // Sends the real location-pin message once a real GPS fix exists. Reuses
  // sendAgentMessage's own [[LOCATION_CONTEXT: ...]] auto-attach (it always
  // attaches once GPS is granted, see the hasGps check inside it) so the
  // agent gets grounded coordinates for free, alongside a real tappable
  // {{maps:...}} button the traveler sees in their own bubble.
  const sendLocationPin = useCallback(() => {
    // This is the real terminal point for the Location-menu "send my current
    // location" flow, whichever path reached it — release the double-tap
    // guard here regardless of outcome.
    locationChoiceInFlightRef.current = false;
    // Reads the raw GPS fix, not bestLocationRef — bestLocation is filtered
    // by locationPaused (a "don't passively track me" preference), which
    // would otherwise make this show a false "I couldn't get your location"
    // even when GPS was just explicitly granted and a fix was really obtained.
    const loc = gpsLocationRef.current;
    if (!loc || loc.source !== 'gps' || loc.latitude == null || loc.longitude == null) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: "I wasn't able to get your exact location, so I couldn't share a pin. Feel free to try again." }]);
      return;
    }
    const label = loc.resolved_place ? `My Location (${loc.resolved_place})` : 'My Location';
    // liveRef.current.sendAgentMessage — sendAgentMessage is declared further
    // down in this component, so referencing it directly here (or in the deps
    // array) throws a TDZ "Cannot access 'sendAgentMessage' before
    // initialization" at render. Same ref-indirection pattern
    // handleResumeIntent / handleInterruptionSend already use.
    // Always pair the {{maps:...}} button row with a {{qr:...}} code — some
    // travelers (or whoever they hand navigation to) won't have a data
    // connection to tap the buttons; InlineQrBlock (MessageBubble.jsx)
    // encodes it as a real, offline-capable geo: URI since real coordinates
    // are always available here.
    liveRef.current.sendAgentMessage?.(`Here's my current location.\n{{maps:${label}|${loc.latitude},${loc.longitude}}}\n{{qr:${label}|${loc.latitude},${loc.longitude}}}`, []);
  }, []);

  // "Send my current location" — reuses triggerGpsUpgrade's exact
  // wait-for-GPS/15s-safety-net shape, but sends a location pin once granted
  // instead of redoing a text question.
  const shareCurrentLocationNow = useCallback(() => {
    // gpsLocationRef, not bestLocationRef — bestLocation is filtered by
    // locationPaused, which would otherwise make this fast path never fire
    // (redundantly re-requesting GPS every time) whenever background
    // tracking happens to be paused, even with a perfectly good fresh fix.
    const hasFreshGps = gpsLocationRef.current?.latitude != null && gpsLocationRef.current?.longitude != null;
    if (hasFreshGps) {
      if (agentSending) {
        // sendAgentMessage (inside sendLocationPin) silently drops a send
        // while the agent is mid-reply — queue it via the same pending-ref
        // mechanism the "still acquiring GPS" branch below uses instead of
        // letting the tap silently do nothing. The gpsStatus effect already
        // re-runs when agentSending flips back to false.
        pendingLocationPinRef.current = true;
        pendingGpsRetryQueryRef.current = null;
        pendingExactMapViewRef.current = false;
        setAgentMessages(prev => [...prev, { role: 'assistant', content: "One moment — I'll send your location as soon as I'm done here." }]);
        return;
      }
      sendLocationPin();
      return;
    }
    pendingLocationPinRef.current = true;
    // A fresh "send my current location" tap supersedes any still-pending
    // typed-question GPS retry (see triggerGpsUpgrade's matching clear) —
    // the newest tap is the real, current intent, so only one flow should
    // ever resolve once GPS answers.
    pendingGpsRetryQueryRef.current = null;
    pendingExactMapViewRef.current = false;
    setAgentMessages(prev => [...prev, { role: 'assistant', content: "Getting your exact location now — one moment..." }]);
    requestGPS(true);
    clearGpsRequestTimeout();
    gpsRequestTimeoutRef.current = setTimeout(() => {
      gpsRequestTimeoutRef.current = null;
      if (!pendingLocationPinRef.current) return;
      pendingLocationPinRef.current = false;
      locationChoiceInFlightRef.current = false;
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm still waiting on your browser to respond to the location request — if you see a permission prompt, tap Allow, then try sharing your location again.",
      }]);
    }, 15000);
  }, [requestGPS, sendLocationPin, agentSending]);

  // "Share my live location" — a real, revocable streaming link. Direct
  // client call to a real, already-built, already-agent-granted function,
  // bypassing the agent for this real-time user-initiated tap — the same
  // precedent handleDistressConfirm already established for
  // requestOnDemandRide/notifyGuardianNow.
  const shareLiveLocationNow = useCallback(async () => {
    // A live-location link is tied to a real case (that's who the stream is
    // for) — check client-side before the round trip instead of relying
    // solely on the backend, which would otherwise still succeed but create
    // a real link attached to nothing a care team could ever see.
    if (!activeCaseRecord?.id) {
      locationChoiceInFlightRef.current = false;
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "You'll need an active journey for a live-location link — once your case is set up, I can create one anytime.",
      }]);
      return;
    }
    try {
      const res = await base44.functions.invoke('generateLiveLocationRequestLink', {
        case_id: activeCaseRecord.id,
        reason: 'Traveler chose to share their live location from M-Care chat.',
      });
      const data = res?.data;
      if (!data?.url) throw new Error('no url returned');
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: `Here's your live-location link — open it to start sharing, and you can stop anytime from that same page.\n{{sharelink:Open Live-Location Link|${data.url}}}`,
      }]);
    } catch (e) {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: friendlyError(e, "I couldn't set up a live-location link right now — please try again in a moment.", 'MCareOrb'),
      }]);
    } finally {
      locationChoiceInFlightRef.current = false;
    }
  }, [activeCaseRecord]);

  const handleLocationShareChoice = useCallback((choice) => {
    // Blocks a double-tap on either choice from kicking off two overlapping
    // flows (each would otherwise independently start its own GPS request or
    // create its own live-location link). Released at whichever flow's real
    // terminal point is reached (sendLocationPin, shareLiveLocationNow's
    // finally, the denied/unavailable resolution, or a superseding
    // triggerGpsUpgrade call).
    if (locationChoiceInFlightRef.current) return;
    locationChoiceInFlightRef.current = true;
    if (choice === 'Send my current location') shareCurrentLocationNow();
    else if (choice === 'Share my live location') shareLiveLocationNow();
    else locationChoiceInFlightRef.current = false;
  }, [shareCurrentLocationNow, shareLiveLocationNow]);

  // Load the user's existing M-Care conversation when they first open the orb.
  useEffect(() => {
    if (!open || !isAuthenticated || agentConversation || agentLoading) return;
    let mounted = true;
    setAgentLoading(true);
    base44.agents.listConversations({ agent_name: AGENT_NAME })
      .then(convos => {
        if (!mounted) return;
        if (convos && convos.length > 0) {
          setAgentConversation(convos[0]);
          setAgentMessages(convos[0].messages || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setAgentLoading(false); });
    return () => { mounted = false; };
  }, [open, isAuthenticated, agentConversation, agentLoading]);

  // Proactively ask for precise location the moment M-Care opens, rather
  // than only reactively after a wrong IP-approximate answer or waiting for
  // the traveler to ask for it themselves — "M-Care should always know
  // where the traveler is," not just sometimes. Only fires when there is
  // no real GPS decision on record yet: gpsStatus === 'idle' means neither
  // this session's own attempts nor a prior session's silent on-mount
  // refresh (useAutoLocation.js) has resolved one way or the other, and
  // locationPrefs.gpsGranted !== false means we've never recorded a real
  // denial/failure — the browser won't re-prompt after an actual deny, so
  // showing this dialog again would just be friction with no possible
  // different outcome. Same explicit-tap-required discipline as
  // MicPermissionGate.jsx: this only shows a dialog; the real
  // navigator.geolocation call happens inside the "Allow" tap itself.
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    if (proactiveLocationAskShownRef.current) return;
    if (gpsStatus !== 'idle') return;
    if (locationPrefs.gpsGranted === false || locationPrefs.locationPaused) return;
    proactiveLocationAskShownRef.current = true;
    setShowLocationGate(true);
  }, [open, isAuthenticated, gpsStatus, locationPrefs.gpsGranted, locationPrefs.locationPaused]);

  // Subscribe to the active conversation — streamed agent turns + tool calls
  // arrive in real time; JourneyStageTracker derives stage from these.
  // Only clear the "sending" spinner once the agent has actually produced a
  // reply (an assistant message after the user's last one). The subscription
  // can fire with just the user message before the agent processes — clearing
  // the spinner at that point leaves the user staring at a blank chat with no
  // loading indicator, which looks exactly like a broken agent.
  useEffect(() => {
    if (!agentConversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(
      agentConversation.id,
      (data) => {
        const msgs = data.messages || [];
        setAgentMessages(msgs);
        // Clear sending only when the latest message is from the assistant
        // (the agent has replied) — not when it's still just the user's turn.
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          setAgentSending(false);
        }
      }
    );
    return () => unsubscribe();
  }, [agentConversation]);

  // Safety-net re-fetch: if the agent hasn't replied within 12 seconds of
  // sending, pull the conversation messages directly. The subscription can
  // occasionally miss the agent's turn (race on conversation creation, dropped
  // event); this catches a missed reply instead of leaving the chat blank.
  useEffect(() => {
    if (!agentSending || !agentConversation) return;
    const timer = setTimeout(async () => {
      try {
        const convo = await base44.agents.getConversation(agentConversation.id);
        if (convo?.messages) {
          setAgentMessages(convo.messages);
          const last = convo.messages[convo.messages.length - 1];
          if (last && last.role === 'assistant') setAgentSending(false);
        }
      } catch (_) { /* subscription will still fire if it recovers */ }
    }, 12000);
    return () => clearTimeout(timer);
  }, [agentSending, agentConversation]);

  // Last-resort timeout: if 40 seconds pass with no assistant reply, stop
  // spinning and surface an honest fallback so the user isn't left waiting
  // forever on a silent failure.
  useEffect(() => {
    if (!agentSending) return;
    const timer = setTimeout(() => {
      setAgentSending(false);
      setAgentMessages(prev => {
        const alreadyFellBack = prev.some(m => m.role === 'assistant' && m.content?.includes("I'm having trouble connecting right now"));
        if (alreadyFellBack) return prev;
        return [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting right now — I haven't gone anywhere. Give me a moment and send your message again, or tap the refresh button above to start a fresh session.",
        }];
      });
    }, 40000);
    return () => clearTimeout(timer);
  }, [agentSending]);

  // Struggle hint listener (unchanged presence-layer behavior)
  useEffect(() => {
    const onHint = (e) => {
      if (open) return;
      setStruggleHint({ e: e.detail?.emoji || '💡', t: e.detail?.text || '' });
      setDismissed(false);
      setShowBubble(true);
    };
    window.addEventListener(STRUGGLE_HINT_EVENT, onHint);
    return () => window.removeEventListener(STRUGGLE_HINT_EVENT, onHint);
  }, [open]);

  useEffect(() => { setStruggleHint(null); }, [pathname]);

  const isHomepage = pathname === '/';
  const [pastHero, setPastHero] = useState(!isHomepage);

  const [isCramped, setIsCramped] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 480px), (max-height: 820px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px), (max-height: 820px)');
    const onChange = () => setIsCramped(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const heroBlocksOrb = isHomepage && isCramped && !pastHero;

  useEffect(() => {
    if (!isHomepage) { setPastHero(true); return; }
    const check = () => { if (window.scrollY > window.innerHeight * 0.65) setPastHero(true); };
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [isHomepage]);

  const QUIET_ROUTES = [
    '/booking', '/intake', '/travel-intake', '/medical-intake',
    '/checkout', '/payment', '/passport-vault', '/vault',
    '/emergency', '/sos', '/safe-t',
  ];
  const isQuietRoute = QUIET_ROUTES.some(p => pathname.startsWith(p));

  // Deep-link auto-open — ?mcare=open on any public page opens the panel on
  // load with no click needed, for sharing a direct "land straight in the
  // chat" link (e.g. to buildathon judges) without requiring a login-gated
  // route. Fires at most once per page load (autoOpenedRef), so navigating
  // within the app afterward never re-forces the panel open. Skipped on a
  // quiet route — those pages deliberately suppress the orb regardless.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || isQuietRoute) return;
    if (new URLSearchParams(search).get('mcare') === 'open') {
      autoOpenedRef.current = true;
      setOpen(true);
      setDismissed(true);
      setStruggleHint(null);
      markJourneyEventsSeen();
    }
  }, [search, isQuietRoute]);

  // A repeatable, click-anywhere way to open M-Care — the "Talk to M-Care"
  // navbar button and the How It Works page CTA both dispatch this instead
  // of the ?mcare=open deep-link, which only fires once per page load.
  // Mirrors the exact same open sequence the floating orb button itself uses.
  useEffect(() => {
    const onOpenRequest = (e) => {
      setOpen(true);
      setDismissed(true);
      setStruggleHint(null);
      markJourneyEventsSeen();
      // Same "read the freshest handler via a ref, never list it as a
      // dependency" pattern this file already uses for every other
      // cross-cutting caller (handleResumeIntent, the distress-signal
      // handler, the continuous-recognition callback).
      const starterMessage = e?.detail?.starterMessage;
      if (starterMessage) liveRef.current.sendAgentMessage?.(starterMessage);
    };
    window.addEventListener(MCARE_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(MCARE_OPEN_EVENT, onOpenRequest);
  }, []);

  useEffect(() => {
    if (!pastHero || isQuietRoute) return;
    const timer = setTimeout(() => setShowBubble(true), 8000);
    return () => clearTimeout(timer);
  }, [pastHero, isQuietRoute]);

  useEffect(() => {
    const up = () => {
      setIsOnline(true);
      // A network-caused Conversational Mode shutoff resumes on its own
      // once the connection actually returns — see onUnrecoverableError
      // below. Never fires for a shutoff the user chose themselves (every
      // manual "turn it off" path clears this flag).
      if (autoResumeConversationalRef.current) {
        autoResumeConversationalRef.current = false;
        setConversationalMode(true);
      }
    };
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const MAX_TIP_ROTATIONS = 3;
  useEffect(() => {
    if (open || dismissed || isQuietRoute || struggleHint) return;
    if (tipIdx >= MAX_TIP_ROTATIONS - 1 || tipIdx >= tips.length - 1) return;
    const id = setTimeout(() => {
      setShowBubble(false);
      setTimeout(() => { setTipIdx(i => i + 1); setShowBubble(true); }, 300);
    }, 6000);
    return () => clearTimeout(id);
  }, [open, dismissed, isQuietRoute, struggleHint, tipIdx, tips.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, journeyEvents]);

  // Speaking state right after a new assistant message lands. When Talk Mode
  // is off (default), this is byte-identical to the original honest fake
  // pulse — a fixed 1800ms timer, no audio, since there's no real TTS signal
  // to react to. When Talk Mode is on, real speechSynthesis audio drives
  // both the pulse AND a word-by-word reveal of that one message.
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (agentMessages.length > prevMsgCountRef.current) {
      const last = agentMessages[agentMessages.length - 1];
      if (last?.role === 'assistant') {
        const msgIndex = agentMessages.length - 1;
        prevMsgCountRef.current = agentMessages.length;

        // Guard against double-speaking the same message — Conversational
        // Mode's own effect (below) can also speak a message that first
        // arrived via an in-place socket update rather than array growth;
        // whichever path sees it first "claims" it via this shared ref.
        if (isClaimed(spokenAssistantIdsRef, msgIndex, last)) return;

        if (talkMode || forceSpeakNextReplyRef.current) {
          const speakable = extractSpeakableText(last.content);
          if (!speakable) {
            // A tool-call placeholder (no content yet) — leave the flag
            // armed and this message unclaimed so the id-replace effect
            // below can still catch it once real content actually fills
            // in. Consuming the flag here would silently strand any
            // voice-note reply that involves a tool call, since Base44
            // delivers that fill-in via an in-place update to this same
            // message id, not array growth, and this effect never re-fires
            // for an unchanged array length.
            setSpeaking(false);
            return;
          }
          // Consumed only now — once we know this occurrence actually has
          // content to speak. Still only ever overrides the ONE reply that
          // follows a voice message, never lingers onto a later one.
          forceSpeakNextReplyRef.current = false;
          const totalWords = speakable.split(/\s+/).filter(Boolean).length;
          claim(spokenAssistantIdsRef, msgIndex, last);
          setRevealState({ messageIndex: msgIndex, revealedWordCount: 0, totalWordCount: totalWords });
          setSpeaking(true);
          speakTextNeural(speakable, {
            rate: 0.9,
            language: i18n.language,
            onWordBoundary: (count) => setRevealState(prev =>
              (prev && prev.messageIndex === msgIndex) ? { ...prev, revealedWordCount: count } : prev),
            onAudioUrl: (url) => setVoiceReplyAudioUrls(prev => ({ ...prev, [msgIndex]: url })),
            onEnd: () => {
              setSpeaking(false);
              setRevealState(prev => (prev && prev.messageIndex === msgIndex) ? null : prev);
              armSilenceNudge();
            },
            onError: () => {
              // Fail open: never leave the demo stuck mid-reveal on a TTS
              // failure — snap straight to full text, no error surfaced.
              setSpeaking(false);
              setRevealState(prev => (prev && prev.messageIndex === msgIndex) ? null : prev);
            },
          });
          return;
        }

        // Talk Mode off — unchanged original behavior.
        setSpeaking(true);
        const id = setTimeout(() => setSpeaking(false), 1800);
        return () => clearTimeout(id);
      }
    }
    prevMsgCountRef.current = agentMessages.length;
  }, [agentMessages, talkMode]);

  // Proactive JourneyEvent narration — deliberately a separate, symmetric
  // effect rather than folding into the one above: it never touches
  // agentMessages, prevMsgCountRef, spokenAssistantIdsRef, or revealState, so
  // it carries zero risk to that already-fragile machinery. Dedup is by
  // JourneyEvent's own real, persistent Base44 id (robust by construction —
  // unlike agentMessages, this array is never wholesale-replaced with a
  // different set of ids). On first load, every event already on record is
  // marked seen WITHOUT being spoken — Talk Mode turning on shouldn't trigger
  // a backlog of old proactive messages being read aloud; only a genuinely
  // new one, arriving on a later poll, gets spoken.
  const journeyEventsInitializedRef = useRef(false);
  useEffect(() => {
    if (journeyEvents.length === 0) return;
    if (!journeyEventsInitializedRef.current) {
      journeyEvents.forEach(e => { if (e.id) spokenJourneyEventIdsRef.current.add(e.id); });
      journeyEventsInitializedRef.current = true;
      return;
    }
    if (!talkMode) return;
    const unseen = journeyEvents.filter(e => e.id && !spokenJourneyEventIdsRef.current.has(e.id));
    if (unseen.length === 0) return;
    // Oldest-unseen-first — a real event actually happened at that time;
    // never skip straight to the newest and silently drop an earlier one.
    const next = [...unseen].sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
    spokenJourneyEventIdsRef.current.add(next.id);
    speakAncillary(next.message_text, { rate: 0.9 });
  }, [journeyEvents, talkMode]);

  // Turning Talk Mode off stops audio, ends the mic/speech loop, and reveals
  // the rest of the current message instantly — never leaves it half-spoken.
  useEffect(() => {
    if (!talkMode) {
      stopAllSpeech();
      setRevealState(null);
      setConversationalMode(false);
    }
  }, [talkMode]);

  // Prevent a feedback loop: if the microphone is actively listening, any
  // in-progress Talk Mode speech would otherwise be picked up by the mic.
  useEffect(() => {
    if (listening) stopAllSpeech();
  }, [listening]);

  // Conversational Mode only: a real, observed tool call still running with
  // no answer text yet gets a spoken acknowledgment (reusing the same
  // display_projection.active_label already driving the visual spinner in
  // MessageBubble.jsx — never a fabricated filler unconnected to real
  // backend activity). This also covers a gap the length-based effect above
  // can't: if that message's final content later arrives via an in-place
  // socket update (same id, array length unchanged) rather than a new
  // array entry, the length-based effect never re-fires for it — so this
  // effect speaks it here instead, guarded by the same spokenAssistantIdsRef
  // so it's never spoken twice.
  useEffect(() => {
    // Also runs for a plain Talk Mode / forced voice-note reply, not just
    // Conversational Mode — handleVoiceMessage deliberately never turns
    // Conversational Mode on (output-only, to avoid a mic feedback loop),
    // so this was the one path a tool-call-involving voice-note reply could
    // never reach: forceSpeakNextReplyRef stays armed through the empty
    // placeholder (see the effect above) specifically so this effect can
    // pick up the real content once it fills in.
    const shouldTrack = conversationalMode || talkMode || forceSpeakNextReplyRef.current;
    if (!shouldTrack || agentMessages.length === 0) return;
    const msgIndex = agentMessages.length - 1;
    const last = agentMessages[msgIndex];
    if (!last || last.role !== 'assistant') return;
    const content = last.content || '';
    const runningTool = (last.tool_calls || []).find(tc =>
      ['pending', 'running', 'in_progress'].includes(String(tc.status || '').toLowerCase()));

    const isSameMessageAsLastSeen = lastSeenAssistantRef.current.index === msgIndex;
    lastSeenAssistantRef.current = { index: msgIndex };

    // Spoken "let me look that up" stays a Conversational-Mode (live call)
    // behavior only — deliberately not widened to Talk Mode.
    if (conversationalMode && runningTool && !content.trim() && !isClaimed(ackedMessageIdsRef, msgIndex, last)) {
      claim(ackedMessageIdsRef, msgIndex, last);
      const ackText = runningTool.display_projection?.active_label || 'Let me look that up.';
      speakAncillary(ackText, { rate: 0.9 });
      return;
    }

    if (isSameMessageAsLastSeen && content.trim() && !isClaimed(spokenAssistantIdsRef, msgIndex, last)) {
      claim(spokenAssistantIdsRef, msgIndex, last);
      // This occurrence is what actually speaks it — consume here too, in
      // case it was still armed (the growth effect deliberately leaves it
      // armed on a content-less placeholder).
      forceSpeakNextReplyRef.current = false;
      const speakable = extractSpeakableText(content);
      if (!speakable) return;
      const totalWords = speakable.split(/\s+/).filter(Boolean).length;
      setRevealState({ messageIndex: msgIndex, revealedWordCount: 0, totalWordCount: totalWords });
      setSpeaking(true);
      speakTextNeural(speakable, {
        rate: 0.9,
        language: i18n.language,
        onWordBoundary: (count) => setRevealState(prev =>
          (prev && prev.messageIndex === msgIndex) ? { ...prev, revealedWordCount: count } : prev),
        onAudioUrl: (url) => setVoiceReplyAudioUrls(prev => ({ ...prev, [msgIndex]: url })),
        onEnd: () => {
          setSpeaking(false);
          setRevealState(prev => (prev && prev.messageIndex === msgIndex) ? null : prev);
          armSilenceNudge();
        },
        onError: () => {
          setSpeaking(false);
          setRevealState(prev => (prev && prev.messageIndex === msgIndex) ? null : prev);
        },
      });
    }
  }, [agentMessages, conversationalMode, talkMode]);

  // Continuous listening + barge-in. Only runs while Conversational Mode is
  // on; the effect's own cleanup stops recognition cleanly when it's turned
  // off or the component unmounts. Deliberately depends on nothing but
  // conversationalMode — everything it needs from render state comes through
  // refs (see above), so toggling any OTHER piece of state never restarts
  // the SpeechRecognition session.
  useEffect(() => {
    if (!conversationalMode) return;

    // Fresh activation — allow one error toast again.
    conversationalErrorShownRef.current = false;

    // Tracks whether the mic picked up M-Care's own voice during the current
    // recognition segment. SpeechRecognition finalizes a transcript AFTER
    // the speaker goes silent — so by the time onFinal fires, speakingRef is
    // already false and the half-duplex guard below would let M-Care's own
    // reply through as a "user" message (M ends up talking to itself, the
    // exact loop in the screenshot). Marking the segment contaminated the
    // moment the mic hears M-Care, then dropping that final, closes the gap.
    let heardMcareDuringSegment = false;

    const stopRecognition = startContinuousRecognition({
      lang: recognitionLocaleFor(responseLanguageRef.current),
      onInterim: (text) => {
        // Half-duplex: while M-Care is speaking, ignore the mic entirely.
        // Without this, M's own voice is picked up by the always-on mic,
        // transcribed, and sent back as a user message — M ends up replying
        // to itself in a loop. isNeuralSpeaking() is a synchronous module
        // flag set the instant ANY of M-Care's audio paths start (auto-speak
        // reply, the running-tool ack, the voice-message cue, the distress
        // check) — the React `speaking` state alone is one render behind and
        // several paths never set it, which is how M-Care's own reply was
        // still leaking into the input field. The user simply waits for M
        // to finish, then speaks. Headphones would let us keep barge-in,
        // but on a phone speaker this is the only reliable choice.
        if (speakingRef.current || isNeuralSpeaking()) { heardMcareDuringSegment = true; return; }
        clearSilenceNudge();
        setInput(text);
      },
      onFinal: (text) => {
        // Drop any transcript the recognizer built up while M-Care was
        // speaking — onFinal lands AFTER M-Care goes silent, so the
        // speakingRef guard alone can't catch it. isNeuralSpeaking() closes
        // the gap for every audio path, not just the React-state-tracked one.
        const contaminated = heardMcareDuringSegment || speakingRef.current || isNeuralSpeaking();
        heardMcareDuringSegment = false;
        if (contaminated) return;
        clearSilenceNudge();
        setInput('');
        // Multilingual: if the user hasn't chosen a language, sense it from the
        // spoken words so future recognition + replies match. Two cue-hits are
        // required (see spokenLanguageDetect.js) to avoid a wrong lock-on.
        if (!responseLanguageRef.current) {
          const sensed = detectSpokenLanguage(text);
          if (sensed) {
            setResponseLanguage(sensed);
            updatePrefs({ responseLanguage: sensed });
          }
        }
        // Silent Guardian: scan the heard utterance for a distress signal
        // BEFORE treating it as a normal message. A hit logs to the audit
        // trail and offers a calm welfare check — never an auto-dispatch.
        const signal = detectDistressSignal(text);
        if (signal) {
          liveRef.current.handleDistressSignal?.(signal, text);
          return;
        }
        liveRef.current.sendAgentMessage?.(text);
        resetSilenceNudge();
      },
      onListeningChange: setConversationalListening,
      onUnrecoverableError: (reason) => {
        const blocked = String(reason || '').match(/not-allowed|service-not-allowed|security|mic/);
        // A network-caused shutoff should resume on its own once the
        // connection returns (see the 'online' listener effect above) —
        // anything else (mic blocked/revoked) needs the user to act.
        autoResumeConversationalRef.current = reason === 'network';
        setConversationalMode(false);
        // Talk Mode (spoken replies) stays on — only the always-on mic fails,
        // so the user keeps voice output and can still talk via the mic button.
        // Show the notification exactly once per activation to avoid stacking.
        if (conversationalErrorShownRef.current) return;
        conversationalErrorShownRef.current = true;
        toast({
          title: 'Voice input unavailable',
          description: blocked
            ? "Your microphone is blocked here (common in the preview). I'll keep speaking my replies aloud — tap the mic button to talk, or open the app on your phone."
            : friendlyError(
                { message: reason },
                "Voice conversation stopped unexpectedly — you can turn it back on, or keep using text and the mic button.",
                'MCareOrb'
              ),
          variant: 'destructive',
        });
      },
    });

    return () => {
      stopRecognition();
      clearSilenceNudge();
      silenceNudgeCountRef.current = 0;
      setConversationalListening(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationalMode]);

  // Closing the panel drops Conversational Mode too — the mic shouldn't
  // keep listening in the background once the chat isn't visible.
  useEffect(() => {
    if (!open) { autoResumeConversationalRef.current = false; setConversationalMode(false); }
  }, [open]);

  // True whenever a real JourneyEvent landed after the panel was last opened
  // — the honest way to satisfy "the user shouldn't have to send a message
  // first" without a literal push: they see a dot on the closed orb, open
  // it, and the proactive message is already waiting.
  const hasUnseenJourneyEvent = journeyEvents.some(e =>
    e.created_date && new Date(e.created_date).getTime() > lastSeenJourneyEventsAt);

  // The orb's state. `acting` is the autonomous-work signal: when M-Care has
  // done something on its own in the background (a JourneyEvent the user
  // hasn't seen — e.g. the driver no-show reroute fired), the orb shows a
  // deliberate, layered glow instead of going idle. It sits just above idle
  // in priority, so an active conversation (listening/thinking/speaking)
  // still wins — `acting` only surfaces when M-Care acted without the user
  // prompting anything, which is exactly the "super-agent" moment to confirm.
  const orbState = !isOnline
    ? 'error'
    : listening
      ? 'listening'
      : agentSending
        ? 'thinking'
        : speaking
          ? 'speaking'
          : (conversationalMode && conversationalListening)
            ? 'listening'
            : hasUnseenJourneyEvent
              ? 'acting'
              : 'idle';

  // Offline-prep: while offline, no new tool call can succeed anyway (no
  // network), so re-surface the most recent QR/maps token M-Care already
  // generated this session — a pure client-side re-render of real data the
  // app already has, never a fabricated placeholder. null when nothing was
  // ever generated, or while online (the banner only renders offline).
  const offlineArtifact = !isOnline ? findLastMapOrQrToken(agentMessages) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const paused = isSystemPaused();

  // Send a message to the real M-Care agent. Creates a conversation on first
  // send, then streams the agent's response + tool calls via the subscription.
  const sendAgentMessage = useCallback(async (displayText, fileUrls) => {
    const q = (displayText ?? input).trim();
    if ((!q && !fileUrls?.length) || agentSending) return;
    // Tracks the real question behind a GPS-upgrade offer (see
    // handleGpsUpgradeConfirm below) so it can be redone automatically once
    // precise location is granted — never overwritten by an empty/file-only send.
    if (q) lastUserMessageRef.current = q;

    // Sending any new message interrupts in-progress Talk Mode speech —
    // never let old audio keep playing over a new exchange.
    stopAllSpeech();
    setRevealState(null);

    // Silent Guardian: scan TYPED text for a distress signal too, not just
    // live Conversational Mode transcripts (that path already does this at
    // the recognition callback above) — a typed "help me" or "I can't
    // breathe" deserves the same calm welfare check as a spoken one, and
    // most users type rather than talk. Same discipline as the voice path:
    // a hit is handled entirely locally (audit log + welfare prompt) and
    // never reaches the real agent conversation, since sending a distress
    // cry to the booking/coordination agent as a normal question would be
    // the wrong response to it.
    if (!fileUrls?.length) {
      const distressSignal = detectDistressSignal(q);
      if (distressSignal) {
        setInput('');
        handleDistressSignal(distressSignal, q);
        return;
      }
    }

    // Deterministic, client-side Voice & Privacy command layer — exact-phrase
    // match only (see voiceCommands.js), so a genuine question is never
    // mistaken for a mode command. Covers Talk Mode, Private Mode, modality,
    // always-listen, and language. Never reaches the real agent conversation.
    if (!fileUrls?.length) {
      const command = parseMcareCommand(q);
      if (command) {
        setInput('');
        const confirm = command.confirmText;
        setAgentMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: confirm }]);
        // Speak the confirmation when voice output is (or will be) on.
        const willSpeak = (command.type === 'talk_mode' || command.type === 'modality')
          ? (command.value === 'on' || command.value === 'voice')
          : (talkMode || (command.type === 'always_listen' && command.value === 'on'));
        if (command.type === 'talk_mode') {
          setTalkMode(command.value === 'on');
        } else if (command.type === 'modality') {
          setTalkMode(command.value === 'voice');
        } else if (command.type === 'always_listen') {
          if (command.value === 'on') { setTalkMode(true); setConversationalMode(true); }
          else { autoResumeConversationalRef.current = false; setConversationalMode(false); }
        } else if (command.type === 'private_mode') {
          setPrivateMode(command.value === 'on');
          updatePrefs({ privateMode: command.value === 'on' });
          handlePrivateModeToggle(command.value === 'on');
        } else if (command.type === 'language' && command.value) {
          setResponseLanguage(command.value);
          updatePrefs({ responseLanguage: command.value });
          if (i18n?.changeLanguage) i18n.changeLanguage(command.value).catch(() => {});
        } else if (command.type === 'surrounding_awareness') {
          if (command.value === 'off') disarmSurroundingAwareness();
          else armSurroundingAwareness();
        }
        logVoiceCommand(command);
        if (willSpeak) speakTextNeural(confirm, { rate: 0.9, language: i18n.language });
        return;
      }
    }

    // A direct typed request specifically for a Google Maps / satellite
    // view of the exact device location ("map my exact location and show
    // me on Google Maps") is a narrower, more specific case of the general
    // exact-location request below — checked FIRST so it wins. Unlike the
    // general case, this never resends the text to the agent: it opens a
    // real satellite Google Maps display deterministically, since leaving
    // "satellite view" up to free-text LLM narration is exactly the
    // unreliable behavior this flow exists to replace.
    if (!fileUrls?.length && detectExactMapViewIntent(q)) {
      setInput('');
      setAgentMessages(prev => [...prev, { role: 'user', content: q }]);
      triggerExactMapView();
      return;
    }

    // A direct typed request for exact/precise device location ("can you
    // pin my exact location on map") reaches the agent as plain text, but
    // it can only explain what to do — it cannot trigger requestGPS()
    // itself. Act on it immediately client-side instead of round-tripping
    // through the agent for an honest-but-inert reply: echo the traveler's
    // own message locally (same pattern as the voice/privacy command branch
    // above), then trigger the real GPS request. The gpsStatus effect below
    // resends this exact question, now carrying a real gps_precise block,
    // once permission resolves.
    if (!fileUrls?.length && detectLocationConsentIntent(q)) {
      setInput('');
      setAgentMessages(prev => [...prev, { role: 'user', content: q }]);
      triggerGpsUpgrade(q);
      return;
    }

    let conversation = agentConversation;
    if (!conversation) {
      try {
        conversation = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: 'My Journey', description: 'M-Care coordination session' },
        });
        setAgentConversation(conversation);
        setAgentMessages(conversation.messages || []);
      } catch (e) {
        toast({ title: 'Message not sent', description: friendlyError(e, 'Could not start your M-Care conversation. Please try again.', 'MCareOrb'), variant: 'destructive' });
        return;
      }
    }

    // Clear the input and show "sending" immediately — the location wait
    // below is bounded and invisible to the user, not a delay on their own
    // sense that the message went out.
    setInput('');
    setAgentSending(true);

    // Attach the traveler's auto-detected approximate location on the first
    // real message of a session AND re-attach it on any later message that is
    // itself location-sensitive — "nearest police station", "around me",
    // "where am I", "find me a pharmacy" — so M-Care never has to ask "where
    // are you?" mid-conversation just because the first-message block was
    // already consumed. The one-shot first-message attach covers most
    // sessions; this closes the gap for every location-dependent message
    // after it. Stripped from display by MessageBubble.jsx's
    // extractLocationContext; only ever a hint the agent must confirm before
    // treating as exact for anything address- or emergency-sensitive (see
    // the LOCATION_CONTEXT rule in m_care.jsonc) — this repo's own
    // getGeolocationAndCurrency comments document a real past
    // IP-misidentification bug, which is exactly why.
    //
    // Real race this used to have: the one-shot flag flipped to "sent" the
    // instant this ran, even when useAutoLocation's IP lookup hadn't resolved
    // yet (bestLocation still null) — a brand-new session with someone typing
    // fast burned its only chance and every later message in that
    // conversation went out with no location at all. Fixed two ways: (1) the
    // flag is only ever consumed once a real block was actually attached, so
    // a later message picks up what an earlier one missed; (2) on the very
    // first attempt only, if location is still genuinely loading, wait a
    // short bounded amount (checking the live ref, since this closure's own
    // bestLocation can be stale) rather than sending with nothing — most
    // sessions never even reach this branch, since useAutoLocation's IP fetch
    // already started when MCareOrb itself mounted, well before the panel is
    // opened.
    const locationSensitive = /\b(near(?:by|est)?|around me|where am i|find me|close by|in my area|closest|next to me|near here|near me)\b/i.test(q);
    // Once GPS is granted, ALWAYS attach the precise block on every outgoing
    // message — bypassing both the one-shot flag and the locationSensitive
    // regex — so the agent never reverts to the stale IP-approximate reading
    // between turns. The one-shot + regex behavior stays unchanged for the
    // IP-approximate case.
    const hasGps = bestLocationRef.current?.source === 'gps';
    const needsLocation = hasGps || !locationContextSentRef.current || locationSensitive;
    if (needsLocation && !bestLocationRef.current && locationLoadingRef.current) {
      const deadline = Date.now() + 1500;
      while (locationLoadingRef.current && !bestLocationRef.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    const locationBlock = needsLocation ? buildLocationContextBlock(bestLocationRef.current) : null;
    if (locationBlock) locationContextSentRef.current = true;
    const contentToSend = locationBlock ? (q ? `${locationBlock}\n${q}` : locationBlock) : q;

    // Optimistic user message so the UI feels instant; subscription replaces
    // it with the canonical server record.
    setAgentMessages(prev => [...prev, { role: 'user', content: contentToSend, file_urls: fileUrls }]);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: contentToSend, file_urls: fileUrls });
    } catch (e) {
      setAgentSending(false);
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: friendlyError(e, "I couldn't send your message just now — the connection dropped. Please try again in a moment.", 'MCareOrb'),
      }]);
    }
  }, [input, agentConversation, agentSending, toast, handleDistressSignal, bestLocation, triggerGpsUpgrade, triggerExactMapView]);

  // Keeps the continuous-recognition effect's callbacks able to reach the
  // latest sendAgentMessage without listing it as a dependency (which would
  // restart the whole SpeechRecognition session every time it's recreated).
  useEffect(() => { liveRef.current.sendAgentMessage = sendAgentMessage; });

  // Resolves a pending GPS-upgrade request (see handleGpsUpgradeConfirm).
  // Once permission actually resolves, redo the exact question that
  // triggered the offer — forcing a fresh location-block attach regardless
  // of keyword matching (locationContextSentRef reset) is simpler and more
  // robust than depending on the resent text happening to match the
  // location-sensitive regex above, and bestLocation already prefers GPS
  // over IP once gpsLocation is set, so the redo carries the precise fix.
  useEffect(() => {
    if (!pendingGpsRetryQueryRef.current && !pendingLocationPinRef.current && !pendingExactMapViewRef.current) return;
    if (gpsStatus === 'granted') {
      // If the agent is mid-response, defer the retry until it finishes —
      // sendAgentMessage bails on agentSending=true, which would silently
      // drop the GPS-carrying retry. The safety-net effects above clear
      // agentSending on reply (or timeout), and this effect re-runs because
      // sendAgentMessage changes identity when agentSending flips back.
      if (agentSending) return;
      clearGpsRequestTimeout();
      if (pendingLocationPinRef.current) {
        pendingLocationPinRef.current = false;
        sendLocationPin();
        return;
      }
      if (pendingExactMapViewRef.current) {
        pendingExactMapViewRef.current = false;
        sendExactLocationMapMessage();
        return;
      }
      const retryText = pendingGpsRetryQueryRef.current;
      pendingGpsRetryQueryRef.current = null;
      locationContextSentRef.current = false;
      sendAgentMessage(retryText);
    } else if (gpsStatus === 'denied' || gpsStatus === 'unavailable') {
      clearGpsRequestTimeout();
      pendingGpsRetryQueryRef.current = null;
      pendingLocationPinRef.current = false;
      pendingExactMapViewRef.current = false;
      // Harmless if a location-choice flow wasn't the one pending (a typed-
      // question retry can also land here) — releases the Location-menu
      // double-tap guard if it was.
      locationChoiceInFlightRef.current = false;
      const inIframe = (typeof window !== 'undefined' && window.self !== window.top);
      // Differentiated by the real GeolocationPositionError.code
      // (1=denied, 2=position_unavailable, 3=timeout) / 'no_api' — each is a
      // genuinely different, actionable situation, not one generic failure.
      let content;
      if (inIframe) {
        content = "Your browser is blocking precise location in this view (common in the web preview). I'll keep using your approximate area for now — if you open the app on your phone or the published site, I can use your exact GPS.";
      } else if (gpsStatus === 'denied') {
        content = "Your browser has location permanently blocked for this site, so it won't prompt again on its own. To fix it: tap the lock or site-info icon next to the web address, find Location, and set it to Allow — then just ask me again and I'll use it. I'll keep using your approximate area for now.";
      } else if (gpsErrorCode === 3) {
        content = "Your device took too long to respond with a precise location — that can happen with a weak signal. Feel free to ask again, especially somewhere with a clearer view of the sky. I'll keep using your approximate area for now.";
      } else if (gpsErrorCode === 2 || gpsErrorCode === 'no_api') {
        content = "Your device isn't able to provide a precise location right now, so I'll keep using your approximate area.";
      } else {
        content = "I wasn't able to get your exact location, so I'll keep using your approximate area.";
      }
      setAgentMessages(prev => [...prev, { role: 'assistant', content }]);
    }
  }, [gpsStatus, gpsErrorCode, sendAgentMessage, agentSending, sendLocationPin, sendExactLocationMapMessage]);

  const startNewJourney = useCallback(async () => {
    // A fresh journey drops any live voice conversation and pending
    // interrupted topics rather than carrying them into a new context.
    autoResumeConversationalRef.current = false;
    forceSpeakNextReplyRef.current = false;
    setConversationalMode(false);
    setInterruptedIntents([]);
    setVoiceReplyAudioUrls({});
    ackedMessageIdsRef.current = new Set();
    spokenAssistantIdsRef.current = new Set();
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'My Journey', description: 'M-Care coordination session' },
      });
      setAgentConversation(conversation);
      setAgentMessages(conversation.messages || []);
      // A fresh journey may start somewhere new — re-attach location on its
      // first message rather than carrying a possibly-stale reading forward.
      locationContextSentRef.current = false;
    } catch (e) {
      toast({ title: 'Could not start a new journey', description: friendlyError(e, 'Please try again.', 'MCareOrb'), variant: 'destructive' });
    }
  }, [toast]);

  const toggleConversationalMode = () => {
    setConversationalMode(v => {
      const next = !v;
      if (next) setTalkMode(true); // a silent phone call makes no sense
      else autoResumeConversationalRef.current = false; // user chose this — don't auto-resume later
      return next;
    });
  };

  // Talk Mode toggle — turning it ON activates BOTH halves of the voice loop:
  //   • voice OUTPUT: M speaks a short confirmation (also unlocks mobile audio
  //     playback, which later async replies depend on).
  //   • voice INPUT:  the microphone + speech processing start (continuous
  //     recognition, the same engine Conversational Mode uses), so the user
  //     can talk back without tapping the mic button each turn.
  // The mic starts AFTER the spoken confirmation finishes, so it never
  // captures M's own voice. If the browser lacks SpeechRecognition, Talk Mode
  // falls back to output-only (speak replies) and the push-to-talk mic button
  // remains the input path.
  const toggleTalkMode = () => {
    setTalkMode(prev => {
      const next = !prev;
      if (!next) {
        stopAllSpeech();
        setRevealState(null);
        return next;
      }
      const canListen = isConversationalModeSupported();
      const confirmText = canListen
        ? "Talk mode on. I'm listening — go ahead."
        : "Talk mode on. I'll speak my replies aloud.";
      setSpeaking(true);
      speakTextNeural(confirmText, {
        rate: 0.9,
        language: i18n.language,
        onEnd: () => {
          setSpeaking(false);
          if (canListen) {
            // Activate the microphone + speech processing now that M has
            // finished speaking, so the mic never captures its own voice.
            setConversationalMode(true);
            return;
          }
          // No speech recognition → output-only: speak the last existing
          // reply so toggling ON mid-conversation isn't a dead end.
          const last = agentMessagesRef.current[agentMessagesRef.current.length - 1];
          if (last && last.role === 'assistant' && last.content) {
            const msgIndex = agentMessagesRef.current.length - 1;
            if (!isClaimed(spokenAssistantIdsRef, msgIndex, last)) {
              claim(spokenAssistantIdsRef, msgIndex, last);
              const speakable = extractSpeakableText(last.content);
              if (speakable) {
                const totalWords = speakable.split(/\s+/).filter(Boolean).length;
                setSpeaking(true);
                setRevealState({ messageIndex: msgIndex, revealedWordCount: 0, totalWordCount: totalWords });
                speakTextNeural(speakable, {
                  rate: 0.9,
                  language: i18n.language,
                  onWordBoundary: (count) => setRevealState(p =>
                    (p && p.messageIndex === msgIndex) ? { ...p, revealedWordCount: count } : p),
                  onAudioUrl: (url) => setVoiceReplyAudioUrls(prev => ({ ...prev, [msgIndex]: url })),
                  onEnd: () => { setSpeaking(false); setRevealState(p => (p && p.messageIndex === msgIndex) ? null : p); },
                  onError: () => { setSpeaking(false); setRevealState(p => (p && p.messageIndex === msgIndex) ? null : p); },
                });
              }
            }
          }
        },
        onError: () => setSpeaking(false),
      });
      return next;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast({ title: 'File too large', description: 'That file is larger than 15MB. Please upload a smaller image or PDF.', variant: 'destructive' }); return; }
    setAgentUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendAgentMessage(`I've uploaded: ${file.name || 'document'}`, [file_url]);
    } catch (e) {
      toast({ title: 'Upload failed', description: 'Upload failed — please try again.', variant: 'destructive' });
    } finally {
      setAgentUploading(false);
    }
  };

  // Voice message send handler — passed to VoiceMessageRecorder as onSend.
  // Follows the exact same upload-then-addMessage pattern as handleFileSelect
  // above (Core.UploadFile → sendAgentMessage(content, [file_url])), just with
  // an extra transcription step in between so the agent still gets real text
  // content. Transcription failure never blocks the send — the recorded audio
  // itself is unaffected either way, only the displayed/sent text falls back
  // to a generic placeholder (MessageBubble renders a pure single-audio-file
  // message as a WhatsApp-style voice note, without showing that text).
  const handleVoiceMessage = async (audioBlob, _durationMs) => {
    if (!audioBlob) return;
    // Voice in -> voice out, guaranteed: whatever Talk Mode's toggle state
    // happens to be, THIS reply is spoken and rendered as a real, replayable
    // voice-note bubble — matching input modality to output modality is the
    // whole point of a hands-free/driving conversation. See the speak effect
    // above for where this gets consumed.
    forceSpeakNextReplyRef.current = true;
    // A voice message means the user wants to converse by voice. Auto-enable
    // Talk Mode so the agent's reply speaks aloud automatically — no "Listen"
    // button to tap, no speaker icon to find. This is essential for a blind
    // user: they send a voice note and hear M reply, with zero visual step.
    // Output only — we do NOT enable always-listening, so there's no mic
    // feedback-loop risk. Persisted by the existing talkMode effect.
    // Not gated on isSpeechSupported() (browser-native TTS availability) —
    // the real voice path (speakTextNeural) is server-first and doesn't need
    // it at all; that check only matters for the fallback, which already
    // self-guards internally. Gating the outer attempt on it was needless
    // and could silently skip the whole voice-note-reply feature in any
    // environment lacking window.speechSynthesis.
    const justEnabledVoice = !talkMode;
    if (justEnabledVoice) {
      setTalkMode(true);
      // Spoken immediately so a blind user knows voice replies are now on —
      // the record-tap unlocked audio playback. When the agent's reply
      // arrives, neuralSpeech interrupts this cue and speaks the answer.
      speakAncillary("Got it — I'll reply out loud.", { rate: 0.9 });
    }
    setAgentUploading(true);
    try {
      const file = new File([audioBlob], 'voice-message.webm', { type: audioBlob.type || 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      let transcript = '';
      try {
        const res = await base44.functions.invoke('transcribeVoiceInput', { audio_url: file_url });
        const payload = res?.data ?? res ?? {};
        transcript = (payload.text || '').trim();
      } catch (_) {
        transcript = ''; // transcription failed — fall through to the placeholder below
      }
      await sendAgentMessage(transcript || '[voice message]', [file_url]);
    } catch (e) {
      toast({ title: 'Voice message failed', description: friendlyError(e, "Couldn't send that voice message — please try again.", 'MCareOrb'), variant: 'destructive' });
    } finally {
      setAgentUploading(false);
    }
  };

  const handleVoiceMessageError = (msg) => {
    toast({ title: 'Voice message', description: msg, variant: 'destructive' });
  };

  const handleVaulted = ({ token, document_type, file_name }) => {
    const label = DOC_LABEL[document_type] || 'document';
    sendAgentMessage(`I've uploaded my ${label} (${file_name}) to the secure vault. Reference token: ${token}. It's encrypted and stored for verification.`);
  };

  // M-Safe-style quick action chips (functional shortcuts). "Become a partner"
  // is role-gated and navigates rather than messaging the agent.
  const quickChips = [
    { label: 'My Trips', icon: Luggage, run: () => sendAgentMessage('Show me my trips') },
    { label: 'Emergency Help', icon: Siren, run: () => sendAgentMessage('I need emergency help') },
    { label: 'Find Doctor', icon: Stethoscope, run: () => sendAgentMessage('Help me find a verified doctor') },
    { label: 'Visa Help', icon: FileText, run: () => sendAgentMessage('I need help with a visa') },
  ];
  if (canBecomePartner) quickChips.push({ label: 'Become a partner', icon: Briefcase, run: () => { setOpen(false); navigate('/partner-signup'); } });
  if (!isAuthenticated) quickChips.push({ label: 'Sign in to book', icon: LogIn, run: () => base44.auth.redirectToLogin(window.location.pathname) });

  const currentTip = struggleHint || tips[tipIdx];

  // Header status pill reflects live / paused / offline (preserves prior state signaling)
  const statusPill = paused
    ? { text: 'PAUSED', bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' }
    : isOnline
      ? { text: 'LIVE SESSION', bg: '#DCFCE7', fg: '#166534', dot: '#22C55E' }
      : { text: 'OFFLINE', bg: '#F3F4F6', fg: '#4B5563', dot: '#9CA3AF' };

  return (
    <>
      {/* ── Floating orb + bubble ── */}
      {!open && !heroBlocksOrb && (
        <div style={{ position: 'fixed', bottom: 'calc(max(24px, env(safe-area-inset-bottom, 24px)) + var(--sticky-cta-height, 0px) + var(--bottom-tab-bar-height, 0px))', transition: 'bottom 0.35s cubic-bezier(0.4,0,0.2,1)', left: 20, zIndex: 9000, display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 8 }}>
          <button onClick={() => { setOpen(true); setDismissed(true); setStruggleHint(null); markJourneyEventsSeen(); }} aria-label="Open M-Care"
            style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <LivingOrb state={orbState} size={44} flashToken={bargeInFlashToken} />
            {!isOnline && <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid rgba(10,20,28,0.9)' }} />}
            {isOnline && hasUnseenJourneyEvent && <span title="M-Care has an update for you" style={{ position: 'absolute', bottom: 4, right: 4, width: 10, height: 10, borderRadius: '50%', background: GOLD, border: '2px solid rgba(10,20,28,0.9)' }} />}
          </button>
          {showBubble && !dismissed && (
            <div style={{ background: 'rgba(10,20,28,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '10px 14px', maxWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', position: 'relative', animation: 'orbBubbleIn 0.3s ease' }}>
              <button onClick={() => { setDismissed(true); setStruggleHint(null); }} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              {!isOnline && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>{t('guide.offline_badge')}</span>}
              <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.5 }}><span style={{ marginRight: 6 }}>{currentTip.e}</span>{currentTip.t}</p>
            </div>
          )}
        </div>
      )}

      {/* ── M-Safe chat panel ── */}
      <AnimatePresence>
      {open && (
        <motion.div
          onClick={() => setOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ position: 'fixed', inset: 0, zIndex: 9001, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
          style={{ transition: 'width 0.25s ease, height 0.25s ease',
            width: expanded ? 'min(1160px, 96vw)' : 'min(440px, 94vw)',
            background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(15,23,42,0.28)', display: 'flex', flexDirection: 'column',
            height: expanded ? '94vh' : 'min(86vh, 720px)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#fff' }}>
            {conversationalMode
              ? <LivingOrb state={orbState} size={36} flashToken={bargeInFlashToken} />
              : <McareAvatar size={36} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: '#111827', lineHeight: 1.2 }}>M-Safe</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Morales Super Agent</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: statusPill.bg, color: statusPill.fg, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusPill.dot }} /> {statusPill.text}
            </span>
            {privateMode && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#3730A3', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <Shield style={{ width: 12, height: 12 }} /> PRIVATE
              </span>
            )}
            {responseLanguage && (
              <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F3F4F6', color: '#4B5563', borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {responseLanguage}
              </span>
            )}
            {isConversationalModeSupported() && (
              <button onClick={toggleConversationalMode}
                title={conversationalMode ? 'Live conversation on — tap to stop' : 'Start a live voice conversation (best with headphones)'}
                aria-label="Toggle conversation mode" aria-pressed={conversationalMode}
                style={{ background: conversationalMode ? 'rgba(108,71,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: 4, color: conversationalMode ? PURPLE : '#6B7280', display: 'flex', borderRadius: 8 }}>
                {conversationalMode ? <PhoneCall style={{ width: 16, height: 16 }} /> : <Phone style={{ width: 16, height: 16 }} />}
              </button>
            )}
            {isSpeechSupported() && (
              <button onClick={() => toggleTalkMode()} title={talkMode ? 'Talk mode on — tap to turn off' : 'Talk mode off — tap to turn on'} aria-label="Toggle talk mode" aria-pressed={talkMode}
                style={{ background: talkMode ? 'rgba(108,71,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: 4, color: talkMode ? PURPLE : '#6B7280', display: 'flex', borderRadius: 8 }}>
                {talkMode ? <Volume2 style={{ width: 16, height: 16 }} /> : <VolumeX style={{ width: 16, height: 16 }} />}
              </button>
            )}
            {agentMessages.length > 0 && (
              <button onClick={startNewJourney} title="New journey" aria-label="New journey" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex', borderRadius: 8 }}>
                <RotateCcw style={{ width: 16, height: 16 }} />
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'} aria-label={expanded ? 'Collapse' : 'Expand'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex', borderRadius: 8 }}>
              {expanded ? <Minimize2 style={{ width: 16, height: 16 }} /> : <Maximize2 style={{ width: 16, height: 16 }} />}
            </button>
            <button onClick={() => setOpen(false)} title="Close" aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex', borderRadius: 8 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <>
            {/* Journey stage tracker — reflects real case state from tool calls */}
              {agentMessages.length > 0 && (
                <JourneyStageTracker messages={agentMessages} />
              )}

              {/* Chat area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F6F7FB' }}>
                {agentMessages.length === 0 && !agentLoading && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                      <McareAvatar size={32} />
                      <p style={{ margin: 0, fontSize: 13, color: '#111827', lineHeight: 1.55, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '10px 12px', maxWidth: '85%' }}>{GREETING}</p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 42 }}>
                      {quickChips.map(c => (
                        <button key={c.label} onClick={c.run}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, border: '1px solid #E5E7EB', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <c.icon style={{ width: 14, height: 14 }} /> {c.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {agentLoading && agentMessages.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
                    <McareAvatar size={28} glow />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4AF37', display: 'inline-block', animation: `guideThink 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>Opening your journey…</span>
                  </div>
                )}

                {agentMessages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <MessageBubble message={m} accent={PURPLE} showAvatar showMeta showReaction
                      onChoice={
                        m.__distressConfirm
                          ? (c) => handleDistressConfirm(c, m.__distressConfirm)
                          // The "Location" attachment-menu prompt (handleLocationMenuClick,
                          // this component) is client-synthesized too — routed by the same
                          // marker-on-the-message-object pattern as __distressConfirm above,
                          // never a text match, since the two chip labels are ones this
                          // component itself just generated.
                          : m.__locationShareChoice
                            ? handleLocationShareChoice
                          // The agent's own narrated surrounding-awareness offer (RULE,
                          // m_care.jsonc) always uses this exact choices token — matched
                          // on the literal text rather than a flag set at creation time,
                          // since (unlike the distress prompt) this message is a real
                          // agent reply arriving via subscribeToConversation, not
                          // client-synthesized.
                          : (m.role === 'assistant' && m.content?.includes('{{choices:Yes, watch my surroundings|No thanks}}'))
                            ? handleSurroundingAwarenessConfirm
                            // The agent's own narrated GPS-upgrade offer (LOCATION CONTEXT
                            // rule, m_care.jsonc) is free text, not a fixed enum — a live
                            // session showed it phrase the same underlying "grant GPS"
                            // option differently across turns ("Yes, use my exact
                            // location" one reply, "I'll share my GPS" the next), so this
                            // checks the tapped choice's own text via
                            // detectLocationConsentIntent rather than one hardcoded
                            // message-level literal. An unrelated or declining option
                            // never matches and falls through to sendAgentMessage as usual.
                            : (c) => detectLocationConsentIntent(c) ? handleGpsUpgradeConfirm(c) : sendAgentMessage(c)
                      }
                      onRespond={sendAgentMessage}
                      revealUpTo={revealState && revealState.messageIndex === i ? revealState.revealedWordCount : undefined}
                      extraAudioUrl={voiceReplyAudioUrls[i]} />
                  </motion.div>
                ))}

                {/* Proactive M-Care updates — real JourneyEvent records, polled
                    every 20s, never spliced into agentMessages (see the hook
                    declarations above for why). Rendered in their own block
                    so real conversation indices (revealUpTo/extraAudioUrl,
                    both keyed by position in agentMessages) are never
                    disturbed. Oldest-first, matching normal chat reading order. */}
                {[...journeyEvents].reverse().map((e) => (
                  <motion.div key={`je-${e.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', paddingLeft: 42, marginBottom: 2 }}>
                      M-Care checked in
                    </div>
                    <MessageBubble message={{ role: 'assistant', content: e.message_text, created_date: e.created_date }} accent={PURPLE} showAvatar showMeta />
                  </motion.div>
                ))}

                {agentSending && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
                    <McareAvatar size={28} glow />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4AF37', display: 'inline-block', animation: `guideThink 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>M-Safe is coordinating…</span>
                  </div>
                )}

                {!isOnline && (
                  <div style={{ borderRadius: 14, border: '1px solid #FDE68A', background: '#FFFBEB', padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {t('guide.offline_badge')}
                    </div>
                    {offlineArtifact ? (
                      <>
                        <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#78350F' }}>
                          Here's what I already prepared before the connection dropped:
                        </p>
                        <InlineQrBlock label={offlineArtifact.label} dest={offlineArtifact.dest} />
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12.5, color: '#78350F' }}>
                        I don't have anything saved for you yet this session. Ask me for directions or a QR code the next time you're connected, and I'll have it ready if you go offline again.
                      </p>
                    )}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <InterruptedIntentChip intents={interruptedIntents} onResume={handleResumeIntent} onDismiss={handleDismissIntent} />

              <SmartInputSuggestions
                text={input}
                disabled={agentSending || agentUploading || !isOnline}
                onPick={(p) => setInput(input + ' ' + p)}
                onApplyCorrection={(fixed) => setInput(fixed)}
              />
              {/* Input */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: '#fff' }}>
                <AddImageMenu
                  variant="icon"
                  onDeviceFile={handleFileSelect}
                  onVaultClick={() => vaultRef.current?.open()}
                  onLocationClick={handleLocationMenuClick}
                  onUnsupported={(msg) => toast({ title: 'Attach', description: msg })}
                  disabled={agentSending || agentUploading}
                  uploading={agentUploading}
                />
                <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={handleVaulted} />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => handleChatPaste(e, { onFile: handleFileSelect, disabled: agentSending || agentUploading, onError: (msg) => toast({ title: 'Paste', description: msg, variant: 'destructive' }) })}
                  placeholder={conversationalMode ? 'Listening…' : isOnline ? (agentUploading ? "Uploading…" : "Ask M-Safe anything...") : t('guide.placeholder_offline')}
                  style={{ flex: 1, background: '#F6F7FB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '8px 12px', fontSize: 13, color: '#111827', outline: 'none' }}
                />
                {isOnline && !conversationalMode && (
                  <VoiceMessageRecorder
                    disabled={agentSending || agentUploading}
                    onSend={handleVoiceMessage}
                    onError={handleVoiceMessageError}
                  />
                )}
                <button onClick={() => sendAgentMessage()} disabled={!input.trim() || agentSending}
                  style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: input.trim() && !agentSending ? PURPLE : '#E5E7EB', border: 'none', cursor: input.trim() && !agentSending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                >
                  <Send style={{ width: 16, height: 16, color: input.trim() && !agentSending ? '#fff' : '#9CA3AF' }} />
                </button>
              </div>
          </>
        </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <style>{`
        @keyframes orbBubbleIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes guideThink  { 0%,80%,100% { transform:scale(0.7); opacity:0.4; } 40% { transform:scale(1.2); opacity:1; } }
        @keyframes mcareBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes mcarePanelIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      <LocationPermissionGate
        open={showLocationGate}
        onAllow={() => { setShowLocationGate(false); requestGPS(true); }}
        onCancel={() => setShowLocationGate(false)}
      />
    </>
  );
}