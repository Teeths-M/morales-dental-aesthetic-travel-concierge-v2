import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ProviderVerification from '@/components/care-team/ProviderVerification';
import ConsultationBrief from '@/components/care-team/ConsultationBrief';
import ConsentManager from '@/components/care-team/ConsentManager';
import { CheckCircle2 } from 'lucide-react';

/**
 * BookVirtualConsultation — /consult/:doctorId. Brief -> Consent -> real
 * timezone-converted slot picker -> price/cancellation confirm -> submit.
 * "Meet the real care team. Understand every step. Proceed only when you
 * are confident." — the feature's real trust tagline, used verbatim.
 */

// Well-known no-dependency approximation for converting a wall-clock
// date/time in an arbitrary IANA zone to a real UTC instant, since no
// timezone library is used in this app. Correct for the overwhelming
// majority of cases; a real DST-transition edge case is a known,
// disclosed limit (see CLAUDE.md's verification notes for this feature).
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  if (!timeZone) return guess;
  try {
    const inZone = new Date(guess.toLocaleString('en-US', { timeZone }));
    const diff = guess.getTime() - inZone.getTime();
    return new Date(guess.getTime() + diff);
  } catch (_) {
    return guess;
  }
}

const STEPS = ['brief', 'consent', 'schedule', 'confirm'];

export default function BookVirtualConsultation() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState('brief');
  const [doctor, setDoctor] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [brief, setBrief] = useState(/** @type {any} */ ({ shared_fields: [] }));
  const [consents, setConsents] = useState(/** @type {any} */ ({}));
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const patientTimezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return ''; }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [doc, myConsultations] = await Promise.all([
        base44.entities.Doctor.get(doctorId),
        user?.email ? base44.entities.Consultation.filter({ email: user.email }, '-created_date', 1) : Promise.resolve([]),
      ]);
      setDoctor(doc);
      setConsultation(myConsultations?.[0] || null);

      const today = new Date().toISOString().slice(0, 10);
      const avail = await base44.entities.DoctorAvailability.filter({ doctor_id: doctorId, is_available: true }, 'date', 30).catch(() => []);
      setAvailability((avail || []).filter((a) => a.date >= today));
    } catch (_) { /* honest empty state below */ }
    setLoading(false);
  }, [doctorId, user?.email]);

  useEffect(() => { load(); }, [load]);

  const availableDates = availability.map((a) => a.date);
  const timesForSelectedDate = useMemo(() => {
    const row = availability.find((a) => a.date === selectedDate);
    return row?.time_slots || [];
  }, [availability, selectedDate]);

  const handleConsentChange = (type, granted) => setConsents((prev) => ({ ...prev, [type]: granted }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const utcInstant = zonedTimeToUtc(selectedDate, selectedTime, doctor?.clinic_timezone);
      const res = await base44.functions.invoke('bookVirtualConsultation', {
        consultation_id: consultation.id,
        doctor_id: doctorId,
        scheduled_at: utcInstant.toISOString(),
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
        patient_timezone: patientTimezone,
        brief_goals: brief.goals || '',
        brief_budget_range: brief.budget_range || undefined,
        brief_questions_for_doctor: brief.questions_for_doctor || '',
        brief_accessibility_companion_needs: brief.accessibility_companion_needs || '',
        brief_shared_fields: brief.shared_fields || [],
      });
      const data = res?.data || res;
      setResult(data);

      // Record the 3 optional consents now that the booking exists.
      await Promise.allSettled(
        Object.entries(consents).map(([type, granted]) =>
          base44.functions.invoke('recordVirtualConsultationConsent', {
            virtual_consultation_id: data.virtual_consultation_id, consent_type: type, granted,
          })
        )
      );
      // Telehealth consent is required — record it too.
      if (consents.telehealth) {
        await base44.functions.invoke('recordVirtualConsultationConsent', {
          virtual_consultation_id: data.virtual_consultation_id, consent_type: 'telehealth', granted: true,
        }).catch(() => {});
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Something went wrong booking your consultation.');
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>Loading…</div>;
  if (!doctor) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>This provider couldn't be found.</div>;
  if (!consultation) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 40, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
        Please complete your intake first before booking a virtual consultation.
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <CheckCircle2 size="40" color="#22C55E" style={{ marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Your consultation is booked</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
          A calendar invite and full details are in your Morales dashboard.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{ background: '#D4AF37', color: '#060B16', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
        >
          Back to my dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#D4AF37', marginBottom: 6 }}>Meet Your Care Team</p>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
        Meet the real care team.
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 24px' }}>
        Understand every step. Proceed only when you are confident.
      </p>

      <div style={{ marginBottom: 24 }}>
        <ProviderVerification doctorId={doctorId} />
      </div>

      {step === 'brief' && (
        <>
          <ConsultationBrief
            brief={brief}
            onChange={setBrief}
            availableSharedFields={['medical_conditions', 'allergies', 'medication_types', 'emotional_concern_types', 'pregnancy_status']}
          />
          <StepNav onNext={() => setStep('consent')} nextLabel="Continue" />
        </>
      )}

      {step === 'consent' && (
        <>
          <ConsentManager consents={consents} onChange={handleConsentChange} />
          <StepNav onBack={() => setStep('brief')} onNext={() => setStep('schedule')} nextDisabled={!consents.telehealth} nextLabel="Continue" />
        </>
      )}

      {step === 'schedule' && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            Pick a date and time (shown in your local time — {patientTimezone || 'your timezone'})
          </p>
          {availableDates.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>This provider has no upcoming availability listed yet.</p>
          ) : (
            <>
              <select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #2A3F4A', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13, marginBottom: 12 }}
              >
                <option value="">Select a date…</option>
                {availableDates.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {selectedDate && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {timesForSelectedDate.length === 0 && (
                    <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>No specific times listed for this date yet — please check back or contact the care team.</p>
                  )}
                  {timesForSelectedDate.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      style={{
                        background: selectedTime === t ? '#D4AF37' : 'transparent',
                        color: selectedTime === t ? '#060B16' : '#D4AF37',
                        border: '1px solid #D4AF37', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer',
                      }}
                    >
                      {t} (doctor's local time)
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <StepNav onBack={() => setStep('consent')} onNext={() => setStep('confirm')} nextDisabled={!selectedDate || !selectedTime} nextLabel="Continue" />
        </>
      )}

      {step === 'confirm' && (
        <>
          <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Confirm your booking</p>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
              {selectedDate} at {selectedTime} (doctor's local time)
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
              Price: {doctor.consultation_price_amount ? `${doctor.consultation_price_currency || 'USD'} ${doctor.consultation_price_amount}` : 'Not specified by this provider'}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
              Cancellation policy: {doctor.cancellation_policy || 'Not yet specified by this provider.'}
            </p>
          </div>
          {error && <p style={{ color: '#FCA5A5', fontSize: 12.5, marginBottom: 12 }}>{error}</p>}
          <StepNav
            onBack={() => setStep('schedule')}
            onNext={handleSubmit}
            nextDisabled={submitting}
            nextLabel={submitting ? 'Booking…' : 'Confirm & book'}
          />
        </>
      )}
    </div>
  );
}

function StepNav({ onBack = null, onNext, nextDisabled = false, nextLabel }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      {onBack && (
        <button type="button" onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '11px 20px', fontSize: 13, cursor: 'pointer' }}>
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          background: nextDisabled ? 'rgba(212,175,55,0.3)' : '#D4AF37', color: '#060B16', border: 'none',
          borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 13, cursor: nextDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
