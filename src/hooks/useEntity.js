/**
 * useEntity — Generic data-fetching hook for any entity type
 * Standardizes loading, error, and caching patterns across all pages
 * 
 * @param {string} entityName - Entity name (e.g., 'CaseRecord', 'Doctor')
 * @param {object} options - Query options
 * @param {object} options.filter - Filter query (e.g., { status: 'active' })
 * @param {string} options.sort - Sort field (e.g., '-created_date')
 * @param {number} options.limit - Max results
 * @param {boolean} options.enabled - Enable/disable query (default: true)
 * 
 * @example
 * const { data: cases, loading, error } = useEntity('CaseRecord', {
 *   filter: { client_email: user.email },
 *   sort: '-created_date',
 *   limit: 20
 * });
 */
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useEntity(entityName, options = {}) {
  const { filter = null, sort = '-created_date', limit = 50, enabled = true } = options;
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const Entity = base44.entities[entityName];
      if (!Entity) {
        throw new Error(`Entity "${entityName}" not found`);
      }

      let results;
      if (filter) {
        results = await Entity.filter(filter, sort, limit);
      } else {
        results = await Entity.list(sort, limit);
      }
      
      setData(results || []);
    } catch (err) {
      console.error(`[useEntity] Failed to load ${entityName}:`, err);
      setError(`Failed to load ${entityName.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [entityName, filter, sort, limit, enabled]);

  useEffect(() => { 
    load(); 
  }, [load]);

  return { 
    data, 
    loading, 
    error, 
    reload: load,
    setData 
  };
}

/**
 * useEntitySingle — Fetch single entity by ID
 * 
 * @param {string} entityName - Entity name
 * @param {string} id - Entity ID
 * @param {boolean} enabled - Enable/disable query
 * 
 * @example
 * const { data: doctor, loading, error } = useEntitySingle('Doctor', doctorId);
 */
export function useEntitySingle(entityName, id, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled || !id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const Entity = base44.entities[entityName];
      if (!Entity) {
        throw new Error(`Entity "${entityName}" not found`);
      }

      const result = await Entity.get(id);
      setData(result || null);
    } catch (err) {
      console.error(`[useEntitySingle] Failed to load ${entityName}/${id}:`, err);
      setError(`Failed to load ${entityName.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [entityName, id, enabled]);

  useEffect(() => { 
    load(); 
  }, [load]);

  return { 
    data, 
    loading, 
    error, 
    reload: load,
    setData 
  };
}