import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { renderEmail } from '../_shared/emailTemplate.ts';
import { signOptOutToken } from '../_shared/optOutToken.ts';

/**
 * reviewDoctorNomination — the only function that can send doctor-nomination
 * outreach. Mirrors reviewRecoveryGuidance/verifyClinicStatus: submission can
 * only ever produce a pending_review row; only a named admin action here can
 * make it reach a real-world third party. Never creates or modifies a Doctor
 * record — if the nominated doctor ever signs up, they go through the exact
 * same self-signup + verification pipeline as anyone else. This is a lead
 * trigger only, never a verification bypass.
 *
 * The outbound email is deliberately generic: no patient name, review text,
 * photos, or procedure details ever leave the platform in it.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { nomination_id, decision, rejection_reason } = await body<{
    nomination_id?: string; decision?: 'approve' | 'reject'; rejection_reason?: string;
  }>();

  if (!nomination_id) return err('nomination_id is required');
  if (decision !== 'approve' && decision !== 'reject') return err('decision must be "approve" or "reject"');

  const nomination = await base44.asServiceRole.entities.DoctorNomination.get(nomination_id).catch(() => null);
  if (!nomination) return err('Nomination not found', 404);
  if (nomination.status !== 'pending_review') {
    return err('This nomination has already been reviewed.', 409);
  }

  const nowISO = new Date().toISOString();

  if (decision === 'reject') {
    await base44.asServiceRole.entities.DoctorNomination.update(nomination_id, {
      status: 'rejected',
      reviewer_id: user!.id,
      reviewed_at: nowISO,
      rejection_reason: String(rejection_reason || '').slice(0, 500),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'doctor_nomination_rejected',
      actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
      resource_type: 'DoctorNomination', resource_id: nomination_id,
      details: { rejection_reason: String(rejection_reason || '').slice(0, 500) },
      sensitive: false, timestamp: nowISO,
      prev_hash: await computePrevHash(base44),
    }).catch(() => {});

    return ok({ status: 'rejected' });
  }

  // ── decision === 'approve' ────────────────────────────────────────────────
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_nomination_approved',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'DoctorNomination', resource_id: nomination_id,
    details: {},
    sensitive: false, timestamp: nowISO,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  // Suppression check — has this doctor email opted out on any prior nomination?
  const priorForEmail = await base44.asServiceRole.entities.DoctorNomination.filter({ doctor_email: nomination.doctor_email }, '-created_date', 50).catch(() => []);
  const optedOut = (priorForEmail as any[]).some((n) => n.outreach_opt_out === true);

  if (optedOut) {
    await base44.asServiceRole.entities.DoctorNomination.update(nomination_id, {
      status: 'approved',
      reviewer_id: user!.id,
      reviewed_at: nowISO,
      outreach_skipped_reason: 'opted_out',
    });
    return ok({ status: 'approved', outreach_sent: false, reason: 'opted_out' });
  }

  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  let optOutUrl = '';
  try {
    const token = await signOptOutToken(nomination.doctor_email, nomination_id);
    optOutUrl = `${appUrl}/doctor-outreach-opt-out/${encodeURIComponent(token)}`;
  } catch (_) {
    // Fail closed on sending (not on the approval record) — never send an
    // outreach email with no working opt-out link.
    await base44.asServiceRole.entities.DoctorNomination.update(nomination_id, {
      status: 'approved',
      reviewer_id: user!.id,
      reviewed_at: nowISO,
      outreach_skipped_reason: 'opt_out_token_unavailable',
    });
    return ok({ status: 'approved', outreach_sent: false, reason: 'opt_out_token_unavailable' });
  }

  // Deliberately generic — no patient name, review text, photos, or procedure
  // details. This is cold outreach to someone with no M account yet.
  const html = renderEmail({
    appUrl,
    eyebrow: 'A Patient Recommended You',
    title: 'A patient recommended you to M',
    intro: 'M is a medical travel safety platform that helps patients find and safely book verified doctors abroad. A patient of yours recently shared a positive experience and thought you would be a great fit for our network.',
    ctaText: 'Learn More About M',
    ctaUrl: `${appUrl}/doctor-signup`,
    bodyHtml: `<p style="font-size:12px;color:rgba(238,242,247,0.45);margin:18px 0 0;">Not interested, or think this reached you by mistake? <a href="${optOutUrl}" style="color:#D4AF37;">Opt out of outreach like this</a>.</p>`,
  });

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: 'Morales Medical Travel Safety',
    to: nomination.doctor_email,
    subject: 'A patient recommended you to M',
    body: html,
  }).catch(() => {});

  await base44.asServiceRole.entities.DoctorNomination.update(nomination_id, {
    status: 'outreach_sent',
    reviewer_id: user!.id,
    reviewed_at: nowISO,
    outreach_sent_at: nowISO,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_nomination_outreach_sent',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'DoctorNomination', resource_id: nomination_id,
    details: {},
    sensitive: false, timestamp: new Date().toISOString(),
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ status: 'outreach_sent' });
}, { name: 'reviewDoctorNomination', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
