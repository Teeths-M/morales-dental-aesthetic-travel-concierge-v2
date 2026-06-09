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
      className="py-24 lg:py-28"
      style={{ background: '#09101E', borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] font-bold tracking-[0.28em] uppercase mb-5" style={{ color: GOLD }}>
              WHY PATIENTS CHOOSE MORALES
            </p>
            <h2 className="font-display text-4xl lg:text-[2.6rem] text-white leading-[1.1]">
              More Than Travel.<br />
              It's{' '}
              <span style={{ color: GOLD, fontStyle: 'italic' }}>Peace of Mind.</span>
            </h2>
            <div className="w-8 h-[2px] mt-7" style={{ background: GOLD }} />
          </motion.div>

          {/* Right — 4 features */}
          <div className="grid sm:grid-cols-2 gap-8 lg:gap-10">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                className="flex gap-4"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}28` }}
                >
                  <Icon className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-white font-medium text-[13.5px] mb-1.5">{title}</h3>
                  <p className="text-white/72 text-[12.5px] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}