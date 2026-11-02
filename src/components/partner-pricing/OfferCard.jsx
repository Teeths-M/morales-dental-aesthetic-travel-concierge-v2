import React from 'react';
import { Clock, MapPin, Package } from 'lucide-react';
import { AvailabilityLabel, PricingStatusPill } from '@/components/partner-pricing/PriceStatusPill';

const GOLD = '#D4AF37';

const UNIT_LABEL = {
  fixed: 'total',
  per_person: 'per person',
  per_night: 'per night',
  per_trip: 'per trip',
  per_hour: 'per hour',
  per_day: 'per day',
  per_vehicle: 'per vehicle',
  per_package: 'per package',
  starting_from: 'starting from',
  quote_required: 'quote required',
};

function formatMinor(amountMinor, currency) {
  if (amountMinor === null || amountMinor === undefined) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * OfferCard — one rate card as the partner sees it.
 *
 * The price is shown with the unit it is actually charged in, and a
 * "starting from" price is never presented as a total. Inclusions and
 * exclusions are listed rather than summarised, because those are the terms a
 * traveller ends up comparing.
 */
export default function OfferCard({ offer, onAction, busy }) {
  const price = formatMinor(offer.amount_minor, offer.currency);
  const unit = UNIT_LABEL[offer.pricing_unit] || 'total';
  const isQuoteOnly = offer.pricing_unit === 'quote_required';
  const needsConfirmation = ['STALE', 'PARTNER_SUBMITTED'].includes(offer.pricing_status);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: '#0C1A1D', borderColor: 'rgba(212,175,55,0.16)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {offer.is_package && <Package className="h-3.5 w-3.5 flex-shrink-0" style={{ color: GOLD }} aria-hidden="true" />}
            <h3 className="truncate text-[14px] font-semibold text-white">{offer.service_name}</h3>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {offer.location_label || offer.country || 'Location not set'}
            </span>
            <span className="capitalize">{String(offer.category || '').replace(/_/g, ' ')}</span>
          </p>
        </div>
        <PricingStatusPill status={offer.pricing_status} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[20px] font-semibold leading-none text-white">
            {isQuoteOnly ? 'Quote on request' : (price || 'Price not set')}
          </p>
          <p className="mt-1 text-[11px] text-white/40">
            {isQuoteOnly ? 'Priced for each request' : `${unit} · ${offer.currency}`}
          </p>
        </div>
        <AvailabilityLabel status={offer.availability_status} />
      </div>

      {(offer.inclusions?.length > 0 || offer.exclusions?.length > 0) && (
        <div className="mt-3 space-y-1.5 border-t pt-3 text-[11.5px]" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {offer.inclusions?.length > 0 && (
            <p className="text-white/60">
              <span className="text-emerald-300">Included:</span> {offer.inclusions.join(', ')}
            </p>
          )}
          {offer.exclusions?.length > 0 && (
            <p className="text-white/55">
              <span className="text-rose-300">Not included:</span> {offer.exclusions.join(', ')}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-white/35">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {offer.valid_until ? `Valid until ${offer.valid_until}` : 'No end date set'}
        {offer.last_confirmed_at ? ` · confirmed ${offer.last_confirmed_at}` : ' · not confirmed yet'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {needsConfirmation && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction?.('confirm', offer)}
            className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
            style={{ background: GOLD, color: '#060B16' }}
          >
            Still accurate
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction?.('edit', offer)}
          className="rounded-lg border px-3 py-1.5 text-[11.5px] font-medium text-white/75 disabled:opacity-50"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
        >
          Update price
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction?.('pause', offer)}
          className="rounded-lg border px-3 py-1.5 text-[11.5px] font-medium text-white/75 disabled:opacity-50"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
        >
          {offer.status === 'paused' ? 'Resume offer' : 'Pause offer'}
        </button>
      </div>
    </div>
  );
}