import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { verifyOptOutToken } from '../../shared/optOutToken.ts';

/**
 * optOutDoctorOutreach — public, token-gated. The doctor has no M account, so
 * this cannot require login. Suppresses all future doctor-nomination outreach
 * to the email in the token (not just the one nomination it was minted for) —
 * a different patient nominating the same doctor again must not re-trigger a
 * send. See reviewDoctorNomination's suppression check.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { token } = await body<{ token?: string }>();

  const payload = await verifyOptOutToken(token);
  if (!payload) return err('This link is invalid or has expired.', 400);

  const matches = await base44.asServiceRole.entities.DoctorNomination.filter(
    { doctor_email: payload.doctor_email }, '-created_date', 50,
  ).catch(() => []);

  const nowISO = new Date().toISOString();
  await Promise.all((matches as any[]).map((n) =>
    base44.asServiceRole.entities.DoctorNomination.update(n.id, {
      outreach_opt_out: true,
      outreach_opt_out_at: nowISO,
    }).catch(() => {}),
  ));

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'doctor_nomination_opted_out',
    actor_id: 'system', actor_role: 'system', actor_name: 'Doctor Opt-Out', actor_email: payload.doctor_email,
    resource_type: 'DoctorNomination', resource_id: payload.nomination_id,
    details: {},
    sensitive: false, timestamp: nowISO,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ status: 'opted_out' });
}, { name: 'optOutDoctorOutreach', requireAuth: false }));
