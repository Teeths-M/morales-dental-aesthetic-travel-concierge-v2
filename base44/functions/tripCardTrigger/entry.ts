import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { loadCardByToken, openOrJoinRequest, computeStatus } from '../../shared/tripCardEngine.ts';
import {
  renderLocationPage,
  renderStatusPage,
  renderNeutralPage,
  htmlResponse,
} from '../../shared/tripCardHtml.ts';

/**
 * tripCardTrigger — the first tap.
 *
 * Opens this trip's single request, or joins the one already open. Idempotent:
 * the card row is the latch, so a retried or double tap cannot open a second
 * dispatch. No JavaScript, no JSON — the stranger gets the next screen.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

async function readToken(req: Request): Promise<string> {
  try {
    const form = await req.formData();
    return String(form.get('t') || '').trim();
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const token = await readToken(req);

    if (!token) {
      return htmlResponse(renderNeutralPage({ lang: 'en', emergencyNumber: '', reason: 'invalid' }));
    }

    const { card, error } = await loadCardByToken(base44, token);

    if (error || !card) {
      return htmlResponse(renderNeutralPage({
        lang: card?.language || 'en',
        emergencyNumber: card?.emergency_number || Deno.env.get('ADMIN_PHONE') || '',
        reason: error === 'expired' ? 'expired' : 'invalid',
      }));
    }

    const result = await openOrJoinRequest(base44, card, now);
    const live = result.card || card;

    if (result.outcome === 'throttled') {
      return htmlResponse(renderNeutralPage({
        lang: live.language,
        emergencyNumber: live.emergency_number,
        reason: 'throttled',
      }));
    }

    if (result.outcome === 'rejoin_closed') {
      const status = await computeStatus(base44, live, now);
      return htmlResponse(renderStatusPage({
        lang: live.language,
        token,
        pageUrl: `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`,
        reference: live.request_ref || 'MC-OPEN',
        emergencyNumber: live.emergency_number,
        statusKey: status.key,
        terminal: true,
        refresh: false,
      }));
    }

    // Request is live. The reassurance and the three location choices.
    return htmlResponse(renderLocationPage({
      lang: live.language,
      actionUrl: `${APP_URL}/functions/tripCardLocation`,
      token,
      reference: live.request_ref || 'MC-OPEN',
      emergencyNumber: live.emergency_number,
    }));
  } catch (error) {
    console.error('[tripCardTrigger]', error);
    return htmlResponse(renderNeutralPage({
      lang: 'en',
      emergencyNumber: Deno.env.get('ADMIN_PHONE') || '',
      reason: 'invalid',
    }));
  }
});