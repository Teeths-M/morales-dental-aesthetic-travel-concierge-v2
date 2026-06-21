import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Share, PlusSquare, CheckCircle2, X, MoreVertical } from 'lucide-react';

function getPlatform() {
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'other';
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState('other');
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    setPlatform(getPlatform());
    setInstalled(isStandalone());

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-600/50 rounded-xl px-4 py-3 text-emerald-300 text-sm font-semibold">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        Installed as an app — offline tools work even with no signal.
      </div>
    );
  }

  if (dismissed) return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-4"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Smartphone className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold mb-1">Install for offline access</p>

            {platform === 'ios' && (
              <p className="text-slate-400 text-xs leading-relaxed">
                Tap <Share className="w-3 h-3 inline -mt-0.5 mx-0.5" /> Share, then scroll down and tap
                <PlusSquare className="w-3 h-3 inline -mt-0.5 mx-0.5" /> <span className="text-slate-300 font-semibold">"Add to Home Screen"</span>.
                This keeps the SOS and emergency manifest tools working with zero signal.
              </p>
            )}

            {platform === 'android' && (
              <>
                <p className="text-slate-400 text-xs leading-relaxed mb-2">
                  {deferredPrompt
                    ? 'Add this to your home screen so SOS and the emergency manifest still work with no signal.'
                    : (
                      <>Tap <MoreVertical className="w-3 h-3 inline -mt-0.5 mx-0.5" /> menu, then <span className="text-slate-300 font-semibold">"Add to Home screen" / "Install app"</span>.</>
                    )}
                </p>
                {deferredPrompt && (
                  <button
                    onClick={handleAndroidInstall}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Install app
                  </button>
                )}
              </>
            )}

            {platform === 'other' && (
              <p className="text-slate-400 text-xs leading-relaxed">
                Open this page on your phone's browser, then use "Add to Home Screen" (iOS) or "Install app" (Android)
                to enable offline access.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
