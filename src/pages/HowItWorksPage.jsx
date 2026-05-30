import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, ClipboardList, CreditCard, Plane, Stethoscope, HeartPulse, CalendarCheck, ArrowRight } from 'lucide-react';

const getSteps = (language) => [
  { icon: MessageSquare, num: 1, title: language === 'es' ? 'Consulta' : language === 'fr' ? 'Consultation' : 'Consultation', desc: language === 'es' ? 'Cuéntanos sobre tus objetivos e historial médico. Nuestro equipo revisará tu caso y te conectará con el especialista adecuado.' : language === 'fr' ? 'Parlez-nous de vos objectifs et de vos antécédents médicaux. Notre équipe examinera votre cas et vous connectera avec le bon spécialiste.' : 'Tell us about your goals and medical history. Our team will review your case and connect you with the right specialist.', color: 'bg-primary/10 text-primary' },
  { icon: ClipboardList, num: 2, title: language === 'es' ? 'Plan Personalizado y Presupuesto' : language === 'fr' ? 'Plan Personnalisé et Devis' : 'Personalized Plan & Quote', desc: language === 'es' ? 'Recibe un plan de tratamiento detallado con precios transparentes. Nuestro sistema SAFE-T 4LIFE™ garantiza el enfoque más seguro para ti.' : language === 'fr' ? 'Recevez un plan de traitement détaillé avec une tarification transparente. Notre système SAFE-T 4LIFE™ garantit l\'approche la plus sûre pour vous.' : 'Receive a detailed treatment plan with transparent pricing. Our SAFE-T 4LIFE™ system ensures the safest approach for you.', color: 'bg-accent/10 text-accent' },
  { icon: CreditCard, num: 3, title: language === 'es' ? 'Reservar y Asegurar tu Fecha' : language === 'fr' ? 'Réserver et Sécuriser Votre Date' : 'Book & Secure Your Date', desc: language === 'es' ? 'Elige tus fechas preferidas y asegura tu reserva. Nos encargamos de toda la logística para que te enfoques en prepararte.' : language === 'fr' ? 'Choisissez vos dates préférées et sécurisez votre réservation. Nous gérons toute la logistique pour que vous puissiez vous préparer.' : 'Choose your preferred dates and secure your booking. We handle all the logistics so you can focus on preparing.', color: 'bg-primary/10 text-primary' },
  { icon: Plane, num: 4, title: language === 'es' ? 'Viaje y Alojamiento' : language === 'fr' ? 'Voyage et Hébergement' : 'Travel & Accommodation', desc: language === 'es' ? 'Traslados al aeropuerto, arreglos de hotel, y un conserje personal—todo está cuidado de puerta a puerta.' : language === 'fr' ? 'Transferts aéroportuaires, arrangements hôteliers et concierge personnel — tout est pris en charge de porte à porte.' : 'Airport transfers, hotel arrangements, and a personal concierge—everything is taken care of from door to door.', color: 'bg-accent/10 text-accent' },
  { icon: Stethoscope, num: 5, title: language === 'es' ? 'Tu Procedimiento' : language === 'fr' ? 'Votre Procédure' : 'Your Procedure', desc: language === 'es' ? 'Recibe cuidado de clase mundial de especialistas verificados en instalaciones de última tecnología.' : language === 'fr' ? 'Recevez des soins de classe mondiale de spécialistes vérifiés dans des installations de pointe.' : 'Receive world-class care from verified specialists in state-of-the-art facilities.', color: 'bg-primary/10 text-primary' },
  { icon: HeartPulse, num: 6, title: language === 'es' ? 'Recuperación y Comodidad' : language === 'fr' ? 'Récupération et Confort' : 'Recovery & Comfort', desc: language === 'es' ? 'Cuidado posterior con soporte de enfermería dedicado. Recuperación en comodidad con asistencia de conserje 24/7.' : language === 'fr' ? 'Soins post-procédure avec support infirmier dédié. Récupération en confort avec assistance concierge 24/7.' : 'Post-procedure care with dedicated nursing support. Recovery in comfort with 24/7 concierge assistance.', color: 'bg-accent/10 text-accent' },
  { icon: CalendarCheck, num: 7, title: language === 'es' ? 'Seguimiento Posterior' : language === 'fr' ? 'Suivi Après-Traitement' : 'Aftercare Follow-Up', desc: language === 'es' ? 'Soporte continuo después de regresar a casa. Verificaciones regulares aseguran que tus resultados sean exactamente como se planeó.' : language === 'fr' ? 'Support continu après votre retour à la maison. Les vérifications régulières garantissent que vos résultats sont exactement comme prévu.' : 'Continued support after you return home. Regular check-ins ensure your results are exactly as planned.', color: 'bg-primary/10 text-primary' },
];

export default function HowItWorksPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background pt-16 lg:pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
            {language === 'es' ? 'Tu Viaje' : language === 'fr' ? 'Votre Voyage' : 'Your Journey'}
          </p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
            {language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works'}
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            {language === 'es' ? 'Desde la primera consulta hasta el seguimiento posterior, nos encargamos de cada detalle de tu viaje de transformación.' : language === 'fr' ? 'De la première consultation aux soins post-traitement, nous gérons chaque détail de votre voyage de transformation.' : 'From first consultation to aftercare, we handle every detail of your transformation journey.'}
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
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="pb-8">
                <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                  {language === 'es' ? 'Paso' : language === 'fr' ? 'Étape' : 'Step'} {num}
                </div>
                <h3 className="font-display text-xl text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/booking">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-10">
              {language === 'es' ? 'Inicia Tu Viaje' : language === 'fr' ? 'Commencez Votre Voyage' : 'Start Your Journey'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}