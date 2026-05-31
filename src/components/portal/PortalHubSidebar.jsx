import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CreditCard,
  DollarSign,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export const navItems = [
  { id: 'workflows', label: 'Workflow Monitor', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctor Profiles', icon: Stethoscope },
  { id: 'providers', label: 'Provider Management', icon: Users },
  { id: 'pricing', label: 'Pricing Catalog', icon: DollarSign },
  { id: 'payments', label: 'Payment Tracking', icon: CreditCard },
];

function SidebarContent({ activeTab, setActiveTab, onClose }) {
  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="w-64 bg-card border-r border-border min-h-screen flex flex-col p-6">
      {/* Logo + close on mobile */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-lg font-bold">PH</span>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">PORTAL HUB™</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5 text-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onClose?.(); }}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </Button>
    </div>
  );
}

export default function PortalHubSidebar({ activeTab, setActiveTab }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block sticky top-0 h-screen flex-shrink-0">
        <SidebarContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-xs font-bold">PH</span>
          </div>
          <span className="text-sm font-bold text-foreground">PORTAL HUB™</span>
        </div>
        <span className="ml-auto text-xs text-muted-foreground capitalize">
          {navItems.find(n => n.id === activeTab)?.label}
        </span>
      </div>

      {/* Mobile slide-out overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 h-full z-50 md:hidden shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <SidebarContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}