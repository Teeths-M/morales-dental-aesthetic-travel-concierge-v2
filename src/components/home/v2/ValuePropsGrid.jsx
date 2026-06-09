import React from 'react';
import { BarChart2, Plane, ShieldCheck, Tag, HeartHandshake, Home, Stethoscope, Globe } from 'lucide-react';

const cards = [
  { icon: BarChart2, title: 'Risk Intelligence', text: 'Data-driven risk assessment' },
  { icon: Plane,     title: 'Travel Coordination', text: 'Seamless logistics' },
  { icon: ShieldCheck, title: 'Verified Specialists', text: 'Rigorous vetting' },
  { icon: Tag,       title: 'Transparent Pricing', text: 'No hidden fees' },
  { icon: HeartHandshake, title: 'End-to-End Concierge', text: 'We handle everything' },
  { icon: Home,      title: 'Recovery Support', text: 'Until you\'re home' },
  { icon: Stethoscope, title: 'Recovery Care', text: 'Personalized aftercare' },
  { icon: Globe,     title: 'World-class experts', text: 'Global leaders in care' },
];

export default function ValuePropsGrid() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[#2a7d8c] text-center mb-3">Our Services</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1a2e3b] text-center mb-12">What We Provide</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {cards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group relative p-6 rounded-2xl border border-gray-100 bg-[#f8f9fb] hover:bg-white hover:shadow-lg hover:border-[#2a7d8c]/20 transition-all duration-250 cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2a7d8c]/10 flex items-center justify-center mb-4 group-hover:bg-[#2a7d8c]/20 transition-colors duration-200">
                <Icon className="w-5 h-5 text-[#2a7d8c]" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-[#1a2e3b] text-[14px] mb-1.5">{title}</h3>
              <p className="text-[12.5px] text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="text-center text-[13px] text-gray-400 font-medium">
          No hidden fees &nbsp;•&nbsp; We handle everything &nbsp;•&nbsp; Until you're home
        </div>
      </div>
    </section>
  );
}