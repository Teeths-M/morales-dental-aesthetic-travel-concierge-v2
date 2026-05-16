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
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
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
                  AI Health Safety System
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
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
            {activeTab === 'wellness' && <WellnessMonitorTab />}
            {activeTab === 'support' && <SupportTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}