import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Globe2, MapPin, Eye, Smartphone, Shield, Navigation } from 'lucide-react';
import { BackButtonLight } from '@/components/nav/BackButton';
import SOSDropdown from '@/components/emergency/SOSDropdown';
import GuardianLinkManager from '@/components/emergency/GuardianLinkManager';
import SpaceIntelPanel from '@/components/emergency/SpaceIntelPanel';
import LocationBreadcrumbTracker from '@/components/emergency/LocationBreadcrumbTracker';
import EmergencyPINSetup from '@/components/emergency/EmergencyPINSetup';

const TABS = [
  { id: 'sos', label: 'SOS & Dispatch', icon: AlertTriangle },
  { id: 'intel', label: 'Space Intel', icon: Globe2 },
  { id: 'guardian', label: 'Guardian Links', icon: Eye },
  { id: 'location', label: 'My Locations', icon: MapPin },
  { id: 'pin', label: 'Emergency PIN', icon: Smartphone },
];

export default function EmergencyHub() {
  const [user, setUser] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [activeTab, setActiveTab] = useState('sos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const cases = await base44.entities.CaseRecord.filter({ client_email: u.email }, '-created_date', 1);
        if (cases[0]) setActiveCase(cases[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900">
      {/* Hero */}
      <div className="border-b border-red-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          {/* Back button */}
          <BackButtonLight fallback="/dashboard" className="mb-6" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-900/50 rounded-2xl flex items-center justify-center border border-red-800/50">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Safe-T Emergency Suite</p>
                <h1 className="text-2xl font-bold text-white">Emergency & Security Center</h1>
              </div>
            </div>
            {/* Live SOS button always visible in hero */}
            <SOSDropdown
              caseId={activeCase?.id}
              patientEmail={user?.email}
              patientName={user?.full_name}
              patientPhone={activeCase?.client_phone}
              destinationCountry={activeCase?.procedure_country}
            />
          </div>
          <p className="text-slate-400 text-sm mt-4 max-w-xl leading-relaxed">
            1-tap emergency dispatch · Guardian view links · Real-time space intel · Location breadcrumbs · Universal device PIN
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: AlertTriangle, label: '1-Tap SOS', color: 'bg-red-900/40 text-red-300 border-red-800/50' },
              { icon: Globe2, label: 'Know Your Space AI', color: 'bg-blue-900/40 text-blue-300 border-blue-800/50' },
              { icon: Eye, label: 'Guardian View', color: 'bg-violet-900/40 text-violet-300 border-violet-800/50' },
              { icon: Navigation, label: 'Auto-Purge Breadcrumbs', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50' },
              { icon: Smartphone, label: 'Universal 6-Digit PIN', color: 'bg-slate-700/50 text-slate-300 border-slate-600/50' },
            ].map(b => {
              const Icon = b.icon;
              return (
                <span key={b.label} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${b.color}`}>
                  <Icon className="w-3 h-3" />{b.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  active ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
                }`}>
                <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
                {active && <motion.div layoutId="em-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">

              {activeTab === 'sos' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1">Emergency Dispatch Console</h3>
                    <p className="text-slate-400 text-xs">5-second countdown before dispatch. GPS auto-attached. Emergency team alerted via email + SMS.</p>
                  </div>
                  {/* Full SOS options grid */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { id: 'police', label: 'Local Police', desc: 'Law enforcement dispatch', icon: Shield, colors: 'bg-blue-900/40 border-blue-700/50 text-blue-300' },
                      { id: 'ambulance', label: 'Emergency Ambulance', desc: 'Medical emergency response', icon: AlertTriangle, colors: 'bg-red-900/40 border-red-700/50 text-red-300' },
                      { id: 'private_security', label: 'Private Security', desc: 'Licensed tactical dispatch', icon: Shield, colors: 'bg-slate-700/50 border-slate-600/50 text-slate-300' },
                      { id: 'urgent_pickup', label: 'Emergency Pickup', desc: 'Immediate extraction vehicle', icon: Navigation, colors: 'bg-amber-900/40 border-amber-700/50 text-amber-300' },
                      { id: 'silent_sos', label: 'Silent SOS', desc: 'No sound, no notification on device', icon: Eye, colors: 'bg-violet-900/40 border-violet-700/50 text-violet-300' },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <div key={opt.id} className={`rounded-xl border p-4 ${opt.colors}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="w-5 h-5" />
                            <p className="font-bold text-sm">{opt.label}</p>
                          </div>
                          <p className="text-xs opacity-70 mb-3">{opt.desc}</p>
                          <SOSDropdown
                            caseId={activeCase?.id}
                            patientEmail={user?.email}
                            patientName={user?.full_name}
                            patientPhone={activeCase?.client_phone}
                            destinationCountry={activeCase?.procedure_country}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* Discreet safety net info */}
                  <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                    <p className="text-slate-300 text-xs font-bold mb-2">🛡️ Discreet Safety Net</p>
                    <ul className="space-y-1 text-xs text-slate-400">
                      <li>• <strong>Silent SOS</strong> — no sound, vibration, or screen change when triggered</li>
                      <li>• <strong>Guardian links</strong> — expiring, look-only tracking URLs for family</li>
                      <li>• <strong>1-tap coordinates drop</strong> — copy GPS to clipboard instantly</li>
                      <li>• <strong>Auto-purge breadcrumbs</strong> — location history cleared on safe arrival</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'intel' && (
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Know Your Space™ Intelligence</h3>
                  <p className="text-slate-400 text-xs mb-4">AI-powered real-time safety briefings — crime analytics, health alerts, scam warnings, emergency numbers</p>
                  <div className="bg-white rounded-xl p-4">
                    <SpaceIntelPanel
                      defaultCountry={activeCase?.procedure_country || ''}
                      defaultCity={activeCase?.procedure_country ? '' : ''}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'guardian' && (
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Guardian View Links</h3>
                  <p className="text-slate-400 text-xs mb-4">Secure look-only journey tracking for family — no app download, no login required</p>
                  <div className="bg-white rounded-xl p-4">
                    <GuardianLinkManager caseId={activeCase?.id} patientEmail={user?.email} />
                  </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Mark My Last Location</h3>
                  <p className="text-slate-400 text-xs mb-4">Auto-purging breadcrumb trail — scrubbed on final check-in unless you save them</p>
                  <div className="bg-white rounded-xl p-4">
                    <LocationBreadcrumbTracker caseId={activeCase?.id} />
                  </div>
                </div>
              )}

              {activeTab === 'pin' && (
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">Universal 6-Digit Emergency PIN</h3>
                  <p className="text-slate-400 text-xs mb-4">Cross-device access — unlocks your vault and SOS console on any device without app login</p>
                  <div className="bg-white rounded-xl p-4">
                    <EmergencyPINSetup userEmail={user?.email} mode={user ? 'setup' : 'verify'} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}