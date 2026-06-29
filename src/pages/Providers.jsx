import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';

const PROCEDURE_FILTERS = ['All', 'Dental', 'Aesthetic', 'Rhinoplasty', 'Liposuction', 'Veneers', 'Implants'];

const GOLD = '#D4AF37';

export default function Providers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (event) => setLanguage(event.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.filter({ status: 'active' }, '-created_date', 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => base44.entities.DoctorSpecialty.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000,
  });

  const specialtyMap = {};
  specialties.forEach(spec => {
    if (!specialtyMap[spec.doctor_id]) specialtyMap[spec.doctor_id] = [];
    specialtyMap[spec.doctor_id].push(spec);
  });

  const q = searchQuery.toLowerCase().trim();
  const filteredDoctors = doctors.filter(doc => {
    const specs = specialtyMap[doc.id] || [];
    const matchesSearch = !q
      || doc.full_name?.toLowerCase().includes(q)
      || doc.clinic_country?.toLowerCase().includes(q)
      || doc.clinic_name?.toLowerCase().includes(q)
      || specs.some(s => s.procedure_name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
    const matchesFilter = activeFilter === 'All'
      || specs.some(s =>
        s.procedure_name?.toLowerCase().includes(activeFilter.toLowerCase())
        || s.category?.toLowerCase().includes(activeFilter.toLowerCase())
      );
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen" style={{ background: '#060B16' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">

        {/* Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: GOLD }}>
            {language === 'es' ? 'Nuestros Expertos' : 'Our Verified Specialists'}
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {language === 'es' ? 'Especialistas de Clase Mundial' : 'Find Your Doctor'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Every provider is rigorously vetted — credentials, outcomes, and patient reviews verified.
          </p>
        </motion.div>

        {/* Search + filters */}
        <motion.div className="mb-8 space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 520 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by procedure, doctor name, or country…"
              style={{
                width: '100%', height: 48, padding: '0 40px 0 40px', borderRadius: 99,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROCEDURE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  background: activeFilter === f ? GOLD : 'rgba(255,255,255,0.07)',
                  color: activeFilter === f ? '#060B16' : 'rgba(255,255,255,0.55)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {filteredDoctors.length} specialist{filteredDoctors.length !== 1 ? 's' : ''} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        {/* Doctor grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white font-semibold mb-1">No specialists found</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Try a different search or{' '}
              <button onClick={() => { setSearchQuery(''); setActiveFilter('All'); }} style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                clear filters
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor, idx) => {
              const doctorSpecs = specialtyMap[doctor.id] || [];
              return (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}
                >
                  {/* Photo */}
                  <div style={{ height: 180, background: 'linear-gradient(135deg, #0C1A1D, #1a2f38)', position: 'relative', flexShrink: 0 }}>
                    {doctor.photo_url?.trim() ? (
                      <img src={doctor.photo_url} alt={doctor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 700, color: GOLD, opacity: 0.6 }}>
                        {doctor.full_name?.charAt(0) || 'D'}
                      </div>
                    )}
                    {/* Verified badge */}
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', fontSize: 10, fontWeight: 700, color: GOLD }}>
                      ✓ Verified
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-white mb-0.5">{doctor.full_name}</h3>
                    {doctorSpecs[0] && <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>{doctorSpecs[0].category || 'Specialist'}</p>}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {doctor.rating && (
                        <span className="text-xs font-semibold" style={{ color: GOLD }}>⭐ {doctor.rating.toFixed(1)}</span>
                      )}
                      {doctor.years_experience && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{doctor.years_experience}+ yrs</span>
                      )}
                      {doctor.clinic_country && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>📍 {doctor.clinic_country}</span>
                      )}
                    </div>

                    {/* Procedure chips */}
                    {doctorSpecs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {doctorSpecs.slice(0, 3).map(spec => (
                          <span key={spec.id} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                            {spec.procedure_name}
                          </span>
                        ))}
                        {doctorSpecs.length > 3 && (
                          <span style={{ padding: '3px 9px', borderRadius: 99, background: `rgba(212,175,55,0.1)`, border: `1px solid rgba(212,175,55,0.25)`, fontSize: 10, color: GOLD }}>
                            +{doctorSpecs.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => navigate(`/providers/${doctor.id}`)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate(`/consultation?doctor=${encodeURIComponent(doctor.full_name)}&country=${encodeURIComponent(doctor.clinic_country || '')}&procedure=${encodeURIComponent(doctorSpecs[0]?.procedure_name || '')}`)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 99, background: GOLD, border: 'none', color: '#060B16', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Book →
                      </button>
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