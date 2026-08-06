import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Minus, X, Paperclip, Send, CheckCheck,
  Luggage, Siren, Stethoscope, FileText, BarChart3,
} from 'lucide-react';

// M-Safe — a self-contained, premium floating chat window for the Morales
// Super Agent. Drop-in component: pass onClose/onMinimize to control lifecycle.
// All styling is literal Tailwind (brand palette) so it survives purge.

const PURPLE = '#6C47FF';

const SEED = [
  { role: 'agent', text: "Hello! I'm M-Safe, your Morales Super Agent. How can I help you today?", time: '10:30 AM' },
  { role: 'user', text: 'I need help finding a safe clinic for a tummy tuck in Colombia.', time: '10:31 AM' },
  { role: 'agent', text: "I'm on it. Let me run a safety check first... I'll be right back with options for you in Medellín or Bogotá.", time: '10:31 AM' },
];

const QUICK_ACTIONS = [
  { label: 'My Trips', icon: Luggage, message: 'Show me my trips' },
  { label: 'Emergency Help', icon: Siren, message: 'I need emergency help' },
  { label: 'Find Doctor', icon: Stethoscope, message: 'Help me find a verified doctor' },
  { label: 'Visa Help', icon: FileText, message: 'I need help with a visa' },
];

const CANNED_REPLIES = [
  "Got it — I'm reviewing safe, verified options for you now. Give me a moment.",
  "On it. I'll run the safety screening and surface only verified providers.",
  "Understood. I'll coordinate the next steps and keep you posted.",
];

const now = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function MSafeChat({ onClose, onMinimize, className = '' }) {
  const [messages, setMessages] = useState(SEED);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = useCallback((text) => {
    const t = (text ?? input).trim();
    if (!t || isTyping) return;
    setMessages((m) => [...m, { role: 'user', text: t, time: now() }]);
    setInput('');
    setIsTyping(true);
    const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'agent', text: reply, time: now() }]);
      setIsTyping(false);
      inputRef.current?.focus();
    }, 1100);
  }, [input, isTyping]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="dialog"
      aria-label="M-Safe chat"
      className={`flex flex-col w-full max-w-[420px] h-[640px] max-h-[92vh] rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0" style={{ background: PURPLE }} aria-hidden>
            <Shield className="w-5 h-5 text-white" fill="white" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-[15px] text-[#111827] truncate">M-Safe</p>
            <p className="text-[11px] text-[#6B7280] truncate">Morales Super Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" aria-hidden />
            LIVE SESSION
          </span>
          <button type="button" onClick={onMinimize} aria-label="Minimize chat" className="flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:bg-[#F6F7FB] focus-visible:ring-2 focus-visible:ring-[#6C47FF] outline-none">
            <Minus className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close chat" className="flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] hover:bg-[#F6F7FB] focus-visible:ring-2 focus-visible:ring-[#6C47FF] outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F6F7FB]" role="log" aria-live="polite" aria-label="Conversation">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start items-end gap-2'}
            >
              {m.role === 'agent' && (
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white text-[13px] font-bold" style={{ background: PURPLE }} aria-hidden>M</span>
              )}
              <div
                className={m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[14px] text-white shadow-sm'
                  : 'max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[14px] text-[#111827] bg-white border border-[#E5E7EB] shadow-sm'}
                style={m.role === 'user' ? { background: PURPLE } : undefined}
              >
                <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                {m.role === 'user' && (
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/80">
                    <span>{m.time}</span>
                    <CheckCheck className="w-3 h-3" style={{ color: '#5EEAD4' }} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end gap-2">
              <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white text-[13px] font-bold" style={{ background: PURPLE }} aria-hidden>M</span>
              <div className="rounded-2xl rounded-bl-sm px-3.5 py-3 bg-white border border-[#E5E7EB] shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: PURPLE }}
                      animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick actions */}
      <div className="px-4 pt-3 pb-2 bg-white border-t border-[#E5E7EB]">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} type="button" onClick={() => send(a.message)}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:border-[#6C47FF] hover:text-[#6C47FF] transition-colors focus-visible:ring-2 focus-visible:ring-[#6C47FF] outline-none">
              <a.icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback panel */}
      <div className="px-4 py-3 bg-white border-t border-[#E5E7EB]">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-[#6B7280]" />
          <p className="text-[12px] font-semibold text-[#111827]">Feedback</p>
        </div>
        <div className="space-y-2">
          <Metric label="Clarity" value={82} color="#22C55E" />
          <Metric label="Evidence" value={64} color={PURPLE} />
        </div>
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-[#E5E7EB]">
        <button type="button" aria-label="Attach file" className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-[#6B7280] hover:bg-[#F6F7FB] focus-visible:ring-2 focus-visible:ring-[#6C47FF] outline-none">
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask M-Safe anything..."
          aria-label="Message M-Safe"
          className="flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-[#F6F7FB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#6C47FF] focus-visible:ring-2 focus-visible:ring-[#6C47FF] max-h-28"
        />
        <button type="button" onClick={() => send()} disabled={!input.trim() || isTyping}
          aria-label="Send message"
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-white transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#6C47FF] focus-visible:ring-offset-1 outline-none"
          style={{ background: PURPLE }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-[#374151]">{label}</span>
        <span className="text-[12px] font-semibold text-[#111827]">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}