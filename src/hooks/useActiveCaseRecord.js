import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CACHE } from '@/lib/constants';

const TERMINAL_STATUSES = ['Completed', 'Closed', 'Cancelled'];

/**
 * Shared queryKey/fetcher for "the patient's current active CaseRecord" — the
 * most recent non-terminal case among their last 5, falling back to the most
 * recent overall if all are terminal. Screens that both need this
 * (EmergencyHub, EmergencyMedCard) share one cached read instead of each
 * independently fetching.
 */
export const activeCaseQueryKey = (userEmail) => ['active-case', userEmail];

export async function fetchActiveCaseRecord(userEmail) {
  const cases = await base44.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 5);
  return cases.find((c) => !TERMINAL_STATUSES.includes(c.status)) || cases[0] || null;
}

export function useActiveCaseRecord(userEmail) {
  return useQuery({
    queryKey: activeCaseQueryKey(userEmail),
    queryFn: () => fetchActiveCaseRecord(userEmail),
    enabled: !!userEmail,
    staleTime: CACHE.MEDIUM,
  });
}
