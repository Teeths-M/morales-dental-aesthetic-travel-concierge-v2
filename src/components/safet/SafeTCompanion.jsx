import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Send, Mic, MicOff, Minimize2, Maximize2, Shield, ChevronRight, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { analyseCompatibility } from '@/lib/procedureCompatibility';

// ── Page context map — injected into every LLM call ────────────────────────
// Tells the assistant what the current page is for and what actions are available.
const PAGE_CONTEXT_MAP = {
  '/': { name: 'Homepage', description: 'The Morales homepage. Users can explore medical and aesthetic travel concierge services, toggle between Medical and Non-Medical modes, and begin their journey by booking a consultation or browsing procedures.' },
  '/procedures': { name: 'Procedures & Treatments', description: 'Users browse, search, and select dental, aesthetic, bariatric, and wellness procedures to add to their treatment plan. Voice Mode lets them describe goals naturally. Selecting procedures builds their plan before booking.' },
  '/discover': { name: 'Discover Specialists', description: 'Users search for verified doctors and clinics by procedure type, destination country, city, and rating. Each card links to a booking flow.' },
  '/booking': { name: 'Consultation Booking', description: 'The multi-step booking form — users provide personal info, medical history, travel preferences, and procedure selection to submit a consultation request. SAFE-T scanning runs after submission.' },
  '/dashboard': { name: 'Patient Dashboard', description: 'The main hub showing case status, journey stage, upcoming steps, uploaded documents, and messages from the care team.' },
  '/safe-t': { name: 'SAFE-T 4LIFE™ Safety Dashboard', description: 'The safety hub — medical risk scanning, Emergency PIN setup, travel readiness checklist, vaccination tracking, and recovery monitoring tabs.' },
  '/passport-vault': { name: 'Passport Vault', description: 'AES-256 encrypted secure storage for travel and medical documents — passport, visa, tickets, insurance, and medical records. Documents cache for offline access.' },
  '/visa-assist': { name: 'AI Visa Assist', description: 'Checks visa requirements by nationality and destination. Provides document checklists, official application portal links, and a tracker to monitor application status.' },
  '/how-it-works': { name: 'How It Works', description: 'A 7-step guide through the Morales patient journey — from first consultation through procedure, recovery, and aftercare follow-up.' },
  '/emergency': { name: 'Emergency SOS Hub', description: 'Emergency escalation page with dispatch options for police, ambulance, private security, and urgent pickup. Works offline via queued dispatch.' },
  '/emergency-access': { name: 'Emergency PIN Access', description: 'PIN-protected emergency access to vault documents and SOS tools — works without internet or a Morales account login.' },
  '/emergency-manifest': { name: 'Emergency Manifest', description: 'PIN-protected emergency medical profile for first responders — includes blood type, allergies, medications, emergency contacts, and case reference.' },
  '/offline': { name: 'Offline Capabilities', description: 'Shows what works without internet — SMS shortcodes, emergency PIN, offline vault documents, and QR access tokens.' },
  '/trip-overview': { name: 'Trip Overview', description: 'Full itinerary view including flights, hotel, procedure schedule, recovery days, and aftercare — all in one timeline.' },
  '/partner-signup': { name: 'Partner Network', description: 'The partner onboarding page where travel agencies, chauffeur services, doctors/clinics, companions, and security agencies can apply to join the Morales network.' },
};

// Human escalation — intercept before calling LLM, open WhatsApp directly
const WHATSAPP_URL = 'https://wa.me/18005550199?text=Hello%20Morales%20Concierge%2C%20I%20need%20to%20speak%20with%20a%20human%20coordinator.';
const HUMAN_ESCALATION_TRIGGERS = ['talk to a human', 'speak with a human', 'human coordinator', 'real person', 'speak to someone', 'connect me', 'talk to someone', 'human agent', 'live agent'];

// Language map for voice recognition
const VOICE_LANG_MAP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', de: 'de-DE', it: 'it-IT' };

const SYSTEM_PROMPT = `You are SAFE-T 4LIFE™, the premium AI healthcare travel companion for Morales Dental & Aesthetic Travel Concierge.

Your role:
- Emotionally support and reassure clients throughout their healthcare journey
- Guide step-by-step through consultation, planning, travel, procedure, and recovery stages
- Help with preparation checklists, travel documents, and visa questions
- Provide educational healthcare information (never diagnose or prescribe)
- Answer "what is this page?" or "what can I do here?" using the current page context provided below
- Be a site-wide concierge — no user should ever feel lost navigating Morales

NAVIGATION LINKS — MANDATORY:
Whenever you refer a user to a page or feature, ALWAYS include a clickable link using this exact format: [Button Label →](/path)
Examples:
  [Browse Procedures →](/procedures)   [Book a Consultation →](/booking)
  [My Passport Vault →](/passport-vault)   [Discover Specialists →](/discover)
  [SAFE-T Dashboard →](/safe-t)   [Visa Assist →](/visa-assist)
  [How It Works →](/how-it-works)   [My Dashboard →](/dashboard)
  [Emergency SOS →](/emergency)   [Emergency PIN Access →](/emergency-access)
Never just name a page in text — always provide the link so the user can click directly.

CRITICAL RULES:
- NEVER diagnose or prescribe
- NEVER make medical guarantees
- NEVER use fear-based language
- ALWAYS recommend consulting their assigned healthcare provider for clinical questions
- Always note: "SAFE-T 4LIFE™ is an educational and coordination support system — not a replacement for professional medical advice."`;

const getCompanionLabels = (lang) => ({
  prompt: lang === 'es' ? '¿Cómo puede ayudarte hoy?' : lang === 'fr' ? 'Comment puis-je vous aider ?' : 'How can I help you today?',
  welcome: lang === 'es' ? 'Bienvenido. **SAFE-T 4LIFE™** está aquí para apoyar tu viaje de salud. 💚\n\n¿Cómo te sientes sobre tu viaje hoy?' : lang === 'fr' ? 'Bienvenue. **SAFE-T 4LIFE™** est là pour vous soutenir. 💚\n\nComment vous sentez-vous par rapport à votre voyage ?' : 'Welcome. **SAFE-T 4LIFE™** is here to support your healthcare journey. 💚\n\nHow are you feeling about your journey today?',
  disclaimer: lang === 'es' ? 'Apoyo educativo y de coordinación — no reemplaza el consejo médico profesional.' : lang === 'fr' ? 'Support éducatif uniquement — pas un substitut aux conseils médicaux.' : 'Educational & coordination support only — not a replacement for professional medical advice.',
  online: lang === 'es' ? 'Healthcare Companion · En línea' : lang === 'fr' ? 'Compagnon de Santé · En ligne' : 'Healthcare Companion · Online',
});

const DEFAULT_QUICK_PROMPTS = [
  { label: 'What is this page?', text: 'What is this page for and what can I do here?' },
  { label: 'How do I prepare?', text: 'What should I do to prepare for my upcoming procedure and travel?' },
  { label: 'Document checklist', text: 'What documents do I need for my medical travel?' },
  { label: 'Recovery guidance', text: 'What should I expect during recovery and how can I take care of myself?' },
  { label: 'I feel anxious', text: 'I am feeling anxious about my upcoming procedure. Can you help?' },
  { label: 'Visa help', text: 'I need help understanding my visa requirements for medical travel.' },
  { label: 'Talk to a human', text: 'I would like to speak with a human concierge or coordinator.' },
];

const HIGH_ANESTHESIA_QUICK_PROMPTS = [
  { label: 'What is this page?', text: 'What is this page for and what can I do here?' },
  { label: 'Staged recovery?', text: 'Can you explain how staged recovery works for a high-anesthesia procedure combination?' },
  { label: 'Medical clearances?', text: 'What medical clearances are required before undergoing multiple procedures?' },
  { label: 'Is this safe?', text: 'Can you reassure me about the safety review process for my procedure combination?' },
  { label: 'Talk to coordinator', text: 'I would like to speak directly with my care coordinator about my procedures.' },
];

const SafeTCompanionComponent = () => {
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { pathname } = useLocation();
  const labels = getCompanionLabels(appLanguage);

  // Page context — matched on current route, falls back to prefix match for sub-routes
  const currentPageContext = useMemo(() => {
    if (PAGE_CONTEXT_MAP[pathname]) return PAGE_CONTEXT_MAP[pathname];
    const prefix = Object.keys(PAGE_CONTEXT_MAP).find(k => k !== '/' && pathname.startsWith(k));
    return prefix ? PAGE_CONTEXT_MAP[prefix] : null;
  }, [pathname]);

  const { items } = useCart();
  const compatResult = items && items.length >= 2 ? analyseCompatibility(items) : null;
  const isHighAnesthesia = compatResult && (compatResult.level === 'RED' || compatResult.level === 'YELLOW') && compatResult.totalAnesthesiaHrs >= 4;

  const contextualGreeting = useMemo(() =>
    isHighAnesthesia
      ? `I see your selected treatment sequence involves a longer recovery footprint (~${compatResult.totalAnesthesiaHrs.toFixed(1)} hours total anesthesia). I'm here to walk you through staged recovery plans and medical clearances for this combination. 💚\n\nWhat can I clarify for you?`
      : labels.welcome,
    [isHighAnesthesia, compatResult?.totalAnesthesiaHrs, labels.welcome]
  );

  const activeQuickPrompts = useMemo(() =>
    isHighAnesthesia ? HIGH_ANESTHESIA_QUICK_PROMPTS : DEFAULT_QUICK_PROMPTS,
    [isHighAnesthesia]
  );

  const [messages, setMessages] = useState([{ role: 'assistant', content: contextualGreeting, id: Date.now() }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showAlertPill, setShowAlertPill] = useState(false);
  const alertPillTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const handleLangChange = (e) => setAppLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  // Reset greeting on high-anesthesia context change
  const prevAlertRef = useRef(isHighAnesthesia);
  useEffect(() => {
    if (prevAlertRef.current !== isHighAnesthesia) {
      prevAlertRef.current = isHighAnesthesia;
      setMessages([{ role: 'assistant', content: contextualGreeting, id: Date.now() }]);
      if (isHighAnesthesia && !isOpen) {
        setShowAlertPill(true);
        if (alertPillTimerRef.current) clearTimeout(alertPillTimerRef.current);
        alertPillTimerRef.current = setTimeout(() => setShowAlertPill(false), 5000);
      }
    }
    return () => { if (alertPillTimerRef.current) clearTimeout(alertPillTimerRef.current); };
  }, [isHighAnesthesia, contextualGreeting, isOpen]);

  useEffect(() => {
    if (isOpen) { setHasUnread(false); setShowAlertPill(false); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [isOpen]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText, id: Date.now() }]);
    setIsLoading(true);

    // Human escalation — bypass LLM, open WhatsApp directly
    if (HUMAN_ESCALATION_TRIGGERS.some(t => userText.toLowerCase().includes(t))) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'll connect you with a Morales concierge right now. 💚\n\nA coordinator is ready to assist you personally:\n\n[Chat with Concierge →](${WHATSAPP_URL})\n\nTypically available within a few minutes during business hours.`,
        id: Date.now() + 1,
      }]);
      setIsLoading(false);
      window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

      // Build context-aware system prompt
      let systemPrompt = SYSTEM_PROMPT;
      if (currentPageContext) {
        systemPrompt += `\n\nCURRENT PAGE: ${currentPageContext.name}\nPurpose: ${currentPageContext.description}\nHelp the user understand what they can do here and guide them to relevant next steps with navigation links.`;
      }
      if (isHighAnesthesia) {
        systemPrompt += `\n\nALERT: HIGH_ANESTHESIA_HOURS. Patient selected ${items.length} procedures with ~${compatResult.totalAnesthesiaHrs.toFixed(1)} hours anesthesia (${compatResult.level} risk). Focus on staged recovery and clearances.`;
      }

      const prompt = `${systemPrompt}\n\nConversation:\n${history.map(m => `${m.role === 'user' ? 'Client' : 'SAFE-T 4LIFE™'}: ${m.content}`).join('\n')}\n\nClient: ${userText}\n\nSAFE-T 4LIFE™:`;
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, { role: 'assistant', content: response, id: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Brief connection issue — please try again, or [chat with our concierge →](" + WHATSAPP_URL + "). 💚",
        id: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, currentPageContext, isHighAnesthesia, items.length, compatResult?.totalAnesthesiaHrs, compatResult?.level]);

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = VOICE_LANG_MAP[appLanguage] || 'en-US';
    rec.continuous = false;
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
  };

  // Renders assistant messages — parses **bold** and [text](/path) into React elements
  const formatContent = useCallback((text) =>
    text.split('\n').map((line, lineIdx, allLines) => {
      const MARKUP = /\*\*(.*?)\*\*|\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let key = 0;
      let match;

      while ((match = MARKUP.exec(line)) !== null) {
        if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
        if (match[1] !== undefined) {
          parts.push(<strong key={key++}>{match[1]}</strong>);
        } else if (match[2] && match[3]) {
          const href = match[3];
          const label = match[2];
          const cls = 'inline-flex items-center gap-0.5 text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800 transition-colors';
          parts.push(href.startsWith('http')
            ? <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}<ChevronRight className="w-3 h-3" /></a>
            : <Link key={key++} to={href} onClick={() => setIsOpen(false)} className={cls}>{label}<ChevronRight className="w-3 h-3" /></Link>
          );
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) parts.push(line.slice(lastIndex));

      return (
        <React.Fragment key={lineIdx}>
          {parts.length > 0 ? parts : line}
          {lineIdx < allLines.length - 1 && <br />}
        </React.Fragment>
      );
    }), []);

  const renderMessage = useCallback((msg) => {
    const isUser = msg.role === 'user';
    return (
      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser ? 'bg-slate-800 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'
        }`}>
          {isUser ? msg.content : formatContent(msg.content)}
        </div>
      </motion.div>
    );
  }, [formatContent]);

  return (
    <>
      {/* Floating trigger */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {!isOpen && showAlertPill && (
            <motion.div initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 280 }}
              className="bg-amber-50 border border-amber-300 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2 cursor-pointer max-w-[240px]"
              onClick={() => { setIsOpen(true); setShowAlertPill(false); }}>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <p className="text-[11px] font-semibold text-amber-800 leading-tight">Review recommended. Click to chat with your companion.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setIsOpen(o => !o)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-700 to-blue-800 shadow-2xl shadow-emerald-900/30 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5 text-white" /></motion.div>
              : <motion.div key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}><Shield className="w-6 h-6 text-white" /></motion.div>}
          </AnimatePresence>
          {hasUnread && !isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
          {isHighAnesthesia && !isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />}
        </motion.button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className={`fixed right-6 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all ${
              isMinimized ? 'bottom-24 w-80 h-16' : 'bottom-24 w-[360px] sm:w-[400px] h-[580px]'
            }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-blue-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold text-sm tracking-wide">SAFE-T 4LIFE™</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-white/60 text-[10px] tracking-wider uppercase">{labels.online}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(!isMinimized)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <Minimize2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <button onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Page context pill — shows which page the assistant knows about */}
                {currentPageContext && (
                  <div className="px-4 pt-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-700">{currentPageContext.name}</span>
                    </div>
                  </div>
                )}

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

                {/* Persistent quick actions — always visible, horizontally scrollable */}
                <div className="px-3 pt-2 pb-1.5 flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white flex-shrink-0 scrollbar-hide">
                  {activeQuickPrompts.map(q => (
                    <button key={q.label} onClick={() => sendMessage(q.text)}
                      className="text-[10px] font-medium px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 border border-slate-200 hover:border-emerald-200 transition-all whitespace-nowrap flex-shrink-0">
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
                  <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={labels.prompt} rows={1}
                      className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none leading-relaxed max-h-24"
                      style={{ minHeight: '22px' }} />
                    <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                      <button onClick={handleVoice}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-emerald-600'}`}>
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shadow-sm">
                        <Send className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 text-center mt-1.5 leading-relaxed px-1">{labels.disclaimer}</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(SafeTCompanionComponent);
