import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Search, MapPin, Shield, Stethoscope, ChevronRight, CheckCircle, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import DoctorCard from '@/components/directory/DoctorCard';
import SecurityAgencyCard from '@/components/directory/SecurityAgencyCard';

const TABS = [
  { id: 'all', label: 'All Partners' },
  { id: 'doctors', label: 'Doctors & Clinics', icon: Stethoscope },
  { id: 'security', label: 'Security Agencies', icon: Shield },
];

export default function PartnerDirectory() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Collect unique countries across both lists
  const allCountries = [...new Set([
    ...doctors.map(d => d.clinic_country).filter(Boolean),
    ...agencies.map(a => a.country).filter(Boolean),
  ])].sort();

  const matchesSearch = (text) =>
    !search || (text || '').toLowerCase().includes(search.toLowerCase());

  const filteredDoctors = doctors.filter(d =>
    (!countryFilter || d.clinic_country === countryFilter) &&
    (matchesSearch(d.full_name) || matchesSearch(d.specialty) || matchesSearch(d.clinic_name))
  );

  const filteredAgencies = agencies.filter(a =>
    (!countryFilter || a.country === countryFilter) &&
    (matchesSearch(a.agency_name) || (a.services_offered || []).some(s => matchesSearch(s)))
  );

  const showDoctors = activeTab === 'all' || activeTab === 'doctors';
  const showAgencies = activeTab === 'all' || activeTab === 'security';

  const totalVerified = doctors.filter(d => d.license_verified).length + agencies.length;

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

          {/* Search + Country Filter */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, specialty, or service…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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