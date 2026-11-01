import React from 'react';
import { MapPin } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';
import {
  LOCATION_FRESHNESS_COPY,
  LOCATION_SOURCE_LABEL,
  clockTime,
  relativeAge,
  toneText,
} from '@/lib/emergencyIncidentUi';

/**
 * LocationIntegrityCard — what we actually know about where the traveller is.
 *
 * The four facts are always shown together because any three of them alone can
 * mislead: a precise GPS fix from forty minutes ago is not a current position,
 * an IP-derived point is not precise, and a typed address has no accuracy at
 * all. A missing position is stated plainly rather than replaced by a map of
 * somewhere else.
 */
export default function LocationIntegrityCard({ location, label }) {
  const source = location?.source || 'none';
  const freshness = LOCATION_FRESHNESS_COPY[location?.freshness] || LOCATION_FRESHNESS_COPY.unavailable;
  const hasCoords = typeof location?.latitude === 'number' && typeof location?.longitude === 'number';

  return (
    <MSafeCard>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-msafe-gold" aria-hidden="true" />
        <MSafeText variant="eyebrow" as="p">Location on record</MSafeText>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-msafe-ink">
          {LOCATION_SOURCE_LABEL[source] || LOCATION_SOURCE_LABEL.none}
        </span>
        <span className="text-msafe-muted">·</span>
        <span className={`text-[12px] font-medium ${toneText(freshness.tone)}`}>{freshness.label}</span>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-msafe-muted">
        {hasCoords
          ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          : 'No coordinates were captured. This does not stop the alert.'}
        {label ? ` — ${label}` : ''}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-msafe-border pt-3">
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">Accuracy</dt>
          <dd className="mt-0.5 text-[12.5px] text-msafe-ink">
            {typeof location?.accuracy_m === 'number' ? `±${Math.round(location.accuracy_m)} m` : 'Unknown'}
          </dd>
        </div>
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">Captured</dt>
          <dd className="mt-0.5 text-[12.5px] text-msafe-ink">
            {clockTime(location?.captured_at)
              ? `${clockTime(location.captured_at)} · ${relativeAge(location.captured_at)}`
              : 'Not recorded'}
          </dd>
        </div>
      </dl>

      {source === 'network' && (
        <p className="mt-3 text-[11px] leading-relaxed text-msafe-warn">
          Network-derived position can be tens of kilometres out. Read the nearest street aloud if you can.
        </p>
      )}
    </MSafeCard>
  );
}