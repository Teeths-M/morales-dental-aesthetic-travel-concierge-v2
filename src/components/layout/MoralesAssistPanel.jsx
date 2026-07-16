// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, RotateCcw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const GOLD = '#D4AF37';

const QUICK_PROMPTS = [
  "What's my next step?",
  'Pre-procedure questions',
  'Recovery guidance',
  'Travel & logistics',
  'I need urgent help',
  'Speak with a specialist',
];

const WELCOME_MSG = {
  role: 'assistant',
  content: "Good day. I'm your Morales concierge — here to assist with every detail of your journey, from your first question to your safe return home.\n\nHow can I help you today?",
};

function md(text) {
  return DOMPurify.sanitize(
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>'),
    { ALLOWED_TAGS: ['strong', 'em', 'br'], ALLOWED_ATTR: [] },
  );
}

function SpecialistCard() {
  return (
    <div style={{
      margin: '2px 0 6px',
      padding: '14px 16px',
      borderRadius: 14,
      background: 'rgba(212,175,55,0.07)',
      border: '1px solid rgba(212,175,55,0.22)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: GOLD, color: '#060B16',
          fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>M</div>
        <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: 0 }}>A specialist is on their way</p>
      </div>
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, margin: 0 }}>
        I've shared your conversation with a member of our care team. They'll reach out to you personally — you won't need to repeat a thing.
      </p>
    </div>
  );
}

export default function MoralesAssistPanel({ isOpen, onClose }) {
  const { _user } = useAuth();
  const [messages,   setMessages]   = useState([WELCOME_MSG]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [handedOff,  setHandedOff]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000));
      const res = await Promise.race([
        base44.functions.invoke('moralesAssist', {
          messages:   history.map(m => ({ role: m.role, content: m.content })),
          trip_phase: null,
        }),
        timeout,
      ]);

      // InvokeLLM may return payload at res.data (Base44 SDK wraps body in .data)
      const payload      = res?.data ?? res ?? {};
      const reply        = payload.reply ?? (payload.error ? "I'm here with you — let me try a different way to assist. What's on your mind?" : "I'm here with you. What would you like help with today?");
      const needsHandoff = !!payload.needs_handoff;

      setMessages(prev => [...prev, { role: 'assistant', content: reply, handoff: needsHandoff }]);
      if (needsHandoff) setHandedOff(true);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: e?.message === 'timeout'
          ? "I'm taking longer than usual. Please try again, or use the Secure Line for anything urgent."
          : "I'm stepping away briefly. For anything pressing, the Secure Line is always available.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const reset = () => { setMessages([WELCOME_MSG]); setInput(''); setHandedOff(false); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            style={{
              position: 'fixed', top: 0, right: 0,
              height: '100dvh', width: 'min(440px, 100vw)',
              zIndex: 9998, display: 'flex', flexDirection: 'column',
              background: 'rgba(6, 10, 18, 0.97)',
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              borderLeft: '1px solid rgba(212,175,55,0.15)',
              boxShadow: '-32px 0 80px rgba(0,0,0,0.65)',
            }}
          >
            {/* ── Header ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: GOLD, color: '#060B16',
                  fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 18px rgba(212,175,55,0.3)`,
                }}>M</div>
                <div>
                  <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Morales Assist</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: GOLD, boxShadow: `0 0 6px ${GOLD}`,
                      display: 'inline-block',
                    }} />
                    <p style={{ color: GOLD, fontSize: 11, margin: 0, opacity: 0.8 }}>
                      Your personal concierge · always available
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={reset} title="New conversation" style={{
                  padding: 8, borderRadius: 10, border: 'none',
                  background: 'transparent', color: 'rgba(255,255,255,0.28)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}>
                  <RotateCcw style={{ width: 15, height: 15 }} />
                </button>
                <button onClick={onClose} style={{
                  padding: 8, borderRadius: 10, border: 'none',
                  background: 'transparent', color: 'rgba(255,255,255,0.28)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}>
                  <X style={{ width: 19, height: 19 }} />
                </button>
              </div>
            </div>

            {/* ── Quick prompts ── */}
            <div style={{
              padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6,
              borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
            }}>
              {QUICK_PROMPTS.map(label => (
                <button key={label} onClick={() => send(label)} disabled={loading || handedOff} style={{
                  padding: '8px 12px', borderRadius: 999,
                  border: '1px solid rgba(212,175,55,0.14)',
                  background: 'rgba(212,175,55,0.05)',
                  color: 'rgba(255,255,255,0.58)', fontSize: 11.5, fontWeight: 500,
                  cursor: (loading || handedOff) ? 'not-allowed' : 'pointer',
                  opacity: (loading || handedOff) ? 0.4 : 1,
                  whiteSpace: 'nowrap', minHeight: 36,
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Messages ── */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent',
            }}>
              {messages.map((msg, i) => (
                <React.Fragment key={i}>
                  {msg.handoff && <SpecialistCard />}
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '88%', padding: '10px 14px',
                        fontSize: 13.5, lineHeight: 1.65,
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        ...(msg.role === 'user' ? {
                          background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.18)', color: '#e2e8f0',
                        } : {
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.87)',
                        }),
                      }}
                      dangerouslySetInnerHTML={{ __html: md(msg.content) }}
                    />
                  </div>
                </React.Fragment>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'block', opacity: 0.35 }}
                        animate={{ opacity: [0.35, 1, 0.35], y: [0, -4, 0] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <form onSubmit={e => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="How can I assist you today?"
                  disabled={loading || handedOff}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', overflow: 'hidden', minHeight: 44,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '11px 14px',
                    color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 1.5,
                    outline: 'none', caretColor: GOLD, fontFamily: 'inherit',
                    opacity: (loading || handedOff) ? 0.5 : 1,
                  }}
                />
                <button type="submit" disabled={!input.trim() || loading || handedOff} style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  border: '1px solid rgba(212,175,55,0.22)',
                  background: (input.trim() && !loading && !handedOff) ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.03)',
                  color: (input.trim() && !loading && !handedOff) ? GOLD : 'rgba(255,255,255,0.18)',
                  cursor: (input.trim() && !loading && !handedOff) ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}>
                  <Send style={{ width: 16, height: 16 }} />
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.14)' }}>
                Morales Assist · For immediate danger, use the Secure Line ↘
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
