/**
 * Performance Monitoring Middleware
 * 
 * Lightweight performance tracking for Deno serverless functions.
 * Logs slow requests and provides health endpoint.
 * 
 * Usage:
 *   import { performanceMiddleware } from '@/lib/perfMonitor.js';
 *   
 *   Deno.serve(async (req) => {
 *     const perfEnd = performanceMiddleware.start(req);
 *     try {
 *       // ... handle request
 *       const response = Response.json({ success: true });
 *       perfEnd(response);
 *       return response;
 *     } catch (error) {
 *       perfEnd(null, error);
 *       throw error;
 *     }
 *   });
 */

// ── Configuration ────────────────────────────────────────────────────────────

const THRESHOLDS = {
  warning: 1000, // 1s
  critical: 3000, // 3s
};

const MEMORY_SAMPLE_INTERVAL = 60 * 1000; // 60s

// ── Metrics Storage ──────────────────────────────────────────────────────────

const metrics = {
  startTime: Date.now(),
  requestCount: 0,
  slowRequests: [],
  lastMemorySample: null,
};

// Sample memory usage periodically
setInterval(() => {
  try {
    // Deno global available in Deno runtime
     
    if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
       
      const mem = Deno.memoryUsage();
      metrics.lastMemorySample = {
        rss: Math.round(mem.rss / 1024 / 1024), // MB
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      };
    }
  } catch (_) {
    // Memory API not available
  }
}, MEMORY_SAMPLE_INTERVAL);

// ── Middleware Functions ─────────────────────────────────────────────────────

/**
 * Start performance timing for a request
 * 
 * @param {Request} req - The incoming request
 * @returns {Function} Function to call when request completes
 */
export function start(req) {
  const startTime = Date.now();
  const method = req.method;
  const path = new URL(req.url).pathname;
  
  return (response = null, error = null) => {
    const duration = Date.now() - startTime;
    
    metrics.requestCount++;
    
    // Log slow requests
    if (duration >= THRESHOLDS.warning) {
      const level = duration >= THRESHOLDS.critical ? 'CRITICAL' : 'WARNING';
      const logEntry = {
        timestamp: new Date().toISOString(),
        method,
        path,
        duration,
        status: response?.status || (error ? 500 : 200),
        error: error?.message,
      };
      
      metrics.slowRequests.push(logEntry);
      
      // Keep only last 100 slow requests
      if (metrics.slowRequests.length > 100) {
        metrics.slowRequests.shift();
      }
      
      // Log to console
      console.log(`[SLOW] ${method} ${path} ${duration}ms ${level}`);
      
      if (error) {
        console.error(`[PERF] Error: ${error.message}`);
      }
    }
  };
}

/**
 * Get current performance metrics
 */
export function getMetrics() {
  return {
    uptime: Math.round((Date.now() - metrics.startTime) / 1000), // seconds
    requestCount: metrics.requestCount,
    slowRequestsCount: metrics.slowRequests.length,
    memoryMB: metrics.lastMemorySample?.rss || null,
    lastMemorySample: metrics.lastMemorySample,
  };
}

/**
 * Get health status
 */
export function getHealthStatus() {
  const mem = metrics.lastMemorySample;
  
  return {
    status: 'ok',
    uptime: Math.round((Date.now() - metrics.startTime) / 1000),
    memoryMB: mem?.rss || null,
    heapUsedMB: mem?.heapUsed || null,
    requestCount: metrics.requestCount,
    slowRequestsLast100: metrics.slowRequests.slice(-10),
    timestamp: new Date().toISOString(),
  };
}

// ── Health Endpoint Handler ──────────────────────────────────────────────────

/**
 * Handle /health endpoint requests
 * 
 * Usage:
 *   Deno.serve(async (req) => {
 *     if (req.url.endsWith('/health')) {
 *       return handleHealthEndpoint(req);
 *     }
 *     // ... other routes
 *   });
 */
export function handleHealthEndpoint(req) {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  const health = getHealthStatus();
  return Response.json(health);
}

// ── Memory Utility ───────────────────────────────────────────────────────────

/**
 * Get current memory usage (Deno runtime)
 * @returns {number|null} Memory in MB
 */
export function getMemoryUsage() {
  try {
    // Deno global available in Deno runtime
     
    if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
       
      const mem = Deno.memoryUsage();
      return Math.round(mem.rss / 1024 / 1024); // MB
    }
  } catch (_) {
    // Memory API not available
  }
  return null;
}