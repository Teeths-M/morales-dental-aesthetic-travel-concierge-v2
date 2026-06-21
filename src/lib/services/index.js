/**
 * lib/services barrel — kept for backwards compatibility.
 * New code should import from '@/services' instead.
 */
export { vaultService }  from './vaultService';
export { caseService }   from '@/services/caseService';
export { auditService }  from './auditService';
export * from './vaultSyncService';