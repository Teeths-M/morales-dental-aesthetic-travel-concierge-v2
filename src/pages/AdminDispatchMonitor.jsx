import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import DispatchFailureMonitor from '@/components/portal/DispatchFailureMonitor';

export default function AdminDispatchMonitor() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-4 h-4" /> Back to Admin
            </Link>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
              🏠 Home
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Dispatch Failure Monitor</h1>
              <p className="text-sm text-slate-500">Real-time view of isolated pipeline dispatch failures requiring manual intervention</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <DispatchFailureMonitor />
        </div>

        <div className="mt-4 p-4 bg-slate-100 rounded-xl text-xs text-slate-500">
          <p className="font-semibold text-slate-600 mb-1">How fault isolation works</p>
          <p>When a vendor system (chauffeur network, travel agency email, doctor portal) fails during a multi-stakeholder dispatch, the failure is isolated — all other dispatches continue uninterrupted. The failed vendor is logged here so you can manually retry or contact them while the rest of the patient journey proceeds normally.</p>
        </div>
      </div>
    </div>
  );
}