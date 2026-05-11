import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const procedures = [
  { title: 'Dental Implants', desc: 'Permanent tooth replacement with titanium implants that look and feel natural. Our specialists use the latest guided surgery techniques.', tag: 'Most Popular' },
  { title: 'Smile Makeover', desc: 'Complete smile transformation combining veneers, whitening, and alignment for a stunning, natural result.', tag: 'Premium' },
  { title: 'All-on-4 / All-on-6', desc: 'Full arch restoration with just 4-6 implants. Walk out with a brand new smile in a single visit.', tag: 'Full Arch' },
  { title: 'Porcelain Veneers', desc: 'Ultra-thin porcelain shells bonded to your teeth for a flawless, Hollywood-worthy smile.', tag: 'Aesthetic' },
  { title: 'Bone Regeneration', desc: 'Advanced bone grafting techniques to rebuild jawbone density, preparing you for successful implant placement.', tag: 'Surgical' },
  { title: 'Cosmetic Dentistry', desc: 'From teeth whitening to composite bonding, enhance your smile with minimally invasive cosmetic procedures.', tag: 'Non-Invasive' },
];

export default function Procedures() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Our Services</p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">Procedures</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            World-class dental and aesthetic treatments delivered by verified specialists.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {procedures.map(({ title, desc, tag }, i) => (
            <motion.div
              key={title}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="inline-block bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4">
                {tag}
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{desc}</p>
              <Link to="/booking">
                <Button variant="ghost" className="text-accent hover:text-accent/80 p-0 h-auto text-sm font-semibold group-hover:translate-x-1 transition-transform">
                  Book Consultation <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}