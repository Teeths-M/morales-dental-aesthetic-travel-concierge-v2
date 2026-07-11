import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CALM } from '@/lib/brandTokens';
import { checkVisaRequirement, getEvisaLink } from '@/lib/visaMatrix';
import LastVerified from './LastVerified';

/**
 * VisaRequirementLive — shows the CURRENT entry requirement for a nationality →
 * destination pair at decision time, re-checked live against official sources
 * (getVisaRequirement), with the source and "last confirmed" date visible.
 *
 * Advisory only — never gates a booking. If the live check is unavailable (e.g.
 * integration credits), it falls back to the offline matrix but LABELS it clearly
 * as an unconfirmed estimate rather than presenting it as current truth.
 */
const STATUS_COPY = {
  visa_free: 'No visa required',
  exempt: 'No visa required',
  evisa: 'e-Visa required',
  on_arrival: 'Visa on arrival',
  embassy_required: 'Embassy visa required',
  embassy: 'Embassy visa required',
  unknown: 'Requirement not confirmed',
};

export default function VisaRequirementLive({ nationality, destination, style }) {
  const enabled = Boolean(nationality && destination);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['visaRequirement', nationality, destination],
    enabled,
    staleTime: 1000 * 60 * 60, // 1h client cache; server caches to its 7-day TTL
    retry: 0,
    queryFn: async () => {
      const res = await base44.functions.invoke('getVisaRequirement', {
        nationality, destination_country: destination,
      });
      return res?.data ?? res;
    },
  });

  if (!enabled) return null;

  // Offline fallback — labelled as an unconfirmed estimate, never as confirmed.
  const offline = isError || (data && data.visa_status === 'unknown' && !data.last_confirmed_at);
  const offlineStatus = offline ? checkVisaRequirement(nationality, destination) : null;
  const status = offline ? offlineStatus : data?.visa_status;
  const label = STATUS_COPY[status] || STATUS_COPY.unknown;

  return (
    <div
      style={{
        background: CALM.surface, border: `1px solid ${CALM.border}`, borderRadius: 14,
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: CALM.textSoft }}>
          Entry requirement · {nationality} → {destination}
        </span>
        {isLoading && <span style={{ fontSize: 11.5, color: CALM.textFaint }}>Checking current rules…</span>}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: CALM.text }}>{label}</div>

      {!isLoading && !offline && data?.summary && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: CALM.textSoft }}>{data.summary}</p>
      )}
      {!isLoading && !offline && data?.medical_notes && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: CALM.textFaint }}>{data.medical_notes}</p>
      )}

      {!isLoading && (offline ? (
        <span style={{ fontSize: 11.5, color: CALM.textFaint }}>
          Offline estimate — your coordinator will confirm the current requirement with you directly.
          {offlineStatus && offlineStatus !== 'exempt' && getEvisaLink && (() => {
            const link = getEvisaLink(destination);
            return link ? <> · <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: CALM.action, fontWeight: 600, textDecoration: 'none' }}>official portal</a></> : null;
          })()}
        </span>
      ) : (
        <LastVerified
          timestamp={data?.last_confirmed_at}
          kind="visa_rule"
          sourceUrl={data?.source_url || undefined}
          sourceLabel="official source"
        />
      ))}

      <p style={{ margin: '2px 0 0', fontSize: 11, color: CALM.textFaint }}>
        Entry rules change — always confirm with the embassy before you travel. This never affects your booking.
      </p>
    </div>
  );
}
