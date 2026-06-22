import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { HEART_ROLES } from './heartConfig';

/**
 * Individual heart notification toast.
 * Props: notification { id, roles[], message, timestamp }, onDismiss
 */
export default function HeartToast({ notification, onDismiss }) {
  const { roles = ['patient'], message, timestamp } = notification;

  const primary = HEART_ROLES[roles[0]] || HEART_ROLES.patient;
  const secondary = roles[1] ? HEART_ROLES[roles[1]] : null;

  const heartStyle = secondary
    ? {
        background: `linear-gradient(135deg, ${primary.color} 0%, ${secondary.color} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: `drop-shadow(0 0 8px ${primary.color}99)`,
      }
    : {
        color: primary.color,
        filter: `drop-shadow(0 0 8px ${primary.color}99)`,
      };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl"
      style={{
        background: 'rgba(6,11,22,0.92)',
        border: `1px solid ${primary.color}40`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${primary.color}20 inset`,
        minWidth: 260,
        maxWidth: 340,
      }}
    >
      {/* Pulsing heart */}
      <motion.div
        animate={{ scale: [1, 1.25, 1, 1.15, 1] }}
        transition={{ duration: 0.8, repeat: 2, ease: 'easeInOut' }}
        className="text-2xl flex-shrink-0 mt-0.5"
        style={secondary ? {} : { color: primary.color }}
      >
        <span style={secondary ? heartStyle : { fontSize: 22 }}>
          {secondary ? '❤️' : primary.emoji}
        </span>
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold tracking-widest uppercase mb-0.5" style={{ color: primary.color }}>
          {secondary ? `${primary.label} + ${secondary.label}` : primary.label}
        </p>
        <p className="text-white/80 text-[13px] leading-snug truncate">{message}</p>
        {timestamp && (
          <p className="text-white/35 text-[10px] mt-1">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}