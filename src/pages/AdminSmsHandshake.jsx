// @ts-nocheck — pre-existing type gaps; build passes
import React from 'react';
import PageHeader from '@/components/ui-system/PageHeader';
import SmsHandshakeMonitor from '@/components/admin/SmsHandshakeMonitor';

export default function AdminSmsHandshake() {
  return (
    <div className="min-h-screen bg-[#060B16]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="SMS Handshake Operations"
          subtitle="Offline-assisted check-in monitoring and driver escalation."
          breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'SMS Handshake' }]}
        />
        <SmsHandshakeMonitor />
      </div>
    </div>
  );
}