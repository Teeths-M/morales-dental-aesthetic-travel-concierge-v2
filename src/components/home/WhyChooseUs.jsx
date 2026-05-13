import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Brain, Users, Lock, Headphones } from 'lucide-react';

const reasons = [
  { icon: ShieldCheck, title: 'Verified Elite Specialists', desc: 'Every provider is rigorously vetted with verified credentials and years of proven expertise.' },
  { icon: Brain, title: 'AI-Assisted Safe Planning', desc: 'Our SAFE-T 4LIFE™ system analyzes your profile to ensure the safest possible treatment plan.' },
  { icon: Users, title: 'All-Inclusive Concierge Care', desc: 'From airport pickup to hotel booking, every detail of your journey is handled with care.' },
  { icon: Lock, title: 'Comfort, Safety & Privacy', desc: 'Your medical data is encrypted and your privacy is our absolute priority throughout.' },
  { icon: Headphones, title: '24/7 Dedicated Support', desc: 'Reach our care team anytime via WhatsApp, phone, or email—before, during, and after your trip.' },
];

export default function WhyChooseUs() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <motion.div
            className="relative rounded-2xl overflow-hidden aspect-video"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/deb22db2c_addhome5.png"
              alt="Patient care collage"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Why Patients Choose Us</p>
            <h2 className="font-display text-3xl lg:text-4xl text-foreground mb-8">
              The Highest Standard of Care
            </h2>

            <div className="space-y-5">
              {reasons.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}