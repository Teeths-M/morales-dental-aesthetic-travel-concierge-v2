import React, { useState } from 'react';
import { Car, Check } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';
import { clockTime, toneSurface, toneText, transportStateCopy } from '@/lib/emergencyIncidentUi';

/**
 * TransportPanel — destination choice and the honest state of the ride.
 *
 * The traveller picks and confirms where they are going; nothing here decides
 * that for them, because a destination chosen on someone's behalf in an
 * emergency is a guess with a driver attached. "Requested", "offered" and
 * "accepted" are all shown as not-yet-secured: only a driver acceptance that
 * the server recorded moves the language, never the fact that we asked.
 */
export default function TransportPanel({
  transport,
  options = [],
  onRequest,
  busy = false,
  canRequest = true,
}) {
  const [selected, setSelected] = useState(transport?.destination_label || options[0]?.label || '');
  const state = transportStateCopy(transport?.state);
  const confirmed = transport?.destination_confirmed === true;

  return (
    <MSafeCard>
      <div className="flex items-center gap-2">
        <Car className="h-4 w-4 text-msafe-gold" aria-hidden="true" />
        <MSafeText variant="eyebrow" as="p">Getting you somewhere safe</MSafeText>
      </div>

      {!transport && (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-msafe-muted">
            Choose where you want to be taken. You confirm it yourself — we will not send a driver
            anywhere you have not picked.
          </p>
          <div className="mt-3 space-y-2">
            {options.map((o) => {
              const active = selected === o.label;
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setSelected(o.label)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left ${
                    active
                      ? 'border-msafe-gold bg-msafe-gold/10'
                      : 'border-msafe-border bg-msafe-raised'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-msafe-ink">{o.label}</span>
                    {o.detail && (
                      <span className="block truncate text-[11px] text-msafe-muted">{o.detail}</span>
                    )}
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-msafe-gold" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!canRequest || !selected || busy}
            onClick={() => onRequest?.(options.find((o) => o.label === selected) || { label: selected })}
            className="mt-3 w-full rounded-xl bg-msafe-gold px-4 py-3 text-[13px] font-semibold text-[#060B16] disabled:opacity-45"
          >
            {busy ? 'Requesting…' : `Request transport to ${selected || 'a destination'}`}
          </button>
        </>
      )}

      {transport && (
        <>
          <div className={`mt-3 rounded-xl border px-3.5 py-3 ${toneSurface(state.tone)}`}>
            <p className={`text-[12.5px] font-semibold ${toneText(state.tone)}`}>{state.label}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-msafe-muted">
              {transport.destination_label}
              {confirmed ? ' — destination confirmed by you' : ' — destination not yet confirmed'}
            </p>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-msafe-border pt-3">
            <div>
              <dt className="text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">Driver</dt>
              <dd className="mt-0.5 text-[12.5px] text-msafe-ink">{transport.driver_name || 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">Last update</dt>
              <dd className="mt-0.5 text-[12.5px] text-msafe-ink">{clockTime(transport.updated_at) || '—'}</dd>
            </div>
          </dl>

          {transport.state !== 'ACCEPTED' && transport.state !== 'EN_ROUTE' && transport.state !== 'ARRIVED' && (
            <p className="mt-3 text-[11px] leading-relaxed text-msafe-warn">
              No driver has accepted this request. This is not a secured ride.
            </p>
          )}
        </>
      )}
    </MSafeCard>
  );
}