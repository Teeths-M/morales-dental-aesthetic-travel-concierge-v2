import React from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';

/**
 * TripCardAckItem — the one unfinished item on the trip screen.
 *
 * Boardy was blunt about why this exists: nothing in the card set knows whether
 * anyone actually printed it, and a perfect card sitting unread in an email is
 * the same as no card. This is the only evidence the safety layer is in a pocket,
 * so it sits as a task, not a fact you scroll past.
 */
export default function TripCardAckItem({ acknowledged, acknowledgedAt, busy, onAcknowledge }) {
  if (acknowledged) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">Printed and packed</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            You confirmed this
            {acknowledgedAt ? ` on ${new Date(acknowledgedAt).toLocaleDateString()}` : ''}. Your care team can
            see it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5">
      <div className="flex items-start gap-2">
        <Printer className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Not finished — print your card</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Two cards, one sheet. Print it before you fly, then confirm below so your care team knows
            you are carrying paper if the call comes.
          </p>
        </div>
      </div>
      <button
        onClick={onAcknowledge}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-accent px-3 py-2.5 text-[12.5px] font-semibold text-accent-foreground disabled:opacity-50"
      >
        {busy ? 'Saving…' : "I've printed and packed my card"}
      </button>
    </div>
  );
}