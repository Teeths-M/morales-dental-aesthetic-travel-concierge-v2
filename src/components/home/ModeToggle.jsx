import React from 'react';
import { motion } from 'framer-motion';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

export default function ModeToggle() {
  const { mode, toggleMode } = usePlatformMode();

  const modes = [
    { id: 'medical', label: 'Medical', icon: '🏥' },
    { id: 'nonmedical', label: 'Travel', icon: '✈️' },
    { id: 'skyelite', label: 'Jets', icon: '🛩️' },
  ];

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
      {modes.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => toggleMode(m.id)}
            className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors duration-200"
            style={{ color: isActive ? '#060B16' : 'rgba(255,255,255,0.45)' }}
          >
            {isActive && (
              <motion.div
                layoutId="modeIndicator"
                className="absolute inset-0 rounded-full"
                style={{ background: GOLD }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{m.icon}</span>
            <span className="relative z-10">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}