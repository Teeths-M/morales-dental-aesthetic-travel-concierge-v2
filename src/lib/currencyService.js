/**
 * Currency Service with Caching and Fallback Logic
 * Master currency: USD
 * All conversions flow from USD → Target
 */

import { retryWithBackoff, CircuitBreaker } from './serviceLayer.js';

const CACHE_PREFIX = 'currency_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const FALLBACK_RATES = {
  USD: 1.0,
  CAD: 1.35,
  GBP: 0.79,
  EUR: 0.92,
  TTD: 6.78,
  GYD: 209.0,
  AUD: 1.52,
  NZD: 1.65,
};

class CurrencyService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker(3, 120000); // 3 failures, 2min reset
    this.cache = new Map();
  }

  /**
   * Get exchange rate with caching and retry logic
   * Always converts from USD to prevent chain conversion errors
   */
  async getRate(targetCurrency, baseCurrency = 'USD') {
    // Same currency - no conversion needed
    if (baseCurrency === targetCurrency) {
      return { rate: 1.0, source: 'identity' };
    }

    // Normalize to USD base
    const normalizedTarget = targetCurrency.toUpperCase();
    const cacheKey = `${CACHE_PREFIX}USD_${normalizedTarget}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { rate: cached, source: 'cache' };
    }

    try {
      // Use circuit breaker for API calls
      const rate = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async ({ signal }) => {
            const response = await fetch(
              `https://v6.exchangerate-api.com/v6/${Deno.env.get('EXCHANGERATE_API_KEY')}/latest/USD`,
              { signal }
            );
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (data.result !== 'success') {
              throw new Error('API returned error');
            }
            
            return data.conversion_rates[normalizedTarget];
          },
          { timeout: 8000, retries: 2 }
        );
      });

      if (!rate) {
        throw new Error('Rate not found');
      }

      // Cache the result
      this.setCache(cacheKey, rate);

      // If base is not USD, convert: Base → USD → Target
      if (baseCurrency !== 'USD') {
        const baseToUsd = await this.getRate(baseCurrency, 'USD');
        const finalRate = rate / baseToUsd.rate;
        return { rate: finalRate, source: 'calculated' };
      }

      return { rate, source: 'api' };
    } catch (error) {
      console.error('Currency API failed:', error.message);
      
      // Fallback to hardcoded rates
      const fallbackRate = FALLBACK_RATES[normalizedTarget];
      if (fallbackRate) {
        return { rate: fallbackRate, source: 'fallback' };
      }

      // Last resort: return 1.0
      console.warn(`No fallback rate for ${normalizedTarget}, using 1.0`);
      return { rate: 1.0, source: 'default' };
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(amount, fromCurrency, toCurrency) {
    const { rate } = await this.getRate(toCurrency, fromCurrency);
    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Format currency for display
   */
  format(amount, currency, locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Cache helpers
   */
  getCached(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const { value, timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  }

  setCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Cache write failed:', error.message);
    }
  }

  /**
   * Clear cache (for admin use)
   */
  clearCache() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

// Singleton instance
export const currencyService = new CurrencyService();

/**
 * React hook for currency operations
 */
export function useCurrencyService() {
  const [currency, setCurrencyState] = useState(() => {
    return typeof window !== 'undefined' 
      ? localStorage.getItem('appCurrency') || 'USD'
      : 'USD';
  });

  const setCurrency = (curr) => {
    localStorage.setItem('appCurrency', curr);
    setCurrencyState(curr);
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: { currency: curr } }));
  };

  const convert = async (amount, targetCurrency) => {
    return await currencyService.convert(amount, currency, targetCurrency);
  };

  const getRate = async (targetCurrency) => {
    const result = await currencyService.getRate(targetCurrency, currency);
    return result.rate;
  };

  const format = (amount, targetCurrency = currency) => {
    return currencyService.format(amount, targetCurrency);
  };

  return { currency, setCurrency, convert, getRate, format };
}