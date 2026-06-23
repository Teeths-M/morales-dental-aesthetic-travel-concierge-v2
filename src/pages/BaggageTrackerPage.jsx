import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { BackButton } from '@/components/nav/BackButton';
import BaggageTracker from '@/components/baggage/BaggageTracker';

export default function BaggageTrackerPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <BackButton fallback="/dashboard" className="mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">Baggage Tracker</h1>
              <p className="text-sm text-slate-500">QR-based luggage tracking & recovery</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
          <BaggageTracker caseId={user?.id} />
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">How It Works</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>Register your luggage to generate a unique QR code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>Print and attach the QR tag to your bag</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>If lost, anyone can scan it to notify you anonymously</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span>Track your bag's status in real-time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}