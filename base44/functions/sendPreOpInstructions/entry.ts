import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { buildPreOpChecklist } from '../../shared/preOpChecklist.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

/**
 * sendPreOpInstructions — the patient's personalised "how to get ready" checklist.
 *
 * Content is DETERMINISTIC + conservative (see _shared/preOpChecklist.ts): universal
 * prep plus prompts to confirm specifics with the doctor. It NEVER instructs a patient
 * to stop a medication or sets an exact fasting window on its own.
 *
 * ON-PLATFORM: the checklist is stored on the case and read in-portal; the outbound
 * message is LINK-ONLY (a nudge + secure link, no clinical content in the email).
 *
 * Trigger: after the doctor confirms the procedure date, or on the pre-op countdown.
 * requireAuth:false so the pipeline / cron can invoke it (no sensitive data in output) —
 * but gated with internalOrAdminAuthorized so it isn't a public repeat-spam vector.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';

function nudgeEmail(portalUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%"><tr><td align="center">
<table style="max-width:520px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:18px;">
<tr><td style="padding:26px 30px;">
  <div style="font-size:22px;font-weight:900;color:#D4AF37;margin-bottom:12px;">M</div>
  <p style="font-size:15px;color:#fff;margin:0 0 10px;font-weight:700;">Your preparation checklist is ready.</p>
  <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;line-height:1.6;">A few simple steps to get ready for your procedure — open your Morales portal to see them, in your language.</p>
  <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:12px 28px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, force, internal_secret } = await body<{ case_id?: string; force?: boolean; internal_secret?: string }>();

  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!case_id) return err('case_id is required');

  const c = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!c) return err('Case not found', 404);

  // Idempotency: don't re-send unless explicitly forced. Still return the
  // stored checklist content — a repeat call (e.g. M-Care asked again later
  // in the same conversation) previously got back only a boolean, with
  // nothing for M-Care to actually say to the patient.
  if (c.pre_op_sent_at && !force) {
    return ok({ already_sent: true, sent_at: c.pre_op_sent_at, checklist: c.pre_op_checklist || [] });
  }

  const checklist = buildPreOpChecklist({
    procedures: Array.isArray(c.procedures) ? c.procedures : [],
    takes_medications: !!c.medications && c.medications !== 'None',
    anesthesia_history: !!c.anesthesia_history && !/no complication/i.test(String(c.anesthesia_history)),
    smoker: c.smoking_status === true,
    has_companion: Number(c.companion_cost) > 0,
  });

  const now = new Date().toISOString();

  // Store the checklist IN-PORTAL (read there; never emailed).
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    pre_op_checklist: checklist,
    pre_op_sent_at: now,
  }).catch(() => {});

  // LINK-ONLY nudge.
  if (c.client_email) {
    const portalUrl = `${APP_URL}/dashboard/journey`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: c.client_email,
      subject: `Your preparation checklist is ready — ${BRAND}`,
      body: nudgeEmail(portalUrl),
    }).catch(() => {});
  }

  // checklist is returned in full (not just a count) so the caller — M-Care
  // in particular — can actually present these steps in conversation instead
  // of only being able to say "check your email."
  return ok({ case_id, items: checklist.length, checklist, sent_at: now });
}, { name: 'sendPreOpInstructions', requireAuth: false, allowedRoles: [] }));
