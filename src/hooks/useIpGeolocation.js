import { useState, useEffect } from 'react';
import { fetchClientIpGeo } from '@/lib/clientIpGeo';

/**
 * useIpGeolocation
 *
 * Lightweight hook used for form pre-fill (booking, signup).
 * Direct-from-browser lookup via clientIpGeo.js (ipapi.co, then ipwho.is
 * fallback) — no backend call, no key needed.
 *
 * Returns: { country, country_code, currency, loading }
 */
export function useIpGeolocation() {
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchClientIpGeo()
      .then((d) => {
        if (cancelled || !d) return;
        setCountry(d.country);
        setCountryCode(d.country_code);
        setCurrency(d.currency);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { country, country_code: countryCode, currency, loading };
}
