// @ts-nocheck — pre-existing type gap: base44 entity .filter() args, matches Booking.jsx
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Countries we can actually offer as a travel-only destination — derived
 * live from verified, active taxi/transfer services, the same "only show
 * what's real" principle useDestinationCountries applies for the medical
 * flow (there, sourced from Doctor.clinic_country; here, from
 * TaxiService.operating_country since it holds exact country names, unlike
 * TravelAgency.service_regions which holds broad free-text regions).
 *
 * Returns `{value, label, count}[]` sorted by real verified-partner count
 * descending — the honest signal a recommendation-first UI ranks by.
 */
export function useTravelPartnerCountries() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const taxis = await base44.entities.TaxiService.filter({
          status: 'active',
          verification_status: 'verified',
        });
        const counts = new Map();
        taxis.forEach((t) => {
          if (!t.operating_country) return;
          counts.set(t.operating_country, (counts.get(t.operating_country) || 0) + 1);
        });
        const ranked = [...counts.entries()]
          .map(([country, count]) => ({ value: country, label: country, count }))
          .sort((a, b) => b.count - a.count);
        if (!cancelled) setCountries(ranked);
      } catch (_) {
        if (!cancelled) setCountries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, isLoading };
}
