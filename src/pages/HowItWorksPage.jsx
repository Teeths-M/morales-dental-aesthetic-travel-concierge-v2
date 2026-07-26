// @ts-nocheck — pre-existing PageHeroBand prop gaps
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, ClipboardList, CreditCard, Plane, Stethoscope, HeartPulse, CalendarCheck, ArrowRight } from 'lucide-react';
import PageHeroBand from '@/components/layout/PageHeroBand';
import { useTranslation } from '@/i18n';

export default function HowItWorksPage() {
  const { t } = useTranslation();

  const steps = [
    { icon: MessageSquare,  num: 1, title: t('how_it_works.step1_title'), desc: t('how_it_works.step1_desc'), color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
    { icon: ClipboardList,  num: 2, title: t('how_it_works.step2_title'), desc: t('how_it_works.step2_desc'), color: 'bg-[#00E5FF]/10 text-[#00E5FF]' },
    { icon: CreditCard,     num: 3, title: t('how_it_works.step3_title'), desc: t('how_it_works.step3_desc'), color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
    { icon: Plane,          num: 4, title: t('how_it_works.step4_title'), desc: t('how_it_works.step4_desc'), color: 'bg-[#00E5FF]/10 text-[#00E5FF]' },
    { icon: Stethoscope,    num: 5, title: t('how_it_works.step5_title'), desc: t('how_it_works.step5_desc'), color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
    { icon: HeartPulse,     num: 6, title: t('how_it_works.step6_title'), desc: t('how_it_works.step6_desc'), color: 'bg-[#00E5FF]/10 text-[#00E5FF]' },
    { icon: CalendarCheck,  num: 7, title: t('how_it_works.step7_title'), desc: t('how_it_works.step7_desc'), color: 'bg-[#D4AF37]/10 text-[#D4AF37]' },
  ];

  return (
    <div className="min-h-screen bg-[#060B16]">
      <PageHeroBand />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-[0.32em] mb-4">
            {t('how_it_works.eyebrow')}
          </p>
          <h1 className="font-display text-4xl lg:text-5xl text-white mb-6" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {t('nav.how_it_works')}
          </h1>
          <p className="text-[17px] text-white/55 max-w-xl mx-auto leading-[1.75]" style={{ fontWeight: 300 }}>
            {t('how_it_works.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map(({ icon: Icon, num, title, desc, color }, i) => (
            <motion.div
              key={title}
              className="flex gap-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="relative flex flex-col items-center">
                <span className="absolute -top-4 -left-3 text-[72px] font-semibold leading-none text-white/[0.04] select-none pointer-events-none">{num}</span>
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0 relative z-10`}>
                  <Icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-white/[0.08] mt-2 relative z-10" />}
              </div>
              <div className="pb-8">
                <div className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-[0.32em] mb-2">
                  {t('how_it_works.step_label')} {num}
                </div>
                <h3 className="font-display text-xl text-white mb-2" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
                <p className="text-[15px] text-white/55 leading-[1.7]" style={{ fontWeight: 300 }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16 bg-[#0C1A1D] border border-white/[0.08] rounded-2xl p-8 lg:p-12">
          <p className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-[0.32em] mb-4">
            {t('how_it_works.cta_eyebrow')}
          </p>
          <h2 className="font-display text-2xl lg:text-3xl text-white mb-3" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {t('how_it_works.cta_heading')}
          </h2>
          <p className="text-white/55 text-[15px] mb-8 max-w-sm mx-auto leading-relaxed" style={{ fontWeight: 300 }}>
            {t('how_it_works.cta_sub')}
          </p>
          <Link to="/intake">
            <Button size="lg" className="bg-gradient-to-r from-[#D4AF37] to-[#E8C85C] text-[#060B16] font-semibold px-10 hover:opacity-90 h-12 rounded-xl text-[15px]">
              {t('home.cta_medical')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-white/30 text-[11px] mt-5 flex items-center justify-center gap-3 flex-wrap">
            <span>{t('how_it_works.badge_secure')}</span>
            <span>·</span>
            <span>{t('how_it_works.badge_obligation')}</span>
            <span>·</span>
            <span>{t('how_it_works.badge_response')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}