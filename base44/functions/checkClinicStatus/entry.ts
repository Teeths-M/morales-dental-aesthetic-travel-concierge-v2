import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { TTL_MS, isFresh, flagForReview } from '../_shared/freshness.ts';

/**
 * checkClinicStatus — LIVE, time-of-action clinic operating-status check.
 *
 * Called at the booking-confirm / payment step (NOT from cache elsewhere). A
 * booking may only proceed when the clinic is 'operating' AND its status was
 * confirmed within the clinic-status TTL (24h). Anything else is BLOCKED with a
 * clear message — we never proceed on cached "open" status.
 *
 * Rollout: with CLINIC_GATE_ENFORCE !== 'true' the truthful decision is still
 * returned but flagged enforced:false, so the UI shows an "operating status
 * pending re-verification" label (fail-safe option b) instead of a hard stop —
 * this avoids freezing every booking before any clinic has been attested. Set
 * CLINIC_GATE_ENFORCE=true to activate the hard block per spec once clinics are
 * onboarded via attestClinicStatus.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  const { clinic_id, clinic_name, country, city, doctor_id } = await body<{
    clinic_id?: string; clinic_name?: string; country?: string; city?: string; doctor_id?: string;
  }>();

  const enforced = Deno.env.get('CLINIC_GATE_ENFORCE') === 'true';

  // ── Resolve the clinic record ──────────────────────────────────────────────
  let clinic: any = null;
  let label = clinic_name || '';

  if (clinic_id) {
    clinic = await base44.asServiceRole.entities.Clinic.get(clinic_id).catch(() => null);
  } else if (doctor_id) {
    const doc = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
    if (doc) {
      label = doc.clinic_name || doc.full_name || label;
      if (doc.clinic_name) {
        const matches = await base44.asServiceRole.entities.Clinic.filter({
          name: doc.clinic_name, country: doc.clinic_country,
        }, '-status_verified_at', 1).catch(() => []);
        clinic = matches?.[0] || null;
      }
    }
  } else if (clinic_name && country) {
    const matches = await base44.asServiceRole.entities.Clinic.filter({
      name: clinic_name, country,
    }, '-status_verified_at', 1).catch(() => []);
    clinic = matches?.[0] || null;
  } else {
    return err('Provide clinic_id, doctor_id, or clinic_name + country.');
  }

  const blockMessage = "We couldn't confirm this clinic's current status — please check back shortly. Your coordinator has been notified.";

  // ── Unknown clinic — cannot confirm, so cannot proceed ─────────────────────
  if (!clinic) {
    await flagForReview(base44, {
      subject_type: 'clinic_status',
      subject_label: label || `${clinic_name || 'Unknown clinic'} (${country || '—'})`,
      change_type: 'source_unavailable',
      detail: 'Booking attempted for a clinic with no verified operating-status record. Onboard and attest this clinic before it can take bookings.',
      detected_via: 'live_check',
      severity: 'critical',
    });
    return ok({
      decision: 'blocked',
      enforced,
      operating_status: 'unknown',
      last_verified_at: null,
      reason: 'no_clinic_record',
      message: blockMessage,
    });
  }

  label = clinic.name || label;
  const fresh = isFresh(clinic.status_verified_at, TTL_MS.clinic_status);
  const operating = clinic.operating_status === 'operating';

  // ── Confirmed: operating AND freshly verified ──────────────────────────────
  if (operating && fresh) {
    return ok({
      decision: 'confirmed',
      enforced,
      clinic_id: clinic.id,
      clinic_name: label,
      operating_status: clinic.operating_status,
      last_verified_at: clinic.status_verified_at,
      reason: 'fresh',
      message: 'Clinic operating status confirmed.',
    });
  }

  // ── Blocked: closed/suspended, or stale attestation ────────────────────────
  const changeType = (clinic.operating_status === 'closed' || clinic.operating_status === 'suspended')
    ? 'closed'
    : 'stale_no_reverification';
  await flagForReview(base44, {
    subject_type: 'clinic_status',
    subject_id: clinic.id,
    subject_label: `${label} (${clinic.country || '—'})`,
    change_type: changeType,
    detail: operating
      ? `Operating status last confirmed ${clinic.status_verified_at || 'never'} — past the ${TTL_MS.clinic_status / 3600000}h TTL. Needs live re-attestation before bookings resume.`
      : `Clinic marked '${clinic.operating_status}'. Bookings blocked pending review.`,
    detected_via: 'live_check',
    previous_value: clinic.operating_status,
    severity: 'critical',
  });

  return ok({
    decision: 'blocked',
    enforced,
    clinic_id: clinic.id,
    clinic_name: label,
    operating_status: clinic.operating_status,
    last_verified_at: clinic.status_verified_at || null,
    reason: operating ? 'stale' : clinic.operating_status,
    message: blockMessage,
  });
}, { name: 'checkClinicStatus', requireAuth: true }));
