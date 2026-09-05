import { useState, useEffect } from 'react';

/**
 * usePrefersReducedMotion — the `matchMedia('(prefers-reduced-motion: reduce)')`
 * + change-listener pattern already duplicated inline across LivingOrb.jsx,
 * HologramPlatform.jsx, and other mcare components. Those existing call
 * sites are left as-is (no reason to touch already-working code); this hook
 * exists so the System Health hero visualization — a new consumer of the
 * same real signal — doesn't add a fifth raw copy of the same 6 lines.
 */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
