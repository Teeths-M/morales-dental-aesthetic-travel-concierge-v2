import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getVisaMatrixMatch } from '@/lib/visaMatrix';

/**
 * useVisaRequirement — the single source for a nationality → destination entry
 * requirement in the app.
 *
 * Priority: when M's own curated matrix has an EXPLICIT (researched, cited)
 * answer for this exact pair, that answer wins — a single live AI lookup
 * cannot silently overrule real research. The live check
 * (getVisaRequirement, official-source backed + cached) is still requested
 * and still authoritative for anything the matrix only has a broad regional
 * guess for; a disagreement between an explicit matrix answer and the live
 * check is reported to the backend so it can flag it for a human to look at
 * (see getVisaRequirement/entry.ts), never shown to the patient as ambiguity.
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
      const matrixMatch = getVisaMatrixMatch(nationality, destination);
      const res = await base44.functions.invoke('getVisaRequirement', {
        nationality,
        destination_country: destination,
        // Lets the backend log a flag if a curated answer disagrees with
        // its live check — see getVisaRequirement/entry.ts.
        matrix_status: matrixMatch.status,
        matrix_is_explicit: matrixMatch.isExplicit,
      });
      return res?.data ?? res;
    },
  });

  const hasLive = !!(data && data.visa_status && data.last_confirmed_at && data.visa_status !== 'unknown');
  const liveStatus = hasLive ? (LIVE_TO_APP[data.visa_status] || 'unknown') : null;
  const matrixMatch = enabled ? getVisaMatrixMatch(nationality, destination) : { status: 'unknown', isExplicit: false };
  const agreesWithLive = hasLive && liveStatus === matrixMatch.status;

  // A curated, researched answer wins outright. A broad regional guess has
  // no more authority than the live check, so it defers to one when present.
  const status = matrixMatch.isExplicit ? matrixMatch.status : (liveStatus || matrixMatch.status);

  return {
    status,
    isLive: !!liveStatus,
    isExplicitMatrix: matrixMatch.isExplicit,
    agreesWithLive,
    source: data?.source_url || null,
    lastConfirmed: data?.last_confirmed_at || null,
    summary: hasLive ? (data.summary || null) : null,
    medicalNotes: hasLive ? (data.medical_notes || null) : null,
    isLoading: enabled && isLoading && !isError,
  };
}
