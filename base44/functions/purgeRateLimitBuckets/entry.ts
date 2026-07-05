import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled cleanup — removes RateLimitBucket records older than 1 hour.
// Runs every 6 hours via automation to prevent unbounded table growth.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({}, '-updated_at', 500);
    const stale = buckets.filter(b => b.updated_at < cutoff);

    let deleted = 0;
    for (const b of stale) {
      await base44.asServiceRole.entities.RateLimitBucket.delete(b.id);
      deleted++;
    }

    return Response.json({ success: true, deleted, remaining: buckets.length - deleted });
  } catch (error) {
    console.error('[purgeRateLimitBuckets]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});