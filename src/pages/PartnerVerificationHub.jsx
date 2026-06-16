import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Heart } from 'lucide-react';
import KYPVerificationPanel from '@/components/verification/KYPVerificationPanel';
import DoctorVerificationAdmin from './DoctorVerificationAdmin';
import MothersTouchAdminPanel from '@/components/companion/MothersTouchAdminPanel';

const TABS = [
  { id: 'kyp', label: "KYP — Partner Verification", icon: Lock },
  { id: 'verimed', label: "VeriMed — Doctor Registry", icon: ShieldCheck },
  { id: 'mothers_touch', label: "Mother's Touch Caregivers", icon: Heart },
];

export default function PartnerVerificationHub() {
  const [activeTab, setActiveTab] = useState('kyp');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-violet-800 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-violet-300 text-xs font-bold uppercase tracking-widest">Compliance Engine</p>
              <h1 className="text-2xl font-bold">Partner & Doctor Verification</h1>
            </div>
          </div>
          <p className="text-violet-200 text-sm max-w-xl leading-relaxed">
            VeriMed Regulatory Engine + Know Your Partner (KYP) Framework — automated sanctions screening, document forensics, AI risk scoring, and immutable audit trails.
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${active ? 'text-violet-700' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon className="w-4 h-4" />{tab.label}
                {active && <motion.div layoutId="verify-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'kyp' && (
            <motion.div key="kyp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <KYPVerificationPanel />
            </motion.div>
          )}
          {activeTab === 'verimed' && (
            <motion.div key="verimed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DoctorVerificationAdmin />
            </motion.div>
          )}
          {activeTab === 'mothers_touch' && (
            <motion.div key="mothers_touch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MothersTouchAdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}