import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useCurrency() {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('appCurrency') || 'USD';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect currency on first load (only if not already set in localStorage)
  useEffect(() => {
    const savedCurrency = localStorage.getItem('appCurrency');
    if (!savedCurrency) {
      detectCurrency();
    }
  }, []);

  const detectCurrency = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getGeolocationAndCurrency', {});
      const { currency: detectedCurrency } = response.data;
      setCurrency(detectedCurrency);
    } catch (err) {
      console.error('Failed to detect currency:', err);
      setError(err.message);
      // Fallback to USD
      setCurrency('USD');
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = (curr) => {
    localStorage.setItem('appCurrency', curr);
    setCurrencyState(curr);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: curr } }));
  };

  const getExchangeRate = async (targetCurrency) => {
    try {
      const response = await base44.functions.invoke('getExchangeRate', {
        base: currency,
        target: targetCurrency
      });
      return response.data.rate;
    } catch (err) {
      console.error('Failed to get exchange rate:', err);
      return 1.0; // Fallback
    }
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