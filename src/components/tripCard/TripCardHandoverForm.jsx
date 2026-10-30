import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Hand, Loader2 } from 'lucide-react';

const TYPES = [
  { value: 'travel_agency', label: 'Travel agency' },
  { value: 'taxi_service', label: 'Driver / taxi service' },
  { value: 'companion', label: 'Companion' },
  { value: 'security_agency', label: 'Security agency' },
  { value: 'care_team', label: 'Care team' },
  { value: 'other', label: 'Other' },
];

/**
 * TripCardHandoverForm — a card physically changing hands.
 *
 * The one partner-side card event with a reason to exist, and it is scoped to the
 * handover rather than the printed status: it records that a human put a card in
 * the traveller's hand, not whether the traveller printed one themselves.
 */
export default function TripCardHandoverForm({ tripCardId, onRecorded }) {
  const [open, setOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState('travel_agency');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('recordTripCardHandover', {
        trip_card_id: tripCardId,
        partner_name: partnerName,
        partner_type: partnerType,
        note: note || null,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      setOpen(false);
      setPartnerName('');
      setNote('');
      onRecorded?.(data.handover);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not record the handover.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-secondary"
      >
        <Hand className="h-3.5 w-3.5" /> Record a card handover
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[11.5px] font-semibold text-foreground">Card handed over in person</p>
      <p className="mt-0.5 text-[10.5px] text-muted-foreground">
        Use this when a human physically gave the traveller a card. It is not the printed status.
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          placeholder="Who handed it over"
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px]"
        />
        <select
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value)}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px]"
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px]"
      />

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}

      <div className="mt-2 flex gap-2">
        <button
          onClick={submit}
          disabled={!partnerName.trim() || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} Record
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}