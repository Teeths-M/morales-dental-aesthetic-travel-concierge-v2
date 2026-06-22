import React from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CreditCard,
  DollarSign,
  LogOut,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'workflows', label: 'Workflow', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'providers', label: 'Providers', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'payments', label: 'Payments', icon: CreditCard },
];

export default function BottomNavbar({ activeTab, setActiveTab }) {
  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-sidebar border-t border-sidebar-border lg:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 transition-all rounded-lg",
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 py-2 transition-all rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[11px] font-medium mt-1">Logout</span>
        </button>
      </div>
    </div>
  );
}