import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Instagram, Twitter, Linkedin } from 'lucide-react';

export default function LightFooter() {
  return (
    <footer className="bg-[#1a2e3b] text-white px-6 py-14">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <p className="font-serif font-bold text-2xl text-white mb-3">MORALES</p>
            <p className="text-[13px] text-white/50 leading-relaxed max-w-[220px]">
              Dental & aesthetic travel concierge. World-class care, personalized for you.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#2a7d8c] mb-4">Quick Links</p>
            <div className="flex flex-col gap-2.5">
              {['Treatments', 'How It Works', 'Safety', 'About Us', 'Partner With Us'].map(l => (
                <a key={l} href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#2a7d8c] mb-4">Contact</p>
            <div className="flex flex-col gap-3">
              <a href="mailto:hello@moralescare.com" className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                hello@moralescare.com
              </a>
              <a href="tel:+18001234567" className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                +1 (800) 123-4567
              </a>
              <div className="flex items-center gap-3 mt-2">
                {[Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-[#2a7d8c]/40 transition-colors">
                    <Icon className="w-4 h-4 text-white/60" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/30">© {new Date().getFullYear()} Morales. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}