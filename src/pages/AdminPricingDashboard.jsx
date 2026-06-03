import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, DollarSign, Globe, Users, Package, TrendingUp, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminTabs = [
  { id: 'procedures', label: 'Procedures', icon: DollarSign },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'doctors', label: 'Doctor Pricing', icon: Users },
  { id: 'bundles', label: 'Bundles', icon: Package },
  { id: 'markup', label: 'Markup Rules', icon: TrendingUp },
];

export default function AdminPricingDashboard() {
  const [activeTab, setActiveTab] = useState('procedures');
  const [showForm, setShowForm] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'procedures':
        return <ProceduresTab />;
      case 'countries':
        return <CountriesTab />;
      case 'doctors':
        return <DoctorsTab />;
      case 'bundles':
        return <BundlesTab />;
      case 'markup':
        return <MarkupTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="rounded-full" asChild>
                <Link to="/admin"><ArrowLeft className="w-4 h-4" /></Link>
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
            </div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {AdminTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-all ${
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

// Individual Tab Components
function ProceduresTab() {
  return (
    <div className="space-y-6">
      <motion.div
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">All Procedures</h2>
          <p className="text-sm text-slate-600 mt-1">Manage base pricing, complexity modifiers, and materials</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedure</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Base Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Min - Max</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Complexity</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { name: 'Dental Crown', category: 'Dental', base: 250, range: '$180-$450', complexity: 'Moderate' },
                { name: 'Rhinoplasty', category: 'Aesthetic', base: 3500, range: '$2800-$5200', complexity: 'Complex' },
                { name: 'All-on-4', category: 'Implants', base: 8500, range: '$7000-$12000', complexity: 'Advanced' },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.category}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">${item.base}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{item.range}</td>
                  <td className="px-6 py-4 text-slate-600">{item.complexity}</td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center">
                    <button className="p-2 hover:bg-blue-100 text-blue-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-red-100 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function CountriesTab() {
  return (
    <div className="space-y-6">
      <motion.div
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Country Pricing</h2>
          <p className="text-sm text-slate-600 mt-1">Set localized prices and enable/disable countries</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedure</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Country</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Base Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Country Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Savings</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { procedure: 'Dental Crown', country: 'Venezuela', base: 250, price: 180, savings: 70, status: 'Active' },
                { procedure: 'Dental Crown', country: 'Colombia', base: 250, price: 260, savings: -10, status: 'Active' },
                { procedure: 'Dental Crown', country: 'Turkey', base: 250, price: 350, savings: -100, status: 'Active' },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.procedure}</td>
                  <td className="px-6 py-4 text-slate-600">{item.country}</td>
                  <td className="px-6 py-4 text-right text-slate-600">${item.base}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">${item.price}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={item.savings > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
                      ${item.savings}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center">
                    <button className="p-2 hover:bg-blue-100 text-blue-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function DoctorsTab() {
  return (
    <div className="space-y-6">
      <motion.div
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Doctor Pricing</h2>
          <p className="text-sm text-slate-600 mt-1">Control individual doctor pricing and promotions</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Doctors can propose their own pricing. Admin must approve before it goes live.
            </p>
          </div>
          {/* Pending approvals, active pricing, etc. */}
          <p className="text-slate-600 text-sm">2 pending doctor pricing updates awaiting approval</p>
        </div>
      </motion.div>
    </div>
  );
}

function BundlesTab() {
  return (
    <div className="space-y-6">
      <motion.div
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Procedure Bundles</h2>
          <p className="text-sm text-slate-600 mt-1">Create combo packages with special pricing</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Bundle</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-700">Procedures</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Individual Total</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Bundle Price</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-700">Savings</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { bundle: 'Smile Makeover', procedures: '3 procs', individual: 4200, bundlePrice: 3850, savings: 350 },
                { bundle: 'Mommy Makeover', procedures: '4 procs', individual: 12500, bundlePrice: 11200, savings: 1300 },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.bundle}</td>
                  <td className="px-6 py-4 text-slate-600">{item.procedures}</td>
                  <td className="px-6 py-4 text-right text-slate-600">${item.individual.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">${item.bundlePrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-semibold">${item.savings}</td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center">
                    <button className="p-2 hover:bg-blue-100 text-blue-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function MarkupTab() {
  return (
    <div className="space-y-6">
      <motion.div
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Markup & Profit Rules</h2>
          <p className="text-sm text-slate-600 mt-1">Set platform markup percentages and profit margins</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
              <p className="text-sm text-slate-600 mb-2">Average Markup</p>
              <p className="text-2xl font-bold text-emerald-600">35%</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-slate-600 mb-2">Avg Profit per Booking</p>
              <p className="text-2xl font-bold text-blue-600">$650</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-slate-600 mb-2">Monthly Revenue</p>
              <p className="text-2xl font-bold text-purple-600">$124.5K</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}