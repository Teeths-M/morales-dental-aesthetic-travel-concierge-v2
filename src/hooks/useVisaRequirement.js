import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { checkVisaRequirement } from '@/lib/visaMatrix';

/**
 * useVisaRequirement — the single source for a nationality → destination entry
 * requirement in the app. It pulls the CURRENT rule from the live source
 * (getVisaRequirement, official-source backed + cached) and only falls back to
 * the static visaMatrix when the live check is unavailable — clearly flagged via
 * `isLive: false`. This keeps hardcoded rules out of the authoritative path while
 * still giving synchronous consumers (validation, ack counts) a value to use.
 *
 * Shares its React Query key with VisaRequirementLive, so the display panel and
 * the logic here dedupe to a single network call.
 */

// Live vocabulary → the app's existing matrix vocabulary, so downstream consumers
// (getRequiredAckCount, ClientAcknowledgement) keep working unchanged.
const LIVE_TO_APP = {
  visa_free: 'exempt',
  evisa: 'evisa',
  on_arrival: 'evisa',
  embassy_required: 'embassy',
  unknown: 'unknown',
};

export function useVisaRequirement(nationality, destination) {
  const enabled = !!(nationality && destination);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['visaRequirement', nationality, destination],
    enabled,
    staleTime: 60 * 60 * 1000, // 1h client cache; server caches to its 7-day TTL
    retry: 0,
    queryFn: async () => {
      const res = await base44.functions.invoke('getVisaRequirement', {
        nationality,
        destination_country: destination,
      });
      return res?.data ?? res;
    },
  });

  const hasLive = !!(data && data.visa_status && data.last_confirmed_at && data.visa_status !== 'unknown');
  const liveStatus = hasLive ? (LIVE_TO_APP[data.visa_status] || 'unknown') : null;
  const fallbackStatus = enabled ? checkVisaRequirement(nationality, destination) : 'unknown';

  return {
    status: liveStatus || fallbackStatus,
    isLive: !!liveStatus,
    source: data?.source_url || null,
    lastConfirmed: data?.last_confirmed_at || null,
    summary: hasLive ? (data.summary || null) : null,
    isLoading: enabled && isLoading && !isError,
  };
}
