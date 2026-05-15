import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Star, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import SlotCounter from './SlotCounter';

const testimonials = [
{ name: 'Sandra T.', country: 'Trinidad & Tobago', quote: 'I felt cared for every single step. They handled everything.', rating: 5 },
{ name: 'James R.', country: 'Canada', quote: 'World-class dental work at a fraction of the cost. Life-changing.', rating: 5 },
{ name: 'Maria L.', country: 'USA', quote: 'From booking to recovery — seamless, warm, and professional.', rating: 5 }];


const badges = [
{ icon: Shield, label: 'SAFE-T 4LIFE™', sub: 'AI-Powered Safety' },
{ icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
{ icon: Plane, label: 'Door-to-Door Care', sub: 'Travel. Care. Recover.' }];


export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Subtle decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top service label */}
        <motion.div
          className="flex justify-center pt-8 lg:pt-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Medical Tourism Concierge — Margarita Island, Venezuela
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[calc(100vh-7rem)]">
          {/* Left Content */}
          <motion.div
            className="py-10 lg:py-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-foreground leading-[1.05] mb-4">
              Your Transformation.{' '}
              <br className="hidden sm:block" />
              Our Priority.{' '}
              <br className="hidden sm:block" />
              <span className="text-primary">Your Safety.</span>
            </h1>

            <p className="text-base lg:text-lg max-w-md mb-4 leading-relaxed text-[hsl(var(--sidebar-accent-foreground))]">Premium dental, aesthetic & wellness care with door-to-door concierge service. Save 30–40% versus US & Canadian pricing — without compromising on quality.


            </p>

            {/* Emotional pull quote */}
            <p className="text-sm font-medium text-accent italic mb-8">
              "More than a clinic visit — it's a life-changing journey we take together."
            </p>

            <SlotCounter className="mb-4" />

            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12 shadow-lg">
                  Begin Your Journey
                </Button>
              </Link>
              <Link to="/procedures">
                <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
                  Explore Procedures
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-5 mb-10">
              {badges.map(({ icon: Icon, label, sub }) =>
              <div key={label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Live testimonial strip */}
            <div className="border-t border-border pt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">What Our Clients Say</p>
              <div className="flex flex-col gap-3">
                {testimonials.map((t) =>
                <div key={t.name} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{t.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{t.country}
                        </span>
                        <div className="flex ml-auto">
                          {[...Array(t.rating)].map((_, i) =>
                        <Star key={i} className="w-2.5 h-2.5 fill-accent text-accent" />
                        )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{t.quote}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}>
            
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-h-[680px]">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/3ea195321_generated_8e246ca1.png"
                alt="Premium dental care patient"
                className="w-full h-full object-cover" />
              
              {/* Floating service badge */}
              <div className="absolute top-5 left-5 bg-card/95 backdrop-blur-md rounded-xl px-4 py-2.5 border border-border/50 shadow-lg">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Morales Dental & Aesthetics</p>
                <p className="text-sm font-bold text-foreground">Travel Concierge Service</p>
              </div>

              {/* Overlay Card */}
              <div className="absolute bottom-6 left-6 right-6 bg-card/90 backdrop-blur-xl rounded-xl p-5 border border-border/50">
                <p className="text-sm font-semibold text-foreground mb-3">Why Patients Choose Us</p>
                <div className="space-y-2">
                  {['Verified Elite Specialists', 'AI-Assisted Safe Planning', 'All-Inclusive Concierge Care', 'Comfort, Safety & Privacy', '24/7 Support'].map((item) =>
                  <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>);

}