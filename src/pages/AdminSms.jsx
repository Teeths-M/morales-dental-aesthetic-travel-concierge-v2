import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Import, UserCheck, Eye, MessageSquare } from 'lucide-react';
import SmsNotificationPanel from '@/components/portal/SmsNotificationPanel';

const adminNavItems = [
  { path: '/admin', label: 'Patient Journey', icon: LayoutDashboard },
  { path: '/admin/partners', label: 'Partner Management', icon: Users },
  { path: '/admin/imports', label: 'Data Imports', icon: Import },
  { path: '/admin/doctor-verification', label: 'Doctor Verification', icon: UserCheck },
  { path: '/admin/portal-viewer', label: 'Portal Viewer', icon: Eye },
  { path: '/admin/sms', label: 'SMS Notifications', icon: MessageSquare },
];

export default function AdminSms() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white border-r border-slate-200 fixed left-0 top-0 overflow-y-auto">
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
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64">
          <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SMS Notifications</h1>
                <p className="text-sm text-slate-500">Send appointment reminders, status updates & booking confirmations to patients</p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <SmsNotificationPanel />
          </div>
        </main>
      </div>
    </div>
  );
}