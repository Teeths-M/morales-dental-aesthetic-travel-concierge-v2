import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Play, UserPlus, FileText, CheckCircle } from 'lucide-react';

// Per-destination guide config
const DESTINATION_GUIDES = {
  VE: {
    label: 'Venezuela e-Visa — Your Easy Guide',
    flag: '🇻🇪',
    steps: [
      {
        id: 1,
        icon: UserPlus,
        color: 'bg-purple-500', lightColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700',
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
        color: 'bg-blue-500', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700',
        badge: 'Step 2 — Apply',
        title: 'Submit Your e-Visa Request',
        desc: "Once registered and logged in, submit your visa application. Watch the tutorial first so you know exactly what to fill in — no surprises.",
        cta: 'Watch Application Tutorial',
        ctaUrl: 'https://mppre.gob.ve/gestor2/archivos/cancilleria_digital/video/1774461338_Request-Process-(2).mp4',
        ctaSecondary: 'Start My Application',
        ctaSecondaryUrl: 'https://cancilleriadigital.mppre.gob.ve/login',
        tip: '💡 Tip: Have your passport, clinic appointment letter, and a photo ready before you start.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — You're Done!",
        title: 'Wait for Approval & Travel',
        desc: "After submitting, you'll receive a confirmation email. Processing typically takes a few business days. Once approved, print or save your e-Visa and you're ready to travel!",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Check My Application Status',
        ctaSecondaryUrl: 'https://cancilleriadigital.mppre.gob.ve/login',
        tip: '💡 Tip: Our concierge team can help you track your application — just reach out via the booking page.',
      },
    ],
  },
  TR: {
    label: 'Turkey e-Visa — Your Easy Guide',
    flag: '🇹🇷',
    steps: [
      {
        id: 1,
        icon: FileText,
        color: 'bg-red-500', lightColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700',
        badge: 'Step 1 — Apply Online',
        title: 'Visit the Official Turkish e-Visa Portal',
        desc: "Go to the official Turkish government portal at evisa.gov.tr. Do not use any third-party sites — they may charge extra fees. The official site is safe, fast, and affordable (around $50 USD).",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Go to Official Portal',
        ctaSecondaryUrl: 'https://www.evisa.gov.tr/en/',
        tip: '💡 Tip: Only use the official government site — evisa.gov.tr. Avoid imitation websites that charge hidden fees.',
      },
      {
        id: 2,
        icon: UserPlus,
        color: 'bg-blue-500', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700',
        badge: 'Step 2 — Fill the Form',
        title: 'Complete Your Application',
        desc: "Fill in your passport details, travel dates, and pay the visa fee online by card. Most applicants receive their e-Visa by email within minutes to 24 hours.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Apply Now',
        ctaSecondaryUrl: 'https://www.evisa.gov.tr/en/',
        tip: '💡 Tip: Double-check that your name and passport number match exactly — errors can cause delays.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — Travel!",
        title: 'Save & Print Your e-Visa',
        desc: "Once approved, you'll receive the e-Visa by email. Save a digital copy and print a backup. Present it at border control along with your passport.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Check Application Status',
        ctaSecondaryUrl: 'https://www.evisa.gov.tr/en/',
        tip: '💡 Tip: Save the e-Visa PDF to your phone so you always have it — even offline.',
      },
    ],
  },
  TH: {
    label: 'Thailand e-Visa — Your Easy Guide',
    flag: '🇹🇭',
    steps: [
      {
        id: 1,
        icon: UserPlus,
        color: 'bg-violet-500', lightColor: 'bg-violet-50', borderColor: 'border-violet-200', textColor: 'text-violet-700',
        badge: 'Step 1 — Create Account',
        title: 'Register on the Thai e-Visa Portal',
        desc: "Head to thaievisa.go.th, the official Thai government e-Visa portal. Create a free account with your email — this is your starting point for the whole application.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Go to Thai e-Visa Portal',
        ctaSecondaryUrl: 'https://www.thaievisa.go.th/',
        tip: '💡 Tip: Use a personal email, not a work one — important notifications will be sent there.',
      },
      {
        id: 2,
        icon: FileText,
        color: 'bg-blue-500', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700',
        badge: 'Step 2 — Apply',
        title: 'Complete & Submit Your Application',
        desc: "Log in and fill out the visa application form. Upload a scan of your passport photo page, a recent passport photo, and your travel itinerary. Then submit and pay online.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Start Application',
        ctaSecondaryUrl: 'https://www.thaievisa.go.th/',
        tip: '💡 Tip: Have your hotel booking or clinic appointment ready to upload — it speeds up approval.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — You're Approved!",
        title: 'Download & Travel',
        desc: "Processing typically takes 3–5 business days. Once approved, download your e-Visa from the portal or your email. Show it at Thai immigration alongside your passport.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Check My Status',
        ctaSecondaryUrl: 'https://www.thaievisa.go.th/',
        tip: '💡 Tip: Screenshot the approval in case you have trouble loading the portal at the airport.',
      },
    ],
  },
  CU: {
    label: 'Cuba e-Visa — Your Easy Guide',
    flag: '🇨🇺',
    steps: [
      {
        id: 1,
        icon: FileText,
        color: 'bg-red-500', lightColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700',
        badge: 'Step 1 — Apply Online',
        title: 'Go to the Official Cuba e-Visa Site',
        desc: "Visit evisacuba.cu to apply for your Cuba e-Visa online. This replaces the old paper tourist card. The process is straightforward — fill in your details, upload your passport scan, and pay.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Apply for Cuba e-Visa',
        ctaSecondaryUrl: 'https://evisacuba.cu/en/inicio',
        tip: '💡 Tip: Travel insurance is mandatory for Cuba — have your insurance policy ready to upload.',
      },
      {
        id: 2,
        icon: UserPlus,
        color: 'bg-orange-500', lightColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700',
        badge: 'Step 2 — Upload Documents',
        title: 'Submit Your Documents',
        desc: "Upload a clear scan of your passport, your travel insurance, and your hotel or clinic booking. Make sure all images are clear and not blurry — rejections are almost always due to unclear photos.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Upload Documents',
        ctaSecondaryUrl: 'https://evisacuba.cu/en/inicio',
        tip: '💡 Tip: Your passport photo page must show all four corners clearly. Use good lighting.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — Ready to Go!",
        title: 'Receive & Print Your e-Visa',
        desc: "Your e-Visa will be emailed to you once approved (usually within a few days). Print it out and keep it with your passport — Cuban immigration will stamp it on arrival.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Check Status',
        ctaSecondaryUrl: 'https://evisacuba.cu/en/inicio',
        tip: '💡 Tip: Print two copies — one for immigration and one as a backup in case it gets lost.',
      },
    ],
  },
  DO: {
    label: 'Dominican Republic e-Ticket — Your Easy Guide',
    flag: '🇩🇴',
    steps: [
      {
        id: 1,
        icon: FileText,
        color: 'bg-blue-600', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700',
        badge: 'Step 1 — Fill the e-Ticket',
        title: 'Complete the Free e-Ticket Form',
        desc: "The Dominican Republic uses an online e-Ticket instead of a paper immigration form. Go to viajerodigital.mitur.gob.do and fill in your travel details before departure — it only takes 5 minutes and it's completely free.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Fill Out My e-Ticket',
        ctaSecondaryUrl: 'https://viajerodigital.mitur.gob.do/english/',
        tip: '💡 Tip: Complete the e-Ticket at least 24 hours before your flight to avoid any last-minute issues.',
      },
      {
        id: 2,
        icon: UserPlus,
        color: 'bg-indigo-500', lightColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700',
        badge: 'Step 2 — Save Your QR Code',
        title: 'Download Your Confirmation QR',
        desc: "Once submitted, you'll receive a QR code confirmation. Save it to your phone or print it out. Immigration staff will scan it when you arrive — no paper forms needed.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Get My QR Code',
        ctaSecondaryUrl: 'https://viajerodigital.mitur.gob.do/english/',
        tip: '💡 Tip: Screenshot the QR code so it works even without an internet connection at the airport.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — All Done!",
        title: 'Show QR on Arrival',
        desc: "Present your QR code at immigration in the Dominican Republic — that's it! No tourist card fee, no paperwork. Quick and easy.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Complete e-Ticket',
        ctaSecondaryUrl: 'https://viajerodigital.mitur.gob.do/english/',
        tip: '💡 Tip: The same QR code is also used for departure — keep it handy for your return journey.',
      },
    ],
  },
  BR: {
    label: 'Brazil e-Visa — Your Easy Guide',
    flag: '🇧🇷',
    steps: [
      {
        id: 1,
        icon: UserPlus,
        color: 'bg-green-600', lightColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700',
        badge: 'Step 1 — Create Account',
        title: 'Register on the Brazil e-Visa Portal',
        desc: "Go to brazil.vfsevisa.com — the official Brazil e-Visa application portal. Create a free account with your email address to get started.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Go to Brazil e-Visa Portal',
        ctaSecondaryUrl: 'https://brazil.vfsevisa.com/homepage',
        tip: '💡 Tip: Make sure to use the official portal link — there are many fake sites that charge extra.',
      },
      {
        id: 2,
        icon: FileText,
        color: 'bg-yellow-500', lightColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-700',
        badge: 'Step 2 — Apply & Pay',
        title: 'Fill the Application & Pay the Fee',
        desc: "Fill in your passport details, travel dates, accommodation info, and purpose of visit. Upload your passport scan and a recent photo. Pay the visa fee online to submit.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Start Application',
        ctaSecondaryUrl: 'https://brazil.vfsevisa.com/homepage',
        tip: '💡 Tip: Have your clinic booking letter handy — it confirms the purpose of your medical trip.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — All Set!",
        title: 'Receive & Save Your e-Visa',
        desc: "Processing takes around 5–10 business days. Once approved, your e-Visa will arrive by email. Save it and bring it with your passport — Brazilian immigration will verify it on entry.",
        cta: null, ctaUrl: null,
        ctaSecondary: 'Check Application Status',
        ctaSecondaryUrl: 'https://brazil.vfsevisa.com/homepage',
        tip: '💡 Tip: Apply at least 2 weeks before travel to allow time for processing.',
      },
    ],
  },
};

// Generic fallback for any other visa-required destination
function buildGenericGuide(destination, applyUrl) {
  return {
    label: `${destination?.name} Visa — Your Easy Guide`,
    flag: destination?.flag || '🌍',
    steps: [
      {
        id: 1,
        icon: FileText,
        color: 'bg-blue-500', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700',
        badge: 'Step 1 — Prepare',
        title: 'Gather Your Documents',
        desc: `Before applying, make sure you have your passport (valid 6+ months), a recent passport photo, your clinic booking confirmation from Morales Dental, proof of accommodation, and proof of funds ready.`,
        cta: null, ctaUrl: null,
        ctaSecondary: applyUrl ? 'Go to Application Portal' : null,
        ctaSecondaryUrl: applyUrl || null,
        tip: '💡 Tip: Having everything ready before you start saves time and avoids incomplete submissions.',
      },
      {
        id: 2,
        icon: UserPlus,
        color: 'bg-purple-500', lightColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700',
        badge: 'Step 2 — Apply',
        title: 'Submit Your Application',
        desc: `Complete the visa application form online or at the nearest embassy. Fill in your details accurately — name, passport number, travel dates, and purpose of visit (medical treatment).`,
        cta: null, ctaUrl: null,
        ctaSecondary: applyUrl ? 'Apply Now' : null,
        ctaSecondaryUrl: applyUrl || null,
        tip: '💡 Tip: Always state "Medical Treatment" as your purpose of visit — our clinic letter supports this.',
      },
      {
        id: 3,
        icon: CheckCircle,
        color: 'bg-emerald-500', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700',
        badge: "Step 3 — Almost There!",
        title: 'Wait for Approval & Travel',
        desc: "Once submitted, processing times vary by country. You'll be notified by email or through the portal. When approved, save or print your visa and bring it with your passport.",
        cta: null, ctaUrl: null,
        ctaSecondary: applyUrl ? 'Check Application Status' : null,
        ctaSecondaryUrl: applyUrl || null,
        tip: '💡 Tip: Apply at least 3–4 weeks before your travel date to be safe.',
      },
    ],
  };
}

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
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">{step.tip}</p>
              </div>
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
                {step.ctaSecondary && step.ctaSecondaryUrl && (
                  <a
                    href={step.ctaSecondaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 ${step.borderColor} ${step.textColor} ${step.lightColor} hover:opacity-80 transition-all`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {step.ctaSecondary}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function VisaGuide({ destination, rule }) {
  if (!destination || (rule?.status !== 'evisa' && rule?.status !== 'visa_required' && rule?.status !== 'arrival_card')) return null;

  const guide = DESTINATION_GUIDES[destination.code] || buildGenericGuide(destination, rule?.applyUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">{guide.flag}</span>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">{guide.label}</p>
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-800">We've broken it down into 3 simple steps.</h3>
        <p className="text-xs text-slate-500 mt-1">Follow each step in order — it's easier than you think! 😊</p>
      </div>

      <div className="p-4 space-y-3">
        {guide.steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      <div className="mx-4 mb-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">🤝</span>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Need help?</span> Our concierge team has guided hundreds of patients through this exact process. You're never alone — book a consultation and we'll walk you through every step.
        </p>
      </div>
    </motion.div>
  );
}