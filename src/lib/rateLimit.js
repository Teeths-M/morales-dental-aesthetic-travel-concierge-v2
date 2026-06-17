/**
 * Rate Limiter — Sliding Window Algorithm
 * 
 * Production-grade rate limiting for Deno serverless functions.
 * Uses in-memory storage with TTL (Redis can be added later).
 * 
 * Usage:
 *   import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit.js';
 *   
 *   Deno.serve(async (req) => {
 *     const limitResult = await rateLimit(req, 'default');
 *     if (!limitResult.allowed) {
 *       return limitResult.response; // 429 with Retry-After
 *     }
 *     // ... continue with request
 *   });
 */

// ── Rate Limit Configurations ────────────────────────────────────────────────

export const RATE_LIMITS = {
  // Default: 100 req / 15 min per IP
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  
  // Auth routes: 5 req / 15 min per IP
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  
  // AI / heavy compute: 10 req / 1 min per user ID
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  
  // Public unauthenticated: 30 req / 1 min per IP
  public: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
};

// ── In-Memory Storage with TTL ───────────────────────────────────────────────

const requestStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestStore.entries()) {
    if (now - value.windowStart > value.windowMs) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Extract client IP from request headers
 * Uses rightmost trusted proxy IP to prevent spoofing
 */
function getClientIP(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  
  if (forwarded) {
    // Use rightmost trusted IP (last in chain before our proxy)
    const ips = forwarded.split(',').map(ip => ip.trim());
    // Return the last IP that looks valid
    for (let i = ips.length - 1; i >= 0; i--) {
      if (ips[i] && ips[i] !== 'unknown') {
        return ips[i];
      }
    }
  }
  
  return 'unknown';
}

/**
 * Get identifier for rate limiting
 * - Authenticated requests: user ID
 * - Unauthenticated: IP address
 */
async function getIdentifier(req, base44, useUserId = true) {
  if (useUserId) {
    try {
      const user = await base44.auth.me();
      if (user && user.id) {
        return `user:${user.id}`;
      }
    } catch (_) {
      // Not authenticated or error
    }
  }
  
  return `ip:${getClientIP(req)}`;
}

// ── Progressive Penalty Tracking ─────────────────────────────────────────────

const penaltyStore = new Map();

function getPenaltyBlock(identifier, breachCount) {
  // 1st breach = 1 min, 2nd = 15 min, 3rd+ = 1 hr
  const blocks = [60, 900, 3600];
  const blockSeconds = blocks[Math.min(breachCount, blocks.length - 1)];
  return blockSeconds * 1000;
}

function recordBreach(identifier) {
  const record = penaltyStore.get(identifier) || { count: 0, lastBreach: 0 };
  record.count++;
  record.lastBreach = Date.now();
  penaltyStore.set(identifier, record);
  return record.count;
}

function checkActiveBlock(identifier) {
  const record = penaltyStore.get(identifier);
  if (!record) return null;
  
  const blockMs = getPenaltyBlock(identifier, record.count);
  const elapsed = Date.now() - record.lastBreach;
  
  if (elapsed < blockMs) {
    return Math.ceil((blockMs - elapsed) / 1000); // seconds remaining
  }
  
  // Block expired, reset
  penaltyStore.delete(identifier);
  return null;
}

// ── Main Rate Limiting Function ──────────────────────────────────────────────

/**
 * Apply rate limiting to a request
 * 
 * @param {Request} req - The incoming request
 * @param {Object} base44 - Base44 SDK instance (for auth.me())
 * @param {string} limitType - 'default' | 'auth' | 'ai' | 'public'
 * @param {boolean} useUserId - Whether to use user ID for authenticated requests
 * @returns {Promise<{allowed: boolean, response?: Response, headers: Object}>}
 */
export async function rateLimit(req, base44, limitType = 'default', useUserId = true) {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const identifier = await getIdentifier(req, base44, useUserId);
  
  // Check for active progressive block
  const activeBlock = checkActiveBlock(identifier);
  if (activeBlock) {
    return {
      allowed: false,
      response: Response.json({
        error: 'rate_limit_exceeded',
        message: `Too many requests. Retry after ${activeBlock}s.`,
        retry_after: activeBlock,
      }, {
        status: 429,
        headers: {
          'Retry-After': activeBlock.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor((Date.now() + activeBlock * 1000) / 1000).toString(),
        },
      }),
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor((Date.now() + activeBlock * 1000) / 1000).toString(),
      },
    };
  }
  
  const now = Date.now();
  const key = `${limitType}:${identifier}`;
  let record = requestStore.get(key);
  
  // Initialize or reset window
  if (!record || now - record.windowStart > config.windowMs) {
    record = {
      windowStart: now,
      count: 0,
      requests: [],
      windowMs: config.windowMs,
    };
  }
  
  // Remove requests outside current window (sliding window)
  record.requests = record.requests.filter(
    timestamp => now - timestamp < config.windowMs
  );
  
  const currentCount = record.requests.length;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  const resetTime = Math.floor((record.windowStart + config.windowMs) / 1000);
  
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  };
  
  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    const breachCount = recordBreach(identifier);
    const blockSeconds = Math.ceil(getPenaltyBlock(identifier, breachCount) / 1000);
    
    console.warn(`[RateLimit] ${limitType} limit exceeded for ${identifier}. Breach #${breachCount}. Block: ${blockSeconds}s`);
    
    // Log to admin for 3rd+ breach
    if (breachCount >= 3) {
      console.error(`[RateLimit] CRITICAL: Repeated violations by ${identifier}. Admin notification recommended.`);
    }
    
    return {
      allowed: false,
      response: Response.json({
        error: 'rate_limit_exceeded',
        message: `Too many requests. Retry after ${blockSeconds}s.`,
        retry_after: blockSeconds,
      }, {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': blockSeconds.toString(),
        },
      }),
      headers,
    };
  }
  
  // Record this request
  record.requests.push(now);
  requestStore.set(key, record);
  
  return {
    allowed: true,
    headers,
  };
}

// ── Response Wrapper Helper ──────────────────────────────────────────────────

/**
 * Wrap a response with rate limit headers
 */
export function withRateLimitHeaders(response, headers) {
  if (!response || !headers) return response;
  
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}