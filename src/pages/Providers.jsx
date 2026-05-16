import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import ProviderCard from '../components/providers/ProviderCard';

export default function Providers() {
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

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => base44.entities.Provider.list(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
            {language === 'es' ? 'Nuestros Expertos' : language === 'fr' ? 'Nos Experts' : 'Our Experts'}
          </p>
          <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-4">
            {language === 'es' ? 'Especialistas de Clase Mundial' : language === 'fr' ? 'Spécialistes de Classe Mondiale' : 'World-Class Specialists'}
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            {language === 'es' ? 'Cada proveedor es rigurosamente verificado y comprometido a entregar el más alto estándar de cuidado.' : language === 'fr' ? 'Chaque prestataire est rigoureusement contrôlé et engagé à fournir le plus haut niveau de soins.' : 'Every provider is rigorously vetted, verified, and committed to delivering the highest standard of care.'}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {language === 'es' ? 'Los perfiles de nuestros especialistas están siendo actualizados. Vuelve pronto.' : language === 'fr' ? 'Les profils de nos spécialistes sont en cours de mise à jour. Revenez bientôt.' : 'Our specialist profiles are being updated. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {providers.map(provider => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}