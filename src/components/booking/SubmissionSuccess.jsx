import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Shield, Heart, Clock, ChevronRight, Phone, Mail, MessageCircle, AlertCircle } from 'lucide-react';
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

  // Confetti on mount — the booking is a moment worth celebrating
  useEffect(() => {
    const burst = () => confetti({ particleCount: 80, spread: 90, origin: { y: 0.4 }, colors: ['#D4AF37', '#FFE066', '#fff'] });
    burst();
    const t = setTimeout(burst, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[60vh] py-12 px-4" style={{ background: '#060B16' }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Premium Golden M hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl p-8 text-center"
          style={{
            background: '#0C1A1D',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 0 80px rgba(212,175,55,0.08)',
          }}
        >
          {/* M mark */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 18 }}
            className="relative mx-auto mb-6"
            style={{ width: 88, height: 88 }}
          >
            <div className="absolute inset-0 rounded-full" style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
              transform: 'scale(1.8)',
            }} />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(212,175,55,0.25)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <div className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #E8C85C 0%, #D4AF37 45%, #B8941F 100%)',
                boxShadow: '0 0 40px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 42, fontWeight: 700, color: '#060B16', letterSpacing: '-0.04em', lineHeight: 1 }}>M</span>
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold mb-2 text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.03em' }}>
            Your Journey Has Begun.
          </h1>
          <p className="text-sm leading-relaxed mb-6 max-w-md mx-auto" style={{ color: '#94a3b8' }}>
            Welcome to Morales. Your consultation is now in the hands of our medical team. You are officially in our care.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              <Clock className="w-3.5 h-3.5" />
              Doctor response: <strong>24–48 hours</strong>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <Shield className="w-3.5 h-3.5" />
              SAFE-T 4LIFE™ <strong>Active</strong>
            </div>
          </div>
        </motion.div>

        {/* Consultation Fee Reminder — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl p-5"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-300 text-sm">Your $49 Consultation Fee is Refundable</p>
              <p className="text-xs text-emerald-400/80 mt-1.5 leading-relaxed">When you book your full procedure package, the $49 consultation fee will be fully credited back to you. No fees are lost — only your commitment secured.</p>
            </div>
          </div>
        </motion.div>

        {/* Emotional Reassurance — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-800 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">A message from SAFE-T 4LIFE™</p>
              <p className="text-xs text-white/40">Your personal healthcare companion</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-white/60 leading-relaxed">
            <p>You are not alone throughout this journey. Our coordination team and SAFE-T 4LIFE™ are here to support you every step of the way — from preparation through your full recovery.</p>
            <p className="text-white/45">Your healthcare journey is being reviewed and coordinated with care, precision, and the highest standards of patient safety.</p>
          </div>
        </motion.div>

        {/* AI Preparation Tips — dark card */}
        {preparationLoaded && preparation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)' }}>
              <Shield className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">Personalized Preparation from SAFE-T 4LIFE™</p>
            </div>
            <div className="p-5">
              {preparation.split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-sm text-white/65 leading-relaxed mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next Steps Timeline — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="font-semibold text-white text-sm">What Happens Next</h3>
          </div>
          <div>
            {NEXT_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: s.done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)' }}>
                  {s.done ? '✅' : s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-white/25" />
                  <span className="text-xs text-white/35 font-medium">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Smart Preparation Checklist — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="font-semibold text-white text-sm">Your Preparation Checklist</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${doneCount === checklist.length ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.07] text-white/50'}`}>
              {doneCount}/{checklist.length} done
            </span>
          </div>

          {highPriority.length > 0 && (
            <div className="px-5 py-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300"><strong>{highPriority.length} important item{highPriority.length > 1 ? 's' : ''}</strong> require your attention before your procedure.</p>
            </div>
          )}

          <div className="p-4 space-y-1">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04] group">
                <div
                  onClick={() => setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c))}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.done ? 'bg-emerald-500 border-emerald-500' : item.priority === 'high' ? 'border-amber-500' : 'border-white/25'
                  }`}
                >
                  {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-sm flex-1 ${item.done ? 'line-through text-white/30' : 'text-white/70'}`}>{item.label}</span>
                {item.priority === 'high' && !item.done && (
                  <span className="text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/25 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Priority</span>
                )}
              </label>
            ))}
          </div>
        </motion.div>

        {/* Contact Your Team — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-5"
          style={{ background: '#0C1A1D', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h3 className="font-semibold text-white text-sm mb-4">Your Coordination Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: MessageCircle, label: 'WhatsApp', value: '+1 868-748-1100', href: 'https://wa.me/18687481100', accent: '#25D366', bg: 'rgba(37,211,102,0.08)', border: 'rgba(37,211,102,0.25)' },
              { icon: Mail,          label: 'Email',    value: 'concierge@morales.com', href: 'mailto:concierge@morales.com', accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
              { icon: Phone,         label: 'Phone',    value: '+1 868-748-1100', href: 'tel:+18687481100', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
            ].map(({ icon: Icon, label, value, href, accent, bg, border }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3.5 rounded-xl transition-all"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: `${accent}99` }}>{label}</p>
                  <p className="text-xs font-semibold text-white/80">{value}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Disclaimer — dark */}
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Shield className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/30 leading-relaxed">
            <strong className="text-white/45">SAFE-T 4LIFE™</strong> is an educational and coordination support system only and does not replace professional medical advice, diagnosis, or treatment from licensed healthcare professionals. All consultation data is reviewed by our qualified medical team.
          </p>
        </div>

        {/* Return Home — gold CTA */}
        <div className="text-center pb-6">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)', color: '#060B16', boxShadow: '0 8px 32px rgba(212,175,55,0.35)' }}
          >
            View My Journey Dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}