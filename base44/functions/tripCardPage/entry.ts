import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { loadCardByToken, logScan, computeStatus } from '../../shared/tripCardEngine.ts';
import {
  renderHelpPage,
  renderLocationPage,
  renderStatusPage,
  renderNeutralPage,
  htmlResponse,
} from '../../shared/tripCardHtml.ts';

/**
 * tripCardPage — the card a stranger scans.
 *
 * Server-rendered HTML. No React, no hydration, no analytics, no cookie, no
 * localStorage, no service worker, no third-party script, no JavaScript at all
 * on this screen. One request, one complete page, on whatever signal exists.
 *
 * The token is emergency-only: it can surface a first name and a receipt, and
 * it can open ONE request for this trip. It can never read a record.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

Deno.serve(async (req) => {
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = String(url.searchParams.get('t') || '').trim();

    if (!token) {
      return htmlResponse(renderNeutralPage({ lang: 'en', emergencyNumber: '', reason: 'invalid' }));
    }

    const { card, error } = await loadCardByToken(base44, token);

    if (error || !card) {
      // Indistinguishable for invalid, revoked and unconfigured: the caller
      // learns nothing about why, and is given a number that works.
      return htmlResponse(renderNeutralPage({
        lang: card?.language || 'en',
        emergencyNumber: card?.emergency_number || Deno.env.get('ADMIN_PHONE') || '',
        reason: error === 'expired' ? 'expired' : 'invalid',
      }));
    }

    // A request already exists for this trip. This is the receipt — and it can
    // never open a second request.
    if (card.request_state !== 'none') {
      // The location choice stays available on reload until the stranger has
      // actually answered it, so the picker is never lost by a page refresh.
      if (card.request_state === 'open' && !card.bystander_location_source) {
        await logScan(base44, card, 'scan', 'receipt viewed, location not answered');
        return htmlResponse(renderLocationPage({
          lang: card.language,
          actionUrl: `${APP_URL}/functions/tripCardLocation`,
          token,
          reference: card.request_ref || 'MC-OPEN',
          emergencyNumber: card.emergency_number,
        }));
      }

      const status = await computeStatus(base44, card, now);
      await logScan(base44, card, 'scan', `receipt viewed (${status.key})`);

      return htmlResponse(renderStatusPage({
        lang: card.language,
        token,
        pageUrl: `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`,
        reference: card.request_ref || 'MC-OPEN',
        emergencyNumber: card.emergency_number,
        statusKey: status.key,
        terminal: status.terminal,
        refresh: status.refresh,
      }));
    }

    // No request yet: the one screen, nothing else.
    await logScan(base44, card, 'scan', 'card viewed, no action');

    return htmlResponse(renderHelpPage({
      lang: card.language,
      name: card.patient_first_name,
      actionUrl: `${APP_URL}/functions/tripCardTrigger`,
      token,
      emergencyNumber: card.emergency_number,
      emergencyLabel: card.emergency_number_label,
    }));
  } catch (error) {
    console.error('[tripCardPage]', error);
    return htmlResponse(renderNeutralPage({
      lang: 'en',
      emergencyNumber: Deno.env.get('ADMIN_PHONE') || '',
      reason: 'invalid',
    }));
  }
});