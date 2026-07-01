// @ts-nocheck — Web Speech API not in standard DOM types
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SUGGESTED = [
  "What is an e-visa and how do I apply?",
  "How long does visa approval usually take?",
  "Can my companion travel with me?",
  "What documents do I need for Venezuela?",
  "Does my US passport need a visa for Colombia?",
  "What vaccinations do I need for Thailand?",
  "How much funds do I need to show at the border?",
  "What is a medical invitation letter?",
];

const SYSTEM_PROMPT = `You are SAFE-T VISA ASSISTâ„¢, a friendly, warm, and reassuring AI travel visa advisor for Morales Medical Travel Safety.

Your role is to:
- Help international medical travelers understand visa requirements
- Explain documents needed in simple, non-intimidating language
- Guide patients planning medical travel to Venezuela, Colombia, Dominican Republic, Cuba, Thailand, Turkey, Mexico, Costa Rica, Brazil, and Panama
- Reduce travel anxiety with calm, clear explanations
- Always remind users to verify with official embassy sources

Your tone is:
- Warm, friendly, and reassuring â€” like a knowledgeable travel companion
- Simple language â€” no government jargon
- Empathetic to the anxiety of international travel
- Professional but approachable

Always end responses with a helpful next step or offer to answer follow-up questions.
Keep responses concise (2â€“4 short paragraphs max) and easy to read.
Use occasional emojis to keep the tone friendly and approachable.`;

export default function VisaAIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! ðŸ‘‹ I'm your SAFE-T VISA ASSISTâ„¢ AI advisor. I'm here to help you understand visa requirements, prepare your travel documents, and feel confident about your international medical journey.\n\nWhat would you like to know? You can ask me anything about visas, travel documents, or entry requirements â€” or choose one of the common questions below!",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const MAX_MESSAGES = 20;
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;

    if (messages.filter(m => m.role === 'user').length >= MAX_MESSAGES) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'You have reached the session limit. Please contact our concierge team directly for further assistance.'
      }]);
      return;
    }

    const now = Date.now();
    if (now - lastSentAt < 3000) return;
    setLastSentAt(now);

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const recentMessages = messages.slice(-6);
    const history = recentMessages.map(m => `${m.role === 'user' ? 'Patient' : 'VISA ASSISTâ„¢'}: ${m.content}`).join('\n\n');

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nConversation history:\n${history}\n\nPatient: ${userMsg}\n\nSAFE-T VISA ASSISTâ„¢:`,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I apologize â€” I'm having a brief technical moment. ðŸ˜Š For immediate assistance with visa requirements, please contact our concierge team or check your destination's official embassy website. Is there anything else I can help you with?"
      }]);
    }
    setLoading(false);
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-semibold text-slate-800">AI Visa Assistant</h2>
        <p className="text-slate-500 text-sm mt-1">Ask anything about visas, documents, or travel requirements</p>
      </div>

      {/* Chat window */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-emerald-600">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-semibold text-sm">AI</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">SAFE-T VISA ASSISTâ„¢</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <p className="text-white/70 text-xs">Online & Ready</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([{
              role: 'assistant',
              content: "Hello again! ðŸ‘‹ I've cleared our conversation. What visa or travel question can I help you with?"
            }])}
            className="ml-auto text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-semibold">AI</span>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm'
                    : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-slate-600 text-xs">You</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2.5 justify-start"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">AI</span>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-white">
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Common Questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.slice(0, 4).map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-100 transition-colors text-left leading-tight"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex gap-2">
            <button
              onClick={handleVoice}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about visas, documents, entry requirements..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 text-center text-xs text-slate-400">
        AI responses are for guidance only. Always verify visa requirements with official embassy sources.
      </div>
    </div>
  );
}
