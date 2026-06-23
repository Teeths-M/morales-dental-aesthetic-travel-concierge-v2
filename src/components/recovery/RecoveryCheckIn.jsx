import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, CheckCircle2, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { useRecoveryCheckIn } from '@/offline/recovery/useRecoveryCheckIn';

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, onChange, colorFn }) {
  const pct  = ((value - min) / (max - min)) * 100;
  const color = colorFn(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className={`text-base font-bold ${color}`}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #10b981 0%, #f59e0b ${pct}%, #e2e8f0 ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min} (worst)</span>
        <span>{max} (best)</span>
      </div>
    </div>
  );
}

function TapGroup({ label, options, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              value === opt.value
                ? opt.activeClass
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PAIN_COLOR  = v => v >= 7 ? 'text-red-600' : v >= 4 ? 'text-amber-600' : 'text-emerald-600';
// Mobility & appetite: higher = better (invert for display)
const MOB_COLOR   = v => v <= 2 ? 'text-red-600' : v === 3 ? 'text-amber-600' : 'text-emerald-600';

const WOUND_OPTIONS = [
  { value: 'good',       label: '✓ Good',       activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'concerning', label: '⚠ Concerning', activeClass: 'border-amber-500  bg-amber-50  text-amber-700'  },
  { value: 'bad',        label: '✗ Bad',        activeClass: 'border-red-500    bg-red-50    text-red-700'    },
];

const SEVERITY_CONFIG = {
  none:    { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'All good — recovery on track' },
  warning: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50  border-amber-200',  label: 'Some concerns noted — your team has been notified' },
  escalate:{ icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50    border-red-200',    label: 'Your care team has been alerted — they will contact you shortly' },
};

/**
 * RecoveryCheckIn
 *
 * Props:
 *   sessionId  string  — RecoverySession ID
 *   tripId     string
 *   caseId     string
 */
export default function RecoveryCheckIn({ sessionId, tripId, caseId }) {
  const { isOnline, form, setForm, submitState, anomalyResult, errorMsg, submit, reset }
    = useRecoveryCheckIn({ sessionId, tripId, caseId });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const isSubmitting = submitState === 'syncing' || submitState === 'queued';
  const isDone       = submitState === 'done';

  if (isDone && anomalyResult) {
    const sev = anomalyResult.anomaly_severity || 'none';
    const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.none;
    const Icon = cfg.icon;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl border p-6 space-y-4 ${cfg.bg}`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${cfg.color}`} />
          <div>
            <p className={`font-bold ${cfg.color}`}>{cfg.label}</p>
            {anomalyResult.anomaly_reasons?.length > 0 && (
              <ul className={`mt-2 space-y-0.5 text-xs ${cfg.color}`}>
                {anomalyResult.anomaly_reasons.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Check-in recorded for {anomalyResult.date || 'today'}.
          {!isOnline && ' Synced from offline queue.'}
        </p>
        <button
          onClick={reset}
          className="text-xs text-slate-500 underline hover:text-slate-700"
        >
          Submit another (tomorrow's check-in)
        </button>
      </motion.div>
    );
  }

  // Offline-queued state (no internet, packet saved locally)
  if (submitState === 'queued') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600" />
          <p className="font-semibold text-amber-800 text-sm">Check-in saved offline</p>
        </div>
        <p className="text-xs text-amber-700">
          Your check-in is queued and will sync automatically when you reconnect.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connectivity badge */}
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit ${
        isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                 : 'bg-amber-50  text-amber-700  border border-amber-200'
      }`}>
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? 'Online — will sync immediately' : 'Offline — will sync on reconnect'}
      </div>

      {/* Pain slider */}
      <SliderRow
        label="Pain Level"
        value={form.painLevel}
        min={1} max={10}
        onChange={v => set('painLevel', v)}
        colorFn={PAIN_COLOR}
      />

      {/* Mobility slider */}
      <SliderRow
        label="Mobility"
        value={form.mobility}
        min={1} max={5}
        onChange={v => set('mobility', v)}
        colorFn={MOB_COLOR}
      />

      {/* Appetite slider */}
      <SliderRow
        label="Appetite"
        value={form.appetite}
        min={1} max={5}
        onChange={v => set('appetite', v)}
        colorFn={MOB_COLOR}
      />

      {/* Wound status */}
      <TapGroup
        label="Wound / Incision Site"
        options={WOUND_OPTIONS}
        value={form.woundStatus}
        onChange={v => set('woundStatus', v)}
      />

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="How are you feeling? Any specific concerns?"
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={isSubmitting || !sessionId}
        className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${
          isSubmitting || !sessionId
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 shadow-lg'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {submitState === 'syncing' ? 'Sending…' : 'Saving offline…'}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Activity className="w-5 h-5" />
            Submit Recovery Check-In
          </span>
        )}
      </button>

      {/* SMS fallback */}
      <div className="border-t pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          SMS Alternative (no internet needed)
        </p>
        <code className="block text-xs bg-slate-100 text-slate-700 font-mono px-3 py-2 rounded-xl">
          {`RECOVERY ${form.painLevel} ${form.mobility} ${form.appetite} ${form.woundStatus.toUpperCase()}`}
        </code>
        <p className="text-[10px] text-slate-400 mt-1">
          Send this text to your coordinator's shortcode number to submit without internet.
        </p>
      </div>
    </div>
  );
}
