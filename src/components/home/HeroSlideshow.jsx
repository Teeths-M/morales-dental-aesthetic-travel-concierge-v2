import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    bg: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&q=80',
    eyebrow: 'World-Class Medical Travel',
    headline: 'Luxury Healthcare Travel\nDesigned Around You',
    body: 'Save up to 30–40% compared to pricing in the US, Canada & Trinidad while experiencing coordinated premium support.',
    cta: 'Start Your Consultation',
    ctaTo: '/booking',
  },
  {
    bg: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1600&q=80',
    eyebrow: 'SAFE-T 4LIFE™',
    headline: 'More Than Medical Travel\n— Peace of Mind',
    body: 'SAFE-T 4LIFE™ helps support safer, more transparent healthcare coordination throughout your journey.',
    cta: 'Explore Your Journey',
    ctaTo: '/how-it-works',
  },
  {
    bg: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1600&q=80',
    eyebrow: 'Accessible Care',
    headline: 'Flexible Payment\nOptions Available',
    body: 'Structured healthcare planning designed to make treatment journeys more manageable and accessible.',
    cta: 'Learn More',
    ctaTo: '/how-it-works',
  },
  {
    bg: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80',
    eyebrow: 'End-to-End Coordination',
    headline: 'From Consultation to Recovery\n— We Coordinate Every Step',
    body: 'Flights, accommodations, transportation, provider coordination, and recovery support — all in one guided experience.',
    cta: 'Plan Your Journey',
    ctaTo: '/booking',
  },
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: '520px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background images */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        >
          <img
            src={slides[current].bg}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/55 to-foreground/20" />
        </motion.div>
      </AnimatePresence>

      {/* Slide content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 flex flex-col justify-center" style={{ minHeight: '520px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="max-w-2xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
              {slides[current].eyebrow}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-5 whitespace-pre-line">
              {slides[current].headline}
            </h2>
            <p className="text-base lg:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
              {slides[current].body}
            </p>
            <Link to={slides[current].ctaTo}>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 text-base shadow-lg"
              >
                {slides[current].cta}
              </Button>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          {/* Dots */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'bg-accent w-6 h-2' : 'bg-white/40 w-2 h-2 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Arrow buttons */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}