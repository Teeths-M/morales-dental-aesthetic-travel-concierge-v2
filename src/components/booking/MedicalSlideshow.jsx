import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  { step: 0,  image: '/images/medical-slideshow-01.jpg', headline: 'Your Journey Begins Here',          sub: 'Every great transformation starts with a single step.',                         fact: '🌍 Over 14 million people travel for medical care each year.',                                  gradient: 'from-emerald-900/70 via-slate-900/60 to-slate-900/80' },
  { step: 1,  image: '/images/medical-slideshow-02.jpg', headline: 'Your Travel, Our Care',               sub: 'We coordinate every detail of your medical journey.',                            fact: '✈️ Our coordinators arrange flights, hotels & transfers for you.',                              gradient: 'from-blue-900/70 via-sky-900/60 to-slate-900/80' },
  { step: 2,  image: '/images/medical-slideshow-03.jpg', headline: 'We Respect Your Culture',             sub: 'Personalized care that honours your values and traditions.',                     fact: '🕌 Cultural sensitivity training is mandatory for all our coordinators.',                       gradient: 'from-violet-900/70 via-purple-900/60 to-slate-900/80' },
  { step: 3,  image: '/images/medical-slideshow-04.jpg', headline: 'Your Health Story Matters',           sub: 'Every detail you share helps our doctors prepare the safest plan.',              fact: '🩺 Complete medical profiles reduce complications by up to 60%.',                              gradient: 'from-teal-900/70 via-emerald-900/60 to-slate-900/80' },
  { step: 4,  image: '/images/medical-slideshow-05.jpg', headline: 'Safety First, Always',                  sub: 'Our anesthesiologists review every patient profile personally.',                 fact: '💉 Board-certified anesthesiologists on every procedure.',                                     gradient: 'from-cyan-900/70 via-blue-900/60 to-slate-900/80' },
  { step: 5,  image: '/images/medical-slideshow-06.jpg', headline: 'Medication Awareness Saves Lives',    sub: 'We cross-check all medications for potential interactions.',                     fact: '💊 Our pharmacists verify every patient medication list before procedures.',                    gradient: 'from-indigo-900/70 via-blue-900/60 to-slate-900/80' },
  { step: 6,  image: '/images/medical-slideshow-07.jpg', headline: 'Your Lifestyle, Your Recovery',      sub: 'Honest answers lead to better outcomes and faster healing.',                     fact: '🏃 Patients who exercise regularly recover up to 30% faster.',                                 gradient: 'from-green-900/70 via-emerald-900/60 to-slate-900/80' },
  { step: 7,  image: '/images/medical-slideshow-08.jpg', headline: 'Mind & Body Together',               sub: 'Emotional wellbeing is a core part of surgical success.',                        fact: '🧠 Emotional readiness is assessed on every consultation.',                                    gradient: 'from-rose-900/70 via-pink-900/60 to-slate-900/80' },
  { step: 8,  image: '/images/medical-slideshow-09.jpg', headline: "Comprehensive Women's Health",        sub: "We take a holistic approach to women's care and safety.",                        fact: '🌸 Dedicated women\'s health coordinators are available 24/7.',                                gradient: 'from-pink-900/70 via-rose-900/60 to-slate-900/80' },
  { step: 9,  image: '/images/medical-slideshow-10.jpg', headline: 'Secure & Confidential',              sub: 'Your documents are encrypted and HIPAA-compliant at all times.',                 fact: '🔒 Military-grade AES-256 encryption protects all your files.',                               gradient: 'from-slate-900/70 via-gray-900/60 to-slate-900/80' },
  { step: 10, image: '/images/medical-slideshow-11.jpg', headline: 'World-Class Surgical Care',             sub: 'Our surgeons are internationally trained with thousands of successful procedures.', fact: '🏥 All procedures performed by board-certified specialists.',                                   gradient: 'from-emerald-900/70 via-blue-900/60 to-slate-900/80' },
  { step: 11, image: '/images/medical-slideshow-12.jpg', headline: 'Almost There',                       sub: 'Your commitment to your health is an act of courage.',                           fact: '🌟 Thousands of patients have transformed their lives through this program.',                   gradient: 'from-amber-900/70 via-orange-900/60 to-slate-900/80' },
];

/** Full-page fixed background — renders behind the entire booking page */
export function MedicalSlideshowBackground({ step }) {
  const slide = SLIDES[step] || SLIDES[0];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 1.07 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Rich colour-flow gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
          {/* Extra top vignette so header stays readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Compact info strip shown inside the form area (replaces old sidebar panel) */
export default function MedicalSlideshow({ step }) {
  const slide = SLIDES[step] || SLIDES[0];
  const [showFact, setShowFact] = useState(false);

  useEffect(() => {
    setShowFact(false);
    const t = setTimeout(() => setShowFact(true), 700);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl min-h-[200px] shadow-2xl">
      {/* Blurred background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img src={slide.image} alt="" className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${slide.gradient}`} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between p-5 min-h-[200px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">SAFE-T 4LIFE™</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-semibold text-white/70">Step {step + 1} / 12</span>
          </div>
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <h3 className="font-display text-lg text-white font-semibold leading-tight drop-shadow-lg mb-1">
                {slide.headline}
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">{slide.sub}</p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {showFact && (
              <motion.div
                key="fact-card"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-3 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-2.5"
              >
                <p className="text-[11px] text-white/90 font-medium">{slide.fact}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1 mt-3">
            {SLIDES.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-1.5 bg-white' : i < step ? 'w-1.5 h-1.5 bg-white/50' : 'w-1.5 h-1.5 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}