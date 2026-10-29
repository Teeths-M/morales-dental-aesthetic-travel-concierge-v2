import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { buildIntakeStages } from '@/lib/msafeIntake';

/**
 * useMsafeIntake — loads the real provider record the walkthrough stands on.
 *
 * Deliberately reads the live Doctor and Clinic rows rather than holding a
 * copy of the reference screenshot's numbers: if the clinic's licence check is
 * pending, the card says pending. Only runs when the walkthrough is actually
 * on screen, so a live chat session never pays for the lookup.
 */
export function useMsafeIntake(enabled) {
  const [doctor, setDoctor] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const verified = await base44.entities.Doctor.filter({ verification_status: 'verified' }, '-created_date', 50);
        const list = Array.isArray(verified) ? verified : (verified?.items || []);
        const picked =
          list.find((d) => /margarita/i.test(d.clinic_name || '')) || list[0] || null;

        if (!picked) {
          if (!cancelled) setDoctor(null);
          return;
        }

        if (!cancelled) setDoctor(picked);

        const clinicName = (picked.clinic_name || '').trim();
        if (clinicName) {
          const clinics = await base44.entities.Clinic.filter({ name: clinicName }, '-created_date', 5);
          const rows = Array.isArray(clinics) ? clinics : (clinics?.items || []);
          if (!cancelled) setClinic(rows[0] || null);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  const stages = useMemo(() => buildIntakeStages({ doctor, clinic }), [doctor, clinic]);

  return { stages, loading, loaded, failed };
}

export default useMsafeIntake;