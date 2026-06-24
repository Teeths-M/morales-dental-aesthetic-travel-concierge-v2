import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, Scale, CreditCard, TrendingUp, Lock, Search
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import PayoutEscrowPanel from '@/components/payments/PayoutEscrowPanel';
import DisputeArbitrationPanel from '@/components/payments/DisputeArbitrationPanel';

const TABS = [
  { id: 'escrow', label: 'Escrow & Payouts', icon: Lock },
  { id: 'disputes', label: 'Dispute Arbitration', icon: Scale },
];

export default function PaymentsPayoutsDashboard() {
  const [activeTab, setActiveTab] = useState('escrow');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [caseSearch, setCaseSearch] = useState('');

  const { data: cases = [] } = useQuery({
    queryKey: ['payout_cases'],
    queryFn: () => base44.entities.CaseRecord.filter({ payment_status: 'Paid In Full' }, '-updated_date', 100),
    staleTime: 60000,
  });

  const { data: allCasesForSearch = [] } = useQuery({
    queryKey: ['payout_all_cases'],
    queryFn: () => base44.entities.CaseRecord.list('-updated_date', 300),
    staleTime: 60000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['payout_txns'],
    queryFn: () => base44.entities.PaymentTransaction.list('-processed_at', 500),
    staleTime: 30000,
  });

  const revenue = transactions.filter(t => t.status === 'succeeded').reduce((s, t) => s + (t.raw_amount || 0), 0);
  const refunded = transactions.filter(t => t.status === 'refunded').reduce((s, t) => s + (t.raw_amount || 0), 0);
  const pendingPayout = cases.filter(c => !c.timeline_log?.some(e => e.action?.includes('payout_released'))).length;

  const filteredCases = allCasesForSearch.filter(c => {
    if (!caseSearch) return true;
    return c.client_name?.toLowerCase().includes(caseSearch.toLowerCase())
      || c.client_email?.toLowerCase().includes(caseSearch.toLowerCase())
      || c.id?.toLowerCase().includes(caseSearch.toLowerCase());
  });

  const selectedCase = allCasesForSearch.find(c => c.id === selectedCaseId);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold font-display">Payments & Partner Payouts</h1>
          <p className="text-muted-foreground mt-1">PCI-compliant tokenization · Escrow release engine · Stripe Connect marketplace · Dispute arbitration</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', val: `$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Transactions', val: transactions.filter(t => t.status === 'succeeded').length, icon: CreditCard, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Pending Payouts', val: pendingPayout, icon: Lock, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Refunded', val: `$${refunded.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-red-700', bg: 'bg-red-50' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`${s.bg} rounded-2xl px-5 py-4 flex items-center gap-3`}>
                <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-semibold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === t.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ESCROW & PAYOUTS TAB */}
        {activeTab === 'escrow' && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-5">
            {/* Case picker */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3 h-fit">
              <p className="text-sm font-semibold text-slate-700">Select Case</p>
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input value={caseSearch} onChange={e => setCaseSearch(e.target.value)} placeholder="Search patient…"
                  className="text-xs flex-1 focus:outline-none" />
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {filteredCases.map(c => (
                  <button key={c.id} onClick={() => setSelectedCaseId(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all ${
                      selectedCaseId === c.id ? 'bg-slate-800 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}>
                    <p className="font-semibold truncate">{c.client_name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="opacity-60 truncate">{c.status}</span>
                      {c.final_package_price && <span className="font-semibold">${c.final_package_price.toLocaleString()}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payout panel */}
            <div>
              {selectedCaseId ? (
                <div className="space-y-4">
                  {selectedCase && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{selectedCase.client_name}</p>
                          <p className="text-xs text-slate-400">{selectedCase.client_email} · {selectedCase.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-800">${selectedCase.final_package_price?.toLocaleString() || '—'}</p>
                          <p className="text-xs text-slate-400">{selectedCase.payment_status}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <PayoutEscrowPanel caseId={selectedCaseId} caseRecord={selectedCase} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <DollarSign className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium text-slate-400">Select a case to manage payouts</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISPUTE ARBITRATION TAB */}
        {activeTab === 'disputes' && (
          <DisputeArbitrationPanel />
        )}
      </div>
    </AdminLayout>
  );
}