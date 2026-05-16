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

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list(),
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => base44.entities.DoctorSpecialty.list('-created_date', 1000),
  });

  const specialtyMap = {};
  specialties.forEach(spec => {
    if (!specialtyMap[spec.doctor_id]) {
      specialtyMap[spec.doctor_id] = [];
    }
    specialtyMap[spec.doctor_id].push(spec);
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
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {language === 'es' ? 'Los perfiles de nuestros especialistas están siendo actualizados. Vuelve pronto.' : language === 'fr' ? 'Les profils de nos spécialistes sont en cours de mise à jour. Revenez bientôt.' : 'Our specialist profiles are being updated. Check back soon.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {doctors.map(doctor => {
              const doctorSpecs = specialtyMap[doctor.id] || [];
              return (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      <div className="w-40 h-40 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                        {doctor.photo_url ? (
                          <img src={doctor.photo_url} alt={doctor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          doctor.full_name?.charAt(0) || 'D'
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="text-2xl font-bold text-foreground">{doctor.full_name}</h3>
                        {doctorSpecs.length > 0 && (
                          <p className="text-muted-foreground text-lg mt-1">{doctorSpecs[0].category || 'Specialist'}</p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-border">
                        {doctor.years_experience && (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-muted-foreground">⏱️</span>
                            <span>{doctor.years_experience}+ Years</span>
                          </div>
                        )}
                        {doctor.rating && (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span>⭐</span>
                            <span className="font-bold">{doctor.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({doctor.review_count || 0})</span>
                          </div>
                        )}
                      </div>

                      {/* Credentials */}
                      {doctor.bio && (
                        <ul className="space-y-2 mb-4 text-muted-foreground text-sm">
                          <li className="flex items-start gap-3">
                            <span className="text-primary">•</span>
                            <span>{doctor.bio}</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-primary">•</span>
                            <span>Licensed in {doctor.clinic_country}</span>
                          </li>
                          {doctor.clinic_name && (
                            <li className="flex items-start gap-3">
                              <span className="text-primary">•</span>
                              <span>{doctor.clinic_name}</span>
                            </li>
                          )}
                        </ul>
                      )}

                      {/* Specialties */}
                      {doctorSpecs.length > 0 && (
                        <div>
                          <h4 className="font-bold text-foreground text-sm mb-3">Areas of Expertise</h4>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {doctorSpecs.map(spec => (
                              <span key={spec.id} className="px-3 py-1.5 bg-secondary text-foreground text-xs font-medium rounded-full">
                                {spec.procedure_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-3">
                        <button className="flex-1 px-4 py-2.5 border border-border rounded-full font-semibold hover:bg-secondary/20 transition-colors text-sm">
                          View Profile
                        </button>
                        <button className="flex-1 px-4 py-2.5 bg-accent text-accent-foreground rounded-full font-semibold hover:bg-accent/90 transition-colors text-sm">
                          Book Consultation
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}