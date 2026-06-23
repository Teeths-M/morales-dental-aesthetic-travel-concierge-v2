import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Heart, Clock, ChevronRight, Phone, Mail, MessageCircle, Calendar, FileText, Plane, Stethoscope, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NEXT_STEPS = [
  { step: 1, icon: '🩺', title: 'Doctor Review', desc: 'Your consultation is sent to your assigned healthcare provider for review.', time: '24–48 hours', done: false },
  { step: 2, icon: '📞', title: 'Coordinator Contact', desc: 'Your personal concierge will reach out to confirm your booking details.', time: '24 hours', done: false },
  { step: 3, icon: '📋', title: 'Treatment Plan', desc: 'You will receive a personalized treatment and travel plan.', time: '48–72 hours', done: false },
  { step: 4, icon: '✈️', title: 'Travel Arrangements', desc: 'We coordinate flights, hotel, and airport transfers on your behalf.', time: 'After confirmation', done: false },
  { step: 5, icon: '🌿', title: 'Preparation Phase', desc: 'SAFE-T 4LIFE™ activates your personalized preparation program.', time: 'Immediately', done: true },
];

function buildChecklist(form, items) {
  const list = [
    { label: 'Upload lab work (blood tests, CBC)', done: !!form.uploaded_files?.length, priority: 'high' },
    { label: 'Upload valid passport copy', done: form.document_types?.includes('Passport'), priority: 'high' },
    { label: 'Confirm travel companion arrangements', done: !!form.has_companion, priority: 'medium' },
    { label: 'Arrange travel insurance', done: form.document_types?.includes('Insurance'), priority: 'high' },
    { label: 'Book flights to destination', done: false, priority: 'medium' },
    { label: 'Arrange airport transfer', done: false, priority: 'medium' },
    { label: 'Prepare recovery clothing & supplies', done: false, priority: 'medium' },
    { label: 'Review consent forms when received', done: false, priority: 'medium' },
    { label: 'Complete pre-procedure blood testing', done: false, priority: 'high' },
  ];

  // Add smoking-related if applicable
  if (form.lifestyle_habits?.some(h => h.toLowerCase().includes('smok') || h.toLowerCase().includes('vap'))) {
    list.push({ label: '🚭 Begin smoking cessation program (4+ weeks before procedure)', done: false, priority: 'high' });
  }

  // Add medication-related
  if (form.takes_medications) {
    list.push({ label: 'Review all medications with assigned doctor', done: false, priority: 'high' });
  }

  return list;
}

export default function SubmissionSuccess({ form, items }) {
  const [checklist, setChecklist] = useState(() => buildChecklist(form, items));
  const [preparationLoaded, setPreparationLoaded] = useState(false);
  const [preparation, setPreparation] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(false);

  const procedureNames = items?.map(i => i.name).join(', ') || form.procedure_interest || 'your procedure';

  const loadPreparation = async () => {
    setLoadingPrep(true);
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are SAFE-T 4LIFE™, a premium healthcare travel companion. Generate a warm, personalized preparation message for a patient preparing for medical travel.

Patient Profile:
- Name: ${form.patient_name}
- Procedure: ${procedureNames}
- Has Companion: ${form.has_companion ? 'Yes' : 'No'}
- Lifestyle: ${form.lifestyle_habits?.join(', ') || 'Not specified'}
- Emotional Concerns: ${form.emotional_concerns ? 'Yes' : 'No'}

Write 3-4 SHORT, warm, encouraging preparation tips specific to their procedure and situation. Format as simple plain text with one tip per line starting with an emoji. Be specific, warm, and concise. Maximum 3 lines total.`,
      });
      setPreparation(resp);
      setPreparationLoaded(true);
    } catch {
      setPreparation('💧 Stay well-hydrated in the days before your procedure.\n🛌 Prioritize rest and sleep to support your body\'s readiness.\n🧘 Practice calming breathing exercises to manage pre-procedure nerves.\n✈️ Begin arranging your travel documents and companion support now.');
      setPreparationLoaded(true);
    }
    setLoadingPrep(false);
  };

  React.useEffect(() => {
    loadPreparation();
  }, []);

  const doneCount = checklist.filter(c => c.done).length;
  const highPriority = checklist.filter(c => c.priority === 'high' && !c.done);

  return (
    <div className="min-h-[60vh] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Hero Success Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-emerald-800 to-blue-900 rounded-3xl p-7 text-white text-center shadow-2xl shadow-emerald-900/20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-9 h-9 text-white" />
          </motion.div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold mb-2">Consultation Submitted</h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto">
            Your consultation has been successfully submitted for professional medical review. Your healthcare journey has officially begun.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-white/70" />
              <span>Doctor response: <strong>24–48 hours</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-xs">
              <Shield className="w-3.5 h-3.5 text-white/70" />
              <span>SAFE-T 4LIFE™ <strong>Active</strong></span>
            </div>
          </div>
        </motion.div>

        {/* Consultation Fee Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Your $49 Consultation Fee is Refundable</p>
              <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">When you book your full procedure package, the $49 consultation fee will be fully credited back to you. No fees are lost — only your commitment secured.</p>
            </div>
          </div>
        </motion.div>

        {/* Emotional Reassurance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center">
              <Heart className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">A message from SAFE-T 4LIFE™</p>
              <p className="text-xs text-slate-400">Your personal healthcare companion</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
            <p>You are not alone throughout this journey. Our coordination team and SAFE-T 4LIFE™ are here to support you every step of the way — from preparation through your full recovery.</p>
            <p className="text-slate-500">Your healthcare journey is being reviewed and coordinated with care, precision, and the highest standards of patient safety.</p>
          </div>
        </motion.div>

        {/* AI Preparation Tips */}
        {preparationLoaded && preparation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Personalized Preparation from SAFE-T 4LIFE™</p>
            </div>
            <div className="p-5">
              {preparation.split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next Steps Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">What Happens Next</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {NEXT_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${s.done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                  {s.done ? '✅' : s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span className="text-[10px] text-slate-400 font-medium">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Smart Preparation Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Smart Preparation Checklist</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${doneCount === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {doneCount}/{checklist.length} done
            </span>
          </div>

          {highPriority.length > 0 && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700"><strong>{highPriority.length} high-priority item{highPriority.length > 1 ? 's' : ''}</strong> require your attention before your procedure.</p>
            </div>
          )}

          <div className="p-4 space-y-1">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                <div
                  onClick={() => setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c))}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.done ? 'bg-emerald-500 border-emerald-500' : item.priority === 'high' ? 'border-amber-400' : 'border-slate-300'
                  }`}
                >
                  {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm flex-1 ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
                {item.priority === 'high' && !item.done && (
                  <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Priority</span>
                )}
              </label>
            ))}
          </div>
        </motion.div>

        {/* Contact Your Team */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Your Coordination Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: MessageCircle, label: 'WhatsApp', value: '+1 868-748-1100', href: 'https://wa.me/18687481100', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Mail, label: 'Email', value: 'concierge@morales.com', href: 'mailto:concierge@morales.com', color: 'text-blue-600 bg-blue-50' },
              { icon: Phone, label: 'Phone', value: '+1 868-748-1100', href: 'tel:+18687481100', color: 'text-violet-600 bg-violet-50' },
            ].map(({ icon: Icon, label, value, href, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold text-slate-700">{value}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <Shield className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <strong>SAFE-T 4LIFE™</strong> is an educational and coordination support system only and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare professionals. All consultation data is reviewed by our qualified medical team.
          </p>
        </div>

        {/* Return Home */}
        <div className="text-center pb-6">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            Return to Home <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}