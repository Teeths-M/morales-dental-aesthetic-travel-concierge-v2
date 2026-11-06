import { createHandler, ok } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { formatMinor } from '../../shared/partnerMoney.ts';
import { derivePricingStatus, isQuietHours } from '../../shared/partnerCatalogue.ts';

/**
 * sweepPartnerRateFreshness — the only thing that ever marks a price stale.
 *
 * Two jobs, in this order, both idempotent:
 *  1. Re-derive every active offer's freshness and persist a changed label.
 *     A "confirmed" price whose review deadline passed becomes STALE here, not
 *     on a screen — so no client can keep showing a label that outlived itself.
 *  2. Create ONE durable reminder row per card per review cycle, then attempt a
 *     single delivery. The row exists before the send, so a retried or
 *     overlapping sweep sees it and stays silent instead of asking the partner
 *     the same question twice.
 *
 * Bounded per run. A failure on one partner never stops the sweep.
 */

const BATCH = 100;

function cycleKey(cardId: string, anchor: string | undefined): string {
  const day = anchor ? String(anchor).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${cardId}:${day}`;
}

const escapeHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function reminderEmail(card: any): string {
  const price = card.price_kind === 'quote_required'
    ? 'quote on request'
    : formatMinor(card.amount_minor, card.currency) || 'not set';
  const serviceName = escapeHtml(card.service_name || 'Your listing');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f8f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
  <tr><td style="background:#d4af37;padding:18px 24px;border-radius:8px 8px 0 0;">
    <span style="font-size:13px;font-weight:800;letter-spacing:2px;color:#000000;">M-CARE</span>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#060b16;">Is this price still right?</p>
    <p style="margin:0 0 16px;font-size:14px;color:#5b6b7a;line-height:1.6;">
      <strong>${serviceName}</strong> is currently listed at <strong>${price}</strong>${card.pricing_unit ? ` (${String(card.pricing_unit).replace(/_/g, ' ')})` : ''}.
      Please confirm whether that is still accurate.
    </p>
    <a href="${(Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '')}/partner-pricing" style="display:inline-block;background:#d4af37;color:#000000;font-size:14px;font-weight:700;padding:12px 24px;border-radius:7px;text-decoration:none;">Still accurate · Update price · Pause</a>
    <p style="margin:18px 0 0;font-size:12px;color:#5b6b7a;line-height:1.6;">
      If we do not hear back, this price is marked as needing reconfirmation and stops being offered as a current price.
    </p>
  </td></tr>
  </table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, req }) => {
  if (!(await cronAuthorized(req, base44))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const cards = await base44.asServiceRole.entities.PartnerRateCard
    .filter({ status: 'active' }, 'next_review_at', BATCH)
    .catch(() => []);

  let rederived = 0;
  let remindersQueued = 0;
  let remindersSent = 0;
  let remindersFailed = 0;
  let suppressed = 0;

  for (const card of cards as any[]) {
    try {
      const derived = derivePricingStatus(card, now);

      if (derived !== card.pricing_status) {
        await base44.asServiceRole.entities.PartnerRateCard.update(card.id, { pricing_status: derived });
        rederived += 1;
      }

      const reviewable = ['CURRENT_PARTNER_CONFIRMED', 'PARTNER_SUBMITTED', 'STALE'].includes(derived);
      const due = card.next_review_at && new Date(card.next_review_at).getTime() <= now.getTime();
      if (!reviewable || !due || card.reminder_cadence === 'none' || derived === 'EXPIRED') continue;

      const key = cycleKey(card.id, card.next_review_at);
      const cycleRows = async () => (await base44.asServiceRole.entities.PartnerPricingReminder
        .filter({ cycle_key: key }, 'created_date', 20)
        .catch(() => [])) as any[];
      const existing = await cycleRows();

      // Already asked this cycle (sent or failed), or another run is sending right now (queued): stay silent. A row
      // held back for the partner's quiet hours doesn't count: it is sent on a later run, once those hours are over.
      if (existing.some((r) => ['queued', 'sent', 'failed', 'acknowledged'].includes(r.status))) continue;

      if (isQuietHours(card.timezone, card.quiet_hours_start, card.quiet_hours_end, now)) {
        if (existing.length === 0) {
          await base44.asServiceRole.entities.PartnerPricingReminder.create({
            rate_card_id: card.id,
            partner_id: card.partner_id,
            partner_email: card.partner_email,
            cycle_key: key,
            due_at: new Date(now).toISOString(),
            status: 'suppressed',
            suppressed_reason: 'quiet_hours',
            deferred_for_quiet_hours: true,
            channel: 'email',
            attempt_count: 0,
          });
          suppressed += 1;
        }
        continue;
      }

      const reminder = await base44.asServiceRole.entities.PartnerPricingReminder.create({
        rate_card_id: card.id,
        partner_id: card.partner_id,
        partner_email: card.partner_email,
        cycle_key: key,
        due_at: new Date(now).toISOString(),
        status: 'queued',
        channel: 'email',
        attempt_count: 0,
      });
      remindersQueued += 1;

      // Two runs can overlap (this sweep runs from Base44's own schedule and GitHub's). Look again after queuing: if
      // another run already sent, or queued earlier, it is the one that sends (the earliest queued row wins, the same
      // answer in every run), so the partner gets one email.
      const rows = await cycleRows();
      const otherAsked = rows.some((r) => r.id !== reminder.id && ['sent', 'failed', 'acknowledged'].includes(r.status));
      const first = rows.filter((r) => r.status === 'queued')
        .sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)) || String(a.id).localeCompare(String(b.id)))[0];
      if (otherAsked || (first && first.id !== reminder.id)) {
        await base44.asServiceRole.entities.PartnerPricingReminder.update(reminder.id, {
          status: 'suppressed',
          suppressed_reason: 'duplicate_run',
        });
        suppressed += 1;
        continue;
      }

      const attemptedAt = new Date().toISOString();
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'M-Care Medical Travel Safety',
          to: card.partner_email,
          subject: `Still accurate? ${card.service_name}`,
          body: reminderEmail(card),
        });
        await base44.asServiceRole.entities.PartnerPricingReminder.update(reminder.id, {
          status: 'sent',
          sent_at: attemptedAt,
          attempt_count: 1,
          last_attempt_at: attemptedAt,
        });
        remindersSent += 1;
      } catch (e: any) {
        await base44.asServiceRole.entities.PartnerPricingReminder.update(reminder.id, {
          status: 'failed',
          attempt_count: 1,
          last_attempt_at: attemptedAt,
          failure_detail: String(e?.message || 'Send failed').slice(0, 400),
        });
        remindersFailed += 1;
      }
    } catch (_) {
      // One malformed card must not stop the sweep reaching the rest.
      continue;
    }
  }

  return ok({
    checked: cards.length,
    rederived,
    reminders_queued: remindersQueued,
    reminders_sent: remindersSent,
    reminders_failed: remindersFailed,
    suppressed,
  });
}, { name: 'sweepPartnerRateFreshness', requireAuth: false, rateLimit: false }));