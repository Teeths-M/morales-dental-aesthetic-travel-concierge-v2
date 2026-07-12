import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// ── k6 load harness (b): publicDoctorCheck IP rate-limit ──────────────────────
// Confirms the public "Check Your Doctor" look-up enforces its per-IP cap
// (15/hour via the cyd_ip_hour_<ip> RateLimitBucket) and returns 429 past it.
// A single VU = a single source IP, so firing more than the cap in one window
// must produce at least one 429 and never let more than the cap through.
//
// ── INERT BY DEFAULT ──────────────────────────────────────────────────────────
// Refuses to run unless pointed at a NON-PRODUCTION target; never runs against
// production (guarded in the init block).
//
// ⚠️ COST: every NON-limited (200) request triggers InvokeLLM on the backend and
// burns integration credits. Run only against a non-prod target you're OK
// spending credits on, and keep REQUESTS modest (a little over the cap is enough
// to prove the trip). If the target is out of credits every call returns 402 and
// the run FAILS by design (a rate limit can't be proven through a credit wall).
//
//   k6 run -e LOAD_TARGET=https://<staging-host> [-e REQUESTS=30] \
//          tests/load/public-doctor-check-ratelimit.js

const TARGET = __ENV.LOAD_TARGET;
const APP_ID = __ENV.APP_ID || '6a01c1305c540b75f24dd373';
const REQUESTS = Number(__ENV.REQUESTS || 30);
const HOURLY_CAP = 15; // publicDoctorCheck cyd_ip_hour cap

const PROD_HOSTS = [/sentinel-dental-care\.base44\.app/i];
if (!TARGET) throw new Error('Refusing to run: set LOAD_TARGET to a NON-PRODUCTION base URL.');
if (PROD_HOSTS.some((re) => re.test(TARGET))) throw new Error(`Refusing to run against production: ${TARGET}`);

const fnUrl = (name) => `${TARGET}/api/apps/${APP_ID}/functions/${name}`;

const ok200 = new Counter('ok_200');
const limited429 = new Counter('limited_429');
const unexpected = new Counter('unexpected');

// A benign, fixed payload — all three fields are required or the endpoint 400s.
const PAYLOAD = JSON.stringify({
  doctor_name: 'Load Test Doctor',
  clinic: 'Load Test Clinic',
  location: 'Costa Rica',
});

export const options = {
  scenarios: {
    hammer_from_one_ip: {
      executor: 'shared-iterations',
      vus: 1, // single VU => single IP, so the per-IP cap applies
      iterations: REQUESTS,
      maxDuration: '2m',
    },
  },
  thresholds: {
    limited_429: ['count>=1'],               // the cap MUST trip
    ok_200: [`count<=${HOURLY_CAP}`],         // and never let more than the cap through
    unexpected: ['count<=0'],                 // no 402/500 masking the result
  },
};

export default function () {
  const res = http.post(fnUrl('publicDoctorCheck'), PAYLOAD, { headers: { 'Content-Type': 'application/json' } });
  if (res.status === 200) ok200.add(1);
  else if (res.status === 429) limited429.add(1);
  else {
    unexpected.add(1);
    console.error(`Unexpected response: HTTP ${res.status} ${res.body}`);
  }
  check(res, { 'status is 200 or 429': (r) => r.status === 200 || r.status === 429 });
}

export function handleSummary(data) {
  const count = (m) => (data.metrics[m] ? data.metrics[m].values.count : 0);
  const ok = count('ok_200');
  const limited = count('limited_429');
  const u = count('unexpected');
  const pass = limited >= 1 && ok <= HOURLY_CAP && u === 0;
  return {
    stdout: `\npublicDoctorCheck rate-limit: 200=${ok} 429=${limited} unexpected=${u} → ${pass ? 'PASS — cap enforced' : 'FAIL'}\n`,
  };
}
