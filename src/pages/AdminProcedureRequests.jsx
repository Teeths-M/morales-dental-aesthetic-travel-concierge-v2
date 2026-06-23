import React from 'react';
import AdminProcedureRequests from '@/components/admin/AdminProcedureRequests';
import AdminLayout from '@/components/layout/AdminLayout';

export default function AdminProcedureRequestsPage() {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-3xl font-semibold font-display mb-6">Procedure Requests</h1>
        <AdminProcedureRequests />
      </div>
    </AdminLayout>
  );
}