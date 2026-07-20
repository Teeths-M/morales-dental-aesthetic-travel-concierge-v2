import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import ItineraryIntakeBar from '@/components/byoj/ItineraryIntakeBar';
import VerificationResult from '@/components/byoj/VerificationResult';
import ProtectionEnroll from '@/components/byoj/ProtectionEnroll';

/**
 * Bring Your Own Journey — protection for a procedure booked OUTSIDE Morales.
 * Flow: itinerary entry → honest verification result → protection enrollment.
 * This is a standalone surface, not a modification of the booking flow.
 */
export default function BringYourOwnJourney() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('intake'); // intake | result | enroll | done
  const [form, setForm] = useState({
    journey_type: 'medical',
    destination_country: '', destination_city: '',
    doctor_name: '', clinic_name: '', procedures: [], surgery_date: '', doctor_license: '',
    activity_name: '', venue_name: '', activity_type: '',
    // Link to the page the patient actually booked through — lets verification
    // look at the exact provider they mean, not a same-named lookalike.
    booking_url: '',
  });
  const [result, setResult] = useState(null);
  const [enrollResult, setEnrollResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleVerify = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyExternalJourney', {
        ...form, external_journey_id: result?.external_journey_id || undefined,
      });
      const payload = res?.data ?? res ?? {};
      if (payload.error) { toast.error(payload.error); return; }
      setResult(payload);
      setStep('result');
    } catch (_) {
      toast.error('We couldn’t complete verification just now. Please try again.');
    } finally { setLoading(false); }
  };

  const handleEnroll = async ({ disclosure_accepted, family_visibility_opt_in }) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('enrollExternalJourney', {
        external_journey_id: result?.external_journey_id,
        plan: 'single_journey',
        disclosure_accepted,
        family_visibility_opt_in,
      });
      const payload = res?.data ?? res ?? {};
      if (payload.error) { toast.error(payload.error); return; }
      setEnrollResult(payload);
      setStep('done');
    } catch (_) {
      toast.error('Enrollment didn’t go through. Please try again.');
    } finally { setLoading(false); }
  };

  const goBack = () => {
    if (step === 'result') setStep('intake');
    else if (step === 'enroll') setStep('result');
    else navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#060B16] text-white px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto">

        {step !== 'done' && (
          <button onClick={goBack}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#7E939C] hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#D4AF37] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Bring Your Own Journey
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-2">
            Booked somewhere else? <span className="text-[#D4AF37]">We’ll still protect you.</span>
          </h1>
          <p className="text-[#B7C6CC] text-[15px] max-w-2xl">
            Tell us the journey you already booked. We’ll verify the doctor and clinic through our real safety
            engines, then monitor your trip end to end — before, during, and after surgery.
          </p>
        </div>

        {/* Steps */}
        {step === 'intake' && (
          <>
            <ItineraryIntakeBar form={form} update={update} onVerify={handleVerify} loading={loading} needsSignIn={!user} />
            <p className="text-[12px] text-[#54666E] mt-3">
              Manual entry for now. Morales did not select or vet this provider — we verify, monitor, and support.
            </p>
          </>
        )}

        {step === 'result' && result && (
          <div className="max-w-2xl">
            <VerificationResult result={result} onContinue={() => setStep('enroll')} />
          </div>
        )}

        {step === 'enroll' && (
          <div className="max-w-2xl">
            <ProtectionEnroll onEnroll={handleEnroll} loading={loading} />
          </div>
        )}

        {step === 'done' && enrollResult && (
          <div className="max-w-2xl rounded-2xl border border-[#0E8A7D]/40 bg-[#0E8A7D]/10 p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-[#3FBF8F] mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">You’re protected</h2>
            <p className="text-[#B7C6CC] text-[14px] max-w-md mx-auto">{enrollResult.message}</p>
            <button onClick={() => navigate('/dashboard')}
              className="mt-6 rounded-xl px-6 py-3 font-semibold bg-gradient-to-br from-[#D4AF37] to-[#b8912b] text-[#060B16] hover:opacity-95 transition-opacity">
              Go to my dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}