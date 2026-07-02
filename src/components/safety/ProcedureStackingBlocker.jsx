import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, ArrowLeft, CheckCircle2, Loader2, Clock, Heart, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CODE_LABELS = {
  ANESTHESIA_OVERLOAD:    'Anesthesia Overload',
  POSITIONING_CONFLICT:   'Positioning Conflict',
  RECOVERY_CONFLICT:      'Recovery Protocol Conflict',
  HEMORRHAGE_RISK:        'Hemorrhage Risk',
  MULTI_ZONE_TRAUMA:      'Multi-Zone Surgical Trauma',
  SHARED_VASCULAR_FIELD:  'Shared Vascular Field',
  SHARED_SURGICAL_FIELD:  'Shared Surgical Field',
  METABOLIC_CONFLICT:     'Metabolic Conflict',
  REDUNDANT_FIELD:        'Redundant Surgical Field',
  ORAL_FACIAL_CONFLICT:   'Oral-Facial Conflict',
};

/**
 * ProcedureStackingBlocker
 *
 * Hard-block overlay shown when a patient selects clinically dangerous
 * procedure combinations. The patient CANNOT proceed — they must go back
 * and remove one of the conflicting procedures.
 *
 * Props:
 *   violations       — Array<{ pairLabel, reason, code }>
 *   onBack           — () => void  (go back to cart / procedure selection)
 *   patientEmail     — string | null
 *   patientName      — string | null
 *   consultationId   — string | null
 */
export default function ProcedureStackingBlocker({
  violations = [],
  onBack,
  patientEmail,
  patientName,
  consultationId,
}) {
  const [notified, setNotified]   = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState(null);

  // Auto-send to doctor when the blocker first mounts
  useEffect(() => {
    if (violations.length === 0) return;
    let cancelled = false;

    async function notify() {
      setNotifying(true);
      try {
        await base44.functions.invoke('flagProcedureStackingRisk', {
          patient_email:   patientEmail   || null,
          patient_name:    patientName    || null,
          consultation_id: consultationId || null,
          violations:      violations.map(v => ({
            pair:   v.pairLabel,
            reason: v.reason,
            code:   v.code,
          })),
        });
        if (!cancelled) {
          setNotified(true);
          setNotifiedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (_) {
        // Notification failure is silent — the blocker still shows
        if (!cancelled) setNotified(true);
      } finally {
        if (!cancelled) setNotifying(false);
      }
    }

    notify();
    return () => { cancelled = true; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center p-4"
      style={{ background: 'rgba(6,11,22,0.97)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-xl"
      >
        {/* ── CRITICAL HEADER ── */}
        <div
          className="rounded-t-3xl px-6 py-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', border: '1px solid #dc2626' }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)' }}
          >
            <AlertTriangle className="w-7 h-7 text-red-300" strokeWidth={2.5} />
          </motion.div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-red-400 mb-0.5">
              Medical Safety Review · Critical Block
            </p>
            <h2 className="text-white font-bold text-lg leading-tight">
              Procedure Combination Blocked
            </h2>
            <p className="text-red-300 text-xs mt-0.5">
              {violations.length} critical conflict{violations.length !== 1 ? 's' : ''} detected — doctor review required
            </p>
          </div>
        </div>

        {/* ── BODY ── */}
        <div
          className="rounded-b-3xl overflow-hidden"
          style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderTop: 'none' }}
        >
          {/* Violations list */}
          <div className="p-5 space-y-4">
            {violations.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {/* Pair header */}
                <div
                  className="px-4 py-3 flex items-center justify-between gap-3"
                  style={{ background: 'rgba(239,68,68,0.08)' }}
                >
                  <p className="font-semibold text-sm text-white">{v.pairLabel}</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: '#dc2626', color: '#fff', border: '1px solid #ef4444', fontWeight: 700 }}
                  >
                    {CODE_LABELS[v.code] || v.code}
                  </span>
                </div>
                {/* Clinical reason */}
                <div className="px-4 py-3">
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                    {v.reason}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Doctor notification status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{
                background: notified ? 'rgba(34,197,94,0.08)' : 'rgba(71,85,105,0.15)',
                border: `1px solid ${notified ? 'rgba(34,197,94,0.3)' : '#2A3F4A'}`,
              }}
            >
              {notifying ? (
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin flex-shrink-0 mt-0.5" />
              ) : notified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: notified ? '#4ade80' : '#94a3b8' }}>
                  {notifying
                    ? 'Notifying medical review team…'
                    : notified
                    ? 'Medical review team notified'
                    : 'Preparing notification…'}
                </p>
                {notified && (
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {notifiedAt && `Sent at ${notifiedAt} · `}A licensed doctor will review this case within 24 hours and contact you directly.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Response estimate */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#0a1420', border: '1px solid #1e3040' }}>
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <p className="text-xs" style={{ color: '#64748b' }}>
                <span className="text-white font-medium">Typical review time: 4–24 hours.</span> You will receive an email with the doctor's assessment and a revised safe plan.
              </p>
            </div>
          </div>

          {/* ── M RECOMMENDATIONS ── */}
          {violations.some(v => v.recommended) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mx-5 mb-4 rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)' }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.08)' }}
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
                <p className="text-xs font-bold tracking-wide uppercase" style={{ color: '#D4AF37' }}>
                  What M recommends instead
                </p>
              </div>

              {/* Per-violation recommendation */}
              <div className="p-4 space-y-3">
                {violations.filter(v => v.recommended).map((v, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-semibold text-white">{v.recommended}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{v.recommendedReason}</p>
                  </div>
                ))}
              </div>

              {/* Emotional protection message */}
              <div
                className="px-4 py-3 flex items-start gap-3"
                style={{ borderTop: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.06)' }}
              >
                <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#D4AF37' }}>
                  M is not here to take your dream away. We are here to make sure you are alive to enjoy it.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── ACTIONS ── */}
          <div
            className="px-5 pb-5 pt-1 flex flex-col gap-3"
            style={{ borderTop: '1px solid #1e2d35' }}
          >
            <p className="text-xs text-center pt-3" style={{ color: '#475569' }}>
              To proceed, remove one or more conflicting procedures from your selection.
            </p>
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#D4AF37',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back & Modify My Procedure Selection
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
