import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/context/NotificationContext';

/* ── Apple-style accent colors per notification type ─────────────────────── */
const TYPE_ACCENT = {
  arrival:   '#22c55e',
  driver:    '#60a5fa',
  handshake: '#D4AF37',
  checkin:   '#ef4444',
  alert:     '#ef4444',
  success:   '#22c55e',
  info:      '#D4AF37',
};

/* ── Apple iOS-style frosted glass notification card ─────────────────────── */
function NotificationCard({ n, onDismiss }) {
  const accent = TYPE_ACCENT[n.type] || '#D4AF37';

  return (
    <motion.div
      layout
      initial={n.position === 'top'
        ? { y: -72, opacity: 0, scale: 0.93 }
        : { y: 72, opacity: 0, scale: 0.93 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={n.position === 'top'
        ? { y: -50, opacity: 0, scale: 0.95 }
        : { y: 50, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      onClick={onDismiss}
      className="w-full cursor-pointer"
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(28, 28, 32, 0.88)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* App icon — white square with Morales M, like iOS app icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* App name + timestamp row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
              MORALES
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>now</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 1 }}
            className="truncate">{n.title}</p>
          {n.body && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}
              className="line-clamp-2">{n.body}</p>
          )}
          {n.action && (
            <button
              onClick={e => { e.stopPropagation(); n.action.onPress?.(); onDismiss(); }}
              style={{
                marginTop: 8, padding: '5px 12px', borderRadius: 20,
                background: `${accent}22`, border: `1px solid ${accent}55`,
                color: accent, fontSize: 12, fontWeight: 700,
              }}
            >
              {n.action.label}
            </button>
          )}
        </div>
      </div>

      {/* Thin accent progress line at bottom */}
      {n.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: n.duration / 1000, ease: 'linear' }}
          style={{
            height: 2,
            background: accent,
            opacity: 0.5,
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
