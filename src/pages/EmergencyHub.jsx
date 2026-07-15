// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Globe2, MapPin, Eye, Smartphone, Shield, Navigation, Mic, Moon, TreePine } from 'lucide-react';
import { BackButtonLight } from '@/components/nav/BackButton';
import SOSDropdown from '@/components/emergency/SOSDropdown';
import GuardianLinkManager from '@/components/emergency/GuardianLinkManager';
import SpaceIntelPanel from '@/components/emergency/SpaceIntelPanel';
import LocationBreadcrumbTracker from '@/components/emergency/LocationBreadcrumbTracker';
import EmergencyPINSetup from '@/components/emergency/EmergencyPINSetup';
import PINSetupPrompt from '@/components/emergency/PINSetupPrompt';
import NaturalDisasterPanel from '@/components/emergency/NaturalDisasterPanel';
import EmergencyCommsCascade from '@/components/emergency/EmergencyCommsCascade';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'sos',      label: 'SOS & Dispatch',    icon: AlertTriangle },
  { id: 'disaster', label: '🌍 Natural Disaster', icon: AlertTriangle },
  { id: 'intel',    label: 'Space Intel',         icon: Globe2 },
  { id: 'guardian', label: 'Guardian Links',       icon: Eye },
  { id: 'location', label: 'My Locations',         icon: MapPin },
  { id: 'pin',      label: 'Emergency PIN',        icon: Smartphone },
];

export default function EmergencyHub() {
  const [user, setUser] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [activeTab, setActiveTab] = useState('sos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const CASE_CACHE_KEY = 'morales_emergency_active_case';
    const USER_CACHE_KEY = 'morales_emergency_user';

    // Load from cache immediately so offline mode has data
    try {
      const cachedUser = JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');
      const cachedCase = JSON.parse(localStorage.getItem(CASE_CACHE_KEY) || 'null');
      if (cachedUser) setUser(cachedUser);
      if (cachedCase) setActiveCase(cachedCase);
    } catch (_) {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    base44.auth.me().then(async (u) => {
      setUser(u);
      try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u)); } catch (_) {}
      if (u) {
        try {
          const cases = await base44.entities.CaseRecord.filter({ client_email: u.email }, '-created_date', 1);
          if (cases[0]) {
            setActiveCase(cases[0]);
            try { localStorage.setItem(CASE_CACHE_KEY, JSON.stringify(cases[0])); } catch (_) {}
          }
        } catch (_) {}
      }
    }).catch((err) => {
      console.error('[EmergencyHub] Auth failed:', err?.message);
      // Don't set null — keep cached user if available
    }).finally(() => setLoading(false)); // ALWAYS stop loading
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900">

      {/* ── Stay Calm Banner — first thing they see ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.08))', borderBottom: '1px solid rgba(239,68,68,0.25)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 14, height: 14, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.8)', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              You are not alone. We are here. 🛡️
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              Stay calm — your Morales concierge is being alerted. Tap SOS below to activate all 6 emergency channels instantly.
            </p>
          </div>
        </div>
      </div>

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
                <p className="text-red-400 text-xs font-semibold uppercase tracking-widest">Morales Emergency Center</p>
                <h1 className="text-2xl font-semibold text-white">We Are Sending Help</h1>
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
            Tap SOS to alert your concierge instantly · Share your location with family · Access your documents · Set your Emergency PIN
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: AlertTriangle, label: 'SOS — 6 Channels', color: 'bg-red-900/40 text-red-300 border-red-800/50' },
              { icon: Globe2, label: 'Area Safety Intel', color: 'bg-blue-900/40 text-blue-300 border-blue-800/50' },
              { icon: Eye, label: 'Share with Family', color: 'bg-violet-900/40 text-violet-300 border-violet-800/50' },
              { icon: Navigation, label: 'Private Location History', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50' },
              { icon: Smartphone, label: 'Emergency PIN — Any Device', color: 'bg-slate-700/50 text-slate-300 border-slate-600/50' },
              { icon: Mic, label: 'Walkie-Talkie', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50', link: '/walkie-talkie' },
              { icon: Moon, label: 'Nightlife Safety', color: 'bg-purple-900/40 text-purple-300 border-purple-800/50', link: '/nightlife-safety' },
              { icon: TreePine, label: 'Wilderness SOS', color: 'bg-green-900/40 text-green-300 border-green-800/50', link: '/wilderness-safety' },
            ].map(b => {
              const Icon = b.icon;
              return b.link ? (
                <Link key={b.label} to={b.link}>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${b.color} hover:opacity-80 transition-opacity cursor-pointer`}>
                    <Icon className="w-3 h-3" />{b.label}
                  </span>
                </Link>
              ) : (
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
                aria-label={tab.label}
                aria-pressed={active}
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
                    <h3 className="text-white font-semibold text-sm mb-1">Emergency Dispatch Console</h3>
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
                            <p className="font-semibold text-sm">{opt.label}</p>
                          </div>
                          <p className="text-xs opacity-70 mb-3">{opt.desc}</p>
                          <SOSDropdown
                            caseId={activeCase?.id}
                            patientEmail={user?.email}
                            patientName={user?.full_name}
                            patientPhone={activeCase?.client_phone}
                            destinationCountry={activeCase?.procedure_country}
                            preselectedType={opt.id}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* ── 6-Channel Offline Comms Cascade ── */}
                  <details className="group">
                    <summary className="list-none flex items-center gap-2 cursor-pointer select-none py-2">
                      <span className="text-xs font-semibold text-slate-400 group-open:text-white transition-colors">
                        📡 No Signal? Advanced Comms — Satellite · BLE · Web Share · QR
                      </span>
                    </summary>
                    <div className="mt-3 rounded-2xl p-4" style={{ background: '#060B16', border: '1px solid #2A3F4A' }}>
                      <EmergencyCommsCascade
                        caseId={activeCase?.id || ''}
                        userId={user?.id || ''}
                        userEmail={user?.email || ''}
                        activityType="emergency"
                        medicalCode=""
                      />
                    </div>
                  </details>

                  {/* Discreet safety net info */}
                  <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                    <p className="text-slate-300 text-xs font-semibold mb-2">🛡️ Discreet Safety Net</p>
                    <ul className="space-y-1 text-xs text-slate-400">
                      <li>• <strong>Silent SOS</strong> — no sound, vibration, or screen change when triggered</li>
                      <li>• <strong>Guardian links</strong> — expiring, look-only tracking URLs for family</li>
                      <li>• <strong>1-tap coordinates drop</strong> — copy GPS to clipboard instantly</li>
                      <li>• <strong>Auto-purge breadcrumbs</strong> — location history cleared on safe arrival</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'disaster' && (
                <NaturalDisasterPanel userCountry={activeCase?.procedure_country || ''} />
              )}

              {activeTab === 'intel' && (
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Know Your Space™ Intelligence</h3>
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
                  <h3 className="text-white font-semibold text-sm mb-1">Guardian View Links</h3>
                  <p className="text-slate-400 text-xs mb-4">Secure look-only journey tracking for family — no app download, no login required</p>
                  <div className="bg-white rounded-xl p-4">
                    <GuardianLinkManager caseId={activeCase?.id} patientEmail={user?.email} />
                  </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Location Sharing</h3>
                  <p className="text-slate-400 text-xs mb-4">Share your live moving location or log position snapshots — your safety team sees everything in real time</p>
                  <LocationBreadcrumbTracker
                    caseId={activeCase?.id}
                    caseStatus={activeCase?.status}
                  />
                </div>
              )}

              {activeTab === 'pin' && (
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Universal 6-Digit Emergency PIN</h3>
                  <p className="text-slate-400 text-xs mb-4">Cross-device access — unlocks your vault and SOS console on any device without app login</p>
                  
                  {/* Prompt if PIN not set */}
                  <PINSetupPrompt userEmail={user?.email} />
                  
                  <div className="bg-white rounded-xl p-4 mt-4">
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