import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, User, FileText, CalendarDays,
  MessageCircle, Shield, Map, Headphones, Settings, Menu, X, ChevronRight,
  Stethoscope, Plane, Users, AlertTriangle, Mountain
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Stethoscope, label: 'Book Consultation', path: '/booking' },
  { icon: Users, label: 'Our Experts', path: '/providers' },
  { icon: ClipboardList, label: 'My Consultations', path: '/dashboard/consultations' },
  { icon: User, label: 'Medical Profile', path: '/dashboard/profile' },
  { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
  { icon: CalendarDays, label: 'My Bookings', path: '/dashboard/bookings' },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages', badge: 2 },
  { icon: Shield, label: 'SAFE-T 4LIFE™', path: '/safe-t' },
  { icon: Plane, label: 'Visa Assist', path: '/visa-assist' },
  { icon: Map, label: 'My Journey', path: '/dashboard/journey' },
  { icon: Mountain, label: 'Adventure Safety', path: '/dashboard/adventure' },
  { icon: AlertTriangle, label: 'Emergency Center', path: '/emergency' },
  { icon: Headphones, label: 'Support', path: '/dashboard/support' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

function SidebarContent({ location, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-800 to-blue-900 flex items-center justify-center">
            <span className="text-white font-serif font-bold text-sm">M</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Morales</p>
            <p className="text-[10px] text-slate-400">Patient Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-800 to-blue-900 text-white font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>
                  {badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 bg-emerald-50 rounded-xl px-3 py-2.5">
          <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center">
            <Shield className="w-3 h-3 text-emerald-700" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-800">SAFE-T 4LIFE™</p>
            <p className="text-[10px] text-emerald-600">Active Protection</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-md flex items-center justify-center"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-4 h-4 text-slate-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white shadow-2xl h-full">
            <SidebarContent location={location} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm min-h-screen flex-shrink-0">
        <SidebarContent location={location} />
      </aside>
    </>
  );
}