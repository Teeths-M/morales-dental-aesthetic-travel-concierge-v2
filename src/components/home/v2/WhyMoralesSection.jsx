import React from 'react';
import { Users, Shield, Activity, Smile } from 'lucide-react';

const features = [
  { icon: Users,    title: 'Human Concierge',        desc: 'Real people guiding you. Every step of the way.' },
  { icon: Shield,   title: 'Safe Connections',        desc: 'Only vetted specialists and accredited facilities.' },
  { icon: Activity, title: 'Better Outcomes',         desc: 'Personalized care plans for optimal results.' },
  { icon: Smile,    title: 'Stress-Free Experience',  desc: 'You focus on you. We manage the details.' },
];

export default function WhyMoralesSection() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#2a7d8c] mb-4">WHY PATIENTS CHOOSE MORALES</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1a2e3b] leading-tight">
              More Than Travel.<br />
              It's <span className="italic text-[#2a7d8c]">Peace of Mind.</span>
            </h2>
            <div className="w-10 h-[3px] bg-[#2a7d8c] mt-8" />
          </div>

          {/* Right grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-[#2a7d8c]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#2a7d8c]/20 transition-colors duration-200">
                  <Icon className="w-5 h-5 text-[#2a7d8c]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a2e3b] text-[14px] mb-1.5">{title}</h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}