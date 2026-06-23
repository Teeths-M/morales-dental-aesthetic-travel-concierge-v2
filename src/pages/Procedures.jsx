import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight, ChevronRight, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import ProcedureModal from '@/components/procedures/ProcedureModal';
import SelectDoctorModal from '@/components/procedures/SelectDoctorModal';
import { Button } from '@/components/ui/button';
import { procedureCategories } from '@/components/procedures/ProcedureData';
import ProcedureSearch from '@/components/procedures/ProcedureSearch';
import MyProceduresList from '@/components/procedures/MyProceduresList';
import VoiceMode from '@/components/procedures/VoiceMode';
import SmartFallback from '@/components/procedures/SmartFallback';
import ProcedureCompare from '@/components/procedures/ProcedureCompare';
import PageHeroBand from '@/components/layout/PageHeroBand';

import { useCart } from '@/context/CartContext';
import { getProcedureEnumValue } from '@/components/booking/SectionProcedure';

const getParentFilters = (language) => [
  { id: 'all', label: language === 'es' ? 'Todos' : language === 'fr' ? 'Tous' : 'All', emoji: '🏥' },
  { id: 'dental', label: language === 'es' ? 'Dental' : language === 'fr' ? 'Dentaire' : 'Dental', emoji: '🦷' },
  { id: 'aesthetic', label: language === 'es' ? 'Estético' : language === 'fr' ? 'Esthétique' : 'Aesthetic', emoji: '✨' },
  { id: 'hair_restoration', label: language === 'es' ? 'Restauración Capilar' : language === 'fr' ? 'Restauration Capillaire' : 'Hair Restoration', emoji: '💇' },
  { id: 'bariatric', label: language === 'es' ? 'Bariátrica' : language === 'fr' ? 'Bariatrique' : 'Bariatric', emoji: '⚖️' },
  { id: 'orthopedics', label: language === 'es' ? 'Ortopedia' : language === 'fr' ? 'Orthopédie' : 'Orthopedics', emoji: '🦴' },
  { id: 'fertility', label: language === 'es' ? 'Fertilidad' : language === 'fr' ? 'Fertilité' : 'Fertility', emoji: '👶' },
  { id: 'wellness', label: language === 'es' ? 'Bienestar' : language === 'fr' ? 'Bien-être' : 'Wellness', emoji: '🌿' },
];

function ProcedureCard({ proc, isSelected, onAdd, onRemove, onLearnMore }) {
  const c = proc.categoryColor;
  return (
    <motion.div
      className={`relative bg-[#0C1A1D] rounded-2xl border overflow-hidden transition-all group ${isSelected ? 'border-emerald-400 shadow-md shadow-emerald-400/20' : 'border-white/[0.08] hover:border-white/[0.16]'}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Image */}
      {proc.image && (
        <div className="w-full h-36 overflow-hidden relative">
          <img
            src={proc.image}
            alt={proc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1A1D]/80 via-transparent to-transparent" />
          <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm bg-[#0C1A1D]/80 ${c.text}`}>{proc.tag}</span>
          {isSelected && (
            <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 leading-tight">{proc.title}</h3>
        {proc.desc && <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2 mb-3">{proc.desc}</p>}

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-[10px] text-white/35">
            <Clock className="w-3 h-3" />{proc.duration}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/35">
            <Calendar className="w-3 h-3" />{proc.recovery}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onLearnMore(proc)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border border-white/[0.12] text-white/60 hover:bg-white/[0.06] transition-all flex items-center justify-center gap-1"
          >
            {proc.language === 'es' ? 'Estimado Precios' : proc.language === 'fr' ? 'Devis Tarifs' : 'Estimate Pricing'} <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => isSelected ? onRemove(proc) : onAdd(proc)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              isSelected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                : 'bg-white/[0.06] text-white/70 border border-white/[0.10] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] hover:border-[#D4AF37]/30'
            }`}
          >
            {isSelected ? (proc.language === 'es' ? '✓ Añadido' : proc.language === 'fr' ? '✓ Ajouté' : '✓ Added') : (proc.language === 'es' ? '+ Seleccionar' : proc.language === 'fr' ? '+ Sélectionner' : '+ Select')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Procedures() {
  const [activeParent, setActiveParent] = useState('all');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState(null);
  const [selectDoctorProc, setSelectDoctorProc] = useState(null);
  const [language, setLanguage] = useState('en');
  const { items, addItem, removeItem, clearCart, setProcedureCountry, setProcedureCity } = useCart();

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const parentFilters = getParentFilters(language);

  const selectedProcs = items; // cart IS the selected list

  const addProc = (proc) => {
    // Map procedure title to enum value
    const procedureEnumValue = getProcedureEnumValue(proc.title);
    
    // If proc has doctor info, add directly; otherwise show doctor selector
    if (proc.doctor_id) {
      addItem({ 
        name: proc.title, 
        category: proc.category,
        procedure_enum: procedureEnumValue,
        doctor_name: proc.doctor_name,
        doctor_price_usd: proc.doctor_price_usd,
        clinic_country: proc.clinic_country,
        clinic_city: proc.clinic_city,
        ...proc 
      });
      if (proc.clinic_country) setProcedureCountry(proc.clinic_country);
      if (proc.clinic_city) setProcedureCity(proc.clinic_city);
    } else {
      setSelectDoctorProc(proc);
    }
  };

  const removeProc = (proc) => {
    removeItem(proc.title || proc.name);
  };

  const handleVoiceDetected = (procs) => {
    procs.forEach(p => addProc(p));
  };

  const handleFallbackSelect = (matchedProc) => {
    addProc({
      title: matchedProc.procedure_name,
      procedure_id: matchedProc.procedure_id,
      isAiMatch: true,
      matchConfidence: matchedProc.match_confidence,
      rationale: matchedProc.rationale
    });
  };

  const filteredCategories = activeParent === 'all'
    ? procedureCategories
    : procedureCategories.filter(c => c.parent === activeParent);

  return (
    <div className="min-h-screen bg-[#060B16]">
      <PageHeroBand />
      {/* Hero */}
      <div className="bg-[#0C1A1D]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.32em] mb-4">
              {language === 'es' ? 'Nuestros Servicios' : language === 'fr' ? 'Nos Services' : 'Our Services'}
            </p>
            <h1 className="font-display text-4xl lg:text-5xl text-white mb-6" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {language === 'es' ? 'Procedimientos y Tratamientos' : language === 'fr' ? 'Procédures et Traitements' : 'Procedures & Treatments'}
            </h1>
            <p className="text-[17px] text-white/55 max-w-xl mx-auto leading-[1.75]" style={{ fontWeight: 300 }}>
              {language === 'es' ? 'Cuidado dental, estético y de bienestar de clase mundial. Busca abajo, o simplemente ' : language === 'fr' ? 'Soins dentaires, esthétiques et de bien-être de classe mondiale. Parcourez ci-dessous, ou simplement ' : 'World-class dental, aesthetic, and wellness care. Browse below, search, or simply '}<span className="font-semibold text-[#D4AF37]">{language === 'es' ? 'habla tus objetivos' : language === 'fr' ? 'parlez vos objectifs' : 'speak your goals'}</span> {language === 'es' ? 'usando el modo de voz.' : language === 'fr' ? 'en utilisant le mode voix.' : 'using Voice Mode.'}
            </p>
          </motion.div>

          {/* Search + Voice */}
          <div className="max-w-2xl mx-auto flex gap-3">
            <div className="flex-1">
              <ProcedureSearch onSelect={addProc} />
            </div>
            <button
              onClick={() => setVoiceOpen(true)}
              aria-label={language === 'es' ? 'Activar Modo de Voz' : language === 'fr' ? 'Activer le Mode Voix' : 'Activate Voice Mode'}
              className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-blue-800 hover:opacity-90 text-white font-semibold px-5 py-3.5 rounded-2xl shadow-md text-sm transition-all"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{language === 'es' ? 'Modo de Voz' : language === 'fr' ? 'Mode Voix' : 'Voice Mode'}</span>
            </button>
          </div>

          {/* Voice hint */}
          <p className="text-center text-xs text-white/35 mt-3">
            💡 {language === 'es' ? 'Prueba el Modo de Voz: ' : language === 'fr' ? 'Essayez le Mode Voix: ' : 'Try Voice Mode: '}<em>{language === 'es' ? '"Quiero carillas, blanqueamiento e implantes en la mandíbula superior"' : language === 'fr' ? '"Je veux des facettes, un blanchiment et des implants à la mâchoire supérieure"' : '"I want veneers, whitening, and implants on the upper jaw"'}</em>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Mobile Cart Summary - shown only on mobile when items exist */}
        {items.length > 0 && (
          <div className="lg:hidden mb-6">
            <MyProceduresList
              items={selectedProcs}
              onRemove={removeProc}
              onClear={() => clearCart()}
            />
          </div>
        )}

        {/* Full-Width AI Concierge Banner */}
        <div className="mb-6">
          <SmartFallback 
            originalQuery=""
            onProcedureSelect={handleFallbackSelect}
            language={language}
          />
        </div>

        {/* Side-by-Side Procedure Comparison */}
        <div className="mb-8">
          <ProcedureCompare allProcedures={procedureCategories} />
        </div>

        {/* Main Grid - 2 columns on desktop (content + basket) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Category Filters + Procedure Grid (spans 2) */}
          <div className="lg:col-span-2 min-w-0">
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap mb-8">
              {parentFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveParent(f.id)}
                  aria-pressed={activeParent === f.id}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    activeParent === f.id
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/40'
                      : 'bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80'
                  }`}
                >
                  <span aria-hidden="true">{f.emoji}</span>{f.label}
                </button>
              ))}
            </div>

            {/* Procedure categories */}
            <div className="space-y-10">
              {filteredCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl">{cat.icon}</span>
                    <h2 className={`text-sm font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${cat.color.bg} ${cat.color.text} ${cat.color.border}`}>
                      {cat.label}
                    </h2>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium">{cat.procedures.length} {language === 'es' ? 'tratamientos' : language === 'fr' ? 'traitements' : 'treatments'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {cat.procedures.map(proc => {
                      const enriched = { ...proc, category: cat.label, categoryId: cat.id, categoryColor: cat.color };
                      return (
                        <ProcedureCard
                          key={proc.title}
                          proc={enriched}
                          isSelected={!!selectedProcs.find(p => (p.name || p.title) === proc.title)}
                          onAdd={addProc}
                          onRemove={removeProc}
                          onLearnMore={setSelectedModal}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              className="text-center bg-[#0C1A1D] border border-white/[0.08] rounded-2xl p-8 lg:p-12 mt-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-[0.32em] mb-3">
                {language === 'es' ? '¿No Estás Seguro Por Dónde Empezar?' : language === 'fr' ? 'Vous Ne Savez Pas Où Commencer?' : 'Not Sure Where to Start?'}
              </p>
              <h2 className="font-display text-3xl lg:text-4xl text-white mb-4" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                {language === 'es' ? 'Habla Con Nuestro Equipo de Conserjería' : language === 'fr' ? 'Parlez à Notre Équipe de Conciergerie' : 'Talk to Our Concierge Team'}
              </h2>
              <p className="text-[15px] text-white/55 mb-6 max-w-md mx-auto leading-[1.75]" style={{ fontWeight: 300 }}>
                {language === 'es' ? 'Nuestros especialistas te guiarán al tratamiento correcto basado en tus objetivos, perfil de salud y presupuesto.' : language === 'fr' ? 'Nos spécialistes vous guideront vers le bon traitement en fonction de vos objectifs, de votre profil de santé et de votre budget.' : 'Our specialists will guide you to the right treatment based on your goals, health profile, and budget.'}
              </p>
              <Link to="/booking">
                <Button size="lg" className={`font-semibold px-10 ${items.length > 0 ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C85C] text-[#060B16] hover:opacity-90' : 'bg-white/[0.06] text-white/30 cursor-not-allowed'}`} disabled={items.length === 0}>
                {language === 'es' ? 'Reservar una Consulta' : language === 'fr' ? 'Réserver une Consultation' : 'Book a Consultation'} {items.length > 0 && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </Link>
              {items.length === 0 && (
                <p className="text-center text-xs text-amber-600 mt-3 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Select at least one procedure to continue
                </p>
              )}
            </motion.div>
          </div>

          {/* Right Column - My Procedures Basket (spans 1) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
            {selectedProcs.length > 0 ? (
              <>
                <MyProceduresList
                  items={selectedProcs}
                  onRemove={removeProc}
                  onClear={() => clearCart()}
                />
              </>
            ) : (
              <div className="bg-white/[0.03] border border-dashed border-white/[0.12] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-white/[0.08] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🗒️</span>
                </div>
                <p className="text-sm font-semibold text-white/80 mb-1">
                  {language === 'es' ? 'Mis Procedimientos' : language === 'fr' ? 'Mes Procédures' : 'My Procedures'}
                </p>
                <p className="text-xs text-white/40 leading-relaxed">
                  {language === 'es' ? 'Selecciona procedimientos de la lista o usa el Modo de Voz para construir tu plan de tratamiento.' : language === 'fr' ? 'Sélectionnez des procédures dans la liste ou utilisez le Mode Voix pour construire votre plan de traitement.' : 'Select procedures from the list or use Voice Mode to build your treatment plan.'}
                </p>
              </div>
            )}

            {/* Voice mode promo */}
            <button
              onClick={() => setVoiceOpen(true)}
              className="mt-4 w-full flex items-center gap-3 bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl px-4 py-4 hover:opacity-90 transition-all"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-xs">
                  {language === 'es' ? 'Modo de Voz' : language === 'fr' ? 'Mode Voix' : 'Voice Mode'}
                </p>
                <p className="text-white/70 text-[10px]">
                  {language === 'es' ? 'Habla tus tratamientos' : language === 'fr' ? 'Parlez vos traitements' : 'Speak your treatments'}
                </p>
              </div>
            </button>
            </div>
          </div>
        </div>
      </div>



      {/* Voice Modal */}
      <AnimatePresence>
        {voiceOpen && (
          <VoiceMode
            onProceduresDetected={handleVoiceDetected}
            onClose={() => setVoiceOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Learn More Modal */}
      <ProcedureModal procedure={selectedModal} onClose={() => setSelectedModal(null)} />

      {/* Select Doctor Modal */}
      <SelectDoctorModal
        procedure={selectDoctorProc}
        isOpen={!!selectDoctorProc}
        onClose={() => setSelectDoctorProc(null)}
        onSelect={(proc) => {
          addProc(proc);
        }}
      />
    </div>
  );
}