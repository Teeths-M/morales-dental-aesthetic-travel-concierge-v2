import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, Menu, X, LayoutDashboard, ShieldAlert, Activity,
  DollarSign, User, Shield, FileText, CreditCard, AlertTriangle,
  LogOut, ChevronLeft,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SystemPauseToggle, { SystemPauseBanner } from '@/components/admin/SystemPauseToggle';

// Essential-only navigation — 10 items, 4 sections.
// Advanced tools (imports, IQ-200, portal viewer, etc.) still exist at their
// URLs but are not surfaced here to keep the daily workflow clear.
const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { path: '/admin',                 label: 'Patient Journey',  icon: LayoutDashboard },
      { path: '/admin/mission-control', label: 'Mission Control',  icon: Activity },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/admin/partners',             label: 'Partners',      icon: Users },
      { path: '/admin/partner-verification', label: 'Verifications', icon: ShieldAlert },
      { path: '/admin/companions',           label: 'Companions',    icon: User },
    ],
  },
  {
    label: 'Money',
    items: [
      { path: '/admin/payments', label: 'Payments & Payouts', icon: CreditCard },
      { path: '/admin/pricing',  label: 'Pricing',            icon: DollarSign },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { path: '/admin/solo-monitor',     label: 'Safety Monitor',  icon: Shield },
      { path: '/admin/dispatch-monitor', label: 'Dispatch Issues', icon: AlertTriangle },
      { path: '/admin/audit-log',        label: 'Audit Log',       icon: FileText },
    ],
  },
];

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({ location, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <Users className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">Admin Portal</p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Management Console</p>
        </div>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'pt-4' : ''}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 select-none">
                {section.label}
              </p>
            )}
            {section.items.map(item => (
              <NavItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                onClick={onClose}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — always visible at the bottom */}
      <div className="border-t border-slate-100 px-3 py-3 flex-shrink-0 space-y-1">
        {/* ⏸ System Pause — saves integration credits during development */}
        <SystemPauseToggle compact />

        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <ChevronLeft className="w-4 h-4 flex-shrink-0 text-slate-400" />
          Back to Website
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Red banner when system is paused — fixed position, sits above everything */}
      <SystemPauseBanner />
      <div className="flex">
        {/* Desktop sidebar — fixed, full-height, flex column so footer pins to bottom */}
        <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-20">
          <SidebarContent location={location} onClose={close} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-white shadow-xl flex flex-col relative">
              <button
                onClick={close}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 z-10"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
              <SidebarContent location={location} onClose={close} />
            </div>
            <div className="flex-1 bg-black/40" onClick={close} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-700">Admin</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
