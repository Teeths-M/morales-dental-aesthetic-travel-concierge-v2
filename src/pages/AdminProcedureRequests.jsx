import React from 'react';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import AdminProcedureRequests from '@/components/admin/AdminProcedureRequests';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminProcedureRequestsPage() {
  return (
    <ProtectedRoute allowedRoles={['platform_admin', 'admin']}>
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50">
          <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
              <Button variant="outline" size="icon" asChild className="rounded-full">
                <Link to="/admin"><ArrowLeft className="w-4 h-4" /></Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/">🏠 Home</Link>
              </Button>
              <h1 className="text-xl font-bold text-slate-900">Procedure Requests</h1>
            </div>
          </div>
          <div className="max-w-5xl mx-auto p-8">
            <AdminProcedureRequests />
          </div>
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}