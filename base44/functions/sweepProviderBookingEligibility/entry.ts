import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { checkProviderBookingEligibility } from '../../shared/providerBookingEligibility.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * sweepProviderBookingEligibility — the ONLY path that may SET
 * Doctor.booking_suspended:true. Runs daily (freshness-cron.yml). Never
 * clears a suspension — that is clearProviderBookingSuspension's job alone
 * (admin-only, requires override_reason), matching "AI/automated code may
 * raise caution, never clear it."
 *
 * Per-doctor failures are isolated (own try/catch) so one bad record can't
 * abort the rest of the sweep — the same fix already applied elsewhere in
 * this repo to escalateSoloCheckIn/checkPartnerSLABreaches.
 */

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }, '-created_date', 500).catch(() => []);
  const suspended: string[] = [];
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  for (const doctor of (doctors as any[])) {
    try {
      if (doctor.booking_suspended === true) continue; // already suspended, nothing new to do

      const [highReports, criticalReports] = await Promise.all([
        base44.asServiceRole.entities.ProviderConcernReport.filter({ doctor_id: doctor.id, severity: 'high', status: 'actioned' }).catch(() => []),
        base44.asServiceRole.entities.ProviderConcernReport.filter({ doctor_id: doctor.id, severity: 'critical', status: 'actioned' }).catch(() => []),
      ]);
      const recentHigh = (highReports as any[]).filter((r: any) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;
      const recentCritical = (criticalReports as any[]).filter((r: any) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;

      const result = checkProviderBookingEligibility(doctor, { high: recentHigh, critical: recentCritical });
      if (!result.eligible) {
        const nowISO = new Date().toISOString();
        await base44.asServiceRole.entities.Doctor.update(doctor.id, {
          booking_suspended: true,
          booking_suspended_reason: result.reasons.join(' '),
          booking_suspended_at: nowISO,
        });
        suspended.push(doctor.id);

        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'provider_booking_suspended',
          actor_id: 'system', actor_role: 'system', actor_name: 'sweepProviderBookingEligibility',
          resource_type: 'Doctor', resource_id: doctor.id, case_id: null,
          sensitive: false, timestamp: nowISO,
          details: { reasons: result.reasons },
          prev_hash: await computePrevHash(base44),
        }).catch(() => {});

        const adminEmail = Deno.env.get('ADMIN_EMAIL');
        if (adminEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Medical Travel Safety', to: adminEmail,
            subject: `A provider's booking eligibility was suspended | Morales`,
            body: `<p>A provider was automatically flagged as ineligible for new bookings.</p><p><strong>Reasons:</strong> ${result.reasons.join(' ')}</p><p>This needs an admin review; only an explicit admin action can clear it.</p>`,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('[sweepProviderBookingEligibility] doctor', doctor?.id, e);
    }
  }

  return ok({ success: true, checked: (doctors as any[]).length, newly_suspended: suspended.length, suspended });
}, { name: 'sweepProviderBookingEligibility', requireAuth: false, rateLimit: false }));
