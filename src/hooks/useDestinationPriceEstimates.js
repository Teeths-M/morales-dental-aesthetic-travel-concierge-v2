// @ts-nocheck — pre-existing type gap: base44 functions.invoke() args, matches useIntakeBackgroundSearch.js
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PROCEDURE_OPTIONS } from '@/lib/intakeFlow/questionGraph';

const TOP_N = 5;

function procedureLabel(value) {
  return PROCEDURE_OPTIONS.find((p) => p.value === value)?.label || value;
}

/**
 * Real per-country price estimates for the top-ranked destination cards —
 * reuses the same calculatePriceQuote function useIntakeBackgroundSearch.js
 * already calls once a destination is chosen, just fired earlier (per
 * candidate country) so the recommendation cards can show a real number
 * instead of just a coverage count.
 *
 * calculatePriceQuote requires auth, but destination_country is deliberately
 * a guest-accessible step (asked before the auth gate) — firing these calls
 * only when `isAuthenticated` is already true keeps this honest: a guest
 * simply sees the count-only card (same as before this hook existed) rather
 * than a price the backend can't actually return for them yet.
 */
export function useDestinationPriceEstimates({ countries, procedureInterest, isAuthenticated }) {
  const [estimates, setEstimates] = useState({});

  useEffect(() => {
    if (!procedureInterest || !isAuthenticated || !countries?.length) return;

    const topCountries = countries.slice(0, TOP_N).map((c) => c.value);
    const pending = topCountries.filter((country) => !estimates[country]);
    if (pending.length === 0) return;

    setEstimates((prev) => {
      const next = { ...prev };
      pending.forEach((country) => { next[country] = { status: 'loading' }; });
      return next;
    });

    pending.forEach((country) => {
      base44.functions
        .invoke('calculatePriceQuote', {
          procedures: [{ name: procedureLabel(procedureInterest) }],
          country,
        })
        .then((res) => {
          const payload = res?.data ?? res ?? {};
          setEstimates((prev) => ({
            ...prev,
            [country]: payload.error || payload.estimatedTotalLow == null
              ? { status: 'unavailable' }
              : { status: 'done', low: payload.estimatedTotalLow, high: payload.estimatedTotalHigh },
          }));
        })
        .catch(() => {
          setEstimates((prev) => ({ ...prev, [country]: { status: 'unavailable' } }));
        });
    });
  }, [procedureInterest, isAuthenticated, countries]);

  return estimates;
}
