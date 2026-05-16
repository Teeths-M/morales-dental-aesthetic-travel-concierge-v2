import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Search, Mic, MicOff, Globe, Calendar, Users, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PASSPORT_COUNTRIES, DESTINATIONS, TRAVEL_PURPOSES, getVisaRule } from './visaData';
import { base44 } from '@/api/base44Client';

const STEPS = [
  { id: 1, title: 'Your Passport', emoji: '🛂', hint: 'Where are you from?' },
  { id: 2, title: 'Destination', emoji: '✈️', hint: 'Where are you traveling?' },
  { id: 3, title: 'Purpose', emoji: '💊', hint: 'Why are you traveling?' },
  { id: 4, title: 'Travel Details', emoji: '📅', hint: 'When are you going?' },
  { id: 5, title: 'AI Evaluation', emoji: '🤖', hint: 'Checking your requirements...' },
];

export default function VisaWizard({ onResult }) {
  const [step, setStep] = useState(1);
  const [passportSearch, setPassportSearch] = useState('');
  const [passport, setPassport] = useState(null);
  const [destination, setDestination] = useState(null);
  const [purpose, setPurpose] = useState(null);
  const [travelDate, setTravelDate] = useState('');
  const [stayDuration, setStayDuration] = useState('7');
  const [hasCompanion, setHasCompanion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef(null);

  const filteredCountries = PASSPORT_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(passportSearch.toLowerCase())
  ).slice(0, 12);

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser. Please type your details.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setVoiceText(text);
      setIsListening(false);
      await parseVoiceInput(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const parseVoiceInput = async (text) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract travel information from this statement: "${text}". 
        Return JSON with: nationality (country name), destination (country name), purpose (one of: dental, cosmetic, medical, recovery, wellness, companion).
        Use null for anything not mentioned.`,
        response_json_schema: {
          type: 'object',
          properties: {
            nationality: { type: 'string' },
            destination: { type: 'string' },
            purpose: { type: 'string' },
          }
        }
      });
      if (result.nationality) {
        const found = PASSPORT_COUNTRIES.find(c => c.name.toLowerCase().includes(result.nationality.toLowerCase()));
        if (found) { setPassport(found); setPassportSearch(found.name); }
      }
      if (result.destination) {
        const found = DESTINATIONS.find(d => d.name.toLowerCase().includes(result.destination.toLowerCase()));
        if (found) setDestination(found);
      }
      if (result.purpose) {
        const found = TRAVEL_PURPOSES.find(p => p.id === result.purpose);
        if (found) setPurpose(found);
      }
      if (result.nationality && result.destination) setStep(3);
      else if (result.nationality) setStep(2);
    } catch (e) {
      // Fallback: simple text parsing
      const lower = text.toLowerCase();
      PASSPORT_COUNTRIES.forEach(c => { if (lower.includes(c.name.toLowerCase())) { setPassport(c); setPassportSearch(c.name); } });
      DESTINATIONS.forEach(d => { if (lower.includes(d.name.toLowerCase())) setDestination(d); });
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    await new Promise(r => setTimeout(r, 2200));
    const rule = getVisaRule(passport?.code, destination?.code);
    let aiSummary = '';
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a friendly, reassuring medical travel visa consultant for SAFE-T VISA ASSIST™.
        A patient from ${passport?.name} wants to travel to ${destination?.name} for ${purpose?.label}.
        Visa status: ${rule.status}. Stay: ${stayDuration} days. Notes: ${rule.notes}.
        Write 2–3 sentences in a warm, calm, non-intimidating tone explaining their situation and next steps.
        Keep it simple — like explaining to a nervous traveler. No bullet points, just flowing friendly text.`
      });
      aiSummary = resp;
    } catch (e) {
      aiSummary = `Based on your ${passport?.name} passport, your travel to ${destination?.name} for ${purpose?.label} requires the following steps. Please review the document checklist carefully and reach out to our concierge team if you need assistance. We're here to make this process smooth and stress-free.`;
    }
    setIsEvaluating(false);
    onResult({
      passport,
      destination,
      purpose,
      travelDate,
      stayDuration,
      hasCompanion,
      rule,
      aiSummary,
    });
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Voice input banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-2xl flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">🎙️ Try Voice Mode</p>
          <p className="text-xs text-slate-500 mt-0.5">Say: <em>"I'm from Trinidad and I want to travel to Venezuela for dental implants"</em></p>
          {voiceText && <p className="text-xs text-blue-600 mt-1 font-medium">Heard: "{voiceText}"</p>}
        </div>
        <button
          onClick={handleVoice}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isListening ? 'Listening...' : 'Speak'}
        </button>
      </div>

      {/* Step progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                step > s.id ? 'bg-emerald-500 text-white' :
                step === s.id ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                'bg-slate-100 text-slate-400'
              }`}>
                {step > s.id ? '✓' : s.emoji}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-1 w-full mx-1 rounded-full transition-all hidden sm:block ${step > s.id + 1 ? 'bg-emerald-400' : step === s.id + 1 ? 'bg-gradient-to-r from-emerald-400 to-slate-200' : 'bg-slate-100'}`} style={{ width: '40px' }} />
              )}
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">Step {step} of {STEPS.length} — {STEPS[step - 1].title}</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:p-8"
        >
          {/* Step 1: Passport */}
          {step === 1 && (
            <div>
              <p className="text-3xl mb-3 text-center">🛂</p>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Where is your passport from?</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Select your passport country to check visa requirements</p>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={passportSearch}
                  onChange={e => { setPassportSearch(e.target.value); setPassport(null); }}
                  placeholder="Search country..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {passport && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">{passport.flag}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{passport.name}</p>
                    <p className="text-xs text-emerald-600">✓ Selected</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setPassport(c); setPassportSearch(c.name); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border text-left transition-all ${
                      passport?.code === c.code ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Destination */}
          {step === 2 && (
            <div>
              <p className="text-3xl mb-3 text-center">✈️</p>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Where are you traveling?</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Select your medical travel destination</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DESTINATIONS.map(d => (
                  <button
                    key={d.code}
                    onClick={() => setDestination(d)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      destination?.code === d.code ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{d.flag}</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                        {d.island && <p className="text-xs text-slate-400">{d.island}</p>}
                      </div>
                      {destination?.code === d.code && <span className="ml-auto text-blue-600 text-xs font-bold">✓</span>}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{d.highlight}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Purpose */}
          {step === 3 && (
            <div>
              <p className="text-3xl mb-3 text-center">💊</p>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-1">What is the purpose of your visit?</h2>
              <p className="text-sm text-slate-500 text-center mb-6">This helps us generate the right document checklist</p>
              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_PURPOSES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      purpose?.id === p.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-2xl mb-2">{p.emoji}</div>
                    <p className="font-semibold text-slate-800 text-sm">{p.label}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                    {purpose?.id === p.id && <span className="text-emerald-600 text-xs font-bold">✓ Selected</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Travel Details */}
          {step === 4 && (
            <div>
              <p className="text-3xl mb-3 text-center">📅</p>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Tell us about your trip</h2>
              <p className="text-sm text-slate-500 text-center mb-6">These details help us give you the most accurate guidance</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Travel Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={e => setTravelDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Length of Stay</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['7', '14', '21', '30'].map(d => (
                      <button
                        key={d}
                        onClick={() => setStayDuration(d)}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                          stayDuration === d ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Or type custom: <input type="number" min="1" max="365" value={stayDuration} onChange={e => setStayDuration(e.target.value)} className="inline-block w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm ml-1" /> days</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Traveling with a companion?</label>
                  <div className="flex gap-3">
                    {[{ val: true, label: '👫 Yes' }, { val: false, label: '👤 No' }].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setHasCompanion(opt.val)}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                          hasCompanion === opt.val ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Evaluating */}
          {step === 5 && (
            <div className="text-center py-8">
              {isEvaluating ? (
                <div>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Checking your requirements...</h2>
                  <p className="text-sm text-slate-500 mb-6">SAFE-T VISA ASSIST™ is analyzing visa rules for your journey</p>
                  <div className="space-y-2 text-left max-w-xs mx-auto">
                    {['Checking passport database...', 'Verifying destination rules...', 'Generating document checklist...', 'Creating AI summary...'].map((t, i) => (
                      <motion.div
                        key={t}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.5 }}
                        className="flex items-center gap-2 text-xs text-slate-500"
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        {t}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-4">🌍</p>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Ready to check your visa?</h2>
                  <div className="text-left bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Passport:</span><span className="font-semibold">{passport?.flag} {passport?.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Destination:</span><span className="font-semibold">{destination?.flag} {destination?.name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Purpose:</span><span className="font-semibold">{purpose?.emoji} {purpose?.label}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Stay:</span><span className="font-semibold">{stayDuration} days{travelDate ? ` from ${travelDate}` : ''}</span></div>
                    {hasCompanion && <div className="flex justify-between text-sm"><span className="text-slate-500">Companion:</span><span className="font-semibold">👫 Yes</span></div>}
                  </div>
                  <Button
                    onClick={handleEvaluate}
                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white font-bold py-4 rounded-2xl text-base shadow-lg"
                  >
                    🤖 Run AI Visa Check
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex gap-3 mt-5">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl py-5 text-sm font-semibold border-slate-200">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 1 && !passport) ||
              (step === 2 && !destination) ||
              (step === 3 && !purpose)
            }
            className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white rounded-xl py-5 text-sm font-bold shadow-md disabled:opacity-40"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}