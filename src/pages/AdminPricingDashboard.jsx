import React, { useState } from 'react';
import { DollarSign, Globe, Users, Package, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProceduresTab from '@/components/pricing/ProceduresTab';
import CountriesTab from '@/components/pricing/CountriesTab';
import DoctorPricingTab from '@/components/pricing/DoctorPricingTab';
import BundlesTab from '@/components/pricing/BundlesTab';
import MarkupTab from '@/components/pricing/MarkupTab';

const TABS = [
  { id: 'procedures', label: 'Procedures', icon: DollarSign },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'doctors', label: 'Doctor Pricing', icon: Users },
  { id: 'bundles', label: 'Bundles', icon: Package },
  { id: 'markup', label: 'Markup Rules', icon: TrendingUp },
];

export default function AdminPricingDashboard() {
  const [activeTab, setActiveTab] = useState('procedures');

  const renderContent = () => {
    switch (activeTab) {
      case 'procedures': return <ProceduresTab />;
      case 'countries': return <CountriesTab />;
      case 'doctors': return <DoctorPricingTab />;
      case 'bundles': return <BundlesTab />;
      case 'markup': return <MarkupTab />;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold font-display">Pricing Management</h1>
          <p className="text-muted-foreground mt-1">Manage procedures, countries, doctor pricing, bundles, and markup rules</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 rounded-xl font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}