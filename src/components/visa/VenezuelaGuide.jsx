import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, Play, UserPlus, FileText, LogIn } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: UserPlus,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    badge: 'Step 1 — Register',
    title: 'Create Your Account First',
    desc: "Before anything else, you'll need to register on the Cancillería Digital portal. This only takes a few minutes and is completely free.",
    cta: 'Watch Registration Video',
    ctaUrl: 'https://mppre.gob.ve/gestor2/archivos/cancilleria_digital/video/1774461302_Registration-Process-(2).mp4',
    ctaSecondary: 'Go to Registration Portal',
    ctaSecondaryUrl: 'https://cancilleriadigital.mppre.gob.ve/login',
    tip: '💡 Tip: Use a valid email address you check regularly — your approval will be sent there.',
  },
  {
    id: 2,
    icon: FileText,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badge: 'Step 2 — Apply',
    title: 'Submit Your e-Visa Request',
    desc: "Once registered and logged in, you can submit your visa application. Watch the tutorial video first so you know exactly what to fill in — no surprises.",
    cta: 'Watch Application Tutorial',
    ctaUrl: 'https://mppre.gob.ve/gestor2/archivos/cancilleria_digital/video/1774461338_Request-Process-(2).mp4',
    ctaSecondary: 'Start My Application',
    ctaSecondaryUrl: 'https://cancilleriadigital.mppre.gob.ve/login',
    tip: '💡 Tip: Have your passport, clinic appointment letter, and a photo ready before you start.',
  },
  {
    id: 3,
    icon: LogIn,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badge: 'Step 3 — You\'re Done!',
    title: 'Wait for Approval & Travel',
    desc: "After submitting, you'll receive a confirmation email. Processing typically takes a few business days. Once approved, print or save your e-Visa and you're ready to travel!",
    cta: null,
    ctaSecondary: 'Check My Application Status',
    ctaSecondaryUrl: 'https://cancilleriadigital.mppre.gob.ve/login',
    tip: '💡 Tip: Our concierge team can help you track your application — just reach out via the booking page.',
  },
];

function StepCard({ step, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [watched, setWatched] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl border-2 overflow-hidden transition-all ${expanded ? step.borderColor + ' shadow-md' : 'border-slate-100 shadow-sm'}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-4 p-4 text-left transition-all ${expanded ? step.lightColor : 'bg-white hover:bg-slate-50'}`}
      >
        <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${expanded ? step.textColor : 'text-slate-400'}`}>{step.badge}</p>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{step.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {watched && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✓ Watched</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 bg-white space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>

              {/* Tip */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">{step.tip}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {step.cta && (
                  <a
                    href={step.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWatched(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white ${step.color} hover:opacity-90 shadow-sm transition-all`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    {step.cta}
                  </a>
                )}
                <a
                  href={step.ctaSecondaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 ${step.borderColor} ${step.textColor} ${step.lightColor} hover:opacity-80 transition-all`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {step.ctaSecondary}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function VenezuelaGuide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🇻🇪</span>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">Venezuela e-Visa — Your Easy Guide</p>
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-800">We've broken it down into 3 simple steps.</h3>
        <p className="text-xs text-slate-500 mt-1">Follow each step in order. Watch the video first, then click the link — it's easier than you think! 😊</p>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {STEPS.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Reassurance footer */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🤝</span>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Need help?</span> Our concierge team has helped hundreds of patients through this exact process. You're never alone — just book a consultation and we'll guide you every step of the way.
        </p>
      </div>
    </motion.div>
  );
}