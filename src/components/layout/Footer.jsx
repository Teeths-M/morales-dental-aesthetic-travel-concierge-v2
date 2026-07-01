import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, Heart, Headphones, CheckCircle } from 'lucide-react';
import LanguageSwitcher from '@/components/ui-system/LanguageSwitcher';
import { ROUTES } from '@/lib/constants';

const trustItems = [
  { icon: Shield,      label: 'EVN-iQ400™ · 195 Countries' },
  { icon: Award,       label: 'MedGuard™ · Behavioural AI' },
  { icon: Heart,       label: 'Safe-T4life™ · 5-Tier Escalation' },
  { icon: Headphones,  label: '24/7 Concierge · Always On' },
  { icon: CheckCircle, label: 'Satellite SOS · Zero Signal Ready' },
];

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      {/* Trust Bar */}
      <div className="border-b border-background/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-background/70">
                <Icon className="w-4 h-4 text-accent" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/morales-m-mark.png"
                alt="Morales"
                className="w-9 h-9 object-contain"
              />
              <div>
                <p className="font-display text-base text-background">MORALES</p>
                <p className="text-[9px] tracking-[0.15em] text-background/50 uppercase">Medical Travel Safety</p>
              </div>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              The world's first complete medical travel protection stack — environmental intelligence, behavioural AI, and GPS handshakes protecting patients across 195 countries.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">Services</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Find Doctors',  path: '/providers' },
                { label: 'Procedures',    path: '/procedures' },
                { label: 'Visa Assist',   path: '/visa-assist' },
                { label: 'Travel Safety', path: '/safet' },
              ].map(({ label, path }) => (
                <Link key={path} to={path} className="block text-sm text-background/50 hover:text-background/80 transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">Company</h4>
            <div className="space-y-2.5">
              {[
                { label: 'About Us', path: '/about' },
                { label: 'How It Works', path: '/how-it-works' },
              ].map(l => (
                <Link key={l.path} to={l.path} className="block text-sm text-background/50 hover:text-background/80 transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-background/90">Contact</h4>
            <div className="space-y-2.5">
              <a href="mailto:info@moralesconcierge.com" className="block text-sm text-background/50 hover:text-background/80 transition-colors">info@moralesconcierge.com</a>
              <a href="tel:+18005550199" className="block text-sm text-background/50 hover:text-background/80 transition-colors">+1 (800) 555-0199</a>
              <p className="text-sm text-background/50">Mon–Fri 8am–8pm EST</p>
            </div>
          </div>
        </div>

        {/* Leadership badges */}
        <div className="border-t border-background/10 mt-12 pt-6 mb-4 flex flex-wrap justify-center gap-3">
          {[
            '🌍 195 Countries Covered',
            '🛡️ EVN-iQ400™ Environmental Intelligence',
            '🧠 MedGuard™ Behavioural AI',
            '✈️ Satellite SOS — Zero Signal Ready',
            '🏆 The Golden Standard for Medical Travel',
          ].map(b => (
            <span key={b} className="text-[10px] font-semibold px-3 py-1.5 rounded-full border text-background/50 border-background/15">
              {b}
            </span>
          ))}
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40">© 2026 Morales Medical Travel Safety. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex gap-6 text-xs text-background/40">
              <Link to={ROUTES.PRIVACY} className="hover:text-background/60 transition-colors">Privacy Policy</Link>
              <Link to={ROUTES.TERMS} className="hover:text-background/60 transition-colors">Terms of Service</Link>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}