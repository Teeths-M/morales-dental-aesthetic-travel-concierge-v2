/**
 * usePayments — React Query hooks for payment operations.
 * Stripe checkout is initiated here; webhook is the only source of truth for
 * payment state changes (never update payment_status from the frontend).
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { CACHE, PAGINATION } from '@/lib/constants';

// ── Query key factory ─────────────────────────────────────────────────────────
export const paymentKeys = {
  all:         ()      => ['payments'],
  byCase:      (caseId) => ['payments', 'case', caseId],
  byUser:      (uid)   => ['payments', 'user', uid],
  recent:      ()      => ['payments', 'recent'],
  plan:        (cid)   => ['payments', 'plan', cid],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch payment transactions for a case */
export function useCaseTransactions(caseId, options = {}) {
  return useQuery({
    queryKey: paymentKeys.byCase(caseId),
    queryFn: () => paymentService.getTransactionsByCase(caseId, PAGINATION.DEFAULT_LIMIT),
    enabled: !!caseId,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Fetch payment transactions for a user */
export function useUserTransactions(userId, options = {}) {
  return useQuery({
    queryKey: paymentKeys.byUser(userId),
    queryFn: () => paymentService.getTransactionsByUser(userId, PAGINATION.DEFAULT_LIMIT),
    enabled: !!userId,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Admin: fetch recent transactions */
export function useRecentTransactions(options = {}) {
  return useQuery({
    queryKey: paymentKeys.recent(),
    queryFn: () => paymentService.listRecentTransactions(PAGINATION.ADMIN_LIMIT),
    staleTime: CACHE.SHORT,
    ...options,
  });
}

/** Fetch payment plan for a consultation */
export function usePaymentPlan(consultationId, options = {}) {
  return useQuery({
    queryKey: paymentKeys.plan(consultationId),
    queryFn: () => paymentService.getPlanByConsultation(consultationId),
    enabled: !!consultationId,
    staleTime: CACHE.SHORT,
    ...options,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Mutation: initiate a Stripe checkout session for the consultation fee.
 * Does NOT mark fee as paid — that only happens via stripePaymentWebhook.
 */
export function useInitiateConsultationFee() {
  return useMutation({
    mutationFn: (params) => paymentService.initiateConsultationFee(params),
  });
}

/**
 * Mutation: generate a Stripe checkout link for a package/deposit payment.
 * Does NOT update CaseRecord — that only happens via stripePaymentWebhook.
 */
export function useGeneratePackagePaymentLink() {
  return useMutation({
    mutationFn: (params) => paymentService.generatePackagePaymentLink(params),
  });
}