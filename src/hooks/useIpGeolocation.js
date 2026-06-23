import { useState, useEffect } from 'react';

/**
 * useIpGeolocation
 *
 * Lightweight hook used for form pre-fill (booking, signup).
 * Primary:  ipapi.co (free, HTTPS, no key, good Caribbean accuracy)
 * Fallback: ipwho.is (free, HTTPS, no key, MaxMind database)
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

    async function detect() {
      // Primary: ipapi.co
      try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
        const d = await res.json();
        if (d.error || !d.country_code) throw new Error('bad response');
        if (!cancelled) {
          setCountry(d.country_name || d.country_code);
          setCountryCode(d.country_code);
          setCurrency(d.currency || '');
        }
        return;
      } catch {}

      // Fallback: ipwho.is
      try {
        const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`ipwho.is ${res.status}`);
        const d = await res.json();
        if (!d.success || !d.country_code) throw new Error('bad response');
        if (!cancelled) {
          setCountry(d.country || d.country_code);
          setCountryCode(d.country_code);
          setCurrency(d.currency?.code || '');
        }
      } catch {}
    }

    detect().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { country, country_code: countryCode, currency, loading };
}
