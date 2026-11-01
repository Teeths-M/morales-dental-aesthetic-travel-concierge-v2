import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';

const ACTIONS = [
  {
    key: 'resolved_safe',
    label: 'I am safe',
    detail: 'Closes the incident as safe. Responders and your guardian are told it is stood down.',
  },
  {
    key: 'false_alarm',
    label: 'This was a false alarm',
    detail: 'Recorded as a false alarm. Anyone already moving is stood down and the record is kept.',
  },
  {
    key: 'handover',
    label: 'Hand over to the care team',
    detail: 'Leaves the incident open and transfers it to a human coordinator.',
  },
];

/**
 * ClosurePanel — ending an incident without erasing it.
 *
 * Two taps on purpose. A single tap on "I am safe" beside "false alarm" is how
 * a real emergency gets closed by a thumb brushing a screen. Nothing here
 * deletes anything: closing writes a reason, a time and an actor, and the
 * stand-down still has to reach the people who are already moving.
 */
export default function ClosurePanel({ onResolve, busy = false, closedReason }) {
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState('');

  if (closedReason) {
    return (
      <MSafeCard>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-msafe-positive" aria-hidden="true" />
          <MSafeText variant="eyebrow" as="p">Incident closed</MSafeText>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-msafe-muted">
          Closed as {String(closedReason).replace(/_/g, ' ')}. The full incident history is kept,
          including who was contacted and what they acknowledged.
        </p>
      </MSafeCard>
    );
  }

  return (
    <MSafeCard>
      <MSafeText variant="eyebrow" as="p">End this incident</MSafeText>
      <p className="mt-2 text-[12px] leading-relaxed text-msafe-muted">
        Only use this if you are safe or the alert was a mistake. History is preserved either way.
      </p>

      <div className="mt-3 space-y-2">
        {ACTIONS.map((a) => {
          const isPending = pending === a.key;
          return (
            <div
              key={a.key}
              className={`rounded-xl border px-3.5 py-2.5 ${
                isPending ? 'border-msafe-gold bg-msafe-gold/10' : 'border-msafe-border bg-msafe-raised'
              }`}
            >
              <button
                type="button"
                onClick={() => setPending(isPending ? null : a.key)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-msafe-ink">{a.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-msafe-muted">{a.detail}</span>
                </span>
              </button>

              {isPending && (
                <div className="mt-2.5 border-t border-msafe-border pt-2.5">
                  <label className="block text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">
                    Note for the care team (optional)
                  </label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What happened?"
                    className="mt-1 w-full rounded-lg border border-msafe-border bg-msafe-surface px-3 py-2 text-[13px] text-msafe-ink placeholder:text-msafe-muted/70 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResolve?.(a.key, note)}
                    className="mt-2 w-full rounded-lg bg-msafe-gold px-4 py-2.5 text-[12.5px] font-semibold text-[#060B16] disabled:opacity-45"
                  >
                    {busy ? 'Recording…' : `Confirm: ${a.label}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MSafeCard>
  );
}