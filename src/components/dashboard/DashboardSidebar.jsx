import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, User, FileText, CalendarDays,
  MessageCircle, Shield, Map, Headphones, Settings, Menu, X, ChevronRight, ChevronLeft,
  Stethoscope, Plane, Users, AlertTriangle, Mountain, Radio, Globe, Luggage, Crown
} from 'lucide-react';

// PREMIUM COLOR PALETTE
const LUXURY_COLORS = {
  header: 'bg-gradient-to-br from-slate-900 to-slate-950',
  activeGradient: 'bg-gradient-to-br from-slate-800 to-slate-900',
  gold: '#D4AF37',
  goldLight: '#E5C55A',
  textPrimary: 'text-slate-700',
  textSecondary: 'text-slate-500',
  badge: 'bg-rose-400',
};

// PERFORMANCE: Memoized nav items — prevents array recreation on every render
const NAV_ITEMS = Object.freeze([
  { icon: LayoutDashboard, label: 'All Features', path: '/dashboard' },
  { icon: Stethoscope, label: 'Medical', path: '/booking' },
  { icon: Plane, label: 'Travel', path: '/travel-concierge' },
  { icon: Shield, label: 'Safety', path: '/safe-t' },
  { icon: FileText, label: 'Documents', path: '/passport-vault' },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages', badge: 2 },
  { icon: AlertTriangle, label: 'Emergency', path: '/emergency' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]);

// PERFORMANCE: Memoized sidebar content component — prevents re-render on parent updates
const SidebarContent = React.memo(({ location, onClose }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Premium Brand Header - Single Clean Logo */}
      <div className={`${LUXURY_COLORS.header} px-5 py-6`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-serif font-bold text-xl">M</span>
          </div>
          <div>
            <p className="text-white font-serif font-semibold text-sm tracking-wide">MORALES</p>
            <p className="text-amber-400/70 text-[10px] tracking-widest uppercase">Patient Portal</p>
          </div>
        </div>
      </div>

      {/* Premium Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? `${LUXURY_COLORS.activeGradient} text-white font-semibold shadow-lg shadow-slate-900/20 border border-slate-700/50`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : `${LUXURY_COLORS.badge} text-white`
                }`}>
                  {badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Premium Footer */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-3">
        <Link to="/trip-overview">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl px-4 py-3 text-white text-center hover:opacity-90 transition-all shadow-lg shadow-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Globe className="w-4 h-4" />
              <p className="text-xs font-bold">My Trip Overview</p>
            </div>
            <p className="text-[10px] text-white/80">View itinerary & partners</p>
          </div>
        </Link>
        
        {/* SAFE-T Badge */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-800 tracking-wide">SAFE-T 4LIFE™</p>
              <p className="text-[9px] text-emerald-600 font-medium">Active Protection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] text-emerald-700">Real-time monitoring enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
});

SidebarContent.displayName = 'SidebarContent';

export default function DashboardSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-400/30 rounded-xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-white shadow-2xl h-full border-r border-slate-100">
            <SidebarContent location={location} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 shadow-xl shadow-slate-200/50 min-h-screen flex-shrink-0">
        <SidebarContent location={location} />
      </aside>
    </>
  );
}