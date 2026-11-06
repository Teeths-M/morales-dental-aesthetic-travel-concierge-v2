import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { readAgeGate } from '@/lib/ageGate';

/**
 * After sign-in, copy this device's date-of-birth check pass onto the account,
 * once, so the record outlives the browser. Only the pass and its time are
 * saved; the date of birth never is.
 */
export function useAgeGateAccountSync(user) {
  const done = useRef(false);
  useEffect(() => {
    if (!user || done.current || user.age_gate_passed_at) return;
    const saved = readAgeGate();
    if (saved?.status !== 'passed') return;
    done.current = true;
    base44.auth
      .updateMe({ age_gate_passed_at: saved.at, age_gate_min_age: saved.minAge })
      .catch((e) => console.warn('[age gate] not saved to the account:', e?.message));
  }, [user]);
}
