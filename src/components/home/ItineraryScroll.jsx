import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useCart } from '@/context/CartContext';

// Trip day data keyed by procedure category from TarotSelection
const TRIP_BLUEPRINTS = {
  Restoration: {
    prepDays: 1,
    recoveryDays: 3,
    days: [
      { label: 'Day 1', title: 'VIP Arrival & Orientation', icon: '✈️', desc: 'Private chauffeur transfer from airport to your luxury accommodation. Welcome briefing with your personal concierge and a detailed consultation with your specialist.' },
      { label: 'Day 2', title: 'Pre-Op Diagnostics', icon: '🩺', desc: 'Full digital X-ray suite, 3D scanning, and pre-operative bloodwork. Review of your custom treatment plan with the lead clinician.' },
      { label: 'Day 3', title: 'Procedure Day', icon: '🦷', desc: 'Your scheduled dental procedure performed in a certified, internationally accredited surgical suite with full anaesthetic support.' },
      { label: 'Day 4', title: 'Recovery & Wellness', icon: '🌿', desc: 'Post-procedure check, prescribed recovery protocol, and optional wellness therapy. Rest and rejuvenate in your private suite.' },
      { label: 'Day 5', title: 'Final Review & Departure', icon: '🏠', desc: 'Final clinical sign-off, aftercare kit handover, digital records transmitted to your home dentist. Chauffeur to airport.' },
    ],
  },
  Radiance: {
    prepDays: 2,
    recoveryDays: 7,
    days: [
      { label: 'Day 1', title: 'VIP Arrival & Consultation', icon: '✈️', desc: 'Private transfer from airport. Welcome consultation and comprehensive medical assessment with your lead cosmetic surgeon.' },
      { label: 'Day 2', title: 'Pre-Surgical Preparation', icon: '🩺', desc: 'Full bloodwork panel, anaesthetic review, and body composition imaging. Personalised surgical plan confirmed.' },
      { label: 'Day 3', title: 'Procedure Day', icon: '✨', desc: 'Your cosmetic procedure performed in a fully accredited surgical facility. Recovery suite arranged for overnight comfort.' },
      { label: 'Days 4–6', title: 'Monitored Recovery', icon: '🌿', desc: 'Daily post-op check-ins, lymphatic drainage therapy, and nutritional support. Private recovery suite with 24hr nursing.' },
      { label: 'Day 7', title: 'Review & Departure', icon: '🏠', desc: 'Final surgeon review, suture check, and aftercare protocol delivered. Chauffeur transfer to departure terminal.' },
    ],
  },
  Vitality: {
    prepDays: 2,
    recoveryDays: 10,
    days: [
      { label: 'Day 1', title: 'VIP Arrival & Intake', icon: '✈️', desc: 'Private airport transfer and full clinical intake assessment. Nutritional counselling and pre-surgical coaching session.' },
      { label: 'Day 2', title: 'Specialist Consultations', icon: '🩺', desc: 'Multi-disciplinary team review including surgeon, anaesthesiologist, and wellness coordinator.' },
      { label: 'Day 3', title: 'Procedure Day', icon: '💚', desc: 'Your scheduled procedure in a world-class clinical facility. Fully staffed recovery suite with specialist nursing care.' },
      { label: 'Days 4–8', title: 'Recovery & Rehabilitation', icon: '🌿', desc: 'Progressive recovery milestones tracked daily. Physiotherapy, nutrition, and psychological support included.' },
      { label: 'Day 9', title: 'Final Clearance & Departure', icon: '🏠', desc: 'Comprehensive discharge review, long-term aftercare plan provided, and medical records transferred. Departure transfer arranged.' },
    ],
  },
  default: {
    prepDays: 1,
    recoveryDays: 5,
    days: [
      { label: 'Day 1', title: 'VIP Arrival', icon: '✈️', desc: 'Private chauffeur from the airport, hotel check-in, and a welcome consultation with your dedicated concierge team.' },
      { label: 'Day 2', title: 'Pre-Op Assessment', icon: '🩺', desc: 'Comprehensive pre-operative diagnostics and personalised treatment plan review with your specialist.' },
      { label: 'Day 3', title: 'Procedure Day', icon: '🏥', desc: 'Your scheduled procedure performed in a fully accredited, internationally certified surgical facility.' },
      { label: 'Day 4', title: 'Recovery & Comfort', icon: '🌿', desc: 'Post-op monitoring in your private suite with dedicated nursing staff and bespoke wellness support.' },
      { label: 'Day 5', title: 'Sign-Off & Departure', icon: '🏠', desc: 'Final clinical sign-off, full aftercare kit, digital records, and private chauffeur to the airport.' },
    ],
  },
};

function MilestoneCard({ day, index, scrollYProgress }) {
  const isLeft = index % 2 === 0;
  const start = index * 0.15;
  const mid = start + 0.08;
  const end = start + 0.22;

  const opacity = useTransform(scrollYProgress, [start, mid, end], [0.4, 1, 1]);
  const scale = useTransform(scrollYProgress, [start, mid], [0.92, 1]);
  const x = useTransform(
    scrollYProgress,
    [start, mid],
    [isLeft ? -30 : 30, 0]
  );

  return (
    <div className={`relative flex items-center w-full mb-16 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Card side */}
      <div className={`w-5/12 ${isLeft ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
        <motion.div
          style={{ opacity, scale, x }}
          className="inline-block rounded-2xl p-6 w-full"
          style={{
            opacity,
            scale,
            x,
            background: 'linear-gradient(135deg, #0a2614 0%, #0F3A20 100%)',
            border: '1px solid rgba(197,160,89,0.35)',
            boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 0 15px rgba(255,255,255,0.02)',
          }}
        >
          <div className={`flex items-center gap-3 mb-3 ${isLeft ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
            <span className="text-2xl">{day.icon}</span>
            <div className={isLeft ? 'text-right' : 'text-left'}>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: '#C5A059' }}>{day.label}</p>
              <h3 className="font-display text-lg text-white">{day.title}</h3>
            </div>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">{day.desc}</p>
        </motion.div>
      </div>

      {/* Central anchor dot */}
      <div className="w-2/12 flex justify-center">
        <motion.div
          style={{ opacity, scale }}
          className="flex flex-col items-center"
        >
          <div
            className="w-4 h-4 rounded-full z-10"
            style={{
              background: '#C5A059',
              boxShadow: '0 0 16px rgba(197,160,89,0.7)',
            }}
          />
        </motion.div>
      </div>

      {/* Empty opposite side */}
      <div className="w-5/12" />
    </div>
  );
}

export default function ItineraryScroll() {
  const { items } = useCart();
  const scrollRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ['start end', 'end start'],
  });

  // Derive trip blueprint from cart
  const category = items[0]?.category || 'default';
  const blueprint = TRIP_BLUEPRINTS[category] || TRIP_BLUEPRINTS.default;
  const { days, prepDays, recoveryDays } = blueprint;
  const totalDays = prepDays + recoveryDays + 1;

  return (
    <section
      className="relative w-full py-24 px-4 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050f09 0%, #071510 60%, #050f09 100%)' }}
    >
      {/* Header */}
      <motion.div
        className="text-center mb-20 relative z-10"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase mb-4" style={{ color: '#C5A059' }}>
          Your Journey, Mapped
        </p>
        <h2 className="font-display text-4xl sm:text-5xl text-white mb-4">
          The Itinerary
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-3">
          {category !== 'default' ? `Path of ${category}` : 'Your personalised concierge journey'} — tailored, managed, and delivered.
        </p>
        {/* Trip metrics row */}
        <div className="inline-flex items-center gap-6 mt-4 px-6 py-3 rounded-full"
          style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.2)' }}>
          {[
            { label: 'Prep', value: `${prepDays}d` },
            { label: 'Total Stay', value: `${totalDays}d` },
            { label: 'Recovery', value: `${recoveryDays}d` },
          ].map((m, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-lg" style={{ color: '#C5A059' }}>{m.value}</p>
              <p className="text-[9px] tracking-widest uppercase text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Timeline */}
      <div ref={scrollRef} className="relative max-w-4xl mx-auto">
        {/* Central gold anchor line */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent, #C5A059 10%, #C5A059 90%, transparent)',
            opacity: 0.35,
          }}
        />

        {days.map((day, i) => (
          <MilestoneCard
            key={i}
            day={day}
            index={i}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #050f09)' }} />
    </section>
  );
}