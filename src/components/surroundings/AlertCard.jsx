import React from 'react';
import { ExternalLink, MapPin, Clock, Radio, Navigation, AlertTriangle } from 'lucide-react';
import LevelBadge from '@/components/surroundings/LevelBadge';

/**
 * AlertCard — one thing happening near the traveller.
 *
 * Every card answers the same questions in the same order, because in a hurry
 * the order is the design: how serious, what happened, where relative to me,
 * how current, who says so, and what to do. The source block is not a footnote;
 * it is a first-class part of the card, and an unverified report says so in
 * words rather than in a muted colour the eye skips.
 */
function Row({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 shrink-0 mt-[3px]" style={{ color: 'rgba(255,255,255,0.28)' }} />
      <div className="min-w-0">
        <p className="text-[9.5px] uppercase font-semibold" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.13em' }}>
          {label}
        </p>
        <p className="text-[11.5px] leading-snug" style={{ color: tone || 'rgba(255,255,255,0.72)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function AlertCard({ item }) {
  const where = item.area_label
    || (item.proximity === 'country_only' ? item.country : '')
    || 'Location not specified';

  const distanceValue = item.distance_label
    ? `${item.distance_label}${item.matched_place ? ` · near ${item.matched_place.label}` : ' from you'}`
    : 'Applies to your destination generally';

  const mapsHref = item.area_label
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.area_label} ${item.country || ''}`.trim())}`
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#0C1A1D',
        border: `1px solid ${item.level === 'urgent' ? 'rgba(239,68,68,0.32)' : 'rgba(212,175,55,0.12)'}`,
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <LevelBadge level={item.level} />
          <span className="text-[9.5px] uppercase font-semibold truncate" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
            {item.category_label}
          </span>
        </div>

        <p className="text-[15px] font-semibold text-white leading-snug">{item.headline}</p>

        {item.detail ? (
          <p className="text-[12.5px] leading-relaxed mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {item.detail}
          </p>
        ) : null}

        {item.downgraded ? (
          <div
            className="flex items-start gap-2 mt-3 rounded-xl px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
            <p className="text-[10.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.5)' }}>
              The source rated this <span className="font-semibold text-white/70">{item.reported_level_label}</span>; M-Care is showing it as{' '}
              <span className="font-semibold text-white/70">{item.level_label}</span> because {item.level_reasons.join(' and ')}.
            </p>
          </div>
        ) : null}

        {item.suggested_action ? (
          <div
            className="mt-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}
          >
            <p className="text-[9.5px] uppercase font-bold mb-1" style={{ color: '#D4AF37', letterSpacing: '0.14em' }}>
              What to consider
            </p>
            <p className="text-[12.5px] leading-relaxed text-white/85">{item.suggested_action}</p>
          </div>
        ) : null}
      </div>

      <div
        className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}
      >
        <Row icon={MapPin} label="Where" value={where} />
        <Row icon={Navigation} label="Distance" value={distanceValue} />
        <Row
          icon={Radio}
          label="Source"
          value={
            item.source_url ? (
              <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-white/20">
                {item.source_name} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              item.source_name
            )
          }
        />
        <Row
          icon={Clock}
          label="Reported"
          value={`${item.reported_age_label}${item.reported_at ? '' : ' (time not stated)'}`}
        />
        <div className="col-span-2">
          <Row
            icon={Clock}
            label="How current"
            value={item.freshness_label}
            tone={item.freshness_status === 'live' ? 'rgba(110,231,183,0.85)' : '#FBBF24'}
          />
        </div>
        <div className="col-span-2">
          <p
            className="text-[10px] leading-snug"
            style={{ color: item.source_verified ? 'rgba(110,231,183,0.8)' : '#FBBF24' }}
          >
            {item.verification_label}
          </p>
        </div>
      </div>

      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}
        >
          <MapPin className="w-3 h-3" /> Open this area in Maps
        </a>
      ) : null}
    </div>
  );
}