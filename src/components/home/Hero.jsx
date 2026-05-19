import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Star, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import SlotCounter from './SlotCounter';
import { translations } from '@/lib/translations';
import { useAuth } from '@/lib/AuthContext';

const getTestimonials = (language) => [];

const getBadges = (language) => [
  { icon: Shield, label: 'SAFE-T 4LIFE™', sub: language === 'es' ? 'Seguridad Impulsada por IA' : language === 'fr' ? 'Sécurité Alimentée par IA' : 'AI-Powered Safety' },
  { icon: BadgeCheck, label: language === 'es' ? 'Especialistas Verificados' : language === 'fr' ? 'Spécialistes Vérifiés' : 'Verified Specialists', sub: language === 'es' ? 'Con Licencia y Confiables' : language === 'fr' ? 'Autorisé et de Confiance' : 'Licensed & Trusted' },
  { icon: Plane, label: language === 'es' ? 'Cuidado Puerta a Puerta' : language === 'fr' ? 'Soins de Porte à Porte' : 'Door-to-Door Care', sub: language === 'es' ? 'Viaje. Cuidado. Recuperación.' : language === 'fr' ? 'Voyage. Soins. Récupération.' : 'Travel. Care. Recover.' }
];

export default function Hero() {
  const [language, setLanguage] = useState('en');
  const { isAuthenticated, navigateToLogin } = useAuth();

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const t = translations[language] || translations['en'];
  const testimonials = getTestimonials(language);
  const badges = getBadges(language);
  const signupRoles = [
    { label: language === 'es' ? 'Doctor' : language === 'fr' ? 'Médecin' : 'Doctor', path: '/doctor-signup', icon: BadgeCheck },
    { label: language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyage' : 'Travel Agency', path: '/partner-signup/travel-agency', icon: Plane },
    { label: language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service Taxi' : 'Taxi Service', path: '/partner-signup/taxi-service', icon: Shield },
  ];

  return (
    <section
      className="relative overflow-hidden bg-cover bg-[center_35%] bg-no-repeat"
      style={{ backgroundImage: "url(https://media.base44.com/images/public/6a01c1305c540b75f24dd373/b929116bb_image.png)" }}
    >
      <div className="absolute inset-0 scale-[1.01] backdrop-blur-[0.75px] backdrop-saturate-125 backdrop-contrast-110 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/76 via-foreground/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/38 via-transparent to-background/5 pointer-events-none" />

      {!isAuthenticated && (
        <div className="absolute right-4 top-24 z-30 flex items-center gap-2 sm:right-6 lg:right-10">
          <Link to="/register-role">
            <Button variant="outline" className="h-10 border-white/60 bg-white/90 px-4 text-xs font-bold text-primary shadow-lg hover:bg-white sm:text-sm">
              Register
            </Button>
          </Link>
          <Button onClick={navigateToLogin} className="h-10 bg-accent px-4 text-xs font-bold text-accent-foreground shadow-lg hover:bg-accent/90 sm:text-sm">
            Login
          </Button>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-[calc(100vh-7rem)] pb-14 pt-8 lg:pt-0">
          {/* Left Content */}
          <motion.div
            className="max-w-2xl rounded-[2rem] border border-white/25 bg-foreground/72 p-6 sm:p-8 lg:p-10 backdrop-blur-md shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white leading-[1.05] mb-5 drop-shadow-md">
              {language === 'es' ? 'Tu cuidado seguro comienza aquí.' : language === 'fr' ? 'Vos soins sûrs commencent ici.' : 'Your safe care journey starts here.'}
            </h1>

            <p className="lg:text-lg max-w-xl mb-5 leading-relaxed text-white text-lg sm:text-xl font-medium drop-shadow-sm">
              {language === 'es' ? 'Especialistas verificados, coordinación de viaje y apoyo de recuperación en un solo plan claro y humano.' : language === 'fr' ? 'Des spécialistes vérifiés, une coordination de voyage et un soutien de récupération dans un plan clair et humain.' : 'Verified specialists, travel coordination, and recovery support in one clear, human care plan.'}
            </p>

            {/* Emotional pull quote */}
            <p className="text-sm font-semibold text-accent italic mb-8 drop-shadow-sm">
              {language === 'es' ? '"Desde la consulta hasta la costa — tu seguridad viaja contigo."' : language === 'fr' ? '"De la consultation à la côte — votre sécurité voyage avec vous."' : '"From consultation to the coast — your safety travels with you."'}
            </p>

            <SlotCounter className="mb-4" />

            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 h-12 shadow-lg">
                  {language === 'es' ? 'Comienza Tu Viaje' : language === 'fr' ? 'Commencez Votre Voyage' : 'Begin Your Journey'}
                </Button>
              </Link>
              <Link to="/procedures">
                <Button size="lg" variant="outline" className="h-12 px-8 font-semibold border-white/70 bg-white/10 text-white hover:bg-white hover:text-foreground">
                  {language === 'es' ? 'Explorar Procedimientos' : language === 'fr' ? 'Explorer les Procédures' : 'Explore Procedures'}
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {badges.map(({ icon: Icon, label, sub }) =>
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">{label}</p>
                    <p className="text-[11px] text-white/75 leading-tight mt-0.5">{sub}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                <Shield className="h-3.5 w-3.5" />
                {language === 'es' ? 'Únete a nuestra red' : language === 'fr' ? 'Rejoignez notre réseau' : 'Join our network'}
              </div>
              <p className="mb-3 text-sm font-semibold text-white">
                {language === 'es' ? 'Regístrate como proveedor:' : language === 'fr' ? 'Inscrivez-vous comme partenaire :' : 'Sign up as a provider:'}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {signupRoles.map(({ label, path, icon: Icon }) => (
                  <Link key={label} to={path} className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-primary transition-all hover:bg-accent hover:text-accent-foreground">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-bold leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Live testimonial strip - hidden until real testimonials exist */}
            {testimonials.length > 0 && (
            <div className="border-t border-border pt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{language === 'es' ? 'Qué Dicen Nuestros Clientes' : language === 'fr' ? 'Ce Que Disent Nos Clients' : 'What Our Clients Say'}</p>
              <div className="flex flex-col gap-3">
                {testimonials.map((t) =>
                <div key={t.name} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{t.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />{t.country}
                        </span>
                        <div className="flex ml-auto">
                          {[...Array(t.rating)].map((_, i) =>
                        <Star key={i} className="w-2.5 h-2.5 fill-accent text-accent" />
                        )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{t.quote}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </motion.div>

        </div>
      </div>
    </section>);

}