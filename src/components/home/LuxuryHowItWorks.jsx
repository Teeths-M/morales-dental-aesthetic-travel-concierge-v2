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
      className="py-24 lg:py-32"
      style={{ background: 'linear-gradient(180deg, #060B16 0%, #0A1020 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        <div className="grid lg:grid-cols-[280px_1fr] gap-12 lg:gap-16 items-start">

          {/* Left — section header */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: GOLD }}>
              HOW IT WORKS
            </p>
            <h2 className="font-display text-4xl lg:text-5xl text-white leading-[1.1] mb-4">
              Your Journey,<br />Simplified
            </h2>
            <div className="w-10 h-px mb-6" style={{ background: GOLD }} />
            <p className="text-white/45 text-[15px] leading-relaxed mb-10">
              We make world-class care accessible and stress-free.
            </p>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 hover:bg-white/5"
              style={{ borderColor: `${GOLD}40`, color: GOLD }}
            >
              Explore the Process <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right — cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map(({ number, icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:border-yellow-500/25 hover:bg-white/[0.05] transition-all duration-300 group cursor-default"
              >
                <p className="text-xs font-bold tracking-wider mb-5" style={{ color: `${GOLD}55` }}>
                  {number}
                </p>
                <Icon
                  className="w-6 h-6 mb-5 transition-colors duration-200 group-hover:opacity-100"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  strokeWidth={1.5}
                />
                <h3 className="font-semibold text-white text-[15px] mb-2.5">{title}</h3>
                <p className="text-white/38 text-[13px] leading-relaxed">{desc}</p>

                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: '#0A1020', border: `1px solid ${GOLD}35` }}
                  >
                    <ArrowRight className="w-3 h-3" style={{ color: GOLD }} />
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