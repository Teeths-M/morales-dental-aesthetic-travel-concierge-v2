// @ts-nocheck — pre-existing type gaps
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Search, Mic, MicOff, Loader2, Check } from 'lucide-react';
import { PASSPORT_COUNTRIES, DESTINATIONS, TRAVEL_PURPOSES, getVisaRule } from './visaData';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const getSteps = (language) => [
  { id: 1, title: language === 'es' ? 'Pasaporte' : language === 'fr' ? 'Passeport' : 'Passport', label: language === 'es' ? 'Tu Pasaporte' : language === 'fr' ? 'Votre Passeport' : 'Your Passport' },
  { id: 2, title: language === 'es' ? 'Destino' : language === 'fr' ? 'Destination' : 'Destination', label: language === 'es' ? 'Destino' : language === 'fr' ? 'Destination' : 'Destination' },
  { id: 3, title: language === 'es' ? 'PropÃ³sito' : language === 'fr' ? 'Objectif' : 'Purpose', label: language === 'es' ? 'PropÃ³sito de la Visita' : language === 'fr' ? 'Objet de la Visite' : 'Purpose of Visit' },
  { id: 4, title: language === 'es' ? 'Detalles' : language === 'fr' ? 'DÃ©tails' : 'Details', label: language === 'es' ? 'Detalles del Viaje' : language === 'fr' ? 'DÃ©tails du Voyage' : 'Travel Details' },
  { id: 5, title: language === 'es' ? 'Verificar' : language === 'fr' ? 'VÃ©rifier' : 'Check', label: language === 'es' ? 'EvaluaciÃ³n IA' : language === 'fr' ? 'Ã‰valuation IA' : 'AI Evaluation' },
];

export default function VisaWizard({ onResult }) {
  const [language, setLanguage] = useState('en');
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

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const STEPS = getSteps(language);

  const filteredCountries = PASSPORT_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(passportSearch.toLowerCase())
  ).slice(0, 12);

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input is not available in this browser', {
        description: 'You can type your details instead.',
      });
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
    } catch (_e) {
      const lower = text.toLowerCase();
      PASSPORT_COUNTRIES.forEach(c => { if (lower.includes(c.name.toLowerCase())) { setPassport(c); setPassportSearch(c.name); } });
      DESTINATIONS.forEach(d => { if (lower.includes(d.name.toLowerCase())) setDestination(d); });
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    await new Promise(r => setTimeout(r, 2400));
    const rule = getVisaRule(passport?.code, destination?.code) || {
      status: 'unknown',
      notes: 'Visa requirements for this passport and destination combination are not in our current database. Please verify directly with the embassy or consulate.',
    };
    let aiSummary = '';
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a friendly, reassuring medical travel visa consultant for SAFE-T VISA ASSISTâ„¢.
        A patient from ${passport?.name} wants to travel to ${destination?.name} for ${purpose?.label}.
        Visa status: ${rule?.status || 'unknown â€” not in database'}. Stay: ${stayDuration} days. Notes: ${rule?.notes || 'Please advise the patient to check with their embassy directly.'}.
        Write 2â€“3 sentences in a warm, calm, non-intimidating tone explaining their situation and next steps.
        Keep it simple â€” like explaining to a nervous traveler. No bullet points, just flowing friendly text.`
      });
      // Without a response_json_schema, InvokeLLM can come back as
      // { result }/{ text } instead of a plain string -- storing it raw used
      // to hand an object down through onResult() to whatever renders
      // aiSummary. Same coercion this shape needs anywhere InvokeLLM is called directly.
      const text = typeof resp === 'string' ? resp : (resp?.result || resp?.text || '');
      if (!text) throw new Error('InvokeLLM returned no usable text');
      aiSummary = text;
    } catch (_e) {
      aiSummary = `Based on your ${passport?.name} passport, your travel to ${destination?.name} for ${purpose?.label} requires the following steps. Please review the document checklist carefully and reach out to our concierge team if you need assistance.`;
    }
    setIsEvaluating(false);
    onResult({ passport, destination, purpose, travelDate, stayDuration, hasCompanion, rule, aiSummary });
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Voice Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {language === 'es' ? 'Modo de Voz Disponible' : language === 'fr' ? 'Mode Vocal Disponible' : 'Voice Mode Available'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {language === 'es' ? 'Intenta: ' : language === 'fr' ? 'Essayez: ' : 'Try: '}<em>{language === 'es' ? '"Soy de Trinidad y quiero viajar a Venezuela para implantes dentales"' : language === 'fr' ? '"Je suis de TrinitÃ© et je veux voyager au Venezuela pour des implants dentaires"' : '"I\'m from Trinidad and I want to travel to Venezuela for dental implants"'}</em>
            </p>
            {voiceText && <p className="text-xs text-blue-600 mt-0.5 font-medium">{language === 'es' ? 'Detectado: ' : language === 'fr' ? 'DÃ©tectÃ©: ' : 'Detected: '}"{voiceText}"</p>}
          </div>
          <button
            onClick={handleVoice}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isListening ? (language === 'es' ? 'Escuchandoâ€¦' : language === 'fr' ? 'Ã€ l\'Ã©couteâ€¦' : 'Listeningâ€¦') : (language === 'es' ? 'Habla Ahora' : language === 'fr' ? 'Parlez Maintenant' : 'Speak Now')}
          </button>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-0 mb-5">
         {getSteps(language).map((s, i) => (
           <React.Fragment key={s.id}>
             <div className="flex flex-col items-center">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                 step > s.id
                   ? 'bg-emerald-500 text-white'
                   : step === s.id
                   ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
                   : 'bg-slate-100 text-slate-400'
               }`}>
                 {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
               </div>
               <span className={`text-[10px] mt-1 font-semibold hidden sm:block ${step === s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</span>
             </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 transition-all duration-500 ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Thin progress bar */}
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Card header strip */}
          <div className="px-7 pt-7 pb-5 border-b border-slate-100">
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-400 mb-1">
              {language === 'es' ? 'Paso' : language === 'fr' ? 'Ã‰tape' : 'Step'} {step} {language === 'es' ? 'de' : language === 'fr' ? 'sur' : 'of'} {getSteps(language).length}
            </p>
            <h2 className="font-display text-xl font-semibold text-slate-900">{getSteps(language)[step - 1].label}</h2>
          </div>

          <div className="p-7">
            {/* Step 1: Passport */}
            {step === 1 && (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={passportSearch}
                    onChange={e => { setPassportSearch(e.target.value); setPassport(null); }}
                    placeholder={language === 'es' ? 'Busca tu paÃ­s de pasaporte...' : language === 'fr' ? 'Recherchez votre pays de passeport...' : 'Search your passport country...'}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                {passport && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3"
                  >
                    {passport.code === 'OTHER' ? (
                      <span className="text-2xl">ðŸŒ</span>
                    ) : (
                      <img loading="lazy" decoding="async"
                        src={`https://flagcdn.com/w40/${passport.code.toLowerCase()}.png`}
                        width="32"
                        alt={passport.name}
                        className="rounded-sm"
                      />
                    )}
                    <div className="flex-1">
                       <p className="font-semibold text-slate-800 text-sm">{passport.name}</p>
                       <p className="text-xs text-emerald-600 font-medium">
                         {language === 'es' ? 'Seleccionado' : language === 'fr' ? 'SÃ©lectionnÃ©' : 'Selected'}
                       </p>
                     </div>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {filteredCountries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setPassport(c); setPassportSearch(c.name); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm border text-left transition-all ${
                        passport?.code === c.code
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {c.code === 'OTHER' ? (
                        <span className="text-base">ðŸŒ</span>
                      ) : (
                        <img loading="lazy" decoding="async"
                          src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                          srcSet={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png 2x`}
                          width="20"
                          alt={c.name}
                          className="rounded-sm flex-shrink-0"
                        />
                      )}
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Destination */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DESTINATIONS.map(d => (
                  <button
                    key={d.code}
                    onClick={() => setDestination(d)}
                    className={`p-4 rounded-xl border text-left transition-all group ${
                      destination?.code === d.code
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{d.flag}</span>
                      <div>
                        <p className={`font-semibold text-sm ${destination?.code === d.code ? 'text-white' : 'text-slate-800'}`}>{d.name}</p>
                        {d.island && <p className={`text-[11px] ${destination?.code === d.code ? 'text-blue-200' : 'text-slate-400'}`}>{d.island}</p>}
                      </div>
                      {destination?.code === d.code && <Check className="w-4 h-4 text-white ml-auto" />}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${destination?.code === d.code ? 'text-blue-100' : 'text-slate-500'}`}>{d.highlight}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Purpose */}
            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_PURPOSES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      purpose?.id === p.id
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-100'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-xl mb-2.5">{p.emoji}</div>
                    <p className={`font-semibold text-sm ${purpose?.id === p.id ? 'text-white' : 'text-slate-800'}`}>{p.label}</p>
                    <p className={`text-[11px] mt-1 leading-relaxed ${purpose?.id === p.id ? 'text-emerald-100' : 'text-slate-500'}`}>{p.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: Travel Details */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                     {language === 'es' ? 'Fecha Estimada de Viaje' : language === 'fr' ? 'Date de Voyage EstimÃ©e' : 'Estimated Travel Date'}
                   </label>
                   <input
                     type="date"
                     value={travelDate}
                     onChange={e => setTravelDate(e.target.value)}
                     min={new Date().toISOString().split('T')[0]}
                     className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                     {language === 'es' ? 'DuraciÃ³n de la Estancia' : language === 'fr' ? 'DurÃ©e du SÃ©jour' : 'Length of Stay'}
                   </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {['7', '14', '21', '30'].map(d => (
                      <button
                        key={d}
                        onClick={() => setStayDuration(d)}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                          stayDuration === d
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{language === 'es' ? 'Personalizado:' : language === 'fr' ? 'PersonnalisÃ©:' : 'Custom:'}</span>
                    <input
                      type="number" min="1" max="365"
                      value={stayDuration}
                      onChange={e => setStayDuration(e.target.value)}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>{language === 'es' ? 'dÃ­as' : language === 'fr' ? 'jours' : 'days'}</span>
                  </div>
                </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                     {language === 'es' ? 'Â¿Viajando con un compaÃ±ero?' : language === 'fr' ? 'Voyager avec un compagnon?' : 'Traveling with a companion?'}
                   </label>
                   <div className="flex gap-3">
                     {[
                       { val: true, label: language === 'es' ? 'SÃ­, con compaÃ±ero' : language === 'fr' ? 'Oui, avec compagnon' : 'Yes, with companion', icon: 'ðŸ‘«' }, 
                       { val: false, label: language === 'es' ? 'No, viajando solo' : language === 'fr' ? 'Non, voyager seul' : 'No, traveling alone', icon: 'ðŸ‘¤' }
                     ].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setHasCompanion(opt.val)}
                        className={`flex-1 flex items-center gap-2 justify-center py-3 rounded-xl text-sm font-semibold border transition-all ${
                          hasCompanion === opt.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <span>{opt.icon}</span>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Evaluate */}
            {step === 5 && (
              <div className="text-center">
                {isEvaluating ? (
                  <div className="py-8">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 opacity-20 animate-ping" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                        <Loader2 className="w-9 h-9 text-white animate-spin" />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">
                       {language === 'es' ? 'Analizando tu viajeâ€¦' : language === 'fr' ? 'Analyse de votre voyageâ€¦' : 'Analyzing your journeyâ€¦'}
                     </h2>
                     <p className="text-sm text-slate-400 mb-7">
                       SAFE-T VISA ASSISTâ„¢ {language === 'es' ? 'estÃ¡ verificando todos los requisitos' : language === 'fr' ? 'vÃ©rifie tous les exigences' : 'is checking all requirements'}
                     </p>
                     <div className="space-y-2.5 text-left max-w-xs mx-auto">
                       {(language === 'es' ? ['Comprobando base de datos de pasaporteâ€¦', 'Verificando reglas de destinoâ€¦', 'Generando lista de documentosâ€¦', 'Componiendo guÃ­a de IAâ€¦'] : language === 'fr' ? ['VÃ©rification de la base de donnÃ©es des passeportsâ€¦', 'VÃ©rification des rÃ¨gles de destinationâ€¦', 'GÃ©nÃ©ration de la liste de contrÃ´le des documentsâ€¦', 'ComposÃ©e de directives IAâ€¦'] : ['Checking passport databaseâ€¦', 'Verifying destination rulesâ€¦', 'Generating document checklistâ€¦', 'Composing AI guidanceâ€¦']).map((t, i) => (
                        <motion.div
                          key={t}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.55 }}
                          className="flex items-center gap-3 text-xs text-slate-500"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          {t}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <span className="text-2xl">ðŸŒ</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">
                      {language === 'es' ? 'Â¿Listo para verificar tu visa?' : language === 'fr' ? 'PrÃªt Ã  vÃ©rifier votre visa?' : 'Ready to check your visa?'}
                    </h2>
                    <p className="text-sm text-slate-400 mb-6">
                      {language === 'es' ? 'Revisa tus detalles a continuaciÃ³n y ejecuta la verificaciÃ³n de IA' : language === 'fr' ? 'Consultez vos dÃ©tails ci-dessous et exÃ©cutez la vÃ©rification IA' : 'Review your details below and run the AI check'}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6 text-left">
                      {[
                        { label: 'Passport', value: `${passport?.flag} ${passport?.name}` },
                        { label: 'Destination', value: `${destination?.flag} ${destination?.name}` },
                        { label: 'Purpose', value: `${purpose?.emoji} ${purpose?.label}` },
                        { label: 'Duration', value: `${stayDuration} days${travelDate ? ` from ${travelDate}` : ''}` },
                        ...(hasCompanion ? [{ label: language === 'es' ? 'CompaÃ±ero' : language === 'fr' ? 'Compagnon' : 'Companion', value: 'ðŸ‘« ' + (language === 'es' ? 'SÃ­' : language === 'fr' ? 'Oui' : 'Yes') }] : []),
                      ].map((row, i, arr) => (
                        <div key={row.label} className={`flex justify-between items-center px-4 py-3 ${i < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{row.label}</span>
                          <span className="text-sm font-semibold text-slate-800">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleEvaluate}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-200 transition-all"
                    >
                      {language === 'es' ? 'Ejecutar VerificaciÃ³n de Visa IA â†’' : language === 'fr' ? 'ExÃ©cuter la VÃ©rification Visa IA â†’' : 'Run AI Visa Check â†’'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> {language === 'es' ? 'AtrÃ¡s' : language === 'fr' ? 'Retour' : 'Back'}
            </button>
          )}
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 1 && !passport) ||
              (step === 2 && !destination) ||
              (step === 3 && !purpose)
            }
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {language === 'es' ? 'Continuar' : language === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
