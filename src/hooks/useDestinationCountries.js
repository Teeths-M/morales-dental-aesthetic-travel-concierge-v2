// @ts-nocheck — pre-existing type gap: base44 entity .filter() args, matches Booking.jsx
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Countries we can actually offer as a destination — derived live from
 * verified, active doctors, the same pattern PartnerDirectory.jsx already
 * uses for "countries we operate in." This is what lets the destination
 * question be a pick-list instead of free text: every option shown is
 * guaranteed to have a real doctor behind it.
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
        const unique = [...new Set(doctors.map((d) => d.clinic_country).filter(Boolean))].sort();
        if (!cancelled) setCountries(unique);
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
