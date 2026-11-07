import { describe, it, expect } from 'vitest';
import {
  MAX_TARGET_LENGTH,
  createBreadcrumbTrail,
  describeTarget,
  findInteractive,
  isBreadcrumbOff,
  redactPath,
} from '@/lib/breadcrumbs';

// A stand-in for a DOM element: just enough for the helpers, plus text that
// must never be read.
function el(tag, attrs = {}, parent = null) {
  return {
    tagName: tag.toUpperCase(),
    parentElement: parent,
    textContent: 'Diabetes',
    innerText: 'Diabetes',
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
  };
}

const ORIGIN = 'https://app.example.com';

describe('redactPath', () => {
  it('keeps plain route words', () => {
    expect(redactPath('/dashboard/journey')).toBe('/dashboard/journey');
    expect(redactPath('/m-care')).toBe('/m-care');
    expect(redactPath('/')).toBe('/');
  });

  it('replaces private link tokens and ids with :id', () => {
    expect(redactPath('/guardian/Xy3k9QpL7mN2aB4c')).toBe('/guardian/:id');
    expect(redactPath('/portal/proposal/abc123')).toBe('/portal/proposal/:id');
    expect(redactPath('/consult/66a1b2c3d4e5f6a7b8c9d0e1')).toBe('/consult/:id');
    expect(redactPath('/users/jane@example.com')).toBe('/users/:id');
    expect(redactPath('/search/hair%20loss')).toBe('/search/:id');
    expect(redactPath('/Dashboard')).toBe('/:id');
    expect(redactPath('/a-very-long-kebab-segment-that-goes-past-thirty-two')).toBe('/:id');
  });

  it('drops query strings and hashes', () => {
    expect(redactPath('/m-care?mcare=open&token=secret')).toBe('/m-care');
    expect(redactPath('/journey#step-3')).toBe('/journey');
  });

  it('keeps only the path of a full URL', () => {
    expect(redactPath('https://example.com/guardian/AbCdEf123?x=1')).toBe('/guardian/:id');
  });

  it('copes with empty or odd input', () => {
    expect(redactPath('')).toBe('/');
    expect(redactPath(null)).toBe('/');
    expect(redactPath(42)).toBe('/');
    expect(redactPath('dashboard')).toBe('/dashboard');
  });
});

describe('findInteractive', () => {
  it('climbs from an inner element to its control', () => {
    const button = el('button');
    const span = el('span', {}, button);
    expect(findInteractive(span)).toBe(button);
  });

  it('recognises links, roles, and clickable inputs only', () => {
    expect(findInteractive(el('a', { href: '/x' }))).toBeTruthy();
    expect(findInteractive(el('a'))).toBeNull();
    expect(findInteractive(el('div', { role: 'button' }))).toBeTruthy();
    expect(findInteractive(el('input', { type: 'checkbox' }))).toBeTruthy();
    expect(findInteractive(el('input', { type: 'text' }))).toBeNull();
    expect(findInteractive(el('div'))).toBeNull();
  });

  it('stops climbing after a few levels', () => {
    let node = el('button');
    for (let i = 0; i < 12; i++) node = el('div', {}, node);
    expect(findInteractive(node)).toBeNull();
  });
});

describe('describeTarget', () => {
  it('never uses the text or labels on screen', () => {
    const pill = el('button', { 'aria-label': 'Remove "hair loss" from recent searches', title: 'Diabetes' });
    expect(describeTarget(pill, { origin: ORIGIN })).toBe('button');
  });

  it("uses a developer's name for the control when there is one", () => {
    expect(describeTarget(el('button', { 'data-breadcrumb': 'pay-now' }), { origin: ORIGIN })).toBe('button [pay-now]');
    expect(describeTarget(el('div', { 'data-testid': 'robot-dots' }), { origin: ORIGIN })).toBe('div [robot-dots]');
    expect(describeTarget(el('button', { id: 'withdrawal-waiver-fee' }), { origin: ORIGIN })).toBe('button [withdrawal-waiver-fee]');
    expect(describeTarget(el('input', { type: 'checkbox', name: 'medical_conditions' }), { origin: ORIGIN }))
      .toBe('input:checkbox [medical_conditions]');
    expect(describeTarget(el('div', { role: 'tab' }), { origin: ORIGIN })).toBe('tab');
  });

  it('ignores generated ids and anything with a long number in it', () => {
    expect(describeTarget(el('button', { id: ':r1:' }), { origin: ORIGIN })).toBe('button');
    expect(describeTarget(el('button', { id: 'row-12345' }), { origin: ORIGIN })).toBe('button');
    expect(describeTarget(el('div', { name: 'condition' }), { origin: ORIGIN })).toBe('div');
  });

  it('describes links by where they go, with private parts removed', () => {
    expect(describeTarget(el('a', { href: '/guardian/AbC123def456' }), { origin: ORIGIN })).toBe('link → /guardian/:id');
    expect(describeTarget(el('a', { href: `${ORIGIN}/dashboard?tab=2` }), { origin: ORIGIN })).toBe('link → /dashboard');
    expect(describeTarget(el('a', { href: 'https://wa.me/18685551234' }), { origin: ORIGIN })).toBe('link → external');
    expect(describeTarget(el('a', { href: 'mailto:jane@example.com' }), { origin: ORIGIN })).toBe('link → external');
    expect(describeTarget(el('a', { href: '#top' }), { origin: ORIGIN })).toBe('link → #');
  });

  it('records nothing inside a private area', () => {
    const area = el('section', { 'data-private': '' });
    expect(describeTarget(el('button', {}, area), { origin: ORIGIN })).toBeNull();
    expect(describeTarget(el('button', { 'data-breadcrumb': 'off' }), { origin: ORIGIN })).toBeNull();
    expect(isBreadcrumbOff(el('span', {}, el('div', { 'data-breadcrumb': 'off' })))).toBe(true);
    expect(describeTarget(null)).toBeNull();
  });

  it('keeps the description short', () => {
    const longName = `a${'b'.repeat(39)}`;
    const deepPath = `/${Array(12).fill('journey').join('/')}`;
    const target = describeTarget(el('a', { 'data-breadcrumb': longName, href: deepPath }), { origin: ORIGIN });
    expect(target.startsWith(`link [${longName}] → /journey/`)).toBe(true);
    expect(target.length).toBe(MAX_TARGET_LENGTH);
  });
});

describe('createBreadcrumbTrail', () => {
  const at = new Date('2026-10-17T12:00:00Z');

  it('keeps only the most recent crumbs', () => {
    const trail = createBreadcrumbTrail(3);
    ['a', 'b', 'c', 'd'].forEach((target) => trail.add('click', `button [${target}]`, at));
    expect(trail.list().map((c) => c.target)).toEqual(['button [b]', 'button [c]', 'button [d]']);
  });

  it('accepts only known kinds and real targets', () => {
    const trail = createBreadcrumbTrail();
    trail.add('keystroke', 'button', at);
    trail.add('click', '', at);
    trail.add('click', null, at);
    expect(trail.list()).toEqual([]);
    trail.add('rage_click', 'button [pay-now]', at);
    expect(trail.list()).toEqual([{ t: '2026-10-17T12:00:00.000Z', kind: 'rage_click', target: 'button [pay-now]' }]);
  });

  it('adds a route crumb only when the page changes, with private parts removed', () => {
    const trail = createBreadcrumbTrail();
    trail.noteRoute('/guardian/Xy3k9QpL7mN2', at);
    trail.noteRoute('/guardian/Xy3k9QpL7mN2', at);
    trail.add('click', 'button', at);
    trail.noteRoute('/guardian/Xy3k9QpL7mN2', at);
    trail.noteRoute('/dashboard', at);
    expect(trail.list().map((c) => `${c.kind}:${c.target}`)).toEqual([
      'route:/guardian/:id', 'click:button', 'route:/dashboard',
    ]);
  });

  it('hands out copies, so callers cannot change the trail', () => {
    const trail = createBreadcrumbTrail();
    trail.add('click', 'button', at);
    trail.list()[0].target = 'changed';
    expect(trail.list()[0].target).toBe('button');
  });
});
