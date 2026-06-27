// @ts-nocheck — Base44 InvokeLLM type definitions don't expose system_prompt yet; runtime works correctly
/**
 * PlatformGuideOrb — floating AI guide for every user and partner.
 *
 * Offline-first: answers every question from the local KB instantly.
 * Online: enhances KB answers with LLM for complex/open questions.
 * Works in airplane mode, zero-signal, and system-paused states.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, ChevronDown, WifiOff } from 'lucide-react';
import { findAnswer } from './orbKnowledge';
import { isSystemPaused } from '@/lib/systemPause';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const CACHE_KEY = 'morales_guide_cache';

// Public pages where all users should see visitor-facing tips (not internal admin nudges)
const PUBLIC_PATHS = new Set(['/', '/discover', '/providers', '/about', '/procedures', '/how-it-works', '/partners']);

// ── Role detection ────────────────────────────────────────────────────────────
function detectRole(user, pathname) {
  // On public marketing pages, everyone sees visitor-appropriate tips —
  // prevents internal admin nudges from appearing on the landing page.
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

const TIPS = {
  visitor:         [{ e: '👋', t: 'Welcome to Morales. I can help.' }, { e: '🌍', t: 'Planning medical travel? Ask me anything.' }, { e: '💡', t: 'Works offline — I know everything about this platform.' }],
  patient:         [{ e: '🗺️', t: 'I can walk you through every step.' }, { e: '🛡️', t: 'Questions about your safety plan?' }, { e: '🤝', t: 'Need help with a handshake checkpoint?' }, { e: '✈️', t: 'Works offline — ask me anytime.' }],
  doctor:          [{ e: '🔬', t: 'How do I confirm a patient case?' }, { e: '🤖', t: 'Try AI clinical note extraction — instant.' }, { e: '📍', t: 'Don\'t forget to add your clinic location.' }],
  doctor_portal:   [{ e: '✅', t: 'Ready to confirm this patient? I can help.' }, { e: '🤖', t: 'Use AI to extract clinical notes instantly.' }, { e: '📍', t: 'Add clinic coordinates for the Journey Map.' }],
  travel_agency:   [{ e: '✈️', t: 'How do I submit a travel quote?' }, { e: '🏨', t: 'Hotel coordinates power the patient Journey Map.' }],
  travel_portal:   [{ e: '✈️', t: 'Need help with the quote form?' }, { e: '🏨', t: 'Hotel coordinates appear on the patient map.' }],
  companion:       [{ e: '💌', t: 'Got a new job offer? I can explain it.' }, { e: '⭐', t: 'Your score improves with every completed job.' }],
  chauffeur:       [{ e: '🚗', t: 'Need help with the transfer portal?' }, { e: '📍', t: 'How does the visual verification code work?' }],
  chauffeur_portal:[{ e: '🚗', t: 'I can explain the visual verification code.' }],
  admin:           [{ e: '🎛️', t: 'Need help with the admin controls?' }, { e: '⏸️', t: 'Pause System saves integration credits.' }, { e: '🏆', t: 'Check Doctor Trust Scores in partner settings.' }],
};

const QUICK = {
  patient:         ['How do I complete a handshake?', 'What is the Golden M?', 'How does SAFE-T work?', 'Where is my Journey Map?'],
  doctor:          ['How do I confirm a patient?', 'How does AI clinical extraction work?', 'How do I add clinic coordinates?', 'What is the Doctor Trust Score?'],
  doctor_portal:   ['How do I confirm this patient?', 'How does AI note extraction work?', 'Where do I add clinic coordinates?'],
  travel_agency:   ['How do I submit a quote?', 'How do I add hotel coordinates?', 'What does the Journey Map show?'],
  travel_portal:   ['How do I submit a travel quote?', 'How do hotel coordinates help patients?'],
  companion:       ['How do I accept a job offer?', 'What is the Companion Performance Score?'],
  chauffeur:       ['How does the visual code work?', 'What is emergency transport?'],
  chauffeur_portal:['What is the visual verification code?', 'How does the pickup flow work?'],
  admin:           ['How do I pause the system?', 'What is the Doctor Trust Score?', 'How do integration credits work?'],
  visitor:         ['What is Morales Medical?', 'How does medical tourism work?', 'How does safety monitoring work?', 'How do I book a procedure?'],
};

function buildSystemPrompt(role, pathname) {
  return `You are the Morales Medical Concierge AI Guide — expert, warm, concise (2-4 sentences max).

Platform: Medical tourism concierge connecting patients with doctors abroad for dental, aesthetic, orthopedic procedures. Coordinates travel, companions, chauffeurs, safety monitoring, emergency response.

Key features:
- 9 handshake checkpoints from home pickup to home drop-off (Golden M = all 9 complete)
- SAFE-T monitors 6 behavioral signals; MedGuard™ 0-100 safety score, 5-min refresh
- Satellite SOS (Iridium) works with zero cell signal; 6 SOS channels total
- Journey Map shows hotel 🛏️ and clinic 🏥 pins (coordinates from travel agency + doctor)
- Doctor Trust Score: hidden 0-100 ranking (confirmation speed, SOS events, completion, satisfaction)
- Companion Package +$650: in-country local companion, invoice line item
- System Pause: admin kills all API calls, persists cross-device, does NOT auto-restart
- Passport Vault: encrypted docs, emergency QR access without login
- Emergency PIN: access emergency center on any device, wrong PIN fires silent alarm
- Predictive Escalation: fires 45min BEFORE missed check-in (GPS stale 2h + inactive 1h)
- Destination Safety Index: live proprietary per-country score
- Journey Credit: 5 loyalty tiers, deposit reductions, never expire
- 10 languages with zero-dep mini-i18n engine; Arabic = RTL

User role: ${role} | Page: ${pathname}

Answer in plain language. Stay on platform topics.`;
}

// Session cache for LLM responses
// Normalize keys: lowercase, strip punctuation, collapse whitespace
// "What is MedGuard?" and "what is medguard" → same cache hit
function normalizeKey(q) {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function getCached(q) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    return cache[normalizeKey(q)] || null;
  } catch { return null; }
}
function setCached(q, answer) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    cache[normalizeKey(q)] = answer;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlatformGuideOrb() {
  const { user }       = useAuth();
  const { pathname }   = useLocation();
  const role           = detectRole(user, pathname);
  const tips           = TIPS[role] || TIPS.visitor;
  const quickQuestions = QUICK[role] || QUICK.visitor;

  const [tipIdx,     setTipIdx]     = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [thinking,   setThinking]   = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const bottomRef = useRef(null);

  // Online/offline detection
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Rotate tips
  useEffect(() => {
    if (open || dismissed) return;
    const id = setInterval(() => {
      setShowBubble(false);
      setTimeout(() => { setTipIdx(i => (i + 1) % tips.length); setShowBubble(true); }, 300);
    }, 6000);
    return () => clearInterval(id);
  }, [open, dismissed, tips.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || thinking) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setThinking(true);

    const paused  = isSystemPaused();
    const canLLM  = isOnline && !paused;

    // 1. Try local knowledge base first (instant, always works)
    const kbAnswer = findAnswer(q);

    // 2. Check session cache for LLM response
    const cached = !paused ? getCached(q) : null;

    if (cached) {
      setMessages(m => [...m, { role: 'assistant', text: cached, source: 'llm' }]);
      setThinking(false);
      return;
    }

    if (kbAnswer) {
      const msgId = Date.now();
      setMessages(m => [...m, { role: 'assistant', text: kbAnswer, source: 'kb', id: msgId }]);
      setThinking(false);

      // Quietly enhance with LLM only if online AND not paused
      if (canLLM) {
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt:        q,
            system_prompt: buildSystemPrompt(role, pathname),
            response_type: 'text',
          });
          const llmText = typeof res === 'string' ? res : (res?.result || res?.text || '');
          if (llmText && llmText.length > 20) {
            setCached(q, llmText);
            setMessages(m => m.map(msg =>
              msg.id === msgId ? { ...msg, text: llmText, source: 'llm' } : msg
            ));
          }
        } catch { /* keep KB answer */ }
      }
      return;
    }

    // 3. No KB match — offline or paused fallback
    if (!canLLM) {
      const reason = paused ? 'System is paused to save integration credits.' : 'Working offline right now.';
      setMessages(m => [...m, {
        role: 'assistant',
        text: `${reason} I can still answer questions about:\n\n• Handshakes & Golden M\n• SAFE-T & MedGuard\n• Journey Map & SOS\n• Booking, Procedures, Portals\n• System Pause, Journey Credit, Companion Package\n\nTry asking about any of those topics.`,
        source: 'offline',
      }]);
      setThinking(false);
      return;
    }

    // 4. Online + not paused, no KB match — call LLM
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:        q,
        system_prompt: buildSystemPrompt(role, pathname),
        response_type: 'text',
      });
      const answer = typeof res === 'string' ? res : (res?.result || res?.text || 'I\'m here to help — try asking another way.');
      setCached(q, answer);
      setMessages(m => [...m, { role: 'assistant', text: answer, source: 'llm' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'I\'m having trouble connecting. Ask me about handshakes, SAFE-T, the Journey Map, SOS, booking, or any platform feature — I know it all offline too.', source: 'error' }]);
    }
    setThinking(false);
  }, [input, thinking, isOnline, role, pathname]);

  const currentTip = tips[tipIdx];

  return (
    <>
      {/* ── Floating orb + bubble ── */}
      {!open && (
        <div style={{ position: 'fixed', bottom: 'max(24px, env(safe-area-inset-bottom, 24px))', left: 20, zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          {showBubble && !dismissed && (
            <div style={{ background: 'rgba(10,20,28,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: '10px 14px', maxWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', position: 'relative', animation: 'orbBubbleIn 0.3s ease' }}>
              <button onClick={() => setDismissed(true)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              {!isOnline && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>OFFLINE MODE</span>}
              <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.5 }}><span style={{ marginRight: 6 }}>{currentTip.e}</span>{currentTip.t}</p>
            </div>
          )}
          <button onClick={() => { setOpen(true); setDismissed(true); }} aria-label="Open platform guide"
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Sparkles style={{ width: 22, height: 22, color: GOLD, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
            {!isOnline && <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid rgba(10,20,28,0.9)' }} />}
          </button>
        </div>
      )}

      {/* ── Guide panel ── */}
      {open && (
        <div style={{ position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom, 16px))', left: 16, zIndex: 9001, width: 'min(360px, calc(100vw - 32px))', background: 'rgba(6,11,22,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', maxHeight: 'min(540px, calc(100vh - 32px))', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.9))', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Morales Guide</p>
              <p style={{ margin: 0, fontSize: 10, color: isOnline ? 'rgba(255,255,255,0.38)' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isOnline ? 'AI-powered · always here' : <><WifiOff style={{ width: 9, height: 9 }} /> Offline — full local knowledge active</>}
              </p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', borderRadius: 8 }}>
              <ChevronDown style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Quick questions:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quickQuestions.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? `linear-gradient(135deg, ${GOLD}cc, #b8960fcc)` : 'rgba(255,255,255,0.07)', border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)', fontSize: 12, lineHeight: 1.65, color: m.role === 'user' ? DARK : '#fff', fontWeight: m.role === 'user' ? 600 : 400, whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: `guideThink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={isOnline ? 'Ask me anything…' : 'Ask me anything — works offline…'}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '8px 12px', fontSize: 12, color: '#fff', outline: 'none' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || thinking}
              style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: input.trim() && !thinking ? GOLD : 'rgba(255,255,255,0.06)', border: 'none', cursor: input.trim() && !thinking ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            >
              <Send style={{ width: 15, height: 15, color: input.trim() && !thinking ? DARK : 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes orbBubbleIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes guideThink  { 0%,80%,100% { transform:scale(0.7); opacity:0.4; } 40% { transform:scale(1.2); opacity:1; } }
      `}</style>
    </>
  );
}
