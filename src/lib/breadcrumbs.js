/**
 * breadcrumbs — a short trail of what a visitor did just before something
 * went wrong: the pages they moved through and the controls they clicked.
 * Every incident report carries it (src/lib/incidentReporting.js), so a
 * vague report like "it just froze" arrives with some context.
 *
 * It never records what anyone typed, chose, or read on screen:
 *   - No field values.
 *   - No button text and no aria-labels. In this app those can carry health
 *     details (a condition pill's text is the condition) or something a
 *     person typed (a "Remove '<your search>'" label).
 *   - A click is described only by the kind of control and a name a
 *     developer gave it on purpose: data-breadcrumb, data-testid, a plain
 *     static id, or a form control's name.
 *   - Paths are kept without query strings, and any part that isn't a plain
 *     lowercase word (private link tokens, record ids) becomes ":id".
 *   - Anything inside an element marked data-private, or
 *     data-breadcrumb="off", isn't recorded at all.
 *
 * This is deliberately not session replay, and must never grow into it.
 */

export const MAX_BREADCRUMBS = 15;
export const MAX_TARGET_LENGTH = 80;
export const BREADCRUMB_KINDS = ['route', 'click', 'rage_click'];

const KEBAB_WORD = /^[a-z]+(?:-[a-z]+)*$/;
const MAX_ROUTE_WORD = 32;
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9 _.-]{0,39}$/;
const INTERACTIVE_TAGS = new Set(['button', 'summary', 'select', 'label']);
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'switch', 'checkbox', 'radio',
]);
const CLICKABLE_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'image']);

function attr(el, name) {
  try {
    return el?.getAttribute?.(name) ?? null;
  } catch {
    return null;
  }
}

function tagOf(el) {
  return typeof el?.tagName === 'string' ? el.tagName.toLowerCase() : '';
}

/**
 * A path with private parts replaced: "/guardian/Xy3k9Q..." becomes
 * "/guardian/:id". Query strings and hashes are dropped. Accepts a full URL
 * too, keeping only its path.
 */
export function redactPath(path) {
  if (typeof path !== 'string' || !path) return '/';
  let p = path.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      return '/';
    }
  }
  p = p.split(/[?#]/)[0];
  if (!p.startsWith('/')) p = `/${p}`;
  return p
    .split('/')
    .map((seg) => (seg === '' || (KEBAB_WORD.test(seg) && seg.length <= MAX_ROUTE_WORD) ? seg : ':id'))
    .join('/');
}

function isInteractive(el) {
  const tag = tagOf(el);
  if (tag === 'a') return !!attr(el, 'href');
  if (INTERACTIVE_TAGS.has(tag)) return true;
  if (tag === 'input') return CLICKABLE_INPUT_TYPES.has((attr(el, 'type') || '').toLowerCase());
  const role = attr(el, 'role');
  return !!role && INTERACTIVE_ROLES.has(role);
}

/** The nearest clickable control at or above `el`, or null. */
export function findInteractive(el, maxDepth = 8) {
  let node = el;
  for (let depth = 0; node && depth <= maxDepth; depth++) {
    if (isInteractive(node)) return node;
    node = node.parentElement;
  }
  return null;
}

/** True when `el` sits inside an element that asked not to be recorded. */
export function isBreadcrumbOff(el, maxDepth = 25) {
  let node = el;
  for (let depth = 0; node && depth <= maxDepth; depth++) {
    if (attr(node, 'data-breadcrumb') === 'off') return true;
    if (attr(node, 'data-private') !== null) return true;
    node = node.parentElement;
  }
  return false;
}

/** A name a developer gave the control on purpose, never its text. */
function developerName(el) {
  const tag = tagOf(el);
  const sources = ['data-breadcrumb', 'data-testid', 'id'];
  if (tag === 'input' || tag === 'select') sources.push('name');
  for (const source of sources) {
    const value = attr(el, source);
    if (value && SAFE_NAME.test(value) && !/\d{3,}/.test(value)) return value;
  }
  return null;
}

/**
 * How a clicked element appears in the trail, for example
 * "button [pay-now]", "link → /dashboard/journey", "link → external".
 * Null when the element is inside a data-private area.
 */
export function describeTarget(el, { origin = 'http://localhost' } = {}) {
  if (!el || isBreadcrumbOff(el)) return null;
  const tag = tagOf(el) || 'element';
  const role = attr(el, 'role');
  let base;
  if (tag === 'a') {
    base = 'link';
  } else if (tag === 'input') {
    base = `input:${(attr(el, 'type') || 'text').toLowerCase()}`;
  } else if (role && INTERACTIVE_ROLES.has(role) && tag !== 'button') {
    base = role;
  } else {
    base = tag;
  }
  const name = developerName(el);
  let text = name ? `${base} [${name}]` : base;
  if (tag === 'a') {
    const href = attr(el, 'href') || '';
    if (href.startsWith('#')) {
      text += ' → #';
    } else {
      try {
        const url = new URL(href, origin);
        text += url.origin === new URL(origin).origin ? ` → ${redactPath(url.pathname)}` : ' → external';
      } catch {
        // An unusable href: keep the plain description.
      }
    }
  }
  return text.slice(0, MAX_TARGET_LENGTH);
}

/** A fixed-size trail, oldest dropped first. */
export function createBreadcrumbTrail(max = MAX_BREADCRUMBS) {
  const items = [];
  return {
    add(kind, target, at = new Date()) {
      if (!BREADCRUMB_KINDS.includes(kind) || typeof target !== 'string' || !target) return;
      items.push({ t: at.toISOString(), kind, target: target.slice(0, MAX_TARGET_LENGTH) });
      if (items.length > max) items.splice(0, items.length - max);
    },
    /** Adds a "route" crumb only when the page actually changed. */
    noteRoute(pathname, at = new Date()) {
      const target = redactPath(pathname);
      const lastRoute = [...items].reverse().find((i) => i.kind === 'route');
      if (lastRoute?.target === target) return;
      this.add('route', target, at);
    },
    list() {
      return items.map((i) => ({ ...i }));
    },
  };
}

// The one trail this page load keeps.
const trail = createBreadcrumbTrail();
export const addBreadcrumb = (kind, target) => trail.add(kind, target);
export const noteRoute = (pathname) => trail.noteRoute(pathname);
export const getBreadcrumbs = () => trail.list();
