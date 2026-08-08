/**
 * detectPaymentDiscrepancies — the payment-tracking backstop.
 *
 * Reminders + receipts already exist (sendPaymentReminders, sendPaymentReceipt,
 * generateClientProposalPDF). This closes the gap the user named: flagging
 * discrepancies. Scans recent cases and flags:
 *   - payment_status says Paid In Full but amount_paid < final_package_price (underpaid)
 *   - amount_paid > final_package_price (overpaid)
 *   - amount_remaining != final_package_price - amount_paid (math mismatch)
 *   - Paid In Full with no receipt_vault_id and no stripe_payment_id (receipt missing)
 * Emails the admin a summary. Designed to run on-demand or from a cron.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { escapeHtml } from '../../shared/emailTemplate.ts';

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow cron (X-Cron-Secret) OR an admin session.
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('x-cron-secret') || '';
    let caller: any = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    const isAdmin = caller && (caller.role === 'admin' || caller.role === 'platform_admin');
    if (!isAdmin && (!cronSecret || authHeader !== cronSecret)) {
      return Response.json({ error: 'Forbidden: admin or cron access required' }, { status: 403 });
    }

    const cases = await base44.asServiceRole.entities.CaseRecord.list('-updated_date', 200).catch(() => []);
    const active = (cases as any[]).filter(c => c.status !== 'Completed' && c.status !== 'cancelled');

    const discrepancies: any[] = [];
    for (const c of active) {
      const finalPrice = Number(c.final_package_price) || 0;
      const paid = Number(c.amount_paid) || 0;
      const remaining = Number(c.amount_remaining) || 0;
      const payStatus = c.payment_status;
      const flags: string[] = [];

      if (finalPrice > 0) {
        if (payStatus === 'Paid In Full' && paid < finalPrice) {
          flags.push(`UNDERPAID: marked Paid In Full but paid $${paid} < package $${finalPrice}`);
        }
        if (paid > finalPrice + 1) {
          flags.push(`OVERPAID: paid $${paid} > package $${finalPrice}`);
        }
        const expectedRemaining = Math.max(0, Math.round((finalPrice - paid) * 100) / 100);
        if (Math.abs(expectedRemaining - remaining) > 1) {
          flags.push(`MATH_MISMATCH: amount_remaining $${remaining} != package $${finalPrice} - paid $${paid} = $${expectedRemaining}`);
        }
        if (payStatus === 'Paid In Full' && !c.receipt_vault_id && !c.stripe_payment_id) {
          flags.push('RECEIPT_MISSING: Paid In Full with no receipt or Stripe payment id on file');
        }
      }

      if (flags.length) {
        discrepancies.push({
          case_id: c.id,
          client_name: c.client_name,
          client_email: c.client_email,
          payment_status: payStatus,
          final_package_price: finalPrice,
          amount_paid: paid,
          amount_remaining: remaining,
          flags,
        });
      }
    }

    // Email admin a summary if anything was flagged.
    if (discrepancies.length > 0) {
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        const lines = discrepancies.map(d =>
          `• ${escapeHtml(d.client_name || 'patient')} (case ${String(d.id || d.case_id).slice(-8)}): ${d.flags.join('; ')}`
        ).join('\n');
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: adminEmail,
          subject: `⚠️ ${discrepancies.length} payment discrepancy${discrepancies.length === 1 ? '' : 'ies'} flagged | ${BRAND}`,
          body: linkOnlyEmail({
            from: 'detectPaymentDiscrepancies',
            title: `${discrepancies.length} payment discrepancy${discrepancies.length === 1 ? 'y' : 'ies'} need${discrepancies.length === 1 ? 's' : ''} review.`,
            line: `The automated payment tracker flagged these cases:\n\n${lines}\n\nOpen the admin console to reconcile each one.`,
            ctaLabel: 'Open Admin Console',
            ctaUrl: `${APP_URL}/admin`,
          }),
        }).catch(() => {});
      }
    }

    return Response.json({
      success: true,
      scanned: active.length,
      flagged: discrepancies.length,
      discrepancies,
    });
  } catch (error) {
    console.error('[detectPaymentDiscrepancies]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});