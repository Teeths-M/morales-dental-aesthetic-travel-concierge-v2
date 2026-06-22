/**
 * Health Check Endpoint
 * 
 * Returns system health status for monitoring and load balancers.
 * Public endpoint - no auth required.
 */

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const health = {
    status: 'ok',
    uptime: Math.round((Date.now() - processStartTime) / 1000),
    memoryMB: getMemoryUsage(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  return Response.json(health);
});

const processStartTime = Date.now();

function getMemoryUsage() {
  try {
    if (Deno.memoryUsage) {
      const mem = Deno.memoryUsage();
      return Math.round(mem.rss / 1024 / 1024); // MB
    }
  } catch (_) {
    // Memory API not available
  }
  return null;
}