import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const BASE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/';

const PROCEDURES = [
  {
    name: 'Dental Implants',
    tagline: 'Permanent smile. Life changed.',
    save: 'Save $5,000–$12,000',
    destinations: ['🇨🇴', '🇲🇽', '🇹🇷'],
    image: BASE + '2487f91b8_generated_image.png',
    color: '#22c55e',
  },
  {
    name: 'Porcelain Veneers',
    tagline: 'The smile you were born to have.',
    save: 'Save $3,500–$8,000',
    destinations: ['🇹🇷', '🇨🇴', '🇧🇷'],
    image: BASE + '591289dd5_generated_image.png',
    color: GOLD,
  },
  {
    name: 'Rhinoplasty',
    tagline: 'Natural. Balanced. You.',
    save: 'Save $2,500–$6,000',
    destinations: ['🇹🇷', '🇨🇴', '🇮🇳'],
    image: BASE + '4ff2fab82_generated_image.png',
    color: '#a855f7',
  },
  {
    name: 'All-on-4 Implants',
    tagline: 'Full arch. Full confidence.',
    save: 'Save $8,000–$20,000',
    destinations: ['🇲🇽', '🇹🇷', '🇨🇴'],
    image: BASE + '835718b01_generated_image.png',
    color: '#60a5fa',
  },
  {
    name: 'Facelift',
    tagline: 'Confidence, restored.',
    save: 'Save $6,000–$15,000',
    destinations: ['🇧🇷', '🇨🇴', '🇹🇷'],
    image: BASE + '9b31409d1_generated_image.png',
    color: '#ec4899',
  },
  {
    name: 'Tummy Tuck',
    tagline: 'The body you worked for.',
    save: 'Save $4,000–$10,000',
    destinations: ['🇧🇷', '🇻🇪', '🇨🇴'],
    image: BASE + '8493029e5_generated_image.png',
    color: '#f97316',
  },
  {
    name: 'Smile Makeover',
    tagline: 'One journey. Total transformation.',
    save: 'Save $7,000–$18,000',
    destinations: ['🇹🇷', '🇲🇽', '🇧🇷'],
    image: BASE + '8018f783e_generated_image.png',
    color: GOLD,
  },
];

export default function OurExpertsTeaser() {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <section
      className="py-20 lg:py-28 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #070d18 0%, #060B16 100%)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] uppercase mb-4" style={{ color: GOLD }}>
              Real Procedures. Real Savings.
            </p>
            <h2
              className="text-white leading-tight"
              style={{
                fontSize:      'clamp(1.9rem, 4.5vw, 3.2rem)',
                fontWeight:    700,
                letterSpacing: '-0.02em',
                fontFamily:    '"SF Pro Display", system-ui, sans-serif',
              }}
            >
              See what's possible —<br />
              <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 400, fontFamily: 'Georgia, serif' }}>
                and how much you'll keep.
              </span>
            </h2>
          </div>

          {/* Scroll arrows + CTA */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => scroll(-1)}
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              to="/providers"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background:   `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                color:        '#060B16',
                boxShadow:    `0 4px 20px ${BRAND.goldAlpha(0.3)}`,
                letterSpacing: '0.02em',
              }}
            >
              View All Specialists <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Horizontal scroll row */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {PROCEDURES.map((proc, i) => (
            <Link
              key={proc.name}
              to="/procedures"
              className="group flex-shrink-0 relative rounded-2xl overflow-hidden block"
              style={{
                width:  '260px',
                height: '380px',
                background: '#0C1A1D',
                border: `1px solid rgba(255,255,255,0.07)`,
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${proc.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Photo */}
              <img
                src={proc.image}
                alt={`${proc.name} result`}
                className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(6,11,22,0.05) 0%, rgba(6,11,22,0.3) 40%, rgba(6,11,22,0.92) 100%)' }}
              />

              {/* Top-right: savings badge */}
              <div
                className="absolute top-3 right-3"
                style={{
                  background:  `${proc.color}22`,
                  border:      `1px solid ${proc.color}60`,
                  backdropFilter: 'blur(8px)',
                  borderRadius: 99,
                  padding:     '4px 10px',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: proc.color, letterSpacing: '0.04em' }}>
                  {proc.save}
                </span>
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {/* Destination flags */}
                <div className="flex gap-1 mb-3">
                  {proc.destinations.map(flag => (
                    <span key={flag} style={{ fontSize: 16 }}>{flag}</span>
                  ))}
                </div>

                <h3
                  className="text-white mb-1"
                  style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}
                >
                  {proc.name}
                </h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 12 }}>
                  {proc.tagline}
                </p>

                {/* CTA reveal on hover */}
                <div
                  className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ fontSize: 12, fontWeight: 600, color: proc.color }}
                >
                  Find My Specialist <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom stats row */}
        <div
          className="flex flex-wrap gap-x-10 gap-y-3 mt-10 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { value: '100%',  label: 'Credential-checked' },
            { value: '8',     label: 'Checkpoints per journey' },
            { value: '24/7',  label: 'Concierge & emergency line' },
            { value: '0',     label: 'Unsafe plans approved' },
          ].map(({ value, label }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span
                style={{
                  fontSize: 22, fontWeight: 800, color: GOLD,
                  fontFamily: '"SF Pro Display", system-ui, sans-serif',
                  letterSpacing: '-0.02em',
                }}
              >
                {value}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
