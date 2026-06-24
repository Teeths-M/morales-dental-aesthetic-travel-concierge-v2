import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ShieldCheck, Loader2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const QUICK_PROMPTS = [
  { icon: '🛡️', label: 'Am I safe right now?' },
  { icon: '🗺️', label: "What's next in my journey?" },
  { icon: '💊', label: 'Medical question' },
  { icon: '🧳', label: 'Travel / logistics help' },
  { icon: '🔴', label: 'I need emergency help' },
  { icon: '🩺', label: 'Recovery guidance' },
];

const WELCOME_MSG = {
  role: 'assistant',
  content: "Hello. I'm your **Safe-T4life AI Assistant** — your all-knowing companion for this medical journey.\n\nI can help you with:\n• Journey safety & checkpoint tracking\n• Medical preparation & recovery\n• Travel logistics & emergencies\n• Passport vault, guardian setup, and offline safety\n\nWhat do you need right now?",
};

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n•/g, '<br/>•')
    .replace(/\n/g, '<br/>');
}

export default function SafeTAssistantPanel({ isOpen, onClose }) {
  const { user }       = useAuth();
  const [messages,   setMessages]   = useState([WELCOME_MSG]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const abortRef     = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg  = { role: 'user', content };
    const history  = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('safeTAssist', {
        messages:   history.map(m => ({ role: m.role, content: m.content })),
        user_email: user?.email    || null,
        user_name:  user?.full_name || null,
        trip_phase: null, // TODO: pass from activeTrip if available
      });
      const reply = res?.data?.reply ?? "I'm here to help. Could you give me a bit more detail?";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (_) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. If this is an emergency, tap **Secure Line** below immediately.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, user]);

  const reset = () => {
    setMessages([WELCOME_MSG]);
    setInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9997,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            style={{
              position:   'fixed',
              top:        0,
              right:      0,
              height:     '100dvh',
              width:      'min(440px, 100vw)',
              zIndex:     9998,
              display:    'flex',
              flexDirection: 'column',
              background: 'rgba(5, 10, 20, 0.97)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderLeft: '1px solid rgba(52, 211, 153, 0.14)',
              boxShadow:  '-32px 0 100px rgba(0,0,0,0.65)',
            }}
          >
            {/* ── HEADER ── */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  flexShrink: 0,
                }}>
                  <ShieldCheck style={{ width: '20px', height: '20px', color: '#34d399' }} strokeWidth={2} />
                </div>
                <div>
                  <p style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
                    Safe-T4life Assistant
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 6px rgba(52,211,153,0.7)',
                      display: 'inline-block',
                    }} />
                    <p style={{ color: '#34d399', fontSize: '11px', margin: 0 }}>AI · Always on · Knows your journey</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={reset}
                  title="New conversation"
                  style={{
                    padding: '8px', borderRadius: '10px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <RotateCcw style={{ width: '16px', height: '16px' }} />
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px', borderRadius: '10px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div style={{
              padding: '12px 16px',
              display: 'flex', flexWrap: 'wrap', gap: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              {QUICK_PROMPTS.map(({ icon, label }) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '11px', fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>

            {/* ── MESSAGES ── */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '88%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: '13.5px',
                      lineHeight: 1.65,
                      ...(msg.role === 'user' ? {
                        background: 'rgba(52,211,153,0.13)',
                        border: '1px solid rgba(52,211,153,0.18)',
                        color: '#e2e8f0',
                      } : {
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.88)',
                      }),
                    }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                  />
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <Loader2
                      style={{ width: '14px', height: '14px', color: '#34d399', animation: 'spin 1s linear infinite' }}
                    />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                      Safe-T4life is thinking…
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── INPUT ── */}
            <div style={{
              padding: '12px 16px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <form
                onSubmit={e => { e.preventDefault(); send(); }}
                style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask anything — journey, safety, medical, emergency…"
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1,
                    resize: 'none',
                    overflow: 'hidden',
                    minHeight: '44px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    outline: 'none',
                    caretColor: '#34d399',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.6 : 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  style={{
                    width: '44px', height: '44px',
                    borderRadius: '12px',
                    border: '1px solid rgba(52,211,153,0.3)',
                    background: input.trim() && !loading ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.04)',
                    color: input.trim() && !loading ? '#34d399' : 'rgba(255,255,255,0.2)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  <Send style={{ width: '17px', height: '17px' }} />
                </button>
              </form>
              <p style={{
                textAlign: 'center', marginTop: '8px',
                fontSize: '10px', color: 'rgba(255,255,255,0.18)',
              }}>
                Safe-T4life AI · For immediate danger, use Secure Line ↘
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
