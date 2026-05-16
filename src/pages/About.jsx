import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, Award } from 'lucide-react';

const values = [
  { icon: Shield, title: 'Safety First', desc: 'Every decision we make puts your safety and wellbeing above all else.' },
  { icon: Users, title: 'Patient-Centered', desc: 'Your goals, your timeline, your comfort — everything is built around you.' },
  { icon: Globe, title: 'World-Class Access', desc: 'We connect you with the finest specialists and facilities globally.' },
  { icon: Award, title: 'Proven Excellence', desc: 'A track record of 500+ successful transformations and 98% satisfaction.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">About Us</p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-6">
            Your Safety, Our Mission
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Morales Dental & Aesthetic Travel Concierge was founded on a simple principle: everyone deserves access to world-class dental and aesthetic care, delivered with uncompromising safety and personalized attention.
          </p>
        </motion.div>

        <div className="relative rounded-2xl overflow-hidden aspect-video mb-16">
          <img
            src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ac09f3ff8_generated_81131568.png"
            alt="Modern architecture detail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <p className="font-display text-2xl lg:text-3xl text-white">
              "The Precision of Care"
            </p>
            <p className="text-sm text-white/70 mt-1">Our guiding philosophy since day one</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {values.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="bg-card border border-border rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}