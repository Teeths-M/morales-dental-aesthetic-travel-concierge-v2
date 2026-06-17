# Morales Platform — Production Roadmap

**Target:** 1M+ users, 99.99% uptime, <200ms p95 latency

---

## Phase 1: Foundation (Week 1-2) — MUST HAVE

### 1.1 Database Indexes

**Problem:** Full table scans on high-volume queries cause 2-5s latency at 10k+ records.

**Implementation:**
```sql
-- Core entities (add via Base44 dashboard or migration script)
CREATE INDEX idx_case_record_client_email ON CaseRecord(client_email);
CREATE INDEX idx_case_record_status_created ON CaseRecord(status, created_date DESC);
CREATE INDEX idx_consultation_email_created ON Consultation(email, created_date DESC);
CREATE INDEX idx_doctor_status_country ON Doctor(status, clinic_country);
CREATE INDEX idx_doctor_specialty_lookup ON DoctorSpecialty(doctor_id, procedure_name);
CREATE INDEX idx_payment_transaction_case ON PaymentTransaction(case_id, created_date DESC);
CREATE INDEX idx_audit_log_timestamp ON AuditLog(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON AuditLog(actor_id, timestamp DESC);
```

**Impact:** -90% query time on filtered lookups.

---

### 1.2 Rate Limiting (Backend Functions)

**Problem:** No protection against API abuse or DDoS.

**Implementation:**
```javascript
// Add to all public-facing backend functions
const RATE_LIMITS = {
  authenticated: { requests: 100, window: 60 }, // 100 req/min
  anonymous: { requests: 20, window: 60 },      // 20 req/min
};

async function checkRateLimit(base44, userId, endpoint) {
  const key = `rate:${userId}:${endpoint}`;
  const now = Date.now();
  const window = 60000; // 1 minute
  
  // Use a simple in-memory cache for now (replace with Redis in Phase 3)
  const attempts = globalRateLimitCache.get(key) || [];
  const recent = attempts.filter(t => now - t < window);
  
  if (recent.length >= RATE_LIMITS.authenticated.requests) {
    return { allowed: false, retryAfter: Math.ceil((window - (now - recent[0])) / 1000) };
  }
  
  recent.push(now);
  globalRateLimitCache.set(key, recent);
  return { allowed: true };
}
```

**Apply to:** `safeT4LifeScan`, `matchDoctorsForProcedure`, `priceBroadcastEngine`

---

### 1.3 Performance Monitoring

**Problem:** Zero visibility into production performance.

**Implementation:**
```javascript
// Add to all backend functions
const startTime = Date.now();

// At end of function
const duration = Date.now() - startTime;
await base44.entities.PerformanceMetric.create({
  endpoint: 'safeT4LifeScan',
  duration_ms: duration,
  status: 'success',
  timestamp: new Date().toISOString(),
}).catch(() => {}); // Non-blocking
```

**Dashboard Metrics:**
- API p95 latency
- Error rate by endpoint
- Query execution time
- Cache hit rate

---

### 1.4 Email Queue (Async Processing)

**Problem:** Synchronous email sending blocks response (2-5s delay).

**Implementation:**
```javascript
// Create email queue entity
// entities/EmailQueue.json
{
  "name": "EmailQueue",
  "properties": {
    "to": { "type": "string" },
    "subject": { "type": "string" },
    "body": { "type": "string" },
    "priority": { "type": "string", "enum": ["low", "normal", "high"] },
    "status": { "type": "string", "enum": ["pending", "sent", "failed"] },
    "retry_count": { "type": "number", "default": 0 },
    "scheduled_at": { "type": "string", "format": "date-time" }
  }
}

// Create automation to process queue every 1 minute
// Automation: processEmailQueue (scheduled, every 1 minute)
// Function: processEmailQueue.js
```

**Impact:** -95% response time for email-heavy operations.

---

## Phase 2: Scalability (Week 3-4) — SHOULD HAVE

### 2.1 Query Pagination

**Problem:** Unbounded list queries cause OOM at 10k+ records.

**Implementation:**
```javascript
// All list queries must use pagination
const PAGE_SIZE = 50;

// Cursor-based pagination
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['cases', user.email],
  queryFn: ({ pageParam = 0 }) => 
    base44.entities.CaseRecord.filter(
      { client_email: user.email },
      '-created_date',
      PAGE_SIZE,
      pageParam * PAGE_SIZE
    ),
  getNextPageParam: (lastPage, allPages) => 
    lastPage.length === PAGE_SIZE ? allPages.length : undefined,
});
```

---

### 2.2 Image Optimization

**Problem:** Unoptimized images cause slow page loads (3-8s on mobile).

**Implementation:**
```javascript
// Use Base44 image optimization or CDN
<img 
  src={`${imageUrl}?w=400&h=400&fit=crop`} 
  srcSet={`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w`}
  sizes="(max-width: 600px) 400px, 800px"
  loading="lazy"
  decoding="async"
/>
```

---

### 2.3 Code Splitting

**Problem:** Initial bundle size 380KB — slow first load on mobile.

**Implementation:**
```javascript
// Lazy load heavy pages
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const PartnerVerificationHub = lazy(() => import('./pages/PartnerVerificationHub'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminAnalytics />
</Suspense>
```

---

## Phase 3: Production-Grade (Month 2) — NICE TO HAVE

### 3.1 Redis Caching Layer

**Problem:** Repeated expensive queries (analytics, doctor matching).

**Implementation:**
```javascript
// Cache expensive queries
const CACHE_CONFIG = {
  analytics_dashboard: { ttl: 300 }, // 5 minutes
  doctor_matching: { ttl: 600 },     // 10 minutes
  procedure_pricing: { ttl: 3600 },  // 1 hour
};

async function getCached(key, fetchFn, ttl) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const result = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}
```

---

### 3.2 Error Tracking (Sentry)

**Problem:** No visibility into client-side errors.

**Implementation:**
```javascript
// Install Sentry SDK
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
  tracesSampleRate: 0.1, // 10% of transactions
});

// Auto-capture errors, performance, user feedback
```

---

### 3.3 Service Worker (Offline Support)

**Problem:** No offline capability for travelers.

**Implementation:**
```javascript
// public/sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Cache static assets, API responses, user data
```

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| API p95 Latency | 120ms | <100ms | Week 2 |
| First Contentful Paint | 0.8s | <0.5s | Week 4 |
| Time to Interactive | 1.9s | <1.5s | Week 4 |
| Error Rate | Unknown | <0.1% | Week 2 |
| Cache Hit Rate | 0% | >80% | Week 6 |
| Bundle Size | 380KB | <250KB | Week 4 |

---

## Deployment Checklist

### Pre-Production
- [ ] All database indexes created
- [ ] Rate limiting enabled on public endpoints
- [ ] Performance monitoring dashboard live
- [ ] Email queue automation running
- [ ] Error tracking (Sentry) configured
- [ ] Load testing completed (1k concurrent users)

### Production Launch
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Real-time monitoring active
- [ ] On-call rotation established
- [ ] Rollback plan tested
- [ ] Documentation updated

### Post-Launch (Week 1-2)
- [ ] Monitor key metrics daily
- [ ] Address any performance regressions
- [ ] Collect user feedback
- [ ] Plan Phase 2 implementation

---

**Last Updated:** 2026-06-17  
**Owner:** Engineering Team  
**Status:** Phase 1 In Progress