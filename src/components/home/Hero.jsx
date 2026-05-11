import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane } from 'lucide-react';
import { motion } from 'framer-motion';

const badges = [
  { icon: Shield, label: 'SAFE-T 4LIFE™', sub: 'AI-Powered Safety' },
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
  { icon: Plane, label: 'Door-to-Door Care', sub: 'Travel. Care. Recover.' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[calc(100vh-5rem)]">
          {/* Left Content */}
          <motion.div 
            className="py-12 lg:py-24"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-foreground leading-[1.05] mb-6">
              Your Transformation.{' '}
              <br className="hidden sm:block" />
              Our Priority.{' '}
              <br className="hidden sm:block" />
              <span className="text-primary">Your Safety.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Premium dental, aesthetic and wellness care with door-to-door concierge service.
            </p>
            <div className="flex flex-wrap gap-3 mb-12">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12">
                  Book Your Consultation
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
                  Explore Procedures
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6">
              {badges.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-h-[600px]">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/3ea195321_generated_8e246ca1.png"
                alt="Premium dental care patient"
                className="w-full h-full object-cover"
              />
              {/* Overlay Card */}
              <div className="absolute bottom-6 left-6 right-6 bg-card/90 backdrop-blur-xl rounded-xl p-5 border border-border/50">
                <p className="text-sm font-semibold text-foreground mb-3">Why Patients Choose Us</p>
                <div className="space-y-2">
                  {['Verified Elite Specialists', 'AI-Assisted Safe Planning', 'All-Inclusive Concierge Care', 'Comfort, Safety & Privacy', '24/7 Support'].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}