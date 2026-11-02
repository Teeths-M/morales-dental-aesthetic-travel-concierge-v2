import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GOLD, deriveStatus, formatMinor } from '@/lib/partnerPricing';

const FILTERS = [
  { key: 'all', label: 'All offers' },
  { key: 'current', label: 'Current' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'stale', label: 'Needs reconfirmation' },
  { key: 'expired', label: 'Expired' },
  { key: 'requests', label: 'Quote requests' },
];

/**
 * AdminPartnerPricing — oversight of the commercial catalogue.
 *
 * Read-mostly by design. An administrator can pause a listing, reinstate it
 * after review, or record a note with a reason — and every one of those is
 * written as an immutable version row naming who did it. There is no control
 * here that changes a partner's price: the number on the record stays the
 * partner's own statement.
 */
export default function AdminPartnerPricing() {
  const [cards, setCards] = useState([]);
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [cardRows, serviceRows, requestRows] = await Promise.all([
        base44.entities.PartnerRateCard.filter({}, '-last_updated_at', 300).catch(() => []),
        base44.entities.PartnerService.filter({}, '-created_at', 300).catch(() => []),
        base44.entities.PartnerQuoteRequest.filter({}, '-created_date', 200).catch(() => []),
      ]);
      setCards(cardRows || []);
      setServices(serviceRows || []);
      setRequests(requestRows || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enriched = useMemo(() => cards.map((card) => ({
    ...card,
    derived: deriveStatus(card),
    service: services.find((s) => s.id === card.service_id),
  })), [cards, services]);

  const visible = useMemo(() => {
    if (filter === 'current') return enriched.filter((c) => c.derived === 'CURRENT_PARTNER_CONFIRMED');
    if (filter === 'submitted') return enriched.filter((c) => c.derived === 'PARTNER_SUBMITTED');
    if (filter === 'stale') return enriched.filter((c) => c.derived === 'STALE');
    if (filter === 'expired') return enriched.filter((c) => c.derived === 'EXPIRED');
    return enriched;
  }, [filter, enriched]);

  const summarise = useMemo(() => ({
    current: enriched.filter((c) => c.derived === 'CURRENT_PARTNER_CONFIRMED').length,
    stale: enriched.filter((c) => c.derived === 'STALE').length,
    expired: enriched.filter((c) => c.derived === 'EXPIRED').length,
    pendingRequests: requests.filter((r) => ['PREPARED', 'SENT', 'ACKNOWLEDGED'].includes(r.state)).length,
    failedRequests: requests.filter((r) => r.state === 'FAILED').length,
  }), [enriched, requests]);

  const moderate = async (action, card) => {
    const reason = window.prompt('Reason for this action (recorded in the audit trail):');
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await base44.functions.invoke('adminPartnerPricing', {
        action,
        rate_card_id: card.id,
        reason: reason.trim(),
      });
      if (result.data?.error) throw new Error(result.data.error);
      setNotice('Recorded.');
      await load();
    } catch (e) {
      setNotice(e?.response?.data?.error || e?.message || 'That action could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
          Partner pricing overview
        </p>
        <h1 className="mt-1 font-display text-2xl text-foreground">Commercial catalogue oversight</h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-muted-foreground">
          What partners have published, what still needs reconfirmation, and where a traveller is waiting
          on an answer. Prices are never edited here.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: 'Current prices', value: summarise.current },
            { label: 'Need reconfirmation', value: summarise.stale },
            { label: 'Expired', value: summarise.expired },
            { label: 'Open requests', value: summarise.pendingRequests },
            { label: 'Undelivered', value: summarise.failedRequests },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-[18px] font-semibold leading-none text-foreground">{stat.value}</p>
              <p className="mt-1 text-[10.5px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-medium ${
                filter === item.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {notice && (
          <p className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-[11.5px] text-muted-foreground">{notice}</p>
        )}

        <div className="mt-4 space-y-2">
          {filter === 'requests' ? (
            requests.length === 0 ? (
              <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">No quote requests recorded.</p>
            ) : requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground">
                    {request.request_ref} · {request.partner_email}
                  </p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{request.state}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  Traveller: {request.traveler_email}
                  {request.quoted_amount_minor ? ` · quoted ${formatMinor(request.quoted_amount_minor, request.quoted_currency)}` : ''}
                  {request.failure_detail ? ` · ${request.failure_detail}` : ''}
                </p>
              </div>
            ))
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">Nothing in this view.</p>
          ) : visible.map((card) => (
            <div key={card.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{card.service_name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {card.partner_display_name || card.partner_email} · {String(card.category || '').replace(/_/g, ' ')}
                    {card.amount_minor !== null && card.amount_minor !== undefined
                      ? ` · ${formatMinor(card.amount_minor, card.currency)} ${String(card.pricing_unit || '').replace(/_/g, ' ')}`
                      : ' · quote required'}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {card.derived}
                  {card.status === 'paused' ? ' · paused' : ''}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => moderate(card.status === 'paused' ? 'reinstate_offer' : 'pause_offer', card)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground disabled:opacity-50"
                >
                  {card.status === 'paused' ? 'Reinstate' : 'Pause listing'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => moderate('record_note', card)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground disabled:opacity-50"
                >
                  Record note
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Credential verification, price freshness and availability are three separate facts. A partner whose
          credentials are verified can still be quoting a price that needs reconfirmation.
        </p>
      </div>
    </div>
  );
}