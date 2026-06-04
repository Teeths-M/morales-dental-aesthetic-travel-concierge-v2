import React, { useState } from 'react';
import { Zap, MessageSquare } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import SmsNotificationPanel from '@/components/portal/SmsNotificationPanel';
import BroadcastPortalLinksPanel from '@/components/portal/BroadcastPortalLinksPanel';

export default function AdminSms() {
  const [activeTab, setActiveTab] = useState('broadcast');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Communications Center</h1>
          <p className="text-muted-foreground mt-1">Send portal links, SMS alerts & email notifications to partners and patients</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-4 h-4" /> Broadcast Portal Links
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'sms'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Custom SMS
            </button>
          </div>
        </div>

        {activeTab === 'broadcast' && <BroadcastPortalLinksPanel />}
        {activeTab === 'sms' && <SmsNotificationPanel />}
        </div>
      </div>
    </AdminLayout>
  );
}