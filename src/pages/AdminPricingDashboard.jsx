import React, { useState } from 'react';
import { Settings, DollarSign, Globe, Users, Package, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full" asChild>
              <Link to="/admin"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">🏠 Home</Link>
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}
      </div>
    </div>
  );
}