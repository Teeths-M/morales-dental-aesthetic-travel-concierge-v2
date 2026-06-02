import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Module-level cache with TTL (5 minutes) — shared across hook instances intentionally for dedup
const RATE_CACHE = {};
const RATE_CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedRate(currency) {
  const entry = RATE_CACHE[currency];
  if (!entry) return null;
  if (Date.now() - entry.ts > RATE_CACHE_TTL_MS) {
    delete RATE_CACHE[currency];
    return null;
  }
  return entry.rate;
}

function setCachedRate(currency, rate) {
  RATE_CACHE[currency] = { rate, ts: Date.now() };
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem('appCurrency') || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inflight = useRef({});

  useEffect(() => {
    let saved;
    try { saved = localStorage.getItem('appCurrency'); } catch {}
    if (!saved) detectCurrency();
  }, []);

  const detectCurrency = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getGeolocationAndCurrency', {});
      const detected = response.data?.currency;
      setCurrency(detected || 'USD');
    } catch (err) {
      setCurrency('USD');
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = (curr) => {
    try { localStorage.setItem('appCurrency', curr); } catch {}
    setCurrencyState(curr);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: curr } }));
  };

  // Always converts FROM USD. Returns 1.0 on any failure so callers never get NaN.
  const getExchangeRate = async (targetCurrency) => {
    if (!targetCurrency || targetCurrency === 'USD') return 1.0;

    const cached = getCachedRate(targetCurrency);
    if (cached) return cached;

    // Deduplicate in-flight requests for same currency
    if (inflight.current[targetCurrency]) return inflight.current[targetCurrency];

    const promise = (async () => {
      try {
        const response = await base44.functions.invoke('getExchangeRate', { target: targetCurrency });
        const rate = response.data?.rate;
        if (!rate || typeof rate !== 'number' || rate <= 0) return 1.0;
        setCachedRate(targetCurrency, rate);
        return rate;
      } catch {
        return 1.0; // safe fallback — never return null/NaN
      } finally {
        delete inflight.current[targetCurrency];
      }
    })();

    inflight.current[targetCurrency] = promise;
    return promise;
  };

  useEffect(() => {
    const handleCurrencyChange = (event) => {
      setCurrencyState(event.detail.currency);
    };
    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => window.removeEventListener('currencyChange', handleCurrencyChange);
  }, []);

  return { currency, setCurrency, detectCurrency, getExchangeRate, loading, error };
}