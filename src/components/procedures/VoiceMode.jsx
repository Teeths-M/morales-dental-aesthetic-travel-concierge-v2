import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, Volume2, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { extractProceduresFromText } from './ProcedureData';
import { PricingEngine } from '@/lib/pricingEngine';

export default function VoiceMode({ onProceduresDetected, onClose }) {
  const [phase, setPhase] = useState('ready'); // ready | listening | processing | done
  const [transcript, setTranscript] = useState('');
  const [detected, setDetected] = useState([]);
  const [bars, setBars] = useState([0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.4]);
  const [pricingEngine, setPricingEngine] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize pricing engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        const [procedures, countryPricing, doctorPricing, bundles, modifiers, rules] = await Promise.all([
          base44.entities.ProcedurePricing.list(),
          base44.entities.CountryPricing.list(),
          base44.entities.DoctorPricing.list(),
          base44.entities.ProcedureBundle.list(),
          base44.entities.ComplexityModifier.list(),
          base44.entities.PricingRule.list(),
        ]);

        const engine = new PricingEngine(procedures, countryPricing, doctorPricing, bundles, modifiers, rules);
        setPricingEngine(engine);
      } catch (error) {
        console.error('Failed to initialize pricing:', error);
      }
    };

    initEngine();
  }, []);

  // Animate waveform bars
  useEffect(() => {
    if (phase === 'listening') {
      const animate = () => {
        setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
        animFrameRef.current = setTimeout(animate, 120);
      };
      animate();
    }
    return () => clearTimeout(animFrameRef.current);
  }, [phase]);

  // Calculate price when procedures detected
  useEffect(() => {
    if (!pricingEngine || detected.length === 0) {
      setEstimatedPrice(null);
      return;
    }

    const procedures = detected.map(item => ({
      procedure_name: item.title || item.name,
      quantity: 1,
      complexity: 'moderate',
    }));

    const quote = pricingEngine.calculateFullQuote(procedures);
    setEstimatedPrice(quote.estimatedTotalLow);
  }, [pricingEngine, detected]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback: show manual text input
      setPhase('manual');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(text);
    };

    recognition.onend = () => {
      setPhase('processing');
      processTranscript(transcript || '');
    };

    recognition.onerror = () => {
      setPhase('manual');
    };

    recognition.start();
    setPhase('listening');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const processTranscript = async (text) => {
    if (!text.trim()) { setPhase('ready'); return; }
    // Try AI extraction first, fall back to local
    let results = [];
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical procedure extraction assistant. From this patient's spoken request, extract all medical/dental procedures mentioned.
        
Patient said: "${text}"

Return a JSON array of procedure names exactly as they would appear in a dental/aesthetic clinic menu. Be comprehensive - include synonyms, body locations mentioned, and quantities implied.

Examples:
- "I want veneers and whitening" → ["Porcelain Veneers", "Teeth Whitening"]
- "fake teeth and implants on the top" → ["Dentures", "Single Dental Implant"]
- "braces without metal" → ["Invisalign"]
- "I want a mommy makeover with lipo" → ["Mommy Makeover", "Liposuction"]`,
        response_json_schema: {
          type: 'object',
          properties: {
            procedures: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      const aiNames = res?.procedures || [];
      // Match AI names against our database
      const localMatches = extractProceduresFromText(text);
      const aiMatches = extractProceduresFromText(aiNames.join(' '));
      const combined = [...localMatches];
      aiMatches.forEach(p => { if (!combined.find(c => c.title === p.title)) combined.push(p); });
      results = combined;
    } catch {
      results = extractProceduresFromText(text);
    }
    setDetected(results);
    setPhase('done');
  };

  const confirmAndAdd = () => {
    onProceduresDetected(detected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-blue-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Voice Mode</p>
              <p className="text-white/70 text-xs">Speak your treatment goals naturally</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6">
          {/* Ready */}
          {phase === 'ready' && (
            <div className="text-center py-4">
              <p className="text-slate-600 text-sm mb-2 leading-relaxed">
                Click the microphone and speak naturally. For example:
              </p>
              <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-6 text-left">
                <p className="text-xs text-slate-400 font-semibold mb-1">EXAMPLE</p>
                <p className="text-sm text-slate-600 italic leading-relaxed">
                  "I want veneers, whitening, and a couple of implants on the upper jaw."
                </p>
              </div>
              <button
                onClick={startListening}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-700 to-blue-800 shadow-lg shadow-emerald-200 flex items-center justify-center mx-auto hover:scale-105 transition-transform"
              >
                <Mic className="w-8 h-8 text-white" />
              </button>
              <p className="text-xs text-slate-400 mt-3">Tap to start speaking</p>
            </div>
          )}

          {/* Manual fallback */}
          {phase === 'manual' && (
            <div className="py-4">
              <p className="text-sm text-slate-600 mb-3">Voice not available. Type your procedures below:</p>
              <textarea
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
                rows={3}
                placeholder="e.g. I want veneers, whitening, and implants on the upper jaw..."
                onChange={e => setTranscript(e.target.value)}
              />
              <button
                onClick={() => { setPhase('processing'); processTranscript(transcript); }}
                className="mt-3 w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm"
              >
                Analyze Procedures
              </button>
            </div>
          )}

          {/* Listening */}
          {phase === 'listening' && (
            <div className="text-center py-4">
              <p className="text-emerald-700 text-sm font-semibold mb-4">Listening… speak now</p>
              {/* Waveform */}
              <div className="flex items-center justify-center gap-1 h-16 mb-4">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-gradient-to-t from-emerald-700 to-blue-700"
                    animate={{ height: `${h * 56}px` }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
              {transcript && (
                <p className="text-xs text-slate-500 italic mb-4 min-h-[20px]">"{transcript}"</p>
              )}
              <button
                onClick={stopListening}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg flex items-center justify-center mx-auto"
              >
                <MicOff className="w-6 h-6 text-white" />
              </button>
              <p className="text-xs text-slate-400 mt-3">Tap to stop</p>
            </div>
          )}

          {/* Processing */}
          {phase === 'processing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-emerald-700 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">AI is analyzing your request…</p>
              <p className="text-xs text-slate-400">Matching procedures to our catalog</p>
              {transcript && (
                <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3 text-left">
                  <p className="text-xs text-slate-400 mb-1">YOU SAID</p>
                  <p className="text-xs text-slate-600 italic">"{transcript}"</p>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="py-2">
              {transcript && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">You said</p>
                  <p className="text-xs text-slate-600 italic">"{transcript}"</p>
                </div>
              )}
              <div className="mb-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">
                  {detected.length} procedure{detected.length !== 1 ? 's' : ''} detected
                </p>
                {detected.length === 0 ? (
                  <p className="text-sm text-slate-500">No procedures detected. Please try again or search manually.</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                      {detected.map(p => (
                        <div key={p.title} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-emerald-800">{p.title}</p>
                            <p className="text-[10px] text-emerald-600">{p.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Estimated Price Box */}
                    {estimatedPrice && (
                      <motion.div
                        className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <p className="text-[10px] font-bold text-emerald-700 uppercase">Estimated Cost</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-700">
                          From ${estimatedPrice.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-1">
                          Final pricing requires consultation
                        </p>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTranscript(''); setDetected([]); setPhase('ready'); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50"
                >
                  Try Again
                </button>
                {detected.length > 0 && (
                  <button
                    onClick={confirmAndAdd}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm"
                  >
                    Add to My List
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}