import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

const TYPE_STYLES = {
  arrival:   { bg: '#0a1a10', border: 'rgba(34,197,94,0.5)',  accent: '#22c55e' },
  driver:    { bg: '#0a1020', border: 'rgba(96,165,250,0.5)', accent: '#60a5fa' },
  handshake: { bg: '#0a1020', border: 'rgba(212,175,55,0.5)', accent: '#D4AF37' },
  checkin:   { bg: '#1a0a0a', border: 'rgba(239,68,68,0.5)',  accent: '#ef4444' },
  alert:     { bg: '#1a0a0a', border: 'rgba(239,68,68,0.5)',  accent: '#ef4444' },
  success:   { bg: '#0a1a10', border: 'rgba(34,197,94,0.5)',  accent: '#22c55e' },
  info:      { bg: '#0C1A1D', border: 'rgba(148,163,184,0.3)', accent: '#94a3b8' },
};

function NotificationCard({ n, onDismiss }) {
  const s = TYPE_STYLES[n.type] || TYPE_STYLES.info;

  return (
    <motion.div
      layout
      initial={n.position === 'top'
        ? { y: -80, opacity: 0, scale: 0.94 }
        : { y: 80, opacity: 0, scale: 0.94 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={n.position === 'top'
        ? { y: -60, opacity: 0, scale: 0.92 }
        : { y: 60, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${s.border}`,
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0 leading-tight mt-0.5">{n.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{n.title}</p>
          {n.body && (
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#94a3b8' }}>{n.body}</p>
          )}
          {n.action && (
            <button
              onClick={() => { n.action.onPress?.(); onDismiss(); }}
              className="mt-2.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: `${s.accent}20`,
                border: `1px solid ${s.accent}60`,
                color: s.accent,
              }}
            >
              {n.action.label}
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg flex-shrink-0 mt-0.5"
          style={{ color: '#475569' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar auto-dismiss indicator */}
      {n.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: n.duration / 1000, ease: 'linear' }}
          style={{
            height: 2,
            background: s.accent,
            opacity: 0.4,
            transformOrigin: 'left',
          }}
        />
      )}
    </motion.div>
  );
}

export default function GlobalNotificationStack() {
  const { stack, dismiss } = useNotification();

  const top    = stack.filter(n => n.position !== 'bottom');
  const bottom = stack.filter(n => n.position === 'bottom');

  return (
    <>
      {/* Top stack — informational (arrival, driver, greeting) */}
      <div
        className="fixed z-[9985] flex flex-col gap-2 pointer-events-none"
        style={{ top: 80, left: '50%', transform: 'translateX(-50%)', width: 'min(400px, calc(100vw - 32px))' }}
      >
        <AnimatePresence mode="sync">
          {top.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <NotificationCard n={n} onDismiss={() => dismiss(n.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom stack — action-required (check-in, alerts) */}
      <div
        className="fixed z-[9985] flex flex-col-reverse gap-2 pointer-events-none"
        style={{ bottom: 96, left: '50%', transform: 'translateX(-50%)', width: 'min(400px, calc(100vw - 32px))' }}
      >
        <AnimatePresence mode="sync">
          {bottom.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <NotificationCard n={n} onDismiss={() => dismiss(n.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
