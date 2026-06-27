import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

/**
 * useSafetyScore — Morales Safety Score
 *
 * Calls runMedGuardAnalysis (6 behavioral signals) during active travel.
 * React Query caches the result for 5 minutes and refetches automatically.
 * During pre-travel or no-phase, returns score: 0 with isActiveTravel: false.
 */
export function useSafetyScore({ caseId, tripPhase, enabled = true }) {
  const isActiveTravel = ACTIVE_TRAVEL_PHASES.has(tripPhase);

  const { data, isLoading } = useQuery({
    queryKey: ['safety-score', caseId],
    queryFn: async () => {
      const res = await base44.functions.invoke('runMedGuardAnalysis', { case_id: caseId });
      return res.data ?? null;
    },
    enabled: !!caseId && isActiveTravel && enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    score:        data?.score ?? (isActiveTravel ? null : 0),
    riskLevel:    data?.risk_level ?? 'SAFE',
    breakdown:    data?.breakdown ?? {},
    analyzedAt:   data?.analyzed_at ?? null,
    isLoading:    isLoading && isActiveTravel,
    isActiveTravel,
    phase:        tripPhase,
  };
}
