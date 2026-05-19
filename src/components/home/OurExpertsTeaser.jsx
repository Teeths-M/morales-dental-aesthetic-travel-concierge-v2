import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Stethoscope, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OurExpertsTeaser() {
  return (
    <section className="py-16 lg:py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-14 items-center">
          <div>
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Our Experts</p>
            <h2 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
              Meet verified specialists before you travel.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Explore trusted doctors and care professionals available through Morales Dental & Aesthetic Travel Concierge.
            </p>
            <Link to="/providers">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                View Our Experts <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-border shadow-xl">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/03cdc6bc8_image.png"
                alt="SAFE-T 4LIFE medical care team"
                className="w-full h-[320px] object-cover"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Stethoscope, title: 'Licensed Care', text: 'Verified provider profiles' },
                { icon: Video, title: 'Live Guidance', text: 'Consultation support before travel' },
                { icon: BadgeCheck, title: 'Trusted Network', text: 'Quality-focused specialists' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border bg-secondary/40 p-5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}