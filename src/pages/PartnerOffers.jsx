import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { GOLD, UNIT_LABELS, formatMinor } from '@/lib/partnerPricing';

const STATE_LABEL = {
  PREPARED: 'Prepared',
  SENT: 'Sent to partner',
  DELIVERED: 'Delivered',
  ACKNOWLEDGED: 'Partner responded',
  QUOTE_RECEIVED: 'Quote received',
  QUOTE_CONFIRMED: 'Price confirmed for your dates',
  DECLINED: 'Partner declined',
  FAILED: 'Could not be delivered',
  HUMAN_ESCALATION: 'With the care team',
  EXPIRED: 'Expired',
};

/**
 * PartnerOffers — the traveller's side of the partner network.
 *
 * Three things this screen is careful about, because the alternative is a
 * traveller who believes they have a booking:
 *  - a starting-from price is labelled as starting from, never as a total;
 *  - a price that has not been reconfirmed says so instead of looking current;
 *  - a quote request shows exactly what will be shared, and nothing is sent
 *    until the traveller ticks that they agree to those details.
 *
 * Accepting a confirmed quote opens the ordinary booking flow. It never charges.
 */
export default function PartnerOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState({ q: '', country: '' });
  const [panel, setPanel] = useState(null);
  const [details, setDetails] = useState({ travelers: 1, nights: '', note: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadRequests = useCallback(async () => {
    if (!user?.email) return;
    const result = await base44.entities.PartnerQuoteRequest
      .filter({ traveler_email: user.email }, { sort: '-created_date', limit: 30 })
      .catch(() => null);
    setRequests(result?.items || result || []);
  }, [user?.email]);

  const search = useCallback(async () => {
    setSearching(true);
    try {
      const result = await base44.functions.invoke('searchPartnerOffers', {
        query: query.q || undefined,
        country: query.country || undefined,
        include_non_current: true,
        limit: 20,
      });
      setOffers(result.data?.offers || []);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { search(); loadRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openPanel = (offer) => {
    setPanel(offer);
    setConsent(false);
    setNotice('');
    setDetails({ travelers: 1, nights: '', note: '' });
  };

  const sendRequest = async () => {
    if (!consent) return setNotice('Tick the box to confirm what will be shared.');
    setBusy(true);
    setNotice('');
    try {
      const result = await base44.functions.invoke('requestPartnerQuote', {
        action: 'create',
        rate_card_id: panel.rate_card_id,
        consent: true,
        travelers: Number(details.travelers) || 1,
        nights: details.nights ? Number(details.nights) : undefined,
        note: details.note,
        destination: panel.location_label || undefined,
        requested_services: panel.is_package ? panel.inclusions || [] : [panel.service_name],
      });
      if (result.data?.error) throw new Error(result.data.error);
      setNotice(result.data?.message || 'Request sent.');
      setPanel(null);
      await loadRequests();
    } catch (e) {
      setNotice(e?.response?.data?.error || e?.message || 'That request could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (request, decision) => {
    setBusy(true);
    try {
      const result = await base44.functions.invoke('requestPartnerQuote', {
        action: 'decide',
        request_id: request.id,
        decision,
      });
      setNotice(result.data?.message || result.data?.next_step || 'Recorded.');
      await loadRequests();
    } catch (e) {
      setNotice(e?.response?.data?.error || e?.message || 'That could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
          Morales partner network
        </p>
        <h1 className="mt-1 font-display text-2xl text-foreground">What our partners actually offer</h1>
        <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
          Prices come straight from the partner. When a price needs re-checking we say so, and we can ask
          that partner for a firm quote for your dates.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <input
            className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            placeholder="Search, e.g. New York"
            value={query.q}
            onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value }))}
          />
          <input
            className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            placeholder="Country"
            value={query.country}
            onChange={(e) => setQuery((q) => ({ ...q, country: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => { setLoading(true); search(); }}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold"
            style={{ background: GOLD, color: '#060B16' }}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {notice && (
          <p className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-[11.5px] text-muted-foreground">{notice}</p>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-[12.5px] text-muted-foreground">Looking through the network…</p>
          ) : offers.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
              No approved partner offer matched. The care team can look further afield for you.
            </p>
          ) : offers.map((offer) => (
            <div key={offer.rate_card_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foreground">{offer.service_name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {offer.partner_display_name || 'Morales partner'}
                    {offer.location_label ? ` · ${offer.location_label}` : ''}
                    {offer.partner_is_verified ? ' · verified partner' : ''}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {offer.price_kind === 'quote_required'
                    ? 'Quote on request'
                    : offer.price_kind === 'starting_from'
                      ? 'Starting from'
                      : offer.pricing_status === 'CURRENT_PARTNER_CONFIRMED' ? 'Current price' : 'Needs reconfirming'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <p className="text-[18px] font-semibold text-foreground">
                  {offer.price_kind === 'quote_required'
                    ? 'Price on request'
                    : formatMinor(offer.amount_minor, offer.currency) || 'Price on request'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {offer.pricing_unit ? UNIT_LABELS[offer.pricing_unit] || offer.pricing_unit : ''}
                  {offer.valid_until ? ` · valid until ${offer.valid_until}` : ''}
                </p>
              </div>

              {offer.requires_reconfirmation && (
                <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700">
                  This price has not been reconfirmed recently. Ask for a firm quote before relying on it.
                </p>
              )}

              {offer.inclusions?.length > 0 && (
                <p className="mt-2 text-[11.5px] text-muted-foreground">Included: {offer.inclusions.join(', ')}</p>
              )}
              {offer.exclusions?.length > 0 && (
                <p className="mt-1 text-[11.5px] text-muted-foreground">Not included: {offer.exclusions.join(', ')}</p>
              )}
              {offer.medical_price_is_informational && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  A clinic price is information only — not medical advice, suitability, or a final treatment cost.
                </p>
              )}

              <button
                type="button"
                onClick={() => openPanel(offer)}
                className="mt-3 w-full rounded-lg py-2 text-[12.5px] font-semibold sm:w-auto sm:px-4"
                style={{ background: GOLD, color: '#060B16' }}
              >
                Request a firm quote
              </button>
            </div>
          ))}
        </div>

        <h2 className="mt-8 font-display text-lg text-foreground">My quote requests</h2>
        <div className="mt-3 space-y-2">
          {requests.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-4 text-[12.5px] text-muted-foreground">
              No requests yet.
            </p>
          ) : requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-medium text-foreground">{request.request_ref || 'Quote request'}</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {STATE_LABEL[request.state] || request.state}
                </span>
              </div>

              {request.quoted_amount_minor ? (
                <p className="mt-1 text-[12.5px] text-foreground">
                  {formatMinor(request.quoted_amount_minor, request.quoted_currency)}
                  {request.quoted_valid_until ? ` · valid until ${request.quoted_valid_until}` : ''}
                </p>
              ) : (
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {request.state === 'FAILED'
                    ? `Not delivered: ${request.failure_detail || 'reason not recorded'}`
                    : 'Waiting on the partner.'}
                </p>
              )}

              {request.state === 'QUOTE_CONFIRMED' && request.traveler_decision === 'pending' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(request, 'accepted')}
                    className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
                    style={{ background: GOLD, color: '#060B16' }}
                  >
                    Accept and continue to booking
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(request, 'declined')}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {request.traveler_decision === 'accepted' && (
                <p className="mt-1 text-[11px] text-emerald-600">
                  Accepted. Nothing has been charged — continue in the booking flow to confirm and pay.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {panel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setPanel(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
              Before we contact the partner
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-foreground">{panel.service_name}</h2>

            <div className="mt-3 space-y-2">
              <label className="block text-[11.5px] text-muted-foreground">
                Travellers
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none"
                  value={details.travelers}
                  onChange={(e) => setDetails((d) => ({ ...d, travelers: e.target.value }))}
                />
              </label>
              <label className="block text-[11.5px] text-muted-foreground">
                Nights (optional)
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none"
                  value={details.nights}
                  onChange={(e) => setDetails((d) => ({ ...d, nights: e.target.value }))}
                />
              </label>
              <label className="block text-[11.5px] text-muted-foreground">
                Note to the partner (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none"
                  value={details.note}
                  onChange={(e) => setDetails((d) => ({ ...d, note: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <p className="text-[11.5px] font-semibold text-foreground">This is what will be shared</p>
              <ul className="mt-1 space-y-0.5 text-[11.5px] text-muted-foreground">
                <li>{panel.location_label || panel.service_name}</li>
                <li>{details.travelers} traveller(s)</li>
                {details.nights ? <li>{details.nights} nights</li> : null}
                <li>{panel.is_package ? (panel.inclusions || []).join(', ') || panel.service_name : panel.service_name}</li>
                {details.note ? <li>Your note</li> : null}
              </ul>
              <p className="mt-2 text-[10.5px] text-muted-foreground">
                No medical records, diagnoses or passport details are shared for a price enquiry.
              </p>
            </div>

            <label className="mt-3 flex items-start gap-2 text-[11.5px] text-muted-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              I agree to these details being sent to this partner so they can price my request.
            </label>

            {notice && <p className="mt-2 text-[11.5px] text-rose-600">{notice}</p>}

            <button
              type="button"
              onClick={sendRequest}
              disabled={busy || !consent}
              className="mt-3 w-full rounded-lg py-2.5 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: GOLD, color: '#060B16' }}
            >
              {busy ? 'Sending…' : 'Send quote request'}
            </button>
            <button type="button" onClick={() => setPanel(null)} className="mt-2 w-full py-2 text-[12px] text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}