import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, Headphones, Star, Heart, Globe, Lock, Plane, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const slides = [
  {
    icon: Sparkles,
    eyebrow: 'Our Promise',
    headline: 'Heal Beautifully.\nTravel Confidently.',
    body: 'Premium care. Expert guidance. A journey designed entirely around you.',
    color: 'from-accent/10 to-transparent',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'SAFE-T 4LIFE™ Protected Journey',
    headline: 'Intelligent Guidance\nAt Every Step',
    body: 'Safety awareness and careful coordination throughout your entire treatment journey — before you leave home to after you return.',
    color: 'from-primary/10 to-transparent',
  },
  {
    icon: Headphones,
    eyebrow: 'End-to-End Concierge Care',
    headline: 'We Handle Every Detail\nSo You Can Focus on Healing',
    body: 'Your health, comfort, and peace of mind — handled for you from start to finish.',
    color: 'from-accent/10 to-transparent',
  },
  {
    icon: Star,
    eyebrow: 'World-Class Experts',
    headline: 'Verified Specialists &\nAccredited Clinics',
    body: 'Partnered with board-certified professionals and accredited clinics you can trust.',
    color: 'from-primary/10 to-transparent',
  },
  {
    icon: Heart,
    eyebrow: 'Human Support. Always.',
    headline: 'Real People.\n24/7 Concierge Support.',
    body: 'Before, during, and after your journey — our team is with you every step of the way.',
    color: 'from-accent/10 to-transparent',
  },
  {
    icon: Globe,
    eyebrow: 'Why Margarita Island?',
    headline: 'Recover. Restore.\nRejuvenate in Caribbean Paradise.',
    body: 'Margarita Island, Venezuela — stunning beaches, warm hospitality, and exceptional care. The perfect place to heal, relax, and enjoy renewal.',
    color: 'from-primary/10 to-transparent',
  },
  {
    icon: Lock,
    eyebrow: 'Secure & Confidential',
    headline: 'Your Privacy Is\nOur Priority.',
    body: 'Your information is always protected. World-class treatments at a fraction of the cost compared to the US and Europe.',
    color: 'from-accent/10 to-transparent',
  },
  {
    icon: Plane,
    eyebrow: 'Seamless Travel Coordination',
    headline: 'Flights, Stays, Transfers\n— All Handled for You.',
    body: 'Multilingual team. English, Spanish, and more. Easy flights, welcoming environment, and a hassle-free travel experience.',
    color: 'from-primary/10 to-transparent',
  },
];

const clientWords = [
  { quote: '"I never felt alone — they were with me every step."', name: 'Keisha M.', origin: 'Trinidad' },
  { quote: '"My smile transformation exceeded every expectation."', name: 'David C.', origin: 'Canada' },
  { quote: '"Affordable, safe, and genuinely caring. I recommend Morales to everyone."', name: 'Priya S.', origin: 'USA' },
];

export default function BrandSlideshow() {
  const [current, setCurrent] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % clientWords.length), 4000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[current];
  const Icon = slide.icon;
  const testimonial = clientWords[testimonialIdx];

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-12 will-change-transform transform-gpu"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Morales Dental & Aesthetics Travel Concierge</p>
          <h2 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
            Your Transformation,<br />
            <span className="text-primary">Our Priority. Your Safety.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm lg:text-base leading-relaxed">
            We combine world-class medical expertise with luxury travel and personalized support for a safe, seamless, and life-enhancing experience.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: Image + emotional testimonial overlay */}
          <motion.div
            className="relative will-change-transform transform-gpu"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/1ca89ed08_Addhome3.png"
                alt="Your Transformation Our Priority"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Floating emotional testimonial card */}
            <div className="absolute -bottom-5 -right-3 lg:-right-6 max-w-[260px] bg-card border border-border rounded-2xl p-4 shadow-xl will-change-transform transform-gpu">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIdx}
                  className="will-change-transform transform-gpu"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-xs text-foreground italic leading-relaxed mb-2">{testimonial.quote}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">— {testimonial.name}, {testimonial.origin}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: Slideshow */}
          <div
            className="relative pt-6"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Slide card */}
            <div className={`relative bg-card border border-border rounded-2xl p-8 shadow-lg min-h-[240px] flex flex-col justify-center overflow-hidden`}>
              {/* bg gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} rounded-2xl pointer-events-none`} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  className="relative z-10 will-change-transform transform-gpu"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
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

            {/* CTA */}
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link to="/booking">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 shadow-md">
                  Begin Your Journey
                </Button>
              </Link>
              <Link to="/safe-t">
                <Button variant="outline" className="font-semibold px-6">
                  Learn About SAFE-T 4LIFE™
                </Button>
              </Link>
            </div>

            {/* Bottom tagline */}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium border-t border-border pt-5">
              <span>More Than Travel.</span>
              <span className="text-accent font-semibold">It's Peace of Mind.</span>
              <span>It's Personal.</span>
              <span className="text-primary font-semibold">It's Morales.</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}