/**
 * useCases — React Query hooks for CaseRecord
 * Stable query keys, bounded fetches, proper stale times.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseService } from '@/services/caseService';
import { CACHE, PAGINATION } from '@/lib/constants';

// ── Query key factory ─────────────────────────────────────────────────────────
export const caseKeys = {
  all:          () => ['cases'],
  byEmail:      (email)  => ['cases', 'email', email],
  byId:         (id)     => ['cases', 'id', id],
  byDoctor:     (email)  => ['cases', 'doctor', email],
  byStatus:     (status) => ['cases', 'status', status],
  recent:       ()       => ['cases', 'recent'],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch cases for the authenticated client */
export function useMyCases(email, options = {}) {
  return useQuery({
    queryKey: caseKeys.byEmail(email),
    queryFn: () => caseService.getByEmail(email, PAGINATION.DEFAULT_LIMIT),
    enabled: !!email,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Fetch a single case by id */
export function useCase(id, options = {}) {
  return useQuery({
    queryKey: caseKeys.byId(id),
    queryFn: () => caseService.getById(id),
    enabled: !!id,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Doctor: fetch assigned cases */
export function useDoctorCases(doctorEmail, options = {}) {
  return useQuery({
    queryKey: caseKeys.byDoctor(doctorEmail),
    queryFn: () => caseService.getByDoctorEmail(doctorEmail, PAGINATION.DEFAULT_LIMIT),
    enabled: !!doctorEmail,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Admin: fetch recent cases */
export function useRecentCases(options = {}) {
  return useQuery({
    queryKey: caseKeys.recent(),
    queryFn: () => caseService.listRecent(PAGINATION.ADMIN_LIMIT),
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Mutation: update a case and invalidate related queries */
export function useUpdateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => caseService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: caseKeys.byId(id) });
      qc.invalidateQueries({ queryKey: caseKeys.all() });
    },
  });
}