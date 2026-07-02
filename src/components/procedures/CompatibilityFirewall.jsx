/**
 * SAFE-T4LIFE™ Procedure Compatibility Firewall
 * 
 * Displays GREEN / YELLOW / RED compatibility status with reassuring,
 * medically responsible messaging. Never blocks the patient — always escalates
 * to provider review when needed.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info, Stethoscope } from 'lucide-react';
import { analyseCompatibility, COMPATIBILITY_COPY, DISCLAIMER } from '@/lib/procedureCompatibility';

const COLOR_MAP = {
  GREEN: {
    wrapper: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    label: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    headline: 'text-emerald-800',
    body: 'text-emerald-700',
    dot: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  YELLOW: {
    wrapper: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    label: 'bg-amber-100 text-amber-700 border-amber-200',
    headline: 'text-amber-800',
    body: 'text-amber-700',
    dot: 'bg-amber-500',
    Icon: AlertCircle,
  },
  RED: {
    wrapper: 'bg-rose-50 border-rose-200',
    icon: 'text-rose-600',
    label: 'bg-rose-100 text-rose-700 border-rose-200',
    headline: 'text-rose-800',
    body: 'text-rose-700',
    dot: 'bg-rose-500',
    Icon: Shield,
  },
};

export default function CompatibilityFirewall({ items, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length <= 1) return null;

  const result = analyseCompatibility(items);
  const copy = COMPATIBILITY_COPY[result.level];
  const colors = COLOR_MAP[result.level];
  const StatusIcon = colors.Icon;

  // ── Compact mode (used inside ConsultationMedicalCart in booking sidebar) ──
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border px-3 py-2.5 ${colors.wrapper}`}
      >
        <div className="flex items-start gap-2">
          <StatusIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border ${colors.label}`}>
                Safety Review · {copy.label}
              </span>
            </div>
            <p className={`text-[11px] leading-snug font-medium ${colors.headline}`}>{copy.headline}</p>
            {result.level !== 'GREEN' && result.reasons.length > 0 && (
              <p className={`text-[10px] leading-snug mt-0.5 ${colors.body}`}>{result.reasons[0]}</p>
            )}
          </div>
        </div>
        <p className="text-[9px] text-slate-400 italic mt-1.5 px-0.5">{DISCLAIMER}</p>
      </motion.div>
    );
  }

  // ── Full mode (used in MyProceduresList sidebar on Procedures page) ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${colors.wrapper}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left hover:opacity-90 transition-opacity"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/60`}>
          <StatusIcon className={`w-4.5 h-4.5 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors.label}`}>
              Safety Review
            </span>
            <span className={`text-[10px] font-semibold ${colors.headline}`}>{copy.label}</span>
          </div>
          <p className={`text-xs font-semibold leading-snug ${colors.headline}`}>{copy.headline}</p>
        </div>
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronUp className={`w-4 h-4 ${colors.icon}`} />
            : <ChevronDown className={`w-4 h-4 ${colors.icon}`} />}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className={`text-xs leading-relaxed ${colors.body}`}>{copy.body}</p>

              {/* Specific reasons */}
              {result.reasons.length > 0 && (
                <div className="space-y-1.5">
                  {result.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                      <p className={`text-[11px] leading-snug ${colors.body}`}>{r}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Provider note (YELLOW/RED only) */}
              {copy.providerNote && (
                <div className="flex items-start gap-2 bg-white/60 rounded-xl px-3 py-2.5 border border-white/80">
                  <Stethoscope className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                  <p className={`text-[11px] font-medium leading-snug ${colors.headline}`}>{copy.providerNote}</p>
                </div>
              )}

              {/* Metrics row */}
              {(result.totalAnesthesiaHrs > 0 || result.totalRecoveryDays > 0) && (
                <div className="flex gap-3">
                  {result.totalAnesthesiaHrs > 0 && (
                    <div className="flex-1 bg-white/50 rounded-lg px-2.5 py-2 text-center">
                      <p className={`text-[10px] font-semibold ${colors.headline}`}>~{result.totalAnesthesiaHrs.toFixed(1)}h</p>
                      <p className="text-[9px] text-slate-500">Est. anesthesia</p>
                    </div>
                  )}
                  {result.totalRecoveryDays > 0 && (
                    <div className="flex-1 bg-white/50 rounded-lg px-2.5 py-2 text-center">
                      <p className={`text-[10px] font-semibold ${colors.headline}`}>{result.totalRecoveryDays}d</p>
                      <p className="text-[9px] text-slate-500">Max recovery</p>
                    </div>
                  )}
                </div>
              )}

              {/* Legal disclaimer */}
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 italic leading-snug">{DISCLAIMER}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}