import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Hotel, Phone, Lock, X } from 'lucide-react';

/**
 * WelcomeCountryModal
 * Full-screen "You have arrived" landing experience.
 * Renders entirely from props — no network needed (offline-safe).
 *
 * Props:
 *   visible      — show/hide
 *   country      — e.g. "Thailand"
 *   flag         — flag emoji e.g. "🇹🇭"
 *   onViewHotel  — navigate to hotel booking
 *   onCallDriver — navigate to driver contact
 *   onOpenVault  — navigate to passport vault
 *   onDismiss    — close modal
 */
export default function WelcomeCountryModal({
  visible,
  country,
  flag,
  onViewHotel,
  onCallDriver,
  onOpenVault,
  onDismiss,
}) {
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShowActions(true), 1300);
      return () => clearTimeout(t);
    }
    setShowActions(false);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1e2c 0%, #060B16 100%)' }}
        >
          {/* Animated clouds */}
          {[
            { w: 120, h: 36, top: '12%', delay: 0 },
            { w: 80,  h: 24, top: '20%', delay: 1.5 },
            { w: 160, h: 44, top: '28%', delay: 0.7 },
            { w: 60,  h: 18, top: '8%',  delay: 2.5 },
            { w: 100, h: 30, top: '35%', delay: 3.2 },
          ].map((cloud, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width:  cloud.w,
                height: cloud.h,
                top:    cloud.top,
                background: 'rgba(255,255,255,0.04)',
                filter: 'blur(2px)',
              }}
              animate={{ x: ['-100vw', '110vw'] }}
              transition={{
                duration: 12 + i * 3,
                delay: cloud.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}

          {/* Plane sweep */}
          <motion.div
            className="absolute pointer-events-none"
            style={{ top: '24%' }}
            initial={{ x: '-100vw', rotate: -4 }}
            animate={{ x: '110vw', rotate: 8 }}
            transition={{ duration: 3.8, ease: [0.15, 0.5, 0.85, 1.0] }}
          >
            <Plane
              className="w-14 h-14"
              style={{
                color: '#D4AF37',
                filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.7))',
              }}
            />
          </motion.div>

          {/* Glow behind flag */}
          <motion.div
            className="absolute w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm w-full">
            {/* Flag */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 180, damping: 12 }}
              className="text-[100px] leading-none select-none mb-4"
              aria-label={`Flag of ${country}`}
            >
              {flag || '🌍'}
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05 }}
              className="text-xs font-semibold uppercase tracking-[0.32em] mb-2"
              style={{ color: '#D4AF37' }}
            >
              You have arrived
            </motion.p>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 }}
              className="text-[2rem] font-semibold text-white mb-1"
              style={{ letterSpacing: '-0.01em', lineHeight: 1.1 }}
            >
              Welcome to {country}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="text-slate-400 text-sm mb-8"
            >
              Your Morales care team is ready. What do you need first?
            </motion.p>

            {/* Actions */}
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                  className="w-full space-y-3"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { Icon: Hotel, label: 'Hotel',  onClick: onViewHotel },
                      { Icon: Phone, label: 'Driver', onClick: onCallDriver },
                      { Icon: Lock,  label: 'Vault',  onClick: onOpenVault },
                    ].map(({ Icon, label, onClick }) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className="flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-white transition-all"
                        style={{
                          background: '#0C1A1D',
                          borderColor: '#2A3F4A',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A3F4A'; }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#D4AF37' }} />
                        <span className="text-[11px] font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={onDismiss}
                    className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-white text-sm font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
