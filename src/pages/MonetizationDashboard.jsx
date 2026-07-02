import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, Users, Award, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';

const TIER_COLORS = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700'
};

const PLAN_LABELS = {
  commission_only: 'Commission',
  saas_subscription: 'SaaS Sub',
  escrow_fee: 'Escrow',
  white_label_license: 'White Label',
  certification_badge: 'Certification'
};

export default function MonetizationDashboard() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlan, setNewPlan] = useState({
    partner_name: '', partner_type: 'doctor', partner_email: '',
    plan_type: 'commission_only', commission_rate: 0.25,
    subscription_tier: 'starter', subscription_amount_usd: 50, status: 'active'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await base44.entities.MonetizationPlan.list('-created_date', 100);
    setPlans(data || []);
    setLoading(false);
  };

  const totalRevenue = plans.reduce((sum, p) => sum + (p.total_revenue_generated_usd || 0), 0);
  const activePlans = plans.filter(p => p.status === 'active').length;
  const totalMRR = plans
    .filter(p => p.plan_type === 'saas_subscription' && p.status === 'active')
    .reduce((sum, p) => sum + (p.subscription_amount_usd || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.MonetizationPlan.create({ ...newPlan, billing_cycle_start: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
    setSaving(false);
    loadPlans();
  };

  const planTypeStats = {};
  plans.forEach(p => {
    planTypeStats[p.plan_type] = (planTypeStats[p.plan_type] || 0) + 1;
  });

  return (
    <AdminLayout>
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Monetization Engine</h1>
            <p className="text-sm text-gray-500 mt-1">Revenue matrices, commissions, and partner subscriptions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadPlans} className="gap-2"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Add Plan
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Monthly Recurring', value: `$${totalMRR.toLocaleString()}/mo`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Plans', value: activePlans, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Certified Partners', value: plans.filter(p => p.certification_badge_active).length, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' }
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Model Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Medical Commissions', desc: '20–35%', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { label: 'SaaS Subscriptions', desc: '$50–200/mo', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Escrow Fees', desc: '2–3%', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { label: 'White Label', desc: 'Licensing tiers', color: 'bg-purple-50 border-purple-200 text-purple-700' },
              { label: 'Certification Badges', desc: 'Morales Safe™', color: 'bg-rose-50 border-rose-200 text-rose-700' }
            ].map(r => (
              <div key={r.label} className={`border rounded-xl p-3 ${r.color}`}>
                <p className="text-xs font-semibold">{r.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{r.desc}</p>
                <p className="text-lg font-semibold mt-1">{planTypeStats[Object.keys(PLAN_LABELS).find(k => PLAN_LABELS[k] === r.label.split(' ')[0])] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plans table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Partner Plans ({plans.length})</h3>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No plans yet. Add your first partner plan above.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {plans.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{p.partner_name || 'Unnamed Partner'}</span>
                      <Badge variant="outline" className="text-xs capitalize">{p.partner_type}</Badge>
                      {p.certification_badge_active && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">🏅 Morales Safe™</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.partner_email}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-xs text-gray-400">Plan</p>
                    <p className="text-sm font-semibold text-gray-700">{PLAN_LABELS[p.plan_type]}</p>
                  </div>
                  {p.plan_type === 'commission_only' && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Commission</p>
                      <p className="text-sm font-semibold text-emerald-700">{((p.commission_rate || 0) * 100).toFixed(0)}%</p>
                    </div>
                  )}
                  {p.plan_type === 'saas_subscription' && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400">MRR</p>
                      <p className="text-sm font-semibold text-blue-700">${p.subscription_amount_usd}/mo</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Revenue</p>
                    <p className="text-sm font-semibold text-gray-900">${(p.total_revenue_generated_usd || 0).toLocaleString()}</p>
                  </div>
                  <Badge className={p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Plan Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">New Partner Plan</h3>
            <div className="space-y-3">
              {[
                { label: 'Partner Name', key: 'partner_name', type: 'text' },
                { label: 'Partner Email', key: 'partner_email', type: 'email' }
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                  <input type={f.type} value={newPlan[f.key]} onChange={e => setNewPlan({ ...newPlan, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              ))}
              {[
                { label: 'Partner Type', key: 'partner_type', options: ['doctor', 'travel_agency', 'taxi_service', 'companion', 'white_label'] },
                { label: 'Plan Type', key: 'plan_type', options: Object.keys(PLAN_LABELS) }
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                  <select value={newPlan[f.key]} onChange={e => setNewPlan({ ...newPlan, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none">
                    {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ))}
              {newPlan.plan_type === 'commission_only' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Commission Rate (e.g. 0.25 = 25%)</label>
                  <input type="number" step="0.01" min="0.1" max="0.5" value={newPlan.commission_rate}
                    onChange={e => setNewPlan({ ...newPlan, commission_rate: parseFloat(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              )}
              {newPlan.plan_type === 'saas_subscription' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Monthly Amount (USD)</label>
                  <input type="number" value={newPlan.subscription_amount_usd}
                    onChange={e => setNewPlan({ ...newPlan, subscription_amount_usd: parseFloat(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {saving ? 'Saving...' : 'Create Plan'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}