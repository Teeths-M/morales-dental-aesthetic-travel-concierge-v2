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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background pt-16 lg:pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
            {language === 'es' ? 'Acerca de Nosotros' : language === 'fr' ? 'À Propos de Nous' : 'About Us'}
          </p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-6">
            {language === 'es' ? 'Tu Seguridad, Nuestra Misión' : language === 'fr' ? 'Votre Sécurité, Notre Mission' : 'Your Safety, Our Mission'}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {language === 'es' ? 'Morales Dental & Aesthetic Travel Concierge fue fundada en un principio simple: todos merecen acceso a cuidado dental y estético de clase mundial, entregado con seguridad inquebrantable y atención personalizada.' : language === 'fr' ? 'Morales Dental & Aesthetic Travel Concierge a été fondée sur un principe simple : tout le monde mérite l\'accès aux soins dentaires et esthétiques de classe mondiale, livrés avec une sécurité inébranlable et une attention personnalisée.' : 'Morales Dental & Aesthetic Travel Concierge was founded on a simple principle: everyone deserves access to world-class dental and aesthetic care, delivered with uncompromising safety and personalized attention.'}
          </p>
        </motion.div>

        <div className="relative rounded-2xl overflow-hidden aspect-video mb-16">
          <img
            src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/ac09f3ff8_generated_81131568.png"
            alt="Modern architecture detail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <p className="font-display text-2xl lg:text-3xl text-white">
              {language === 'es' ? '"La Precisión del Cuidado"' : language === 'fr' ? '"La Précision des Soins"' : '"The Precision of Care"'}
            </p>
            <p className="text-sm text-white/70 mt-1">
              {language === 'es' ? 'Nuestra filosofía guía desde el primer día' : language === 'fr' ? 'Notre philosophie directrice depuis le premier jour' : 'Our guiding philosophy since day one'}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {values.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="bg-card border border-border rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}