import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Eye, Shield, CheckCircle2, Clock, AlertTriangle, MapPin, Loader2 } from 'lucide-react';

const STAGE_STEPS = ['consultation', 'planning', 'booking', 'travel', 'procedure', 'recovery', 'aftercare'];

export default function GuardianView() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [caseData, setCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sessions = await base44.entities.GuardianSession.filter({ view_token: token });
      if (!sessions[0]) { setError('Invalid link'); setLoading(false); return; }
      const s = sessions[0];
      if (!s.is_active || new Date(s.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }
      setSession(s);
      // Increment view count
      await base44.entities.GuardianSession.update(s.id, {
        view_count: (s.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString()
      });
      // Load case — public fields only
      if (s.case_id) {
        const cases = await base44.entities.CaseRecord.filter({ id: s.case_id });
        if (cases[0]) setCase(cases[0]);
      }
      setLoading(false);
    };
    if (token) load();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (expired) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Guardian Link Expired</h2>
        <p className="text-slate-400 text-sm">This tracking link has expired. Ask the traveler to generate a new one.</p>
      </div>
    </div>
  );

  if (error || !session) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
        <p className="text-slate-400 text-sm">This guardian link does not exist or has been revoked.</p>
      </div>
    </div>
  );

  const currentStageIndex = STAGE_STEPS.indexOf(caseData?.journey_stage || 'consultation');
  const expiresIn = Math.round((new Date(session.expires_at) - new Date()) / (1000 * 60 * 60));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950">
      {/* Guardian header */}
      <div className="border-b border-blue-900/50">
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="w-16 h-16 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-700/50">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Guardian View — Read Only</p>
          <h1 className="text-2xl font-bold text-white">{session.patient_name}'s Journey</h1>
          <p className="text-slate-400 text-sm mt-1">Shared with {session.guardian_name}</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Expires in {expiresIn}h · Look only — no actions available
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Safety status */}
        <div className={`rounded-2xl border p-5 text-center ${
          caseData?.safe_t_result === 'PASSED' ? 'bg-emerald-900/30 border-emerald-700/50' :
          caseData?.safe_t_result === 'BLOCKED' ? 'bg-red-900/30 border-red-700/50' :
          'bg-slate-800/50 border-slate-700/50'
        }`}>
          {caseData?.safe_t_result === 'PASSED'
            ? <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            : <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />}
          <p className="font-bold text-white text-lg">{session.patient_name}</p>
          <p className="text-slate-400 text-sm mt-1">
            Status: <span className="font-semibold text-white">{caseData?.status || 'Active Journey'}</span>
          </p>
          {caseData?.safe_t_result && (
            <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
              caseData.safe_t_result === 'PASSED' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-300'
            }`}>Safe-T: {caseData.safe_t_result}</span>
          )}
        </div>

        {/* Journey stage */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-4">Journey Stage</p>
            <div className="flex gap-1 flex-wrap">
              {STAGE_STEPS.map((step, i) => (
                <div key={step} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  i < currentStageIndex ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300' :
                  i === currentStageIndex ? 'bg-blue-700 border-blue-500 text-white' :
                  'bg-slate-900/50 border-slate-700 text-slate-500'
                }`}>
                  {i <= currentStageIndex && <CheckCircle2 className="w-3 h-3" />}
                  <span className="capitalize">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Procedure info */}
        {caseData && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Procedure Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Destination', val: caseData.procedure_country },
                { label: 'Procedure', val: caseData.procedures?.[0] || 'Medical Procedure' },
                { label: 'Case Priority', val: caseData.case_priority },
                { label: 'Risk Level', val: caseData.risk_score },
              ].filter(i => i.val).map(item => (
                <div key={item.label} className="bg-slate-900/50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-semibold">{item.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 capitalize">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watermark */}
        <div className="flex items-center gap-2 justify-center text-xs text-slate-600">
          <Shield className="w-3.5 h-3.5" />
          <span>Morales Medical Safe-T Guardian View · Look-only · No PII exposed</span>
        </div>
      </div>
    </div>
  );
}