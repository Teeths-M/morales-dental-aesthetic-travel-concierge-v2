// @ts-nocheck — pre-existing type gap: base44 entity .filter() args, matches Booking.jsx
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Countries we can actually offer as a destination — derived live from
 * verified, active doctors, the same pattern PartnerDirectory.jsx already
 * uses for "countries we operate in." This is what lets the destination
 * question be a pick-list instead of free text: every option shown is
 * guaranteed to have a real doctor behind it.
 *
 * Returns `{value, label, count}[]` sorted by real verified-doctor count
 * descending — the honest signal a recommendation-first UI ranks by (real
 * coverage depth, not a fabricated quality claim like "best surgeons").
 */
export function useDestinationCountries() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doctors = await base44.entities.Doctor.filter({
          status: 'active',
          verification_status: 'verified',
        });
        const counts = new Map();
        doctors.forEach((d) => {
          if (!d.clinic_country) return;
          counts.set(d.clinic_country, (counts.get(d.clinic_country) || 0) + 1);
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
