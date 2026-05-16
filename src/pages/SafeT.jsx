import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, ClipboardCheck, Pill, HeartPulse, MapPin, Heart, LifeBuoy, Syringe } from 'lucide-react';
import OverviewTab from '@/components/safet/OverviewTab';
import RiskAssessmentTab from '@/components/safet/RiskAssessmentTab';
import ProcedureSafetyTab from '@/components/safet/ProcedureSafetyTab';
import PreparationTab from '@/components/safet/PreparationTab';
import RecoveryTab from '@/components/safet/RecoveryTab';
import JourneyTimelineTab from '@/components/safet/JourneyTimelineTab';
import WellnessMonitorTab from '@/components/safet/WellnessMonitorTab';
import VaccinationTrackerTab from '@/components/safet/VaccinationTrackerTab';
import SupportTab from '@/components/safet/SupportTab';

const getTabs = (language) => [
  { value: 'overview', label: language === 'es' ? 'Descripción' : language === 'fr' ? 'Aperçu' : 'Overview', icon: Shield },
  { value: 'journey', label: language === 'es' ? 'Viaje' : language === 'fr' ? 'Voyage' : 'Journey', icon: MapPin },
  { value: 'risk', label: language === 'es' ? 'Riesgo' : language === 'fr' ? 'Risque' : 'Risk', icon: Activity },
  { value: 'procedure', label: language === 'es' ? 'Seguridad' : language === 'fr' ? 'Sécurité' : 'Safety', icon: ClipboardCheck },
  { value: 'preparation', label: language === 'es' ? 'Preparar' : language === 'fr' ? 'Préparer' : 'Prepare', icon: Pill },
  { value: 'recovery', label: language === 'es' ? 'Recuperación' : language === 'fr' ? 'Récupération' : 'Recovery', icon: HeartPulse },
  { value: 'vaccination', label: language === 'es' ? 'Vacunaciones' : language === 'fr' ? 'Vaccinations' : 'Vaccinations', icon: Syringe },
  { value: 'wellness', label: language === 'es' ? 'Bienestar' : language === 'fr' ? 'Bien-être' : 'Wellness', icon: Heart },
  { value: 'support', label: language === 'es' ? 'Soporte' : language === 'fr' ? 'Support' : 'Support', icon: LifeBuoy },
];

export default function SafeT() {
  const [activeTab, setActiveTab] = useState('overview');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const tabs = getTabs(language);

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: 'url(https://media.base44.com/images/public/6a01c1305c540b75f24dd373/745794e0c_ChatGPTImageMay16202608_02_59AM.png)',
      }}
    >
      <div className="min-h-screen backdrop-blur-sm bg-black/20">
        {/* Hero Header */}
         <div className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-16 lg:top-20 z-20 opacity-30 hover:opacity-100 transition-opacity duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            className="flex items-start gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-800 to-blue-900 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl lg:text-3xl text-slate-900">SAFE-T 4LIFE™</h1>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  {language === 'es' ? 'Sistema de Seguridad de Salud IA' : language === 'fr' ? 'Système de Sécurité Sanitaire IA' : 'AI Health Safety System'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                {language === 'es' ? 'Tu compañero de coordinación de cuidado de salud inteligente premium — guiándote de forma segura desde la consulta hasta la recuperación completa.' : language === 'fr' ? 'Votre compagnon de coordination des soins de santé intelligent premium — vous guidant en toute sécurité de la consultation à la récupération complète.' : 'Your premium intelligent healthcare coordination companion — guiding you safely from consultation through full recovery.'}
              </p>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="mt-6 overflow-x-auto -mx-1 px-1">
            <div className="flex gap-1 min-w-max sm:min-w-0">
              {tabs.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${activeTab === value
                      ? 'bg-gradient-to-r from-emerald-800 to-blue-900 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                  {activeTab === value && (
                    <motion.span
                      className="absolute inset-0 rounded-xl bg-white/10"
                      layoutId="tab-pill"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'journey' && <JourneyTimelineTab />}
            {activeTab === 'risk' && <RiskAssessmentTab />}
            {activeTab === 'procedure' && <ProcedureSafetyTab />}
            {activeTab === 'preparation' && <PreparationTab />}
            {activeTab === 'recovery' && <RecoveryTab />}
            {activeTab === 'vaccination' && <VaccinationTrackerTab />}
            {activeTab === 'wellness' && <WellnessMonitorTab />}
            {activeTab === 'support' && <SupportTab />}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}