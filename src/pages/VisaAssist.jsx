import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VisaHero from '@/components/visa/VisaHero';
import VisaWizard from '@/components/visa/VisaWizard';
import VisaResult from '@/components/visa/VisaResult';
import TravelReadiness from '@/components/visa/TravelReadiness';
import EmbassyDirectory from '@/components/visa/EmbassyDirectory';
import VisaAIChat from '@/components/visa/VisaAIChat';

export default function VisaAssist() {
  const [wizardResult, setWizardResult] = useState(null);
  const [activeSection, setActiveSection] = useState('wizard');

  const sections = [
    { id: 'wizard', label: 'Visa Check', emoji: '🌍' },
    { id: 'readiness', label: 'Travel Readiness', emoji: '📋' },
    { id: 'embassy', label: 'Embassy Finder', emoji: '🏛️' },
    { id: 'assistant', label: 'AI Assistant', emoji: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
      <VisaHero />

      {/* Section Nav */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-3 overflow-x-auto scrollbar-hide">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeSection === s.id
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {activeSection === 'wizard' && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!wizardResult ? (
                <VisaWizard onResult={setWizardResult} />
              ) : (
                <VisaResult result={wizardResult} onReset={() => setWizardResult(null)} />
              )}
            </motion.div>
          )}
          {activeSection === 'readiness' && (
            <motion.div key="readiness" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <TravelReadiness />
            </motion.div>
          )}
          {activeSection === 'embassy' && (
            <motion.div key="embassy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <EmbassyDirectory />
            </motion.div>
          )}
          {activeSection === 'assistant' && (
            <motion.div key="assistant" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <VisaAIChat />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legal disclaimer */}
        <div className="mt-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto">
            ⚖️ <strong className="text-slate-500">SAFE-T VISA ASSIST™</strong> provides travel guidance and coordination support only and does not guarantee visa approval or replace official embassy or immigration requirements. Always verify with official government sources.
          </p>
        </div>
      </div>
    </div>
  );
}