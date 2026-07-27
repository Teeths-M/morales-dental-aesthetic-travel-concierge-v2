// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';

const _COLORS = ['#047857', '#1d4ed8', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c2d12', '#9d174d'];

export default function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getAnalyticsDashboard', {});
      if (!response?.data?.summary) throw new Error('No analytics data returned');
      setAnalytics(response.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (!analytics?.summary?.total_cases) return;
    const { summary, doctor_performance = [], pipeline_funnel = [] } = analytics;
    base44.functions.invoke('generateAdminInsights', {
      context: 'analytics dashboard',
      metrics: {
        total_cases: summary.total_cases,
        active_cases: summary.active_cases,
        completion_rate: summary.completion_rate,
        active_doctors: doctor_performance.length,
        pipeline_stages: pipeline_funnel.length,
      },
    }).then(r => setAiInsights((r?.data ?? r)?.brief || null)).catch(() => {});
  }, [analytics?.summary?.total_cases]);

  // PERFORMANCE: Memoize expensive filtering/sorting operations (before early returns)
  const activePipeline = useMemo(() => 
    analytics?.pipeline_funnel?.filter(s => s.count > 0) || [],
    [analytics?.pipeline_funnel]
  );
  
  const bottlenecks = useMemo(() => 
    analytics?.avg_time_per_stage?.filter(s => s.avgDays > 3).sort((a, b) => b.avgDays - a.avgDays) || [],
    [analytics?.avg_time_per_stage]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-800 mb-2">Failed to load analytics</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <Button onClick={loadAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  const { summary, _pipeline_funnel, _avg_time_per_stage, doctor_performance } = analytics;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time insights into case pipeline and performance</p>
          </div>
          <Button onClick={loadAnalytics} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {aiInsights && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800"
          >
            <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div><span className="font-semibold">M AI Insight: </span>{aiInsights}</div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Cases"
            value={summary.total_cases}
            icon={Activity}
            color="emerald"
            subtext={`${summary.active_cases} active`}
          />
          <SummaryCard
            title="Completion Rate"
            value={`${summary.completion_rate}%`}
            icon={TrendingUp}
            color="blue"
            subtext={`${summary.completed_cases} completed`}
          />
          <SummaryCard
            title="Avg Doctor Response"
            value={summary.overall_avg_doctor_response_hours ? `${summary.overall_avg_doctor_response_hours}h` : 'N/A'}
            icon={Clock}
            color="violet"
            subtext="Time to confirm/decline"
          />
          <SummaryCard
            title="Active Doctors"
            value={doctor_performance.length}
            icon={Users}
            color="pink"
            subtext="Assigned to cases"
          />
        </div>

        <div className="max-w-7xl mx-auto space-y-6">

        {/* Pipeline Funnel Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Pipeline Funnel</h3>
              <p className="text-xs text-slate-400">Cases at each stage</p>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activePipeline} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis 
                  type="category" 
                  dataKey="stage" 
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#047857" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bottleneck Detection */}
        {bottlenecks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Bottleneck Detection</h3>
                <p className="text-xs text-slate-400">Stages where cases get stuck (avg &gt; 3 days)</p>
              </div>
            </div>

            <div className="space-y-3">
              {bottlenecks.map((stage, _i) => (
                <div
                  key={stage.stage}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{stage.stage}</p>
                      <p className="text-xs text-amber-600">{stage.caseCount} cases currently</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-amber-700">{stage.avgDays} days</p>
                    <p className="text-[10px] text-amber-500">avg time in stage</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Doctor Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Doctor Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Response rates and turnaround times</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Doctor</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Assigned</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Confirmed</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Declined</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Pending</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Avg Response</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Response Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {doctor_performance.map((doc, _i) => {
                  const responseRate = doc.total_cases_assigned > 0
                    ? Math.round(((doc.confirmed_count + doc.declined_count) / doc.total_cases_assigned) * 100)
                    : 0;
                  
                  return (
                    <tr key={doc.doctor_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-800">{doc.doctor_name}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-700">{doc.total_cases_assigned}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {doc.confirmed_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          {doc.declined_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-500">{doc.pending_count}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {doc.avg_response_time_hours !== null ? (
                          <span className={`text-sm font-semibold ${
                            doc.avg_response_time_hours < 24 ? 'text-emerald-700' :
                            doc.avg_response_time_hours < 48 ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {doc.avg_response_time_hours}h
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No data</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {responseRate >= 80 ? (
                            <ArrowUp className="w-3 h-3 text-emerald-600" />
                          ) : responseRate >= 50 ? (
                            <ArrowUp className="w-3 h-3 text-amber-600 rotate-45" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${
                            responseRate >= 80 ? 'text-emerald-700' :
                            responseRate >= 50 ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {responseRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, value, icon: Icon, color, subtext }) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    pink: 'bg-pink-50 text-pink-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </motion.div>
  );
}