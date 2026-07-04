/**
 * RealMoments — three specific patient moments that trigger emotional belief.
 * Specificity = credibility. These are not testimonials — they are scenes.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const MOMENTS = [
  {
    tag:     'Family Peace of Mind',
    tagColor: '#a855f7',
    moment:  'Maria\'s daughter tracked checkpoint 5 from her couch in Houston — and cried when "Clinic Arrived ✓" appeared on her phone.',
    who:     'Maria C.',
    where:   'Margarita Island, Venezuela 🇻🇪',
    procedure: 'Dental Veneers',
  },
  {
    tag:     'Above and Beyond',
    tagColor: GOLD,
    moment:  'Daniel woke up from sedation to find his Morales companion had already coordinated his hotel breakfast, ice packs, and a call with his doctor at home.',
    who:     'Daniel O.',
    where:   'Istanbul, Turkey 🇹🇷',
    procedure: 'All-on-4 Implants',
  },
  {
    tag:     'We Had Your Back',
    tagColor: '#22c55e',
    moment:  'When Priya\'s flight was cancelled, her Morales coordinator had her rebooked in 11 minutes — before she even reached the gate.',
    who:     'Priya S.',
    where:   'Bangkok, Thailand 🇹🇭',
    procedure: 'Rhinoplasty',
  },
];

export default function RealMoments() {
  return (
    <section
      className="py-20 lg:py-28"
      style={{ background: 'linear-gradient(180deg, #060B16 0%, #070d18 100%)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-semibold tracking-[0.32em] uppercase mb-5" style={{ color: GOLD }}>
            Real Moments. Real People.
          </p>
          <h2
            className="text-white leading-tight mb-4"
            style={{
              fontSize:      'clamp(1.9rem, 4.5vw, 3.2rem)',
              fontWeight:    700,
              letterSpacing: '-0.02em',
              fontFamily:    '"SF Pro Display", system-ui, sans-serif',
            }}
          >
            Not reviews. Scenes.<br />
            <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 400, fontFamily: 'Georgia, serif' }}>
              This is what Morales looks like.
            </span>
          </h2>
          <p className="text-white/45 max-w-xl mx-auto" style={{ fontSize: 15, lineHeight: 1.7 }}>
            Sometimes one specific moment says more than any statistic.
          </p>
        </motion.div>

        {/* Moment cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {MOMENTS.map(({ tag, tagColor, moment, who, where, procedure }, i) => (
            <motion.div
              key={who}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col rounded-2xl overflow-hidden"
              style={{
                background:   '#0C1A1D',
                border:       '1px solid rgba(255,255,255,0.07)',
                padding:      '28px 24px 24px',
                boxShadow:    '0 4px 40px rgba(0,0,0,0.35)',
              }}
            >
              {/* Gold top accent line */}
              <div
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${tagColor}, transparent)` }}
              />

              {/* Tag */}
              <span
                className="inline-flex self-start text-[10px] font-bold rounded-full px-3 py-1 mb-5"
                style={{
                  background:    `${tagColor}18`,
                  color:          tagColor,
                  border:        `1px solid ${tagColor}35`,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </span>

              {/* Quote mark */}
              <div
                className="text-6xl leading-none mb-3 select-none"
                style={{ color: `${GOLD}30`, fontFamily: 'Georgia, serif', lineHeight: 0.8 }}
              >
                "
              </div>

              {/* The moment */}
              <p
                className="text-white flex-1 mb-6"
                style={{
                  fontSize:   '16px',
                  lineHeight: 1.75,
                  fontWeight: 400,
                  fontStyle:  'italic',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {moment}
              </p>

              {/* Attribution */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                <p className="text-white text-sm font-semibold mb-0.5">{who}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{where}</p>
                <p style={{ fontSize: 11, color: GOLD, marginTop: 4, letterSpacing: '0.04em' }}>{procedure}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
