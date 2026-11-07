/**
 * incidentReporting — shared helper for the Reliability & Incident Response
 * system (Phase 1 / Core). Used by both `reportIncident` (frontend-originated
 * reports) and `createHandler.ts`'s catch block (backend-originated reports),
 * so create-vs-update-description logic lives in exactly one place.
 *
 * Usage:
 *   import { reportIncident } from './incidentReporting.ts';
 *   await reportIncident({ base44, incidentCode, severity: 'high', source: 'api', ... });
 *
 * Must never throw — every internal step is independently caught, since this
 * is always called from a path that is already mid-failure.
 */

import { renderEmail } from './emailTemplate.ts';

const INCIDENT_CODE_RE = /^M-\d{4}-[0-9a-z]{4,20}$/i;
const MAX_DESCRIPTION_LENGTH = 2000;

// The breadcrumb trail a frontend report carries (src/lib/breadcrumbs.js).
// The browser already keeps it free of anything typed or shown on screen;
// this re-checks its shape, because anyone can call reportIncident directly.
const BREADCRUMB_KINDS = new Set(['route', 'click', 'rage_click']);
const MAX_STORED_BREADCRUMBS = 20;
const MAX_BREADCRUMB_TARGET = 120;

type Breadcrumb = { t?: string; kind: string; target: string };

export function sanitizeBreadcrumbs(raw: unknown): Breadcrumb[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Breadcrumb[] = [];
  for (const item of raw.slice(-MAX_STORED_BREADCRUMBS)) {
    if (!item || typeof item !== 'object') continue;
    const { t, kind, target } = item as Record<string, unknown>;
    if (typeof kind !== 'string' || !BREADCRUMB_KINDS.has(kind)) continue;
    if (typeof target !== 'string' || !target.trim() || target.includes('@')) continue;
    const crumb: Breadcrumb = {
      kind,
      target: target.trim().slice(0, MAX_BREADCRUMB_TARGET).replace(/\d{3,}/g, '#'),
    };
    if (typeof t === 'string' && !Number.isNaN(Date.parse(t))) crumb.t = new Date(t).toISOString();
    out.push(crumb);
  }
  return out.length ? out : undefined;
}

/** Collision-resistant, coordination-free reference ID — not sequential. Mirrors the client-side generator in src/lib/incidentReporting.js. */
export function generateIncidentCode(): string {
  const year = new Date().getFullYear();
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `M-${year}-${timePart}${randPart}`;
}

export interface ReportIncidentInput {
  base44: any;
  incidentCode: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
  feature?: string;
  page?: string;
  userEmail?: string | null;
  sessionId?: string;
  browser?: string;
  device?: string;
  errorMessage?: string;
  stackTrace?: string;
  apiResponse?: string;
  userDescription?: string;
  sentryEventId?: string;
  breadcrumbs?: unknown;
}

export async function reportIncident(input: ReportIncidentInput): Promise<{ incident_code: string } | null> {
  try {
    const { base44, incidentCode } = input;
    if (!base44 || !incidentCode || !INCIDENT_CODE_RE.test(incidentCode)) return null;

    const userDescription = input.userDescription
      ? String(input.userDescription).slice(0, MAX_DESCRIPTION_LENGTH)
      : undefined;

    const existing = await base44.asServiceRole?.entities?.ReliabilityIncident
      ?.filter({ incident_code: incidentCode })
      .catch(() => []);

    if (existing?.length) {
      if (userDescription) {
        await base44.asServiceRole?.entities?.ReliabilityIncident
          ?.update(existing[0].id, { user_description: userDescription })
          .catch(() => {});
      }
      return { incident_code: incidentCode };
    }

    const severity = input.severity || 'medium';
    const source = input.source || 'frontend';

    await base44.asServiceRole?.entities?.ReliabilityIncident?.create({
      incident_code: incidentCode,
      severity,
      status: 'open',
      source,
      feature: input.feature || undefined,
      page: input.page || undefined,
      user_email: input.userEmail || undefined,
      session_id: input.sessionId || undefined,
      browser: input.browser || undefined,
      device: input.device || undefined,
      error_message: input.errorMessage || undefined,
      stack_trace: input.stackTrace || undefined,
      api_response: input.apiResponse || undefined,
      user_description: userDescription,
      sentry_event_id: input.sentryEventId || undefined,
      breadcrumbs: sanitizeBreadcrumbs(input.breadcrumbs),
    }).catch(() => {});

    if (severity === 'critical' || severity === 'high') {
      await sendAlertEmail(input.base44, incidentCode, severity, source, input.feature, input.errorMessage).catch(() => {});
    }

    return { incident_code: incidentCode };
  } catch (_) {
    return null;
  }
}

async function sendAlertEmail(
  base44: any,
  incidentCode: string,
  severity: string,
  source: string,
  feature?: string,
  errorMessage?: string,
): Promise<void> {
  const recipients = (Deno.env.get('INCIDENT_ALERT_EMAILS') || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!recipients.length) {
    console.warn('[incidentReporting] INCIDENT_ALERT_EMAILS not set — alert not sent for', incidentCode);
    return;
  }

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  const html = renderEmail({
    appUrl,
    eyebrow: `${severity.toUpperCase()} Severity Incident`,
    title: `New incident: ${incidentCode}`,
    intro: `A ${severity} severity error was just captured${feature ? ` in ${feature}` : ''}.`,
    rows: [
      ['Reference', incidentCode],
      ['Severity', severity],
      ['Source', source],
      ...(feature ? [['Feature', feature] as [string, string]] : []),
      ...(errorMessage ? [['Message', errorMessage.slice(0, 300)] as [string, string]] : []),
    ],
  });

  await base44.asServiceRole?.integrations?.Core?.SendEmail({
    to: recipients.join(','),
    subject: `[${severity.toUpperCase()}] Incident ${incidentCode}`,
    body: html,
  }).catch(() => {});
}
