import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, Headphones, Star, Heart, Globe, Lock, Plane } from 'lucide-react';

const slides = [
  {
    icon: Star,
    eyebrow: 'Our Promise',
    headline: 'Heal Beautifully.\nTravel Confidently.',
    body: 'Premium care. Expert guidance. A journey designed around you.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'SAFE-T 4LIFE™ Protected Journey',
    headline: 'Intelligent Guidance\nAt Every Step',
    body: 'Safety awareness and careful coordination throughout your entire treatment journey.',
  },
  {
    icon: Headphones,
    eyebrow: 'End-to-End Concierge Care',
    headline: 'We Handle Every Detail\nSo You Can Focus on Healing',
    body: 'Your health, comfort, and peace of mind — handled for you from start to finish.',
  },
  {
    icon: Star,
    eyebrow: 'World-Class Experts',
    headline: 'Verified Specialists &\nAccredited Clinics',
    body: 'Partnered with board-certified professionals and accredited clinics you can trust.',
  },
  {
    icon: Heart,
    eyebrow: 'Human Support. Always.',
    headline: 'Real People.\n24/7 Concierge Support.',
    body: 'Before, during, and after your journey — our team is with you every step of the way.',
  },
  {
    icon: Globe,
    eyebrow: 'Why Margarita Island?',
    headline: 'Recover. Restore.\nRejuvenate in Caribbean Paradise.',
    body: 'Margarita Island, Venezuela — stunning beaches, warm hospitality, and exceptional care. The perfect place to heal, relax, and enjoy renewal.',
  },
  {
    icon: Lock,
    eyebrow: 'Secure & Confidential',
    headline: 'Your Privacy Is\nOur Priority.',
    body: 'Your information is always protected. World-class treatments at a fraction of the cost compared to the US and Europe.',
  },
  {
    icon: Plane,
    eyebrow: 'Seamless Travel Coordination',
    headline: 'Flights, Stays, Transfers\n— All Handled for You.',
    body: 'Multilingual team. English, Spanish, and more. Convenient access with easy flights and a welcoming, hassle-free travel experience.',
  },
];

export default function BrandSlideshow() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <section className="py-16 lg:py-24 bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: Image */}
          <motion.div
            className="rounded-2xl overflow-hidden shadow-xl"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1ca89ed08_Addhome3.png"
              alt="Your Transformation Our Priority"
              className="w-full h-auto object-cover"
            />
          </motion.div>

          {/* Right: Slideshow */}
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Morales Dental & Aesthetics</p>
            <h2 className="font-display text-3xl lg:text-4xl text-foreground mb-8">
              Your Transformation,<br />Our Priority
            </h2>

            {/* Slide card */}
            <div className="relative bg-card border border-border rounded-2xl p-8 shadow-md min-h-[220px] flex flex-col justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-accent uppercase tracking-widest">{slide.eyebrow}</p>
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl text-foreground leading-tight mb-3 whitespace-pre-line">
                    {slide.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {slide.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={prev}
                className="w-9 h-9 rounded-full border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <div className="flex gap-1.5 flex-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === current ? 'bg-accent w-5 h-2' : 'bg-border w-2 h-2 hover:bg-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="w-9 h-9 rounded-full border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Bottom tagline */}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
              <span>More Than Travel.</span>
              <span className="text-accent">It's Peace of Mind.</span>
              <span>It's Personal.</span>
              <span className="text-primary">It's Morales.</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}