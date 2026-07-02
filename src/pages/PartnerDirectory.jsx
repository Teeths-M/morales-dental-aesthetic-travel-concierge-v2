import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Search, MapPin, Shield, Stethoscope, ChevronRight, CheckCircle, Award, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import DoctorCard from '@/components/directory/DoctorCard';
import SecurityAgencyCard from '@/components/directory/SecurityAgencyCard';

const TABS = [
  { id: 'all', label: 'All Partners' },
  { id: 'doctors', label: 'Doctors & Clinics', icon: Stethoscope },
  { id: 'security', label: 'Security Agencies', icon: Shield },
];

function fuzzyScore(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100;
  let matched = 0, ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    while (ti < t.length && t[ti] !== q[qi]) ti++;
    if (ti < t.length) { matched++; ti++; }
  }
  return Math.round((matched / q.length) * 85);
}

function fuzzyMatches(query, target) {
  return fuzzyScore(query, target) >= 55;
}

export default function PartnerDirectory() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [docRes, agencyRes] = await Promise.allSettled([
        base44.entities.Doctor.filter({ status: 'active' }),
        base44.entities.SecurityAgency.filter({ verification_status: 'verified' }),
      ]);
      setDoctors(docRes.status === 'fulfilled' ? docRes.value : []);
      setAgencies(agencyRes.status === 'fulfilled' ? agencyRes.value : []);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allCountries = [...new Set([
    ...doctors.map(d => d.clinic_country).filter(Boolean),
    ...agencies.map(a => a.country).filter(Boolean),
  ])].sort();

  const suggestionPool = useMemo(() => {
    const names = doctors.map(d => d.full_name).filter(Boolean).map(label => ({ label, type: 'Doctor' }));
    const specs = [...new Set(doctors.map(d => d.specialty).filter(Boolean))].map(label => ({ label, type: 'Specialty' }));
    const agNames = agencies.map(a => a.agency_name).filter(Boolean).map(label => ({ label, type: 'Agency' }));
    const services = [...new Set(agencies.flatMap(a => a.services_offered || []).filter(Boolean))].map(label => ({ label, type: 'Service' }));
    return [...names, ...specs, ...agNames, ...services];
  }, [doctors, agencies]);

  const suggestions = useMemo(() => {
    const q = search.trim();
    if (q.length < 2) return [];
    return suggestionPool
      .map(s => ({ ...s, score: fuzzyScore(q, s.label) }))
      .filter(s => s.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
  }, [search, suggestionPool]);

  const q = search.toLowerCase().trim();
  const matchDoc = (d) => !q || fuzzyMatches(q, d.full_name) || fuzzyMatches(q, d.specialty) || fuzzyMatches(q, d.clinic_name);
  const matchAgency = (a) => !q || fuzzyMatches(q, a.agency_name) || (a.services_offered || []).some(s => fuzzyMatches(q, s));

  const filteredDoctors = doctors.filter(d =>
    (!countryFilter || d.clinic_country === countryFilter) && matchDoc(d)
  );

  const filteredAgencies = agencies.filter(a =>
    (!countryFilter || a.country === countryFilter) && matchAgency(a)
  );

  const showDoctors = activeTab === 'all' || activeTab === 'doctors';
  const showAgencies = activeTab === 'all' || activeTab === 'security';

  const totalVerified = doctors.filter(d => d.license_verified).length + agencies.length;

  const TYPE_COLORS = {
    Doctor:   { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399' },
    Specialty:{ bg: 'rgba(99,179,255,0.1)', border: 'rgba(99,179,255,0.25)', color: '#93c5fd' },
    Agency:   { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', color: '#94a3b8' },
    Service:  { bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.3)',  color: '#D4AF37' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Hero */}
      <div className="bg-card border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16">
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              <Award className="w-3.5 h-3.5" />
              SAFE-T 4LIFE™ Verified Network
            </div>
            <h1 className="font-display text-3xl lg:text-5xl text-foreground mb-3">
              Our Verified Partner Directory
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              Every partner has passed our rigorous KYP compliance screening, credential verification, and background checks.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle className="w-4 h-4" />
                {totalVerified} Verified Partners
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                KYP + SAFE-T Screened
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-4 h-4 text-accent" />
                {allCountries.length} Countries
              </div>
            </div>
          </motion.div>

          {/* Smart search + country filter */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div ref={searchRef} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type a name, specialty, or service…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-10 pr-8 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ borderColor: showSuggestions && suggestions.length > 0 ? 'rgba(212,175,55,0.5)' : undefined }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.13 }}
                    className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl overflow-hidden bg-white border border-border shadow-xl"
                  >
                    {suggestions.map((s, i) => {
                      const tc = TYPE_COLORS[s.type] || TYPE_COLORS.Service;
                      return (
                        <button
                          key={i}
                          onMouseDown={() => { setSearch(s.label); setShowSuggestions(false); }}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left"
                          style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
                        >
                          <span className="text-sm text-foreground font-medium">{s.label}</span>
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                            style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}>
                            {s.type}
                          </span>
                        </button>
                      );
                    })}
                    <div className="px-3.5 py-2 border-t border-border/30 bg-slate-50/50">
                      <p className="text-[10px] text-muted-foreground">M finds results even with typos — just keep typing.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px]"
            >
              <option value="">All Countries</option>
              {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-border/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Doctors Section */}
            {showDoctors && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-emerald-700" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Doctors & Clinics</h2>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{filteredDoctors.length}</span>
                </div>
                {filteredDoctors.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No verified doctors match your filters.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredDoctors.map((doc, i) => (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <DoctorCard doctor={doc} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Security Agencies Section */}
            {showAgencies && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-slate-700" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Security Agencies</h2>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{filteredAgencies.length}</span>
                </div>
                {filteredAgencies.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No verified agencies match your filters.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredAgencies.map((agency, i) => (
                      <motion.div key={agency.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <SecurityAgencyCard agency={agency} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-8 text-center">
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Want to Join Our Network?</h3>
              <p className="text-muted-foreground text-sm mb-5">Apply as a verified partner and reach international medical travel patients.</p>
              <Link to="/partner-signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all">
                Apply as a Partner <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
