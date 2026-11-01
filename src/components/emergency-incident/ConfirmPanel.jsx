import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';

const TYPES = [
  { key: 'security', label: 'I feel unsafe' },
  { key: 'medical', label: 'Medical emergency' },
];

/**
 * ConfirmPanel — the explicit gate between "something is wrong" and dispatch.
 *
 * Nothing upstream may open an incident on its own. A spoken "I need help", a
 * transcribed sentence or a model's reading of it is a request to ASK, never an
 * alert: the confirmation below is the only thing that escalates, and it says
 * so plainly so nobody assumes a chat message already called anyone.
 */
export default function ConfirmPanel({ onConfirm, busy = false, defaultType = 'security' }) {
  const [type, setType] = useState(defaultType);
  const [armed, setArmed] = useState(false);

  return (
    <MSafeCard className="border-msafe-critical/40">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-msafe-critical" aria-hidden="true" />
        <MSafeText variant="eyebrow" as="p">Emergency alert</MSafeText>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-msafe-ink">
        Saying that you need help in chat does not alert anyone. This button does.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={`rounded-xl border px-3 py-2.5 text-[12px] font-medium ${
              type === t.key
                ? 'border-msafe-gold bg-msafe-gold/10 text-msafe-ink'
                : 'border-msafe-border bg-msafe-raised text-msafe-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-3 w-full rounded-xl bg-msafe-critical px-4 py-3.5 text-[13.5px] font-semibold text-white"
        >
          I need emergency help now
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-msafe-critical/45 bg-msafe-critical/10 p-3">
          <p className="text-[12px] leading-relaxed text-msafe-ink">
            This will open an incident, alert your care team and authorised contacts, and share
            your location with them. Confirm to send.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm?.({ type, confirmed: true, confirmation_method: 'in_app_explicit' })}
              className="flex-1 rounded-lg bg-msafe-critical px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-45"
            >
              {busy ? 'Sending…' : 'Yes, send the alert'}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="rounded-lg border border-msafe-border px-3.5 py-3 text-[12.5px] text-msafe-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </MSafeCard>
  );
}