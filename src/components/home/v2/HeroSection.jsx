import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, Plane } from 'lucide-react';

const badges = ['Verified Specialists', 'Premium Medical Travel.', 'Verified. Safe. Seamless.'];

const iconBoxes = [
  { icon: '🕐', title: '24/7 Support', text: 'Always available when you need us.' },
  { icon: '✓', title: 'Verified Specialists', text: 'Only top-tier, accredited professionals.' },
  { icon: '🏥', title: 'Safe Facilities', text: 'Rigorous safety standards at every location.' },
];

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-[#f8f9fb] to-[#eef2f7] pt-28 pb-20 px-6 overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,#1a3a4a_1px,transparent_0)] bg-[size:32px_32px]" />

      {/* SAFE-T badge top-right */}
      <div className="absolute top-32 right-6 lg:right-12 flex flex-col items-center gap-1 z-10">
        <div className="bg-[#1a3a4a] text-white px-4 py-2 rounded-xl text-center shadow-lg">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase">SAFE-T4LIFE™</p>
          <p className="text-[9px] text-white/60 tracking-widest uppercase mt-0.5">Safety Intelligence Engine</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Main heading */}
        <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[#2a7d8c] mb-4">
          World-Class Care. Personalized For You.
        </p>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a2e3b] leading-tight mb-6 max-w-3xl">
          DENTAL & AESTHETIC TRAVEL CONCIERGE
        </h1>
        <p className="text-lg md:text-xl font-semibold text-[#2a7d8c] tracking-widest uppercase mb-8">
          WORLD-CLASS CARE. PERSONALIZED FOR YOU.
        </p>

        {/* Inline badges */}
        <div className="flex flex-wrap gap-3 mb-10">
          {badges.map(b => (
            <span key={b} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-[#2a7d8c]/20 text-[13px] font-medium text-[#1a3a4a] shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2a7d8c]" />
              {b}
            </span>
          ))}
        </div>

        {/* Icon boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {iconBoxes.map(({ icon, title, text }) => (
            <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-[#1a2e3b] text-[15px] mb-1">{title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-[15px] text-gray-600 leading-relaxed mb-8 max-w-2xl">
          Morales coordinates every step of your dental or aesthetic care journey – from consultation to recovery. You focus on yourself. We handle the rest.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4">
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] bg-[#1a3a4a] text-white hover:bg-[#2a7d8c] transition-colors duration-200 shadow-lg"
          >
            Book Your Consultation →
          </Link>
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[14px] text-[#1a3a4a] border-2 border-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white transition-all duration-200"
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px]">▶</span>
            How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}