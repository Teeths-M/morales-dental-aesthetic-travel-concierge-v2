import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Car, Star, DollarSign, MapPin, CheckCircle, AlertTriangle, LogOut, Phone, Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const GOLD = '#D4AF37';

function StatusDot({ online }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    </span>
  );
}

export default function TaxiServiceDashboard({ taxi, language }) {
  const [isOnline, setIsOnline] = useState(taxi?.is_available ?? false);
  const [toggling, setToggling] = useState(false);
  const queryClient = useQueryClient();

  // Active + pending trip assignments for this driver
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['taxi-cases', taxi?.id],
    queryFn: () => base44.asServiceRole?.entities?.CaseRecord?.filter(
      { assigned_driver_id: taxi?.id },
      '-departure_date', 20
    ).catch(() => []) ?? Promise.resolve([]),
    enabled: !!taxi?.id,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  // Pending quote requests — cases in Travel-Coordination needing transfer pricing
  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['taxi-pending-quotes'],
    queryFn: () => base44.entities.CaseRecord.filter(
      { status: 'Travel-Coordination', transfer_status: 'PENDING' },
      '-updated_date', 10
    ).catch(() => []),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const activeCases  = cases.filter(c => ['In-Progress', 'Travel-Coordination', 'confirmed'].includes(c.status));
  const pastCases    = cases.filter(c => ['Completed', 'Closed'].includes(c.status));

  const toggleOnline = async () => {
    setToggling(true);
    try {
      await base44.entities.TaxiService.update(taxi.id, { is_available: !isOnline });
      setIsOnline(v => !v);
      queryClient.invalidateQueries({ queryKey: ['taxi-cases', taxi.id] });
    } catch (_) { toast.error('Could not update availability'); }
    finally { setToggling(false); }
  };

  const submitQuote = (caseId) => {
    window.location.href = `/portal/transfer?case_id=${caseId}`;
  };

  return (
    <div className="space-y-6">

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #060B16 0%, #0C1A1D 100%)', border: '1px solid #2A3F4A' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot online={isOnline} />
              <span className="text-xs font-semibold" style={{ color: isOnline ? '#22c55e' : '#94a3b8' }}>
                {isOnline ? 'Online — receiving assignments' : 'Offline'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-1">{taxi.driver_name || taxi.company_name}</h1>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="text-sm" style={{ color: '#94a3b8' }}>{taxi.operating_city || 'City not set'}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={toggleOnline} disabled={toggling}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: isOnline ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                color: isOnline ? '#ef4444' : '#22c55e',
                border: `1px solid ${isOnline ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}>
              {toggling ? '…' : isOnline ? 'Go Offline' : 'Go Online'}
            </button>
            <button onClick={() => base44.auth.logout()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Trips done', value: taxi.total_trips || pastCases.length || 0, icon: Car },
            { label: 'Rating', value: taxi.average_rating ? `${Number(taxi.average_rating).toFixed(1)} ★` : '—', icon: Star },
            { label: 'This month', value: `$${taxi.earnings_this_month?.toLocaleString() || 0}`, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pending quote requests */}
      {pendingQuotes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-white">Quote Requests ({pendingQuotes.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingQuotes.map(c => (
              <div key={c.id} className="rounded-2xl p-4"
                style={{ background: '#0C1A1D', border: '1px solid rgba(212,175,55,0.25)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{c.client_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {c.procedure_country || c.destination_country || 'Destination TBC'}
                      {c.departure_date ? ` · Departs ${new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#64748b' }}>
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
            ))}
          </div>
        </motion.div>
      )}

      {/* Active assignments */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-3">
          <Navigation className="w-4 h-4" style={{ color: GOLD }} />
          <h2 className="text-sm font-semibold text-white">Active Assignments</h2>
        </div>

        {loadingCases ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
          </div>
        ) : activeCases.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
            <Car className="w-8 h-8 mx-auto mb-2" style={{ color: '#334155' }} />
            <p className="text-sm" style={{ color: '#64748b' }}>No active assignments right now.</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>Go online to receive trip requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCases.map(c => (
              <div key={c.id} className="rounded-2xl p-4"
                style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{c.client_name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        Active
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {c.procedure_country || 'Destination TBC'}
                      {c.departure_date ? ` · ${new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                    {c.client_phone && (
                      <a href={`tel:${c.client_phone}`} className="flex items-center gap-1 mt-1.5">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400">{c.client_phone}</span>
                      </a>
                    )}
                    {c.special_requirements && (
                      <p className="text-xs mt-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24' }}>
                        ⚠️ {c.special_requirements}
                      </p>
                    )}
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

      {/* Recent completed */}
      {pastCases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Recent Trips</h2>
          </div>
          <div className="space-y-2">
            {pastCases.slice(0, 3).map(c => (
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

      {/* Bottom links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/partner-reviews">
          <button className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> My Reviews
          </button>
        </Link>
        <Link to="/partner-portal">
          <button className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 transition-all">
            Partner Portal
          </button>
        </Link>
      </div>

    </div>
  );
}
