import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CALM } from '@/lib/brandTokens';
import LastVerified from './LastVerified';

/**
 * ClinicStatusGate — drop into the booking-confirm / payment step, keyed on the
 * specific clinic (or doctor) being booked. It runs a LIVE check at time-of-action
 * (checkClinicStatus) and reports the decision up via onDecision:
 *   'confirmed' → operating + freshly verified; the parent may allow payment.
 *   'blocked'   → enforced hard block; the parent MUST prevent payment.
 *   'pending'   → soft-launch label (CLINIC_GATE_ENFORCE off); shown as
 *                 unconfirmed, parent decides. Never shown as confirmed.
 *
 * Fail-safe: while loading or on error, it reports 'blocked' so nothing proceeds
 * on unconfirmed status.
 */
export default function ClinicStatusGate({ clinicId, clinicName, country, doctorId, onDecision, style }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['clinicStatus', clinicId || doctorId || clinicName, country],
    staleTime: 0, // always time-of-action; never a stale cache here
    retry: 0,
    queryFn: async () => {
      const res = await base44.functions.invoke('checkClinicStatus', {
        clinic_id: clinicId, clinic_name: clinicName, country, doctor_id: doctorId,
      });
      return res?.data ?? res;
    },
  });

  const enforced = data?.enforced;
  const confirmed = data?.decision === 'confirmed';
  const decision = isLoading || isError
    ? 'blocked'
    : confirmed ? 'confirmed'
      : enforced ? 'blocked' : 'pending';

  useEffect(() => { onDecision?.(decision); }, [decision, onDecision]);

  if (isLoading) {
    return <div style={{ fontSize: 12.5, color: CALM.textFaint, ...style }}>Confirming clinic status…</div>;
  }

  if (confirmed) {
    return (
      <div style={{ background: CALM.actionSoft, border: `1px solid ${CALM.border}`, borderRadius: 12, padding: '12px 14px', ...style }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: CALM.text }}>Clinic operating status confirmed</div>
        <LastVerified timestamp={data.last_verified_at} kind="clinic_status" style={{ marginTop: 4 }} />
      </div>
    );
  }

  // Blocked (enforced) or pending (soft-launch) — both presented as NOT confirmed.
  const hard = decision === 'blocked';
  return (
    <div
      style={{
        background: hard ? 'rgba(201,162,39,0.08)' : CALM.surfaceSoft,
        border: `1px solid ${hard ? '#C9A227' : CALM.border}`,
        borderRadius: 12, padding: '12px 14px', ...style,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: CALM.text }}>
        {hard ? 'Booking paused — clinic status unconfirmed' : 'Clinic status pending re-verification'}
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: CALM.textSoft }}>
        {data?.message || "We couldn't confirm this clinic's current status — please check back shortly."}
      </p>
      {data?.last_verified_at && <LastVerified timestamp={data.last_verified_at} kind="clinic_status" style={{ marginTop: 6 }} />}
    </div>
  );
}
