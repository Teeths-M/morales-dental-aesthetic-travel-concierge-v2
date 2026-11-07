import {
  addBreadcrumb,
  describeTarget,
  findInteractive,
  noteRoute,
  redactPath,
} from '@/lib/breadcrumbs';
import { createRageClickDetector } from '@/lib/rageClick';
import { reportIncident } from '@/lib/incidentReporting';

/**
 * installUxSignals — keeps the breadcrumb trail (src/lib/breadcrumbs.js)
 * and reports rage clicks (src/lib/rageClick.js). Call once from main.jsx.
 *
 * A rage click is reported as a low-severity incident with source
 * "ux_signal", so it never sends an alert email and never counts toward the
 * public System Health numbers, which only count real errors. At most three
 * are reported per page load, and the same control on the same page only
 * once.
 *
 * Every listener is passive and wrapped so it can never block or break a
 * real click.
 */

export const MAX_RAGE_REPORTS_PER_PAGE_LOAD = 3;

let installed = false;

export function installUxSignals() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  const detect = createRageClickDetector();
  const ids = new WeakMap();
  let nextId = 1;
  const keyFor = (el) => {
    if (!ids.has(el)) ids.set(el, nextId++);
    return ids.get(el);
  };
  const reported = new Set();
  let reports = 0;
  const syncRoute = () => noteRoute(window.location.pathname);

  syncRoute();
  window.addEventListener('popstate', syncRoute);

  document.addEventListener('click', (event) => {
    try {
      syncRoute();
      const el = findInteractive(event.target);
      if (!el) return;
      const target = describeTarget(el, { origin: window.location.origin });
      if (target) addBreadcrumb('click', target);
    } catch {
      // Never let the trail get in the way of a real click.
    }
  }, { capture: true, passive: true });

  // pointerdown, not click: a disabled button never fires a click, and
  // tapping a disabled button again and again is exactly the frustration
  // worth knowing about.
  document.addEventListener('pointerdown', (event) => {
    try {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const raw = event.target;
      if (!raw || typeof raw !== 'object') return;
      const el = findInteractive(raw) || raw;
      const t = Number.isFinite(event.timeStamp) && event.timeStamp > 0 ? event.timeStamp : Date.now();
      if (!detect({ key: keyFor(el), x: event.clientX, y: event.clientY, t })) return;

      const target = describeTarget(el, { origin: window.location.origin });
      if (!target) return;
      syncRoute();
      addBreadcrumb('rage_click', target);

      const page = redactPath(window.location.pathname);
      const dedupe = `${target}@${page}`;
      if (reported.has(dedupe) || reports >= MAX_RAGE_REPORTS_PER_PAGE_LOAD) return;
      reported.add(dedupe);
      reports += 1;
      reportIncident({
        severity: 'low',
        source: 'ux_signal',
        feature: 'rage-click',
        page,
        errorMessage: `Repeated clicks on ${target}`,
      });
    } catch {
      // Same as above.
    }
  }, { capture: true, passive: true });
}
