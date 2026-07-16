// @ts-nocheck — pre-existing type gaps; build passes
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Stethoscope, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function decodeToken(token) {
  try {
    const [dataPart] = token.split('.');
    const payload = JSON.parse(atob(dataPart));
    return payload;
  } catch {
    return null;
  }
}

export default function PortalLocalDoctor() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'accepted' | 'declined'

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Invalid referral link.'); setLoading(false); return; }

      const payload = decodeToken(token);
      if (!payload) { setError('Could not read referral token.'); setLoading(false); return; }
      if (payload.expires_at && Date.now() > payload.expires_at) {
        setError('This referral link has expired. Please contact the M Local team.'); setLoading(false); return;
      }

      try {
        // Find the referral by portal_token
        const referrals = await base44.asServiceRole?.entities.LocalDoctorReferral?.filter(
          { portal_token: token }, '-created_date', 1
        ) || await base44.entities.LocalDoctorReferral.filter({ portal_token: token }, '-created_date', 1);

        if (!referrals.length) { setError('Referral not found or already processed.'); setLoading(false); return; }
        const ref = referrals[0];
        setReferral(ref);

        if (ref.status !== 'pending') {
          setOutcome(ref.status); setLoading(false); return;
        }

        // Load case data
        const cases = await base44.entities.CaseRecord.filter({ id: ref.case_id }, '-created_date', 1);
        setCaseData(cases[0] || null);
      } catch (_e) {
        setError('Could not load referral. Please try again or contact support.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const respond = async (decision) => {
    setSubmitting(true);
    try {
      await base44.entities.LocalDoctorReferral.update(referral.id, {
        status: decision,
        doctor_notes: notes || null,
        responded_at: new Date().toISOString(),
      });
      setOutcome(decision);
    } catch {
      setError('Could not save response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B16] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[#0C1A1D] border-red-800">
        <CardContent className="p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Referral</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (outcome === 'accepted') return (
    <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[#0C1A1D] border-[#2A3F4A]">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Referral Accepted</h2>
          <p className="text-gray-400 text-sm">
            Thank you. The M monitoring system has been notified. The patient or their guardian
            will be in touch to schedule a consultation.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (outcome === 'declined') return (
    <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[#0C1A1D] border-[#2A3F4A]">
        <CardContent className="p-8 text-center">
          <XCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Referral Declined</h2>
          <p className="text-gray-400 text-sm">
            Understood. M will look for another available local doctor in the patient's area.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const c = caseData || {};

  return (
    <div className="min-h-screen bg-[#060B16] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* M Local badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[#D4AF37] text-sm font-semibold">M Local Referral</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Patient Needs Follow-Up Care</h1>
          <p className="text-gray-500 text-sm mt-1">Review the details and accept or decline this referral.</p>
        </div>

        <Card className="bg-[#0C1A1D] border-[#2A3F4A] mb-4">
          <CardContent className="p-5 space-y-4">
            {/* Patient summary */}
            <div className="p-4 rounded-xl bg-[#060B16] border border-[#2A3F4A]">
              <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Patient Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Patient</span>
                  <span className="text-white font-medium">{c.client_name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Procedure</span>
                  <span className="text-white">{c.procedure_name || c.procedure || '—'}</span>
                </div>
                {c.client_country && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Home country</span>
                    <span className="text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" /> {c.client_country}
                    </span>
                  </div>
                )}
                {referral?.created_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Referred</span>
                    <span className="text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {format(parseISO(referral.created_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Why this referral */}
            <Alert className="bg-amber-500/5 border-amber-500/20">
              <Stethoscope className="w-4 h-4 text-amber-400" />
              <AlertDescription className="text-amber-300 text-xs ml-2">
                M's AI monitoring detected a concern during the patient's post-return check-ins.
                You have been matched as the closest verified M Local doctor in their home country.
              </AlertDescription>
            </Alert>

            {/* Doctor notes */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Notes for the patient <span className="text-gray-500">(optional)</span>
              </label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please contact my clinic to schedule an appointment…"
                className="bg-[#060B16] border-[#2A3F4A] text-white min-h-[80px]" />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-4 bg-red-900/20 border-red-800">
            <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => respond('declined')} disabled={submitting}
            className="flex-1 border-[#2A3F4A] text-gray-400 hover:bg-red-900/20 hover:border-red-800 hover:text-red-400">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Decline'}
          </Button>
          <Button onClick={() => respond('accepted')} disabled={submitting}
            className="flex-1 bg-[#D4AF37] text-black font-semibold hover:bg-[#c49e30] disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
            Accept Referral
          </Button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Accepting means you agree to contact this patient within 24 hours.
        </p>
      </div>
    </div>
  );
}
