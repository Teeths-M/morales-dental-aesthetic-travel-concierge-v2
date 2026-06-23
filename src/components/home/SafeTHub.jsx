import React, { useState, useEffect, useRef } from 'react';
import AssessmentFlow from './AssessmentFlow';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Brain, UserCheck, HeartPulse, Stethoscope, Globe, ArrowRight, CheckCircle, Activity, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PILLARS = [
  {
    icon: Brain,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    accent: 'text-blue-600',
    title: 'AI Risk Detection',
    subtitle: 'Before a single flight is booked',
    description: 'Our proprietary SAFE-T algorithm analyzes over 40 patient health markers — from medication interactions to anesthesia history — producing a risk score that guides every clinical decision.',
    protocols: [
      'Medical history deep scan',
      'Medication & allergy cross-check',
      'Mental & physical wellness flags',
      'Anesthesia risk profiling',
    ],
  },
  {
    icon: UserCheck,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    accent: 'text-emerald-600',
    title: 'Verified Specialist Network',
    subtitle: 'Every doctor. Every credential.',
    description: 'We never assign a doctor without verification. Each specialist passes AI license analysis, credential cross-referencing, and a manual admin review before being cleared to receive cases.',
    protocols: [
      'License & board certification verified',
      'AI-powered document analysis',
      'Country-specific compliance check',
      'Ongoing performance monitoring',
    ],
  },
  {
    icon: HeartPulse,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    accent: 'text-rose-600',
    title: 'End-to-End Patient Support',
    subtitle: 'From consultation to full recovery',
    description: 'Safety doesn\'t end after the procedure. Our care coordination covers pre-op preparation, cultural care planning, post-op recovery monitoring, and a 7-day recovery protocol.',
    protocols: [
      'Pre-op preparation protocol',
      'Culturally adapted care plans',
      'Real-time recovery monitoring',
      '7-day post-op wellness check',
    ],
  },
];

const STEPS = [
  { num: '01', icon: Activity, label: 'Health Intake', detail: 'Detailed medical screening' },
  { num: '02', icon: Brain, label: 'AI Risk Scan', detail: 'SAFE-T algorithm assessment' },
  { num: '03', icon: Shield, label: 'Safety Clearance', detail: 'Cleared, flagged, or blocked' },
  { num: '04', icon: UserCheck, label: 'Doctor Matched', detail: 'Verified specialist assigned' },
  { num: '05', icon: Globe, label: 'Travel Secured', detail: 'Full logistics coordinated' },
  { num: '06', icon: HeartPulse, label: 'Care & Recovery', detail: '7-day post-op monitoring' },
];

export default function SafeTHub() {
  const [language, setLanguage] = useState('en');
  const [activePillar, setActivePillar] = useState(0);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const pillar = PILLARS[activePillar];
  const PillarIcon = pillar.icon;

  return (
    <section className="py-20 lg:py-32 bg-foreground overflow-hidden relative">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-[0.2em]">Safety Framework</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-4">
            The <span className="text-accent italic">SAFE-T 4LIFE™</span><br />
            Protocol
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Medical travel is only safe when every detail is verified. Our multi-layered system protects patients at every stage — before, during, and after care.
          </p>
        </motion.div>

        {/* Pillar Selector */}
        <div className="flex flex-col lg:flex-row gap-8 mb-16">
          {/* Tabs */}
          <div className="lg:w-80 flex-shrink-0 space-y-3">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              const isActive = activePillar === i;
              return (
                <motion.button
                  key={p.title}
                  onClick={() => setActivePillar(i)}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-white/10 border-white/30 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${p.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/70'}`}>{p.title}</p>
                      <p className="text-xs text-white/40">{p.subtitle}</p>
                    </div>
                    {isActive && <ArrowRight className="w-4 h-4 text-accent ml-auto" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Active Pillar Detail */}
          <motion.div
            key={activePillar}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex-1 bg-white/5 border border-white/15 rounded-3xl p-8 lg:p-10"
          >
            <div className={`inline-flex items-center gap-2 ${pillar.bg} ${pillar.border} border rounded-full px-3 py-1 mb-6`}>
              <PillarIcon className={`w-3.5 h-3.5 ${pillar.accent}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${pillar.accent}`}>{pillar.title}</span>
            </div>

            <h3 className="font-display text-3xl text-white mb-3">{pillar.subtitle}</h3>
            <p className="text-white/60 text-base leading-relaxed mb-8">{pillar.description}</p>

            <div className="grid sm:grid-cols-2 gap-3">
              {pillar.protocols.map((protocol) => (
                <div key={protocol} className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${pillar.accent}`} />
                  <span className="text-sm text-white/80 font-medium">{protocol}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Process Timeline */}
        <AssessmentFlow />

        {/* Trust Bar + CTA */}
        <motion.div
          className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-white/5 border border-white/15 rounded-3xl p-8 lg:p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-wrap justify-center lg:justify-start gap-8">
            {[
              { label: 'Patient Cases', value: '3,200+' },
              { label: 'Verified Doctors', value: '180+' },
              { label: 'Countries Served', value: '28' },
              { label: 'Safety Score', value: '99.1%' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center lg:text-left">
                <p className="text-3xl font-display font-semibold text-white">{value}</p>
                <p className="text-xs text-white/40 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link to="/consultation">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12 shadow-xl gap-2 w-full sm:w-auto">
                Start Your Consultation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/safe-t">
              <Button size="lg" variant="outline" className="h-12 px-8 font-semibold border-white/30 bg-white/10 text-white hover:bg-white hover:text-foreground gap-2 w-full sm:w-auto">
                <Lock className="w-4 h-4" />
                Explore SAFE-T System
              </Button>
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}