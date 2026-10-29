import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useMinorModuleEnabled — reads the module's feature flag, failing closed.
 *
 * While the read is in flight the answer is `false`, not `true`. A disabled
 * module must never flash its UI before hiding itself, and an unreadable flag
 * must behave exactly like a disabled one.
 */
export function useMinorModuleEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await base44.entities.FeatureFlag.filter(
          { key: 'minor_reunification' },
          '-updated_date',
          1,
        );
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!cancelled) setEnabled(row?.enabled === true);
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { enabled, loading };
}

export default useMinorModuleEnabled;