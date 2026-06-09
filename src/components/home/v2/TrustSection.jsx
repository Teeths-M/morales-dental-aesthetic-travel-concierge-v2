import React from 'react';
import { Users, Globe, Shield, Star } from 'lucide-react';

const stats = [
  { icon: Star,   label: 'From 1,200+ reviews',          value: '★★★★★ 4.9/5' },
  { icon: Users,  label: 'Care journeys completed',       value: '1,200+' },
  { icon: Globe,  label: 'Countries served',              value: '35+' },
  { icon: Shield, label: 'Patient satisfaction',          value: '98%' },
];

export default function TrustSection() {
  return (
    <section className="bg-[#1a2e3b] py-20 px-6 text-white">
      <div className="max-w-5xl mx-auto text-center">
        {/* Title */}
        <p className="text-[11px] font-bold tracking-[0.35em] uppercase text-[#2a7d8c] mb-4">
          TRUSTED BY PATIENTS WORLDWIDE
        </p>

        {/* Star rating */}
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-yellow-400 text-3xl tracking-wider">★★★★★</span>
          <span className="text-4xl font-bold font-serif text-white">4.9</span>
          <span className="text-2xl text-white/50">/5</span>
        </div>

        {/* Trustpilot */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="flex items-center gap-1.5 bg-[#00b67a] text-white text-[12px] font-bold px-3 py-1 rounded">
            <Star className="w-3.5 h-3.5 fill-white" />
            Trustpilot
          </div>
          <span className="text-white/40 text-[12px]">Verified Reviews</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/[0.05] rounded-2xl p-6 border border-white/[0.08] hover:bg-white/[0.08] transition-colors duration-200">
              <Icon className="w-5 h-5 text-[#2a7d8c] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-2xl font-bold font-serif text-white mb-1">{value}</p>
              <p className="text-[12px] text-white/50">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-[13px] italic text-white/30 font-serif">yourself.</p>
      </div>
    </section>
  );
}