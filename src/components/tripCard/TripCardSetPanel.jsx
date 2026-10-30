import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { IdCard, Printer, ShieldCheck, Loader2 } from 'lucide-react';
import TripCardAckItem from './TripCardAckItem';
import TripCardInstanceList from './TripCardInstanceList';
import TripCardReplacementNotice from './TripCardReplacementNotice';
import { PRINT_INSTRUCTION } from '@/lib/tripCardFace';

/**
 * TripCardSetPanel — the traveller's side of the printed card set.
 *
 * Lives on the trip screen, not in a settings page: this is where a traveller
 * looks before they fly. It shows the unfinished print acknowledgement first,
 * because that is the only unfinished thing here that matters, then the cards,
 * then the one action that actually produces paper.
 *
 * It renders nothing at all when the module is off or this trip has no set —
 * a disabled safety module should be absent, not a broken-looking box.
 */
export default function TripCardSetPanel() {
  const [set, setSet] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [replacement, setReplacement] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('getTripCardSet', {});
      const data = res?.data || res;
      setSet(data?.enabled && data?.card ? data : null);
    } catch {
      setSet(null);
    }
  };

  useEffect(() => { load(); }, []);

  const acknowledge = async () => {
    setError('');
    setBusy('ack');
    try {
      const res = await base44.functions.invoke('acknowledgeTripCardPrinted', { trip_card_id: set.card.id });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not save that.');
    } finally {
      setBusy('');
    }
  };

  const download = async () => {
    setError('');
    setBusy('pdf');
    try {
      const res = await base44.functions.invoke('tripCardPdf', { trip_card_id: set.card.id });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      if (data?.pdf_url) window.open(data.pdf_url, '_blank', 'noopener');
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not prepare the PDF.');
    } finally {
      setBusy('');
    }
  };

  const report = async (instance, action) => {
    setError('');
    setBusy('report');
    try {
      const res = await base44.functions.invoke('reportTripCardLostStolen', {
        trip_card_id: set.card.id,
        instance_id: instance.id,
        action,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setReplacement({ ...data.replacement, action });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not issue a replacement.');
    } finally {
      setBusy('');
    }
  };

  if (!set) return null;

  const active = (set.instances || []).filter((i) => i.status === 'active');

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <IdCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Emergency card</h3>
            <p className="text-[11.5px] text-muted-foreground">
              {active.length} card{active.length === 1 ? '' : 's'} live · call {set.card.emergency_number} from{' '}
              {set.card.country_name || set.card.country_code}
            </p>
          </div>
        </div>
        {set.printed_acknowledged && <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />}
      </div>

      <div className="mt-4 space-y-3">
        <TripCardAckItem
          acknowledged={set.printed_acknowledged}
          acknowledgedAt={set.printed_acknowledged_at}
          busy={busy === 'ack'}
          onAcknowledge={acknowledge}
        />

        <TripCardInstanceList instances={set.instances} busy={busy === 'report'} onReport={report} />

        <TripCardReplacementNotice
          replacement={replacement}
          whatsappNumber={set.card.local_whatsapp_number}
        />

        {error && <p className="text-[11.5px] font-medium text-destructive">{error}</p>}

        <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Where they go
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground">{PRINT_INSTRUCTION}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={download}
            disabled={busy === 'pdf'}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[12.5px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            Print the cards
          </button>
          {set.can_reissue_later && (
            <span className="self-center text-[10.5px] text-muted-foreground">
              Card size and A6, two copies.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}