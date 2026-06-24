import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, ShieldCheck, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const OUTCOME_COLORS = {
  success: '#10b981',
  complication: '#f59e0b',
  revision_required: '#f97316',
  cancelled: '#6b7280',
  incomplete: '#ef4444'
};

export default function RiskOptimizationDashboard() {
  const [records, setRecords] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const all = await base44.entities.OutcomeRecord.list('-ingested_at', 200);
    setRecords(all);
    setPending(all.filter(r => r.human_review_required && !r.human_reviewed_at));
    setLoading(false);
  };

  const approveRecord = async (id) => {
    const user = await base44.auth.me();
    await base44.entities.OutcomeRecord.update(id, {
      human_reviewed_by: user.id,
      human_reviewed_at: new Date().toISOString()
    });
    loadData();
  };

  // Outcome distribution for pie chart
  const outcomeCounts = records.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(outcomeCounts).map(([name, value]) => ({ name, value }));

  // Procedure category bar chart
  const categoryData = records.reduce((acc, r) => {
    const cat = r.procedure_category || 'Unknown';
    if (!acc[cat]) acc[cat] = { name: cat, success: 0, complication: 0 };
    if (r.outcome === 'success') acc[cat].success++;
    if (['complication', 'revision_required'].includes(r.outcome)) acc[cat].complication++;
    return acc;
  }, {});
  const barData = Object.values(categoryData).slice(0, 8);

  const successRate = records.length > 0
    ? ((records.filter(r => r.outcome === 'success').length / records.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Self-Learning Risk Optimization</h1>
              <p className="text-xs text-gray-500">FDA-aligned PCCP v1.0 · Human-in-the-loop oversight active</p>
            </div>
          </div>
          <Button variant="outline" onClick={loadData} className="gap-2"><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {/* PCCP Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">PCCP Governance Active (v1.0)</p>
            <p className="text-xs text-blue-600 mt-0.5">All AI risk rule changes require human-in-the-loop sign-off before deployment. No automatic rule modifications without admin review.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Outcomes', value: records.length, color: 'text-gray-900', bg: 'bg-gray-100' },
            { label: 'Success Rate', value: `${successRate}%`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Pending Human Review', value: pending.length, color: pending.length > 0 ? 'text-amber-700' : 'text-gray-500', bg: pending.length > 0 ? 'bg-amber-50' : 'bg-gray-50' },
            { label: 'PCCP Version', value: '1.0', color: 'text-blue-700', bg: 'bg-blue-50' }
          ].map(kpi => (
            <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'pending_review', 'records'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {tab === 'pending_review' ? `Pending Review (${pending.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Outcome Distribution</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={OUTCOME_COLORS[entry.name] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">No outcome data yet</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Success by Category</h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="success" fill="#10b981" name="Success" />
                    <Bar dataKey="complication" fill="#f59e0b" name="Complication" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-12">No category data yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'pending_review' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-gray-500">No pending reviews — all outcomes are cleared.</p>
              </div>
            ) : pending.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-gray-900">{r.procedure_name || r.procedure_category}</span>
                      <Badge className="bg-amber-100 text-amber-700 text-xs">{r.outcome}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{r.destination_country} · Risk at booking: {r.risk_score_at_booking}</p>
                    {r.complication_notes && <p className="text-xs text-gray-400 mt-1 italic">{r.complication_notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">PCCP: {r.pccp_version} · Rule: {r.risk_rule_triggered || 'None'}</p>
                  </div>
                  <Button onClick={() => approveRecord(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {records.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No outcome records yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {records.slice(0, 50).map(r => (
                  <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: OUTCOME_COLORS[r.outcome] || '#94a3b8' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{r.procedure_name || r.procedure_category}</p>
                      <p className="text-xs text-gray-400">{r.destination_country} · {r.patient_age_bracket}</p>
                    </div>
                    <Badge className="text-xs" style={{ background: `${OUTCOME_COLORS[r.outcome]}20`, color: OUTCOME_COLORS[r.outcome] }}>
                      {r.outcome}
                    </Badge>
                    {r.human_review_required && !r.human_reviewed_at && (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}