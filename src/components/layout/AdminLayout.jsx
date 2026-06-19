import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Menu, X, LayoutDashboard, Import, UserCheck, FilePlus, Eye, MessageSquare, ShieldAlert, Activity, DollarSign, User, BarChart2, Shield, FileText, Star, Settings, TrendingUp, CreditCard, AlertTriangle, LogOut, TreePine, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const adminNavItems = [
  { path: '/admin', label: 'Patient Journey', icon: LayoutDashboard },
  { path: '/admin/partners', label: 'Partner Management', icon: Users },
  { path: '/admin/partner-verification', label: 'Partner Verification', icon: Shield },
  { path: '/admin/imports', label: 'Data Imports', icon: Import },
  { path: '/admin/doctor-verification', label: 'Doctor Verification', icon: UserCheck },
  { path: '/admin/procedure-requests', label: 'Procedure Requests', icon: FilePlus },
  { path: '/admin/portal-viewer', label: 'Portal Viewer', icon: Eye },
  { path: '/admin/sms', label: 'SMS Notifications', icon: MessageSquare },
  { path: '/admin/dispatch-monitor', label: 'Dispatch Failures', icon: ShieldAlert },
  { path: '/admin/iq200', label: 'IQ-200 Intelligence', icon: Activity },
  { path: '/admin/pricing', label: 'Pricing Catalog', icon: DollarSign },
  { path: '/admin/provider-verification', label: 'Provider Verification', icon: ShieldAlert },
  { path: '/admin/companions', label: 'Companions', icon: User },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/admin/audit-log', label: 'Audit Log', icon: FileText },
  { path: '/admin/provider-performance', label: 'Provider Performance', icon: TrendingUp },
  { path: '/admin/config-approvals', label: 'Config Approvals', icon: Settings },
  { path: '/admin/monetization', label: 'Monetization', icon: CreditCard },
  { path: '/admin/payments', label: 'Payments & Payouts', icon: DollarSign },
  { path: '/admin/risk-optimization', label: 'Risk Optimization', icon: AlertTriangle },
  { path: '/admin/solo-monitor', label: 'Solo Safety Monitor', icon: Radio },
  { path: '/admin/wilderness-rescue', label: '🏔️ Wilderness Rescue', icon: TreePine },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Admin Portal</h2>
          <p className="text-xs text-slate-500">Management Console</p>
        </div>
      </div>
      <nav className="space-y-2">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all mb-2 border border-slate-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Website
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mb-4 w-full border border-red-100"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 min-h-screen bg-white border-r border-slate-200 fixed left-0 top-0 overflow-y-auto z-20">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-white shadow-xl overflow-y-auto relative">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-w-0">
          <div className="lg:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-600">Admin Menu</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}