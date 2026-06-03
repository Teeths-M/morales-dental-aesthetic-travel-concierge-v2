import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Inline circuit breaker and retry logic (avoid import issues)
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;

class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

async function retryWithBackoff(fn, options = {}) {
  const { retries = DEFAULT_RETRIES, backoff = 1000, timeout = DEFAULT_TIMEOUT } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const result = await fn({ signal: controller.signal });
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      lastError = error;
      if (!error.message.includes('aborted') || attempt === retries) {
        throw error;
      }
      const delay = backoff * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const circuitBreaker = new CircuitBreaker(3, 120000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Priority 1: Check cache
    const cacheKey = 'geo_cache_' + (req.headers.get('x-forwarded-for') || 'unknown');
    const cached = await getCache(cacheKey);
    if (cached) {
      return Response.json({ ...cached, source: 'cache' });
    }

    // Priority 2: Browser locale (if available from headers)
    const acceptLanguage = req.headers.get('accept-language');
    if (acceptLanguage) {
      const locale = parseLocale(acceptLanguage);
      if (locale) {
        const result = { country: locale.country, currency: locale.currency };
        await setCache(cacheKey, result);
        return Response.json({ ...result, source: 'locale' });
      }
    }

    // Priority 3: IP geolocation with retry
    try {
      const ipinfoApiKey = Deno.env.get("IPINFO_API_KEY");
      
      if (!ipinfoApiKey) {
        throw new Error('IPINFO_API_KEY not configured');
      }

      const ipinfoData = await circuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async ({ signal }) => {
            const response = await fetch(
              `https://ipinfo.io/json?token=${ipinfoApiKey}`,
              { signal, timeout: 5000 }
            );
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            return response.json();
          },
          { timeout: 6000, retries: 2 }
        );
      });

      let currencyCode = ipinfoData.currency || 'USD';
      const countryCode = ipinfoData.country;

      // Custom overrides
      const currencyMap = {
        'US': 'USD', 'CA': 'CAD', 'GB': 'GBP',
        'TT': 'TTD', 'GY': 'GYD', 'VE': 'USD',
      };

      if (currencyMap[countryCode]) {
        currencyCode = currencyMap[countryCode];
      }

      const result = { country: countryCode, currency: currencyCode };
      await setCache(cacheKey, result);
      
      return Response.json({ ...result, source: 'ipinfo' });
    } catch (ipError) {
      console.warn('IP geolocation failed:', ipError.message);
      
      // Priority 4: Timezone fallback
      const timezone = ipinfoData?.timezone || 'America/New_York';
      const fallback = timezoneToCurrency(timezone);
      
      return Response.json({ 
        country: fallback.country, 
        currency: fallback.currency,
        source: 'timezone_fallback'
      });
    }

  } catch (error) {
    console.error('Geolocation service failed:', error.message);
    
    // Priority 5: Safe default
    return Response.json({ 
      country: 'US', 
      currency: 'USD',
      source: 'default_fallback',
      error: 'Geolocation unavailable'
    });
  }
});

/**
 * Parse locale header to country/currency
 */
function parseLocale(acceptLanguage) {
  try {
    const primary = acceptLanguage.split(',')[0];
    const parts = primary.split('-');
    
    if (parts.length === 2) {
      const region = parts[1].toUpperCase();
      const currencyMap = {
        'US': 'USD', 'GB': 'GBP', 'CA': 'CAD',
        'AU': 'AUD', 'NZ': 'NZD', 'IE': 'EUR',
      };
      
      return {
        country: region,
        currency: currencyMap[region] || 'USD'
      };
    }
  } catch {}
  
  return null;
}

/**
 * Map timezone to default currency
 */
function timezoneToCurrency(timezone) {
  const tzCurrencyMap = {
    'America/New_York': { country: 'US', currency: 'USD' },
    'America/Toronto': { country: 'CA', currency: 'CAD' },
    'Europe/London': { country: 'GB', currency: 'GBP' },
    'America/Port_of_Spain': { country: 'TT', currency: 'TTD' },
    'America/Guyana': { country: 'GY', currency: 'GYD' },
    'America/Caracas': { country: 'VE', currency: 'USD' },
  };
  
  return tzCurrencyMap[timezone] || { country: 'US', currency: 'USD' };
}

/**
 * Cache helpers (using Base44 entities or in-memory for demo)
 */
const cache = new Map();

async function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > GEO_CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

async function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}