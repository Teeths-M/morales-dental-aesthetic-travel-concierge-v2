import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, Award } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function About() {
  const { t } = useTranslation();

  const values = [
    { icon: Shield, title: t('about.value_safety_title'),    desc: t('about.value_safety_desc') },
    { icon: Users,  title: t('about.value_patient_title'),   desc: t('about.value_patient_desc') },
    { icon: Globe,  title: t('about.value_access_title'),    desc: t('about.value_access_desc') },
    { icon: Award,  title: t('about.value_excellence_title'), desc: t('about.value_excellence_desc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060B16] via-[#0A101D] to-[#060B16]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] mb-5" style={{ color: '#D4AF37' }}>
            {t('about.eyebrow')}
          </p>
          <h1 className="font-display text-4xl lg:text-5xl text-white mb-8" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {t('about.headline')}
          </h1>
          <p className="text-[17px] text-white/60 max-w-2xl mx-auto leading-[1.8]" style={{ fontWeight: 300 }}>
            {t('about.intro')}
          </p>
        </motion.div>

        <div className="relative rounded-2xl overflow-hidden aspect-video mb-20" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <img loading="lazy" decoding="async"
            src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ac09f3ff8_generated_81131568.png"
            alt="Modern architecture detail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060B16] via-[#060B16]/40 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="font-display text-3xl lg:text-4xl text-white" style={{ letterSpacing: '-0.02em', textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}>
              {t('about.quote')}
            </p>
            <p className="text-[13px] text-white/60 mt-2 tracking-[0.15em] uppercase">
              {t('about.quote_caption')}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {values.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="bg-[#0A101D]/60 border border-white/[0.06] rounded-2xl p-7 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
            >
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl text-white mb-3" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
              <p className="text-[15px] text-white/50 leading-[1.8]" style={{ fontWeight: 300 }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}