import React, { useState, useEffect } from 'react';
import { WifiOff, MessageSquare, QrCode, Shield, Smartphone, ArrowLeft, Download, BookOpen } from 'lucide-react';
import OfflineCapabilitiesPanel from '@/components/offline/OfflineCapabilitiesPanel';
import { useNavigate, Link } from 'react-router-dom';

export default function OfflineMode() {
  const navigate = useNavigate();
  const [isStandalone, setIsStandalone] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  useEffect(() => {
    // @ts-ignore — navigator.standalone is iOS-specific, not in standard Navigator type
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  }, []);

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
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">iQ200 Offline Layer</p>
              <h1 className="text-2xl font-semibold text-white">Offline Capabilities</h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Fully operational coordination during data blackouts — SMS shortcodes, encrypted QR tokens, emergency PINs, and locally cached documents all work without internet.
          </p>
          {/* Add to Home Screen prompt */}
          {!isStandalone && (
            <div className="mt-5 bg-blue-950 border border-blue-700 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">Add to Your Home Screen</p>
                  {isIOS && (
                    <p className="text-xs text-blue-300 leading-relaxed">
                      Tap the <span className="font-semibold">Share</span> button (⬆) at the bottom of Safari → <span className="font-semibold">"Add to Home Screen"</span>. This lets you open the app offline.
                    </p>
                  )}
                  {isAndroid && (
                    <p className="text-xs text-blue-300 leading-relaxed">
                      Tap the <span className="font-semibold">⋮ menu</span> in Chrome → <span className="font-semibold">"Add to Home screen"</span>. This lets you open the app offline.
                    </p>
                  )}
                  {!isIOS && !isAndroid && (
                    <p className="text-xs text-blue-300 leading-relaxed">
                      Install this app on your phone for instant offline access — tap the install icon in your browser's address bar or use the browser menu.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {isStandalone && (
            <div className="mt-5 bg-emerald-950 border border-emerald-700 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-emerald-400 text-lg">✓</span>
              <p className="text-xs text-emerald-300 font-semibold">Installed as home screen app — offline access is ready.</p>
            </div>
          )}

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* @ts-ignore — caseId/userId optional in public offline mode */}
        <OfflineCapabilitiesPanel />
        <Link to="/offline-guide"
          className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 hover:bg-slate-700 transition-colors">
          <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Traveler Offline Guide</p>
            <p className="text-xs text-slate-400">Step-by-step setup instructions for your phone</p>
          </div>
          <span className="ml-auto text-slate-500 text-lg">›</span>
        </Link>
      </div>
    </div>
  );
}