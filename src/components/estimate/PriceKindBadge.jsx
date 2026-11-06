import React from 'react';

/**
 * The one place a price is described in words.
 *
 * These labels exist because the blueprint forbids letting a traveller mistake
 * a "from" price or a partner's unconfirmed figure for a firm total.
 */

const TONES = {
  confirmed: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.45)', text: '#4ADE80' },
  pending: { bg: 'rgba(242,181,68,0.12)', border: 'rgba(242,181,68,0.45)', text: '#F2B544' },
  none: { bg: 'rgba(154,166,178,0.12)', border: 'rgba(154,166,178,0.4)', text: '#9AA6B2' },
};

function toneFor(line) {
  if (line.status === 'not_selected') return TONES.none;
  if (line.price_kind === 'quote_required' || line.status === 'quote_required') return TONES.none;
  if (line.price_kind === 'starting_from') return TONES.pending;
  if (line.pricing_status === 'CURRENT_PARTNER_CONFIRMED') return TONES.confirmed;
  if (line.pricing_status === 'PARTNER_SUBMITTED' || line.status === 'partly_priced') return TONES.pending;
  if (line.status === 'mixed_currency') return TONES.pending;
  return TONES.none;
}

function labelFor(line) {
  if (line.status === 'not_selected') return 'Not yet available';
  if (line.status === 'quote_required' || line.price_kind === 'quote_required') return 'Quote required';
  if (line.price_kind === 'starting_from') return 'From';
  if (line.pricing_status === 'CURRENT_PARTNER_CONFIRMED') return 'Partner-confirmed';
  if (line.pricing_status === 'PARTNER_SUBMITTED') return 'Submitted — not reconfirmed';
  if (line.status === 'partly_priced') return 'Partly priced';
  if (line.status === 'mixed_currency') return 'Mixed currency';
  return 'Listed';
}

export default function PriceKindBadge({ line }) {
  const tone = toneFor(line);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
      }}
    >
      {labelFor(line)}
    </span>
  );
}