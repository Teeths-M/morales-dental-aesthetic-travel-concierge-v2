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
import { Send, RotateCcw, Maximize2, Minimize2, X, LogIn, Stethoscope, Briefcase, Shield, Luggage, Siren, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceInputButton from './VoiceInputButton';
import LivingOrb from './LivingOrb';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import SmartInputSuggestions from '@/components/mcare-agent/SmartInputSuggestions';
import MCareVaultUpload, { DOC_LABEL } from '@/components/mcare-agent/MCareVaultUpload';
import { isSystemPaused } from '@/lib/systemPause';
import { friendlyError } from '@/lib/friendlyError';
import { handleChatPaste } from '@/lib/chatPaste';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/i18n';
import { STRUGGLE_HINT_EVENT } from '@/lib/struggleHint';

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
  const { t }             = useTranslation();
  const { toast }         = useToast();
  const { user }          = useAuth();
  const { pathname }      = useLocation();
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
  const [listening,  setListening]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [dismissed,  setDismissed]   = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [struggleHint, setStruggleHint] = useState(null);
  const [expanded,   setExpanded]   = useState(false);
  const [agentUploading, setAgentUploading] = useState(false);
  const bottomRef = useRef(null);
  const vaultRef = useRef(null);

  // ── M-Care super-agent conversation (synced with base44/agents/m_care.jsonc) ──
  const [agentConversation, setAgentConversation] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentSending, setAgentSending] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);

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

  useEffect(() => {
    if (!pastHero || isQuietRoute) return;
    const timer = setTimeout(() => setShowBubble(true), 8000);
    return () => clearTimeout(timer);
  }, [pastHero, isQuietRoute]);

  useEffect(() => {
    const up   = () => setIsOnline(true);
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
  }, [agentMessages]);

  // Honest "speaking" pulse right after a new assistant message lands
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (agentMessages.length > prevMsgCountRef.current) {
      const last = agentMessages[agentMessages.length - 1];
      if (last?.role === 'assistant') {
        setSpeaking(true);
        const id = setTimeout(() => setSpeaking(false), 1800);
        prevMsgCountRef.current = agentMessages.length;
        return () => clearTimeout(id);
      }
    }
    prevMsgCountRef.current = agentMessages.length;
  }, [agentMessages]);

  const orbState = listening ? 'listening' : agentSending ? 'thinking' : speaking ? 'speaking' : 'idle';

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

    setInput('');
    setAgentSending(true);
    // Optimistic user message so the UI feels instant; subscription replaces
    // it with the canonical server record.
    setAgentMessages(prev => [...prev, { role: 'user', content: q, file_urls: fileUrls }]);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: q, file_urls: fileUrls });
    } catch (e) {
      setAgentSending(false);
      setAgentMessages(prev => [...prev, {
        role: 'assistant',
        content: friendlyError(e, "I couldn't send your message just now — the connection dropped. Please try again in a moment.", 'MCareOrb'),
      }]);
    }
  }, [input, agentConversation, agentSending, toast]);

  const startNewJourney = useCallback(async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'My Journey', description: 'M-Care coordination session' },
      });
      setAgentConversation(conversation);
      setAgentMessages(conversation.messages || []);
    } catch (e) {
      toast({ title: 'Could not start a new journey', description: friendlyError(e, 'Please try again.', 'MCareOrb'), variant: 'destructive' });
    }
  }, [toast]);

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
          <button onClick={() => { setOpen(true); setDismissed(true); setStruggleHint(null); }} aria-label="Open M-Care"
            style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <LivingOrb state={orbState} size={44} />
            {!isOnline && <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid rgba(10,20,28,0.9)' }} />}
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
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden>
              <Shield style={{ width: 18, height: 18, color: '#fff' }} fill="#fff" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>M-Safe</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Morales Super Agent</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: statusPill.bg, color: statusPill.fg, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusPill.dot }} /> {statusPill.text}
            </span>
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
                      <span style={{ width: 32, height: 32, borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden>
                        <Shield style={{ width: 16, height: 16, color: '#fff' }} fill="#fff" />
                      </span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: PURPLE, display: 'inline-block', animation: `guideThink 1.2s ease-in-out ${i * 0.15}s infinite` }} />
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
                    <MessageBubble message={m} accent={PURPLE} showAvatar showMeta showReaction onChoice={sendAgentMessage} />
                  </motion.div>
                ))}

                {agentSending && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: PURPLE, display: 'inline-block', animation: `guideThink 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>M-Safe is coordinating…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

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
                  disabled={agentSending || agentUploading}
                  uploading={agentUploading}
                />
                <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={handleVaulted} />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => handleChatPaste(e, { onFile: handleFileSelect, disabled: agentSending || agentUploading, onError: (msg) => toast({ title: 'Paste', description: msg, variant: 'destructive' }) })}
                  placeholder={isOnline ? (agentUploading ? "Uploading…" : "Ask M-Safe anything...") : t('guide.placeholder_offline')}
                  style={{ flex: 1, background: '#F6F7FB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '8px 12px', fontSize: 13, color: '#111827', outline: 'none' }}
                />
                {isOnline && (
                  <VoiceInputButton disabled={agentSending} onTranscript={(text) => setInput(text)} onRecordingChange={setListening} />
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
    </>
  );
}