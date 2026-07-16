import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Plane, Search, CheckCircle, Clock, Archive, Activity, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import CaseDetailDrawer from '@/components/admin/CaseDetailDrawer';
import FallbackCrisisAlert from '@/components/admin/FallbackCrisisAlert';
import AdminLayout from '@/components/layout/AdminLayout';

export default function SimpleAdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const { _toast } = useToast();

  // Fetch all cases in a single query for better performance
  const { data: allCases = [], isLoading, refetch } = useQuery({
    queryKey: ['admin_all_cases', refreshKey],
    queryFn: async () => {
      const result = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 500);
      return result || [];
    },
    staleTime: 30000, // Keep data fresh for 30 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleExport = () => {
    const rows = allCases.map(c => ({
      name: c.client_name,
      email: c.client_email,
      status: c.status,
      procedures: c.procedures?.join(' | '),
      country: c.procedure_country,
      price: c.final_package_price,
      created: c.created_date ? new Date(c.created_date).toLocaleDateString() : '',
    }));
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cases-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derive active and completed cases from the single query
  const activeCases = allCases.filter(c => c.status !== 'Completed');
  const completedCases = allCases.filter(c => c.status === 'Completed');
  const loadingActive = isLoading;
  const loadingCompleted = isLoading;

  const getStatusBadge = (status) => {
    const configs = {
      'Submitted': { color: 'bg-slate-100 text-slate-700', icon: Clock, label: 'Submitted' },
      'Safe-T-Reviewed': { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Safety Reviewed' },
      'Doctor-Pending': { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Doctor Pending' },
      'Vendor-Pending': { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'Vendor Pending' },
      'Admin-Review': { color: 'bg-orange-100 text-orange-700', icon: Clock, label: 'Admin Review' },
      'Proposal-Sent': { color: 'bg-indigo-100 text-indigo-700', icon: Clock, label: 'Proposal Sent' },
      'Travel-Coordination': { color: 'bg-blue-100 text-blue-700', icon: Plane, label: 'Travel Coordination' },
      'Ready-For-Travel': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Ready for Travel' },
      'Procedure-In-Progress': { color: 'bg-amber-100 text-amber-700', icon: Activity, label: 'Procedure In Progress' },
      'Recovery': { color: 'bg-violet-100 text-violet-700', icon: Activity, label: 'Recovery' },
      'Completed': { color: 'bg-slate-100 text-slate-600', icon: Archive, label: 'Completed' },
    };
    const config = configs[status] || configs['Submitted'];
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredActiveCases = activeCases.filter(caseRecord => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      caseRecord.client_name?.toLowerCase().includes(searchLower) ||
      caseRecord.client_email?.toLowerCase().includes(searchLower) ||
      caseRecord.procedures?.some(p => p.toLowerCase().includes(searchLower)) ||
      caseRecord.procedure_country?.toLowerCase().includes(searchLower)
    );
  });

  const filteredCompletedCases = completedCases.filter(caseRecord => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      caseRecord.client_name?.toLowerCase().includes(searchLower) ||
      caseRecord.client_email?.toLowerCase().includes(searchLower) ||
      caseRecord.procedures?.some(p => p.toLowerCase().includes(searchLower))
    );
  });

  const stats = {
    active: activeCases.length,
    completed: completedCases.length,
    inTravel: activeCases.filter(c => c.status === 'Travel-Coordination' || c.status === 'Ready-For-Travel').length,
    inProcedure: activeCases.filter(c => c.status === 'Procedure-In-Progress').length,
    inRecovery: activeCases.filter(c => c.status === 'Recovery').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display text-white">Patient Journey Dashboard</h1>
            <p className="mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Monitor active medical travel cases</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5 hidden sm:flex" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }} disabled={allCases.length === 0}>
              <Download className="w-4 h-4" /> <span className="hidden md:inline">Export CSV</span>
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-1.5" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}>
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
            {/* In-Flux Crisis Alert Panel — always rendered first, hidden when no crises */}
            <FallbackCrisisAlert cases={allCases} onRefresh={handleRefresh} />

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-white border-0 shadow-md rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.active}</p>
                      <p className="text-xs text-slate-500">Active Cases</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.inTravel}</p>
                      <p className="text-xs text-slate-500">Travel Phase</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.inProcedure}</p>
                      <p className="text-xs text-slate-500">In Procedure</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.inRecovery}</p>
                      <p className="text-xs text-slate-500">In Recovery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-md rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Archive className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.completed}</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by patient name, email, procedure, or destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus-visible:ring-0 text-base"
                />
              </div>
            </div>

            {/* Tabs for Active vs Completed */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-white rounded-2xl shadow-md border border-slate-100 p-1">
                <TabsTrigger value="active" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl">
                  <Activity className="w-4 h-4 mr-2" />
                  Active Cases ({activeCases.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white rounded-xl">
                  <Archive className="w-4 h-4 mr-2" />
                  Past Trips ({completedCases.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {loadingActive ? (
                  <Card className="bg-white border-0 shadow-md rounded-2xl">
                    <CardContent className="pt-6 text-center py-8">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
                    </CardContent>
                  </Card>
                ) : filteredActiveCases.length === 0 ? (
                  <Card className="bg-white border-0 shadow-md rounded-2xl">
                    <CardContent className="pt-6 text-center py-8">
                      <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No active cases found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActiveCases.map(caseRecord => (
                      <CaseCard 
                        key={caseRecord.id} 
                        caseRecord={caseRecord}
                        getStatusBadge={getStatusBadge}
                        onSelect={setSelectedCase}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {loadingCompleted ? (
                  <Card className="bg-white border-0 shadow-md rounded-2xl">
                    <CardContent className="pt-6 text-center py-8">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto" />
                    </CardContent>
                  </Card>
                ) : filteredCompletedCases.length === 0 ? (
                  <Card className="bg-white border-0 shadow-md rounded-2xl">
                    <CardContent className="pt-6 text-center py-8">
                      <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No completed trips yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompletedCases.map(caseRecord => (
                      <CaseCard 
                        key={caseRecord.id} 
                        caseRecord={caseRecord}
                        getStatusBadge={getStatusBadge}
                        onSelect={setSelectedCase}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </div>

      <CaseDetailDrawer
        caseRecord={selectedCase}
        onClose={() => setSelectedCase(null)}
        onStatusUpdated={() => handleRefresh()}
      />
    </AdminLayout>
  );
}

function CaseCard({ caseRecord, getStatusBadge, onSelect }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(caseRecord)}
      className="cursor-pointer"
    >
      <Card className="border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all rounded-xl">
        <CardContent className="pt-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-slate-900 line-clamp-1">{caseRecord.client_name}</h4>
              {getStatusBadge(caseRecord.status)}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="line-clamp-1">{caseRecord.client_email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="line-clamp-1">{caseRecord.procedures?.join(', ') || 'Procedure TBD'}</span>
              </div>
              
              {caseRecord.procedure_country && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Plane className="w-4 h-4 text-slate-400" />
                  <span>{caseRecord.procedure_country}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Created: {caseRecord.created_date ? new Date(caseRecord.created_date).toLocaleDateString() : 'Unknown'}
              </span>
              {caseRecord.final_package_price && (
                <span className="text-sm font-semibold text-slate-700">
                  ${caseRecord.final_package_price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}