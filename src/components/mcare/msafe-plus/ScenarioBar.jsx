import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * ScenarioBar — the state line above the conversation: which scenario is
 * running, which of the nine intake stages is open, and the backend function
 * that stage actually calls.
 *
 * The dropdown is the navigator for the walkthrough, so it lists all nine
 * stages by name rather than being a decorative chevron.
 */
export default function ScenarioBar({ stages, activeIndex, onSelect, onExit }) {
  const [open, setOpen] = useState(false);
  const stage = stages[activeIndex];
  if (!stage) return null;

  return (
    <div
      className="flex-shrink-0 px-4 md:px-6 pt-3 pb-2.5 relative"
      style={{ borderBottom: '1px solid var(--ms-border-soft)' }}
    >
      <p
        className="text-[9.5px] font-bold uppercase truncate"
        style={{ color: 'var(--ms-ink-faint)', letterSpacing: '0.14em' }}
      >
        Real scenario
        <span style={{ color: 'var(--ms-gold)' }}> · </span>
        {stage.title}
      </p>

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {/* Stage selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="msafe-intake inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'var(--ms-chip)', border: '1px solid var(--ms-border)' }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="text-[10.5px] font-bold uppercase" style={{ color: 'var(--ms-ink)', letterSpacing: '0.08em' }}>
              Intake {activeIndex + 1} of {stages.length}
            </span>
            <ChevronDown
              className="w-3 h-3"
              style={{ color: 'var(--ms-ink-faint)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
            />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                className="absolute z-40 mt-1 left-0 w-[266px] max-h-[60vh] overflow-y-auto rounded-xl py-1"
                style={{
                  background: 'var(--ms-card)',
                  border: '1px solid var(--ms-border)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                }}
                role="listbox"
              >
                {stages.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => { onSelect(i); setOpen(false); }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2"
                    style={{ background: i === activeIndex ? 'var(--ms-chip)' : 'transparent' }}
                  >
                    <span
                      className="text-[9.5px] font-bold tabular-nums w-4 flex-shrink-0"
                      style={{ color: i === activeIndex ? 'var(--ms-gold)' : 'var(--ms-ink-faint)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[11.5px] leading-tight" style={{ color: 'var(--ms-ink)' }}>
                      {s.title}
                    </span>
                    {i === activeIndex && <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--ms-green)' }} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="text-[10.5px] font-semibold rounded-lg px-2 py-1"
            style={{ color: 'var(--ms-green-ink)', background: 'var(--ms-green-bg)' }}
          >
            Back to session
          </button>
        )}

        {/* The function that stage calls */}
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1"
          style={{ background: 'var(--ms-green-bg)', border: '1px solid rgba(60,179,113,0.28)' }}
          title={`Runs the ${stage.fn} backend function`}
        >
          <Check className="w-3 h-3" strokeWidth={2.4} style={{ color: 'var(--ms-green-ink)' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--ms-green-ink)' }}>
            {stage.fn}
          </span>
        </span>
      </div>
    </div>
  );
}