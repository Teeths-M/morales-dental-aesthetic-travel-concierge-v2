import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, Phone, Mail, AlertOctagon, Lock } from 'lucide-react';

export default function CriticalRiskInterceptModal({ reason, flags, patientName, onDismiss }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-red-900 to-red-700 px-6 py-6 text-white text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <AlertOctagon className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-200 mb-1">SAFE-T 4LIFE™ · Critical Intercept</p>
          <h2 className="text-xl font-bold">Procedure Hold — Concierge Dispatched</h2>
          <p className="text-red-200 text-sm mt-2">A critical safety factor has been detected. Your case has been placed on hold.</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Lock notice */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 mb-1">Administrative Hard Lock — No Override Permitted</p>
                <p className="text-xs text-red-700 leading-relaxed">{reason}</p>
              </div>
            </div>
          </div>

          {/* Flags */}
          {flags && flags.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Identified Factors</p>
              <div className="space-y-1.5">
                {flags.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <ShieldOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4">
            <p className="text-xs font-bold text-blue-800 mb-2">What happens next</p>
            <div className="space-y-2">
              {[
                { icon: Mail, text: 'A confirmation email has been sent to your registered address.' },
                { icon: Phone, text: 'A dedicated concierge will contact you within 24 hours to review your case personally.' },
                { icon: ShieldOff, text: 'No further booking steps can be completed until this hold is cleared by a medical coordinator.' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed text-center">
            This screening is not a medical diagnosis and does not replace clinical evaluation by a licensed physician. Please consult your personal doctor regarding the identified factors.
          </p>

          <button
            onClick={() => { setAcknowledged(true); onDismiss(); }}
            className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
          >
            I Understand — Return to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}