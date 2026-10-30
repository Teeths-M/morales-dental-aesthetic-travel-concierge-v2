import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { IdCard, Printer, Hand } from 'lucide-react';
import TripCardReadinessCheck from './TripCardReadinessCheck';
import TripCardHandoverForm from './TripCardHandoverForm';

/**
 * TripCardSetSection — the care team's view of one trip's cards.
 *
 * Deliberately opens with readiness, because the moment this matters is the moment
 * someone is on the phone taking the call, and the only question then is whether
 * there is a card with the traveller.
 */
export default function TripCardSetSection({ tripCardId }) {
  const [set, setSet] = useState(null);
  const [handovers, setHandovers] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('getTripCardSet', { trip_card_id: tripCardId });
      const data = res?.data || res;
      setSet(data?.enabled && data?.card ? data : null);
      const rows = await base44.entities.TripCardHandover
        .filter({ trip_card_id: tripCardId }, '-handed_over_at', 10).catch(() => []);
      setHandovers(rows || []);
    } catch {
      setSet(null);
    }
  };

  useEffect(() => { if (tripCardId) load(); }, [tripCardId]);

  const download = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('tripCardPdf', { trip_card_id: tripCardId });
      const data = res?.data || res;
      if (data?.pdf_url) window.open(data.pdf_url, '_blank', 'noopener');
    } finally {
      setBusy(false);
    }
  };

  if (!set) return null;

  const printInstruction =
    'Keep one card in the bag you carry out of the room, and one on the bedside table where anyone walking in would see it. Never the room safe or your suitcase.';

  return (
    <div className="mt-5 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Before departure</p>

      <TripCardReadinessCheck
        acknowledged={set.printed_acknowledged}
        acknowledgedAt={set.printed_acknowledged_at}
        readinessDueAt={set.readiness_due_at}
        notifiedAt={set.readiness_notified_at}
      />

      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
            <IdCard className="h-3.5 w-3.5 text-primary" />
            Cards on this trip
          </p>
          <button
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground disabled:opacity-50"
          >
            <Printer className="h-3 w-3" /> Print sheet
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {(set.instances || []).map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5">
              <span className="font-mono text-[11.5px] font-semibold text-foreground">{i.short_ref}</span>
              <span className="text-[10.5px] text-muted-foreground">
                {i.status === 'active'
                  ? i.reported_lost_at ? 'live · reported lost' : i.handed_over_at ? 'live · handed over' : 'live'
                  : `revoked${i.revoked_reason ? ` (${String(i.revoked_reason).replace(/_/g, ' ')})` : ''}`}
              </span>
            </div>
          ))}
          {!set.instances?.length && (
            <p className="text-[11px] text-muted-foreground">No live cards on this trip.</p>
          )}
        </div>

        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">{printInstruction}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
          <Hand className="h-3.5 w-3.5 text-primary" /> Handovers
        </p>
        {handovers.length === 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">No physical handover recorded.</p>
        ) : (
          <div className="mt-1.5 space-y-1">
            {handovers.map((h) => (
              <p key={h.id} className="text-[11px] text-foreground">
                {h.partner_name} <span className="text-muted-foreground">({String(h.partner_type || '').replace(/_/g, ' ')})</span>{' '}
                · {new Date(h.handed_over_at).toLocaleString()}
              </p>
            ))}
          </div>
        )}
        <div className="mt-2">
          <TripCardHandoverForm tripCardId={tripCardId} onRecorded={load} />
        </div>
      </div>
    </div>
  );
}