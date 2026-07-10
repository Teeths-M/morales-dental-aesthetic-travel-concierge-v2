import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const GOLD = '#D4AF37';

const AVATAR_COLORS = ['#b8963e', '#4a7fa5', '#7c5cbf', '#2e8c6a', '#a04f6b'];

const testimonials = [
  {
    name: 'Sofia Ramirez',
    country: 'United States',
    flag: '🇺🇸',
    procedure: 'Smile Makeover — Porcelain Veneers',
    rating: 5,
    quote: 'I was terrified to travel abroad for dental work. Morales held my hand through every step — from the video consultation with my dentist to the hotel pickup. I saved over $14,000 and came back with the smile I always dreamed of.',
    result: 'A fraction of US list pricing',
    location: 'Cartagena, Colombia',
  },
  {
    name: 'Marcus Webb',
    country: 'Canada',
    flag: '🇨🇦',
    procedure: 'Rhinoplasty',
    rating: 4,
    quote: "The coordination was flawless. My surgeon was board-certified and the clinic was more advanced than anything I'd seen in Toronto. I had a dedicated care coordinator the entire time. It felt like traveling business class for healthcare.",
    result: 'Board-certified surgeon, exceeded expectations',
    location: 'Istanbul, Turkey',
  },
  {
    name: 'Isabelle Fontaine',
    country: 'France',
    flag: '🇫🇷',
    procedure: 'Gastric Sleeve Surgery',
    rating: 5,
    quote: "After years of struggling with weight, the Safe-T screening gave me confidence that the team truly cared about my safety, not just booking a procedure. My recovery companion spoke French — a detail I never expected but will never forget.",
    result: '32 kg lost in 8 months',
    location: 'Bangkok, Thailand',
  },
  {
    name: 'Daniel Osei',
    country: 'United Kingdom',
    flag: '🇬🇧',
    procedure: 'All-on-4 Dental Implants',
    rating: 5,
    quote: "The NHS waiting list was 2 years. Morales got me treated in 3 weeks. The entire package — flights, hotel, transfers, and the procedure — cost less than just the procedure would in London. The aftercare follow-ups continued when I got home.",
    result: 'Full treatment in 3 weeks',
    location: 'Istanbul, Turkey',
  },
  {
    name: 'Amara Diallo',
    country: 'UAE',
    flag: '🇦🇪',
    procedure: 'Breast Augmentation',
    rating: 5,
    quote: 'Privacy and discretion were my top concerns. Morales understood that immediately. Everything from the airport pickup to the clinic visits was handled with absolute professionalism. I felt respected at every stage of my journey.',
    result: 'Fully discreet, private journey',
    location: 'Medellín, Colombia',
  },
];

export default function LuxuryTestimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const total = testimonials.length;

  const goTo = (index, dir) => {
    setDirection(dir);
    setCurrent((index + total) % total);
  };

  const next = () => goTo(current + 1, 1);
  const prev = () => goTo(current - 1, -1);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(next, 6000);
    }
    return () => clearInterval(intervalRef.current);
  }, [current, isPaused]);

  const t = testimonials[current];

  return (
    <section
      className="py-24 lg:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #09101E 0%, #060B16 100%)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14 gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] uppercase mb-5" style={{ color: GOLD }}>
              PATIENT STORIES
            </p>
            <h2 className="font-display text-4xl lg:text-5xl text-white leading-[1.05] mb-1" style={{ letterSpacing: '-0.02em' }}>
              Journeys That{' '}
              <span style={{ color: GOLD, fontStyle: 'italic' }}>Changed Lives</span>
            </h2>
          </div>

          {/* Nav controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full border border-white/[0.12] flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white transition-all duration-200 hover:bg-white/[0.04]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className="transition-all duration-300"
                  style={{
                    width: i === current ? 24 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === current ? GOLD : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-11 h-11 rounded-full border border-white/[0.12] flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white transition-all duration-200 hover:bg-white/[0.04]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="grid lg:grid-cols-[1fr_2fr] gap-0 rounded-2xl overflow-hidden"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              {/* Left — photo + identity */}
              <div
                className="relative p-8 lg:p-10 flex flex-col justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(255,255,255,0.02) 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Photo */}
                <div className="flex flex-col items-start gap-5">
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        background: `${AVATAR_COLORS[current]}22`,
                        border: `2px solid ${AVATAR_COLORS[current]}55`,
                        boxShadow: `0 0 30px ${AVATAR_COLORS[current]}18`,
                        fontSize: 28,
                        fontWeight: 700,
                        color: AVATAR_COLORS[current],
                        letterSpacing: '-0.5px',
                        fontFamily: '"SF Pro Display", system-ui, sans-serif',
                      }}
                    >
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="absolute -bottom-2 -right-2 text-lg">{t.flag}</span>
                  </div>

                  <div>
                    <p className="text-white font-medium text-[17px] leading-tight">{t.name}</p>
                    <p className="text-white/50 text-[13px] mt-1">{t.country}</p>
                    <div className="flex gap-0.5 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < t.rating ? GOLD : 'rgba(255,255,255,0.18)', fontSize: 11 }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Result badge */}
                <div className="mt-8 lg:mt-0">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35`, color: GOLD }}
                  >
                    ✓ {t.result}
                  </div>
                  <p className="text-white/40 text-[11px] mt-2 flex items-center gap-1">
                    <span>📍</span> {t.location}
                  </p>
                </div>
              </div>

              {/* Right — quote */}
              <div className="p-8 lg:p-12 flex flex-col justify-between">
                <div>
                  <Quote
                    className="w-8 h-8 mb-6 opacity-30"
                    style={{ color: GOLD }}
                    strokeWidth={1.5}
                  />
                  <p className="text-white/85 text-[16px] lg:text-[17px] leading-[1.85] font-light italic mb-9">
                    "{t.quote}"
                  </p>
                </div>

                <div
                  className="pt-6 border-t border-white/[0.07]"
                >
                  <p className="text-[12px] font-semibold tracking-[0.25em] uppercase" style={{ color: GOLD }}>
                    {t.procedure}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Counter */}
        <p className="text-center mt-8 text-white/30 text-[12px] tracking-widest">
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </p>

      </div>
    </section>
  );
}