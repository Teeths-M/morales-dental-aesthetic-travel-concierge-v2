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
        const unique = [...new Set(taxis.map((t) => t.operating_country).filter(Boolean))].sort();
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
