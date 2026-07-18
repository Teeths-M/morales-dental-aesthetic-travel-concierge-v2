import { chromium, devices } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'https://sentinel-dental-care.base44.app';

const ROUTES = [
  '/', '/about', '/booking', '/consultation', '/consultation-success', '/deep-perfection',
  '/discover', '/emergency', '/how-it-works', '/intake', '/login', '/nearby', '/offline-guide',
  '/onboarding', '/partners', '/privacy', '/procedures', '/protect', '/providers',
  '/register-role', '/signup', '/terms', '/travel-concierge', '/travel-intake',
  '/partner-signup', '/partner-signup/travel-agency', '/partner-signup/taxi-service',
  '/companion-signup', '/security-signup', '/doctor-signup', '/local-doctor-signup',
  '/demo', '/demo/arrival', '/demo/coverage', '/demo/emergency', '/demo/evn', '/demo/family',
  '/demo/intelligence', '/demo/james', '/demo/journey', '/demo/language', '/demo/medguard',
  '/demo/mesh-beacon', '/demo/mission-control', '/demo/nightlife', '/demo/recovery',
  '/demo/recovery-cascade', '/demo/silent', '/demo/siobhan', '/demo/situation-room',
  '/demo/tap', '/demo/trust', '/demo/waiting', '/demo/weather', '/demo/cheatsheet', '/demo/emails',
];

const mobile = process.argv.includes('--mobile');

const results = [];

const browser = await chromium.launch();
const ctx = await browser.newContext(
  mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } },
);

for (const route of ROUTES) {
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const badRequests = [];

  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('response', (r) => {
    const s = r.status();
    if (s >= 400) badRequests.push(`${s} ${r.url().replace(BASE, '').slice(0, 110)}`);
  });

  let navError = null;
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500); // let lazy chunks + first fetches settle
  } catch (e) {
    navError = String(e.message || e).slice(0, 150);
  }

  let boundary = 0;
  let visibleText = 0;
  let horizontalOverflow = false;
  try {
    boundary = await page.getByText("Something didn't work the way it should have.").count();
    visibleText = (await page.locator('body').innerText().catch(() => '')).trim().length;
    horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
  } catch { /* page may be dead */ }

  results.push({ route, navError, pageErrors, consoleErrors, badRequests, boundary, visibleText, horizontalOverflow });
  await page.close();
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────
const label = mobile ? 'MOBILE (iPhone 13)' : 'DESKTOP (1440x900)';
console.log(`\n=========== CRASH SWEEP — ${label} — ${ROUTES.length} routes ===========\n`);

const crashed = results.filter((r) => r.navError || r.boundary > 0 || r.visibleText < 40);
const errored = results.filter((r) => r.pageErrors.length > 0);
const netFail = results.filter((r) => r.badRequests.length > 0);
const overflow = results.filter((r) => r.horizontalOverflow);
const consoleBad = results.filter((r) => r.consoleErrors.length > 0);

console.log(`CRASHED / BLANK / ERROR-BOUNDARY : ${crashed.length}`);
for (const r of crashed) {
  console.log(`   ✗ ${r.route}  [boundary=${r.boundary} textLen=${r.visibleText}]${r.navError ? ' nav=' + r.navError : ''}`);
}

console.log(`\nUNCAUGHT JS EXCEPTIONS : ${errored.length}`);
for (const r of errored) {
  console.log(`   ✗ ${r.route}`);
  for (const e of [...new Set(r.pageErrors)].slice(0, 3)) console.log(`       ${e}`);
}

console.log(`\nFAILED NETWORK REQUESTS : ${netFail.length}`);
for (const r of netFail) {
  console.log(`   ! ${r.route}`);
  for (const b of [...new Set(r.badRequests)].slice(0, 4)) console.log(`       ${b}`);
}

if (mobile) {
  console.log(`\nHORIZONTAL OVERFLOW (mobile) : ${overflow.length}`);
  for (const r of overflow) console.log(`   ! ${r.route}`);
}

console.log(`\nCONSOLE ERRORS : ${consoleBad.length}`);
for (const r of consoleBad.slice(0, 12)) {
  console.log(`   · ${r.route}`);
  for (const e of [...new Set(r.consoleErrors)].slice(0, 2)) console.log(`       ${e}`);
}
console.log('\n=========== END ===========\n');
