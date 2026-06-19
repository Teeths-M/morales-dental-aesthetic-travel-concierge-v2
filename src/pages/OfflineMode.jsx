import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, MessageSquare, QrCode, Shield, Smartphone, ArrowLeft } from 'lucide-react';
import OfflineCapabilitiesPanel from '@/components/offline/OfflineCapabilitiesPanel';
import { useNavigate } from 'react-router-dom';

export default function OfflineMode() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <div className="border-b border-slate-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center">
              <WifiOff className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">iQ200 Offline Layer</p>
              <h1 className="text-2xl font-bold text-white">Offline Capabilities</h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Fully operational coordination during data blackouts — SMS shortcodes, encrypted QR tokens, emergency PINs, and locally cached documents all work without internet.
          </p>
          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: MessageSquare, label: 'SMS Shortcodes', color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
              { icon: QrCode, label: 'QR Tokens', color: 'bg-violet-900/50 text-violet-300 border-violet-700' },
              { icon: Smartphone, label: 'Emergency PIN', color: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
              { icon: Shield, label: 'Offline Vault', color: 'bg-amber-900/50 text-amber-300 border-amber-700' },
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <OfflineCapabilitiesPanel />
      </div>
    </div>
  );
}