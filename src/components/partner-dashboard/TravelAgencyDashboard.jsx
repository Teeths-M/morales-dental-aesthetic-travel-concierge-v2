import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plane, Star, DollarSign, MapPin, Globe, Clock, CheckCircle, AlertTriangle, LogOut, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

export default function TravelAgencyDashboard({ agency, language }) {

  // Pending quote requests for this agency
  const { data: pendingQuotes = [], isLoading: loadingPending } = useQuery({
    queryKey: ['agency-pending-quotes'],
    queryFn: () => base44.entities.CaseRecord.filter(
      { status: 'Travel-Coordination', itinerary_status: 'PENDING' },
      '-updated_date', 15
    ).catch(() => []),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Cases this agency has active itineraries for
  const { data: activeCases = [], isLoading: loadingActive } = useQuery({
    queryKey: ['agency-active-cases', agency?.id],
    queryFn: () => base44.entities.CaseRecord.filter(
      { assigned_travel_agency_id: agency?.id },
      '-departure_date', 20
    ).catch(() => []),
    enabled: !!agency?.id,
    staleTime: 60_000,
  });

  const inProgress = activeCases.filter(c => !['Completed', 'Closed', 'Cancelled'].includes(c.status));
  const completed  = activeCases.filter(c => ['Completed', 'Closed'].includes(c.status));

  const submitQuote = (caseId) => {
    window.location.href = `/portal/travel?case_id=${caseId}`;
  };

  return (
    <div className="space-y-6">

      {/* Agency hero header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #060B16 0%, #0C1A1D 100%)', border: '1px solid #2A3F4A' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: agency.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                         color: agency.status === 'active' ? '#22c55e' : '#94a3b8' }}>
                {agency.status === 'active' ? '● Active Partner' : agency.status || 'Pending'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-1">{agency.agency_name}</h1>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                {(agency.service_regions || []).slice(0, 3).join(', ') || 'Regions not set'}
              </span>
            </div>
          </div>
          <button onClick={() => base44.auth.logout()}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Packages done', value: completed.length || agency.total_bookings || 0, icon: Plane },
            { label: 'Rating', value: agency.average_rating ? `${Number(agency.average_rating).toFixed(1)} ★` : '—', icon: Star },
            { label: 'This month', value: `$${agency.earnings_this_month?.toLocaleString() || 0}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pending quotes — these need action */}
      {loadingPending ? null : pendingQuotes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Quote Requests ({pendingQuotes.length})</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.15)', color: GOLD }}>
              Action needed
            </span>
          </div>
          <div className="space-y-3">
            {pendingQuotes.map(c => {
              const age = Math.floor((Date.now() - new Date(c.updated_date || c.created_date).getTime()) / (60 * 60 * 1000));
              return (
                <div key={c.id} className="rounded-2xl p-4"
                  style={{ background: '#0C1A1D', border: `1px solid ${age > 48 ? 'rgba(212,175,55,0.4)' : '#2A3F4A'}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-white">{c.client_name}</p>
                        {age > 48 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(212,175,55,0.15)', color: GOLD }}>
                            {age}h ago
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" style={{ color: '#64748b' }} />
                        <p className="text-xs" style={{ color: '#94a3b8' }}>
                          {c.procedure_country || c.destination_country || 'Destination TBC'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: '#64748b' }} />
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          Departs: {c.departure_date
                            ? new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'TBC'}
                        </p>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#475569' }}>
                        {(c.procedures || []).join(', ') || 'Procedure TBC'}
                      </p>
                    </div>
                    <button onClick={() => submitQuote(c.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                      style={{ background: GOLD, color: '#060B16' }}>
                      Submit Quote →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Active itineraries */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-3">
          <Plane className="w-4 h-4" style={{ color: GOLD }} />
          <h2 className="text-sm font-semibold text-white">Active Itineraries</h2>
        </div>

        {loadingActive ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
          </div>
        ) : inProgress.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <Plane className="w-8 h-8 mx-auto mb-2" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>No active itineraries at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inProgress.map(c => (
              <div key={c.id} className="rounded-2xl p-4"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">{c.client_name}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        {c.status?.replace(/-/g, ' ') || 'In Progress'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                      <span>📍 {c.procedure_country || 'TBC'}</span>
                      {c.departure_date && <span>✈️ {new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                      {(c.procedures || []).join(', ') || ''}
                    </p>
                  </div>
                  <Link to={`/case/${c.id}`}>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all">
                      View
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Completed packages */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Completed Packages</h2>
          </div>
          <div className="space-y-2">
            {completed.slice(0, 4).map(c => (
              <div key={c.id} className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div>
                  <p className="text-sm text-white font-medium">{c.client_name}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{c.procedure_country || '—'}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  ✓ Complete
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/partner-reviews">
          <button className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Reviews
          </button>
        </Link>
        <Link to="/partner-portal">
          <button className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> Partner Portal
          </button>
        </Link>
      </div>

    </div>
  );
}
