// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';
import { fuzzyScore, fuzzyMatches } from '@/lib/fuzzyMatch';
import { isDoctorVerified } from '@/lib/doctorVerification';

const PROCEDURE_FILTERS = ['All', 'Dental', 'Aesthetic', 'Rhinoplasty', 'Liposuction', 'Veneers', 'Implants'];
const GOLD = '#D4AF37';

const TYPE_COLORS = {
  Doctor:    { bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.3)',  color: GOLD },
  Country:   { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' },
  Procedure: { bg: 'rgba(99,179,255,0.08)', border: 'rgba(99,179,255,0.2)',  color: '#93c5fd' },
};

export default function Providers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Public page — unauthenticated visitors must see doctors.
  // .list() silently returns [] without auth; .filter({}) works for all users.
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: () => base44.entities.Doctor.filter({}, '-created_date', 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => base44.entities.DoctorSpecialty.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000,
  });

  const specialtyMap = useMemo(() => {
    const map = {};
    specialties.forEach(spec => {
      if (!map[spec.doctor_id]) map[spec.doctor_id] = [];
      map[spec.doctor_id].push(spec);
    });
    return map;
  }, [specialties]);

  // Suggestion pool: real names, countries, procedures from loaded data
  const suggestionPool = useMemo(() => {
    const names = doctors
      .map(d => d.full_name).filter(Boolean)
      .map(label => ({ label, type: 'Doctor' }));
    const countries = [...new Set(doctors.map(d => d.clinic_country).filter(Boolean))]
      .map(label => ({ label, type: 'Country' }));
    const procedures = [...new Set(specialties.map(s => s.procedure_name).filter(Boolean))]
      .map(label => ({ label, type: 'Procedure' }));
    return [...names, ...countries, ...procedures];
  }, [doctors, specialties]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 1) return [];
    // Single-char: only prefix matches (score ≥ 80) so "M" shows Mexico/Malaysia
    // not every entry containing the letter.
    // Two+ chars: full fuzzy at threshold 45.
    const threshold = q.length === 1 ? 80 : 45;
    return suggestionPool
      .map(s => ({ ...s, score: fuzzyScore(q, s.label) }))
      .filter(s => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [searchQuery, suggestionPool]);

  const q = searchQuery.toLowerCase().trim();
  /* This page is titled "Our Verified Specialists" and tells visitors "Every
     provider is rigorously vetted". It was listing Doctor.filter({}) — every
     row in the table, verified or not. The per-doctor badge was honest, so a
     patient COULD tell them apart, but the headline said "every", and the list
     wasn't.

     "Verified" is the whole reason someone chooses M over a search engine, so
     the claim stays and the list is brought up to meet it. Same gate the badge
     uses (DoctorVerifiedBadge): license_verified true AND a terminal verified
     status — not "submitted", not "pending", not "re-verifying".

     Unverified doctors are not deleted; they simply aren't presented to
     patients as vetted. They surface again the moment verification completes.

     isDoctorVerified is imported from DoctorVerifiedBadge rather than
     re-implemented here — the first draft of this hand-copied the state list
     and got it wrong, which would have listed doctors the badge itself refuses
     to call verified. */
  const verifiedDoctors = doctors.filter(isDoctorVerified);

  const filteredDoctors = verifiedDoctors.filter(doc => {
    const specs = specialtyMap[doc.id] || [];
    const matchesSearch = !q
      || fuzzyMatches(q, doc.full_name)
      || fuzzyMatches(q, doc.clinic_country)
      || fuzzyMatches(q, doc.clinic_name)
      || specs.some(s => fuzzyMatches(q, s.procedure_name) || fuzzyMatches(q, s.category));
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

        {/* Smart search + filters */}
        <motion.div className="mb-8 space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          {/* Search bar with autocomplete */}
          <div ref={searchRef} style={{ position: 'relative', maxWidth: 520 }}>
            <Search size="16" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type a name, country, or procedure…"
              style={{
                width: '100%', height: 48, padding: '0 40px 0 40px', borderRadius: 99,
                background: 'rgba(255,255,255,0.06)',
                border: showSuggestions && suggestions.length > 0
                  ? `1px solid rgba(212,175,55,0.4)`
                  : '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
              >
                <X size="15" />
              </button>
            )}

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 54, left: 0, right: 0, zIndex: 50,
                    borderRadius: 16, overflow: 'hidden',
                    background: '#0C1A1D',
                    border: '1px solid #2A3F4A',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}
                >
                  {suggestions.map((s, i) => {
                    const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Procedure;
                    return (
                      <button
                        key={i}
                        onMouseDown={() => { setSearchQuery(s.label); setShowSuggestions(false); }}
                        style={{
                          width: '100%', padding: '10px 14px', border: 'none', background: 'none',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textAlign: 'left' }}>{s.label}</span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                          background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color,
                        }}>
                          {s.type}
                        </span>
                      </button>
                    );
                  })}
                  <div style={{ padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
                      Don't see it? Keep typing — M finds it even with typos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          /* Two different emptinesses, and telling them apart matters.
             Now that the list is gated on verification, it can be empty because
             nothing has finished verification yet — not because the search was
             too narrow. Saying "try a different search" then sends someone to
             clear filters and land on the same empty page, which reads as
             broken software. Name the real reason instead. */
          <div className="text-center py-20">
            <Search className="w-8 h-8 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.25)' }} strokeWidth={1.5} />
            {verifiedDoctors.length === 0 ? (
              <>
                <p className="text-white font-semibold mb-1">We&rsquo;re still verifying specialists here</p>
                <p className="text-sm max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  We only list doctors once their licence has been confirmed with the issuing
                  medical board. Start a consultation and your care team will match you personally
                  while verification completes.
                </p>
                <button
                  onClick={() => navigate('/intake')}
                  style={{ marginTop: 18, padding: '11px 22px', borderRadius: 999, background: GOLD, color: '#060B16', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                  Start a consultation
                </button>
              </>
            ) : (
              <>
                <p className="text-white font-semibold mb-1">No specialists match that search</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Try a different search or{' '}
                  <button onClick={() => { setSearchQuery(''); setActiveFilter('All'); }} style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    clear filters
                  </button>
                </p>
              </>
            )}
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
                      <img loading="lazy" decoding="async" src={doctor.photo_url} alt={doctor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { /** @type {HTMLImageElement} */(e.target).style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 700, color: GOLD, opacity: 0.6 }}>
                        {doctor.full_name?.charAt(0) || 'D'}
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', fontSize: 10, fontWeight: 700, color: GOLD }}>
                      ✓ Verified
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-white mb-0.5">{doctor.full_name}</h3>
                    {doctorSpecs[0] && <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>{doctorSpecs[0].category || 'Specialist'}</p>}

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

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => navigate(`/providers/${doctor.id}`)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate(`/intake?doctor_id=${encodeURIComponent(doctor.id)}&doctor=${encodeURIComponent(doctor.full_name)}&country=${encodeURIComponent(doctor.clinic_country || '')}`)}
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
