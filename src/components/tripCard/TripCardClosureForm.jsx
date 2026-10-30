import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldQuestion, Loader2, AlertTriangle } from 'lucide-react';

const REASONS = [
  { code: 'traveller_confirmed_well', label: 'Traveller confirmed safe by phone' },
  { code: 'guardian_confirmed_no_emergency', label: 'Guardian confirmed no emergency' },
  { code: 'card_misunderstood', label: 'Card tapped without understanding it' },
  { code: 'accidental_tap', label: 'Accidental tap by a bystander' },
  { code: 'issue_already_handled', label: 'Issue already being handled elsewhere' },
];

function localInput(value) {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * TripCardClosureForm — closing a live request as a false alarm.
 *
 * Three answers are required, and none of them is "I couldn't reach anyone".
 * A closure is a decision built on an actual conversation, and it carries a
 * reason code, because a false alarm is usually a card the traveller did not
 * understand — which is a card you can fix.
 */
export default function TripCardClosureForm({ card, onClosed }) {
  const [contactParty, setContactParty] = useState('traveller');
  const [contactMethod, setContactMethod] = useState('call');
  const [contactAt, setContactAt] = useState(localInput());
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (card.request_state !== 'open') return null;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('closeTripFalseAlarm', {
        card_id: card.id,
        contact_party: contactParty,
        contact_method: contactMethod,
        contact_at: new Date(contactAt).toISOString(),
        reason_code: reasonCode,
        notes: notes || null,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      onClosed?.(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'The request could not be closed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldQuestion className="w-4 h-4 text-primary" /> Close as a false alarm
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Only after you have actually spoken to the traveller or the guardian. If you cannot reach either, do not
        close — the request stays open and dispatch holds at one live offer.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Spoke to</span>
          <select
            value={contactParty}
            onChange={(e) => setContactParty(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="traveller">The traveller</option>
            <option value="guardian">The guardian</option>
          </select>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">How</span>
          <select
            value={contactMethod}
            onChange={(e) => setContactMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="call">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_person">In person</option>
          </select>
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">When</span>
          <input
            type="datetime-local"
            value={contactAt}
            onChange={(e) => setContactAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Reason</span>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a reason…</option>
            {REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">What actually happened</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Kept with the near-miss record."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!reasonCode || busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Close as false alarm
      </button>
      <p className="mt-2 text-[10.5px] text-muted-foreground">
        A live or en-route driver is recalled and the assignment fee is recorded against them for payout.
      </p>
    </div>
  );
}