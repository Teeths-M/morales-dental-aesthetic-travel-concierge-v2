import React from 'react';
import { Moon, Loader2 } from 'lucide-react';

/**
 * AroundYouControl — the traveller's own rules for being interrupted.
 *
 * Two things this component is careful about:
 * 1. The master switch is real. Turning it off is not "pause notifications" —
 *    it also tells the server to forget the stored position, so permission and
 *    data go together.
 * 2. Quiet hours are described as the destination's clock, because that is what
 *    the engine actually uses.
 */
const MIN_LEVELS = [
  { value: 'information', label: 'Everything, including background notes' },
  { value: 'caution', label: 'Caution and above' },
  { value: 'warning', label: 'Warning and above' },
  { value: 'urgent', label: 'Urgent only' },
];

const CARD = { background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.12)' };

export default function AroundYouControl({ settings, busy, onSave }) {
  const enabled = settings?.enabled === true;

  const field = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 13,
    padding: '9px 10px',
    width: '100%',
  };

  return (
    <div className="rounded-2xl px-4 py-4" style={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Tell me what's happening around me</p>
          <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
            Uses your location to check what is happening near you and near the places you saved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSave({ enabled: !enabled })}
          disabled={busy}
          aria-pressed={enabled}
          className="w-11 h-6 rounded-full flex items-center px-0.5 shrink-0 transition-all disabled:opacity-50"
          style={{
            background: enabled ? '#D4AF37' : 'rgba(255,255,255,0.14)',
            justifyContent: enabled ? 'flex-end' : 'flex-start',
          }}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-[9.5px] uppercase font-bold block mb-1.5" style={{ color: 'rgba(255,255,255,0.32)', letterSpacing: '0.13em' }}>
              Only interrupt me for
            </label>
            <select
              value={settings?.min_level || 'caution'}
              onChange={(e) => onSave({ min_level: e.target.value })}
              disabled={busy}
              style={field}
            >
              {MIN_LEVELS.map((l) => (
                <option key={l.value} value={l.value} style={{ background: '#0C1A1D' }}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Moon className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[12px] font-medium text-white/80">Quiet hours</span>
              </div>
              <button
                type="button"
                onClick={() => onSave({ quiet_hours_enabled: settings?.quiet_hours_enabled === false })}
                disabled={busy}
                className="w-9 h-5 rounded-full flex items-center px-0.5 shrink-0 transition-all disabled:opacity-50"
                style={{
                  background: settings?.quiet_hours_enabled !== false ? '#D4AF37' : 'rgba(255,255,255,0.14)',
                  justifyContent: settings?.quiet_hours_enabled !== false ? 'flex-end' : 'flex-start',
                }}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {settings?.quiet_hours_enabled !== false ? (
              <>
                <div className="flex items-center gap-2 mt-2.5">
                  <input
                    type="time"
                    value={settings?.quiet_hours_start || '22:00'}
                    onChange={(e) => onSave({ quiet_hours_start: e.target.value })}
                    disabled={busy}
                    style={{ ...field, padding: '7px 8px' }}
                  />
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>to</span>
                  <input
                    type="time"
                    value={settings?.quiet_hours_end || '07:00'}
                    onChange={(e) => onSave({ quiet_hours_end: e.target.value })}
                    disabled={busy}
                    style={{ ...field, padding: '7px 8px' }}
                  />
                </div>
                <p className="text-[10px] mt-2 leading-snug" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  On the destination's clock. An urgent alert still comes through — nothing else does.
                </p>
              </>
            ) : null}
          </div>

          {busy ? (
            <p className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'rgba(212,175,55,0.8)' }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}