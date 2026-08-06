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
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send, ChevronDown, WifiOff, RotateCcw, Maximize2, Minimize2, LogIn, Stethoscope, Briefcase } from 'lucide-react';
import VoiceInputButton from './VoiceInputButton';
import LivingOrb from './LivingOrb';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import MCareVaultUpload, { DOC_LABEL } from '@/components/mcare-agent/MCareVaultUpload';
import { isSystemPaused } from '@/lib/systemPause';
import { useTranslation } from '@/i18n';
import { STRUGGLE_HINT_EVENT } from '@/lib/struggleHint';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const AGENT_NAME = 'm_care';
const GREETING = "I'm M-Care, your personal journey coordinator. I'll get you from \"I want a procedure\" to a safely booked, monitored trip — and I'll never rush you past safety. What procedure are you considering, and where would you like to have it?";

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
  useEffect(() => {
    if (!agentConversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(
      agentConversation.id,
      (data) => {
        setAgentMessages(data.messages || []);
        setAgentSending(false);
      }
    );
    return () => unsubscribe();
  }, [agentConversation]);

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
    if ((!q && !fileUrls?.length) || agentSending || !isAuthenticated) return;

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
    }
  }, [input, agentConversation, agentSending, isAuthenticated]);

  const startNewJourney = useCallback(async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'My Journey', description: 'M-Care coordination session' },
      });
      setAgentConversation(conversation);
      setAgentMessages(conversation.messages || []);
    } catch (e) { /* leave as-is */ }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('That file is larger than 15MB. Please upload a smaller image or PDF.'); return; }
    setAgentUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendAgentMessage(`I've uploaded: ${file.name || 'document'}`, [file_url]);
    } catch (e) {
      alert('Upload failed — please try again.');
    } finally {
      setAgentUploading(false);
    }
  };

  const handleVaulted = ({ token, document_type, file_name }) => {
    const label = DOC_LABEL[document_type] || 'document';
    sendAgentMessage(`I've uploaded my ${label} (${file_name}) to the secure vault. Reference token: ${token}. It's encrypted and stored for verification.`);
  };

  const currentTip = struggleHint || tips[tipIdx];

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

      {/* ── M-Care panel ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9001, background: 'rgba(4,8,16,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'mcareBackdropIn 0.22s ease' }}
        >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ transition: 'width 0.25s ease, max-height 0.25s ease',
          width: expanded ? 'min(1160px, 96vw)' : 'min(880px, 92vw)',
          background: 'rgba(6,11,22,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', maxHeight: expanded ? '94vh' : 'min(82vh, 820px)', overflow: 'hidden', animation: 'mcarePanelIn 0.32s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <LivingOrb state={orbState} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{t('guide.ai_label')}</p>
              <p style={{ margin: 0, fontSize: 10, color: isOnline ? 'rgba(255,255,255,0.38)' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isOnline ? (paused ? 'Paused' : t('guide.ai_sub')) : <><WifiOff style={{ width: 9, height: 9 }} /> {t('guide.ai_offline')}</>}
              </p>
            </div>
            {isAuthenticated && agentMessages.length > 0 && (
              <button onClick={startNewJourney} title="New journey" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', borderRadius: 8 }}>
                <RotateCcw style={{ width: 15, height: 15 }} />
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', borderRadius: 8 }}>
              {expanded ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
            </button>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', borderRadius: 8 }}>
              <ChevronDown style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {isAuthenticated ? (
            <>
              {/* Journey stage tracker — reflects real case state from tool calls */}
              {agentMessages.length > 0 && (
                <JourneyStageTracker messages={agentMessages} />
              )}

              {/* Chat area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {agentMessages.length === 0 && !agentLoading && (
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.3)' }}>
                        <LivingOrb state="idle" size={34} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>{GREETING}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => sendAgentMessage("I'd like to book a procedure")}
                        style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: GOLD, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.06)'}
                      ><Stethoscope style={{ width: 14, height: 14 }} /> Book a procedure</button>
                      {canBecomePartner && (
                        <button onClick={() => { setOpen(false); navigate('/partner-signup'); }}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        ><Briefcase style={{ width: 14, height: 14 }} /> Become a partner</button>
                      )}
                    </div>
                  </div>
                )}

                {agentLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: `guideThink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>Opening your journey…</span>
                  </div>
                )}

                {agentMessages.map((m, i) => <MessageBubble key={i} message={m} />)}

                {agentSending && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: `guideThink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>M-Care is coordinating…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <AddImageMenu
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
                  placeholder={isOnline ? (agentUploading ? "Uploading…" : "Tell M-Care what you're considering…") : t('guide.placeholder_offline')}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '8px 12px', fontSize: 12, color: '#fff', outline: 'none' }}
                />
                {isOnline && (
                  <VoiceInputButton
                    disabled={agentSending}
                    onTranscript={(text) => setInput(text)}
                    onRecordingChange={setListening}
                  />
                )}
                <button onClick={() => sendAgentMessage()} disabled={!input.trim() || agentSending}
                  style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: input.trim() && !agentSending ? GOLD : 'rgba(255,255,255,0.06)', border: 'none', cursor: input.trim() && !agentSending ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                >
                  <Send style={{ width: 15, height: 15, color: input.trim() && !agentSending ? DARK : 'rgba(255,255,255,0.3)' }} />
                </button>
              </div>
            </>
          ) : (
            /* ── Logged-out: M-Care coordinates real journeys, which need an account.
                 No generic Q&A chatbot here — a clear path to sign in or start. ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))', border: '1px solid rgba(212,175,55,0.3)' }} className="m-breathe">
                <LivingOrb state="idle" size={50} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#fff' }}>M-Care coordinates your journey</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, maxWidth: 360 }}>
                  M-Care is a stateful journey coordinator — it runs safety checks, matches only verified providers, logs your consent, and coordinates every leg of your trip with 24/7 monitoring. Sign in to start your journey, or explore becoming a partner.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
                <button onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: GOLD, color: DARK, border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                ><LogIn style={{ width: 15, height: 15 }} /> Sign in to start your journey</button>
                <button onClick={() => { setOpen(false); navigate('/intake'); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(212,175,55,0.08)', color: GOLD, border: '1px solid rgba(212,175,55,0.22)', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                ><Stethoscope style={{ width: 15, height: 15 }} /> Begin intake</button>
                {canBecomePartner && (
                  <button onClick={() => { setOpen(false); navigate('/partner-signup'); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  ><Briefcase style={{ width: 15, height: 15 }} /> Become a partner</button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      <style>{`
        @keyframes orbBubbleIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes guideThink  { 0%,80%,100% { transform:scale(0.7); opacity:0.4; } 40% { transform:scale(1.2); opacity:1; } }
        @keyframes mcareBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes mcarePanelIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}