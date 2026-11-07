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
import { Send, RotateCcw, Maximize2, Minimize2, X, LogIn, Stethoscope, Briefcase, Luggage, Siren, FileText, Volume2, VolumeX, Phone, PhoneCall, Shield, ShieldCheck, ScanSearch, MapPin, Handshake, Headphones, Paperclip, ChevronRight, CheckCircle2, Bell, Sun, Moon, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import LocationPermissionGate from './LocationPermissionGate';
import LivingOrb from './LivingOrb';
import InterruptedIntentChip from './InterruptedIntentChip';
import LiveActivityCard from './LiveActivityCard';
import MSafeBottomNav from './MSafeBottomNav';
import MessageBubble, { InlineQrBlock } from '@/components/mcare-agent/MessageBubble';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import SmartInputSuggestions from '@/components/mcare-agent/SmartInputSuggestions';
import GhostTextOverlay from '@/components/mcare-agent/GhostTextOverlay';
import { useGhostTextSuggestion } from '@/hooks/useGhostTextSuggestion';
import { buildAcceptedText } from '@/lib/ghostTextSuggestion';
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
  createBargeInDetector,
  matchSpokenChoice,
  detectResumeIntent,
  resumeTaskFromLabel,
  TASK_STATUS,
  SILENCE_NUDGE_MS,
  MAX_SILENCE_NUDGES,
  SILENCE_NUDGE_TEXT,
} from '@/lib/conversationalMode';
import {
  deriveVoiceState,
  voiceStateLabel,
  shouldInterruptOnSpeech,
  createGenerationGuard,
} from '@/lib/conversationStateMachine';
import { parseMcareCommand } from '@/lib/voiceCommands';
import { shouldOfferWakePhrase, wakeOfferPatch } from '@/lib/wakePhraseOffer';
import { prefsFromUser } from '@/lib/mcarePreferences';
import WakePhraseOfferCard from './WakePhraseOfferCard';
import { detectWakePhrase } from '@/lib/wakePhrase';
import { armSurroundingAwareness, disarmSurroundingAwareness } from '@/lib/surroundingAwareness';
import { useMcarePreferences } from '@/hooks/useMcarePreferences';
import { detectDistressSignal, distressWelfarePrompt } from '@/lib/distressDetection';
import { pilotChatCopy, PILOT_CHAT_NEED_EMAIL, PILOT_CHAT_FAILED, PILOT_CHAT_CLOSE_DELAY_MS, extractPilotContact, cleanCampaignTag } from '@/lib/pilotChatCapture';
import { detectSpokenLanguage, recognitionLocaleFor } from '@/lib/spokenLanguageDetect';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import { useJourneyEvents } from '@/hooks/useJourneyEvents';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import { buildLocationContextBlock, buildSandboxLocationMessage, buildGpsFallbackMessage } from '@/lib/locationContext';
import { detectLocationConsentIntent } from '@/lib/locationConsentIntent';
import { detectExactMapViewIntent } from '@/lib/exactMapViewIntent';
import { findLastMapOrQrToken } from '@/lib/offlinePrep';
import { buildFirstOpenGreeting, pickGreetingIndex, readLastGreetingIndex, rememberGreetingIndex, hasChattedOnThisDevice, rememberHasChatted } from '@/lib/firstOpenGreeting';
import { describeAccuracy } from '@/lib/mapLinks';
import { isSandboxed } from '@/lib/isSandboxed';
import { callWithFaceCheck, phoneLockErrorMessage } from '@/lib/phoneLock';
import { hasActiveSafetyAlert } from '@/lib/safetyGateStatus';
import CapabilityPill from './msafe-plus/CapabilityPill';
import LiveSessionBadge from './msafe-plus/LiveSessionBadge';
import { CAPABILITIES } from './msafePlusConfig';
import CountryBackdrop from './CountryBackdrop';
import MSafeWelcomeCard from './MSafeWelcomeCard';
import { countryCodeFrom, countryLabel, flagEmoji, deviceShowsFlagEmoji } from '@/lib/destinationBackdrops';
import { welcomeCopy, pickLatestAlert, savedPlacesFrom, timeAgo } from '@/lib/msafeWelcome';

// The panel's colour tokens (GOLD, DARK, the light/dark card surfaces, the
// desktop-luxury variants) live in panelPalette.js — moved there unchanged when
// the capability rows were extracted, so that component draws from the same
// values rather than a second copy. See that file for what each one is for.
import {
  GOLD, DARK, PANEL_BG, CARD_BG, BORDER_DARK, TEXT_LIGHT, TEXT_MUTED_DARK,
  LIGHT_BG, LIGHT_CARD, LIGHT_BORDER, LIGHT_TEXT, LIGHT_TEXT_MUTED,
  GOLD_GRADIENT, DESKTOP_LUXURY_BG, DESKTOP_LUXURY_GOLD, DESKTOP_LUXURY_USER_GRADIENT,
  GOLD_INK, GOLD_WASH, CAUTION_INK, WORDMARK_FONT, BRAND_SERIF, NIGHT, GLASS, TYPE, RADIUS, TOUCH,
} from './panelPalette';
import { orbStateLabel } from '@/lib/orbStateLabel';
import { isMcareQuietRoute, mcareDeepLinkMode } from '@/lib/mcareDeepLink';
import { mergeTimeline } from '@/lib/chatTimeline';
import { serverTimeMs } from '@/lib/serverTime';
import RingScreen, { RingAvatar } from './ring/RingScreen';
import { sosOutcomeMessage } from '@/lib/livingRing';
import { queueSos, flushQueuedSos } from '@/lib/sosQueue';
const AGENT_NAME = 'm_care';
const GREETING = "I'm M-Safe, your M-Care Super Agent. I'll get you from \"I want a procedure\" to a safely booked, monitored trip — and I'll never rush you past safety. What procedure are you considering, and where would you like to have it?";
// How long after the first-open greeting is chosen its country sentence may still be added (see firstOpenGreeting).
const FIRST_OPEN_COUNTRY_WAIT_MS = 2500;
// North-star redesign (2026-11-01): the mockup's line under the LIVE pill.
const TAGLINE = 'Safe travels, always.';
// Two-column panel from this width up; the stacked full-screen layout below it.
const PANEL_SPLIT_QUERY = '(min-width: 1024px)';
// On tablets the stacked layout fills the screen, so its content sits in one
// readable centred column instead of stretching edge to edge.
const STACKED_MAX_WIDTH = 760;
// Input types that never bring up the on-screen keyboard (see the phone keyboard fit below).
const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'file', 'submit', 'reset', 'image', 'color', 'hidden']);
// The page behind the laptop panel on the standalone /m-care screen, where there is no website to dim: the app's
// navy, or the light panel's ivory warming to a soft gold at the edges.
const STANDALONE_PAGE_DARK = 'radial-gradient(circle at 50% 20%, #0F1B2E 0%, #060B16 65%)';
const STANDALONE_PAGE_LIGHT = 'radial-gradient(circle at 50% 25%, #FFFFFF 0%, #F8F7F2 45%, #ECE5D3 100%)';

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
// standalone: M-Care's own full-screen app (/m-care, pages/MCareApp.jsx). The same panel, always open, as the
// whole page: no website underneath, no click-outside-to-close, and Close leaves the screen instead of hiding it.
// variant="ring" (standalone only): the Living Ring screen (ring/RingScreen.jsx). The golden ring is M-Care's face,
// with only History, Talk and Type; everything real below (the conversation, voice, safety checks) is unchanged.
export default function MCareOrb({ standalone = false, variant = 'panel' } = {}) {
  const ringMode = standalone && variant === 'ring';
  const { t, i18n }       = useTranslation();
  const { toast }         = useToast();
  const { user, authChecked } = useAuth();
  const { prefs, update: updatePrefs } = useMcarePreferences();

  // The one-time "Hey M-Care" offer (wakePhraseOffer.js, WakePhraseOfferCard.jsx), shown under the greeting while
  // the chat is empty. Asked once per account: either answer is saved. prefs fill in a moment after the account
  // loads, so the saved copy on the account is checked too, or someone who already answered would see it flash.
  // Not on the standalone screen: the wake-phrase listener only runs while this panel is closed, and the
  // standalone panel never closes, so the feature can't work there. Hidden the instant either button is tapped.
  const [wakeOfferAnswered, setWakeOfferAnswered] = useState(false);
  const savedPrefs = prefsFromUser(user);
  const wakeOfferVisible = !standalone && !wakeOfferAnswered && shouldOfferWakePhrase({
    user,
    prefs: {
      wakePhraseEnabled: prefs.wakePhraseEnabled || savedPrefs.wakePhraseEnabled,
      wakePhraseOfferAnswered: prefs.wakePhraseOfferAnswered || savedPrefs.wakePhraseOfferAnswered,
    },
    supported: isConversationalModeSupported(),
  });
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
  const [openState,  setOpen]       = useState(false);
  // On the standalone screen the panel is the page, so it is always open; any of the panel's own
  // setOpen(false) calls are harmless there, and leaving is closePanel's job (see below).
  const open = standalone || openState;
  // Close: the overlay hides; the standalone screen goes back to the page the visitor came from inside the app,
  // or to the home page when M-Care was the first thing opened (a QR scan, a shared link, a home-screen icon),
  // where there is no page to go back to. history.state.idx is React Router's own position in this tab's history.
  const closePanel = useCallback(() => {
    if (!standalone) { setOpen(false); return; }
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/');
  }, [standalone, navigate]);
  const [input,      setInput]      = useState('');
  // VoiceMessageRecorder (WhatsApp-style voice notes) has no onRecordingChange
  // equivalent to VoiceInputButton's, so nothing sets this true anymore — it
  // stays false and orbState/the mic-feedback-loop guard below fall through
  // harmlessly. Left in place rather than removed to avoid rippling into
  // orbState/effect logic that's out of scope for this swap.
  const [listening] = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  // Real neural-TTS playback amplitude (0-1) for the robot's speaking-state
  // eye-glow/waveform — see neuralSpeech.js's onAmplitude and
  // audioAmplitude.js. null (the honest fixed-keyframe fallback) whenever
  // no real signal exists: the browser-speechSynthesis fallback path, or
  // any of M-Care's other speak call sites (tool-running ack, distress
  // prompt, voice-message cue) that don't wire this — only the main
  // Talk-Mode reply-speak effect below sets this to a real value.
  const [speakingAmplitude, setSpeakingAmplitude] = useState(null);
  // Real DOM focus on the chat input — the one new "alive agent" trigger:
  // focusing the input reads as the robot paying attention, but only when
  // nothing more urgent (thinking/speaking/real mic listening) is already
  // happening — see LivingOrb.jsx's activityState mapping.
  const [inputFocused, setInputFocused] = useState(false);
  // TEMPORARY, dev-only: forces the robot's activityState so each of the
  // four states can be verified on demand instead of waiting for a narrow
  // live-agent window. Rendered only under import.meta.env.DEV (compiled
  // out of the production bundle entirely) — see the test-button row near
  // the desktop robot column below.
  const [testActivityOverride, setTestActivityOverride] = useState(null);
  // TEMPORARY, dev-only: forces a gaze direction and fires an on-demand
  // blink — same import.meta.env.DEV gate as testActivityOverride, tests
  // the real eye-layer movement (2026-08-23 layered-cutout round) without
  // needing to catch idle's own randomized 3-7s blink timer live.
  const [testGazeOverride, setTestGazeOverride] = useState(null);
  const [testBlinkTrigger, setTestBlinkTrigger] = useState(0);
  const [testAmplitude, setTestAmplitude] = useState(null);
  const [dismissed,  setDismissed]   = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  // Gates the "Hey M-Care" wake-phrase listener below — makes the "only
  // while your screen is on and this tab is in front of you" claim in its
  // confirm text (voiceCommands.js CONFIRM.wake_phrase_on) literally true
  // in code, not just an assumption about browser throttling.
  const [tabVisible, setTabVisible] = useState(document.visibilityState === 'visible');
  const [struggleHint, setStruggleHint] = useState(null);
  const [expanded,   setExpanded]   = useState(false);
  const [agentUploading, setAgentUploading] = useState(false);
  // "More" overflow popover for the mobile quick-actions row (2026-08-28) —
  // purely local UI state, closed whenever the panel closes.
  const [moreChipsOpen, setMoreChipsOpen] = useState(false);
  // True while a voice note is being recorded on the phone screen, so the
  // message box steps aside and the recording strip gets the whole bar.
  const [recordingVoice, setRecordingVoice] = useState(false);
  // Widescreen two-column panel (>= 1024px) vs. the stacked full-screen layout
  // (< 1024px) — same matchMedia + change-listener pattern already used
  // throughout this app (LivingOrb.jsx's reducedMotion/canTilt).
  // The split moved from 768 to 1024 (design upgrade, 2026-10-31): a tablet
  // got the laptop layout squeezed into a short card ("LIVE SESSIO / N"), and
  // 1024 is where the site's own Header switches to its phone menu (lg), so
  // M-Safe's menu button now always has a real menu to open below it.
  const [wideScreen, setIsDesktopPanel] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PANEL_SPLIT_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(PANEL_SPLIT_QUERY);
    const onChange = () => setIsDesktopPanel(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  // The ring screen is one centred column at every width, built on the phone layout (its keyboard handling, the
  // night palette, the frosted message box), so it never takes the laptop's two-column layout.
  const isDesktopPanel = wideScreen && !ringMode;
  // Ring screen only: the message box is open in place of the three buttons (Type, or Talk where the browser can't
  // listen); the SOS from a double tap on Talk is being sent; and doneToken moves when a running task succeeds.
  const [ringTyping, setRingTyping] = useState(false);
  const [ringSosSending, setRingSosSending] = useState(false);
  const [ringDoneToken, setRingDoneToken] = useState(0);

  // Phone keyboard fit (2026-10-31). The mobile panel used to be a fixed 100dvh, which does not shrink when the
  // on-screen keyboard opens (iOS never resizes the layout for it, Android Chrome no longer does by default), so
  // the keyboard covered the composer and the page behind showed through. The panel now follows the *visible*
  // area (window.visualViewport), so the composer sits right on top of the keyboard the way a native chat app's
  // does, and the page behind is locked so it can't scroll underneath. Mobile only; desktop is unchanged.
  const [mobileViewport, setMobileViewport] = useState({ height: null, offsetTop: 0, keyboardOpen: false });
  useEffect(() => {
    if (!open || isDesktopPanel || typeof window === 'undefined') return undefined;
    const vv = window.visualViewport;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    // Is the keyboard up? It can only be while a text field has focus. Comparing the visible height with
    // window.innerHeight (the old test) fails on an iPhone: Safari reports innerHeight as the shrunken height while
    // the keyboard is open, so the screen never made room and the conversation was squeezed to a sliver. So: a text
    // field has focus, and either this is a touch screen (where focus brings the keyboard up, so the screen makes
    // room as it slides in rather than when it lands) or the visible area is clearly shorter than the tallest it has
    // been with no field focused (the screen without a keyboard; re-measured when the phone turns on its side).
    const typingInField = () => {
      const el = document.activeElement;
      if (!el) return false;
      if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
      return el.tagName === 'INPUT' && !NON_TEXT_INPUTS.has((el.getAttribute('type') || 'text').toLowerCase());
    };
    const touchScreen = window.matchMedia('(pointer: coarse)').matches;
    let fullHeight = vv ? vv.height : window.innerHeight;
    let lastWidth = vv ? vv.width : window.innerWidth;
    const update = () => {
      if (!vv) return;
      if (Math.abs(vv.width - lastWidth) > 40) { lastWidth = vv.width; fullHeight = vv.height; }
      const typing = typingInField();
      if (!typing) fullHeight = Math.max(fullHeight, vv.height);
      const keyboardOpen = typing && (touchScreen || fullHeight - vv.height > 120);
      setMobileViewport({ height: vv.height, offsetTop: vv.offsetTop, keyboardOpen });
    };
    // Focus has moved by the time a deferred update runs, so document.activeElement is the field gaining it (or none).
    let focusTimer = 0;
    const onFocusChange = () => { clearTimeout(focusTimer); focusTimer = setTimeout(update, 0); };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    document.addEventListener('focusin', onFocusChange);
    document.addEventListener('focusout', onFocusChange);
    return () => {
      clearTimeout(focusTimer);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      document.removeEventListener('focusin', onFocusChange);
      document.removeEventListener('focusout', onFocusChange);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      // iOS scrolls the page to reveal a focused field; put it back where it was when the chat opened.
      window.scrollTo(0, scrollY);
      setMobileViewport({ height: null, offsetTop: 0, keyboardOpen: false });
    };
  }, [open, isDesktopPanel]);
  // While the phone panel fills the screen over a page, mark <html> so index.css hides that page and paints the
  // background navy (html[data-mcare-cover] there). Layers alone can't do it on an iPhone: with the keyboard up,
  // Safari pans the visible area to the bottom of the frame that fixed layers attach to, and the strip under its
  // see-through address and up/down bars then shows the page from below that frame, where no layer reaches. The
  // standalone /m-care has no page behind it (MCareApp paints the background navy itself), so it doesn't mark.
  useEffect(() => {
    if (!open || isDesktopPanel || standalone) return undefined;
    const html = document.documentElement;
    html.setAttribute('data-mcare-cover', '');
    return () => html.removeAttribute('data-mcare-cover');
  }, [open, isDesktopPanel, standalone]);
  const keyboardOpen = !isDesktopPanel && mobileViewport.keyboardOpen;
  // Very little room above the keyboard (a phone on its side, or a small phone): the header steps aside as well
  // (the journey tracker already does whenever the keyboard is up), so the conversation and the message box keep
  // the space instead of being pushed off the bottom of the screen.
  const compactKeyboard = keyboardOpen && (mobileViewport.height ?? Infinity) < 360;
  // Light-mode option for the desktop panel (2026-08-29, mentor feedback:
  // "a bit dark, should have a light mode too"). Desktop was hardcoded to
  // the app's dark tokens (`className="dark"`); mobile already has a real
  // light theme (2026-08-28). This is a real toggle, not a mockup — it
  // reuses the exact same light color constants the mobile layout already
  // uses (LIGHT_BG/LIGHT_CARD/LIGHT_BORDER/LIGHT_TEXT/LIGHT_TEXT_MUTED,
  // declared further down this file), it does not invent a new palette.
  // Persisted per-browser so the choice survives a reopen. `isDesktopPanel`
  // itself stays untouched everywhere it drives LAYOUT (column structure,
  // sizing, which mobile-vs-desktop UI piece renders) — only the separate
  // `useDarkTheme` flag below is read wherever a color/background/border
  // decision is being made, so toggling this can never affect layout.
  // Default flipped to light (2026-08-29) — the desktop "M-Safe+" light
  // redesign is now the real experience, not a hidden opt-in toggle. Only
  // changes behavior for a session/browser with no saved preference yet;
  // anyone who already explicitly chose '0' (dark) keeps that choice.
  const [desktopLightMode, setDesktopLightMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('morales_mcare_desktop_light');
    return saved === null ? true : saved === '1';
  });
  useEffect(() => {
    try { localStorage.setItem('morales_mcare_desktop_light', desktopLightMode ? '1' : '0'); } catch { /* best-effort */ }
  }, [desktopLightMode]);
  // North-star redesign (2026-11-01): the phone and tablet screen is always the
  // dark navy look from Portia's mockup (it's the first thing a QR scan shows);
  // only the laptop layout keeps its light/dark switch.
  const useDarkTheme = isDesktopPanel ? !desktopLightMode : true;
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
  const chatScrollRef = useRef(null);
  const vaultRef = useRef(null);
  const responseLanguageRef = useRef(null);
  const chatInputRef = useRef(null);

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
  // Mirrors agentSending for the continuous-recognition effect's closures
  // (see handleBargeIn / the recognition effect below) — same "read via a
  // ref, never list as a dependency" reason as speakingRef/revealStateRef.
  const agentSendingRef = useRef(false);
  // Real barge-in / stale-work suppression (src/lib/conversationStateMachine.js).
  // bump()'d the instant a real barge-in is confirmed; suppressNextAssistantSpeechRef
  // additionally marks that the very next assistant message to arrive belongs
  // to a turn the traveler already interrupted mid-THINKING (no bubble existed
  // yet to snapshot) and must never be spoken or treated as the active reply —
  // see handleBargeIn and the growth-effect's suppression check below.
  const generationGuardRef = useRef(createGenerationGuard());
  const suppressNextAssistantSpeechRef = useRef(false);

  // Auto-detected approximate location (IP-based by default, GPS only if the
  // traveler already granted it) — see src/lib/locationContext.js for why
  // this is attached once per mount rather than on every message.
  // prefs aliased to locationPrefs — `prefs` is already bound to
  // useMcarePreferences()'s object elsewhere in this file.
  const { ipLocation, bestLocation, gpsLocation, isLoading: locationLoading, requestGPS, gpsStatus, gpsErrorCode, prefs: locationPrefs } = useAutoLocation();
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
  // Synchronous, cross-flow deduplication gate — set true the instant ANY of
  // the three GPS-triggering flows (triggerGpsUpgrade, triggerExactMapView,
  // shareCurrentLocationNow) starts a request, BEFORE any async call or
  // React state update. Cleared only after a real terminal outcome has
  // rendered (granted → message sent, denied/unavailable → error shown,
  // 15s safety net fired). This replaces the old gpsStatusRef === 'requesting'
  // check, which failed because (a) React 18 batching can skip the
  // 'requesting' state entirely when permissions resolve quickly, and
  // (b) after GPS resolves to 'denied'/'unavailable'/'granted', the ref is
  // no longer 'requesting' so the guard missed repeated messages, causing
  // the infinite "Getting your exact location now" loop.
  const locationRequestPendingRef = useRef(false);
  // Set true just before triggerGpsUpgrade redoes the original question on
  // success — sendAgentMessage reads and clears this to skip the
  // detectLocationConsentIntent / detectExactMapViewIntent client-side
  // intercepts for that one call. Without this, the retry text re-matches
  // the same intent, re-calls triggerGpsUpgrade, and loops forever — GPS
  // is already attached via buildLocationContextBlock, so the intercept has
  // nothing to add and must not divert the retry away from the real agent.
  const skipLocationIntentRef = useRef(false);

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
  // speech, never by the recognition engine's own routine restarts. Once
  // the nudge budget is already spent and yet another silence period
  // elapses with no response, ends the voice session with a real spoken +
  // toast warning — never leaves the mic silently "on" with a dead
  // conversation forever.
  const armSilenceNudge = () => {
    clearSilenceNudge();
    if (!conversationalModeRef.current) return;
    silenceTimerRef.current = setTimeout(() => {
      if (!conversationalModeRef.current || speakingRef.current) return;
      if (silenceNudgeCountRef.current >= MAX_SILENCE_NUDGES) {
        const endText = "Ending voice mode since I haven't heard anything — tap the mic to start again.";
        setAgentMessages(prev => [...prev, { role: 'assistant', content: endText }]);
        speakAncillary(endText, { rate: 0.9 });
        toast({ title: 'Voice conversation ended', description: 'No response for a while — tap the phone icon to start again.' });
        autoResumeConversationalRef.current = false;
        setConversationalMode(false);
        silenceNudgeCountRef.current = 0;
        return;
      }
      silenceNudgeCountRef.current += 1;
      // Appended like any other assistant turn — the existing speaking
      // effect below picks it up and speaks it (same pattern the Talk Mode
      // toggle confirmation already uses), so there's only one place that
      // ever calls speakText for a "grown" message.
      setAgentMessages(prev => [...prev, { role: 'assistant', content: SILENCE_NUDGE_TEXT }]);
    }, SILENCE_NUDGE_MS);
  };

  // Called the moment a real barge-in is confirmed (see the recognition
  // effect below), before the interrupting utterance has even finished
  // being recognized. Two cases: M-Care was already SPEAKING an existing
  // reply (a real bubble exists — snapshot what it was cut off saying into
  // interruptedIntents, as a real, named paused task); or M-Care was still
  // THINKING (agentSending — no reply exists yet). In the THINKING case
  // there's no bubble to snapshot, but the eventual reply, whenever it
  // arrives, belongs to a turn the traveler has already moved on from — the
  // "sending" lock is released so their new message can go out immediately,
  // and suppressNextAssistantSpeechRef marks that reply to never be spoken
  // or treated as active once it lands (see the growth effect below). This
  // is the honest, platform-correct version of "cancel stale work": Base44
  // can't actually abort an in-flight generation, so a stale reply may
  // still land in history later — this only stops it from being surfaced
  // as the current turn.
  const handleBargeIn = () => {
    stopAllSpeech();
    setSpeaking(false);
    setSpeakingAmplitude(null);
    generationGuardRef.current.bump();
    if (agentSendingRef.current) {
      setAgentSending(false);
      suppressNextAssistantSpeechRef.current = true;
    }
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
          status: TASK_STATUS.PAUSED,
        }));
      }
    }
    setRevealState(null);
    setBargeInFlashToken(t => t + 1);
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

  // An answer to the "Hey M-Care" offer: saved either way so it is never asked again. "Turn on" gets the same
  // confirmation as saying "enable wake phrase" (read from voiceCommands, so the wording and its stated limits can't
  // drift), as M-Care's reply, the way a spoken command's confirmation already appears.
  const answerWakeOffer = (turnOn) => {
    setWakeOfferAnswered(true);
    updatePrefs(wakeOfferPatch(turnOn));
    if (!turnOn) return;
    const confirm = parseMcareCommand('enable wake phrase')?.confirmText;
    if (confirm) setAgentMessages((prev) => [...prev, { role: 'assistant', content: confirm }]);
  };

  useEffect(() => { agentMessagesRef.current = agentMessages; }, [agentMessages]);
  useEffect(() => { responseLanguageRef.current = responseLanguage; }, [responseLanguage]);
  useEffect(() => { agentSendingRef.current = agentSending; }, [agentSending]);

  // First-open greeting (Jarvis vision piece 34, backlog thread 18). A
  // signed-out visitor who hasn't sent a message from this device yet gets
  // one of six warm opening lines instead of the standard one, never the
  // same line twice in a row, plus the country their IP address points to
  // when it's known (src/lib/firstOpenGreeting.js). It's decided once per
  // open, before the panel paints. It waits for the sign-in check, so a
  // signed-in traveler never sees "first time here" while that loads; when
  // the panel opens before the check finishes (a link that opens M-Care on
  // page load), it's decided the moment the check does. The country is left
  // out if location is paused or Private Mode is on.
  const [firstOpenGreeting, setFirstOpenGreeting] = useState(null);
  const firstOpenDecidedRef = useRef(false);
  React.useLayoutEffect(() => {
    if (!open) {
      firstOpenDecidedRef.current = false;
      setFirstOpenGreeting(null);
      return;
    }
    if (firstOpenDecidedRef.current || !authChecked) return;
    firstOpenDecidedRef.current = true;
    if (user || hasChattedOnThisDevice()) return;
    const index = pickGreetingIndex(readLastGreetingIndex());
    rememberGreetingIndex(index);
    const country = (!locationPrefs.locationPaused && !privateMode) ? (ipLocation?.country ?? null) : null;
    setFirstOpenGreeting({ index, country, decidedAt: Date.now() });
  }, [open, authChecked]); // eslint-disable-line react-hooks/exhaustive-deps
  // The full-screen M-Care (where every QR scan lands) usually decides the
  // greeting before the IP lookup comes back. If the country arrives within
  // FIRST_OPEN_COUNTRY_WAIT_MS of that, it's added once; later than that it's
  // left out, so the line never changes while someone is reading it.
  useEffect(() => {
    if (!firstOpenGreeting || firstOpenGreeting.country) return;
    if (locationPrefs.locationPaused || privateMode) return;
    const country = ipLocation?.country;
    if (!country || Date.now() - firstOpenGreeting.decidedAt > FIRST_OPEN_COUNTRY_WAIT_MS) return;
    setFirstOpenGreeting((g) => (g && !g.country ? { ...g, country } : g));
  }, [ipLocation?.country]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasChattedRef = useRef(false);
  useEffect(() => {
    if (hasChattedRef.current) return;
    if (agentMessages.some(m => m?.role === 'user')) {
      hasChattedRef.current = true;
      rememberHasChatted();
    }
  }, [agentMessages]);

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

  // Private Mode pauses/resumes the user's own pending solo check-ins, as the server (setPrivateMode), which also
  // writes the audit entry once the pause really happened. The browser used to pause them itself; since check-ins
  // became server-write-only that write was refused and swallowed, so nothing was paused. Pausing switches help
  // off, so with the Face ID lock on it asks for Face ID first; if that check doesn't go through, Private Mode is
  // switched back off and nothing is paused. Resuming never asks.
  const handlePrivateModeToggle = useCallback(async (paused) => {
    if (!user?.email) return;
    try {
      await callWithFaceCheck('pause_safety_checkins', (step_up) => base44.functions.invoke('setPrivateMode', {
        paused, ...(step_up ? { step_up } : {}),
      }));
    } catch (error) {
      if (!paused) return; // resuming is best-effort; the check-ins resume on their own schedule anyway
      setPrivateMode(false);
      updatePrefs({ privateMode: false });
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: `Private Mode is still off, so your safety check-ins are still running. ${phoneLockErrorMessage(error, "I couldn't pause them just now. Try again in a moment.")}`,
      }]);
    }
  }, [user, updatePrefs]);

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
    // Real bug found live: requestOnDemandRide 400s (never dispatches) if
    // neither coordinates NOR a manual pickup_address are present — GPS may
    // not have resolved yet even though IP-geo already knows a city/country.
    // Give it that fallback instead of guaranteeing a failure whenever
    // precise location hasn't come in yet.
    const locationLabel = [bestLocation?.city, bestLocation?.country].filter(Boolean).join(', ');
    const pickupAddress = (lat == null && lng == null) ? (locationLabel || undefined) : undefined;

    // Third parallel action, additive only — a real, adaptive AI phone call
    // to an already-trusted contact (Guardian Tier 1), alongside the two
    // channels above. Deliberately never folded into the rideOk/guardianOk
    // branch tree below (would balloon 4 branches into 8) — mentioned only
    // as a bonus sentence when it genuinely succeeds, silent when it
    // doesn't, since the existing ride/guardian pair already fully covers
    // the escalation guarantee on their own.
    const [rideOutcome, guardianOutcome, callOutcome] = await Promise.allSettled([
      base44.functions.invoke('requestOnDemandRide', {
        case_id: activeCaseRecord?.id,
        pickup_latitude: lat,
        pickup_longitude: lng,
        pickup_address: pickupAddress,
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
      activeCaseRecord?.id
        ? base44.functions.invoke('callTrustedContact', {
            case_id: activeCaseRecord.id,
            situation_summary: `Distress signal (${ctx?.signal?.category || 'unknown'}): "${ctx?.text || ''}"`,
            requested_action: 'Please call or check on them now if you can.',
            trigger: 'distress_confirm',
          })
        : Promise.resolve(null),
    ]);

    const rideOk = rideOutcome.status === 'fulfilled' && !rideOutcome.value?.data?.error;
    const guardianOk = guardianOutcome.status === 'fulfilled' && guardianOutcome.value && !guardianOutcome.value?.data?.error;
    const callOk = callOutcome.status === 'fulfilled' && callOutcome.value?.data?.success === true;
    let reply;
    if (rideOk && guardianOk) {
      reply = "I've requested a driver for you and let your guardian know — I'll keep you updated.";
    } else if (rideOk) {
      reply = "I've requested a driver for you. I wasn't able to reach your guardian right now, but I've flagged it.";
    } else if (guardianOk) {
      reply = "I've let your guardian know. I wasn't able to line up a driver right now, but I've flagged it for the team.";
    } else {
      // Real bug found live: both soft channels above genuinely require an
      // existing CaseRecord (requestOnDemandRide 400s, notifyGuardianNow is
      // skipped client-side entirely without one) — a patient still mid-
      // intake who reports something urgent had NO real escalation path,
      // only a suggestion to go find a different button themselves. Fall
      // back automatically to the same universal, case-optional mechanism
      // SOSDropdown.jsx already uses for triggerSOS — case_id/location are
      // best-effort there too, only patient_email/trigger_type are required.
      let sosOk = false;
      try {
        const sosRes = await base44.functions.invoke('triggerSOS', {
          trigger_type: ctx?.signal?.category === 'medical' ? 'ambulance' : 'police',
          case_id: activeCaseRecord?.id,
          patient_email: user?.email,
          patient_name: user?.full_name || activeCaseRecord?.client_name,
          patient_phone: activeCaseRecord?.client_phone,
          latitude: lat,
          longitude: lng,
          location_label: locationLabel || 'Unknown',
          destination_country: activeCaseRecord?.procedure_country || bestLocation?.country,
          is_silent: false,
        });
        sosOk = !sosRes?.data?.error;
      } catch (_) { sosOk = false; }
      reply = sosOk
        ? "I couldn't line up a driver or reach your guardian, so I've sent an emergency alert straight to our safety team with your details — they've been notified and will act on this now."
        : "I'm having real trouble reaching help through any channel right now. Please call your local emergency number directly if you can, or try the SOS button again.";
    }
    if (callOk) {
      reply += " I'm also calling your emergency contact directly right now.";
    }
    setAgentMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    if (talkMode) speakAncillary(reply, { rate: 0.9 });
  }, [bestLocation, activeCaseRecord, talkMode, user]);

  // The ring screen's SOS: a double tap on Talk, after a 5-second countdown the traveller could cancel. Sends
  // triggerSOS with the same payload the distress check uses ('police' also builds the packet for a human on call),
  // and M-Care says only what triggerSOS actually reported back (sosOutcomeMessage). Offline it is saved to the same
  // queue as the SOS button and sent when the connection returns (the effect below).
  const sendRingSos = useCallback(async () => {
    setRingSosSending(true);
    base44.functions.invoke('logAuditEvent', {
      event_type: 'mcare_stage_transition',
      resource_type: 'mcare_ring_sos',
      details: { signed_in: !!user?.email, online: navigator.onLine },
    }).catch(() => {});
    const lat = bestLocation?.latitude ?? undefined;
    const lng = bestLocation?.longitude ?? undefined;
    const locationLabel = [bestLocation?.city, bestLocation?.country].filter(Boolean).join(', ');
    const payload = {
      trigger_type: 'police',
      case_id: activeCaseRecord?.id,
      patient_email: user?.email,
      patient_name: user?.full_name || activeCaseRecord?.client_name,
      patient_phone: activeCaseRecord?.client_phone,
      latitude: lat,
      longitude: lng,
      location_label: locationLabel || 'Unknown',
      destination_country: activeCaseRecord?.procedure_country || bestLocation?.country,
      is_silent: false,
    };
    let outcome;
    if (!user?.email) {
      outcome = { signedIn: false };
    } else if (!navigator.onLine) {
      queueSos(payload);
      outcome = { offline: true };
    } else {
      try {
        const res = await base44.functions.invoke('triggerSOS', payload);
        outcome = { ok: !res?.data?.error, notifications: res?.data?.notifications_sent || [] };
      } catch (error) {
        const status = error?.response?.status;
        if (status === 429) outcome = { rateLimited: true };
        else if (!status) { queueSos(payload); outcome = { offline: true }; }
        else outcome = { ok: false };
      }
    }
    const reply = sosOutcomeMessage(outcome);
    setRingSosSending(false);
    setAgentMessages(prev => [...prev, { role: 'assistant', content: reply, created_date: new Date().toISOString() }]);
    if (talkMode) speakAncillary(reply, { rate: 0.9 });
  }, [bestLocation, activeCaseRecord, talkMode, user]);

  // An SOS saved while offline goes out when the connection returns (the SOS button does the same; the shared queue
  // never sends one twice).
  useEffect(() => {
    if (!ringMode) return undefined;
    const flush = () => { if (navigator.onLine) flushQueuedSos((p) => base44.functions.invoke('triggerSOS', p)); };
    window.addEventListener('online', flush);
    flush();
    return () => window.removeEventListener('online', flush);
  }, [ringMode]);

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
  const triggerGpsUpgrade = useCallback(async (retryQuery) => {
     // Synchronous, cross-flow deduplication gate — check this BEFORE any
     // async call or state update.
     if (locationRequestPendingRef.current) {
       setAgentMessages(prev => [...prev, {
         role: 'assistant',
         content: "I'm already getting your location — give me a moment.",
       }]);
       return;
     }
     // DIRECT sandbox short-circuit — if we're inside a restricted preview
     // iframe, the native geolocation prompt will never appear and
     // getCurrentPosition will hang.
     if (isSandboxed()) {
       setAgentMessages(prev => [...prev, {
         role: 'assistant',
         content: buildSandboxLocationMessage(bestLocationRef.current),
       }]);
       return;
     }
     locationRequestPendingRef.current = true;
     // Don't stash in pendingGpsRetryQueryRef — we handle the result inline
     // via the awaited promise, so the gpsStatus effect should be a no-op
     // for this flow (all three pending refs are null when it fires).
     pendingGpsRetryQueryRef.current = null;
     pendingLocationPinRef.current = false;
     pendingExactMapViewRef.current = false;
     locationChoiceInFlightRef.current = false;
     setAgentMessages(prev => [...prev, { role: 'assistant', content: "Getting your exact location now — one moment..." }]);

     // Await the GPS promise — requestGPS now returns a definitive result
     // ({ success, location/error }) within 5 seconds, so this never hangs.
     const result = await requestGPS(true);
     locationRequestPendingRef.current = false;

     if (result?.success && result.location) {
       // GPS succeeded — redo the original question with the fresh precise
       // location attached, or just show the location pin if there was no
       // original question.
       locationContextSentRef.current = false;
       if (retryQuery) {
         // Skip the client-side intent intercepts for this one call — the
         // retry text would otherwise re-match detectLocationConsentIntent
         // and loop back into triggerGpsUpgrade forever.
         skipLocationIntentRef.current = true;
         liveRef.current.sendAgentMessage?.(retryQuery);
       } else {
         const loc = result.location;
         const label = loc.resolved_place ? `My Location (${loc.resolved_place})` : 'My Location';
         const accuracyLine = describeAccuracy(loc.accuracy_meters);
         liveRef.current.sendAgentMessage?.(
           `Got your device location.\n${accuracyLine}\n{{maps:${label}|${loc.latitude},${loc.longitude}}}\n{{qr:${label}|${loc.latitude},${loc.longitude}}}`,
           []
         );
       }
     } else {
       // GPS failed or was denied — pivot to the approximate IP location
       // with a Maps button + nearby-care chips instead of a dead-end
       // "type your address." This is the safety-critical fallback for a
       // traveler lost in a foreign country who can't get a precise fix.
       const content = buildGpsFallbackMessage(bestLocationRef.current, result?.errorCode);
       setAgentMessages(prev => [...prev, { role: 'assistant', content }]);
     }
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
    // Same synchronous, cross-flow deduplication gate as triggerGpsUpgrade —
    // if ANY of the three GPS-triggering flows already has a request in
    // flight, don't start a second one or post a duplicate "I'll get your..."
    // bubble. Just tell the traveler it's already in progress.
    if (locationRequestPendingRef.current) {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm already getting your location — give me a moment.",
      }]);
      return;
    }
    // DIRECT sandbox short-circuit — see triggerGpsUpgrade for rationale.
    console.log('[MCareOrb] triggerExactMapView', { sandboxed: isSandboxed() });
    if (isSandboxed()) {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: buildSandboxLocationMessage(bestLocationRef.current),
      }]);
      return;
    }
    locationRequestPendingRef.current = true;
    pendingExactMapViewRef.current = true;
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
      locationRequestPendingRef.current = false;
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
    // DIRECT sandbox short-circuit — see triggerGpsUpgrade for rationale.
    if (isSandboxed()) {
      locationChoiceInFlightRef.current = false;
      setAgentMessages(prev => [...prev, { role: 'assistant', content: buildSandboxLocationMessage(bestLocationRef.current) }]);
      return;
    }
    // Synchronous, cross-flow deduplication gate — same as triggerGpsUpgrade
    // and triggerExactMapView. If a GPS request is already in flight from
    // any of the three flows, don't start a second one.
    if (locationRequestPendingRef.current) {
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm already getting your location — give me a moment.",
      }]);
      return;
    }
    locationRequestPendingRef.current = true;
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
      locationRequestPendingRef.current = false;
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

  // Lock the background page's own scroll while the full-bleed panel is
  // open — without this, the panel itself renders correctly, but the page
  // behind it (position:fixed, but the underlying document can still
  // scroll) shows a stray native scrollbar and can shift position under
  // the overlay. Restores whatever inline overflow value was there before
  // (almost always empty/default) on close, never a hardcoded 'visible'.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  // Load the user's existing M-Care conversation when they first open the orb. Once per account: the ref records
  // whose conversation was asked for. This used to re-run on its own agentLoading flag, so setting the flag re-ran
  // the effect, which cancelled the first run, and the answer was then thrown away and the flag never cleared: a
  // signed-in traveller sat on the "Welcome back" loading line, with no greeting or welcome card, and their last
  // conversation never came back (from Aug 6 until found 2026-11-06). A conversation the traveller already started
  // by typing while this loads is kept, never replaced by the older one; "New journey" stays new.
  const conversationLoadedForRef = useRef(null);
  useEffect(() => {
    if (!isAuthenticated) conversationLoadedForRef.current = null;
  }, [isAuthenticated]);
  useEffect(() => {
    const who = user?.id || user?.email || null;
    if (!open || !isAuthenticated || !who || agentConversation || conversationLoadedForRef.current === who) return;
    conversationLoadedForRef.current = who;
    setAgentLoading(true);
    base44.agents.listConversations({ agent_name: AGENT_NAME })
      .then((convos) => {
        if (conversationLoadedForRef.current !== who) return; // signed out or switched account meanwhile
        if (convos && convos.length > 0) {
          setAgentConversation((prev) => prev || convos[0]);
          setAgentMessages((prev) => (prev.length ? prev : (convos[0].messages || [])));
        }
      })
      .catch(() => {})
      .finally(() => setAgentLoading(false));
  }, [open, isAuthenticated, agentConversation, user?.id, user?.email]);

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

  // The quiet pages (a booking or payment in progress, the emergency screens) live in mcareDeepLink.js, shared with
  // AppLayout, which uses the same list when it sends ?mcare=… links to the full-screen /m-care.
  const isQuietRoute = isMcareQuietRoute(pathname);

  // Deep-link auto-open — ?mcare=open on any public page opens the panel on
  // load with no click needed, for sharing a direct "land straight in the
  // chat" link (e.g. to buildathon judges) without requiring a login-gated
  // route. Fires at most once per page load (autoOpenedRef), so navigating
  // within the app afterward never re-forces the panel open. Skipped on a
  // quiet route — those pages deliberately suppress the orb regardless.
  const autoOpenedRef = useRef(false);
  // ?mcare=pilot (the QR code at the end of an ad, e.g. /?mcare=pilot&src=ad29) opens the same panel with M-Care
  // speaking first: thanks for scanning, I'm in building mode, drop your email and phone. sendAgentMessage then
  // catches the reply and saves it through joinPilot (scripted, never the AI), tagged with the ad.
  // The exchange lives in its own list, never in agentMessages: a signed-in visitor's saved conversation and every
  // subscription tick replace agentMessages wholesale, which would wipe the greeting the moment it appeared.
  // ?mcare=partner (a partner ad, e.g. ad 30) is the same capture in words for partners; both save to the waiting
  // list tagged with the ad, and both end on a green tick.
  const pilotCaptureRef = useRef({ armed: false, campaign: '', phone: '', kind: 'pilot' });
  const [pilotMessages, setPilotMessages] = useState([]);
  const chatEmpty = agentMessages.length === 0 && pilotMessages.length === 0;
  useEffect(() => {
    if (autoOpenedRef.current || isQuietRoute) return;
    const params = new URLSearchParams(search);
    const mode = mcareDeepLinkMode(search);
    if (mode) {
      autoOpenedRef.current = true;
      setOpen(true);
      setDismissed(true);
      setStruggleHint(null);
      markJourneyEventsSeen();
      if (mode === 'pilot' || mode === 'partner') {
        pilotCaptureRef.current = { armed: true, campaign: cleanCampaignTag(params.get('src')), phone: '', kind: mode };
        setPilotMessages([{ role: 'assistant', content: pilotChatCopy(mode).greeting, created_date: new Date().toISOString() }]);
      }
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

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // "Hey M-Care" background wake phrase — opt-in only (voiceCommands.js's
  // WAKE_PHRASE_ON/OFF_PHRASES, persisted via mcarePreferences.js; zero
  // settings page, per this preference family's own "controlled by
  // speaking" design). Reuses startContinuousRecognition — the exact
  // wrapper Conversational Mode itself uses — rather than a second
  // implementation. Gated on !open by construction: Conversational Mode's
  // own listening effect only ever runs while the panel is open (see its
  // own comment above, "Closing the panel drops Conversational Mode too"),
  // so this can never be active at the same time as that one without a
  // separate mutex. isOnline/tabVisible make the confirm text's "only while
  // your screen is on and this tab is in front of you" claim literally true
  // in code, not just an assumption about browser throttling.
  const wakeStopRef = useRef(null);
  useEffect(() => {
    const shouldArm = prefs.wakePhraseEnabled
      && isConversationalModeSupported()
      && !open
      && !isQuietRoute
      && !heroBlocksOrb
      && isOnline
      && tabVisible;
    if (!shouldArm) return;

    wakeStopRef.current = startContinuousRecognition({
      lang: recognitionLocaleFor(responseLanguageRef.current),
      onFinal: (text) => {
        if (!detectWakePhrase(text)) return;
        wakeStopRef.current?.();
        wakeStopRef.current = null;
        setOpen(true);
        setDismissed(true);
        setStruggleHint(null);
        markJourneyEventsSeen();
        // conversationalMode is guaranteed false here (the panel was
        // closed, the only state this effect ever arms in) — toggling it
        // turns Conversational Mode ON, same as tapping the phone icon.
        toggleConversationalMode();
      },
      // A recognition-level error here is expected and non-actionable — the
      // effect's own gating (isOnline/tabVisible/etc.) already covers the
      // recoverable cases, and this is a background convenience feature
      // nobody explicitly asked M-Care to open yet, so no user-facing error
      // toast is warranted; it simply stays off until the gate re-arms it.
      onUnrecoverableError: () => { wakeStopRef.current = null; },
    });

    return () => {
      wakeStopRef.current?.();
      wakeStopRef.current = null;
    };
  }, [prefs.wakePhraseEnabled, open, isQuietRoute, heroBlocksOrb, isOnline, tabVisible]);

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

  // Scrolls the conversation itself, never the page around it (scrollIntoView can also move the page on an iPhone;
  // see the keyboard effect below). No target: to the newest message, at the bottom.
  const scrollChatTo = (target) => {
    const el = chatScrollRef.current;
    if (!el) return;
    const top = target ? target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12 : el.scrollHeight;
    el.scrollTo({ top, behavior: 'smooth' });
  };

  useEffect(() => {
    // Phone and tablet before a conversation (north-star redesign): stay at the
    // top, so the hero and the welcome, or a scanned ad's first sign-up message,
    // are what people see first. Once there's a conversation, follow the newest.
    // The ring screen has no hero: its conversation always follows the newest.
    if (!isDesktopPanel && !ringMode && agentMessages.length === 0 && pilotMessages.length <= 1) return;
    scrollChatTo(null);
  }, [agentMessages, journeyEvents, pilotMessages, isDesktopPanel, ringMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // The keyboard opening makes the conversation shorter; keep the newest message in view, the way a messaging app
  // does (same before-a-conversation exception as above). Sets the list's own scroll position rather than calling
  // scrollIntoView, which on an iPhone can also scroll the page under the keyboard.
  useEffect(() => {
    if (!keyboardOpen) return;
    if (agentMessages.length === 0 && pilotMessages.length <= 1) return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [keyboardOpen, mobileViewport.height]); // eslint-disable-line react-hooks/exhaustive-deps

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

        // A real barge-in during THINKING (handleBargeIn) marked the next
        // assistant reply to arrive as belonging to an abandoned turn —
        // claim it in BOTH dedup refs (spokenAssistantIdsRef so this effect
        // and the id-replace effect below never speak it later once more
        // content fills in; ackedMessageIdsRef so the id-replace effect's
        // own tool-running-ack speech can't fire for it either) and render
        // it as plain text only, never spoken or treated as the active reply.
        if (suppressNextAssistantSpeechRef.current) {
          suppressNextAssistantSpeechRef.current = false;
          claim(spokenAssistantIdsRef, msgIndex, last);
          claim(ackedMessageIdsRef, msgIndex, last);
          return;
        }

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
          const speakGen = generationGuardRef.current.current();
          speakTextNeural(speakable, {
            rate: 0.9,
            language: i18n.language,
            onWordBoundary: (count) => {
              // A barge-in that fired while this exact utterance was mid-
              // playback bumps the generation — a late-arriving word-
              // boundary callback from the now-cancelled audio must never
              // resurrect this bubble's reveal after the interruption.
              if (generationGuardRef.current.isStale(speakGen)) return;
              setRevealState(prev =>
                (prev && prev.messageIndex === msgIndex) ? { ...prev, revealedWordCount: count } : prev);
            },
            onAudioUrl: (url) => setVoiceReplyAudioUrls(prev => ({ ...prev, [msgIndex]: url })),
            onAmplitude: (level) => setSpeakingAmplitude(level),
            onEnd: () => {
              setSpeaking(false);
              setSpeakingAmplitude(null);
              setRevealState(prev => (prev && prev.messageIndex === msgIndex) ? null : prev);
              armSilenceNudge();
            },
            onError: () => {
              // Fail open: never leave the demo stuck mid-reveal on a TTS
              // failure — snap straight to full text, no error surfaced.
              setSpeaking(false);
              setSpeakingAmplitude(null);
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
    const next = [...unseen].sort((a, b) => serverTimeMs(a.created_date) - serverTimeMs(b.created_date))[0];
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
      const speakGen = generationGuardRef.current.current();
      speakTextNeural(speakable, {
        rate: 0.9,
        language: i18n.language,
        onWordBoundary: (count) => {
          if (generationGuardRef.current.isStale(speakGen)) return;
          setRevealState(prev =>
            (prev && prev.messageIndex === msgIndex) ? { ...prev, revealedWordCount: count } : prev);
        },
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

    // Tracks whether the mic picked up M-Care's own voice (or M-Care was
    // still composing a reply) during the current recognition segment.
    // SpeechRecognition finalizes a transcript AFTER the speaker goes
    // silent — so by the time onFinal fires, speakingRef/agentSendingRef
    // may already have changed, which is why this is latched the moment it
    // happens rather than re-checked only at the end. bargeInDetector
    // requires several consecutive, non-shrinking interim results before
    // confirming a REAL interruption (see createBargeInDetector) — a
    // single stray syllable bleeding through the speaker doesn't count.
    // bargeInConfirmedThisSegment latches once that happens, so onFinal
    // knows to route this utterance through the interruption-understanding
    // path instead of dropping it as echo/noise.
    let heardMcareDuringSegment = false;
    let bargeInConfirmedThisSegment = false;
    const bargeInDetector = createBargeInDetector();

    const stopRecognition = startContinuousRecognition({
      lang: recognitionLocaleFor(responseLanguageRef.current),
      onInterim: (text) => {
        const mCareActive = speakingRef.current || isNeuralSpeaking();
        const thinking = agentSendingRef.current;
        if (mCareActive || thinking) {
          heardMcareDuringSegment = true;
          // Real barge-in: while M-Care is genuinely THINKING or SPEAKING
          // (shouldInterruptOnSpeech), feed interim results into the
          // detector instead of silently discarding them — headphones make
          // this reliable; on a phone speaker, echo bleed is the real risk
          // the detector's multi-event threshold exists to filter out.
          if (!bargeInConfirmedThisSegment
            && shouldInterruptOnSpeech(deriveVoiceState({ agentSending: thinking, speaking: mCareActive }))) {
            const confirmed = bargeInDetector.observe(text);
            if (confirmed) {
              bargeInConfirmedThisSegment = true;
              bargeInDetector.reset();
              handleBargeIn();
            }
          }
          if (bargeInConfirmedThisSegment) {
            // Confirmed — reflect what's being said live, same as ordinary
            // listening, now that M-Care has actually stopped.
            clearSilenceNudge();
            setInput(text);
          }
          // Not yet confirmed: stay silent rather than leaking a partial,
          // possibly-echoed transcript into the input.
          return;
        }
        bargeInDetector.reset();
        clearSilenceNudge();
        setInput(text);
      },
      onFinal: (text) => {
        // Drop this final only if M-Care's voice/thinking was ever active
        // during the segment AND no real barge-in was confirmed (a blip,
        // not a genuine interruption) — onFinal lands after M-Care goes
        // silent, so the live speakingRef/agentSendingRef checks alone
        // can't catch this; the latched flags can.
        const wasBargeIn = bargeInConfirmedThisSegment;
        const contaminated = heardMcareDuringSegment && !wasBargeIn;
        heardMcareDuringSegment = false;
        bargeInConfirmedThisSegment = false;
        bargeInDetector.reset();
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
        // A resume phrase ("go back to the flight thing," "continue the
        // last task") can be said at any time, not only right after
        // interrupting M-Care — checked before both the barge-in-
        // understanding path and the ordinary send path.
        if (liveRef.current.tryResumeTask?.(text)) {
          resetSilenceNudge();
          return;
        }
        if (wasBargeIn) {
          liveRef.current.handleInterruptionSend?.(text);
        } else {
          liveRef.current.handleVoiceTurn?.(text);
        }
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
  // serverTimeMs reads the backend's timezone-less time as UTC; read directly it was hours off the clock it's
  // compared with, so a new update could stay "unread" for hours, or (east of UTC) never show as unread at all.
  const hasUnseenJourneyEvent = journeyEvents.some(e => serverTimeMs(e.created_date) > lastSeenJourneyEventsAt);

  // A tool call is genuinely running right now on the last assistant
  // message — the same real signal the TTS-ack effect above derives
  // (`runningTool`), recomputed here in render scope so it can also drive
  // the orb's `tool_executing` state and surface the tool's own real
  // display_projection.active_label text next to the typing indicator.
  // Never shown unless a real tool call is actually in flight.
  const lastAssistantMessage = agentMessages.length > 0 && agentMessages[agentMessages.length - 1]?.role === 'assistant'
    ? agentMessages[agentMessages.length - 1]
    : null;
  const activeRunningTool = (lastAssistantMessage?.tool_calls || []).find(tc =>
    ['pending', 'running', 'in_progress'].includes(String(tc.status || '').toLowerCase()));

  // A real, currently-active Safe-T4life safety block exists in this
  // conversation — reflects SafetyGateCard's own classification (see
  // src/lib/safetyGateStatus.js), never a second, independently-computed
  // safety decision. The orb only ever narrates what the deterministic
  // engine already decided.
  const hasActiveAlert = hasActiveSafetyAlert(agentMessages);

  // Ring screen: a tick in the ring's centre when a task that was running finishes with a success status (never for
  // a failed one). The tool call is looked up again by its id once it stops running, to read its final status.
  const prevRunningToolRef = useRef(null);
  const runningToolKey = activeRunningTool ? (activeRunningTool.id || activeRunningTool.name || 'tool') : null;
  useEffect(() => {
    const prevKey = prevRunningToolRef.current;
    prevRunningToolRef.current = runningToolKey;
    if (!ringMode || !prevKey || prevKey === runningToolKey) return;
    for (let i = agentMessages.length - 1; i >= 0; i -= 1) {
      const call = (agentMessages[i]?.tool_calls || []).find(tc => (tc.id || tc.name || 'tool') === prevKey);
      if (call) {
        if (['completed', 'success'].includes(String(call.status || '').toLowerCase())) setRingDoneToken(n => n + 1);
        break;
      }
    }
  }, [runningToolKey, agentMessages, ringMode]);

  // Ring screen: the message box also opens when it gets focus some other way (a keyboard's Tab key).
  useEffect(() => {
    if (ringMode && inputFocused) setRingTyping(true);
  }, [ringMode, inputFocused]);

  // The orb's state, highest priority first: offline overrides everything
  // (nothing else is really "live"); an active safety block is the most
  // attention-critical live-conversation fact; listening/tool-executing/
  // thinking/speaking follow the natural real-time flow; `acting` (the
  // autonomous-work signal — M-Care did something on its own in the
  // background, e.g. a driver no-show reroute fired a JourneyEvent the
  // user hasn't seen) is lowest since it's a background/idle-adjacent
  // signal, not an active conversation.
  const orbState = !isOnline
    ? 'offline'
    : hasActiveAlert
      ? 'alert'
      : (listening || (conversationalMode && conversationalListening))
        ? 'listening'
        : activeRunningTool
          ? 'tool_executing'
          : agentSending
            ? 'thinking'
            : speaking
              ? 'speaking'
              : hasUnseenJourneyEvent
                ? 'acting'
                : 'idle';

  // The explicit conversation-turn state machine (src/lib/conversationStateMachine.js),
  // computed purely for the "Listening / Understanding / Thinking / Speaking"
  // status text — orbState above (the orb's own visuals) is untouched.
  const currentVoiceState = deriveVoiceState({
    conversationalListening: conversationalMode && conversationalListening,
    agentSending,
    speaking,
  });
  const voiceStatusText = conversationalMode ? voiceStateLabel(currentVoiceState) : null;

  // Which capability-strip item (Analyze/Protect/Coordinate/Resolve) is
  // currently "lit" — reuses orbState's own real signals only, never a
  // fabricated one. Analyze = composing a reply, no tool call yet;
  // Coordinate = a real backend tool call is in flight right now (the
  // most literal "coordinating with a system" moment); Protect = the
  // same active safety-block signal driving orbState's own `alert` ring;
  // Resolve = delivering an answer (speaking) or having just completed
  // something in the background (acting/proactive). idle/listening/
  // offline light nothing — correctly, since nothing is actively being
  // "done" in those states.
  const activeCapability =
    orbState === 'thinking' ? 'Analyze'
    : orbState === 'tool_executing' ? 'Coordinate'
    : orbState === 'alert' ? 'Protect'
    : (orbState === 'speaking' || orbState === 'acting') ? 'Resolve'
    : null;

  // Offline-prep: while offline, no new tool call can succeed anyway (no
  // network), so re-surface the most recent QR/maps token M-Care already
  // generated this session — a pure client-side re-render of real data the
  // app already has, never a fabricated placeholder. null when nothing was
  // ever generated, or while online (the banner only renders offline).
  const offlineArtifact = !isOnline ? findLastMapOrQrToken(agentMessages) : null;

  useEffect(() => {
    // The overlay closes on Escape; the standalone screen ignores it (Escape mid-sentence must not leave the page).
    if (!open || standalone) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, standalone]);

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
    //
    // Deliberately NOT gated on `!fileUrls?.length` — a real bug found live:
    // a recorded voice message (handleVoiceMessage) calls this with its real
    // transcript AND a non-empty fileUrls array, so a spoken "I have chest
    // pain" was silently skipping this check entirely and reaching the real
    // agent as ordinary text instead of triggering the welfare prompt.
    // Scanning handleFileSelect's own fixed "I've uploaded: X" string here
    // too is harmless — it never matches any distress phrase.
    const distressSignal = detectDistressSignal(q);
    if (distressSignal) {
      setInput('');
      handleDistressSignal(distressSignal, q);
      return;
    }

    // Pilot sign-up after scanning an ad (?mcare=pilot): a message holding an email or phone number is saved
    // through joinPilot and answered with a fixed line, never sent to the AI. Anything else (a question) still
    // goes to the real agent below, and the capture stays armed until an email is saved.
    if (pilotCaptureRef.current.armed && !fileUrls?.length) {
      const { email, phone } = extractPilotContact(q);
      if (email || phone) {
        setInput('');
        const say = (role, content) => setPilotMessages(prev => [...prev, { role, content, created_date: new Date().toISOString() }]);
        say('user', q);
        const cap = pilotCaptureRef.current;
        if (phone) cap.phone = phone;
        if (!email) {
          say('assistant', PILOT_CHAT_NEED_EMAIL);
          return;
        }
        try {
          const res = await base44.functions.invoke('joinPilot', { email, phone: cap.phone, source: 'mcare_chat', campaign: cap.campaign });
          if (!res?.data?.ok) throw new Error('not saved');
          const copy = pilotChatCopy(cap.kind);
          pilotCaptureRef.current = { armed: false, campaign: '', phone: '', kind: 'pilot' };
          // The saved reply carries a green tick under it (rendered with pilotMessages below).
          setPilotMessages(prev => [...prev, { role: 'assistant', content: copy.saved, savedLabel: copy.savedLabel, created_date: new Date().toISOString() }]);
          // Drop the keyboard so they can read the goodbye, then close the chat on its own, unless they've started
          // typing something else. The scan link's ?mcare=pilot is removed so a refresh doesn't greet them again.
          // On the standalone screen there is nothing behind to reveal, so it just stays on M-Care, minus the link.
          chatInputRef.current?.blur();
          setTimeout(() => {
            const el = chatInputRef.current;
            if (el && (el.value || document.activeElement === el)) return;
            setOpen(false);
            const params = new URLSearchParams(window.location.search);
            params.delete('mcare');
            params.delete('src');
            const rest = params.toString();
            navigate({ pathname: window.location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
          }, PILOT_CHAT_CLOSE_DELAY_MS);
        } catch {
          say('assistant', PILOT_CHAT_FAILED);
        }
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
        } else if (command.type === 'wake_phrase') {
          // Persisted, not local-only — the background listener effect
          // above re-arms itself from prefs.wakePhraseEnabled the moment
          // this resolves, so no separate "start it now" call is needed.
          updatePrefs({ wakePhraseEnabled: command.value === 'on' });
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
    // A GPS-success retry from triggerGpsUpgrade (or triggerExactMapView's
    // gpsStatus-effect path) already has location attached — skip the
    // client-side intent intercepts for this one call so the retry text
    // reaches the real agent instead of re-triggering GPS in a loop.
    const skipLocationIntercept = skipLocationIntentRef.current;
    skipLocationIntentRef.current = false;

    if (!fileUrls?.length && !skipLocationIntercept && detectExactMapViewIntent(q)) {
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
    if (!fileUrls?.length && !skipLocationIntercept && detectLocationConsentIntent(q)) {
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

  // ── Voice turn-taking dispatch (reached only via liveRef from the
  // continuous-recognition effect above — see that effect's onFinal). Each
  // of these is a plain function, recreated fresh every render like
  // handleBargeIn/handleResumeIntent above, so the liveRef exposure below
  // always reflects the latest interruptedIntents/talkMode/sendAgentMessage
  // without needing to be listed in the recognition effect's own minimal
  // dependency array. ──

  // If the last assistant message has a live {{choices:...}} prompt and the
  // spoken text matches one of its real options, route through the exact
  // same onChoice logic a tap on that chip would use — never a separate,
  // parallel confirmation path. This is what makes a spoken "yes" during an
  // active booking/payment/consent-style prompt do exactly what tapping the
  // chip does, nothing more. Returns true if it fully handled the reply.
  const dispatchSpokenReply = (text) => {
    const lastMsg = agentMessagesRef.current[agentMessagesRef.current.length - 1];
    const choicesMatch = lastMsg?.role === 'assistant' && lastMsg.content?.match(/\{\{choices:([\s\S]*?)\}\}/);
    if (!choicesMatch) return false;
    const labels = choicesMatch[1].split('|').map((s) => s.trim()).filter(Boolean);
    const matched = matchSpokenChoice(text, labels);
    if (!matched) return false;
    if (lastMsg.__distressConfirm) { handleDistressConfirm(matched, lastMsg.__distressConfirm); return true; }
    if (lastMsg.__locationShareChoice) { handleLocationShareChoice(matched); return true; }
    if (lastMsg.content?.includes('{{choices:Yes, watch my surroundings|No thanks}}')) { handleSurroundingAwarenessConfirm(matched); return true; }
    if (detectLocationConsentIntent(matched)) { handleGpsUpgradeConfirm(matched); return true; }
    sendAgentMessage(matched);
    return true;
  };
  useEffect(() => { liveRef.current.dispatchSpokenReply = dispatchSpokenReply; });

  // An ordinary voice turn (M-Care was idle/listening — nothing to
  // interrupt): check for a live choice-prompt answer first, else send as a
  // normal message.
  const handleVoiceTurn = (text) => {
    if (dispatchSpokenReply(text)) return;
    sendAgentMessage(text);
  };
  useEffect(() => { liveRef.current.handleVoiceTurn = handleVoiceTurn; });

  // The utterance that actually confirmed a barge-in. Checks first whether
  // it answers a live choices prompt (same as handleVoiceTurn); otherwise
  // classifies it: "never_mind" drops every pending topic; "correction"
  // ("no wait, I meant...") drops only the topic this exact barge-in just
  // pushed — the user is correcting themselves, not asking to revisit what
  // M-Care was saying, so there's nothing meaningful to hold onto (an
  // older, unrelated pending topic from an earlier interruption is
  // untouched); "new_topic" (the default) leaves the stack exactly as
  // handleBargeIn() already left it, and speaks the real, requested
  // "I've paused X and am switching to Y" confirmation, built from real
  // labels only, before sending the new utterance.
  const handleInterruptionSend = (text) => {
    if (dispatchSpokenReply(text)) return;
    const classification = classifyInterruptionUtterance(text);
    const pausedTask = interruptedIntents.length > 0 ? interruptedIntents[interruptedIntents.length - 1] : null;
    if (classification === 'never_mind') {
      setInterruptedIntents(clearInterruptedIntents());
    } else if (classification === 'correction') {
      setInterruptedIntents(prev => prev.slice(0, -1));
    } else if (pausedTask) {
      const announcement = `Got it — I've paused ${shortTopicLabel(pausedTask.fullText)} and am switching to ${shortTopicLabel(text)}.`;
      setAgentMessages(prev => [...prev, { role: 'assistant', content: announcement }]);
      if (talkMode) speakAncillary(announcement, { rate: 0.9 });
    }
    sendAgentMessage(text);
  };
  useEffect(() => { liveRef.current.handleInterruptionSend = handleInterruptionSend; });

  // Checks a finalized utterance for a resume phrase against the real
  // paused-task stack, before it's routed anywhere else. Returns true (and
  // re-sends a "finish explaining X" continuation for the matched task,
  // same mechanism the InterruptedIntentChip's tap-driven "Finish it"
  // button already uses) only on a real match — never guesses on an
  // ordinary message that just happens to mention going back to something.
  const tryResumeTask = (text) => {
    if (interruptedIntents.length === 0) return false;
    const resumeIntent = detectResumeIntent(text);
    if (!resumeIntent) return false;
    const task = resumeTaskFromLabel(interruptedIntents, resumeIntent);
    if (!task) return false;
    handleResumeIntent(task);
    return true;
  };
  useEffect(() => { liveRef.current.tryResumeTask = tryResumeTask; });

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
        locationRequestPendingRef.current = false;
        sendLocationPin();
        return;
      }
      if (pendingExactMapViewRef.current) {
        pendingExactMapViewRef.current = false;
        locationRequestPendingRef.current = false;
        sendExactLocationMapMessage();
        return;
      }
      const retryText = pendingGpsRetryQueryRef.current;
      pendingGpsRetryQueryRef.current = null;
      locationRequestPendingRef.current = false;
      locationContextSentRef.current = false;
      // Skip the client-side intent intercepts for this one retry — the
      // retry text would otherwise re-match and loop back into GPS.
      skipLocationIntentRef.current = true;
      sendAgentMessage(retryText);
    } else if (gpsStatus === 'denied' || gpsStatus === 'unavailable') {
      console.log('[MCareOrb] gpsStatus effect: denied/unavailable', { gpsStatus, gpsErrorCode, hasRetry: !!pendingGpsRetryQueryRef.current, hasPin: !!pendingLocationPinRef.current, hasMap: !!pendingExactMapViewRef.current });
      clearGpsRequestTimeout();
      pendingGpsRetryQueryRef.current = null;
      pendingLocationPinRef.current = false;
      pendingExactMapViewRef.current = false;
      // Harmless if a location-choice flow wasn't the one pending (a typed-
      // question retry can also land here) — releases the Location-menu
      // double-tap guard if it was.
      locationChoiceInFlightRef.current = false;
      // Release the cross-flow dedup gate AFTER showing the error message
      // below — setAgentMessages is called first, then the ref is cleared,
      // so a genuinely NEW location request (different message, different
      // intent) can proceed, while an exact duplicate of the just-failed
      // message is still caught by the synchronous guard in
      // triggerGpsUpgrade (the ref is only cleared after this render).
      // Sandbox / restricted preview iframe — the browser blocks the native
      // geolocation prompt here entirely, so getCurrentPosition can never
      // succeed and no "Allow" popup will ever appear. useAutoLocation
      // detects this (window.self !== window.top or known preview domains)
      // and routes every failure to gpsErrorCode 'sandbox_blocked' after a
      // short 3.5s attempt. Give the honest, actionable message first and
      // confirm the approximate (IP) location is still in use — never pretend
      // we're waiting on a prompt that will never come.
      const content = gpsErrorCode === 'sandbox_blocked'
        ? buildSandboxLocationMessage(bestLocationRef.current)
        : buildGpsFallbackMessage(bestLocationRef.current, gpsErrorCode === 'denied' ? 1 : gpsErrorCode);
      setAgentMessages(prev => [...prev, { role: 'assistant', content }]);
      locationRequestPendingRef.current = false;
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

  // The ring screen's Talk button: one tap starts a live voice conversation (Conversational Mode, which also has
  // M-Care speak its replies), the next tap ends it, voice replies included. A pure toggle, so the double tap for SOS
  // (RingScreen) can undo the first tap by calling it again. Where the browser can't listen, Talk opens the message
  // box instead, which has the voice-note mic.
  const ringTalk = () => {
    if (!isConversationalModeSupported()) {
      setRingTyping(true);
      chatInputRef.current?.focus();
      return;
    }
    setConversationalMode(v => {
      const next = !v;
      if (next) {
        setTalkMode(true);
      } else {
        autoResumeConversationalRef.current = false;
        setTalkMode(false);
        stopAllSpeech();
        setRevealState(null);
      }
      return next;
    });
  };
  // Type: the message box opens with the cursor in it, during the tap, so a phone brings up its keyboard.
  const ringType = () => {
    setRingTyping(true);
    chatInputRef.current?.focus();
  };
  const closeRingTyping = useCallback(() => {
    setRingTyping(false);
    chatInputRef.current?.blur();
  }, []);

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

  const { suggestion: ghostSuggestion, clearSuggestion: clearGhostSuggestion } = useGhostTextSuggestion({
    text: input,
    disabled: agentSending || agentUploading || !isOnline,
    inputRef: chatInputRef,
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && ghostSuggestion) {
      e.preventDefault();
      setInput(buildAcceptedText(input, ghostSuggestion));
      clearGhostSuggestion();
      return;
    }
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
    { label: 'Find Doctors', icon: Stethoscope, run: () => sendAgentMessage('Help me find a verified doctor') },
    { label: 'Safety Check', icon: Shield, run: () => sendAgentMessage('Run a safety check for my procedure') },
    { label: 'My Journey', icon: Luggage, run: () => sendAgentMessage('Show me my trips') },
  ];
  // The remaining chips (below) still exist and still work exactly as
  // before — the mobile redesign (2026-08-28) just groups them behind a
  // "More" button instead of showing all 4-6 chips in one row, matching the
  // reference screenshot's 4-pill layout (Find Doctors / Safety Check / My
  // Journey / More). Desktop's empty-state row is untouched and still shows
  // every chip inline, so nothing here changes desktop's own quickChips.push
  // usage below.
  const moreChips = [
    { label: 'Emergency Help', icon: Siren, run: () => sendAgentMessage('I need emergency help') },
    { label: 'Visa Help', icon: FileText, run: () => sendAgentMessage('I need help with a visa') },
    { label: 'Medical Research', icon: Newspaper, run: () => { setOpen(false); navigate('/evidence-watch'); } },
  ];
  quickChips.push(...moreChips);
  if (canBecomePartner) { quickChips.push({ label: 'Become a partner', icon: Briefcase, run: () => { setOpen(false); navigate('/partner-signup'); } }); moreChips.push(quickChips[quickChips.length - 1]); }
  if (!isAuthenticated) { quickChips.push({ label: 'Sign in to book', icon: LogIn, run: () => base44.auth.redirectToLogin(window.location.pathname) }); moreChips.push(quickChips[quickChips.length - 1]); }

  // ── North-star redesign (2026-11-01): what the phone screen knows, all real. ──
  // The visitor's country comes from their own connection (useAutoLocation's
  // approximate IP lookup), the trip from their CaseRecord. "At destination"
  // only when both are known and match, so "Welcome to Brazil!" is never said
  // to someone who isn't there.
  const visitorCountryCode = countryCodeFrom(ipLocation, bestLocation);
  const visitorCountryName = countryLabel(visitorCountryCode, ipLocation?.country || bestLocation?.country || '');
  const tripCountryCode = countryCodeFrom(activeCaseRecord?.procedure_country);
  const hasTrip = !!activeCaseRecord?.id;
  const atDestination = hasTrip && !!tripCountryCode && tripCountryCode === visitorCountryCode;
  const tripLabel = tripCountryCode ? countryLabel(tripCountryCode, activeCaseRecord?.procedure_country || '') : (activeCaseRecord?.procedure_country || '');
  const unseenJourneyEvents = journeyEvents.filter(e => serverTimeMs(e.created_date) > lastSeenJourneyEventsAt);
  const unseenJourneyCount = unseenJourneyEvents.length;
  const welcomeBase = welcomeCopy({
    atDestination, hasTrip, tripLabel,
    countryName: visitorCountryName,
    flag: deviceShowsFlagEmoji() ? flagEmoji(visitorCountryCode) : '',
    firstName: user?.full_name?.trim()?.split(/\s+/)[0] || '',
  });
  // A brand-new signed-out visitor gets one of the six first-open lines as the welcome card's text (see the
  // first-open greeting above). The card names its speaker "M-Care", so the line does too.
  const welcome = (!user && !hasTrip && firstOpenGreeting)
    ? { ...welcomeBase, body: buildFirstOpenGreeting({ ...firstOpenGreeting, name: 'M-Care' }) }
    : welcomeBase;
  const latestAlertEvent = pickLatestAlert(journeyEvents);
  const welcomeAlert = latestAlertEvent ? { text: latestAlertEvent.message_text, ago: timeAgo(latestAlertEvent.created_date) } : null;
  const welcomePlaces = savedPlacesFrom(activeCaseRecord);

  // The phone screen's three shortcuts, as in the mockup: View Map (your real
  // device location on a map), Safety Check, and Talk live (M-Care's real live
  // voice mode; "Ask Jarvis" in the mockup is Marvel's name). Find Doctors and
  // My Journey move into More; Services in the bottom bar still opens Find
  // Doctors. The laptop layout keeps quickChips as it was.
  const stackedChips = [
    { label: 'View Map', icon: MapPin, run: () => triggerExactMapView() },
    { label: 'Safety Check', icon: ShieldCheck, run: () => sendAgentMessage('Run a safety check for my procedure') },
  ];
  if (isConversationalModeSupported()) {
    stackedChips.push({ label: conversationalMode ? 'Live now' : 'Talk live', icon: Headphones, run: toggleConversationalMode, active: conversationalMode });
  }
  const stackedMoreChips = [
    ...quickChips.filter(c => c.label === 'Find Doctors' || c.label === 'My Journey'),
    ...moreChips,
  ];

  const currentTip = struggleHint || tips[tipIdx];

  // Header status pill reflects live / paused / offline (preserves prior state
  // signaling) — colors switched to a translucent wash-on-dark, matching the
  // AI SUPER AGENTIC purple pill's existing pattern, now that the panel itself
  // is dark (round 4).
  // bgLight/fgLight (2026-08-28): the same 3 states, tuned for the new white
  // mobile panel — read via pillsRowBlock below when !isDesktopPanel.
  const statusPill = paused
    ? { text: 'PAUSED', bg: 'rgba(245,158,11,0.14)', fg: '#FBBF24', dot: '#F59E0B', bgLight: 'rgba(245,158,11,0.14)', fgLight: '#B45309' }
    : isOnline
      // "LIVE SESSION" (not "LIVE AGENT") per Portia's own explicit round-3
      // correction and the reference image itself — a concurrent bot commit
      // reverted this text to round 1's original wording; kept the correct,
      // already-confirmed value here rather than the regression.
      ? { text: 'LIVE SESSION', bg: 'rgba(34,197,94,0.14)', fg: '#4ADE80', dot: '#22C55E', bgLight: 'rgba(34,197,94,0.16)', fgLight: '#15803D' }
      : { text: 'OFFLINE', bg: 'rgba(156,163,175,0.14)', fg: '#D1D5DB', dot: '#9CA3AF', bgLight: 'rgba(148,163,184,0.16)', fgLight: '#475569' };

  // ── Panel body pieces, shared verbatim between the desktop 3-column
  // layout and the mobile stacked layout below (>= 768px vs. < 768px —
  // see isDesktopPanel above). Each piece is the exact same JSX either
  // layout already used before this split — extracted so the two arrangements
  // can reuse it instead of drifting into two copies of the same logic. ──
  // Desktop-light gets a real serif treatment ("elegant serif title" per
  // Portia's spec) via the app's own global --font-serif token (already
  // loads Cormorant Garamond, src/index.css) plus the fuller subtitle
  // string — both gated on isDesktopPanel so mobile's copy/font stay
  // byte-identical to before.
  //
  // Design upgrade (2026-10-31): one wordmark at every size — the brand serif,
  // which phones never had (they showed a bold sans, so the product looked like
  // two products). On the stacked layout the line under the name swaps to
  // M-Safe's real live state while it is busy ("Thinking…", the running tool's
  // own label, "Safety note: please read"), the way a messaging app shows
  // "typing…" under a contact; idle shows the normal name. orbStateLabel only
  // reads orbState/activeRunningTool, so nothing here is invented.
  const liveState = orbStateLabel(orbState, activeRunningTool?.display_projection?.active_label);
  const liveStateColor = !liveState ? null
    : liveState.tone === 'caution' ? (useDarkTheme ? '#FBBF24' : CAUTION_INK)
    : (useDarkTheme ? '#E8C85C' : GOLD_INK);
  const liveStateLine = liveState && (
    <span role="status" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, maxWidth: '100%', color: liveStateColor, fontWeight: 600 }}>
      <span aria-hidden="true" className={liveState.tone === 'active' ? 'ms-live-dot' : undefined} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: liveState.tone === 'caution' ? '#F59E0B' : GOLD }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{liveState.text}</span>
    </span>
  );
  const titleSubtitleBlock = (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: WORDMARK_FONT, fontSize: isDesktopPanel ? TYPE.wordmarkDesktop : TYPE.wordmarkMobile, fontWeight: 700, letterSpacing: '-0.01em', color: useDarkTheme ? TEXT_LIGHT : LIGHT_TEXT, lineHeight: 1.05 }}>
        M-Safe<span style={{ color: (isDesktopPanel && !useDarkTheme) ? DESKTOP_LUXURY_GOLD : GOLD, fontSize: isDesktopPanel ? 21 : 18, fontWeight: 700, marginLeft: 1 }}>+</span>
      </p>
      <p style={{ margin: '3px 0 0', fontSize: isDesktopPanel ? 13 : TYPE.subtitle, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, minHeight: 17, display: 'flex', minWidth: 0 }}>
        {isDesktopPanel ? 'M-Care Super Agent • Medical + Travel Concierge' : (liveStateLine || 'M-Care Super Agent')}
      </p>
    </div>
  );

  const mutedIconColor = useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED;
  // One shape for every header control: a round tap target (was a 24px box,
  // too small to hit reliably), gold wash + gold icon when switched on.
  const ctrlSize = isDesktopPanel ? 34 : 36;
  const ctrlBtn = (on = false) => ({
    width: ctrlSize, height: ctrlSize, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: on ? GOLD_WASH : 'transparent', color: on ? (useDarkTheme ? GOLD : GOLD_INK) : mutedIconColor,
  });
  const ctrlIcon = { width: 18, height: 18 };
  const headerControlsBlock = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, marginRight: -6 }}>
      {isConversationalModeSupported() && (
        <button onClick={toggleConversationalMode} className="ms-press ms-ctrl"
          title={conversationalMode ? 'Live conversation on — tap to stop' : 'Start a live voice conversation (best with headphones)'}
          aria-label="Toggle conversation mode" aria-pressed={conversationalMode}
          style={ctrlBtn(conversationalMode)}>
          {conversationalMode ? <PhoneCall style={ctrlIcon} /> : <Phone style={ctrlIcon} />}
        </button>
      )}
      {isSpeechSupported() && (
        <button onClick={() => toggleTalkMode()} className="ms-press ms-ctrl" title={talkMode ? 'Talk mode on — tap to turn off' : 'Talk mode off — tap to turn on'} aria-label="Toggle talk mode" aria-pressed={talkMode}
          style={ctrlBtn(talkMode)}>
          {talkMode ? <Volume2 style={ctrlIcon} /> : <VolumeX style={ctrlIcon} />}
        </button>
      )}
      {agentMessages.length > 0 && (
        <button onClick={startNewJourney} className="ms-press ms-ctrl" title="New journey" aria-label="New journey" style={ctrlBtn()}>
          <RotateCcw style={ctrlIcon} />
        </button>
      )}
      {/* Light/dark toggle — desktop only. Mobile already has its own
          fixed light theme (see useDarkTheme above), so this is meaningless
          there. Persisted (see desktopLightMode above), not a per-session
          reset. */}
      {isDesktopPanel && (
        <button onClick={() => setDesktopLightMode(v => !v)} className="ms-press ms-ctrl" title={desktopLightMode ? 'Switch to dark' : 'Switch to light'} aria-label={desktopLightMode ? 'Switch to dark mode' : 'Switch to light mode'} style={ctrlBtn()}>
          {desktopLightMode ? <Moon style={ctrlIcon} /> : <Sun style={ctrlIcon} />}
        </button>
      )}
      {/* Expand/collapse is meaningless once mobile is always full-bleed
          (see the panel sizing below) — shown on desktop only, where the
          centered-card vs. wider-card distinction still applies. */}
      {/* The standalone screen is always full size, so it has nothing to expand into. */}
      {isDesktopPanel && !standalone && (
        <button onClick={() => setExpanded(v => !v)} className="ms-press ms-ctrl" title={expanded ? 'Collapse' : 'Expand'} aria-label={expanded ? 'Collapse' : 'Expand'} style={ctrlBtn()}>
          {expanded ? <Minimize2 style={ctrlIcon} /> : <Maximize2 style={ctrlIcon} />}
        </button>
      )}
      <button onClick={closePanel} className="ms-press ms-ctrl" title="Close" aria-label="Close" style={ctrlBtn()}>
        <X style={{ width: 20, height: 20 }} />
      </button>
    </div>
  );

  // Round 4's translucent-wash pills were tuned against a dark panel — their
  // light foreground text (e.g. #B4A2FF purple) is illegible on the new
  // white mobile panel. isDesktopPanel keeps the exact original values;
  // mobile gets a stronger wash + a darker foreground for the same hue.
  //
  // 2026-08-29: on mobile the two main pills (LIVE SESSION + AI SUPER
  // AGENTIC) were wide enough at the original size that they wrapped onto
  // two separate rows in the narrow text column next to the robot — the
  // reference image shows them fitting side-by-side on one line. Shrinking
  // padding/font/icon/dot size (mobile only, via these consts) closes that
  // gap; desktop reads the exact same values as before (pillPad='4px 10px',
  // pillFont=11, pillIconSize=12, pillDotSize=7), byte-identical.
  const pillPad = isDesktopPanel ? '4px 10px' : '4px 9px';
  const pillFont = isDesktopPanel ? 11 : 10;
  const pillDotSize = isDesktopPanel ? 7 : 6;
  // Phone and tablet hero (the laptop shows standaloneStatusPill instead).
  // North-star redesign (2026-11-01): one glowing status pill, as in the
  // mockup. "LIVE • Trip active" only when the traveler really is in their
  // trip's destination country (atDestination above), and then it opens their
  // journey; otherwise the usual LIVE SESSION / PAUSED / OFFLINE. The decorative
  // AI SUPER AGENTIC pill is gone; the subtitle says "AI" now.
  const liveNow = !paused && isOnline;
  const stackedStatusText = liveNow && atDestination ? 'LIVE • Trip active' : statusPill.text;
  /** @type {React.CSSProperties} */
  const statusPillStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, color: statusPill.fg,
    // The state's tint over dark glass, so it reads over any country photo.
    background: `linear-gradient(${statusPill.bg}, ${statusPill.bg}), rgba(6,11,22,0.72)`,
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${statusPill.dot}80`, borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700,
    whiteSpace: 'nowrap', boxShadow: `0 0 18px ${statusPill.dot}2E`,
  };
  const statusPillInner = (
    <>
      <span aria-hidden="true" className={liveNow ? 'ms-live-dot' : undefined} style={{ width: 9, height: 9, borderRadius: '50%', background: statusPill.dot, boxShadow: `0 0 8px ${statusPill.dot}` }} />
      <span>{stackedStatusText}</span>
      {liveNow && atDestination && <ChevronRight aria-hidden="true" style={{ width: 16, height: 16 }} />}
    </>
  );
  const smallPillStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' };
  const pillsRowBlock = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
      {liveNow && atDestination ? (
        <button type="button" onClick={() => { navigate('/dashboard/journey'); setOpen(false); }} className="ms-press"
          aria-label="Trip active. Open my journey" style={{ ...statusPillStyle, cursor: 'pointer' }}>
          {statusPillInner}
        </button>
      ) : (
        <span style={statusPillStyle}>{statusPillInner}</span>
      )}
      {privateMode && (
        <span style={{ ...smallPillStyle, background: 'rgba(99,102,241,0.18)', color: '#C7D2FE' }}>
          <Shield style={{ width: 12, height: 12 }} /> PRIVATE
        </span>
      )}
      {voiceStatusText && (
        <span style={{ ...smallPillStyle, background: 'rgba(212,175,55,0.16)', color: NIGHT.goldInk }}>
          {voiceStatusText}
        </span>
      )}
      {responseLanguage && (
        <span style={{ ...smallPillStyle, background: 'rgba(255,255,255,0.08)', color: NIGHT.ink, textTransform: 'uppercase' }}>
          {responseLanguage}
        </span>
      )}
    </div>
  );

  // Standalone LIVE SESSION / PAUSED / OFFLINE pill — used alone (no AI SUPER
  // AGENTIC / PRIVATE / voice / language pills alongside it) in the desktop
  // left panel and the desktop chat-column header, matching the reference
  // image, which shows only this one pill in both spots. pillsRowBlock
  // (above) is kept unchanged for mobile's hero row, which still bundles
  // every pill.
  const standaloneStatusPill = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: useDarkTheme ? statusPill.bg : statusPill.bgLight, color: useDarkTheme ? statusPill.fg : statusPill.fgLight, borderRadius: 999, padding: pillPad, fontSize: pillFont, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: pillDotSize, height: pillDotSize, borderRadius: '50%', background: statusPill.dot }} /> {statusPill.text}
    </span>
  );

  // Capability row — each item lights up when it's the real, currently-active
  // capability (see activeCapability above), never a fabricated highlight.
  // Mobile (2026-08-28): wrapped in a white card with subtitles, matching the
  // reference screenshot's "floating capability card." Desktop's own inline
  // row (no card, no subtitles) is completely unchanged.
  //
  // Design upgrade (2026-10-31): all four in brand gold. Two used to be a pale
  // mint (#36DDB2 at 80%), barely visible on white, and green is reserved for
  // "this is fine" states. Labels went from 10/9px to 11.5/10.5px.
  // Icons match the north-star mockup (2026-11-01): a scan for Analyze, a
  // checked shield for Protect, a map pin for Coordinate, a handshake for Resolve.
  const CAPABILITY_ITEMS = [
    { icon: ScanSearch, label: 'Analyze', subtitle: 'Intelligence' },
    { icon: ShieldCheck, label: 'Protect', subtitle: 'Safety First' },
    { icon: MapPin, label: 'Coordinate', subtitle: 'Everything' },
    { icon: Handshake, label: 'Resolve', subtitle: 'Peace of Mind' },
  ];
  // Phone and tablet only (the laptop uses desktopCapabilityPillsRow below).
  // North-star redesign (2026-11-01): frosted navy glass with a gold edge,
  // thin dividers, gold-outlined icons, as in the mockup.
  const capabilityItemsRow = (
    <div style={{ display: 'flex' }}>
      {CAPABILITY_ITEMS.map(({ icon: Icon, label, subtitle }, i) => {
        const active = label === activeCapability;
        return (
          <div key={label} aria-current={active ? 'step' : undefined} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 4px', borderLeft: i ? `1px solid ${GLASS.hairline}` : 'none' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${active ? GOLD : 'rgba(212,175,55,0.62)'}`,
              background: active ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.04)',
              boxShadow: active ? '0 0 0 4px rgba(212,175,55,0.12), 0 0 16px rgba(212,175,55,0.45)' : 'none',
              color: active ? '#F5D97A' : GOLD,
              transition: 'background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
            }}>
              <Icon style={{ width: 19, height: 19 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#F5D97A' : NIGHT.ink, textAlign: 'center', lineHeight: 1.15 }}>{label}</span>
            <span style={{ fontSize: 11.5, color: NIGHT.muted, textAlign: 'center', lineHeight: 1.15 }}>{subtitle}</span>
          </div>
        );
      })}
    </div>
  );
  const capabilityRowBlock = (
    <div style={{ marginTop: 14, width: '100%', boxSizing: 'border-box', background: GLASS.card, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur, border: `1px solid ${GLASS.edge}`, borderRadius: 24, boxShadow: GLASS.shadow, padding: '14px 6px 12px' }}>
      {capabilityItemsRow}
    </div>
  );

  // Desktop-only reference-match variant (2026-08-29): the same
  // CAPABILITY_ITEMS + active/ringColor highlighting logic as
  // capabilityItemsRow above, just laid out as icon+label pills side by side
  // instead of an icon-in-a-circle with the label below — matching the
  // reference image's left-panel capability row. capabilityItemsRow itself is
  // untouched so mobile's card-wrapped circle version keeps rendering exactly
  // as before.
  const desktopCapabilityPillsRow = (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {CAPABILITY_ITEMS.map(({ icon: Icon, label }) => {
        const active = label === activeCapability;
        const ringColor = GOLD;
        return (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
            border: active ? `1px solid ${ringColor}` : `1px solid ${ringColor}59`,
            background: active ? `${ringColor}3D` : `${ringColor}14`,
            boxShadow: active ? `0 0 8px ${ringColor}88` : 'none',
            transition: 'all 0.25s ease',
          }}>
            <Icon style={{ width: 13, height: 13, color: useDarkTheme ? (active ? '#F5D97A' : '#C9A227') : (active ? ringColor : `${ringColor}CC`) }} />
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 600, color: useDarkTheme ? (active ? '#F5D97A' : TEXT_MUTED_DARK) : LIGHT_TEXT, whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  // One shortcut-chip style for every layout (it was 12px grey-icon chips on
  // laptops and 12px gold-icon chips on phones): 40px tall, 13px label, gold
  // icon, press/hover feedback via the ms-press/ms-chip classes below.
  /** @type {React.CSSProperties} */
  const chipStyle = {
    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 40, padding: '0 12px',
    border: `1px solid ${useDarkTheme ? BORDER_DARK : LIGHT_BORDER}`, background: useDarkTheme ? CARD_BG : LIGHT_CARD,
    borderRadius: RADIUS.pill, fontSize: TYPE.chip, fontWeight: 600, color: useDarkTheme ? '#E5E7EB' : LIGHT_TEXT,
    cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: useDarkTheme ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
  };
  const chipIconStyle = { width: 15, height: 15, color: GOLD, flexShrink: 0 };
  // Phone and tablet chips (north-star redesign, 2026-11-01): dark glass with a
  // gold outline; an active one (Talk live while on) fills with gold wash.
  // Sized so all three fit across a 390 px phone, as in the mockup.
  /** @type {React.CSSProperties} */
  const stackedChipStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 0 auto', minHeight: 44,
    // Text and padding shrink a little on the narrowest phones so all three still fit.
    padding: '0 clamp(7px, 2.4vw, 12px)', fontSize: 'clamp(12.5px, 3.6vw, 13.5px)',
    border: '1.5px solid rgba(212,175,55,0.72)', background: 'rgba(14,23,37,0.72)', borderRadius: RADIUS.pill,
    fontWeight: 600, color: NIGHT.ink, cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.25)',
  };
  const stackedChipActive = { background: 'rgba(212,175,55,0.18)', borderColor: GOLD, color: NIGHT.goldInk };

  // ── Phone and tablet header and hero (north-star redesign, 2026-11-01) ──
  // The big hero (robot on its gold rings, M-Safe+, status pill, tagline,
  // capability card) scrolls with the welcome card before a conversation
  // starts; once there are messages a slim robot-and-name row stays pinned
  // instead, so the robot's listening/speaking states stay in view.
  const heroExpanded = agentMessages.length === 0;
  const HERO_TEXT_SHADOW = '0 1px 10px rgba(0,0,0,0.55)';
  const headerIconBtn = (extra = {}) => ({ ...ctrlBtn(), width: TOUCH, height: TOUCH, color: NIGHT.ink, ...extra });
  const robotProps = {
    state: orbState, flashToken: bargeInFlashToken, inputFocused, activityOverride: testActivityOverride,
    gazeOverride: testGazeOverride, blinkTrigger: testBlinkTrigger,
    amplitude: testAmplitude != null ? testAmplitude : speakingAmplitude,
  };
  const stackedWordmark = (size) => (
    <p style={{ margin: 0, fontFamily: WORDMARK_FONT, fontSize: size, fontWeight: 800, letterSpacing: '-0.02em', color: NIGHT.ink, lineHeight: 1.05, textShadow: HERO_TEXT_SHADOW }}>
      M-Safe<span style={{ color: GOLD, marginLeft: 2 }}>+</span>
    </p>
  );
  const stackedSubtitle = (size) => (
    <p style={{ margin: '5px 0 0', fontSize: size, color: NIGHT.ink, minHeight: Math.round(size * 1.3), display: 'flex', minWidth: 0, textShadow: HERO_TEXT_SHADOW }}>
      {liveStateLine || 'Your AI Travel Companion'}
    </p>
  );
  const stackedHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0, padding: `6px max(10px, calc((100% - ${STACKED_MAX_WIDTH + 12}px) / 2))`, paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <img src="/morales-m-mark.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 10px rgba(212,175,55,0.35))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.08, minWidth: 0 }}>
          <span style={{ fontFamily: BRAND_SERIF, fontSize: 20, fontWeight: 700, letterSpacing: '0.16em', color: NIGHT.ink, textShadow: HERO_TEXT_SHADOW }}>M-CARE</span>
          <span style={{ fontFamily: BRAND_SERIF, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.17em', color: GOLD, textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: HERO_TEXT_SHADOW }}>Medical Travel Safety</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginRight: -4, flexShrink: 0 }}>
        {isSpeechSupported() && (
          <button onClick={() => toggleTalkMode()} className="ms-press ms-ctrl" title={talkMode ? 'Reading replies aloud, tap to stop' : 'Read replies aloud'} aria-label="Toggle talk mode" aria-pressed={talkMode}
            style={headerIconBtn(talkMode ? { background: GOLD_WASH, color: GOLD } : {})}>
            {talkMode ? <Volume2 style={ctrlIcon} /> : <VolumeX style={ctrlIcon} />}
          </button>
        )}
        {agentMessages.length > 0 && (
          <button onClick={startNewJourney} className="ms-press ms-ctrl" title="New journey" aria-label="New journey" style={headerIconBtn()}>
            <RotateCcw style={ctrlIcon} />
          </button>
        )}
        {/* Journey updates sit in the conversation by time now, so this jumps to the first unread one (or the
            latest update), not just the bottom. journeyEvents is newest-first. */}
        <button onClick={() => {
          const target = unseenJourneyEvents[unseenJourneyEvents.length - 1] || journeyEvents[0];
          const node = target?.id ? chatScrollRef.current?.querySelector(`[data-journey-event-id="${String(target.id).replace(/["\\]/g, '')}"]`) : null;
          scrollChatTo(node || null);
          markJourneyEventsSeen();
        }}
          aria-label={unseenJourneyCount ? `Notifications, ${unseenJourneyCount} new` : 'Notifications'} className="ms-press ms-ctrl" style={headerIconBtn({ position: 'relative' })}>
          <Bell style={{ width: 23, height: 23 }} />
          {unseenJourneyCount > 0 && (
            <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 1, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, background: '#EF4444', color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${NIGHT.canvas}` }}>
              {unseenJourneyCount > 9 ? '9+' : unseenJourneyCount}
            </span>
          )}
        </button>
        <button onClick={closePanel} className="ms-press ms-ctrl" title="Close" aria-label="Close" style={headerIconBtn()}>
          <X style={{ width: 22, height: 22 }} />
        </button>
      </div>
    </div>
  );
  const stackedHero = (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flexShrink: 0, width: 128, display: 'flex', justifyContent: 'center' }}>
          <LivingOrb {...robotProps} size={122} naturalAspect />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {stackedWordmark(32)}
          {stackedSubtitle(16)}
          {pillsRowBlock}
          <p style={{ margin: '10px 0 0', fontSize: 15, fontStyle: 'italic', color: 'rgba(243,245,247,0.9)', textShadow: HERO_TEXT_SHADOW }}>{TAGLINE}</p>
        </div>
      </div>
      {capabilityRowBlock}
    </div>
  );
  const stackedCompactHero = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, padding: `0 max(16px, calc((100% - ${STACKED_MAX_WIDTH}px) / 2)) 10px` }}>
      <div style={{ flexShrink: 0 }}>
        <LivingOrb {...robotProps} size={54} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {stackedWordmark(22)}
        {stackedSubtitle(14)}
        {pillsRowBlock}
      </div>
    </div>
  );

  // The big scrolling area (journey tracker + greeting/messages/journey
  // events/typing/offline banner) plus the interrupted-intent chip and smart
  // suggestions — identical in both layouts. The input bar is deliberately
  // NOT part of this block (see inputBarBlock below) so it can render as a
  // single full-width row under the whole 3-column area on desktop.
  // The ring screen's replies carry a small golden ring instead of the robot: the ring is M-Care's only face there.
  const ringAvatar = ringMode ? <RingAvatar /> : null;
  // The line under the ring: what M-Care is really doing right now (orbStateLabel), or that the device is offline.
  const ringStatus = orbStateLabel(orbState, activeRunningTool?.display_projection?.active_label)
    || (!isOnline ? { text: "You're offline", tone: 'caution' } : null);
  const chatMain = (
    <>
      {/* While typing on a phone the journey tracker steps aside too, so the conversation keeps the space. The ring
          screen leaves it out: the ring and the line under it say what M-Care is doing. */}
      {agentMessages.length > 0 && !keyboardOpen && !ringMode && (
        <JourneyStageTracker messages={agentMessages} />
      )}

      {/* Stacked layout: side padding grows on tablets so the conversation stays a readable centred column
          (STACKED_MAX_WIDTH); on phones it is the same 14px as before. */}
      {/* Phone and tablet: transparent, so the country photo fixed behind the top of the screen shows through
          while the hero and messages scroll over it. */}
      {/* overscroll-behavior: contain keeps a fling at the top or bottom of the conversation from scrolling
          anything outside it. */}
      <div ref={chatScrollRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: isDesktopPanel ? '14px 14px' : `${heroExpanded ? 4 : 12}px max(14px, calc((100% - ${STACKED_MAX_WIDTH}px) / 2)) 22px`,
        display: 'flex', flexDirection: 'column', gap: 12, background: !isDesktopPanel ? 'transparent' : (useDarkTheme ? DARK : LIGHT_BG),
        // A soft fade where the scrolling content meets the shortcut chips, instead of a hard cut. On the ring screen
        // the conversation also fades out at its top, where it flows up under the ring.
        ...(ringMode
          ? { WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 36px, #000 calc(100% - 14px), transparent)', maskImage: 'linear-gradient(to bottom, transparent, #000 36px, #000 calc(100% - 14px), transparent)' }
          : !isDesktopPanel ? { WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 18px), transparent)', maskImage: 'linear-gradient(to bottom, #000 calc(100% - 18px), transparent)' } : {}),
      }}>
        {!isDesktopPanel && heroExpanded && !keyboardOpen && !ringMode && stackedHero}
        {chatEmpty && !agentLoading && (
          <>
            {/* A small decorative "•••" accent above the greeting, echoing
                the reference image's own mark — desktop-only so the mobile
                layout stays byte-identical to before this split. Purely
                visual, not a real carousel (nothing else here pages
                through content). */}
            {isDesktopPanel && (
              <div style={{ display: 'flex', gap: 5, paddingLeft: 42, marginBottom: -2 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, opacity: 0.4 + i * 0.15 }} />
                ))}
              </div>
            )}
            {/* Same avatar size, corner, padding and 14px text as every reply bubble (MessageBubble), so the
                first message doesn't look like it came from a different product. The phone screen shows the
                north-star welcome card instead (MSafeWelcomeCard: real alerts and saved places only). */}
            {isDesktopPanel ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
                <McareAvatar size={28} />
                <p style={{ margin: 0, fontSize: TYPE.body, color: useDarkTheme ? TEXT_LIGHT : LIGHT_TEXT, lineHeight: 1.55, background: useDarkTheme ? CARD_BG : LIGHT_CARD, border: `1px solid ${useDarkTheme ? BORDER_DARK : LIGHT_BORDER}`, borderRadius: RADIUS.bubble, padding: '12px 16px', maxWidth: '85%', boxShadow: useDarkTheme ? 'none' : '0 2px 8px rgba(15,23,42,0.05)' }}>
                  {(() => {
                    const firstName = user?.full_name?.trim()?.split(/\s+/)[0];
                    if (firstName) return `Welcome back, ${firstName}. ${GREETING}`;
                  // 'M-Safe' is the name this panel shows (see GREETING above).
                  if (!user && firstOpenGreeting) return buildFirstOpenGreeting({ ...firstOpenGreeting, name: 'M-Safe' });
                  return GREETING;
                  })()}
                </p>
              </div>
            ) : (
              <MSafeWelcomeCard
                title={welcome.title}
                body={welcome.body}
                timeLabel={new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                hasTrip={hasTrip}
                alert={welcomeAlert}
                places={welcomePlaces}
                onOpenPlaces={welcomePlaces.length ? () => sendAgentMessage('Show my hotel and clinic on the map') : null}
              />
            )}
            {wakeOfferVisible && (
              <WakePhraseOfferCard
                dark={useDarkTheme}
                inset={isDesktopPanel}
                onTurnOn={() => answerWakeOffer(true)}
                onDismiss={() => answerWakeOffer(false)}
              />
            )}
            {/* Desktop keeps its original empty-state chip row (all chips,
                inline). Mobile (2026-08-28) shows its persistent 3-chip +
                "More" row instead — always visible above the composer, not
                gated to the empty state — see quickChipsRowBlock below the
                input bar, so nothing renders twice here on mobile. */}
            {isDesktopPanel && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 36 }}>
                {quickChips.map(c => (
                  <button key={c.label} onClick={c.run} className="ms-press ms-chip" style={chipStyle}>
                    <c.icon style={chipIconStyle} /> {c.label}
                  </button>
                ))}
              </div>
            )}
            {/* The ring screen has only History, Talk and Type at the bottom, so its first next steps are offered
                here, inside the conversation: the same real shortcuts as the phone screen's. */}
            {ringMode && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {quickChips.slice(0, 3).map(c => (
                  <button key={c.label} onClick={c.run} className="ms-press ms-chip" style={stackedChipStyle}>
                    <c.icon style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} /> {c.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {agentLoading && chatEmpty && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
            {ringAvatar || <LivingOrb state={orbState} size={28} flashToken={bargeInFlashToken} />}
            <span style={{ fontSize: 12, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, fontStyle: 'italic' }}>
              {(() => { const fn = user?.full_name?.trim()?.split(/\s+/)[0]; return fn ? `Welcome back, ${fn}.` : 'Ready when you are.'; })()}
            </span>
          </div>
        )}

        {/* One timeline, in the order things happened. The conversation with the agent, the scan-an-ad sign-up
            (?mcare=pilot / partner) and M-Care's journey updates are three separate lists (each declaration says
            why), and used to be drawn one list after another: after a QR scan every new reply landed above the scan
            greeting, so the chat read upside down. mergeTimeline interleaves them by time without reordering any
            list; an agent message keeps its own index i, which revealUpTo and extraAudioUrl are keyed by. */}
        {mergeTimeline([
          agentMessages.map((m, i) => ({ kind: 'agent', m, i })),
          pilotMessages.map((m, i) => ({ kind: 'pilot', m, i })),
          // journeyEvents comes newest-first; the merge needs each list oldest-first.
          [...journeyEvents].reverse().map((e) => ({ kind: 'journey', e })),
        ], (item) => (item.kind === 'journey' ? item.e.created_date : item.m.created_date)).map((item) => {
          if (item.kind === 'agent') {
            const { m, i } = item;
            return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble message={m} accent={(isDesktopPanel && !useDarkTheme) ? DESKTOP_LUXURY_USER_GRADIENT : GOLD_GRADIENT} showAvatar avatar={ringAvatar} showMeta showAssistantMeta assistantMetaLabel={ringMode ? 'M-Care' : 'M-Safe'} showReaction
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
            );
          }

          // The scan-an-ad sign-up (?mcare=pilot): its own list, so neither the saved conversation loading in nor a
          // subscription tick can wipe it, and agentMessages' indices are untouched.
          if (item.kind === 'pilot') {
            const { m, i } = item;
            return (
          <motion.div key={`pilot-${i}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble message={m} accent={(isDesktopPanel && !useDarkTheme) ? DESKTOP_LUXURY_USER_GRADIENT : GOLD_GRADIENT} showAvatar avatar={ringAvatar} showMeta showAssistantMeta assistantMetaLabel={ringMode ? 'M-Care' : 'M-Safe'} />
            {m.savedLabel && (
              <motion.div
                role="status"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.15 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px 44px', padding: '8px 14px 8px 10px', width: 'fit-content', borderRadius: 999, background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', fontSize: 14, fontWeight: 700 }}
              >
                <CheckCircle2 size={20} strokeWidth={2.5} aria-hidden="true" />
                {m.savedLabel}
              </motion.div>
            )}
          </motion.div>
            );
          }

          // Proactive M-Care updates: real JourneyEvent records, polled every 20s (and live), never spliced into
          // agentMessages (see the hook declarations above for why). data-journey-event-id lets the bell jump here.
          const { e } = item;
          return (
          <motion.div key={`je-${e.id}`} data-journey-event-id={e.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ fontSize: 10, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', paddingLeft: 42, marginBottom: 2 }}>
              M-Care checked in
            </div>
            <MessageBubble message={{ role: 'assistant', content: e.message_text, created_date: e.created_date }} accent={(isDesktopPanel && !useDarkTheme) ? DESKTOP_LUXURY_USER_GRADIENT : GOLD_GRADIENT} showAvatar avatar={ringAvatar} showMeta showAssistantMeta assistantMetaLabel={ringMode ? 'M-Care' : 'M-Safe'} />
          </motion.div>
          );
        })}

        {/* Mobile (2026-08-28): the fuller LiveActivityCard, matching the
            reference screenshot's "Searching & Verifying" card — but title/
            subtitle are always derived from the same real orbState/
            activeRunningTool data the desktop row below already uses, never
            a hardcoded claim about what's specifically being checked (see
            LiveActivityCard.jsx's own header comment). Desktop keeps its
            existing minimal row, completely unchanged. */}
        {!isDesktopPanel && !ringMode && (
          <LiveActivityCard theme="night" visible={!!(agentSending || activeRunningTool)} orbState={orbState} activeRunningTool={activeRunningTool} />
        )}
        {isDesktopPanel && (agentSending || activeRunningTool) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
            <LivingOrb state={orbState} size={28} flashToken={bargeInFlashToken} />
            <span style={{ fontSize: 12, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, fontStyle: 'italic' }}>
              {orbState === 'thinking'
                ? '● ● ●  Understanding your journey…'
                : (activeRunningTool?.display_projection?.active_label || 'M-Safe is coordinating…')}
            </span>
          </div>
        )}

        {/* Offline banner — kept as its own amber-on-dark warning treatment
            (not re-themed to gold) so it stays distinct from the brand
            accent and reads as "pay attention," matching this app's
            established amber = warning convention elsewhere. */}
        {/* Light screens get their own amber treatment: the dark-panel colours (cream text on a brown wash)
            were close to invisible on the white phone panel, at exactly the moment the warning matters. */}
        {!isOnline && (
          <div role="status" style={{ borderRadius: RADIUS.bubble, border: `1px solid ${useDarkTheme ? 'rgba(253,230,138,0.35)' : '#FCD34D'}`, background: useDarkTheme ? 'rgba(120,53,15,0.25)' : '#FFFBEB', padding: '12px 14px' }}>
            <div style={{ fontSize: TYPE.label, fontWeight: 700, color: useDarkTheme ? '#FBBF24' : CAUTION_INK, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('guide.offline_badge')}
            </div>
            {offlineArtifact ? (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: useDarkTheme ? '#FDE9C7' : '#78350F' }}>
                  Here's what I already prepared before the connection dropped:
                </p>
                <InlineQrBlock label={offlineArtifact.label} dest={offlineArtifact.dest} />
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: useDarkTheme ? '#FDE9C7' : '#78350F' }}>
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
        onApplyCorrection={(fixed) => setInput(fixed)}
      />

      {/* Persistent quick-actions row (2026-08-28) — mobile only, always
          visible just above the composer (not gated to the empty state,
          unlike desktop's own inline row rendered above). Same real
          quickChips array/handlers, just the first 3 plus a "More" reveal
          for the rest — matches the reference screenshot's 4-pill layout. */}
      {/* Design upgrade (2026-10-31): "More" is pinned at the right so it is always on screen (it used to sit
          past the edge on every phone, with "My Journey" cut in half and no sign the row scrolled). The three
          shortcuts scroll in their own lane, which fades at its edge to show there is more to swipe. */}
      {/* North-star redesign (2026-11-01): the mockup's three gold-outlined dark chips across the row. Everything
          else (Find Doctors, My Journey, Emergency Help, Visa Help, Medical Research, partner sign-up, sign in)
          is one tap away under Services in the bottom bar, which opens this same list. On the narrowest phones
          the lane scrolls, and its edge fades to show it. */}
      {!isDesktopPanel && !keyboardOpen && !ringMode && (
        <div style={{ position: 'relative', flexShrink: 0, padding: `6px max(14px, calc((100% - ${STACKED_MAX_WIDTH}px) / 2)) 2px` }}>
          {moreChipsOpen && (
            <div id="msafe-services-list" style={{ marginBottom: 8, background: GLASS.cardStrong, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur, border: `1px solid ${GLASS.edge}`, borderRadius: RADIUS.card, boxShadow: GLASS.shadow, overflow: 'hidden' }}>
              {stackedMoreChips.map((c, idx) => (
                <button key={c.label} onClick={() => { setMoreChipsOpen(false); c.run(); }} className="ms-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 48, textAlign: 'left', border: 'none', borderBottom: idx === stackedMoreChips.length - 1 ? 'none' : `1px solid ${GLASS.hairline}`, background: 'none', padding: '0 16px', fontSize: 15, fontWeight: 500, color: NIGHT.ink, cursor: 'pointer' }}>
                  <c.icon style={{ width: 17, height: 17, color: GOLD, flexShrink: 0 }} /> {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="ms-chip-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 1px' }}>
            {stackedChips.map(c => (
              <button key={c.label} onClick={c.run} className="ms-press ms-chip" aria-pressed={c.active ? true : undefined}
                style={{ ...stackedChipStyle, ...(c.active ? stackedChipActive : null) }}>
                <c.icon style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} /> {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Input — "clean, floating input bar," full-width across the very bottom
  // of the panel on desktop (per the widescreen layout ask), and the last
  // element of the single stacked column on mobile — same JSX either way.
  //
  // Design upgrade (2026-10-31): one composer shape everywhere — a rounded
  // pill field, round attach/mic/send buttons (phones had square ones), a gold
  // ring while typing. The stacked layout's bar keeps 14px under it so the
  // bottom bar's raised orb (lifted 10px) never overlaps the field (it did by
  // a few px).
  const inputFieldStyle = {
    width: '100%', minHeight: 44, boxSizing: 'border-box',
    background: useDarkTheme ? CARD_BG : (isDesktopPanel ? DESKTOP_LUXURY_BG : LIGHT_BG),
    border: `1px solid ${inputFocused ? GOLD : (useDarkTheme ? BORDER_DARK : (isDesktopPanel ? `${DESKTOP_LUXURY_GOLD}40` : LIGHT_BORDER))}`,
    boxShadow: inputFocused ? '0 0 0 3px rgba(212,175,55,0.18)' : 'none',
    // The same glow, handed to the .ms-composer-input rule: that rule has to use !important to beat the app-wide
    // ring, which would otherwise strip this field's own glow along with it.
    '--ms-composer-glow': '0 0 0 3px rgba(212,175,55,0.18)',
    borderRadius: 22, padding: '10px 16px', fontSize: isDesktopPanel ? TYPE.body : 16,
    color: useDarkTheme ? TEXT_LIGHT : LIGHT_TEXT, outline: 'none', position: 'relative',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };
  const canSend = !!input.trim() && !agentSending;

  // Phone and tablet composer (north-star redesign, 2026-11-01): one frosted
  // pill holding the paperclip, the text box and a gold disc that is the mic
  // while the box is empty and the send button once there's text, as in the
  // mockup. While a voice note records, the recording strip takes the whole bar.
  const showMic = isOnline && !conversationalMode && !input.trim();
  const stackedComposer = (
    <div style={{ padding: `6px max(14px, calc((100% - ${STACKED_MAX_WIDTH}px) / 2)) ${keyboardOpen ? 8 : 14}px`, flexShrink: 0 }}>
      <div style={recordingVoice ? { display: 'flex', alignItems: 'center', gap: 8, minHeight: 58 } : {
        display: 'flex', alignItems: 'center', gap: 4, minHeight: 58, boxSizing: 'border-box',
        background: GLASS.cardStrong, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur,
        // The one focus ring for the message box: a thin gold edge and a soft glow on the whole pill, for touch and
        // keyboard alike. The box inside skips the app-wide ring (.ms-composer-input), which used to draw a second,
        // thick gold rectangle inside this one.
        // 60% gold still reads at better than 3:1 against the navy pill, the contrast a focus edge needs.
        border: `1px solid ${inputFocused ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.14)'}`,
        boxShadow: inputFocused ? `0 0 0 2px rgba(212,175,55,0.10), ${GLASS.shadow}` : GLASS.shadow,
        borderRadius: 999, padding: '6px 6px 6px 8px', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}>
        {!recordingVoice && (
          <AddImageMenu
            variant="icon"
            menuTheme="dark"
            shape="circle"
            triggerIcon={Paperclip}
            onDeviceFile={handleFileSelect}
            onVaultClick={() => vaultRef.current?.open()}
            onLocationClick={handleLocationMenuClick}
            onUnsupported={(msg) => toast({ title: 'Attach', description: msg })}
            disabled={agentSending || agentUploading}
            uploading={agentUploading}
          />
        )}
        <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={handleVaulted} />
        {!recordingVoice && (
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <GhostTextOverlay
              typedText={input}
              suggestion={ghostSuggestion}
              matchStyle={{ borderRadius: 0, padding: '10px 6px', fontSize: 16, color: NIGHT.ink }}
            />
            <input
              ref={chatInputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onPaste={(e) => handleChatPaste(e, { onFile: handleFileSelect, disabled: agentSending || agentUploading, onError: (msg) => toast({ title: 'Paste', description: msg, variant: 'destructive' }) })}
              placeholder={conversationalMode ? 'Listening…' : isOnline ? (agentUploading ? 'Uploading…' : (ringMode ? 'Message M-Care…' : 'Message M-Safe…')) : t('guide.placeholder_offline')}
              enterKeyHint="send"
              aria-label={ringMode ? 'Message M-Care' : 'Message M-Safe'}
              className="ms-composer-input"
              // 16px: iPhone zooms the page into any text box smaller than that.
              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', padding: '10px 6px', fontSize: 16, color: NIGHT.ink, position: 'relative' }}
            />
          </div>
        )}
        {showMic ? (
          <VoiceMessageRecorder
            disabled={agentSending || agentUploading}
            onSend={handleVoiceMessage}
            onError={handleVoiceMessageError}
            theme="dark"
            idleShape="circle"
            idleVariant="gold"
            onRecordingChange={setRecordingVoice}
          />
        ) : (
          <button onClick={() => sendAgentMessage()} disabled={!canSend} aria-label="Send message" className={canSend ? 'ms-press' : undefined}
            style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: canSend ? 'radial-gradient(circle at 35% 30%, #F6DE8A, #D4AF37 55%, #B8912A)' : 'rgba(255,255,255,0.08)',
              boxShadow: canSend ? '0 0 0 1px rgba(255,255,255,0.18) inset, 0 4px 18px rgba(212,175,55,0.45)' : 'none',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <Send style={{ width: 19, height: 19, color: canSend ? '#0A1020' : NIGHT.muted }} />
          </button>
        )}
      </div>
    </div>
  );

  const inputBarBlock = !isDesktopPanel ? stackedComposer : (
    <div style={{ padding: isDesktopPanel ? '10px 14px' : `8px max(14px, calc((100% - ${STACKED_MAX_WIDTH}px) / 2)) ${keyboardOpen ? 8 : 14}px`, borderTop: `1px solid ${useDarkTheme ? BORDER_DARK : (isDesktopPanel ? `${DESKTOP_LUXURY_GOLD}33` : LIGHT_BORDER)}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: useDarkTheme ? PANEL_BG : (isDesktopPanel ? DESKTOP_LUXURY_BG : LIGHT_CARD) }}>
      <AddImageMenu
        variant="icon"
        menuTheme={useDarkTheme ? 'dark' : 'light'}
        shape="circle"
        onDeviceFile={handleFileSelect}
        onVaultClick={() => vaultRef.current?.open()}
        onLocationClick={handleLocationMenuClick}
        onUnsupported={(msg) => toast({ title: 'Attach', description: msg })}
        disabled={agentSending || agentUploading}
        uploading={agentUploading}
      />
      <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={handleVaulted} />
      <div style={{ position: 'relative', flex: 1 }}>
        <GhostTextOverlay
          typedText={input}
          suggestion={ghostSuggestion}
          matchStyle={{ borderRadius: 22, padding: '10px 16px', fontSize: isDesktopPanel ? TYPE.body : 16, color: useDarkTheme ? TEXT_LIGHT : LIGHT_TEXT }}
        />
        <input
          ref={chatInputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onPaste={(e) => handleChatPaste(e, { onFile: handleFileSelect, disabled: agentSending || agentUploading, onError: (msg) => toast({ title: 'Paste', description: msg, variant: 'destructive' }) })}
          // Phones get a shorter hint so it isn't cut off at 16px on a narrow screen.
          placeholder={conversationalMode ? 'Listening…' : isOnline ? (agentUploading ? "Uploading…" : (isDesktopPanel ? "Ask M-Safe anything..." : "Message M-Safe")) : t('guide.placeholder_offline')}
          // The phone keyboard's return key reads "send", like a messaging app.
          enterKeyHint="send"
          // 16px on phones: iPhone zooms the whole page into any text box smaller than that, which pushed the send
          // button off-screen and broke the layout. Desktop keeps its smaller size.
          aria-label="Message M-Safe"
          // Focus shows as this field's own gold edge and glow (inputFieldStyle), not the app-wide ring as well.
          className="ms-composer-input"
          style={inputFieldStyle}
        />
      </div>
      {isOnline && !conversationalMode && (
        <VoiceMessageRecorder
          disabled={agentSending || agentUploading}
          onSend={handleVoiceMessage}
          onError={handleVoiceMessageError}
          theme={useDarkTheme ? 'dark' : 'light'}
          idleShape="circle"
        />
      )}
      <button onClick={() => sendAgentMessage()} disabled={!canSend} aria-label="Send message" className={canSend ? 'ms-press' : undefined}
        style={{ width: TOUCH, height: TOUCH, borderRadius: '50%', flexShrink: 0, background: canSend ? ((isDesktopPanel && !useDarkTheme) ? DESKTOP_LUXURY_GOLD : GOLD) : (useDarkTheme ? BORDER_DARK : LIGHT_BORDER), border: 'none', cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: canSend ? '0 2px 10px rgba(212,175,55,0.35)' : 'none', transition: 'background 0.2s ease, box-shadow 0.2s ease' }}
      >
        <Send style={{ width: 17, height: 17, color: canSend ? '#0C1A1D' : (useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED) }} />
      </button>
    </div>
  );

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

      {/* ── Phone and tablet: a solid layer of the panel's own navy under it, filling the whole screen ──
          The panel is pinned to the visible area above the keyboard (mobileViewport). On an iPhone, Safari floats
          its address pill and the up/down/done bar in see-through glass between that area and the keyboard, and
          the website underneath showed through the gap. This layer is what shows there now. */}
      <AnimatePresence>
      {open && !isDesktopPanel && (
        <motion.div
          key="msafe-underlay"
          aria-hidden="true"
          initial={standalone ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, minHeight: '100lvh', zIndex: 9001, background: NIGHT.canvas }}
        />
      )}
      </AnimatePresence>

      {/* ── M-Safe chat panel ── */}
      <AnimatePresence>
      {open && (
        <motion.div
          onClick={standalone ? undefined : () => setOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed', zIndex: 9001,
            // Phone: pinned to the visible area (see mobileViewport above) so the keyboard never covers it.
            ...(!isDesktopPanel && mobileViewport.height
              ? { top: mobileViewport.offsetTop, left: 0, right: 0, height: mobileViewport.height }
              : { inset: 0 }),
            // Desktop-light: a soft ivory/gold wash instead of the plain
            // dark scrim, per the "full-screen softly blurred luxury
            // interior background" spec — a zero-dependency CSS gradient,
            // not a new external image asset (no local clinic/interior
            // photo exists under public/, confirmed via Glob before this
            // edit; deliberately not a hardcoded external URL either, to
            // avoid the exact risk already flagged for /m-care's own
            // MSafeWorkspace.jsx background). Dark mode and mobile keep the
            // original plain scrim exactly as before.
            // The standalone screen has no website behind it to dim, so this layer is the page itself: solid,
            // nothing to blur.
            background: standalone
              ? (isDesktopPanel ? (useDarkTheme ? STANDALONE_PAGE_DARK : STANDALONE_PAGE_LIGHT) : NIGHT.canvas)
              : (isDesktopPanel && !useDarkTheme)
                ? 'radial-gradient(circle at 50% 30%, rgba(248,247,242,0.55), rgba(210,169,61,0.20) 55%, rgba(15,23,42,0.45) 100%)'
                : 'rgba(15,23,42,0.45)',
            backdropFilter: standalone ? 'none' : 'blur(4px)', WebkitBackdropFilter: standalone ? 'none' : 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isDesktopPanel ? 16 : 0,
          }}
        >
        <motion.div
          className={useDarkTheme ? 'dark' : ''}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
          style={{ transition: 'width 0.25s ease, height 0.25s ease',
            // Widescreen 3-column layout at >= 768px (~1306px wide, a 16:5-ish
            // ratio matching the reference image). Mobile (2026-08-28) goes
            // full-bleed edge-to-edge, matching the reference screenshot's
            // true full-screen framing — no card margin, no rounded corners,
            // `expanded` becomes a no-op there (nothing left to expand into).
            width: isDesktopPanel
              ? ((expanded || standalone) ? 'min(1500px, 98vw)' : 'min(1306px, 96vw)')
              : '100vw',
            // Phone and tablet: the north-star navy canvas. The shared bubbles,
            // safety cards and journey tracker draw from the app's colour
            // variables, so they're pointed at the same navy here (NIGHT in
            // panelPalette.js) instead of the app's default teal-dark.
            ...(!isDesktopPanel ? {
              '--background': '221 57% 5%',
              '--foreground': '210 20% 96%',
              '--card': '217 45% 10%',
              '--card-foreground': '210 20% 96%',
              '--popover': '217 45% 10%',
              '--popover-foreground': '210 20% 96%',
              '--secondary': '216 41% 13%',
              '--muted': '216 41% 13%',
              '--muted-foreground': '210 13% 65%',
              '--border': '211 30% 19%',
              '--input': '211 30% 19%',
            } : {}),
            background: !isDesktopPanel ? NIGHT.canvas : (useDarkTheme ? PANEL_BG : DESKTOP_LUXURY_BG),
            border: !isDesktopPanel ? 'none' : `1px solid ${useDarkTheme ? BORDER_DARK : `${DESKTOP_LUXURY_GOLD}33`}`,
            borderRadius: isDesktopPanel ? 16 : 0,
            boxShadow: !isDesktopPanel ? 'none' : (useDarkTheme ? `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.08)` : `0 24px 64px rgba(15,23,42,0.10), 0 0 0 1px rgba(210,169,61,0.14)`),
            display: 'flex', flexDirection: 'column',
            height: isDesktopPanel
              ? ((expanded || standalone) ? '92vh' : 'min(80vh, 640px)')
              : (mobileViewport.height ? `${mobileViewport.height}px` : '100dvh'),
            overflow: 'hidden' }}>

          {isDesktopPanel ? (
            <>
              {/* Widescreen 2-column layout (2026-08-29, matching the
                  reference image): a merged left panel (title, robot,
                  capability pills, status) + a wider chat column with a
                  real in-flow header row — replaces the previous 3-column
                  robot | identity | chat split. Every piece here is the
                  exact same JSX/logic the narrow mobile layout below uses
                  too (titleSubtitleBlock/capabilityItemsRow/
                  standaloneStatusPill/headerControlsBlock/chatMain/
                  inputBarBlock, all defined above, before this return) —
                  only the arrangement differs. pillsRowBlock (AI SUPER
                  AGENTIC / PRIVATE / voice / language pills) is
                  deliberately not rendered here — the reference shows only
                  the one status pill; mobile keeps pillsRowBlock
                  unchanged. */}
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ width: '38%', flexShrink: 0, borderRight: `1px solid ${useDarkTheme ? BORDER_DARK : `${DESKTOP_LUXURY_GOLD}33`}`, background: useDarkTheme ? 'linear-gradient(180deg, rgba(42,63,74,0.14), transparent)' : DESKTOP_LUXURY_BG, backgroundImage: useDarkTheme ? undefined : 'radial-gradient(rgba(210,169,61,0.10) 1px, transparent 1px)', backgroundSize: useDarkTheme ? undefined : '18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 18px', overflowY: 'auto' }}>
                  <div style={{ alignSelf: 'flex-start', textAlign: 'left', width: '100%' }}>
                    {titleSubtitleBlock}
                  </div>
                  {/* Robot: dark mode keeps the original bare orb,
                      naturalAspect: the real robot photo isn't square
                      (~1.16:1) — width-constrained with auto height.
                      2026-08-29 follow-up history: this column briefly wore
                      the msafe-plus HologramPlatform ring/bloom visual
                      underneath the robot, then had its motion reduced to
                      "eyes animation only," then Portia asked for the rings
                      and the glowing shadow/base lines to be removed
                      outright, just the robot — HologramPlatform is no
                      longer rendered here at all (still used unmodified by
                      /m-care's own MSafeIdentityColumn.jsx). LivingOrb's
                      `eyesOnly` still zeroes its own tilt/breathing pulse
                      plus RobotAvatarImage's head-turn — blink + gaze are
                      the only motion left for this composition. */}
                  {useDarkTheme ? (
                    <div style={{ marginTop: 20 }}>
                      <LivingOrb state={orbState} size={280} flashToken={bargeInFlashToken} naturalAspect inputFocused={inputFocused} activityOverride={testActivityOverride} gazeOverride={testGazeOverride} blinkTrigger={testBlinkTrigger} amplitude={testAmplitude != null ? testAmplitude : speakingAmplitude} />
                    </div>
                  ) : (
                    <div style={{ marginTop: 20 }}>
                      <LivingOrb
                        state={orbState}
                        size={190}
                        flashToken={bargeInFlashToken}
                        naturalAspect
                        inputFocused={inputFocused}
                        activityOverride={testActivityOverride}
                        gazeOverride={testGazeOverride}
                        blinkTrigger={testBlinkTrigger}
                        amplitude={testAmplitude != null ? testAmplitude : speakingAmplitude}
                        eyesOnly
                        suppressAtmosphere
                      />
                    </div>
                  )}
                  {/* TEMPORARY, dev-only test panel — forces each robot
                      activityState on demand so it can be visually
                      verified without waiting for a narrow live-agent
                      window (e.g. "speaking" only lasts a couple seconds).
                      import.meta.env.DEV is Vite's own build-time flag —
                      this entire block is compiled out of the production
                      bundle, no separate flag/env var needed. Re-clicking
                      the active button releases the override back to the
                      real, computed state. 2026-08-23 layered-cutout round:
                      extended with a Blink trigger, a gaze-direction cycle,
                      and a simulated-amplitude slider so the new real eye
                      movement + amplitude-reactive overlays can be verified
                      the same on-demand way, without a live mic/TTS call.
                      2026-08-29: collapsed behind a <details> disclosure so
                      it no longer visually competes with the real capability
                      pills below — still fully DEV-gated, never deleted. */}
                  {import.meta.env.DEV && (
                    <details style={{ width: '100%', marginTop: 10 }}>
                      <summary style={{ fontSize: 10, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, cursor: 'pointer', textAlign: 'center', listStyle: 'none', userSelect: 'none' }}>
                        Dev robot controls
                      </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14, width: '100%' }}>
                        {[
                          { key: 'idle', label: 'Idle' },
                          { key: 'listening', label: 'Listen' },
                          { key: 'thinking', label: 'Think' },
                          { key: 'speaking', label: 'Speak' },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            data-testid={`robot-test-${key}`}
                            onClick={() => setTestActivityOverride(prev => (prev === key ? null : key))}
                            style={{
                              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${testActivityOverride === key ? GOLD : BORDER_DARK}`,
                              background: testActivityOverride === key ? 'rgba(212,175,55,0.18)' : 'transparent',
                              color: testActivityOverride === key ? GOLD : TEXT_MUTED_DARK,
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6, width: '100%' }}>
                        <button
                          type="button"
                          data-testid="robot-test-blink"
                          onClick={() => setTestBlinkTrigger(t => t + 1)}
                          style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${BORDER_DARK}`, background: 'transparent', color: TEXT_MUTED_DARK, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          Blink
                        </button>
                        {['left', 'right'].map(dir => (
                          <button
                            key={dir}
                            type="button"
                            data-testid={`robot-test-gaze-${dir}`}
                            onClick={() => setTestGazeOverride(prev => (prev === dir ? null : dir))}
                            style={{
                              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${testGazeOverride === dir ? GOLD : BORDER_DARK}`,
                              background: testGazeOverride === dir ? 'rgba(212,175,55,0.18)' : 'transparent',
                              color: testGazeOverride === dir ? GOLD : TEXT_MUTED_DARK,
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                          >
                            {dir === 'left' ? 'Look L' : 'Look R'}
                          </button>
                        ))}
                        <button
                          type="button"
                          data-testid="robot-test-amp"
                          onClick={() => setTestAmplitude(v => (v == null ? 0.15 : null))}
                          style={{
                            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${testAmplitude != null ? GOLD : BORDER_DARK}`,
                            background: testAmplitude != null ? 'rgba(212,175,55,0.18)' : 'transparent',
                            color: testAmplitude != null ? GOLD : TEXT_MUTED_DARK,
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          Amp
                        </button>
                      </div>
                      {testAmplitude != null && (
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.02}
                          value={testAmplitude}
                          data-testid="robot-test-amp-slider"
                          onChange={e => setTestAmplitude(Number(e.target.value))}
                          style={{ width: '80%', marginTop: 6 }}
                        />
                      )}
                    </div>
                    </details>
                  )}
                  <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                    {useDarkTheme ? desktopCapabilityPillsRow : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                        {CAPABILITIES.map(cap => (
                          <CapabilityPill key={cap.id} label={cap.label} icon={cap.icon} active={cap.label === activeCapability} onClick={() => sendAgentMessage(cap.intent)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    {useDarkTheme ? standaloneStatusPill : <LiveSessionBadge />}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${useDarkTheme ? BORDER_DARK : `${DESKTOP_LUXURY_GOLD}33`}`, flexShrink: 0 }}>
                    <McareAvatar size={28} />
                    {/* The part after the name swaps to the real live state while M-Safe is busy (see liveState). */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 14, fontWeight: 700, color: useDarkTheme ? TEXT_LIGHT : LIGHT_TEXT, whiteSpace: 'nowrap' }}>
                      <span style={{ flexShrink: 0 }}>M-Safe</span>
                      <span style={{ fontWeight: 400, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, flexShrink: 0 }}>•</span>
                      {liveStateLine || <span style={{ fontWeight: 400, color: useDarkTheme ? TEXT_MUTED_DARK : LIGHT_TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis' }}>M-Care Super Agent</span>}
                    </span>
                    {useDarkTheme ? standaloneStatusPill : <LiveSessionBadge />}
                    <div style={{ marginLeft: 'auto' }}>{headerControlsBlock}</div>
                  </div>
                  {chatMain}
                </div>
              </div>

              {inputBarBlock}
            </>
          ) : ringMode ? (
            // M-Care's own app as the Living Ring (Nov 7): the ring, the conversation flowing up under it, and only
            // History, Talk and Type. Everything it shows comes from what M-Care is really doing (see RingScreen).
            <RingScreen
              orbState={orbState}
              toolName={activeRunningTool?.name || null}
              statusText={ringStatus?.text || ''}
              statusTone={ringStatus?.tone || 'active'}
              amplitude={speakingAmplitude}
              hasConversation={!chatEmpty}
              busy={!!(agentSending || activeRunningTool || speaking || conversationalMode || recordingVoice || agentUploading || inputFocused || hasActiveAlert)}
              activityKey={`${agentMessages.length}:${pilotMessages.length}:${journeyEvents.length}`}
              doneToken={ringDoneToken}
              talkActive={conversationalMode}
              talkDelayed={!isConversationalModeSupported()}
              talkHint={isConversationalModeSupported() ? 'Speak naturally to M-Care' : 'Type, or send a voice note'}
              typing={ringTyping}
              canCloseTyping={!input.trim() && !recordingVoice && !agentUploading}
              onCloseTyping={closeRingTyping}
              onTalk={ringTalk}
              onType={ringType}
              onHistory={() => navigate('/m-care/history')}
              onSos={sendRingSos}
              sosSending={ringSosSending}
              conversation={chatMain}
              composer={stackedComposer}
            />
          ) : (
            // Phone and tablet, north-star redesign (2026-11-01, Portia's mockup):
            // the visitor's country photo is fixed behind the top of the screen
            // and everything scrolls over it. Header (logo, read-aloud, new
            // journey, notifications, close) stays put. Before a conversation the
            // big hero scrolls with the welcome card (see chatMain); during one, a
            // slim robot-and-name row is pinned under the header. While the
            // keyboard is up the hero, shortcut chips and bottom bar step aside.
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroExpanded ? 'clamp(440px, 70%, 820px)' : 'min(260px, 40%)', pointerEvents: 'none', zIndex: 0, transition: 'height 0.35s ease' }}>
                <CountryBackdrop code={visitorCountryCode} />
              </div>
              {/* The side padding keeps everything clear of the notch when the phone is on its side (zero upright). */}
              <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
                {/* With very little room above the keyboard the header steps aside; the spacer keeps the conversation
                    clear of the status bar in a home-screen install, where the page runs under it. */}
                {compactKeyboard
                  ? <div aria-hidden="true" style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0 }} />
                  : stackedHeader}
                {!heroExpanded && !keyboardOpen && stackedCompactHero}
                {chatMain}
                {inputBarBlock}
                {!keyboardOpen && (
                  <MSafeBottomNav
                    orbState={orbState}
                    // In the overlay, Home closes M-Care back to the page; the standalone screen has no page under
                    // it, so Home goes to the home page (the bar's four outer buttons are all ways out of M-Safe).
                    onHome={standalone ? () => navigate('/') : () => setOpen(false)}
                    onJourney={() => { navigate('/dashboard/journey'); setOpen(false); }}
                    onServices={() => setMoreChipsOpen(v => !v)}
                    servicesOpen={moreChipsOpen}
                    onProfile={() => { navigate('/dashboard'); setOpen(false); }}
                  />
                )}
              </div>
            </div>
          )}
        </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <style>{`
        @keyframes orbBubbleIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes mcareBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes mcarePanelIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:none; } }
        /* Design upgrade (2026-10-31): one touch response for every M-Safe control. Hover/focus rules use
           !important only because the controls' base colours are inline styles. */
        .ms-press { transition: transform 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; -webkit-tap-highlight-color: transparent; }
        .ms-press:active { transform: scale(0.96); }
        .ms-press:focus-visible, .ms-row:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
        /* The message box. Browsers count every tap into a text field as :focus-visible, so the app-wide ring in
           index.css drew a thick gold rectangle plus a dark halo inside the composer, on top of the composer's own
           gold focus edge. The composer's edge and glow are this box's focus ring, for keyboard users too, so the
           box itself skips the app-wide one. !important only because that rule uses it. */
        .ms-composer-input:focus-visible { outline: none !important; box-shadow: var(--ms-composer-glow, none) !important; }
        .ms-ctrl:hover { background-color: rgba(212,175,55,0.12) !important; }
        .ms-chip:hover { border-color: rgba(212,175,55,0.65) !important; box-shadow: 0 2px 10px rgba(212,175,55,0.16) !important; }
        .ms-row:hover, .ms-row:active { background-color: rgba(212,175,55,0.08) !important; }
        .ms-chip-scroll::-webkit-scrollbar { display: none; }
        .ms-live-dot { animation: msLiveDot 1.6s ease-in-out infinite; }
        @keyframes msLiveDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @media (prefers-reduced-motion: reduce) {
          .ms-press { transition: none; }
          .ms-press:active { transform: none; }
          .ms-live-dot { animation: none; }
        }
      `}</style>

      <LocationPermissionGate
        open={showLocationGate}
        onAllow={() => { setShowLocationGate(false); requestGPS(true); }}
        onCancel={() => setShowLocationGate(false)}
      />
    </>
  );
}