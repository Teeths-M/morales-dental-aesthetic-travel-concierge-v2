import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Users, FileText, CheckCircle, Clock, AlertCircle, 
  RefreshCw, Zap, UserPlus, Building2, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

import ConsultationIntake from '@/components/iq200/ConsultationIntake';
import SimpleCaseList from '@/components/iq200/SimpleCaseList';

export default function SimpleAdminDashboard() {
  const qc = useQueryClient();

  // Fetch consultations (new patient requests)
  const { data: consultations = [], isLoading: loadingConsultations } = useQuery({
    queryKey: ['consultations_simple'],
    queryFn: () => base44.entities.Consultation.list('-created_date', 50),
  });

  // Fetch case records (active cases in workflow)
  const { data: cases = [], isLoading: loadingCases, refetch } = useQuery({
    queryKey: ['cases_simple'],
    queryFn: () => base44.entities.CaseRecord.list('-created_date', 100),
  });

  // Calculate simple stats
  const stats = {
    newConsultations: consultations.length,
    activeCases: cases.length,
    awaitingDoctor: cases.filter(c => c.status === 'Doctor-Pending').length,
    blocked: cases.filter(c => c.safe_t_result === 'BLOCKED').length,
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['consultations_simple'] });
    qc.invalidateQueries({ queryKey: ['cases_simple'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Manage patient cases in 3 simple steps</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="rounded-full">
                <Link to="/admin/imports">
                  <Upload className="w-4 h-4 mr-2" /> Import Data
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="rounded-full">
                <Link to="/admin/partners">
                  <Building2 className="w-4 h-4 mr-2" /> View Partners
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-full">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Quick Start Guide */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl"
        >
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            How to Use This Dashboard (Super Simple!)
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg font-bold mb-2">1</div>
              <p className="font-semibold">New patient submits form</p>
              <p className="text-sm text-white/80 mt-1">They appear in "New Requests" below → Click "Convert to Case"</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg font-bold mb-2">2</div>
              <p className="font-semibold">Pick a doctor</p>
              <p className="text-sm text-white/80 mt-1">Select from dropdown → Click "Send Token" → Doctor gets email!</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg font-bold mb-2">3</div>
              <p className="font-semibold">Doctor responds</p>
              <p className="text-sm text-white/80 mt-1">They click the link and send you their price quote</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.newConsultations}</p>
                  <p className="text-xs text-slate-500">New Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeCases}</p>
                  <p className="text-xs text-slate-500">Active Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.awaitingDoctor}</p>
                  <p className="text-xs text-slate-500">Need Doctor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.blocked}</p>
                  <p className="text-xs text-slate-500">Needs Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 1: New Requests */}
        <section className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">1</div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">New Patient Requests</h2>
              <p className="text-sm text-slate-500">Convert these to cases to start the workflow</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">{consultations.length} waiting</Badge>
          </div>
          <ConsultationIntake consultations={consultations} isLoading={loadingConsultations} />
        </section>

        {/* Step 2: Active Cases */}
        <section className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-md">2</div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active Cases</h2>
              <p className="text-sm text-slate-500">Assign doctors and track progress</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200">{cases.length} total</Badge>
          </div>
          <SimpleCaseList cases={cases} isLoading={loadingCases} onRefresh={refetch} />
        </section>
      </div>
    </div>
  );
}