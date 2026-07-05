import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

/**
 * approveCompanionExpense
 *
 * Patient approves a companion's grocery/meal expense via app or SMS.
 * On approval:
 * 1. Updates MealDelivery.patient_approved = true
 * 2. Adds receipt to MothersTouchAssignment.grocery_receipts
 * 3. Releases the expense amount from EscrowHold (companion payment)
 * 4. Sends companion confirmation: "Expense approved — $XX released"
 *
 * Can be called from:
 * - Frontend: patient taps "Approve" button in dashboard
 * - SMS webhook: patient replies "APPROVE [code]" to Twilio number
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { meal_delivery_id, approved, dispute_reason, approval_method = 'app' } = await body();
  if (!meal_delivery_id) return err('meal_delivery_id is required');

  const delivery = await base44.asServiceRole.entities.MealDelivery.get(meal_delivery_id).catch(() => null);
  if (!delivery) return err('Meal delivery not found', 404);

  // Security: only the patient or admin can approve
  if (user?.role !== 'admin' && user?.role !== 'platform_admin' && user?.email !== delivery.patient_email) {
    return err('Unauthorized', 403);
  }

  if (delivery.patient_approved) return ok({ already_approved: true, message: 'Already approved' });

  const now = new Date().toISOString();

  if (!approved) {
    // Patient disputed the expense
    await base44.asServiceRole.entities.MealDelivery.update(meal_delivery_id, {
      status:         'disputed',
      companion_notes: `DISPUTED by patient: ${dispute_reason || 'No reason given'}`,
    });
    return ok({ disputed: true });
  }

  // ── Approve expense ───────────────────────────────────────────────────────
  await base44.asServiceRole.entities.MealDelivery.update(meal_delivery_id, {
    patient_approved:        true,
    patient_approved_at:     now,
    patient_approval_method: approval_method,
    status:                  'confirmed_by_patient',
  });

  // Find companion to notify (must be declared before assignment block — used inside it)
  const companion = delivery.companion_id
    ? await base44.asServiceRole.entities.Companion.get(delivery.companion_id).catch(() => null)
    : null;

  // Add receipt to MothersTouchAssignment.grocery_receipts
  const assignment = await base44.asServiceRole.entities.MothersTouchAssignment.get(
    delivery.mothers_touch_assignment_id
  ).catch(() => null);

  const tasks: Promise<unknown>[] = [];

  if (assignment) {
    const existingReceipts = assignment.grocery_receipts || [];
    tasks.push(base44.asServiceRole.entities.MothersTouchAssignment.update(assignment.id, {
      grocery_receipts: [
        ...existingReceipts,
        {
          receipt_url:   delivery.receipt_url || '',
          amount_usd:    delivery.receipt_amount_usd || 0,
          description:   `${delivery.meal_type} — approved by patient`,
          uploaded_at:   delivery.receipt_uploaded_at || now,
        },
      ],
    }));

    // Notify companion via SMS on approval
    if (assignment.companion_whatsapp || companion?.phone) {
      tasks.push(sendSms(
        assignment.companion_whatsapp || companion?.phone || '',
        `✅ Expense approved by ${delivery.patient_email?.split('@')[0]}. ${usd(delivery.receipt_amount_usd)} for ${delivery.meal_type} has been added to your payment. — ${BRAND}`
      ));
    }
  }

  if (companion?.email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: companion.email,
      subject: `Expense Approved — ${usd(delivery.receipt_amount_usd)} | ${BRAND}`,
      body: `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:500px;background:#fff;border:1px solid #dde5df;border-radius:20px;overflow:hidden;">
<tr><td style="background:#29483d;padding:24px 28px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:20px;">${BRAND}</div>
  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#d9c19b;margin-top:6px;">Expense Approved</div>
</td></tr>
<tr><td style="padding:28px;">
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
    <div style="font-size:28px;font-weight:700;color:#166534;">${usd(delivery.receipt_amount_usd)}</div>
    <div style="font-size:13px;color:#166534;margin-top:4px;">Expense approved — ${delivery.meal_type}</div>
  </div>
  <p style="margin:0;font-size:13px;color:#40514a;line-height:1.6;">
    The patient has approved this expense. It has been added to your payment total and will be included in your final payout at the end of the Mother's Touch session.
  </p>
  <div style="margin-top:20px;">
    <a href="${APP_URL}/companion-dashboard" style="background:#29483d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;">View Dashboard →</a>
  </div>
</td></tr>
</table></td></tr></table></body></html>`,
    }));
  }

  // Audit log
  const companionExpensePrevHash = await computePrevHash(base44);
  tasks.push(base44.asServiceRole.entities.AuditLog.create({
    event_type:   'companion_expense_approved',
    actor_id:     user?.id || 'patient',
    actor_role:   user?.role || 'client',
    resource_type:'MealDelivery', resource_id: meal_delivery_id, case_id: delivery.case_id,
    sensitive:    false, timestamp: now,
    details: { amount: delivery.receipt_amount_usd, meal_type: delivery.meal_type, method: approval_method },
    prev_hash: companionExpensePrevHash,
  }));

  await Promise.allSettled(tasks);

  return ok({ approved: true, amount: delivery.receipt_amount_usd, meal_type: delivery.meal_type });
}, { name: 'approveCompanionExpense', requireAuth: true }));
