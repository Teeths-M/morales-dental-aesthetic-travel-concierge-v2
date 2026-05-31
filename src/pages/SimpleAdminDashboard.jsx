import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users, FileText, AlertCircle, RefreshCw, Building2,
  DollarSign, Activity, CheckCircle, Clock, XCircle,
  TrendingUp, UserCheck, Stethoscope, Car, Plane, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SimpleAdminDashboard() {
  const qc = useQueryClient();

  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['cases_monitor'],
    queryFn: () => base44.entities.CaseRecord.list('-created_date', 100),
  });

  const { data: consultations = [], isLoading: loadingConsultations } = useQuery({
    queryKey: ['consultations_monitor'],
    queryFn: () => base44.entities.Consultation.list('-created_date', 50),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors_monitor'],
    queryFn: () => base44.entities.Doctor.list('-created_date', 100),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies_monitor'],
    queryFn: () => base44.entities.TravelAgency.list('-created_date', 100),
  });

  const { data: taxis = [] } = useQuery({
    queryKey: ['taxis_monitor'],
    queryFn: () => base44.entities.TaxiService.list('-created_date', 100),
  });

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['cases_monitor'] });
    qc.invalidateQueries({ queryKey: ['consultations_monitor'] });
    qc.invalidateQueries({ queryKey: ['doctors_monitor'] });
    qc.invalidateQueries({ queryKey: ['agencies_monitor'] });
    qc.invalidateQueries({ queryKey: ['taxis_monitor'] });
  };

  // Stats
  const totalRevenue = cases.reduce((sum, c) => sum + (c.final_package_price || 0), 0);
  const totalPaid = cases.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
  const blockedCases = cases.filter(c => c.safe_t_result === 'BLOCKED');
  const stalledCases = cases.filter(c => {
    if (!c.updated_date) return false;
    const daysSinceUpdate = (Date.now() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 3 && !['Completed', 'Recovery'].includes(c.status);
  });
  const activeDoctors = doctors.filter(d => d.status === 'active').length;
  const activeAgencies = agencies.filter(a => a.status === 'active').length;
  const activeTaxis = taxis.filter(t => t.status === 'active').length;
  const pendingPartners = [
    ...doctors.filter(d => d.status === 'pending_verification'),
    ...agencies.filter(a => a.status === 'pending_verification'),
    ...taxis.filter(t => t.status === 'pending_verification'),
  ];

  const statusColors = {
    'Submitted': 'bg-slate-100 text-slate-700',
    'Safe-T-Reviewed': 'bg-blue-100 text-blue-700',
    'Doctor-Pending': 'bg-amber-100 text-amber-700',
    'Vendor-Pending': 'bg-purple-100 text-purple-700',
    'Proposal-Sent': 'bg-indigo-100 text-indigo-700',
    'Deposit-Paid': 'bg-emerald-100 text-emerald-700',
    'Travel-Coordination': 'bg-cyan-100 text-cyan-700',
    'Completed': 'bg-green-100 text-green-700',
    'Admin-Review': 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Monitor</h1>
              <p className="text-xs text-slate-500">Read-only oversight — all assignments are automated</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/portal-viewer"><Eye className="w-4 h-4 mr-1" /> Partner Portals</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/partners"><Building2 className="w-4 h-4 mr-1" /> Partners</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Alerts — issues needing attention */}
        {(blockedCases.length > 0 || stalledCases.length > 0 || pendingPartners.length > 0) && (
          <div className="space-y-2">
            {blockedCases.length > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">
                  {blockedCases.length} case{blockedCases.length > 1 ? 's' : ''} BLOCKED by Safe-T — review required
                </p>
              </div>
            )}
            {stalledCases.length > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 font-medium">
                  {stalledCases.length} case{stalledCases.length > 1 ? 's' : ''} stalled for 3+ days without progress
                </p>
              </div>
            )}
            {pendingPartners.length > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700 font-medium">
                  {pendingPartners.length} partner{pendingPartners.length > 1 ? 's' : ''} awaiting verification
                </p>
                <Link to="/admin/partners" className="ml-auto text-xs text-blue-600 underline">Review</Link>
              </div>
            )}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Pipeline Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">${totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{cases.length}</p>
                  <p className="text-xs text-slate-500">Active Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{blockedCases.length + stalledCases.length}</p>
                  <p className="text-xs text-slate-500">Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cases">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="cases">Live Cases ({cases.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues {(blockedCases.length + stalledCases.length) > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{blockedCases.length + stalledCases.length}</span>}</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="flow">Booking Flow ({consultations.length})</TabsTrigger>
          </TabsList>

          {/* Live Cases */}
          <TabsContent value="cases" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-700">All Cases — Automated Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCases ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No cases yet</div>
                ) : (
                  <div className="space-y-2">
                    {cases.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 text-sm">{c.client_name}</span>
                            <Badge className={`text-xs ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                              {c.status}
                            </Badge>
                            {c.safe_t_result === 'BLOCKED' && (
                              <Badge className="text-xs bg-red-100 text-red-700">BLOCKED</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span>📋 {c.procedures?.join(', ')}</span>
                            {c.doctor_selected && <span>👨‍⚕️ {c.doctor_selected}</span>}
                            {c.procedure_country && <span>📍 {c.procedure_country}</span>}
                            {c.treatment_cost > 0 && <span>💰 ${c.treatment_cost}</span>}
                            {c.doctor_confirmation_status && (
                              <span className={c.doctor_confirmation_status === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}>
                                Dr: {c.doctor_confirmation_status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-400 flex-shrink-0">
                          {c.final_package_price > 0 && (
                            <p className="font-semibold text-emerald-600">${c.final_package_price.toLocaleString()}</p>
                          )}
                          <p>{new Date(c.created_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues */}
          <TabsContent value="issues" className="mt-4">
            <div className="space-y-4">
              {blockedCases.length === 0 && stalledCases.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6 text-center py-12">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No issues detected</p>
                    <p className="text-sm text-slate-400">All cases are progressing normally</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {blockedCases.length > 0 && (
                    <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                          <XCircle className="w-4 h-4" /> Blocked by Safe-T ({blockedCases.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {blockedCases.map(c => (
                            <div key={c.id} className="p-3 bg-red-50 rounded-lg text-sm">
                              <p className="font-medium text-slate-900">{c.client_name}</p>
                              <p className="text-xs text-slate-500">{c.procedures?.join(', ')} — {c.safe_t_flags?.join(', ') || 'Review required'}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {stalledCases.length > 0 && (
                    <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Stalled Cases 3+ Days ({stalledCases.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {stalledCases.map(c => (
                            <div key={c.id} className="p-3 bg-amber-50 rounded-lg text-sm">
                              <p className="font-medium text-slate-900">{c.client_name}</p>
                              <p className="text-xs text-slate-500">Stuck at: {c.status} — {c.doctor_selected || 'No doctor assigned'}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Partners */}
          <TabsContent value="partners" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <Stethoscope className="w-4 h-4 text-blue-500" /> Doctors ({doctors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {doctors.slice(0, 8).map(d => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{d.full_name}</p>
                          <p className="text-xs text-slate-400">{d.clinic_city}, {d.clinic_country}</p>
                        </div>
                        <Badge className={`text-xs ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : d.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {d.status === 'active' ? 'Active' : d.status === 'pending_verification' ? 'Pending' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-medium">{activeDoctors} active</span>
                    <span className="text-amber-600">{doctors.filter(d => d.status === 'pending_verification').length} pending</span>
                  </div>
                  <Link to="/admin/partners" className="block mt-2 text-xs text-blue-600 underline">Manage →</Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <Plane className="w-4 h-4 text-purple-500" /> Travel Agencies ({agencies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agencies.slice(0, 8).map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{a.agency_name}</p>
                          <p className="text-xs text-slate-400">{a.headquarters_country}</p>
                        </div>
                        <Badge className={`text-xs ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {a.status === 'active' ? 'Active' : a.status === 'pending_verification' ? 'Pending' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-medium">{activeAgencies} active</span>
                    <span className="text-amber-600">{agencies.filter(a => a.status === 'pending_verification').length} pending</span>
                  </div>
                  <Link to="/admin/partners" className="block mt-2 text-xs text-blue-600 underline">Manage →</Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <Car className="w-4 h-4 text-cyan-500" /> Chauffeurs ({taxis.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {taxis.slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{t.driver_name || t.company_name}</p>
                          <p className="text-xs text-slate-400">{t.operating_city}, {t.operating_country}</p>
                        </div>
                        <Badge className={`text-xs ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : t.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {t.status === 'active' ? 'Active' : t.status === 'pending_verification' ? 'Pending' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-medium">{activeTaxis} active</span>
                    <span className="text-amber-600">{taxis.filter(t => t.status === 'pending_verification').length} pending</span>
                  </div>
                  <Link to="/admin/partners" className="block mt-2 text-xs text-blue-600 underline">Manage →</Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Booking Flow */}
          <TabsContent value="flow" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-700">Incoming Consultations — Automated Processing</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingConsultations ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : consultations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No consultations yet</div>
                ) : (
                  <div className="space-y-2">
                    {consultations.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 text-sm">{c.patient_name}</span>
                            <Badge variant="outline" className="text-xs">{c.procedure_interest?.replace(/_/g, ' ')}</Badge>
                            <Badge className={`text-xs ${c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {c.client_country} → {c.destination_country} · {c.email}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 flex-shrink-0">{new Date(c.created_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}