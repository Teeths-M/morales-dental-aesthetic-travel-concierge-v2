/**
 * Services barrel export.
 * Import domain services from here:
 *   import { caseService, paymentService } from '@/services';
 *
 * The vault service lives in lib/services/vaultService.js (existing path preserved).
 * Re-exported here for convenience.
 */
export { caseService }    from './caseService';
export { paymentService } from './paymentService';
export { doctorService }  from './doctorService';
export { partnerService } from './partnerService';
export { workflowService } from './workflowService';

// Vault service — keep both import paths working
export { vaultService }   from '@/lib/services/vaultService';