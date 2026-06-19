/**
 * Workflow Service
 * Wraps portalHubWorkflowEngine and related workflow function calls.
 */
import { base44 } from '@/api/base44Client';

export const workflowService = {
  /** Request doctor date confirmation */
  requestDoctorDateConfirmation: (consultationId, procedureDate, recommendedArrival, recommendedDeparture) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'request_doctor_date_confirmation',
      consultation_id: consultationId,
      procedure_date: procedureDate,
      recommended_arrival: recommendedArrival,
      recommended_departure: recommendedDeparture,
    }),

  /** Initiate doctor approval workflow */
  initiateDoctorApproval: (consultationId) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'initiate_doctor_approval',
      consultation_id: consultationId,
    }),

  /** Mark doctor as approved and dispatch vendors */
  markDoctorApproved: (consultationId, data) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'doctor_approved',
      consultation_id: consultationId,
      data,
    }),

  /** Process vendor quotes and calculate package */
  processQuotesAndCalculate: (consultationId, data) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'process_quotes_and_calculate_package',
      consultation_id: consultationId,
      data,
    }),

  /** Client selects payment option */
  selectPaymentOption: (consultationId, planType) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'client_selects_payment_option',
      consultation_id: consultationId,
      data: { plan_type: planType },
    }),

  /** Trigger full confirmation after payment */
  triggerFullConfirmation: (consultationId) =>
    base44.functions.invoke('portalHubWorkflowEngine', {
      action: 'trigger_full_confirmation_workflow',
      consultation_id: consultationId,
    }),

  /** Execute a case workflow step (executeCaseWorkflow function) */
  executeCase: (caseId, action, data = {}) =>
    base44.functions.invoke('executeCaseWorkflow', { case_id: caseId, action, ...data }),
};