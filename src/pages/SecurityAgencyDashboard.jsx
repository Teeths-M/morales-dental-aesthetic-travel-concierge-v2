import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BackButtonLight } from '@/components/nav/BackButton';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Clock, AlertCircle, ToggleLeft, ToggleRight, Phone, MapPin, Users, Zap, Star, LogOut, Siren, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const STATUS_CONFIG = {
  pending_review:  { label: 'Pending Review',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  under_review:    { label: 'Under Review',     color: 'bg-blue-100 text-blue-700',    icon: Clock },
  verified:        { label: 'Verified',         color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:        { label: 'Rejected',         color: 'bg-red-100 text-red-700',      icon: AlertCircle },
  suspended:       { label: 'Suspended',        color: 'bg-slate-100 text-slate-600',  icon: AlertCircle },
};

// ── Active escort assignments + recent SOS alerts ─────────────────────────────
function ActiveEscortsPanel({ agencyId }) {
  const { data: activeCases = [], isLoading } = useQuery({
    queryKey: ['security-active-cases', agencyId],
    queryFn: () => base44.entities.CaseRecord.filter(
      { security_agency_id: agencyId },
      '-updated_date', 20
    ).catch(() => []),
    enabled: !!agencyId,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const { data: sosAlerts = [] } = useQuery({
    queryKey: ['security-sos-alerts', agencyId],
    queryFn: () => base44.entities.SOSAlert?.filter(
      { security_agency_id: agencyId },
      '-created_date', 5
    ).catch(() => []),
    enabled: !!agencyId,
    staleTime: 120_000,
  });

  const active   = activeCases.filter(c => !['Completed', 'Closed', 'Cancelled'].includes(c.status));
  const recent   = activeCases.filter(c => ['Completed', 'Closed'].includes(c.status)).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Active escorts */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Active Escort Assignments</h3>
          {active.length > 0 && (
            <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {active.length} active
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No active escort assignments right now.</p>
            <p className="text-xs text-slate-400 mt-1">You will be dispatched when a patient triggers an SOS or requires a security escort.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{c.client_name}</p>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.procedure_country || 'Location TBC'}
                    {c.departure_date ? ` · ${new Date(c.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  </p>
                  {c.special_requirements && (
                    <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-0.5 rounded">
                      ⚠️ {c.special_requirements}
                    </p>
                  )}
                </div>
                {c.client_phone && (
                  <a href={`tel:${c.client_phone}`} className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent SOS alerts */}
      {(sosAlerts.length > 0 || recent.length > 0) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Siren className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-slate-800">Recent SOS History</h3>
          </div>
          <div className="space-y-2">
            {sosAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{alert.client_name || 'Patient'}</p>
                  <p className="text-xs text-slate-500">{alert.alert_type || 'SOS Alert'} · {new Date(alert.created_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alert.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {alert.resolved ? '✓ Resolved' : '● Active'}
                </span>
              </div>
            ))}
            {recent.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.client_name}</p>
                  <p className="text-xs text-slate-500">Escort · {c.procedure_country || '—'}</p>
                </div>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Complete</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityAgencyDashboard() {
  const [agency, setAgency] = useState(null);
  const [_user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const results = await base44.entities.SecurityAgency.filter({ email: u.email });
        if (results.length > 0) setAgency(results[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleAvailability = async () => {
    if (!agency || agency.verification_status !== 'verified') return;
    setToggling(true);
    setToggleError(null);
    try {
      const updated = await base44.entities.SecurityAgency.update(agency.id, {
        is_available: !agency.is_available,
        sos_alerts_enabled: !agency.is_available,
      });
      setAgency(updated);
    } catch (_e) {
      setToggleError('Could not update availability. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No Application Found</h2>
          <p className="text-slate-500 text-sm mb-6">You haven't registered a security agency yet.</p>
          <Button onClick={() => window.location.href = '/security-signup'} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
            Register Now
          </Button>
          <Button variant="outline" className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[agency.verification_status] || STATUS_CONFIG.pending_review;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <BackButtonLight fallback="/" className="absolute top-4 left-4" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{agency.agency_name}</h1>
              <p className="text-slate-300 text-xs">Security Agency Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            <Link to="/partner-reviews">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors">
                <Star className="w-3.5 h-3.5" /> Reviews
              </button>
            </Link>
            <button onClick={() => base44.auth.logout()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Availability Toggle — only for verified agencies */}
        {agency.verification_status === 'verified' && (
          <motion.div
            className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-lg"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <p className="font-semibold text-slate-800 text-lg">SOS Availability</p>
              <p className="text-slate-500 text-sm">
                {agency.is_available ? 'You are online and receiving SOS alerts' : 'You are currently offline'}
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                agency.is_available
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {agency.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {toggling ? 'Updating…' : agency.is_available ? 'Online' : 'Go Online'}
            </button>
          </motion.div>
        )}

        {toggleError && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {toggleError}
            <button onClick={() => setToggleError(null)} className="ml-auto text-xs underline">Dismiss</button>
          </div>
        )}

        {/* Pending notice */}
        {agency.verification_status === 'pending_review' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 mb-1">Application Under Review</p>
              <p className="text-amber-700 text-sm">Our compliance team is reviewing your credentials. You'll receive an email once KYP screening is complete (2–3 business days).</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: 'Total Responses', value: agency.total_responses || 0, color: 'text-blue-600 bg-blue-100' },
            { icon: Users, label: 'Personnel', value: agency.personnel_count || '—', color: 'text-purple-600 bg-purple-100' },
            { icon: MapPin, label: 'Regions', value: (agency.operational_regions || []).length, color: 'text-green-600 bg-green-100' },
            { icon: Phone, label: 'Response Time', value: agency.response_time_minutes ? `${agency.response_time_minutes}m` : '—', color: 'text-orange-600 bg-orange-100' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-semibold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Active escorts + SOS alerts */}
        <ActiveEscortsPanel agencyId={agency.id} />

        {/* Profile Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Agency Profile</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Contact Person', value: agency.contact_person },
              { label: 'Email', value: agency.email },
              { label: 'Phone', value: agency.phone },
              { label: 'Country', value: agency.city ? `${agency.city}, ${agency.country}` : agency.country },
              { label: 'License No.', value: agency.license_number || '—' },
              { label: 'Years in Operation', value: agency.years_in_operation || '—' },
              { label: 'Armored Vehicles', value: agency.has_armored_vehicles ? 'Yes' : 'No' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 text-right">{value}</span>
              </div>
            ))}
          </div>

          {agency.services_offered?.length > 0 && (
            <div className="mt-4">
              <p className="text-slate-500 text-sm mb-2">Services Offered</p>
              <div className="flex flex-wrap gap-2">
                {agency.services_offered.map(s => (
                  <span key={s} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {agency.background_types?.length > 0 && (
            <div className="mt-4">
              <p className="text-slate-500 text-sm mb-2">Personnel Background</p>
              <div className="flex flex-wrap gap-2">
                {agency.background_types.map(b => (
                  <span key={b} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}