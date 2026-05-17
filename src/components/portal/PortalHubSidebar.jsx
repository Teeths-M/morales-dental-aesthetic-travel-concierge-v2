import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CreditCard,
  DollarSign,
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const navItems = [
  { id: 'workflows', label: 'Workflow Monitor', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctor Profiles', icon: Stethoscope },
  { id: 'providers', label: 'Provider Management', icon: Users },
  { id: 'pricing', label: 'Pricing Catalog', icon: DollarSign },
  { id: 'payments', label: 'Payment Tracking', icon: CreditCard },
];

export default function PortalHubSidebar({ activeTab, setActiveTab }) {
  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="w-64 bg-card border-r border-border min-h-screen flex flex-col p-6 sticky top-0">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-lg font-bold">PH</span>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">PORTAL HUB™</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
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