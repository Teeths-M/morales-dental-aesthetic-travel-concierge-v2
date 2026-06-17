/**
 * Audit Service
 * Single place for all audit log writes. Ensures consistent shape + prev_hash chain.
 * Never call logAuditEvent directly from components — use this service.
 */
import { base44 } from '@/api/base44Client';

/**
 * @param {object} params
 * @param {string} params.event_type   - AuditLog.event_type enum value
 * @param {string} params.resource_type
 * @param {string} params.resource_id
 * @param {string} [params.case_id]
 * @param {object} [params.details]
 * @param {boolean} [params.sensitive]
 */
export const auditService = {
  log: (params) =>
    base44.functions.invoke('logAuditEvent', {
      event_type:    params.event_type,
      resource_type: params.resource_type,
      resource_id:   params.resource_id,
      case_id:       params.case_id,
      details:       params.details || {},
      sensitive:     params.sensitive ?? false,
    }),

  /** Verify the full audit chain integrity */
  verifyChain: () => base44.functions.invoke('verifyAuditChain', {}),
};