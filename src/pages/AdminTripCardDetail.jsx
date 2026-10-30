import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BackButton } from '@/components/nav/BackButton';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import TripCardDestinations from '@/components/tripCard/TripCardDestinations';
import TripCardClosureForm from '@/components/tripCard/TripCardClosureForm';
import TripCardOffers from '@/components/tripCard/TripCardOffers';
import { CheckCircle2, ScanLine, History, AlertTriangle } from 'lucide-react';

const STATE_LABEL = {
  none: 'Card issued — not used',
  open: 'LIVE REQUEST',
  closed_false_alarm: 'Closed — false alarm',
  resolved: 'Closed',
};

export default function AdminTripCardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [incident, setIncident] = useState(null);
  const [offers, setOffers] = useState([]);
  const [scans, setScans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const rows = await base44.entities.TripEmergencyCard.filter({ id }, '-created_date', 1);
      const row = (rows || [])[0];
      if (!row) throw new Error('Card not found.');
      setCard(row);

      const [scanRows] = await Promise.all([
        base44.entities.TripEmergencyScan.filter({ card_id: row.id }, '-at', 40).catch(() => []),
      ]);
      setScans(scanRows || []);

      if (row.open_incident_id) {
        const found = await base44.entities.Incident.filter({ id: row.open_incident_id }, '-created_date', 1).catch(() => []);
        const inc = (found || [])[0] || null;
        setIncident(inc);

        const [offerRows, auditRows] = await Promise.all([
          base44.entities.DispatchOffer.filter({ incident_id: row.open_incident_id }, 'attempt_number', 25).catch(() => []),
          base44.entities.IncidentAuditEvent.filter({ incident_id: row.open_incident_id }, '-sequence', 60).catch(() => []),
        ]);
        setOffers(offerRows || []);
        setAudit(auditRows || []);
      }
    } catch (e) {
      setError(e?.message || 'Could not load this card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const confirmDestination = async (basis) => {
    setActionError('');
    setBusy(true);
    try {
      const res = await base44.functions.invoke('confirmTripDestination', { card_id: card.id, basis });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      await load();
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.message || 'Could not confirm the destination.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState dark={false} label="Loading card" />;
  if (error) return <ErrorState dark={false} title="Trip card" message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <BackButton fallback="/admin/trip-cards" label="Trip cards" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{card.patient_first_name}</h1>
        <span
          className={
            card.request_state === 'open'
              ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive'
              : 'rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
          }
        >
          {STATE_LABEL[card.request_state] || card.request_state}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.request_ref ? `Ref ${card.request_ref} · ` : ''}
        {card.country_code} · {String(card.language || '').toUpperCase()} · {card.emergency_number} · expires{' '}
        {card.expires_at ? new Date(card.expires_at).toLocaleString() : '—'}
      </p>

      {card.request_state === 'open' && (
        <div className="mt-5">
          <TripCardDestinations
            card={card}
            busy={busy}
            error={actionError}
            onConfirm={confirmDestination}
          />
        </div>
      )}

      {card.request_state === 'open' && (
        <div className="mt-5">
          <TripCardClosureForm card={card} onClosed={() => load()} />
        </div>
      )}

      {card.request_state === 'closed_false_alarm' && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="w-4 h-4 text-accent" /> Near-miss record
          </div>
          <p className="mt-1 text-xs text-foreground">
            {card.closure_reason_code?.replace(/_/g, ' ')}
          </p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Spoke to the {card.closure_contact_party} by {String(card.closure_contact_method || '').replace(/_/g, ' ')} on{' '}
            {card.closure_contact_at ? new Date(card.closure_contact_at).toLocaleString() : '—'}
            {card.closed_by ? ` · closed by ${card.closed_by}` : ''}
          </p>
          {card.closure_notes && <p className="mt-2 text-xs text-foreground">{card.closure_notes}</p>}
          <p className="mt-2 text-[10.5px] text-muted-foreground">
            A false alarm is the card working badly, not nothing. It is kept so the card can be fixed.
          </p>
        </div>
      )}

      {incident && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Dispatch</p>
          <TripCardOffers offers={offers} />
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <ScanLine className="w-3.5 h-3.5" /> Scan trail
        </p>
        {scans.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            No scans yet.
          </p>
        ) : (
          <div className="space-y-1">
            {scans.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span className="text-[11.5px] text-foreground">
                  <span className="font-semibold">{s.kind.replace(/_/g, ' ')}</span>
                  {s.outcome ? ` — ${s.outcome}` : ''}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                  {new Date(s.at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1.5 px-1 text-[10.5px] text-muted-foreground">
          Scan rows hold no IP address and no device identifier, and are deleted 24 hours after they are written.
        </p>
      </div>

      {audit.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <History className="w-3.5 h-3.5" /> Audit trail
          </p>
          <div className="space-y-1">
            {audit.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11.5px] text-foreground">
                    <span className="font-semibold">{a.subject_type}</span> {a.from_state || '—'} → {a.to_state}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {a.actor} · {a.actor_type}
                  {a.evidence?.action ? ` · ${String(a.evidence.action).replace(/_/g, ' ')}` : ''}
                  {a.evidence?.reason_code ? ` · ${String(a.evidence.reason_code).replace(/_/g, ' ')}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {card.request_state === 'none' && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 w-3.5 h-3.5 shrink-0 text-primary" />
          This card has been issued and is live. It opens a request the first time a bystander taps.
        </p>
      )}
    </div>
  );
}