import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const e   = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function receiptHtml({ clientName, clientEmail, caseRef, receiptNumber, procedures, destination,
  amountPaid, paymentType, balanceRemaining, nextDueDate, stripeId, issuedAt }: {
  clientName: string; clientEmail: string; caseRef: string; receiptNumber: string;
  procedures: string; destination: string; amountPaid: number; paymentType: string;
  balanceRemaining: number; nextDueDate?: string; stripeId?: string; issuedAt: string;
}) {
  const isFull = paymentType === 'full_pay' || balanceRemaining === 0;
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#060B16;padding:32px;text-align:center;">
  <img src="${APP_URL}/morales-m-mark.png" width="56" alt="M" style="display:block;margin:0 auto 14px;filter:drop-shadow(0 0 12px rgba(212,175,55,0.6));" />
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:12px auto;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">Official Payment Receipt</div>
</td></tr>
<tr><td style="padding:32px;">
  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Receipt No.</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(receiptNumber)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(caseRef)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(clientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Email</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(clientEmail)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure(s)</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(procedures)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Destination</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(destination)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Issued At</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(issuedAt)}</td></tr>
    ${stripeId ? `<tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Transaction ID</td><td style="padding:10px 0;color:#13221d;font-size:13px;font-family:monospace;">${e(stripeId)}</td></tr>` : ''}
  </table>

  <!-- Payment summary -->
  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:20px;margin-bottom:20px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#29483d;font-weight:700;margin-bottom:12px;">Payment Summary</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:14px;color:#40514a;">Amount Paid Today</span>
      <span style="font-size:20px;font-weight:700;color:#13221d;">${usd(amountPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:14px;color:#40514a;">Payment Type</span>
      <span style="font-size:14px;font-weight:600;color:#13221d;">${isFull ? 'Paid in Full' : '50% Deposit'}</span>
    </div>
    ${!isFull && balanceRemaining > 0 ? `
    <div style="border-top:1px solid #e7ede9;margin-top:12px;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:14px;color:#40514a;">Balance Remaining</span>
        <span style="font-size:16px;font-weight:700;color:#92400e;">${usd(balanceRemaining)}</span>
      </div>
      ${nextDueDate ? `<p style="margin:4px 0 0;font-size:12px;color:#64746d;">Due by: ${e(nextDueDate)}</p>` : ''}
    </div>` : ''}
    ${isFull ? `<div style="border-top:1px solid #e7ede9;margin-top:12px;padding-top:12px;text-align:center;">
      <span style="font-size:13px;font-weight:700;color:#166534;background:#d1fae5;padding:4px 12px;border-radius:999px;">✓ Paid in Full</span>
    </div>` : ''}
  </div>

  <p style="margin:0 0 20px;font-size:13px;color:#64746d;line-height:1.6;text-align:center;">
    This receipt has been saved to your secure Morales Vault. You can access it anytime via your dashboard.
  </p>
  <div style="text-align:center;">
    <a href="${APP_URL}/dashboard/documents" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:13px;font-weight:700;">View My Vault →</a>
  </div>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;line-height:1.6;text-align:center;">
    Keep this receipt for your records. Questions? Reach your concierge on WhatsApp.
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;text-align:center;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, payment_type: claimedPaymentType, amount_paid: claimedAmountPaid, stripe_payment_id: claimedStripeId, internal_secret } = await body();
  if (!case_id) return err('case_id is required');

  // SECURITY: had no ownership/token check on case_id at all — anyone who
  // guessed/knew a case_id could pull that patient's client_email out of the
  // response and re-trigger a receipt re-send. Real caller is
  // processPaymentCascade (service-role, no forwardable session).
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  // SECURITY: never trust caller-supplied payment fields for an "official"
  // receipt — look up the real succeeded PaymentTransaction and use its
  // values. Falls back to the caller's values only for display fields that
  // don't carry financial/verification weight (matched only for logging).
  const paidTxns = await base44.asServiceRole.entities.PaymentTransaction.filter({
    case_id, status: 'succeeded',
  }).catch(() => []);
  const matchedTxn = (claimedStripeId
    ? (paidTxns as any[]).find(t => t.stripe_payment_intent_id === claimedStripeId || t.stripe_session_id === claimedStripeId)
    : null) || (paidTxns as any[]).sort((a, b) => new Date(b.processed_at || b.created_at || 0).getTime() - new Date(a.processed_at || a.created_at || 0).getTime())[0];
  if (!matchedTxn) return err('No verified payment on record for this case — receipt refused.', 403);

  const payment_type      = matchedTxn.deposit_option === 'Full' ? 'full_pay' : (matchedTxn.deposit_option ? 'terms' : (c.payment_type || claimedPaymentType));
  const stripe_payment_id = matchedTxn.stripe_payment_intent_id || matchedTxn.stripe_session_id || c.stripe_payment_id;

  const caseRef       = case_id.slice(-8).toUpperCase();
  const receiptNumber = `REC-${caseRef}-${Date.now().toString(36).toUpperCase()}`;
  const procedures    = (c.procedures || []).join(', ') || 'Your procedure(s)';
  const amountPaid     = Number(matchedTxn.raw_amount ?? claimedAmountPaid ?? c.amount_paid ?? 0);
  const isFull        = payment_type === 'full_pay' || c.payment_status === 'Paid In Full';
  const balanceRem    = isFull ? 0 : Number(c.amount_remaining || c.package_price_first_installment || 0);
  const issuedAt      = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });

  const html = receiptHtml({
    clientName: c.client_name, clientEmail: c.client_email, caseRef, receiptNumber,
    procedures, destination: c.procedure_country || 'Your destination',
    amountPaid, paymentType: payment_type || 'full_pay',
    balanceRemaining: balanceRem, nextDueDate: c.next_payment_due,
    stripeId: stripe_payment_id, issuedAt,
  });

  const tasks: Promise<unknown>[] = [];

  // Email receipt to patient
  tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND,
    to: c.client_email,
    subject: `Payment Receipt — ${receiptNumber} | ${BRAND}`,
    body: html,
  }));

  // Store receipt in PassportVault
  let vaultId: string | null = null;
  try {
    const encoder  = new TextEncoder();
    const bytes    = encoder.encode(html);
    const b64      = btoa(String.fromCharCode(...bytes));
    const vaultEntry = await base44.asServiceRole.entities.PassportVault.create({
      passport_token:    `REC_${receiptNumber}`,
      user_email:        c.client_email,
      document_type:     'payment_reference',
      encrypted_file_uri: `data:text/html;base64,${b64}`,
      file_name:         `Receipt_${receiptNumber}.html`,
      mime_type:         'text/html',
      file_size_bytes:   bytes.length,
      status:            'active',
      uploaded_at:       new Date().toISOString(),
      is_emergency_accessible: false,
    });
    vaultId = vaultEntry?.id ?? null;
  } catch (_) {}

  tasks.push(
    base44.asServiceRole.entities.CaseRecord.update(case_id, {
      receipt_vault_id: vaultId || undefined,
      receipt_html:     html,
    }),
    base44.asServiceRole.entities.AuditLog.create({
      event_type: 'payment_receipt_issued', actor_id: 'system', actor_role: 'system',
      actor_name: 'Morales Automation', resource_type: 'CaseRecord', resource_id: case_id,
      case_id, sensitive: false, timestamp: new Date().toISOString(),
      details: { receipt_number: receiptNumber, amount_paid: amountPaid, vault_id: vaultId },
    })
  );

  await Promise.allSettled(tasks);

  return ok({ receipt_number: receiptNumber, sent_to: c.client_email, vault_id: vaultId });
}, { name: 'sendPaymentReceipt', requireAuth: false }));
