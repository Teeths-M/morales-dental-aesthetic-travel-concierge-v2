import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, ClipboardList, CreditCard, Plane, Stethoscope, HeartPulse, CalendarCheck, ArrowRight } from 'lucide-react';

const steps = [
  { icon: MessageSquare, num: 1, title: 'Free Consultation', desc: 'Tell us about your goals and medical history. Our team will review your case and connect you with the right specialist.', color: 'bg-primary/10 text-primary' },
  { icon: ClipboardList, num: 2, title: 'Personalized Plan & Quote', desc: 'Receive a detailed treatment plan with transparent pricing. Our SAFE-T 4LIFE™ system ensures the safest approach for you.', color: 'bg-accent/10 text-accent' },
  { icon: CreditCard, num: 3, title: 'Book & Secure Your Date', desc: 'Choose your preferred dates and secure your booking. We handle all the logistics so you can focus on preparing.', color: 'bg-primary/10 text-primary' },
  { icon: Plane, num: 4, title: 'Travel & Accommodation', desc: 'Airport transfers, hotel arrangements, and a personal concierge—everything is taken care of from door to door.', color: 'bg-accent/10 text-accent' },
  { icon: Stethoscope, num: 5, title: 'Your Procedure', desc: 'Receive world-class care from verified specialists in state-of-the-art facilities.', color: 'bg-primary/10 text-primary' },
  { icon: HeartPulse, num: 6, title: 'Recovery & Comfort', desc: 'Post-procedure care with dedicated nursing support. Recovery in comfort with 24/7 concierge assistance.', color: 'bg-accent/10 text-accent' },
  { icon: CalendarCheck, num: 7, title: 'Aftercare Follow-Up', desc: 'Continued support after you return home. Regular check-ins ensure your results are exactly as planned.', color: 'bg-primary/10 text-primary' },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Your Journey</p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">How It Works</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            From first consultation to aftercare, we handle every detail of your transformation journey.
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map(({ icon: Icon, num, title, desc, color }, i) => (
            <motion.div
              key={title}
              className="flex gap-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="pb-8">
                <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">Step {num}</div>
                <h3 className="font-display text-xl text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/booking">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-10">
              Start Your Journey <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}