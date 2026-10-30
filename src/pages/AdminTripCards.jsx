import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BackButton } from '@/components/nav/BackButton';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import EmptyState from '@/components/ui-system/EmptyState';
import IssueTripCardPanel from '@/components/tripCard/IssueTripCardPanel';
import { Plus, ChevronRight, IdCard, QrCode } from 'lucide-react';

const STATE_LABEL = {
  none: 'Not used',
  open: 'LIVE',
  closed_false_alarm: 'Closed — false alarm',
  resolved: 'Closed',
};

function StateChip({ state }) {
  const live = state === 'open';
  return (
    <span
      className={
        live
          ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive'
          : 'rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
      }
    >
      {STATE_LABEL[state] || state}
    </span>
  );
}

export default function AdminTripCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showIssue, setShowIssue] = useState(false);

  const load = async () => {
    try {
      const rows = await base44.entities.TripEmergencyCard.list('-created_date', 60);
      setCards(rows || []);
    } catch (e) {
      setError(e?.message || 'Could not load trip cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState dark={false} label="Loading trip cards" />;
  if (error) return <ErrorState dark={false} title="Trip cards" message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <BackButton fallback="/admin" label="Admin" />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trip cards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two printed cards per trip, issued with the pack. A stranger scans either one and a single request
            opens for that trip.
          </p>
        </div>
        <button
          onClick={() => setShowIssue((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="w-3.5 h-3.5" /> Issue
        </button>
      </div>

      {showIssue && (
        <div className="mt-5">
          <IssueTripCardPanel onIssued={() => { setShowIssue(false); load(); }} />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {cards.length === 0 && (
          <EmptyState
            dark={false}
            icon={QrCode}
            title="No cards issued yet"
            message="Issue a card for a trip and print the QR. It stays valid until 24 hours after the trip's real end."
          />
        )}

        {cards.map((card) => (
          <Link
            key={card.id}
            to={`/admin/trip-cards/${card.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <IdCard className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{card.patient_first_name}</p>
                <StateChip state={card.request_state} />
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {card.country_code} · {String(card.language || '').toUpperCase()} ·{' '}
                {card.local_mcare_number || card.emergency_number} · expires{' '}
                {card.expires_at ? new Date(card.expires_at).toLocaleDateString() : '—'}
                {card.scan_count ? ` · ${card.scan_count} scan${card.scan_count === 1 ? '' : 's'}` : ''}
              </p>
              <p className="mt-0.5 text-[10.5px] font-medium">
                {card.printed_acknowledged ? (
                  <span className="text-primary">Card printed and packed</span>
                ) : (
                  <span className="text-accent">Printed card not confirmed</span>
                )}
                {card.issuance_blocked_reason && (
                  <span className="text-destructive"> · blocked: {String(card.issuance_blocked_reason).replace(/_/g, ' ')}</span>
                )}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}