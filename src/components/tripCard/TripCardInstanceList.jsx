import React, { useState } from 'react';
import { IdCard, AlertTriangle } from 'lucide-react';

/**
 * TripCardInstanceList — the cards this trip actually holds.
 *
 * Reporting one lost or stolen has to name WHICH card: there are two, they look
 * identical, and a mis-tap revokes the one still in their bag. So the traveller
 * picks a row, then picks the event. Lost and stolen are deliberately not the
 * same button — a dropped card is usually the product working, a stolen one is
 * a card in a stranger's hand.
 */
export default function TripCardInstanceList({ instances, busy, onReport }) {
  const [openId, setOpenId] = useState(null);

  if (!instances?.length) return null;

  return (
    <div className="space-y-1.5">
      {instances.map((inst) => {
        const revoked = inst.status !== 'active';
        const open = openId === inst.id;

        return (
          <div
            key={inst.id}
            className={
              revoked
                ? 'rounded-xl border border-border bg-secondary/40 px-3 py-2.5'
                : 'rounded-xl border border-border bg-background px-3 py-2.5'
            }
          >
            <div className="flex items-center gap-2.5">
              <IdCard className={revoked ? 'h-4 w-4 shrink-0 text-muted-foreground' : 'h-4 w-4 shrink-0 text-primary'} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] font-semibold tracking-wide text-foreground">
                  {inst.short_ref}
                </p>
                <p className="text-[10.5px] text-muted-foreground">
                  {revoked
                    ? inst.revoked_reason === 'reported_stolen'
                      ? 'Revoked — reported stolen'
                      : 'Revoked'
                    : inst.reported_lost_at
                      ? 'Still live · you reported it lost'
                      : 'Live'}
                </p>
              </div>
              {!revoked && (
                <button
                  onClick={() => setOpenId(open ? null : inst.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {open ? 'Cancel' : 'Lost or stolen?'}
                </button>
              )}
            </div>

            {open && (
              <div className="mt-2.5 border-t border-border pt-2.5">
                <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  Pick the event for card {inst.short_ref} only. Your other card is not touched.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { setOpenId(null); onReport(inst, 'lost'); }}
                    disabled={busy}
                    className="rounded-lg border border-border px-2 py-2 text-[11.5px] font-semibold text-foreground disabled:opacity-50"
                  >
                    I lost it
                  </button>
                  <button
                    onClick={() => { setOpenId(null); onReport(inst, 'stolen'); }}
                    disabled={busy}
                    className="rounded-lg border border-destructive/40 bg-destructive/5 px-2 py-2 text-[11.5px] font-semibold text-destructive disabled:opacity-50"
                  >
                    It was stolen
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  Lost issues a replacement and leaves this one working. Stolen revokes it and issues a
                  replacement.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}