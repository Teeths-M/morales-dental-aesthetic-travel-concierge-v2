import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { retryWithBackoff } from '@/lib/serviceLayer';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create a client with authentication required
const base44Client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Wrap entity operations with retry logic for resilience
// Only wrap entity methods, preserve all other SDK properties
const originalEntities = base44Client.entities;
const wrappedEntities = new Proxy(originalEntities, {
  get(target, prop) {
    // Preserve internal SDK properties (asServiceRole, etc.)
    if (prop === 'asServiceRole' || prop === 'constructor' || prop === '__proto__') {
      return target[prop];
    }
    
    const entity = target[prop];
    if (!entity || typeof entity !== 'object') return entity;
    
    // Wrap list/filter/get methods with retry
    const wrappedEntity = new Proxy(entity, {
      get(entityTarget, method) {
        // Preserve internal properties
        if (method === 'constructor' || method === '__proto__') {
          return entityTarget[method];
        }
        
        const fn = entityTarget[method];
        if (typeof fn !== 'function') return fn;
        
        return async (...args) => {
          return retryWithBackoff(
            async () => fn.apply(entityTarget, args),
            { retries: 2, backoff: 500, timeout: 15000 }
          );
        };
      }
    });
    
    return wrappedEntity;
  }
});

export const base44 = {
  ...base44Client,
  entities: wrappedEntities
};