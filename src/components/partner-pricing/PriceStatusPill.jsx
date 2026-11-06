import React from 'react';

/**
 * PriceStatusPill — one pill for the price's freshness and one for availability.
 *
 * These are deliberately two separate pills, never merged into one "status".
 * A price can be current while the service is unavailable, and a verified
 * partner can have a stale price. Collapsing the two is how a screen starts
 * implying something the record does not say.
 *
 * Colours are literal class strings so Tailwind keeps them.
 */

const PRICING = {
  CURRENT_PARTNER_CONFIRMED: {
    label: 'Price confirmed',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  PARTNER_SUBMITTED: {
    label: 'Partner submitted',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  STALE: {
    label: 'Needs reconfirmation',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  QUOTE_REQUESTED: {
    label: 'Quote requested',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  QUOTE_CONFIRMED: {
    label: 'Quote confirmed',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: 'bg-white/5 text-white/50 border-white/10',
  },
};

const AVAILABILITY = {
  available: { label: 'Available', className: 'text-emerald-300' },
  limited: { label: 'Limited', className: 'text-amber-300' },
  requires_confirmation: { label: 'Availability unconfirmed', className: 'text-sky-300' },
  unavailable: { label: 'Unavailable', className: 'text-rose-300' },
  unknown: { label: 'Availability unknown', className: 'text-white/45' },
};

export function PricingStatusPill({ status }) {
  const config = PRICING[status] || PRICING.WITHDRAWN;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function AvailabilityLabel({ status }) {
  const config = AVAILABILITY[status] || AVAILABILITY.unknown;
  return (
    <span className={`text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}