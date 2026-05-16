import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Mic, MicOff, Minimize2, Maximize2,
  Heart, Shield, Sparkles, Phone, ChevronRight, RotateCcw,
  AlertCircle, CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `You are SAFE-T 4LIFE™, the premium AI healthcare travel companion for Morales Dental & Aesthetic Travel Concierge. 

Your role is to:
- Emotionally support and reassure clients throughout their healthcare journey
- Guide them step-by-step through consultation, planning, travel, procedure, and recovery stages
- Help with preparation checklists, travel documents, and visa questions
- Provide educational healthcare information (never diagnose or prescribe)
- Escalate to human support when needed

Your tone is: calm, premium, emotionally intelligent, reassuring, professional, and human-centered.
Think: Apple + Four Seasons + healthcare concierge.

CRITICAL RULES:
- NEVER diagnose conditions or prescribe medications
- NEVER make medical guarantees
- NEVER use fear-based language
- ALWAYS recommend consulting their healthcare provider for medical questions
- ALWAYS end uncertain health questions with "Please consult your assigned healthcare provider"

Always remind clients: "SAFE-T 4LIFE™ is an educational and coordination support system — not a replacement for professional medical advice."

When greeting, be warm and personal. Ask how they are feeling about their journey. Be their calm, organized, knowledgeable companion.`;

const QUICK_PROMPTS = [
  { label: 'How do I prepare?', text: 'What should I do to prepare for my upcoming procedure and travel?' },
  { label: 'Document checklist', text: 'What documents do I need for my medical travel?' },
  { label: 'Recovery guidance', text: 'What should I expect during recovery and how can I take care of myself?' },
  { label: 'I feel anxious', text: 'I am feeling a bit anxious and nervous about my upcoming procedure. Can you help?' },
  { label: 'Visa help', text: 'I need help understanding my visa requirements for medical travel.' },
  { label: 'Talk to a human', text: 'I would like to speak with a human concierge or coordinator.' },
];

const STAGE_MESSAGES = {
  consultation: "You're in the consultation stage. This is the beginning of your journey — take your time, ask questions, and let us guide you.",
  planning: "You're in the planning stage. We'll help coordinate your travel, documents, and accommodation step by step.",
  booking: "Your booking is being arranged. Keep your documents ready and watch for confirmation messages.",
  travel: "Travel day is approaching! Remember to bring all medical documents, medications, and recovery essentials.",
  procedure: "Procedure day is near. Rest well, follow your pre-procedure instructions, and know your care team is ready for you.",
  recovery: "You're in recovery. Rest, hydrate, and follow your care instructions. SAFE-T 4LIFE™ is checking in on you.",
  aftercare: "You're in aftercare. Keep up with your follow-up appointments and reach out anytime you have questions.",
};

export default function SafeTCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const closeTimeoutRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome back. **SAFE-T 4LIFE™** is here to support your healthcare journey. 💚\n\nI'm your personal healthcare travel companion — here to guide, reassure, and keep you organized every step of the way.\n\nHow are you feeling about your journey today?",
      id: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pulse after 4s to draw attention
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;
    setInput('');
    const userMsg = { role: 'user', content: userText, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const prompt = `${SYSTEM_PROMPT}\n\nConversation history:\n${history.map(m => `${m.role === 'user' ? 'Client' : 'SAFE-T 4LIFE™'}: ${m.content}`).join('\n')}\n\nClient: ${userText}\n\nSAFE-T 4LIFE™:`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, { role: 'assistant', content: response, id: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm here with you. It seems there was a brief connection issue. Please try again, or contact our concierge team directly for immediate support. 💚",
        id: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
  };

  const renderMessage = (msg) => {
    const isUser = msg.role === 'user';
    // Simple markdown: **bold**, newlines
    const formatted = msg.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-slate-800 text-white rounded-br-sm'
            : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'
        }`}>
          {isUser
            ? <p>{msg.content}</p>
            : <p dangerouslySetInnerHTML={{ __html: formatted }} />
          }
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {!isOpen && showPulse && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-2.5 flex items-center gap-2 cursor-pointer max-w-[220px]"
              onClick={() => { setIsOpen(true); setShowPulse(false); }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <p className="text-xs font-semibold text-slate-700 leading-tight">SAFE-T 4LIFE™ is here for you</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            setIsOpen(true);
            setHasUnread(false);
          }}
          onMouseLeave={() => {
            closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 1000);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-700 to-blue-800 shadow-2xl shadow-emerald-900/30 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {isOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5 text-white" /></motion.div>
              : <motion.div key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}><Shield className="w-6 h-6 text-white" /></motion.div>
            }
          </AnimatePresence>
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          )}
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-emerald-600 opacity-20 animate-ping" />
        </motion.button>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            onMouseEnter={() => {
              if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            }}
            onMouseLeave={() => {
              closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 1000);
            }}
            initial={{ opacity: 0, scale: 0.92, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className={`fixed right-6 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all ${
              isMinimized
                ? 'bottom-24 w-80 h-16'
                : 'bottom-24 w-[360px] sm:w-[400px] h-[580px]'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-blue-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold text-sm tracking-wide">SAFE-T 4LIFE™</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-white/60 text-[10px] tracking-wider uppercase">Healthcare Companion · Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <Minimize2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {messages.map(renderMessage)}
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-start">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, delay, repeat: Infinity }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompts */}
                {messages.length <= 2 && (
                  <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-slate-100 bg-white">
                    {QUICK_PROMPTS.slice(0, 4).map(q => (
                      <button
                        key={q.label}
                        onClick={() => sendMessage(q.text)}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 hover:border-emerald-200 transition-all"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
                  <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="How can SAFE-T 4LIFE™ help you today?"
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none leading-relaxed max-h-24"
                      style={{ minHeight: '22px' }}
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                      <button
                        onClick={handleVoice}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isListening ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shadow-sm"
                      >
                        <Send className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                  {/* Disclaimer */}
                  <p className="text-[9px] text-slate-400 text-center mt-1.5 leading-relaxed px-1">
                    Educational & coordination support only — not a replacement for professional medical advice.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}