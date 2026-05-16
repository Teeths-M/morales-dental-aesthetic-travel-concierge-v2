import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    step: 0, // Personal Info
    image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&q=80',
    headline: 'Your Journey Begins Here',
    sub: 'Every great transformation starts with a single step.',
    fact: '🌍 Over 14 million people travel for medical care each year.',
    accent: 'from-emerald-900/80 to-slate-900/90',
  },
  {
    step: 1, // Travel
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
    headline: 'Your Travel, Our Care',
    sub: 'We coordinate every detail of your medical journey.',
    fact: '✈️ Our coordinators arrange flights, hotels & transfers for you.',
    accent: 'from-blue-900/80 to-slate-900/90',
  },
  {
    step: 2, // Cultural
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    headline: 'We Respect Your Culture',
    sub: 'Personalized care that honors your values and traditions.',
    fact: '🕌 Cultural sensitivity training is mandatory for all our coordinators.',
    accent: 'from-violet-900/80 to-slate-900/90',
  },
  {
    step: 3, // Medical History
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    headline: 'Your Health Story Matters',
    sub: 'Every detail you share helps our doctors prepare the safest plan.',
    fact: '🩺 Complete medical profiles reduce complications by up to 60%.',
    accent: 'from-teal-900/80 to-slate-900/90',
  },
  {
    step: 4, // Anesthesia
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80',
    headline: 'Safety First, Always',
    sub: 'Our anesthesiologists review every patient profile personally.',
    fact: '💉 Board-certified anesthesiologists on every procedure.',
    accent: 'from-cyan-900/80 to-slate-900/90',
  },
  {
    step: 5, // Medications
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80',
    headline: 'Medication Awareness Saves Lives',
    sub: 'We cross-check all medications for potential interactions.',
    fact: '💊 Our pharmacists verify every patient medication list before procedures.',
    accent: 'from-indigo-900/80 to-slate-900/90',
  },
  {
    step: 6, // Lifestyle
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    headline: 'Your Lifestyle, Your Recovery',
    sub: 'Honest answers lead to better outcomes and faster healing.',
    fact: '🏃 Patients who exercise regularly recover up to 30% faster.',
    accent: 'from-green-900/80 to-slate-900/90',
  },
  {
    step: 7, // Emotional
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
    headline: 'Mind & Body Together',
    sub: 'Emotional wellbeing is a core part of surgical success.',
    fact: '🧠 Emotional readiness is assessed on every consultation.',
    accent: 'from-rose-900/80 to-slate-900/90',
  },
  {
    step: 8, // Pregnancy
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80',
    headline: 'Comprehensive Women\'s Health',
    sub: 'We take a holistic approach to women\'s care and safety.',
    fact: '🌸 Dedicated women\'s health coordinators are available 24/7.',
    accent: 'from-pink-900/80 to-slate-900/90',
  },
  {
    step: 9, // Documents
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    headline: 'Secure & Confidential',
    sub: 'Your documents are encrypted and HIPAA-compliant at all times.',
    fact: '🔒 Military-grade AES-256 encryption protects all your files.',
    accent: 'from-slate-900/80 to-gray-900/90',
  },
  {
    step: 10, // Procedure
    image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&q=80',
    headline: 'World-Class Surgical Care',
    sub: 'Our surgeons are internationally trained with thousands of successful procedures.',
    fact: '🏥 All procedures performed by board-certified specialists.',
    accent: 'from-emerald-900/80 to-blue-900/90',
  },
  {
    step: 11, // Acknowledgement
    image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80',
    headline: 'Almost There',
    sub: 'Your commitment to your health is an act of courage.',
    fact: '🌟 Thousands of patients have transformed their lives through this program.',
    accent: 'from-amber-900/80 to-slate-900/90',
  },
];

// Extra ambient slides that cycle when no step-specific one is showing
const AMBIENT = [
  {
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    headline: 'Precision. Safety. Excellence.',
    sub: 'SAFE-T 4LIFE™ certified medical protocols.',
    fact: '⭐ 98.7% patient satisfaction across all procedures.',
    accent: 'from-emerald-900/80 to-slate-900/90',
  },
  {
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
    headline: 'Your Recovery, Our Priority',
    sub: 'Dedicated aftercare teams guide you every step of the way.',
    fact: '🏨 Luxury recovery suites with 24/7 nursing care.',
    accent: 'from-blue-900/80 to-slate-900/90',
  },
];

export default function MedicalSlideshow({ step }) {
  const slide = SLIDES[step] || AMBIENT[0];
  const [imgLoaded, setImgLoaded] = useState(false);
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [showFact, setShowFact] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    setShowFact(false);
    const t = setTimeout(() => setShowFact(true), 800);
    return () => clearTimeout(t);
  }, [step]);

  // Cycle ambient stat every 5s
  useEffect(() => {
    const t = setInterval(() => setAmbientIdx(i => (i + 1) % AMBIENT.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden shadow-xl">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt=""
            className="w-full h-full object-cover"
            onLoad={() => setImgLoaded(true)}
          />
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t ${slide.accent}`} />
          {/* Subtle grain texture */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        {/* Top — SAFE-T badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">SAFE-T 4LIFE™</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-semibold text-white/70">Step {step + 1} / 12</span>
          </div>
        </div>

        {/* Bottom — headline & fact */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="font-display text-xl lg:text-2xl text-white font-bold leading-tight mb-2 drop-shadow-lg">
                {slide.headline}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                {slide.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Animated fact chip */}
          <AnimatePresence>
            {showFact && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3"
              >
                <p className="text-[12px] text-white/90 font-medium leading-relaxed">
                  {slide.fact}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step dots */}
          <div className="flex items-center gap-1 mt-4">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 h-1.5 bg-white' : i < step ? 'w-1.5 h-1.5 bg-white/50' : 'w-1.5 h-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}