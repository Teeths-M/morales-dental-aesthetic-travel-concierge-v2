import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/**
 * TripCardReadinessCheck — the care team's pre-departure fact.
 *
 * Not a log line. This is the thing a person needs at the moment they are taking
 * the call: whether there is paper in this traveller's pocket, so they know whether
 * to ask "is there a card with you". Printed status never reaches trip partners,
 * so it lives here and on the traveller's own screen, and nowhere else.
 */
export default function TripCardReadinessCheck({
  acknowledged,
  acknowledgedAt,
  readinessDueAt,
  notifiedAt,
}) {
  const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');
  const due = readinessDueAt ? new Date(readinessDueAt).getTime() : null;
  const chased = !!notifiedAt && due !== null && due <= Date.now();

  if (acknowledged) {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Paper confirmed
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
          The traveller confirmed they printed and packed their cards on {fmt(acknowledgedAt)}.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        chased
          ? 'rounded-xl border border-destructive/40 bg-destructive/5 p-3.5'
          : 'rounded-xl border border-accent/40 bg-accent/5 p-3.5'
      }
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        {chased ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Clock className="h-4 w-4 text-accent" />
        )}
        Not confirmed — no evidence of a printed card
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-foreground">
        On the call, ask: <span className="font-semibold">“Is there a card with you?”</span> If not, they are
        relying on their phone, and the phone is the thing that dies or gets lost.
      </p>
      <p className="mt-1.5 text-[10.5px] text-muted-foreground">
        {chased
          ? `Reminder sent ${fmt(notifiedAt)} · readiness was due ${fmt(readinessDueAt)}`
          : readinessDueAt
            ? `Chased at ${fmt(readinessDueAt)} (72 hours before the first flight) if still unfinished.`
            : 'No flight date on this trip yet, so no reminder is scheduled.'}
      </p>
    </div>
  );
}