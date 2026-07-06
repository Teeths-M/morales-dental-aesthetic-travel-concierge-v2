import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, Menu, X, LayoutDashboard, Activity,
  DollarSign, User, Shield, FileText, CreditCard, AlertTriangle,
  LogOut, ChevronLeft, Globe, ShieldAlert,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SystemPauseToggle, { SystemPauseBanner } from '@/components/admin/SystemPauseToggle';

const GOLD   = '#D4AF37';
const BG     = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { path: '/admin',                 label: 'Dashboard',       icon: LayoutDashboard },
      { path: '/admin/mission-control', label: 'Mission Control', icon: Activity },
      { path: '/admin/situation-room',  label: 'Situation Room',  icon: Globe },
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
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        fontSize: 13, fontWeight: isActive ? 600 : 500,
        color: isActive ? GOLD : 'rgba(255,255,255,0.55)',
        background: isActive ? `${GOLD}15` : 'transparent',
        border: `1px solid ${isActive ? GOLD + '30' : 'transparent'}`,
        textDecoration: 'none', transition: 'all 0.15s',
        marginBottom: 2,
      }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0, color: isActive ? GOLD : 'rgba(255,255,255,0.3)' }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ location, onClose = null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${GOLD}40`,
          }}>
            <img src="/morales-m-mark.png" alt="Morales" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Admin Portal</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3, marginTop: 2 }}>Morales Concierge</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} style={{ marginTop: sIdx > 0 ? 20 : 0 }}>
            {section.label && (
              <p style={{
                padding: '0 12px', marginBottom: 6,
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)',
              }}>
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

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SystemPauseToggle compact />

        <Link
          to="/"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
            transition: 'color 0.15s',
          }}
        >
          <ChevronLeft style={{ width: 15, height: 15 }} />
          Back to Website
        </Link>

        <button
          onClick={() => base44.auth.logout()}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10, width: '100%',
            fontSize: 13, fontWeight: 500,
            color: '#f87171', background: 'transparent', border: 'none',
            cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s',
          }}
        >
          <LogOut style={{ width: 15, height: 15 }} />
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
    <div style={{ minHeight: '100vh', background: BG }}>
      <SystemPauseBanner />
      <div style={{ display: 'flex' }}>

        {/* Desktop sidebar — hidden/lg:flex via class; inline style cannot hold display:none or lg:flex loses */}
        <aside style={{
          flexDirection: 'column',
          width: 224, height: '100vh',
          background: BG, borderRight: `1px solid ${BORDER}`,
          position: 'fixed', left: 0, top: 0, zIndex: 20,
        }} className="hidden lg:flex">
          <SidebarContent location={location} onClose={close} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }} className="lg:hidden">
            <div style={{ width: 224, background: BG, boxShadow: '4px 0 24px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <button
                onClick={close}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  padding: 6, borderRadius: 8, border: 'none',
                  background: 'rgba(255,255,255,0.08)', cursor: 'pointer', zIndex: 10,
                }}
              >
                <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
              </button>
              <SidebarContent location={location} onClose={close} />
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} onClick={close} />
          </div>
        )}

        {/* Main content — marginLeft must come from class, not inline style */}
        <main style={{ flex: 1, minWidth: 0, background: '#091522' }} className="lg:ml-56">
          {/* Mobile top bar */}
          <div
            style={{
              background: 'rgba(6,11,22,0.97)', backdropFilter: 'blur(12px)',
              borderBottom: `1px solid ${BORDER}`,
              position: 'sticky', top: 0, zIndex: 10,
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            }}
            className="lg:hidden"
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ padding: 8, borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, cursor: 'pointer', flexShrink: 0 }}
            >
              <Menu style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <Link
              to="/admin"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', flexShrink: 0 }}
            >
              ← Dashboard
            </Link>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center' }}>Admin</span>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
