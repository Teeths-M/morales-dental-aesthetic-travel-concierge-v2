import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, Plane, Heart, ArrowRight } from 'lucide-react';

const steps = [
  { number: '01', icon: MessageCircle, title: 'Consultation',        desc: 'Share your goals. We listen and guide you with expert advice.' },
  { number: '02', icon: Users,         title: 'Specialist Matching', desc: 'We connect you with carefully vetted specialists.' },
  { number: '03', icon: Plane,         title: 'Travel & Stay',       desc: 'Flights, accommodation and transport. All arranged for you.' },
  { number: '04', icon: Heart,         title: 'Recovery & Return',   desc: "Personalized recovery support until you're safely back home." },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[#f8f9fb] py-20 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#2a7d8c] mb-3">HOW IT WORKS</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1a2e3b] mb-12">Your Journey, Simplified</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {steps.map(({ number, icon: Icon, title, desc }, i) => (
            <div key={title} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 text-left group">
              <p className="text-[11px] font-bold tracking-widest text-[#2a7d8c] mb-4">{number}</p>
              <Icon className="w-6 h-6 text-[#1a3a4a] mb-4 group-hover:text-[#2a7d8c] transition-colors duration-200" strokeWidth={1.5} />
              <h3 className="font-semibold text-[#1a2e3b] text-[14px] mb-2">{title}</h3>
              <p className="text-[12.5px] text-gray-500 leading-relaxed">{desc}</p>

              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 items-center justify-center shadow-sm">
                  <ArrowRight className="w-3 h-3 text-[#2a7d8c]" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Link
          to="/how-it-works"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-[14px] border-2 border-[#1a3a4a] text-[#1a3a4a] hover:bg-[#1a3a4a] hover:text-white transition-all duration-200"
        >
          Explore the Process
        </Link>
      </div>
    </section>
  );
}