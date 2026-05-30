import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Brain, Users, Lock, Headphones } from 'lucide-react';

const getReasons = (language) => [
  { 
    icon: ShieldCheck, 
    title: language === 'es' ? 'Especialistas de Élite Verificados' : language === 'fr' ? 'Spécialistes d\'Élite Vérifiés' : 'Verified Elite Specialists',
    desc: language === 'es' ? 'Cada proveedor es rigurosamente verificado con credenciales verificadas y años de experiencia probada.' : language === 'fr' ? 'Chaque prestataire est rigoureusement contrôlé avec des références vérifiées et des années d\'expérience confirmée.' : 'Every provider is rigorously vetted with verified credentials and years of proven expertise.'
  },
  { 
    icon: Brain, 
    title: language === 'es' ? 'Planificación Segura Asistida por IA' : language === 'fr' ? 'Planification Sécurisée Assistée par IA' : 'AI-Assisted Safe Planning',
    desc: language === 'es' ? 'Nuestro sistema SAFE-T 4LIFE™ analiza tu perfil para garantizar el plan de tratamiento más seguro posible.' : language === 'fr' ? 'Notre système SAFE-T 4LIFE™ analyse votre profil pour assurer le plan de traitement le plus sûr possible.' : 'Our SAFE-T 4LIFE™ system analyzes your profile to ensure the safest possible treatment plan.'
  },
  { 
    icon: Users, 
    title: language === 'es' ? 'Cuidado Concierge Todo Incluido' : language === 'fr' ? 'Soins Concierge Tout Compris' : 'All-Inclusive Concierge Care',
    desc: language === 'es' ? 'Desde la recogida del aeropuerto hasta la reserva del hotel, cada detalle de tu viaje se maneja con cuidado.' : language === 'fr' ? 'De la prise en charge à l\'aéroport à la réservation d\'hôtel, chaque détail de votre voyage est géré avec soin.' : 'From airport pickup to hotel booking, every detail of your journey is handled with care.'
  },
  { 
    icon: Lock, 
    title: language === 'es' ? 'Comodidad, Seguridad y Privacidad' : language === 'fr' ? 'Confort, Sécurité et Confidentialité' : 'Comfort, Safety & Privacy',
    desc: language === 'es' ? 'Tus datos médicos están encriptados y tu privacidad es nuestra prioridad absoluta en todo momento.' : language === 'fr' ? 'Vos données médicales sont cryptées et votre confidentialité est notre priorité absolue.' : 'Your medical data is encrypted and your privacy is our absolute priority throughout.'
  },
  { 
    icon: Headphones, 
    title: language === 'es' ? 'Soporte Dedicado 24/7' : language === 'fr' ? 'Support Dédié 24/7' : '24/7 Dedicated Support',
    desc: language === 'es' ? 'Comunícate con nuestro equipo de cuidado en cualquier momento por WhatsApp, teléfono o correo electrónico — antes, durante y después de tu viaje.' : language === 'fr' ? 'Contactez notre équipe de soins à tout moment via WhatsApp, téléphone ou e-mail — avant, pendant et après votre voyage.' : 'Reach our care team anytime via WhatsApp, phone, or email—before, during, and after your trip.'
  },
];

export default function WhyChooseUs() {
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

  const reasons = getReasons(language);

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <motion.div
            className="relative rounded-2xl overflow-hidden aspect-video will-change-transform transform-gpu"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <img
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/deb22db2c_addhome5.png"
              alt="Patient care collage"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            className="will-change-transform transform-gpu"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
              {language === 'es' ? 'Por Qué Los Pacientes Nos Eligen' : language === 'fr' ? 'Pourquoi les Patients Nous Choisissent' : 'Why Patients Choose Us'}
            </p>
            <h2 className="font-display text-3xl lg:text-4xl text-foreground mb-8">
              {language === 'es' ? 'El Más Alto Estándar de Cuidado' : language === 'fr' ? 'Le Plus Haut Standard de Soins' : 'The Highest Standard of Care'}
            </h2>

            <div className="space-y-5">
              {reasons.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}