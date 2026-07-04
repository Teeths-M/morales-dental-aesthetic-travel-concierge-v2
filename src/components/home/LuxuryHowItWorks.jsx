import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Plane, Heart, ArrowRight } from 'lucide-react';

const GOLD = '#D4AF37';

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Tell Us Your Goal',
    desc: '$49 consultation — fully credited to your package. We match you with a verified doctor, pre-screen your health, and design your full journey: flights, hotel, companion, and safety plan.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Everything Confirmed',
    desc: 'Your driver is booked. Your doctor is verified. Your family receives a live tracking link. Every detail locked in before you leave home.',
  },
  {
    number: '03',
    icon: Plane,
    title: '9 Checkpoints. Zero Gaps.',
    desc: 'From home pickup to clinic arrival, every handshake is digitally confirmed. Miss one — and our system escalates automatically: SMS, call, security, authorities.',
  },
  {
    number: '04',
    icon: Heart,
    title: 'Home Safe. Golden M Earned.',
    desc: 'Your final checkpoint confirmed. The Golden M is yours — proof that Morales walked every step beside you, from your front door to your safe return.',
  },
];

export default function LuxuryHowItWorks() {
  return (
    <section
      className="py-24 lg:py-28"
      style={{ background: 'linear-gradient(180deg, #060B16 0%, #09101E 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-14 items-start">

          {/* Left */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] uppercase mb-6" style={{ color: GOLD }}>
              HOW IT WORKS
            </p>
            <h2 className="font-display text-4xl lg:text-5xl text-white leading-[1.05] mb-5" style={{ letterSpacing: '-0.02em' }}>
              Your Journey,<br />Protected
            </h2>
            <div className="w-10 h-[2px] mb-6" style={{ background: GOLD }} />
            <p className="text-white/70 text-[17px] leading-[1.75] mb-9" style={{ fontWeight: 300 }}>
              Most platforms book you a flight and a doctor. Morales builds a 9-point safety spine around your entire journey — from your front door to your safe return home.
            </p>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all duration-200 hover:bg-white/[0.04]"
              style={{ borderColor: `${GOLD}45`, color: GOLD }}
            >
              Explore the Process <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right — 4 step cards in a row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map(({ number, icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                className="relative p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.055] transition-all duration-300 group"
        style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.3)' }}
              >
                <p className="text-[12px] font-semibold tracking-[0.25em] mb-5" style={{ color: GOLD }}>
                  {number}
                </p>
                <Icon
                  className="w-5 h-5 mb-5"
                  style={{ color: GOLD, filter: `drop-shadow(0 0 8px ${GOLD}cc) drop-shadow(0 0 18px ${GOLD}66)` }}
                  strokeWidth={1.5}
                />
                <h3 className="font-medium text-white text-[15px] mb-2.5" style={{ letterSpacing: '0.01em' }}>{title}</h3>
                <p className="text-white/60 text-[13px] leading-[1.7]" style={{ fontWeight: 300 }}>{desc}</p>

                {/* Arrow connector */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 hidden lg:flex w-5 h-5 rounded-full items-center justify-center"
                    style={{ background: '#09101E', border: `1px solid ${GOLD}30` }}
                  >
                    <ArrowRight className="w-2.5 h-2.5" style={{ color: GOLD }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}