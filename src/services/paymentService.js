/**
 * Payment Service
 * All payment-related operations: Stripe checkout initiation,
 * transaction reads, and plan reads.
 *
 * IMPORTANT: Payment state transitions (paid / failed / refunded) are ONLY
 * triggered by stripePaymentWebhook. This service only reads and initiates.
 */
import { base44 } from '@/api/base44Client';
import { PAGINATION } from '@/lib/constants';

const Transactions = () => base44.entities.PaymentTransaction;
const Plans        = () => base44.entities.PaymentPlan;

export const paymentService = {
  // ── Stripe checkout initiation ──────────────────────────────────────────────

  /** Create a Stripe checkout session for the $49 consultation retainer */
  initiateConsultationFee: ({ consultationId, email, procedure, destination }) =>
    base44.functions.invoke('chargeConsultationFee', {
      consultation_id: consultationId,
      email,
      procedure,
      destination,
    }),

  /** Create a Stripe checkout session for a package / deposit payment */
  generatePackagePaymentLink: ({ caseId, depositOption, planType }) =>
    base44.functions.invoke('generateStripePaymentLink', {
      case_id: caseId,
      deposit_option: depositOption,
      plan_type: planType,
    }),

  // ── Transaction reads ───────────────────────────────────────────────────────

  /** Get all transactions for a case */
  getTransactionsByCase: (caseId, limit = PAGINATION.DEFAULT_LIMIT) =>
    Transactions().filter({ case_id: caseId }, '-created_date', limit),

  /** Get all transactions for a user */
  getTransactionsByUser: (userId, limit = PAGINATION.DEFAULT_LIMIT) =>
    Transactions().filter({ user_id: userId }, '-created_date', limit),

  /** Admin: get recent transactions */
  listRecentTransactions: (limit = PAGINATION.ADMIN_LIMIT) =>
    Transactions().list('-created_date', limit),

  // ── Payment plans ───────────────────────────────────────────────────────────

  /** Get payment plan for a consultation */
  getPlanByConsultation: (consultationId) =>
    Plans().filter({ consultation_id: consultationId }, '-created_date', 1)
      .then(r => r[0] || null),
};