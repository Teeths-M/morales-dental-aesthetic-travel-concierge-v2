import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GUARDIAN_TIPS } from '@/lib/guardianTips';

const SESSION_KEY = 'guardian_ticker_dismissed';
const INTERVAL_MS = 12000;

export default function GuardianTicker() {
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % GUARDIAN_TIPS.length);
        setVisible(true);
      }, 400);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [dismissed]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    sessionStorage.setItem(SESSION_KEY, 'true');
    setDismissed(true);
  };

  const handleTap = () => {
    const tip = GUARDIAN_TIPS[index];
    if (tip.action === 'navigate' && tip.target) {
      navigate(tip.target);
    }
  };

  if (dismissed) return null;

  const tip = GUARDIAN_TIPS[index];

  return (
    <>
    <style>{`
      .guardian-ticker-root { bottom: calc(1rem + var(--sticky-cta-height, 0px) + var(--bottom-tab-bar-height, 0px)); }
      @media (max-width: 639px) { .guardian-ticker-root { bottom: calc(120px + var(--sticky-cta-height, 0px) + var(--bottom-tab-bar-height, 0px)); } }
    `}</style>
    <div
      className="guardian-ticker-root fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md pointer-events-none transition-[bottom] duration-300"
    >
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm text-white rounded-2xl px-4 py-2.5 shadow-xl border border-white/10 cursor-pointer select-none"
            onClick={handleTap}
          >
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium flex-1 leading-tight">
              <span className="mr-1">{tip.icon}</span>
              {tip.text}
            </span>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors ml-1"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}