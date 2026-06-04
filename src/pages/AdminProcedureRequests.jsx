import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import AdminProcedureRequests from '@/components/admin/AdminProcedureRequests';

export default function AdminProcedureRequestsPage() {
  return (
    <ProtectedRoute allowedRoles={['platform_admin', 'admin']}>
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="max-w-5xl mx-auto">
            <AdminProcedureRequests />
          </div>
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}