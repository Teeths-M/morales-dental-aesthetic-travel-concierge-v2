import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DispatchFailureMonitor from '@/components/portal/DispatchFailureMonitor';

export default function AdminDispatchMonitor() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold font-display">Dispatch Failure Monitor</h1>
          <p className="text-muted-foreground mt-1">Real-time view of isolated pipeline dispatch failures requiring manual intervention</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <DispatchFailureMonitor />
        </div>

        <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500">
          <p className="font-semibold text-slate-600 mb-1">How fault isolation works</p>
          <p>When a vendor system (chauffeur network, travel agency email, doctor portal) fails during a multi-stakeholder dispatch, the failure is isolated — all other dispatches continue uninterrupted. The failed vendor is logged here so you can manually retry or contact them while the rest of the patient journey proceeds normally.</p>
        </div>
      </div>
    </AdminLayout>
  );
}