/**
 * useWorkflow — React Query hooks for workflow operations.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '@/services/workflowService';
import { caseKeys } from './useCases';

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useRequestDoctorDateConfirmation() {
  return useMutation({
    mutationFn: ({ consultationId, procedureDate, recommendedArrival, recommendedDeparture }) =>
      workflowService.requestDoctorDateConfirmation(
        consultationId, procedureDate, recommendedArrival, recommendedDeparture
      ),
  });
}

export function useInitiateDoctorApproval() {
  return useMutation({
    mutationFn: ({ consultationId }) =>
      workflowService.initiateDoctorApproval(consultationId),
  });
}

export function useMarkDoctorApproved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consultationId, data }) =>
      workflowService.markDoctorApproved(consultationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.all() });
    },
  });
}

export function useSelectPaymentOption() {
  return useMutation({
    mutationFn: ({ consultationId, planType }) =>
      workflowService.selectPaymentOption(consultationId, planType),
  });
}

export function useTriggerFullConfirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consultationId }) =>
      workflowService.triggerFullConfirmation(consultationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.all() });
    },
  });
}

export function useExecuteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, action, data }) =>
      workflowService.executeCase(caseId, action, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: caseKeys.byId(caseId) });
    },
  });
}