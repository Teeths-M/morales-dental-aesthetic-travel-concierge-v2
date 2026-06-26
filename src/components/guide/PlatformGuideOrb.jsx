/**
 * PlatformGuideOrb — floating AI guide for every user and partner on the platform.
 *
 * Sits at bottom-left (SOS/Assistance pills are bottom-right).
 * Shows rotating context-aware tips above the orb.
 * Click opens a slide-up panel with preset quick questions + free chat.
 * Role-aware: patients, doctors, travel agencies, companions, admin each see
 * tips and answers relevant to their workflow.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, ChevronDown } from 'lucide-react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

// ── Role detection ────────────────────────────────────────────────────────────
function detectRole(user, pathname) {
  if (!user) {
    if (pathname.startsWith('/portal/doctor'))  return 'doctor_portal';
    if (pathname.startsWith('/portal/travel'))  return 'travel_portal';
    if (pathname.startsWith('/portal/transfer'))return 'chauffeur_portal';
    return 'visitor';
  }
  if (['admin', 'platform_admin'].includes(user.role)) return 'admin';
  if (user.role === 'doctor')         return 'doctor';
  if (user.role === 'travel_agency')  return 'travel_agency';
  if (user.role === 'companion')      return 'companion';
  if (user.role === 'taxi_service')   return 'chauffeur';
  return 'patient';
}

// ── Contextual tip messages (rotate every 6s) ─────────────────────────────────
const TIPS = {
  visitor: [
    { emoji: '👋', text: 'Welcome to Morales. I can help.' },
    { emoji: '💡', text: 'Have a question? I can answer instantly.' },
    { emoji: '🌍', text: 'Planning medical travel? Ask me anything.' },
  ],
  patient: [
    { emoji: '🗺️', text: 'I can walk you through every step.' },
    { emoji: '💡', text: 'Stuck on the booking form? Just ask.' },
    { emoji: '🛡️', text: 'Questions about your safety plan?' },
    { emoji: '🏥', text: 'Want to know what happens at the clinic?' },
    { emoji: '🤝', text: 'Need help with a handshake checkpoint?' },
  ],
  doctor: [
    { emoji: '🔬', text: 'How do I confirm a patient case?' },
    { emoji: '🤖', text: 'Try AI clinical note extraction — it\'s instant.' },
    { emoji: '📍', text: 'Don\'t forget to add your clinic location.' },
    { emoji: '💡', text: 'Questions about the doctor portal?' },
  ],
  doctor_portal: [
    { emoji: '✅', text: 'Ready to confirm this patient? I can help.' },
    { emoji: '🤖', text: 'Use AI to extract clinical notes instantly.' },
    { emoji: '📍', text: 'Add your clinic coordinates for the patient map.' },
  ],
  travel_agency: [
    { emoji: '✈️', text: 'How do I submit a travel quote?' },
    { emoji: '🏨', text: 'Add hotel coordinates for the Journey Map.' },
    { emoji: '💡', text: 'Questions about flight or hotel fields?' },
  ],
  travel_portal: [
    { emoji: '✈️', text: 'Need help with the quote form?' },
    { emoji: '🏨', text: 'Hotel coordinates power the patient Journey Map.' },
    { emoji: '💡', text: 'Ask me anything about this portal.' },
  ],
  companion: [
    { emoji: '💌', text: 'Got a new job offer? I can explain it.' },
    { emoji: '🍽️', text: 'How do I submit a meal receipt?' },
    { emoji: '⭐', text: 'Your performance score improves with every job.' },
  ],
  chauffeur: [
    { emoji: '🚗', text: 'Need help with the transfer portal?' },
    { emoji: '📍', text: 'How does the pickup visual code work?' },
  ],
  chauffeur_portal: [
    { emoji: '🚗', text: 'I can explain the visual verification code.' },
    { emoji: '💡', text: 'Questions about this portal? Ask me.' },
  ],
  admin: [
    { emoji: '🎛️', text: 'Need help with the admin controls?' },
    { emoji: '⏸️', text: 'Remember: Pause System saves integration credits.' },
    { emoji: '🏆', text: 'Check Doctor Trust Scores in partner settings.' },
    { emoji: '💡', text: 'Ask me anything about the platform.' },
  ],
};

// ── Quick action buttons shown in the panel ───────────────────────────────────
const QUICK = {
  patient:       ['How do I complete a handshake?', 'What is the Golden M?', 'How does SAFE-T work?', 'Where is my Journey Map?'],
  doctor:        ['How do I confirm a patient?', 'How does AI clinical extraction work?', 'How do I add clinic coordinates?', 'What is the Doctor Trust Score?'],
  doctor_portal: ['How do I confirm this patient?', 'How does the AI note extractor work?', 'Where do I add clinic coordinates?'],
  travel_agency: ['How do I submit a quote?', 'How do I add hotel coordinates?', 'What does the Journey Map show?'],
  travel_portal: ['How do I submit a travel quote?', 'What fields are required?', 'How do hotel coordinates help patients?'],
  companion:     ['How do I accept a job offer?', 'How do I submit a grocery receipt?', 'What is the Companion Performance Score?'],
  chauffeur:     ['How does the visual code work?', 'What is emergency transport?'],
  chauffeur_portal: ['What is the visual verification code?', 'How does the pickup flow work?'],
  admin:         ['How do I pause the system?', 'What is the Doctor Trust Score?', 'How do integration credits work?', 'How do I add a new partner?'],
  visitor:       ['What is Morales Medical?', 'How does medical tourism work?', 'How does safety monitoring work?', 'How do I book a procedure?'],
};

// ── System prompt for the AI guide ───────────────────────────────────────────
function buildSystemPrompt(role, pathname) {
  return `You are the Morales Medical Concierge AI Guide — a friendly, expert assistant built into the platform.

Your role: help ${role} users understand and use the platform. Be concise (2-4 sentences max per response), warm, and specific.

Platform context:
- Morales is a medical tourism concierge platform connecting patients with doctors, travel agencies, chauffeurs, and companions.
- Patients book procedures (dental, aesthetic, orthopedic), travel to the destination country, and are tracked through a 9-checkpoint handshake journey.
- The SAFE-T system monitors patient safety using 6 behavioral signals. MedGuard™ generates a 0-100 risk score.
- The Golden M is awarded when all 9 handshake checkpoints are completed (patient is safely home).
- Satellite SOS works via Iridium/Rock Seven even with zero cell signal.
- Partners: doctors confirm cases via a token-gated portal. Travel agencies submit flight + hotel quotes. Companions are matched to patients in the destination country. Chauffeurs handle airport pickups.
- Admin can pause all API calls with the System Pause button to conserve integration credits.
- The Journey Map shows the hotel (🛏️) and clinic (🏥) as interactive pins.
- Doctor Trust Score is a hidden 0-100 ranking based on confirmation speed, safety record, and patient satisfaction.

Current page: ${pathname}
User role: ${role}

Answer in plain language. If asked something outside the platform, redirect to platform topics.`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlatformGuideOrb() {
  const { user }          = useAuth();
  const { pathname }      = useLocation();
  const role              = detectRole(user, pathname);
  const tips              = TIPS[role] || TIPS.visitor;
  const quickQuestions    = QUICK[role] || QUICK.visitor;

  const [tipIdx,   setTipIdx]   = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bottomRef = useRef(null);

  // Rotate tips every 6 seconds
  useEffect(() => {
    if (open || dismissed) return;
    const id = setInterval(() => {
      setShowBubble(false);
      setTimeout(() => { setTipIdx(i => (i + 1) % tips.length); setShowBubble(true); }, 300);
    }, 6000);
    return () => clearInterval(id);
  }, [open, dismissed, tips.length]);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setThinking(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:         q,
        system_prompt:  buildSystemPrompt(role, pathname),
        response_type:  'text',
      });
      const answer = typeof res === 'string' ? res : (res?.result || res?.text || 'I\'m here to help — try asking another way.');
      setMessages(m => [...m, { role: 'assistant', text: answer }]);
    } catch (_) {
      setMessages(m => [...m, { role: 'assistant', text: 'I\'m having trouble connecting right now. Try again in a moment.' }]);
    }
    setThinking(false);
  }

  const currentTip = tips[tipIdx];

  return (
    <>
      {/* ── Floating orb + bubble ── */}
      {!open && (
        <div style={{
          position: 'fixed',
          bottom:   'max(24px, env(safe-area-inset-bottom, 24px))',
          left:     '20px',
          zIndex:   9000,
          display:  'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          {/* Tip bubble */}
          {showBubble && !dismissed && (
            <div style={{
              background:     'rgba(10,20,28,0.95)',
              backdropFilter: 'blur(16px)',
              border:         '1px solid rgba(255,255,255,0.10)',
              borderRadius:   14,
              padding:        '10px 14px',
              maxWidth:       220,
              boxShadow:      '0 8px 32px rgba(0,0,0,0.5)',
              position:       'relative',
              animation:      showBubble ? 'orbBubbleIn 0.3s ease' : 'none',
            }}>
              <button onClick={() => setDismissed(true)} style={{
                position: 'absolute', top: 6, right: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
              <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
                <span style={{ marginRight: 6 }}>{currentTip.emoji}</span>
                {currentTip.text}
              </p>
            </div>
          )}

          {/* The orb */}
          <button
            onClick={() => { setOpen(true); setDismissed(true); }}
            aria-label="Open platform guide"
            style={{
              width:          56, height: 56,
              borderRadius:   '50%',
              background:     'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.92))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:         '1px solid rgba(255,255,255,0.14)',
              boxShadow:      `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              transition:     'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px ${GOLD}50, inset 0 1px 0 rgba(255,255,255,0.15)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.12)`; }}
          >
            <Sparkles style={{ width: 22, height: 22, color: GOLD, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          </button>
        </div>
      )}

      {/* ── Guide panel ── */}
      {open && (
        <div style={{
          position:      'fixed',
          bottom:        'max(16px, env(safe-area-inset-bottom, 16px))',
          left:          16,
          zIndex:        9001,
          width:         'min(360px, calc(100vw - 32px))',
          background:    'rgba(6,11,22,0.97)',
          backdropFilter:'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:        '1px solid rgba(255,255,255,0.09)',
          borderRadius:  20,
          boxShadow:     '0 24px 64px rgba(0,0,0,0.7)',
          display:       'flex',
          flexDirection: 'column',
          maxHeight:     'min(520px, calc(100vh - 32px))',
          overflow:      'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:      '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display:      'flex', alignItems: 'center', gap: 10,
            flexShrink:   0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background:  `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18), rgba(10,20,28,0.9))`,
              border:      '1px solid rgba(255,255,255,0.12)',
              display:     'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles style={{ width: 15, height: 15, color: GOLD }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Morales Guide</p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>AI-powered · always here</p>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'rgba(255,255,255,0.4)', borderRadius: 8, display: 'flex',
            }}>
              <ChevronDown style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Quick questions for {role.replace(/_/g, ' ')}:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quickQuestions.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{
                      background:   'rgba(255,255,255,0.05)',
                      border:       '1px solid rgba(255,255,255,0.09)',
                      borderRadius: 10,
                      padding:      '8px 12px',
                      fontSize:     12,
                      color:        'rgba(255,255,255,0.75)',
                      cursor:       'pointer',
                      textAlign:    'left',
                      transition:   'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display:       'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth:     '85%',
                  padding:      '8px 12px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background:   m.role === 'user'
                    ? `linear-gradient(135deg, ${GOLD}cc, #b8960fcc)`
                    : 'rgba(255,255,255,0.07)',
                  border:       m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  fontSize:     12,
                  lineHeight:   1.6,
                  color:        m.role === 'user' ? DARK : '#fff',
                  fontWeight:   m.role === 'user' ? 600 : 400,
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: GOLD,
                    animation: `guideThink 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding:      '10px 12px',
            borderTop:    '1px solid rgba(255,255,255,0.07)',
            display:      'flex',
            gap:          8,
            flexShrink:   0,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Ask me anything…"
              style={{
                flex:        1,
                background:  'rgba(255,255,255,0.06)',
                border:      '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                padding:     '8px 12px',
                fontSize:    12,
                color:       '#fff',
                outline:     'none',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              style={{
                width:        36, height: 36, borderRadius: 10, flexShrink: 0,
                background:   input.trim() ? GOLD : 'rgba(255,255,255,0.06)',
                border:       'none', cursor: input.trim() ? 'pointer' : 'default',
                display:      'flex', alignItems: 'center', justifyContent: 'center',
                transition:   'background 0.2s',
              }}
            >
              <Send style={{ width: 15, height: 15, color: input.trim() ? DARK : 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes orbBubbleIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes guideThink  { 0%,80%,100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
      `}</style>
    </>
  );
}
