import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Battery, Shield, ChevronDown, Navigation, Trash2, Bell } from 'lucide-react';
import { useSurroundingAwareness } from '@/hooks/useSurroundingAwareness';
import { CATEGORIES } from '@/lib/nearbyCategories';

function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function fmtTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} hr ago`;
  return `${Math.round(diff / 86400000)} d ago`;
}

export default function SurroundingAwarenessPanel() {
  const { enabled, categories, detectedPlaces, sweeping, toggleEnabled, toggleCategory, clearHistory } = useSurroundingAwareness();
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="mb-6">
      {/* ── Toggle header ── */}
      <div
        className="rounded-2xl overflow-hidden transition-all"
        style={{
          background: enabled ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${enabled ? 'rgba(212,175,55,0.22)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <button
          onClick={toggleEnabled}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: enabled ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <Radar
              className={`w-4 h-4 ${sweeping ? 'animate-spin' : ''}`}
              style={{ color: enabled ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Surrounding Awareness
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: enabled ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.35)' }}>
              {sweeping
                ? 'Scanning your surroundings…'
                : enabled
                  ? `${detectedPlaces.length} place(s) saved · actively watching`
                  : 'Off — M-Care won’t watch your surroundings'}
            </p>
          </div>
          <div
            className="w-11 h-6 rounded-full flex items-center px-0.5 transition-all shrink-0"
            style={{
              background: enabled ? '#D4AF37' : 'rgba(255,255,255,0.12)',
              justifyContent: enabled ? 'flex-end' : 'flex-start',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
          </div>
        </button>

        {/* ── Battery + privacy notice (expandable) ── */}
        <button
          onClick={() => setShowNotice(v => !v)}
          className="w-full flex items-center gap-1.5 px-4 pb-2 text-[10px] uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          <Battery className="w-3 h-3" />
          <Shield className="w-3 h-3" />
          <span>Battery & privacy</span>
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showNotice ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showNotice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="px-4 pb-3 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                M-Care uses your location <strong className="text-white/60">only while this app is open</strong> to detect
                nearby help. It’s throttled — sweeps only run when you move 250m+ or every 3 minutes — to save battery.
                Your location is never shared. Push notifications reach you even if you switch tabs.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Category toggles (when enabled) ── */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mt-4 mb-2"
              style={{ color: 'rgba(255,255,255,0.18)' }}>
              Alert me about
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const on = categories[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: on ? `${cat.color}1a` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${on ? `${cat.color}33` : 'rgba(255,255,255,0.05)'}`,
                      opacity: on ? 1 : 0.4,
                    }}
                  >
                    <span className="text-[18px] leading-none">{cat.emoji}</span>
                    <span className="text-[10px] font-semibold"
                      style={{ color: on ? cat.color : 'rgba(255,255,255,0.5)' }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detected places history ── */}
      <AnimatePresence>
        {enabled && detectedPlaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3 h-3" style={{ color: '#D4AF37' }} />
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold"
                  style={{ color: 'rgba(255,255,255,0.18)' }}>
                  Recently detected
                </p>
              </div>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-[10px] font-semibold transition-opacity active:scale-95"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {detectedPlaces.slice(0, 12).map((p) => (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl p-3.5"
                  style={{ background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.1)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-base shrink-0 mt-0.5">
                        {CATEGORIES.find(c => c.id === p.category)?.emoji || '📍'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white leading-tight">{p.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {p.categoryLabel} · {fmtTime(p.detectedAt)}
                        </p>
                      </div>
                    </div>
                    {p.distance != null && (
                      <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                        {fmtDist(p.distance)}
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                  >
                    <Navigation className="w-3 h-3" /> Directions
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}