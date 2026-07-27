// DUPLICATED from base44/functions/_shared/incidentReporting.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

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
