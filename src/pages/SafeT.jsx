import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, ClipboardCheck, Pill, HeartPulse, MapPin, Heart, LifeBuoy } from 'lucide-react';
import OverviewTab from '@/components/safet/OverviewTab';
import RiskAssessmentTab from '@/components/safet/RiskAssessmentTab';
import ProcedureSafetyTab from '@/components/safet/ProcedureSafetyTab';
import PreparationTab from '@/components/safet/PreparationTab';
import RecoveryTab from '@/components/safet/RecoveryTab';
import JourneyTimelineTab from '@/components/safet/JourneyTimelineTab';
import WellnessMonitorTab from '@/components/safet/WellnessMonitorTab';
import SupportTab from '@/components/safet/SupportTab';

const tabs = [
  { value: 'overview', label: 'Overview', icon: Shield },
  { value: 'journey', label: 'Journey', icon: MapPin },
  { value: 'risk', label: 'Risk', icon: Activity },
  { value: 'procedure', label: 'Safety', icon: ClipboardCheck },
  { value: 'preparation', label: 'Prepare', icon: Pill },
  { value: 'recovery', label: 'Recovery', icon: HeartPulse },
  { value: 'wellness', label: 'Wellness', icon: Heart },
  { value: 'support', label: 'Support', icon: LifeBuoy },
];

export default function SafeT() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-blue-900 relative">
      {/* Sophisticated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      {/* Hero Header */}
      <div className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-2xl">
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
                  <h1 className="font-display text-2xl lg:text-3xl text-white drop-shadow-lg">SAFE-T 4LIFE™</h1>
                  <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 px-2.5 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">
                    AI Health Safety System
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-1 max-w-2xl drop-shadow">
                Your premium intelligent healthcare coordination companion — guiding you safely from consultation through full recovery.
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
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap backdrop-blur-sm
                    ${activeTab === value
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/50'
                      : 'text-white/60 hover:bg-white/10 hover:text-white/90'}`}
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
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {activeTab === 'wellness' && <WellnessMonitorTab />}
            {activeTab === 'support' && <SupportTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}