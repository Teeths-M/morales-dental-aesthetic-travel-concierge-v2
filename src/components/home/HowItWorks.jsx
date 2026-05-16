import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ClipboardList, CreditCard, Plane, Stethoscope, HeartPulse, CalendarCheck } from 'lucide-react';

const getSteps = (language) => [
  { icon: MessageSquare, num: '1', title: language === 'es' ? 'Consulta' : language === 'fr' ? 'Consultation' : 'Consultation', desc: language === 'es' ? 'Cuéntanos tus objetivos' : language === 'fr' ? 'Dites-nous vos objectifs' : 'Tell us your goals' },
  { icon: ClipboardList, num: '2', title: language === 'es' ? 'Plan y Presupuesto' : language === 'fr' ? 'Plan et Devis' : 'Plan & Quote', desc: language === 'es' ? 'Personalizado para ti' : language === 'fr' ? 'Personnalisé pour vous' : 'Personalized for you' },
  { icon: CreditCard, num: '3', title: language === 'es' ? 'Reservar y Pagar' : language === 'fr' ? 'Réserver et Payer' : 'Book & Pay', desc: language === 'es' ? 'Asegura tu fecha' : language === 'fr' ? 'Sécurisez votre date' : 'Secure your date' },
  { icon: Plane, num: '4', title: language === 'es' ? 'Viaje y Alojamiento' : language === 'fr' ? 'Voyage et Séjour' : 'Travel & Stay', desc: language === 'es' ? 'Nos encargamos de ti' : language === 'fr' ? 'Nous prenons soin de vous' : 'We take care of you' },
  { icon: Stethoscope, num: '5', title: language === 'es' ? 'Procedimiento' : language === 'fr' ? 'Procédure' : 'Procedure', desc: language === 'es' ? 'Cuidado experto' : language === 'fr' ? 'Soins expertes' : 'Expert care' },
  { icon: HeartPulse, num: '6', title: language === 'es' ? 'Recuperación' : language === 'fr' ? 'Récupération' : 'Recovery', desc: language === 'es' ? 'Comodidad y apoyo' : language === 'fr' ? 'Confort et soutien' : 'Comfort & support' },
  { icon: CalendarCheck, num: '7', title: language === 'es' ? 'Atención Posterior' : language === 'fr' ? 'Suivi' : 'Aftercare', desc: language === 'es' ? 'Hacemos un seguimiento' : language === 'fr' ? 'Nous assurons le suivi' : 'We follow up' },
];

export default function HowItWorks() {
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

  const steps = getSteps(language);

  return (
    <section className="py-16 lg:py-24 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
            {language === 'es' ? 'Tu Viaje' : language === 'fr' ? 'Votre Voyage' : 'Your Journey'}
          </p>
          <h2 className="font-display text-3xl lg:text-4xl text-foreground">
            {language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works'}
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-border" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-6 lg:gap-4">
            {steps.map(({ icon: Icon, num, title, desc }, i) => (
              <motion.div
                key={title}
                className="text-center relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="w-16 h-16 rounded-full bg-card border-2 border-border mx-auto flex items-center justify-center relative z-10 mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="inline-block bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                  {language === 'es' ? 'Paso' : language === 'fr' ? 'Étape' : 'Step'} {num}
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}