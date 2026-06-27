// @ts-nocheck — pre-existing type gaps
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const getReadinessItems = (language) => [
  { id: 'passport', label: 'Passport Valid (6+ months)', icon: 'ðŸ›‚', category: 'documents', points: 20 },
  { id: 'visa', label: 'Visa / Travel Authorization', icon: 'âœ…', category: 'documents', points: 20 },
  { id: 'ticket', label: 'Return Flight Booked', icon: 'âœˆï¸', category: 'travel', points: 15 },
  { id: 'hotel', label: 'Accommodation Confirmed', icon: 'ðŸ¨', category: 'travel', points: 10 },
  { id: 'insurance', label: 'Travel Insurance Active', icon: 'ðŸ›¡ï¸', category: 'documents', points: 15 },
  { id: 'medical', label: 'Medical Invitation Letter', icon: 'ðŸ’Œ', category: 'medical', points: 10 },
  { id: 'appointment', label: 'Appointment Confirmed', icon: 'ðŸ“…', category: 'medical', points: 5 },
  { id: 'vaccination', label: 'Vaccinations Up-to-Date', icon: 'ðŸ’‰', category: 'health', points: 5 },
  { id: 'funds', label: 'Proof of Funds Ready', icon: 'ðŸ’°', category: 'documents', points: 5 },
  { id: 'emergency', label: 'Emergency Contacts Saved', icon: 'ðŸ“ž', category: 'health', points: 5 },
];

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: 'ðŸ“‹' },
  { id: 'documents', label: 'Documents', emoji: 'ðŸ“„' },
  { id: 'travel', label: 'Travel', emoji: 'âœˆï¸' },
  { id: 'medical', label: 'Medical', emoji: 'ðŸ¥' },
  { id: 'health', label: 'Health', emoji: 'ðŸ’Š' },
];

export default function TravelReadiness() {
  const [language, setLanguage] = useState('en');
  const [checked, setChecked] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [travelDate, setTravelDate] = useState('');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const READINESS_ITEMS = getReadinessItems(language);

  const totalPoints = READINESS_ITEMS.reduce((s, i) => s + i.points, 0);
  const earnedPoints = READINESS_ITEMS.filter(i => checked[i.id]).reduce((s, i) => s + i.points, 0);
  const readiness = Math.round((earnedPoints / totalPoints) * 100);

  const getPassportWarning = () => {
    if (!passportExpiry || !travelDate) return null;
    const expiry = new Date(passportExpiry);
    const travel = new Date(travelDate);
    const monthsApart = (expiry - travel) / (1000 * 60 * 60 * 24 * 30);
    if (monthsApart < 0) return { type: 'error', msg: 'âš ï¸ Passport expires BEFORE your travel date. Renew immediately!' };
    if (monthsApart < 6) return { type: 'warning', msg: 'âš ï¸ Passport expires within 6 months of travel. Most countries require 6+ months validity.' };
    return { type: 'success', msg: 'âœ… Passport validity looks good for your travel date.' };
  };

  const passportWarning = getPassportWarning();
  const filteredItems = activeCategory === 'all' ? READINESS_ITEMS : READINESS_ITEMS.filter(i => i.category === activeCategory);
  const missingItems = READINESS_ITEMS.filter(i => !checked[i.id]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'from-emerald-400 to-teal-500';
    if (score >= 50) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return language === 'es' ? 'Excelente â€” Â¡Casi listo para volar! ðŸš€' : language === 'fr' ? 'Excellent â€” Presque prÃªt Ã  voler! ðŸš€' : 'Excellent â€” Almost Ready to Fly! ðŸš€';
    if (score >= 75) return language === 'es' ? 'Bueno â€” Faltan pocos elementos' : language === 'fr' ? 'Bien â€” Quelques Ã©lÃ©ments manquent' : 'Good â€” A few items remaining';
    if (score >= 50) return language === 'es' ? 'En Progreso â€” Â¡Sigue adelante!' : language === 'fr' ? 'En cours â€” Continuez!' : 'In Progress â€” Keep going!';
    return language === 'es' ? 'Apenas Empezando â€” Preparemos tu viaje' : language === 'fr' ? 'Tout juste commencÃ© â€” PrÃ©parons votre voyage' : 'Just Getting Started â€” Let\'s prep your trip';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-2">
         <h2 className="font-display text-2xl font-semibold text-slate-800">
           {language === 'es' ? 'Medidor de PreparaciÃ³n para el Viaje' : language === 'fr' ? 'Indicateur de PrÃ©paration aux Voyages' : 'Travel Readiness Meter'}
         </h2>
         <p className="text-slate-500 text-sm mt-1">
           {language === 'es' ? 'Realiza un seguimiento de tu preparaciÃ³n para viajes mÃ©dicos internacionales' : language === 'fr' ? 'Suivez votre prÃ©paration aux voyages mÃ©dicaux internationaux' : 'Track your preparation for international medical travel'}
         </p>
       </div>

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
      >
        <div className="flex items-center gap-6">
          {/* Circular score */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - readiness / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={readiness >= 80 ? '#10b981' : readiness >= 50 ? '#f59e0b' : '#ef4444'} />
                  <stop offset="100%" stopColor={readiness >= 80 ? '#14b8a6' : readiness >= 50 ? '#f97316' : '#f43f5e'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className={`text-2xl font-semibold ${getScoreColor(readiness)}`}>{readiness}%</span>
               <span className="text-xs text-slate-400">
                 {language === 'es' ? 'Listo' : language === 'fr' ? 'PrÃªt' : 'Ready'}
               </span>
             </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-base mb-1">{getScoreLabel(readiness)}</h3>
            <p className="text-sm text-slate-500 mb-3">{earnedPoints} of {totalPoints} points earned</p>
            {missingItems.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="font-semibold">Missing:</span> {missingItems.slice(0, 2).map(i => i.label).join(', ')}{missingItems.length > 2 ? ` + ${missingItems.length - 2} more` : ''}
              </div>
            )}
            {readiness === 100 && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-semibold">
                  ðŸŽ‰ {language === 'es' ? 'Â¡Felicitaciones! Â¡EstÃ¡s completamente preparado para viajar!' : language === 'fr' ? 'FÃ©licitations! Vous Ãªtes entiÃ¨rement prÃ©parÃ© pour voyager!' : 'Congratulations! You\'re fully prepared for travel!'}
                </div>
              )}
          </div>
        </div>
      </motion.div>

      {/* Passport validity checker */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>ðŸ›‚</span> {language === 'es' ? 'Verificador de Validez de Pasaporte' : language === 'fr' ? 'VÃ©rificateur de ValiditÃ© du Passeport' : 'Passport Validity Checker'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              {language === 'es' ? 'Fecha de Vencimiento del Pasaporte' : language === 'fr' ? 'Date d\'Expiration du Passeport' : 'Passport Expiry Date'}
            </label>
            <input
              type="date"
              value={passportExpiry}
              onChange={e => setPassportExpiry(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              {language === 'es' ? 'Fecha de Viaje Planeada' : language === 'fr' ? 'Date de Voyage PrÃ©vue' : 'Planned Travel Date'}
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={e => setTravelDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {passportWarning && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-3 rounded-xl text-sm font-medium ${
              passportWarning.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              passportWarning.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {passportWarning.msg}
          </motion.div>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          {language === 'es' ? 'Lista de VerificaciÃ³n de PreparaciÃ³n para el Viaje' : language === 'fr' ? 'Liste de ContrÃ´le de PrÃ©paration aux Voyages' : 'Travel Preparation Checklist'}
        </h3>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeCategory === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredItems.map((item, i) => (
            <motion.label
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                checked[item.id] ? 'bg-emerald-50 border border-emerald-200' : 'border border-slate-100 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={e => setChecked(prev => ({ ...prev, [item.id]: e.target.checked }))}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span className="text-lg">{item.icon}</span>
              <span className={`flex-1 text-sm font-medium ${checked[item.id] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item.label}
              </span>
              <span className={`text-xs font-semibold ${checked[item.id] ? 'text-emerald-600' : 'text-slate-400'}`}>
                +{item.points}pts
              </span>
            </motion.label>
          ))}
        </div>
      </div>
    </div>
  );
}
