import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { guardedStatusUpdate, BOOKING, isTerminal } from '../../shared/bookingState.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

const CancelBookingSchema = strictObject({
  case_id: Fields.shortText(100),
  reason: z.string().max(500).optional().default(''),
});

/**
 * cancelBooking — first-class, patient-initiated cancellation with per-leg refund.
 *
 * Refund model (leverages the escrow ledger):
 *   • Escrow that is still HELD (leg not completed) → refunded to the patient.
 *   • Escrow already RELEASED to a provider (e.g. the travel agency's booked
 *     flights/hotel) → non-refundable; it paid for real, delivered work.
 * The guarded state machine ensures a completed/cancelled booking can't be cancelled
 * again, and a safety hold or any active state can move to Cancelled.
 *
 * INVARIANTS: owner-or-admin only; never claws back released funds; link-only notices.
 * (Actual money movement via Stripe refund/transfer is a follow-up, as with the escrow
 * release path — this writes the authoritative ledger state.)
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, reason } = await body<{ case_id?: string; reason?: string }>();
  if (!case_id) return err('case_id is required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  // Owner-or-admin only.
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  if (!isAdmin && (user?.email || '').toLowerCase() !== String(c.client_email || '').toLowerCase()) {
    return err('This booking does not belong to you.', 403);
  }
  if (isTerminal(c.status)) {
    return err(`This booking is already ${String(c.status).toLowerCase()} and cannot be cancelled.`, 409);
  }

  const now = new Date().toISOString();

  // ── Refund un-released escrow; released funds stay paid ─────────────────────
  const holds = await base44.asServiceRole.entities.EscrowHold
    .filter({ case_id }, '-created_date', 50).catch(() => []);
  let refundable = 0, nonRefundable = 0;
  const tasks: Promise<unknown>[] = [];
  for (const h of holds as any[]) {
    if (h.status === 'held') {
      refundable += Number(h.amount_held_usd || 0);
      tasks.push(base44.asServiceRole.entities.EscrowHold.update(h.id, {
        status: 'refunded', refunded_at: now, refund_reason: 'booking_cancelled',
      }).catch(() => {}));
    } else if (h.status === 'released') {
      nonRefundable += Number(h.amount_held_usd || 0);
    }
  }
  await Promise.allSettled(tasks);

  // ── Guarded cancel ─────────────────────────────────────────────────────────
  const paymentStatus = nonRefundable > 0 ? 'Partially Refunded'
    : refundable > 0 ? 'Refunded' : (c.payment_status || 'Cancelled');
  try {
    await guardedStatusUpdate(base44, case_id, BOOKING.CANCELLED, {
      cancellation_reason: String(reason || '').slice(0, 500),
      cancelled_at: now,
      cancelled_by: isAdmin ? 'admin' : 'patient',
      payment_status: paymentStatus,
    });
  } catch {
    return err('This booking cannot be cancelled in its current state.', 409);
  }

  // ── Link-only cancellation notice to the patient ───────────────────────────
  if (c.client_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: c.client_email,
      subject: `Your booking has been cancelled — ${BRAND}`,
      body: `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%"><tr><td align="center"><table style="max-width:520px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:18px;">
<tr><td style="padding:26px 30px;">
  <div style="font-size:22px;font-weight:900;color:#D4AF37;margin-bottom:12px;">M</div>
  <p style="font-size:15px;color:#fff;margin:0 0 10px;font-weight:700;">Your booking has been cancelled.</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;line-height:1.6;">Open your Morales portal for the details and your refund status. Anything already arranged on your behalf is shown there.</p>
  <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:12px 28px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
</td></tr></table></td></tr></table></body></html>`,
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'booking_cancelled',
    actor_id: user?.id || (isAdmin ? 'admin' : 'patient'), actor_role: isAdmin ? 'admin' : 'client',
    actor_name: user?.email || 'Patient', resource_type: 'CaseRecord', resource_id: case_id, case_id,
    sensitive: true, timestamp: now,
    details: { refundable_usd: refundable, non_refundable_usd: nonRefundable, reason: String(reason || '').slice(0, 200) },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    case_id, cancelled: true,
    refundable_usd: refundable, non_refundable_usd: nonRefundable,
    payment_status: paymentStatus,
    message: nonRefundable > 0
      ? `Booking cancelled. $${refundable.toLocaleString()} will be refunded; $${nonRefundable.toLocaleString()} already arranged (flights/hotel) is non-refundable.`
      : `Booking cancelled. $${refundable.toLocaleString()} will be refunded.`,
  });
}, { name: 'cancelBooking', requireAuth: true, bodySchema: CancelBookingSchema }));
