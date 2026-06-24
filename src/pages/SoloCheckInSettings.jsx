import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Clock, Bell, MapPin, Shield, CheckCircle2, AlertTriangle, Calendar, Radio, Heart, Globe } from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import LiveBeaconPanel from '@/components/solo/LiveBeaconPanel';
import GuardianLinkManager from '@/components/emergency/GuardianLinkManager';
import PersonalEmergencyContactsPanel from '@/components/emergency/PersonalEmergencyContactsPanel';

function SoloCheckInBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <Radio className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800 text-sm">Solo Check-In Active</p>
          <p className="text-xs text-blue-700 mt-0.5">Mandatory safety protocol for your unaccompanied journey. Check-ins occur every 12 hours.</p>
        </div>
      </div>
    </div>
  );
}

export default function SoloCheckInSettings() {
  const [user, setUser] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [allCheckIns, setAllCheckIns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const locRef = useRef(null);

  // Derive stats from all check-ins
  const stats = {
    total: allCheckIns.length,
    acknowledged: allCheckIns.filter(c => c.status === 'acknowledged' || c.status === 'resolved').length,
    escalated: allCheckIns.filter(c => c.status?.includes('escalated')).length,
  };

  // Derive the latest actionable check-in status
  const latestActiveCheckIn = checkIns.find(c =>
    ['pending', 'escalated_2h', 'escalated_3h', 'escalated_5h', 'escalated_9h'].includes(c.status)
  );
  const isTerminalEscalation = ['escalated_5h', 'escalated_9h'].includes(latestActiveCheckIn?.status);
  const is9hEmergency = latestActiveCheckIn?.status === 'escalated_9h';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadCheckIns = async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;
    setRefreshing(true);
    try {
      const rawCases = await base44.entities.CaseRecord.filter({ client_email: u.email }, '-created_date', 10);
      const cases = rawCases ?? [];
      const caseIds = cases.map(c => c.id);
      if (cases.length > 0) setActiveCase(cases.find(c => c.status !== 'Completed') || cases[0]);

      if (caseIds.length === 0) return;

      const rawCheckIns = await base44.entities.SoloCheckIn.filter(
        { case_id: { $in: caseIds } },
        '-scheduled_time',
        50
      );
      const fetched = rawCheckIns ?? [];

      setAllCheckIns(fetched);
      setCheckIns(fetched.filter(c => !['acknowledged', 'resolved'].includes(c.status)));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) loadCheckIns(user);
  }, [user]);

  const handleIAmSafe = async () => {
    if (!user) return;
    setAcknowledging(true);
    try {
      const cases = await base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 10);
      if (cases.length === 0) { alert('No active journey found.'); return; }
      const ac = cases.find(c => c.status !== 'Completed') || cases[0];
      const loc = locRef.current;
      await base44.functions.invoke('acknowledgeSoloCheckIn', {
        case_id: ac.id,
        response_method: 'app',
        location_lat: loc?.lat ?? null,
        location_lng: loc?.lng ?? null,
        accuracy_meters: loc?.accuracy ?? null,
        location_source: loc?.source ?? 'gps',
        country: loc?.country ?? null,
        country_code: loc?.country_code ?? null,
        city: loc?.city ?? null,
        region: loc?.region ?? null,
        timezone: loc?.timezone ?? null,
      });
      alert('✅ You are safe! Location and check-in recorded.');
      loadCheckIns();
    } catch (err) {
      alert('Failed to record check-in. Please try again.');
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
      acknowledged: { label: 'Acknowledged', color: 'bg-emerald-100 text-emerald-700' },
      escalated_2h: { label: '2h Escalated', color: 'bg-orange-100 text-orange-700' },
      escalated_3h: { label: '3h Escalated', color: 'bg-red-100 text-red-700' },
      escalated_5h: { label: '5h — Security Dispatched', color: 'bg-red-200 text-red-800 font-semibold' },
      escalated_9h: { label: '9h — EMERGENCY DISPATCH', color: 'bg-red-900 text-white' },
      resolved: { label: 'Resolved', color: 'bg-slate-100 text-slate-600' },
    };
    const cfg = configs[status] || configs.pending;
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-5 lg:p-8 overflow-y-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <BackButton fallback="/dashboard" className="mb-5" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-slate-900">Solo Traveler Check-In Settings</h1>
              <p className="text-sm text-slate-500">Mandatory safety protocol for unaccompanied journeys</p>
            </div>
          </div>

          {/* Live Beacon Panel */}
          {activeCase && (
            <div className="mb-5">
              <LiveBeaconPanel
                caseId={activeCase.id}
                caseStatus={activeCase.status}
                guardianToken={null}
                isAdmin={user?.role === 'admin' || user?.role === 'platform_admin'}
              />
            </div>
          )}

          {/* I Am Safe Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            {isTerminalEscalation ? (
              <div className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 px-6 border-2 ${is9hEmergency ? 'bg-red-900 border-red-900' : 'bg-red-50 border-red-300'}`}>
                <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${is9hEmergency ? 'text-white' : 'text-red-600'}`} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${is9hEmergency ? 'text-white' : 'text-red-700'}`}>
                    {is9hEmergency ? '🆘 Emergency Dispatch Active — Police/Embassy Notified' : 'Security Dispatched — Admin Action Required'}
                  </p>
                  <p className={`text-xs ${is9hEmergency ? 'text-red-200' : 'text-red-500'}`}>
                    {is9hEmergency ? 'Case escalated to CRITICAL. Local authorities have been engaged.' : 'Your emergency contact and security have been alerted. Contact your coordinator to resolve.'}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleIAmSafe}
                disabled={acknowledging}
                className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-lg font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {acknowledging ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                    Recording Your Safety...
                  </>
                ) : (
                  <>
                    <Heart className="w-6 h-6 mr-3 fill-white" />
                    I Am Safe
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Current Status Banner */}
          <SoloCheckInBanner />

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white border-0 shadow-md rounded-2xl">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-500">Total Check-Ins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-md rounded-2xl">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{stats.acknowledged}</p>
                    <p className="text-xs text-slate-500">Acknowledged</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-md rounded-2xl">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{stats.escalated}</p>
                    <p className="text-xs text-slate-500">Escalated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 shadow-sm rounded-2xl mb-6">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800 text-sm mb-2">How Solo Check-Ins Work</p>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>• <strong>Frequency:</strong> Every 12 hours (configurable, max 24h)</li>
                    <li>• <strong>First check-in:</strong> 6 hours after destination handshake</li>
                    <li>• <strong>Response window:</strong> 2 hours to acknowledge</li>
                    <li>• <strong>2h escalation:</strong> Second notification sent</li>
                    <li>• <strong>3h escalation:</strong> Voice call + emergency contact notified</li>
                    <li>• <strong>5h escalation:</strong> Private security dispatched + local police alerted</li>
                    <li>• <strong>Exceptions:</strong> Paused during medical procedures (up to 24h post-procedure)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Confirmed Banner */}
          {allCheckIns.some(c => c.status === 'acknowledged' || c.status === 'resolved') && (() => {
            const last = allCheckIns.find(c => c.status === 'acknowledged' || c.status === 'resolved');
            return (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 mb-6 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">✅ Last Check-In Confirmed</p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Round #{last.check_in_round || 1} — confirmed{last.responded_time ? ` on ${new Date(last.responded_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}. Your safety is recorded.
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {/* Guardian Links */}
          {activeCase && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
              <GuardianLinkManager caseId={activeCase.id} patientEmail={user?.email} />
            </div>
          )}

          {/* Emergency Contacts */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
            <PersonalEmergencyContactsPanel
              userEmail={user?.email}
              caseRecord={activeCase}
              onCaseSaved={loadCheckIns}
            />
          </div>

          {/* Check-In History */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Check-In History
              </h3>
              <Button onClick={() => loadCheckIns(user)} size="sm" variant="outline" className="text-xs h-8" disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>

            {checkIns.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">No check-ins yet</p>
                <p className="text-xs text-slate-400 mt-1">Check-ins will appear once you start your solo journey</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checkIns.map(checkIn => (
                  <div key={checkIn.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">
                          Round {checkIn.check_in_round || 1}
                        </p>
                        {getStatusBadge(checkIn.status)}
                        {checkIn.is_paused_medical && (
                          <Badge className="bg-blue-100 text-blue-700">Medical Pause</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Scheduled: {checkIn.scheduled_time ? new Date(checkIn.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </span>
                        {checkIn.responded_time && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Responded: {new Date(checkIn.responded_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                        {checkIn.location_label && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {checkIn.location_label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {checkIn.escalation_level && checkIn.escalation_level !== 'none' && (
                        <p className="text-[10px] font-semibold text-red-600">
                          ⚠️ {checkIn.escalation_level.replace('_', ' ').toUpperCase()}
                        </p>
                      )}
                      {checkIn.response_method && (
                        <p className="text-[10px] text-slate-400 capitalize">Via {checkIn.response_method}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}