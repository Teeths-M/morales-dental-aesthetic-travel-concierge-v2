import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, PenLine, CheckCircle2, Clock, MapPin, Lock, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const WAIVER_TEXT = `SAFE-T 4LIFE™ HIGH-RISK INFORMED CONSENT & ACKNOWLEDGEMENT WAIVER

I, the undersigned, acknowledge and confirm the following:

1. RISK ACKNOWLEDGEMENT: I have been informed that my medical profile contains one or more elevated risk factors as identified by the SAFE-T 4LIFE™ automated screening system. These factors have been disclosed to me in the safety report above.

2. INFORMED DECISION: I understand the identified risk factors and their potential implications for my planned medical procedure(s). I have had the opportunity to review this information and ask questions of my care coordinator.

3. VOLUNTARY CONSENT: I voluntarily choose to proceed with the medical travel coordination process with full knowledge of the elevated risk factors noted in my screening. I understand this does not guarantee clinical clearance, which must be obtained from the treating physician.

4. NO MEDICAL GUARANTEE: I understand that SAFE-T 4LIFE™ is a coordination and screening support tool only and does not constitute medical advice, diagnosis, or guarantee of surgical safety. Final clinical clearance is the exclusive responsibility of the licensed medical professional who will perform my procedure.

5. PHYSICIAN CONSULTATION: I agree to disclose all identified risk factors to my treating physician prior to the procedure date and to obtain written medical clearance where required.

6. RELEASE OF LIABILITY: I release Morales Medical Travel and its affiliated partners from liability arising from complications attributable to undisclosed medical conditions or risk factors.

7. ACCURACY OF INFORMATION: I certify that all medical information I have provided is true, accurate, and complete to the best of my knowledge.

By signing below, I confirm that I have read, understood, and agree to the terms of this waiver.`;

export default function HighRiskWaiverModal({ caseId, flags, patientName, onWaiverSigned, onCancel }) {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [ipAddress, setIpAddress] = useState('fetching…');
  const [timestamp] = useState(new Date().toISOString());

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => setIpAddress(d.ip))
      .catch(() => setIpAddress('unavailable'));
  }, []);

  const handleSign = async () => {
    if (!agreed || !signature.trim()) return;
    setSigning(true);
    const res = await base44.functions.invoke('safeT4LifeScan', {
      caseId,
      action: 'sign_waiver',
      signature_data: `SIGNED: "${signature.trim()}" — ${new Date().toISOString()}`,
      ip_address: ipAddress,
      patient_name: patientName,
    });
    setSigning(false);
    if (res.data?.success) {
      setSigned(true);
      setTimeout(() => onWaiverSigned(), 1500);
    }
  };

  if (signed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }}
            className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h3 className="font-semibold text-slate-800 text-lg mb-2">Waiver Signed & Recorded</h3>
          <p className="text-sm text-slate-500">Your acknowledgement has been cryptographically timestamped and logged. Proceeding to next step.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-orange-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">SAFE-T 4LIFE™</p>
              <h2 className="text-lg font-semibold">High-Risk Acknowledgement Required</h2>
            </div>
          </div>
        </div>

        {/* Risk Flags */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex-shrink-0">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-widest mb-2">Elevated Risk Factors Identified</p>
          <div className="flex flex-wrap gap-1.5">
            {(flags || []).map((f, i) => (
              <span key={i} className="bg-red-100 text-red-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-red-200">{f}</span>
            ))}
          </div>
        </div>

        {/* Waiver text */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Legal Waiver Document</p>
            </div>
            <pre className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{WAIVER_TEXT}</pre>
          </div>

          {/* Cryptographic metadata */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 mb-4 space-y-2">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><Lock className="w-3 h-3" /> Cryptographic Record</p>
            {[
              { icon: Clock, label: 'Timestamp', val: new Date(timestamp).toLocaleString() },
              { icon: MapPin, label: 'IP Address', val: ipAddress },
              { icon: FileText, label: 'Case ID', val: caseId?.slice(0, 16) + '…' },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-center gap-2 text-xs">
                  <Icon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-400">{r.label}:</span>
                  <span className="text-white font-mono text-[11px]">{r.val}</span>
                </div>
              );
            })}
          </div>

          {/* Agreement checkbox */}
          <button type="button" onClick={() => setAgreed(a => !a)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all mb-4 ${
              agreed ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${agreed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {agreed && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              I have read and fully understand the above waiver. I acknowledge the elevated risk factors in my profile and voluntarily choose to proceed with the coordination process.
            </p>
          </button>

          {/* Signature field */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" /> Electronic Signature — Type your full legal name
            </label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder={`e.g. ${patientName || 'Your Full Name'}`}
              className="w-full border-2 border-slate-200 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-all italic"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button onClick={handleSign}
            disabled={!agreed || !signature.trim() || signing}
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {signing ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing…</>
            ) : (
              <><Shield className="w-4 h-4" />Sign & Acknowledge</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}