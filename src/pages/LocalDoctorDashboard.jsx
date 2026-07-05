// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CACHE } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, Stethoscope, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  accepted:  { label: 'Accepted',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  declined:  { label: 'Declined',  color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

function ReferralCard({ referral }) {
  const c = referral.case || {};
  const cfg = STATUS_CONFIG[referral.status] || STATUS_CONFIG.pending;

  return (
    <Card className="bg-[#0C1A1D] border-[#2A3F4A] hover:border-[#D4AF37]/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-semibold truncate">{c.client_name || 'Patient'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>

            {c.procedure_name && (
              <div className="flex items-center gap-1.5 mb-1">
                <Stethoscope className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                <p className="text-sm text-gray-400 truncate">{c.procedure_name}</p>
              </div>
            )}

            {c.client_country && (
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <p className="text-xs text-gray-500">{c.client_country}</p>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Referred {format(parseISO(referral.created_date), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {referral.status === 'pending' && (
            <a
              href={`/portal/local-doctor/${referral.portal_token}`}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c49e30] transition-colors"
            >
              View &amp; Respond
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LocalDoctorDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['local-doctor-referrals'],
    queryFn: () => base44.functions.invoke('getLocalDoctorReferrals', {}),
    staleTime: CACHE.SHORT,
  });

  const referrals = data?.data?.referrals || [];
  const filtered = filter === 'all' ? referrals : referrals.filter(r => r.status === filter);

  const counts = {
    pending: referrals.filter(r => r.status === 'pending').length,
    accepted: referrals.filter(r => r.status === 'accepted').length,
    completed: referrals.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-[#060B16] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">M Local Dashboard</h1>
              <p className="text-sm text-gray-500">{user?.full_name || user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending',   count: counts.pending,   icon: AlertCircle,   color: 'text-amber-400' },
            { label: 'Accepted',  count: counts.accepted,  icon: CheckCircle2,  color: 'text-emerald-400' },
            { label: 'Completed', count: counts.completed, icon: CheckCircle2,  color: 'text-blue-400' },
          ].map(({ label, count, icon: Icon, color }) => (
            <Card key={label} className="bg-[#0C1A1D] border-[#2A3F4A]">
              <CardContent className="p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className="text-2xl font-semibold text-white">{count}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {['all', 'pending', 'accepted', 'completed', 'declined'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                filter === f
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                  : 'border-[#2A3F4A] text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37]'
              }`}>
              {f === 'all' ? `All (${referrals.length})` : f}
            </button>
          ))}
        </div>

        {/* Referrals list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : error ? (
          <Card className="bg-[#0C1A1D] border-red-800">
            <CardContent className="p-6 text-center">
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">Could not load referrals. Please try again.</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="bg-[#0C1A1D] border-[#2A3F4A]">
            <CardContent className="p-10 text-center">
              <Stethoscope className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {filter === 'all'
                  ? 'No referrals yet. The system will notify you when a patient in your area needs follow-up care.'
                  : `No ${filter} referrals.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => <ReferralCard key={r.id} referral={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
