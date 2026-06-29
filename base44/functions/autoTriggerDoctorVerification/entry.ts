/**
 * autoTriggerDoctorVerification
 *
 * Cron: every 30 minutes.
 *
 * M never waits for an admin to manually start doctor verification.
 * When a doctor uploads their license and has pending_verification status,
 * M automatically starts the AI verification pipeline.
 *
 * Human still does the FINAL approval — that's intentional.
 * M does all the document analysis and pre-checks automatically.
 */

import { createHandler, ok } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44 }) => {
  const results = { triggered: 0, skipped: 0, errors: 0 };
  const now = new Date().toISOString();

  // Find doctors who are in pending_verification with a license uploaded
  // but verification hasn't been initiated yet (no verification_initiated_at)
  let doctors = [];
  try {
    doctors = await base44.asServiceRole.entities.Doctor.filter({
      status: 'pending_verification',
      verification_status: 'pending_verification',
    }) ?? [];
  } catch (_) {
    return ok({ success: true, triggered: 0, message: 'Doctor entity unavailable — skipped' });
  }

  const eligible = doctors.filter(d =>
    d.license_url &&           // has uploaded license
    d.email &&                 // has email
    !d.verification_initiated_at  // verification not yet started
  );

  for (const doc of eligible) {
    try {
      // Trigger the AI verification pipeline
      await base44.functions.invoke('runDoctorVerification', {
        doctor_id: doc.id,
        trigger_source: 'auto_cron',
      }).catch(() => {});

      // Mark as initiated so we don't re-trigger
      await base44.asServiceRole.entities.Doctor.update(doc.id, {
        verification_initiated_at: now,
        verification_status: 'verifying',
      }).catch(() => {});

      // Notify the doctor that verification has started
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Dental & Aesthetic Travel Concierge',
        to: doc.email,
        subject: 'M is verifying your credentials — Morales Concierge',
        body: `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#060B16;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0C1A1D,#080F18);padding:32px;border-bottom:1px solid rgba(212,175,55,0.3);">
    <div style="font-size:28px;font-weight:900;color:#D4AF37;">M</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">Verification Started</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 16px;">Hello Dr. ${doc.full_name || ''},</p>
    <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 16px;">M has automatically started verifying your credentials. Our AI is reviewing your medical license and documents right now.</p>
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">✓ License received and queued for review<br>✓ AI document analysis in progress<br>✓ Our team will review the results and activate your account</p>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);margin:0;">Typical verification time: 24–48 hours. You will receive an email as soon as your account is approved. — Morales Concierge Team</p>
  </div>
</div>`,
      }).catch(() => {});

      results.triggered++;
    } catch (_) {
      results.errors++;
    }
  }

  if (eligible.length === 0) results.skipped = doctors.length;

  console.log('[autoTriggerDoctorVerification]', results);

  return ok({
    success: true,
    run_at: now,
    doctors_found: doctors.length,
    eligible_for_trigger: eligible.length,
    triggered: results.triggered,
    errors: results.errors,
  });
}, { name: 'autoTriggerDoctorVerification', requireAuth: false }));
