import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, Star, Heart, Globe, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DEFAULT_IMG = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';

const slides = [
  // ── Destination flashcards first — image changes immediately on load ───────
  {
    icon: Globe,
    eyebrow: '🇨🇴 Why Colombia?',
    headline: 'World-Class Dentistry.\nCaribbean Warmth.',
    body: 'Bogotá and Medellín are home to elite, internationally accredited clinics. Full smile makeovers at 65% less than the US. English-speaking surgeons. Morales partners vetted personally.',
    color: 'from-green-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&fit=crop&q=80',
    imageAlt: 'Cartagena, Colombia — colorful colonial city and medical tourism hub',
  },
  {
    icon: Globe,
    eyebrow: '🇹🇭 Why Thailand?',
    headline: 'Asia\'s Medical\nTourism Capital.',
    body: 'Bangkok\'s JCI-accredited hospitals treat 2 million international patients yearly. Dental implants from $600 vs $4,000 in the US. Recover in paradise. Fly home transformed.',
    color: 'from-orange-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&fit=crop&q=80',
    imageAlt: 'Bangkok, Thailand — Asia\'s medical tourism capital',
  },
  {
    icon: Globe,
    eyebrow: '🇹🇷 Why Turkey?',
    headline: 'Europe\'s #1 Medical\nTourism Destination.',
    body: 'Istanbul has 32 JCI-certified hospitals — more than any city in Europe. Rhinoplasty, veneers, hair restoration at half the European price. Surgeons trained in London and Paris.',
    color: 'from-red-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&fit=crop&q=80',
    imageAlt: 'Istanbul, Turkey — Europe\'s #1 medical tourism destination',
  },
  {
    icon: Globe,
    eyebrow: '🇻🇪 Why Venezuela?',
    headline: 'Caribbean Recovery.\nWorld-Class Aesthetic Surgeons.',
    body: 'Venezuela trains some of Latin America\'s most celebrated aesthetic surgeons. Warm Caribbean climate ideal for post-op recovery. Morales partners are internationally certified and personally screened.',
    color: 'from-yellow-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&fit=crop&q=80',
    imageAlt: 'Margarita Island, Venezuela — Caribbean turquoise waters and recovery paradise',
  },
  {
    icon: Globe,
    eyebrow: '🇧🇷 Why Brazil?',
    headline: 'The Plastic Surgery\nCapital of the World.',
    body: 'Brazil performs more cosmetic procedures per capita than anywhere on earth. Rio and São Paulo surgeons have decade-long international reputations. Recovery on the world\'s most beautiful beaches.',
    color: 'from-emerald-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&fit=crop&q=80',
    imageAlt: 'Rio de Janeiro, Brazil — plastic surgery capital of the world',
  },
  {
    icon: Globe,
    eyebrow: '🇲🇽 Why Mexico?',
    headline: 'One Million Americans\nCross the Border for Dental Care.',
    body: 'Los Algodones alone has 350 dental clinics in 4 city blocks. Savings of $5,000–$20,000 on full-mouth restorations. Morales coordinates everything — you just show up and smile.',
    color: 'from-red-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&fit=crop&q=80',
    imageAlt: 'Mexico City — top dental tourism destination',
  },
  {
    icon: Globe,
    eyebrow: '🇮🇳 Why India?',
    headline: 'Elite Care.\nFraction of the Cost.',
    body: 'Mumbai and Chennai have hospitals that rival the best in the UK and USA at 80% lower cost. Heart surgery, dental implants, knee replacements — all with JCI-accredited surgeons.',
    color: 'from-orange-500/10 to-transparent',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&fit=crop&q=80',
    imageAlt: 'India — world-class hospitals at a fraction of Western prices',
  },

  // ── Brand/trust slides — each needs a unique image URL so AnimatePresence transitions ──
  {
    icon: Sparkles,
    eyebrow: 'Our Promise',
    headline: 'Heal Beautifully.\nTravel Confidently.',
    body: 'Premium care. Expert guidance. A 9-checkpoint safety system. A journey designed entirely around you.',
    color: 'from-accent/10 to-transparent',
    image: 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Safe-T4life™ Protected Journey',
    headline: '9 Checkpoints.\nZero Gaps.',
    body: 'Every handshake digitally confirmed — driver, hotel, clinic, companion, return home. Miss one and our system escalates automatically.',
    color: 'from-primary/10 to-transparent',
    image: 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/03cdc6bc8_image.png',
  },
  {
    icon: Lock,
    eyebrow: 'Secure & Confidential',
    headline: 'Your Privacy Is\nOur Priority.',
    body: 'Your passport, records, and data are encrypted in your personal Morales Vault. World-class treatments — your information never shared without consent.',
    color: 'from-accent/10 to-transparent',
    image: 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/8018f783e_generated_image.png',
  },
  {
    icon: Heart,
    eyebrow: 'Human Support. Always.',
    headline: 'Real People.\n24/7 Concierge Support.',
    body: 'Before, during, and after your journey — your Morales coordinator is one message away. Day or night. Any country. Any situation.',
    color: 'from-primary/10 to-transparent',
    image: 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/9b31409d1_generated_image.png',
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
    const timer = setInterval(next, 6500);
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
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
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

          {/* Left: Destination image — crossfades to match current slide */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ position: 'relative', aspectRatio: '4/3', background: '#0C1A1D' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.imageAlt || 'Morales Medical Travel'}
                  className="w-full h-full object-cover"
                  style={{ position: 'absolute', inset: 0 }}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              </AnimatePresence>
              {/* Dark overlay so the testimonial card reads clearly */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 100%)' }} />
              {/* Destination label — only on destination slides */}
              {slide.image !== DEFAULT_IMG ? (
                <motion.div
                  key={`label-${current}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  style={{ position: 'absolute', bottom: 70, left: 16, right: 16 }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(6,11,22,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 99, padding: '6px 14px' }}>
                    <span style={{ fontSize: 18 }}>{slide.eyebrow.slice(0, 2)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>{slide.eyebrow.slice(3)}</span>
                  </div>
                </motion.div>
              ) : null}
            </div>

            {/* Floating emotional testimonial card */}
            <div className="absolute -bottom-5 -right-3 lg:-right-6 max-w-[260px] bg-card border border-border rounded-2xl p-4 shadow-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
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
                  className="relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
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