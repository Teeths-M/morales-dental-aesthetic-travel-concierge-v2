// @ts-nocheck — pre-existing type gap: base44 functions.invoke() args, matches Booking.jsx
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PROCEDURE_OPTIONS, UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';

const IDLE = { status: 'idle', data: null };

function procedureLabel(value) {
  return PROCEDURE_OPTIONS.find((p) => p.value === value)?.label || value;
}

/**
 * Fires proactive lookups the instant their prerequisite field lands in
 * `answers` — concurrently with whatever question is asked next, not after
 * the conversation ends. Doctor search and cost estimation both require a
 * real session (matchDoctorsForProcedure / calculatePriceQuote are
 * auth-required), so those naturally come alive right as the user clears the
 * auth gate; destination-partner coverage has no such requirement and can
 * fire the moment a destination is chosen, even as a guest.
 *
 * A soft "unavailable" status (distinct from "error") is used whenever the
 * backend cleanly declines rather than failing — e.g. no pricing catalog
 * entry for a procedure yet. That's a real, expected business state, not a
 * bug, and shouldn't be shown to the user as something broken.
 */
export function useIntakeBackgroundSearch({ answers, isAuthenticated }) {
  const [doctorSearch, setDoctorSearch] = useState(IDLE);
  const [costEstimate, setCostEstimate] = useState(IDLE);
  const [partnerPreview, setPartnerPreview] = useState(IDLE);

  const procedureInterest = answers.procedure_interest;
  const destinationCountry = answers.destination_country;
  const hasDestination = !!destinationCountry && destinationCountry !== UNSPECIFIED;

  // ── Doctor search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!procedureInterest || !isAuthenticated || doctorSearch.status !== 'idle') return;
    setDoctorSearch({ status: 'loading', data: null });
    base44.functions
      .invoke('matchDoctorsForProcedure', { procedure_interest: procedureInterest })
      .then((res) => {
        const payload = res?.data ?? res ?? {};
        setDoctorSearch({ status: payload.error ? 'unavailable' : 'done', data: payload });
      })
      .catch(() => setDoctorSearch({ status: 'unavailable', data: null }));
  }, [procedureInterest, isAuthenticated]);

  // ── Cost estimate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!procedureInterest || !isAuthenticated || costEstimate.status !== 'idle') return;
    setCostEstimate({ status: 'loading', data: null });
    base44.functions
      .invoke('calculatePriceQuote', {
        procedures: [{ name: procedureLabel(procedureInterest) }],
        country: hasDestination ? destinationCountry : null,
      })
      .then((res) => {
        const payload = res?.data ?? res ?? {};
        setCostEstimate({ status: payload.error ? 'unavailable' : 'done', data: payload });
      })
      .catch(() => setCostEstimate({ status: 'unavailable', data: null }));
  }, [procedureInterest, isAuthenticated, hasDestination]);

  // ── Destination partner coverage — no auth required ────────────────────────
  useEffect(() => {
    if (!hasDestination || partnerPreview.status !== 'idle') return;
    setPartnerPreview({ status: 'loading', data: null });
    base44.functions
      .invoke('intakePartnerAvailabilityPreview', { destination_country: destinationCountry })
      .then((res) => {
        const payload = res?.data ?? res ?? {};
        setPartnerPreview({ status: payload.error ? 'unavailable' : 'done', data: payload });
      })
      .catch(() => setPartnerPreview({ status: 'unavailable', data: null }));
  }, [hasDestination, destinationCountry]);

  return { doctorSearch, costEstimate, partnerPreview };
}
