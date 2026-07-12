import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// ── k6 load harness (a): capacity CAS under contention ────────────────────────
// Proves capacityCheck.confirm_booking never double-books the last slot. The
// server guard is an ATOMIC conditional increment:
//     updateMany({ year_month, confirmed_count: { $lt: capacity_limit } },
//                { $inc: { confirmed_count: 1 } })
// so two racers for the final slot can't both read the same pre-increment count.
// This harness fires N simultaneous confirm_booking calls at a month seeded to
// EXACTLY ONE remaining slot and asserts that EXACTLY ONE wins (200) and every
// other is correctly told the month is full (409).
//
// ── INERT BY DEFAULT ──────────────────────────────────────────────────────────
// Refuses to run unless you point it at a NON-PRODUCTION target. Never runs
// against production (guarded in setup). confirm_booking requires auth, so a
// test-user session token is mandatory.
//
//   k6 run \
//     -e LOAD_TARGET=https://<staging-host> \
//     -e TOKEN=<session bearer for an authenticated test user> \
//     -e YEAR_MONTH=2027-01 \
//     [-e ADMIN_TOKEN=<admin bearer to auto-seed the month to 1 slot>] \
//     [-e VUS=25] \
//     tests/load/confirm-booking-cas.js
//
// Without ADMIN_TOKEN, seed the month to exactly (capacity_limit - 1) confirmed
// before running. Same-token racers still exercise the atomic guard; use distinct
// per-user tokens if you also want to model different patients.

const TARGET = __ENV.LOAD_TARGET;
const APP_ID = __ENV.APP_ID || '6a01c1305c540b75f24dd373';
const TOKEN = __ENV.TOKEN;
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN;
const YEAR_MONTH = __ENV.YEAR_MONTH;
const VUS = Number(__ENV.VUS || 25);

const PROD_HOSTS = [/sentinel-dental-care\.base44\.app/i];

const fnUrl = (name) => `${TARGET}/api/apps/${APP_ID}/functions/${name}`;
const authHeaders = (tok) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` });

const winners = new Counter('winners');
const conflicts = new Counter('conflicts');
const unexpected = new Counter('unexpected');

export const options = {
  scenarios: {
    race_for_last_slot: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1, // each VU makes exactly one confirm attempt, fired together
      maxDuration: '30s',
    },
  },
  // Load-bearing assertions (drive the k6 exit code): exactly one winner, no errors.
  thresholds: {
    winners: ['count>=1', 'count<=1'], // exactly 1 — the whole point
    unexpected: ['count<=0'],          // no 401/500/timeouts polluting the result
  },
};

export function setup() {
  if (!TARGET) throw new Error('Refusing to run: set LOAD_TARGET to a NON-PRODUCTION base URL.');
  if (PROD_HOSTS.some((re) => re.test(TARGET))) throw new Error(`Refusing to run against production: ${TARGET}`);
  if (!TOKEN) throw new Error('Set TOKEN to an authenticated test-user session bearer (confirm_booking requires auth).');
  if (!YEAR_MONTH) throw new Error('Set YEAR_MONTH to the capacity month under test, e.g. 2027-01.');

  // Optional auto-seed: force the month to exactly one remaining slot so the run
  // is repeatable. Requires an admin token (update_capacity is admin-only).
  if (ADMIN_TOKEN) {
    const chk = http.post(
      fnUrl('capacityCheck'),
      JSON.stringify({ action: 'check', year_month: YEAR_MONTH }),
      { headers: authHeaders(ADMIN_TOKEN) },
    );
    const body = chk.json();
    const recordId = body && body.capacity_record_id;
    const limit = body && body.capacity_limit;
    if (!recordId || typeof limit !== 'number') {
      throw new Error(`Could not read capacity for ${YEAR_MONTH}: HTTP ${chk.status} ${chk.body}`);
    }
    const seed = http.post(
      fnUrl('capacityCheck'),
      JSON.stringify({ action: 'update_capacity', record_id: recordId, updates: { confirmed_count: limit - 1 } }),
      { headers: authHeaders(ADMIN_TOKEN) },
    );
    if (seed.status !== 200) throw new Error(`Failed to seed month to 1 slot: HTTP ${seed.status} ${seed.body}`);
  }
  return {};
}

export default function () {
  const res = http.post(
    fnUrl('capacityCheck'),
    JSON.stringify({ action: 'confirm_booking', year_month: YEAR_MONTH }),
    { headers: authHeaders(TOKEN) },
  );
  if (res.status === 200 && res.json('success') === true) {
    winners.add(1);
  } else if (res.status === 409) {
    conflicts.add(1);
  } else {
    unexpected.add(1);
    console.error(`Unexpected response: HTTP ${res.status} ${res.body}`);
  }
  check(res, { 'status is 200 or 409': (r) => r.status === 200 || r.status === 409 });
}

export function handleSummary(data) {
  const count = (m) => (data.metrics[m] ? data.metrics[m].values.count : 0);
  const w = count('winners');
  const c = count('conflicts');
  const u = count('unexpected');
  const pass = w === 1 && u === 0;
  return {
    stdout: `\ncapacity CAS contention: winners=${w} conflicts=${c} unexpected=${u} → ${pass ? 'PASS — no double-booking' : 'FAIL'}\n`,
  };
}
