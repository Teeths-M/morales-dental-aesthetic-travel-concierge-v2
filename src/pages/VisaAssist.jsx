import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VisaHero from '@/components/visa/VisaHero';
import VisaWizard from '@/components/visa/VisaWizard';
import VisaResult from '@/components/visa/VisaResult';
import TravelReadiness from '@/components/visa/TravelReadiness';
import EmbassyDirectory from '@/components/visa/EmbassyDirectory';
import VisaAIChat from '@/components/visa/VisaAIChat';
import { Globe2, ClipboardList, Building2, Bot } from 'lucide-react';

const getSections = (language) => [
  { id: 'wizard', label: language === 'es' ? 'Verificación de Visa' : language === 'fr' ? 'Vérification de Visa' : 'Visa Check', icon: Globe2 },
  { id: 'readiness', label: language === 'es' ? 'Preparación de Viaje' : language === 'fr' ? 'Préparation du Voyage' : 'Travel Readiness', icon: ClipboardList },
  { id: 'embassy', label: language === 'es' ? 'Buscador de Embajadas' : language === 'fr' ? 'Recherche d\'Ambassade' : 'Embassy Finder', icon: Building2 },
  { id: 'assistant', label: language === 'es' ? 'Asistente IA' : language === 'fr' ? 'Assistante IA' : 'AI Assistant', icon: Bot },
];

export default function VisaAssist() {
  const [wizardResult, setWizardResult] = useState(null);
  const [activeSection, setActiveSection] = useState('wizard');
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

  const sections = getSections(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background pt-16 lg:pt-20">
      <VisaHero />

      {/* Premium Tab Navigation */}
      <div className="sticky top-0 z-30 bg-card/50 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-hide">
            {sections.map(s => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`relative flex items-center gap-2.5 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          {activeSection === 'wizard' && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {!wizardResult ? (
                <VisaWizard onResult={setWizardResult} />
              ) : (
                <VisaResult result={wizardResult} onReset={() => setWizardResult(null)} />
              )}
            </motion.div>
          )}
          {activeSection === 'readiness' && (
            <motion.div key="readiness" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <TravelReadiness />
            </motion.div>
          )}
          {activeSection === 'embassy' && (
            <motion.div key="embassy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <EmbassyDirectory />
            </motion.div>
          )}
          {activeSection === 'assistant' && (
            <motion.div key="assistant" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <VisaAIChat />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legal disclaimer */}
        <div className="mt-16 flex items-center justify-center gap-3 text-center">
          <div className="h-px flex-1 bg-slate-200 max-w-24" />
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            <strong className="text-slate-500">SAFE-T VISA ASSIST™</strong> {language === 'es' ? 'proporciona orientación de viaje y soporte de coordinación solamente y no garantiza la aprobación de visa ni reemplaza los requisitos oficiales de embajada o inmigración. Siempre verifica con fuentes oficiales del gobierno.' : language === 'fr' ? 'fournit uniquement des conseils de voyage et un support de coordination et ne garantit pas l\'approbation de visa ou ne remplace pas les exigences officielles d\'ambassade ou d\'immigration. Toujours vérifier auprès des sources gouvernementales officielles.' : 'provides travel guidance and coordination support only and does not guarantee visa approval or replace official embassy or immigration requirements. Always verify with official government sources.'}
          </p>
          <div className="h-px flex-1 bg-slate-200 max-w-24" />
        </div>
      </div>
    </div>
  );
}