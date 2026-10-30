import React from 'react';
import { MapPin, UserRound, Clock, CheckCircle2 } from 'lucide-react';

/**
 * TripCardDestinations — the two reported addresses, side by side.
 *
 * They routinely disagree: a stranger is standing somewhere, and the trip's
 * last confirmed position says somewhere else. Neither is right by default.
 * The care team picks one, knowing who reported each and when — and the driver
 * is then given both, labelled, so he can reconcile them on arrival.
 */
export default function TripCardDestinations({ card, onConfirm, busy, error }) {
  const candidates = [];
  if (card.bystander_location_source === 'gps' && card.bystander_latitude != null) {
    candidates.push({
      basis: 'bystander_location',
      title: 'Reported by the bystander',
      detail: `${Number(card.bystander_latitude).toFixed(5)}, ${Number(card.bystander_longitude).toFixed(5)}`,
      at: card.bystander_location_at,
      hasCoords: true,
    });
  } else if (card.bystander_location_source === 'address' && card.bystander_address) {
    candidates.push({
      basis: 'bystander_location',
      title: 'Reported by the bystander',
      detail: card.bystander_address,
      at: card.bystander_location_at,
      hasCoords: false,
    });
  }
  if (card.traveller_latitude != null) {
    candidates.push({
      basis: 'traveller_location',
      title: 'Last confirmed trip location',
      detail: `${card.traveller_location_label || 'On file'} · ${Number(card.traveller_latitude).toFixed(5)}, ${Number(card.traveller_longitude).toFixed(5)}`,
      at: card.traveller_location_at,
      hasCoords: true,
    });
  }

  if (card.destination_state === 'confirmed') {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" /> Destination confirmed
        </div>
        <p className="mt-1 text-xs text-foreground">{card.destination_label}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Basis: {card.destination_basis?.replace(/_/g, ' ')} · {card.destination_confirmed_by} ·{' '}
          {card.destination_confirmed_at ? new Date(card.destination_confirmed_at).toLocaleString() : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Where is the driver sent?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Dispatch holds until a human picks. Both reports go to the driver, each labelled with who reported it.
      </p>

      {candidates.length === 0 && (
        <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Neither the bystander nor the trip record produced an address. Dispatch needs coordinates so the driver's
          arrival can be validated — ask the caller for a landmark and enter it below.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {candidates.map((c) => (
          <button
            key={c.basis}
            onClick={() => onConfirm(c.basis)}
            disabled={busy || !c.hasCoords}
            className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left hover:border-primary/50 disabled:opacity-50"
          >
            <MapPin className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{c.title}</span>
              <span className="mt-0.5 block break-words text-[11.5px] text-foreground">{c.detail}</span>
              <span className="mt-1 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <UserRound className="w-3 h-3" />
                {c.basis === 'bystander_location' ? 'bystander' : 'traveller record'}
                {c.at && (
                  <>
                    <Clock className="ml-1 w-3 h-3" />
                    {new Date(c.at).toLocaleString()}
                  </>
                )}
              </span>
              {!c.hasCoords && (
                <span className="mt-1 block text-[10.5px] text-destructive">
                  Text only — no coordinates to validate an arrival against.
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}