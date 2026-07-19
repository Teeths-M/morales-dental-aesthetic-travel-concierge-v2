import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, Award } from 'lucide-react';

const getValues = (language) => [
  { icon: Shield, title: language === 'es' ? 'Seguridad Primero' : language === 'fr' ? 'Sécurité d\'Abord' : 'Safety First', desc: language === 'es' ? 'Cada decisión que tomamos pone tu seguridad y bienestar por encima de todo.' : language === 'fr' ? 'Chaque décision que nous prenons met votre sécurité et votre bien-être avant tout.' : 'Every decision we make puts your safety and wellbeing above all else.' },
  { icon: Users, title: language === 'es' ? 'Centrado en el Paciente' : language === 'fr' ? 'Centré sur le Patient' : 'Patient-Centered', desc: language === 'es' ? 'Tus objetivos, tu cronograma, tu comodidad — todo está construido alrededor de ti.' : language === 'fr' ? 'Vos objectifs, votre calendrier, votre confort — tout est construit autour de vous.' : 'Your goals, your timeline, your comfort — everything is built around you.' },
  { icon: Globe, title: language === 'es' ? 'Acceso de Clase Mundial' : language === 'fr' ? 'Accès de Classe Mondiale' : 'World-Class Access', desc: language === 'es' ? 'Te conectamos con los mejores especialistas e instalaciones a nivel mundial.' : language === 'fr' ? 'Nous vous connectons avec les meilleurs spécialistes et installations au monde.' : 'We connect you with the finest specialists and facilities globally.' },
  { icon: Award, title: language === 'es' ? 'Excelencia Comprobada' : language === 'fr' ? 'Excellence Prouvée' : 'Proven Excellence', desc: language === 'es' ? 'Un historial de más de 500 transformaciones exitosas y satisfacción del 98%.' : language === 'fr' ? 'Un historique de plus de 500 transformations réussies et 98% de satisfaction.' : 'A track record of 500+ successful transformations and 98% satisfaction.' },
];

export default function About() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const values = getValues(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060B16] via-[#0A101D] to-[#060B16]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] mb-5" style={{ color: '#D4AF37' }}>
            {language === 'es' ? 'Acerca de Nosotros' : language === 'fr' ? 'À Propos de Nous' : 'About Us'}
          </p>
          <h1 className="font-display text-4xl lg:text-5xl text-white mb-8" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {language === 'es' ? 'Tu Seguridad, Nuestra Misión' : language === 'fr' ? 'Votre Sécurité, Notre Mission' : 'Your Safety, Our Mission'}
          </h1>
          <p className="text-[17px] text-white/60 max-w-2xl mx-auto leading-[1.8]" style={{ fontWeight: 300 }}>
            {language === 'es' ? 'Morales Medical Travel Safety fue fundada en un principio simple: todos merecen acceso a atención médica de clase mundial en el extranjero, entregada con seguridad inquebrantable y atención personalizada.' : language === 'fr' ? 'Morales Medical Travel Safety a été fondée sur un principe simple : tout le monde mérite l\'accès aux soins médicaux de classe mondiale à l\'étranger, livrés avec une sécurité inébranlable et une attention personnalisée.' : 'Morales Medical Travel Safety was founded on a simple principle: everyone deserves access to world-class medical care abroad, delivered with uncompromising safety and personalized attention.'}
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
              {language === 'es' ? '"La Precisión del Cuidado"' : language === 'fr' ? '"La Précision des Soins"' : '"The Precision of Care"'}
            </p>
            <p className="text-[13px] text-white/60 mt-2 tracking-[0.15em] uppercase">
              {language === 'es' ? 'Nuestra filosofía guía desde el primer día' : language === 'fr' ? 'Notre philosophie directrice depuis le premier jour' : 'Our guiding philosophy since day one'}
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