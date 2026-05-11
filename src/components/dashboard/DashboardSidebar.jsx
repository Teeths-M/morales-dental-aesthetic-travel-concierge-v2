import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, User, FileText, CalendarDays, MessageCircle, Shield, Map, Headphones, Settings } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'My Consultations', path: '/dashboard/consultations' },
  { icon: User, label: 'Medical Profile', path: '/dashboard/profile' },
  { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
  { icon: CalendarDays, label: 'My Bookings', path: '/dashboard/bookings' },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages' },
  { icon: Shield, label: 'SAFE-T 4LIFE™', path: '/safe-t' },
  { icon: Map, label: 'My Journey', path: '/dashboard/journey' },
  { icon: Headphones, label: 'Support', path: '/dashboard/support' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card min-h-[calc(100vh-5rem)]">
      <nav className="flex-1 px-3 py-6 space-y-0.5">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}