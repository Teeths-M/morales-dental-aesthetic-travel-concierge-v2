/**
 * Service Layer Abstraction for External APIs
 * Provides retry logic, timeout protection, and circuit breaker patterns
 */

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF = 1000; // 1 second

class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
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

  getState() {
    return this.state;
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    retries = DEFAULT_RETRIES,
    backoff = DEFAULT_BACKOFF,
    timeout = DEFAULT_TIMEOUT,
    shouldRetry = (error) => true,
  } = options;

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
      
      if (!shouldRetry(error) || attempt === retries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = backoff * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Request deduplication cache
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicate(key, fn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeForLogging(obj, fieldsToRedact = ['password', 'token', 'apiKey', 'secret', 'email']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const field of fieldsToRedact) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

export { CircuitBreaker, retryWithBackoff, RequestDeduplicator };