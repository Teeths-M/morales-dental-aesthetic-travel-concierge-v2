import React from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Activity, Smile } from 'lucide-react';

const GOLD = '#D4AF37';

const features = [
  {
    icon: Users,
    title: 'Human Concierge',
    desc: 'Real people guiding you every step of the way.',
  },
  {
    icon: Shield,
    title: 'Safe Connections',
    desc: 'Only vetted specialists and accredited facilities.',
  },
  {
    icon: Activity,
    title: 'Better Outcomes',
    desc: 'Personalized care plans for optimal results.',
  },
  {
    icon: Smile,
    title: 'Stress-Free Experience',
    desc: 'We manage the details. You focus on you.',
  },
];

export default function LuxuryWhyMorales() {
  return (
    <section
      className="py-24 lg:py-32"
      style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — headline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: GOLD }}>
              WHY PATIENTS CHOOSE MORALES
            </p>
            <h2 className="font-display text-4xl lg:text-5xl text-white leading-[1.1]">
              More Than Travel.<br />
              It's{' '}
              <span style={{ color: GOLD, fontStyle: 'italic' }}>Peace of Mind.</span>
            </h2>
            <div className="w-10 h-px mt-8" style={{ background: GOLD }} />
          </motion.div>

          {/* Right — feature grid */}
          <div className="grid sm:grid-cols-2 gap-8 lg:gap-10">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="flex gap-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}28` }}
                >
                  <Icon className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[14px] mb-1.5">{title}</h3>
                  <p className="text-white/40 text-[13px] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}