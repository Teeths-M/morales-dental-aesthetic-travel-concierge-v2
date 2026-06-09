import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Plane, Heart, ArrowRight } from 'lucide-react';

const GOLD = '#D4AF37';

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Consultation',
    desc: 'Share your goals. We listen and guide you with expert advice.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Specialist Matching',
    desc: 'We connect you with carefully vetted specialists.',
  },
  {
    number: '03',
    icon: Plane,
    title: 'Travel & Stay',
    desc: 'Flights, accommodation and transport. All arranged for you.',
  },
  {
    number: '04',
    icon: Heart,
    title: 'Recovery & Return',
    desc: "Personalized recovery support until you're safely back home.",
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
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: GOLD }}>
              HOW IT WORKS
            </p>
            <h2 className="font-display text-4xl lg:text-[2.6rem] text-white leading-[1.1] mb-4">
              Your Journey,<br />Simplified
            </h2>
            <div className="w-8 h-[2px] mb-5" style={{ background: GOLD }} />
            <p className="text-white/40 text-[14px] leading-relaxed mb-8">
              We make world-class care accessible and stress-free.
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
                className="relative p-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.045] transition-all duration-300 group"
              >
                <p className="text-[11px] font-bold tracking-wider mb-4" style={{ color: `${GOLD}50` }}>
                  {number}
                </p>
                <Icon
                  className="w-5 h-5 mb-4"
                  style={{ color: 'rgba(255,255,255,0.32)' }}
                  strokeWidth={1.5}
                />
                <h3 className="font-semibold text-white text-[14px] mb-2">{title}</h3>
                <p className="text-white/38 text-[12.5px] leading-relaxed">{desc}</p>

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