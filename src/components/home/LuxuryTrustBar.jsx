import React from 'react';
import { Users, Globe, Shield } from 'lucide-react';

const GOLD = '#D4AF37';

export default function LuxuryTrustBar() {
  return (
    <section
      style={{
        background: 'linear-gradient(90deg, #07111F 0%, #080E1A 50%, #07111F 100%)',
        borderTop: `1px solid rgba(212,175,55,0.18)`,
        borderBottom: `1px solid rgba(212,175,55,0.18)`,
        boxShadow: '0 0 60px rgba(212,175,55,0.04) inset',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-6 flex flex-col lg:flex-row items-center gap-6 lg:gap-0">

        {/* Left label */}
        <div className="shrink-0 lg:pr-10 lg:border-r border-white/[0.08] text-center lg:text-left">
          <p className="text-[10px] font-semibold tracking-[0.32em] uppercase text-white/45">
            Trusted By Patients Worldwide
          </p>
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-around gap-8 lg:gap-0 flex-1 lg:px-10">

          {/* Stars */}
          <div className="flex flex-col items-center lg:items-start gap-0.5">
            <p className="text-sm" style={{ color: GOLD }}>★★★★★ <span className="text-white font-bold text-lg ml-1">4.9/5</span></p>
            <p className="text-[11px] text-white/50">From 1,200+ reviews</p>
          </div>

          <div className="hidden lg:block w-px h-8 bg-white/[0.10]" />

          <div className="flex flex-col items-center lg:items-start gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" style={{ color: GOLD, opacity: 0.6 }} />
              <p className="text-white font-semibold text-xl">1,200+</p>
            </div>
            <p className="text-[11px] text-white/50">Care journeys completed</p>
          </div>

          <div className="hidden lg:block w-px h-8 bg-white/[0.10]" />

          <div className="flex flex-col items-center lg:items-start gap-0.5">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" style={{ color: GOLD, opacity: 0.6 }} />
              <p className="text-white font-semibold text-xl">35+</p>
            </div>
            <p className="text-[11px] text-white/50">Countries served</p>
          </div>

          <div className="hidden lg:block w-px h-8 bg-white/[0.10]" />

          <div className="flex flex-col items-center lg:items-start gap-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" style={{ color: GOLD, opacity: 0.6 }} />
              <p className="text-white font-semibold text-xl">98%</p>
            </div>
            <p className="text-[11px] text-white/50">Patient satisfaction</p>
          </div>
        </div>

        {/* Logos */}
        <div className="shrink-0 lg:pl-10 lg:border-l border-white/[0.08] flex items-center gap-6">
          <span className="text-white/30 text-sm font-medium hover:text-white/50 transition-colors">Google</span>
          <span className="text-white/30 text-sm font-medium hover:text-white/50 transition-colors">★ Trustpilot</span>
          <span className="text-white/30 text-sm font-medium hover:text-white/50 transition-colors">realself.</span>
        </div>

      </div>
    </section>
  );
}