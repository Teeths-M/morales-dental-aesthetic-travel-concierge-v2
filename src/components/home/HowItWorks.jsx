import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ClipboardList, CreditCard, Plane, Stethoscope, HeartPulse, CalendarCheck } from 'lucide-react';

const steps = [
  { icon: MessageSquare, num: '1', title: 'Consultation', desc: 'Tell us your goals' },
  { icon: ClipboardList, num: '2', title: 'Plan & Quote', desc: 'Personalized for you' },
  { icon: CreditCard, num: '3', title: 'Book & Pay', desc: 'Secure your date' },
  { icon: Plane, num: '4', title: 'Travel & Stay', desc: 'We take care of you' },
  { icon: Stethoscope, num: '5', title: 'Procedure', desc: 'Expert care' },
  { icon: HeartPulse, num: '6', title: 'Recovery', desc: 'Comfort & support' },
  { icon: CalendarCheck, num: '7', title: 'Aftercare', desc: 'We follow up' },
];

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Your Journey</p>
          <h2 className="font-display text-3xl lg:text-4xl text-foreground">How It Works</h2>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-border" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-6 lg:gap-4">
            {steps.map(({ icon: Icon, num, title, desc }, i) => (
              <motion.div
                key={title}
                className="text-center relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="w-16 h-16 rounded-full bg-card border-2 border-border mx-auto flex items-center justify-center relative z-10 mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="inline-block bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                  Step {num}
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}