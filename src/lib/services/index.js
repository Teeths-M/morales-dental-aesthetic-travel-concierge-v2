/**
 * Service layer barrel — the single canonical data-access layer.
 * (The parallel src/services/ layer was never adopted and has been removed.)
 */
export { vaultService }  from './vaultService';
export { auditService }  from './auditService';
export * from './vaultSyncService';
