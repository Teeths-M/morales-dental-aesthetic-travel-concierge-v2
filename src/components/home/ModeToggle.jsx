import React from 'react';
import { motion } from 'framer-motion';
import { usePlatformMode } from '@/context/PlatformModeContext';

const GOLD = '#D4AF37';

export default function ModeToggle() {
  const { mode, toggleMode } = usePlatformMode();
  const isMedical = mode === 'medical';

  return (
    <div
      className="inline-flex items-center rounded-full p-0.5 gap-0 relative"
      style={{
        background: 'rgba(10,16,29,0.85)',
        border: '1px solid rgba(212,175,55,0.22)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Medical */}
      <button
        onClick={() => toggleMode('medical')}
        className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors duration-200"
        style={{ color: isMedical ? '#060B16' : 'rgba(255,255,255,0.45)' }}
      >
        {isMedical && (
          <motion.div
            layoutId="modeIndicator"
            className="absolute inset-0 rounded-full"
            style={{ background: GOLD }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <span className="relative z-10">🏥</span>
        <span className="relative z-10">Medical</span>
      </button>

      {/* Non-Medical */}
      <button
        onClick={() => toggleMode('nonmedical')}
        className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors duration-200"
        style={{ color: !isMedical ? '#060B16' : 'rgba(255,255,255,0.45)' }}
      >
        {!isMedical && (
          <motion.div
            layoutId="modeIndicator"
            className="absolute inset-0 rounded-full"
            style={{ background: GOLD }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <span className="relative z-10">✈️</span>
        <span className="relative z-10">Travel</span>
      </button>
    </div>
  );
}