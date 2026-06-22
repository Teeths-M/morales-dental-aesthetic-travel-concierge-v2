/**
 * WildernessSafetyMode page
 * The Canopy Collapse — Wilderness Offline SOS + Search & Rescue Protocol
 * Route: /wilderness-safety
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mountain, AlertTriangle, Shield, WifiOff, Wifi, TreePine, Navigation } from 'lucide-react';
import { BackButtonLight } from '@/components/nav/BackButton';
import { base44 } from '@/api/base44Client';
import WildernessActivityStart from '@/components/wilderness/WildernessActivityStart';

const FEATURE_PILLS = [
  { label: 'Offline GPS Capture', color: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
  { label: 'SMS SOS Payload', color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  { label: 'Auto-Sync on Return', color: 'bg-amber-900/50 text-amber-300 border-amber-700' },
  { label: 'Guardian Tracking', color: 'bg-violet-900/50 text-violet-300 border-violet-700' },
  { label: 'ISO 21101 Checklist', color: 'bg-red-900/50 text-red-300 border-red-700' },
];

export default function WildernessSafetyMode() {
  const [user, setUser] = useState(null);
  const [caseId, setCaseId] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const cases = await base44.entities.CaseRecord.filter({ client_email: u.email }, '-created_date', 1).catch(() => []);
        if (cases[0]) setCaseId(cases[0].id);
      }
    }).catch(() => {});

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950/30 to-slate-900">
      {/* Hero */}
      <div className="border-b border-green-900/30">
        <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          <BackButtonLight fallback="/emergency" className="mb-6" />
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-900/50 rounded-2xl flex items-center justify-center border border-green-800/50">
                <TreePine className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 text-xs font-bold uppercase tracking-widest">Canopy Collapse Protocol</p>
                <h1 className="text-2xl font-bold text-white">Wilderness Safety Mode</h1>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                : 'bg-red-900/40 text-red-300 border-red-700'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'OFFLINE MODE'}
            </div>
          </div>

          <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
            Adventure & wilderness safety protocol — GPS capture, offline SOS packet, SMS emergency payload,
            and automatic sync when internet returns.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {FEATURE_PILLS.map(p => (
              <span key={p.label} className={`text-xs font-semibold px-3 py-1 rounded-full border ${p.color}`}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Offline warning banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-red-900/40 border-2 border-red-500/60 rounded-2xl px-5 py-4 flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-bold text-sm">You are offline</p>
                <p className="text-red-400 text-xs mt-1">
                  GPS still works. Create an SOS packet below and send via SMS if you have cellular signal.
                  When internet returns, Morales will sync automatically.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity start panel */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <WildernessActivityStart
            user={user}
            caseId={caseId}
            onSessionCreated={() => {}}
          />
        </div>

        {/* Info footer */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 space-y-2 text-xs text-slate-500">
          <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">How this works</p>
          <p>• <strong className="text-slate-300">GPS</strong> captures your location using hardware — works without internet.</p>
          <p>• <strong className="text-slate-300">SOS packet</strong> is stored locally the moment you press Emergency SOS.</p>
          <p>• <strong className="text-slate-300">SMS fallback</strong> opens your phone's SMS app with a pre-filled rescue message. You must press Send. SMS requires cellular signal.</p>
          <p>• <strong className="text-slate-300">Auto-sync</strong> — when internet returns, Morales servers receive the SOS automatically.</p>
          <p>• <strong className="text-slate-300">Guardian links</strong> show last-known GPS location. No medical or vault data is exposed.</p>
          <p>• This is a web app, not a satellite communicator. True signal-void scenarios require a dedicated emergency beacon (PLB/SPOT).</p>
        </div>
      </div>
    </div>
  );
}