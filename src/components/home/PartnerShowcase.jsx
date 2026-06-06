import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Stethoscope, Plane, Car, Users } from 'lucide-react';

const GOLD = '#D4AF37';

export default function PartnerShowcase() {
  const [language, setLanguage] = useState('en');
  const [partnerCounts, setPartnerCounts] = useState({
    doctors: 0,
    travel: 0,
    taxi: 0,
    companions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const [doctors, travel, taxi, companions] = await Promise.all([
          base44.entities.Doctor.filter({ status: 'active' }).catch(() => []),
          base44.entities.TravelAgency.filter({ status: 'active' }).catch(() => []),
          base44.entities.TaxiService.filter({ status: 'active' }).catch(() => []),
          base44.entities.Companion.filter({ status: 'active' }).catch(() => [])
        ]);
        
        setPartnerCounts({
          doctors: doctors.length || 0,
          travel: travel.length || 0,
          taxi: taxi.length || 0,
          companions: companions.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch partner counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, []);

  const partnerTypes = [
    {
      icon: Stethoscope,
      label: language === 'es' ? 'Doctores Verificados' : language === 'fr' ? 'Médecins Vérifiés' : 'Verified Doctors',
      count: partnerCounts.doctors,
      color: '#22c55e'
    },
    {
      icon: Plane,
      label: language === 'es' ? 'Agencias de Viaje' : language === 'fr' ? 'Agences de Voyage' : 'Travel Agencies',
      count: partnerCounts.travel,
      color: '#3b82f6'
    },
    {
      icon: Car,
      label: language === 'es' ? 'Servicios de Transporte' : language === 'fr' ? 'Services de Transport' : 'Taxi Services',
      count: partnerCounts.taxi,
      color: '#f59e0b'
    },
    {
      icon: Users,
      label: language === 'es' ? 'Compañeros de Viaje' : language === 'fr' ? 'Compagnons de Voyage' : 'Travel Companions',
      count: partnerCounts.companions,
      color: '#8b5cf6'
    }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: '-100px' }}
      className="relative py-16 px-4 sm:px-6 lg:px-16"
    >
      {/* Background blur */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.03) 0%, rgba(10,15,30,0.5) 100%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl lg:text-4xl font-bold mb-3"
            style={{ color: GOLD }}
          >
            {language === 'es' ? 'Nuestra Red Global de Socios'
              : language === 'fr' ? 'Notre Réseau Global de Partenaires'
              : 'Our Global Partner Network'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 text-lg max-w-2xl mx-auto"
          >
            {language === 'es' ? 'Especialistas verificados, coordinadores de confianza y proveedores de viaje en más de 50 países.'
              : language === 'fr' ? 'Spécialistes vérifiés, coordinateurs de confiance et fournisseurs de voyage dans plus de 50 pays.'
              : 'Verified specialists, trusted coordinators, and travel providers across 50+ countries.'}
          </motion.p>
        </div>

        {/* Partner cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {partnerTypes.map((partner, i) => {
            const Icon = partner.icon;
            return (
              <motion.div
                key={partner.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                viewport={{ once: true }}
                whileHover={{
                  y: -4,
                  boxShadow: `0px 10px 30px ${partner.color}33`,
                  borderColor: `${partner.color}55`
                }}
                className="rounded-2xl p-6 border border-white/10 backdrop-blur-md transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${partner.color}22` }}>
                    <Icon className="w-6 h-6" style={{ color: partner.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      {language === 'es' ? 'Total' : language === 'fr' ? 'Total' : 'Total'}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: partner.color }}>
                      {loading ? '—' : partner.count}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{partner.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 rounded-2xl p-8 border border-white/10 text-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <p className="text-slate-300 mb-3">
            {language === 'es' ? 'Cada socio verificado según estándares internacionales'
              : language === 'fr' ? 'Chaque partenaire vérifié selon les normes internationales'
              : 'Every partner verified to international standards'}
          </p>
          <p className="text-sm text-slate-400">
            {language === 'es' ? 'Licencias, credenciales y antecedentes auditados continuamente'
              : language === 'fr' ? 'Licences, références et antécédents audités en continu'
              : 'Licenses, credentials, and backgrounds continuously audited'}
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}